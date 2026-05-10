import React, { useRef, useState } from "react";
import { Button, Input, message, Spin } from "antd";
import { PlusOutlined, RobotOutlined, SearchOutlined } from "@ant-design/icons";
import request, { getApiBaseUrl } from "@font/api";
import { wordAgentQuery } from "@/server/wordAgent/wordAgent";
import type { WordAgentItem, WordAgentResponse } from "@/server/wordAgent/wordAgent";
import { wordAdd, wordExist } from "@/server/word/word";
import type { WordList } from "@/server/word/word.type";
import { EditAddModal, type AddInitialValues } from "./EditAddModal";
import { EnglishPartSpeech } from "../enum";

const STREAM_PATH = "/word-agent/query-stream";

/** 解析输入为请求体：word（单/多词逗号空格分隔）或 words 数组 */
function buildRequestBody(inputText: string): { word?: string; words?: string[] } {
  const trimmed = inputText.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/[\s,]+/).filter(Boolean);
  if (parts.length <= 1) return { word: trimmed };
  return { words: parts };
}

/** 将 AI 查询结果转为「新增单词」弹窗的预填数据 */
function wordAgentItemToAddInitial(item: WordAgentItem): AddInitialValues {
  return {
    englishWord: item.word,
    englishPhonetic: item.phonetic,
    englishChinese: item.meaning,
    englishPartSpeech: item.partOfSpeech?.length ? item.partOfSpeech : undefined,
    englishLevel: 0,
    englishType: 0,
  };
}

export const WordAgentTab: React.FC = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<WordAgentItem[]>([]);
  /** 当前正在流式输出的单词（chunk 打字机效果） */
  const [streamingWord, setStreamingWord] = useState<string | null>(null);
  const [streamingChunk, setStreamingChunk] = useState("");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addInitialValues, setAddInitialValues] = useState<AddInitialValues | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamCountRef = useRef(0);

  const openAddModal = (item: WordAgentItem) => {
    setAddInitialValues(wordAgentItemToAddInitial(item));
    setAddModalVisible(true);
  };

  const handleAddModalOk = async (data: WordList, type: "edit" | "add"): Promise<boolean> => {
    if (type !== "add") return false;
    const englishWord = (data.englishWord ?? "").trim();
    if (!englishWord) {
      message.warning("请输入单词名");
      return false;
    }
    try {
      const exists = await request<boolean>(wordExist({ englishWord }));
      if (exists) {
        message.warning("该单词已存在，无需重复添加");
        return false; // 不关闭弹窗、不清空表单
      }
      await request(wordAdd(data));
      message.success("已保存到单词本");
      setAddModalVisible(false);
      setAddInitialValues(null);
      return true;
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err?.message ?? "保存失败");
      return false;
    }
  };

  const handleAddModalCancel = () => {
    setAddModalVisible(false);
    setAddInitialValues(null);
  };

  const tryOneShotQuery = async (body: { word?: string; words?: string[] }) => {
    try {
      const data = await request<WordAgentResponse>(wordAgentQuery(body));
      if (data?.words?.length) {
        setWords(data.words);
        message.success(`已查询 ${data.words.length} 个单词`);
      } else {
        message.info("未返回结果");
      }
    } catch (e: unknown) {
      const err = e as { message?: string; code?: number };
      if (err?.code === 400) {
        message.warning("请至少输入一个单词");
      } else {
        message.error(err?.message || "查询失败，请稍后再试");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    const body = buildRequestBody(input);
    if (!body.word && !body.words?.length) {
      message.warning("请输入要查询的单词");
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;

    setLoading(true);
    setWords([]);
    setStreamingWord(null);
    setStreamingChunk("");
    streamCountRef.current = 0;

    try {
      const url = `${getApiBaseUrl()}${STREAM_PATH}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
        signal,
      });

      if (!res.ok || !res.body) {
        const contentType = res.headers.get("content-type") || "";
        if (res.status === 404 || res.status === 502 || !contentType.includes("event-stream")) {
          await tryOneShotQuery(body);
          return;
        }
        const err = await res.json().catch(() => ({}));
        message.error((err as { message?: string }).message || "请求失败");
        setLoading(false);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("event-stream") && contentType.includes("application/json")) {
        const json = await res.json();
        const list = json?.data?.words ?? json?.words ?? [];
        if (list.length) {
          setWords(list);
          message.success(`已查询 ${list.length} 个单词`);
        } else {
          message.info("未返回结果");
        }
        setLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const obj = JSON.parse(line.slice(6).trim()) as {
              type: string;
              word?: string;
              data?: WordAgentItem | string;
              message?: string;
            };
            if (obj.type === "chunk" && obj.word != null && typeof obj.data === "string") {
              setStreamingWord(obj.word);
              setStreamingChunk((prev) => prev + obj.data);
            } else if (obj.type === "word" && obj.data && typeof obj.data === "object") {
              setStreamingWord(null);
              setStreamingChunk("");
              streamCountRef.current += 1;
              setWords((prev) => [...prev, obj.data as WordAgentItem]);
            } else if (obj.type === "done") {
              setStreamingWord(null);
              setStreamingChunk("");
              message.success(`已返回 ${streamCountRef.current} 个单词`);
              setLoading(false);
            } else if (obj.type === "error") {
              setStreamingWord(null);
              setStreamingChunk("");
              message.error(obj.message ?? "查询出错");
              setLoading(false);
            }
          } catch {
            // 忽略单行解析错误
          }
        }
      }

      if (buf.trim()) {
        try {
          const obj = JSON.parse(buf.replace(/^data:\s*/, "").trim()) as {
            type: string;
            word?: string;
            data?: WordAgentItem | string;
            message?: string;
          };
          if (obj.type === "chunk" && obj.word != null && typeof obj.data === "string") {
            setStreamingWord(obj.word);
            setStreamingChunk((prev) => prev + obj.data);
          } else if (obj.type === "word" && obj.data && typeof obj.data === "object") {
            setStreamingWord(null);
            setStreamingChunk("");
            streamCountRef.current += 1;
            setWords((prev) => [...prev, obj.data as WordAgentItem]);
          } else if (obj.type === "done" || obj.type === "error") {
            setStreamingWord(null);
            setStreamingChunk("");
            setLoading(false);
          }
          if (obj.type === "done") message.success(`已返回 ${streamCountRef.current} 个单词`);
          if (obj.type === "error") message.error(obj.message ?? "查询出错");
        } catch {
          // ignore
        }
      }
      setLoading(false);
    } catch (e: unknown) {
      if ((e as { name?: string }).name === "AbortError") return;
      await tryOneShotQuery(body);
    } finally {
      abortRef.current = null;
    }
  };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 16px" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          borderRadius: 16,
          padding: "28px 32px",
          boxShadow: "0 10px 40px rgba(102, 126, 234, 0.35)",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "rgba(255,255,255,0.2)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              color: "#fff",
            }}
          >
            <RobotOutlined />
          </span>
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                color: "#fff",
              }}
            >
              AI 单词查询
            </h1>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.85)" }}></span>
          </div>
        </div>
        <p
          style={{
            margin: 0,
            color: "rgba(255,255,255,0.9)",
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          输入单词（支持多个，用逗号或空格分隔），获取释义、音标、例句与雅思案例。
        </p>
      </div>

      <div
        style={{
          background: "#fff",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="例如：confront 或 confront, reluctant, habitat"
            autoSize={{ minRows: 2, maxRows: 4 }}
            style={{
              flex: "1 1 280px",
              borderRadius: 12,
              border: "1px solid #e8e8e8",
              fontSize: 15,
            }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleQuery();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleQuery}
            loading={loading}
            size="large"
            style={{
              height: 44,
              paddingLeft: 24,
              paddingRight: 24,
              borderRadius: 12,
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              fontWeight: 500,
              boxShadow: "0 4px 14px rgba(102, 126, 234, 0.4)",
            }}
          >
            查询
          </Button>
        </div>

        {loading && words.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "48px 24px",
              background: "linear-gradient(180deg, #fafbff 0%, #f5f6fa 100%)",
              borderRadius: 12,
              marginTop: 24,
            }}
          >
            <Spin size="large" tip="AI 正在查询（流式返回）..." />
          </div>
        )}

        {(words.length > 0 || streamingWord) && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginTop: 28,
            }}
          >
            {words.map((item, index) => (
              <div
                key={`${item.word}-${index}`}
                style={{
                  background: "#fff",
                  border: "1px solid #eee",
                  borderRadius: 14,
                  padding: "20px 24px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 12,
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        color: "#667eea",
                        marginRight: 12,
                      }}
                    >
                      {item.word}
                    </span>
                    <span
                      style={{
                        color: "#64748b",
                        fontFamily: "monospace",
                        fontSize: 15,
                      }}
                    >
                      {item.phonetic}
                    </span>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => openAddModal(item)}
                    style={{
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      border: "none",
                    }}
                  >
                    新增单词
                  </Button>
                </div>
                {item.partOfSpeech && item.partOfSpeech.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 12,
                    }}
                  >
                    {item.partOfSpeech.map((code) => (
                      <span
                        key={code}
                        style={{
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 12,
                          background: "#eef2ff",
                          color: "#4f46e5",
                        }}
                      >
                        {(EnglishPartSpeech as Record<number, string>)[code] ?? `词性${code}`}
                      </span>
                    ))}
                  </div>
                )}
                <p
                  style={{
                    margin: "0 0 12px 0",
                    color: "#334155",
                    fontSize: 15,
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ color: "#64748b", fontWeight: 500 }}>释义：</span>
                  {item.meaning}
                </p>
                {item.examples?.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <span
                      style={{
                        color: "#64748b",
                        fontWeight: 500,
                        fontSize: 14,
                      }}
                    >
                      例句
                    </span>
                    <ul
                      style={{
                        margin: "8px 0 0 0",
                        paddingLeft: 0,
                        listStyle: "none",
                      }}
                    >
                      {item.examples.map((ex, i) => (
                        <li
                          key={i}
                          style={{
                            marginBottom: 10,
                            padding: "6px 0",
                            borderBottom:
                              i < item.examples.length - 1 ? "1px solid #f0f0f0" : "none",
                          }}
                        >
                          <div
                            style={{
                              color: "#333",
                              marginBottom: ex.zh ? 2 : 0,
                            }}
                          >
                            {ex.en}
                          </div>
                          {ex.zh && (
                            <div
                              style={{
                                color: "#8c8c8c",
                                fontSize: 12,
                                paddingLeft: 8,
                              }}
                            >
                              {ex.zh}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.ieltsCase != null && typeof item.ieltsCase === "object" ? (
                  <div
                    style={{
                      marginTop: 16,
                      padding: "16px 18px",
                      background: "linear-gradient(135deg, #f0f4ff 0%, #faf5ff 100%)",
                      borderRadius: 12,
                      borderLeft: "4px solid #667eea",
                    }}
                  >
                    <span
                      style={{
                        color: "#667eea",
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      雅思案例
                    </span>
                    <div style={{ marginTop: 8 }}>
                      <span
                        className="ielts-source"
                        style={{
                          display: "inline-block",
                          fontSize: 12,
                          color: "#8c8c8c",
                          marginBottom: 8,
                        }}
                      >
                        {item.ieltsCase.source}
                      </span>
                      <div
                        className="ielts-question"
                        style={{
                          marginTop: 8,
                          padding: "10px 12px",
                          background: "rgba(255,255,255,0.8)",
                          borderRadius: 8,
                          borderLeft: "2px solid #a78bfa",
                          fontSize: 14,
                          color: "#334155",
                        }}
                      >
                        <div
                          style={{
                            marginBottom: item.ieltsCase.questionZh ? 4 : 0,
                          }}
                        >
                          {item.ieltsCase.question}
                        </div>
                        {item.ieltsCase.questionZh && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#8c8c8c",
                            }}
                          >
                            {item.ieltsCase.questionZh}
                          </div>
                        )}
                      </div>
                      <blockquote
                        className="ielts-sentence"
                        style={{
                          margin: "10px 0 0 0",
                          padding: "10px 0 0 14px",
                          borderLeft: "2px solid #667eea",
                          fontStyle: "italic",
                          color: "#475569",
                          fontSize: 14,
                        }}
                      >
                        <div
                          style={{
                            marginBottom: item.ieltsCase.sentenceZh ? 4 : 0,
                          }}
                        >
                          {item.ieltsCase.sentence}
                        </div>
                        {item.ieltsCase.sentenceZh && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#8c8c8c",
                              fontStyle: "normal",
                            }}
                          >
                            {item.ieltsCase.sentenceZh}
                          </div>
                        )}
                      </blockquote>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 12,
                      color: "#94a3b8",
                      fontSize: 13,
                    }}
                  >
                    雅思案例：暂无
                  </div>
                )}
              </div>
            ))}
            {streamingWord && (
              <div
                style={{
                  background: "#fff",
                  border: "1px dashed #c7d2fe",
                  borderRadius: 14,
                  padding: "20px 24px",
                  boxShadow: "0 2px 12px rgba(102, 126, 234, 0.1)",
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#667eea",
                      marginRight: 12,
                    }}
                  >
                    {streamingWord}
                  </span>
                  <span
                    style={{
                      color: "#94a3b8",
                      fontSize: 13,
                      marginLeft: 8,
                    }}
                  >
                    AI 正在输出…
                  </span>
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontFamily: "inherit",
                    fontSize: 14,
                    lineHeight: 1.6,
                    color: "#334155",
                    minHeight: 24,
                  }}
                >
                  {streamingChunk || "\u00A0"}
                  <span
                    style={{
                      display: "inline-block",
                      width: 2,
                      height: 16,
                      marginLeft: 2,
                      background: "#667eea",
                      verticalAlign: "text-bottom",
                    }}
                  />
                </pre>
              </div>
            )}
            {loading && (words.length > 0 || streamingWord) && (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px",
                  color: "#64748b",
                  fontSize: 13,
                }}
              >
                <Spin size="small" tip="正在接收更多…" />
              </div>
            )}
          </div>
        )}
      </div>

      <EditAddModal
        isModalVisible={addModalVisible}
        type="add"
        addInitialValues={addInitialValues}
        onOk={handleAddModalOk}
        onCancel={handleAddModalCancel}
      />
    </div>
  );
};
