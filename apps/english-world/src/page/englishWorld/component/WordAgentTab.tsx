import React, { useRef, useState } from "react";
import { Button, Input, message, Spin } from "antd";
import { PlusOutlined, SearchOutlined } from "@ant-design/icons";
import request, { getApiBaseUrl } from "@font/api";
import { wordAgentQuery } from "@/server/wordAgent/wordAgent";
import type {
  WordAgentItem,
  WordAgentResponse,
} from "@/server/wordAgent/wordAgent";
import { wordAdd, wordExist } from "@/server/word/word";
import type { WordList } from "@/server/word/word.type";
import { EditAddModal, type AddInitialValues } from "./EditAddModal";
import { EnglishPartSpeech } from "../enum";
import { buildWordAgentRequestBody } from "../utils/wordAgentRequest";

const STREAM_PATH = "/word-agent/query-stream";
const EXAMPLE_WORDS = ["confront", "reluctant", "habitat", "knock over"];

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
    const body = buildWordAgentRequestBody(input);
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
        if (
          res.status === 404 ||
          res.status === 502 ||
          !contentType.includes("event-stream")
        ) {
          await tryOneShotQuery(body);
          return;
        }
        const err = await res.json().catch(() => ({}));
        message.error((err as { message?: string }).message || "请求失败");
        setLoading(false);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (
        !contentType.includes("event-stream") &&
        contentType.includes("application/json")
      ) {
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

  const handleExampleWord = (word: string) => {
    setInput((current) => {
      const trimmed = current.trim();
      if (!trimmed) return word;
      return `${trimmed}, ${word}`;
    });
  };

  return (
    <div className="word-agent-page">
      <section className="word-agent-hero" aria-label="AI 单词查询">
        <span className="word-agent-kicker">AI 单词查询</span>
        <h1>查词</h1>
        <p>
          输入单词、短语或一组薄弱词，返回释义、音标、例句和雅思语境。
        </p>
      </section>

      <section className="word-agent-workspace">
        <div className="word-agent-query-panel">
          <label className="word-agent-input-label" htmlFor="word-agent-input">
            单词或短语
          </label>
          <div className="word-agent-search-row">
            <Input.TextArea
              id="word-agent-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="例如：confront 或 confront, reluctant, habitat"
              autoSize={{ minRows: 3, maxRows: 5 }}
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
              className="word-agent-query-button"
            >
              查询
            </Button>
          </div>

          <div className="word-agent-helper-row">
            <span>逗号或换行可批量查询，Shift + Enter 换行。</span>
            <div className="word-agent-suggestions" aria-label="示例词">
              {EXAMPLE_WORDS.map((word) => (
                <Button
                  key={word}
                  type="text"
                  size="small"
                  onClick={() => handleExampleWord(word)}
                >
                  {word}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {(loading || words.length > 0 || streamingWord) && (
        <section className="word-agent-results" aria-label="查询结果">
          {loading && words.length === 0 && (
          <div className="word-agent-loading">
            <Spin size="large" tip="AI 正在查询（流式返回）..." />
          </div>
          )}

          {(words.length > 0 || streamingWord) && (
          <div className="word-agent-result-list">
            {words.map((item, index) => (
              <article className="word-agent-result-card" key={`${item.word}-${index}`}>
                <div className="word-agent-result-head">
                  <div>
                    <span className="word-agent-result-word">{item.word}</span>
                    <span className="word-agent-result-phonetic">{item.phonetic}</span>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => openAddModal(item)}
                  >
                    新增单词
                  </Button>
                </div>
                {item.partOfSpeech && item.partOfSpeech.length > 0 && (
                  <div className="word-agent-speech-row">
                    {item.partOfSpeech.map((code) => (
                      <span key={code}>
                        {(EnglishPartSpeech as Record<number, string>)[code] ?? `词性${code}`}
                      </span>
                    ))}
                  </div>
                )}
                <p className="word-agent-meaning">
                  <span>释义：</span>
                  {item.meaning}
                </p>
                {item.examples?.length > 0 && (
                  <div className="word-agent-examples">
                    <span>例句</span>
                    <ul>
                      {item.examples.map((ex, i) => (
                        <li key={i}>
                          <div>{ex.en}</div>
                          {ex.zh && <small>{ex.zh}</small>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {item.ieltsCase != null &&
                typeof item.ieltsCase === "object" ? (
                  <div className="word-agent-ielts">
                    <span>雅思案例</span>
                    <div>
                      <small className="ielts-source">{item.ieltsCase.source}</small>
                      <div className="ielts-question">
                        <div>{item.ieltsCase.question}</div>
                        {item.ieltsCase.questionZh && <small>{item.ieltsCase.questionZh}</small>}
                      </div>
                      <blockquote className="ielts-sentence">
                        <div>{item.ieltsCase.sentence}</div>
                        {item.ieltsCase.sentenceZh && (
                          <small>
                            {item.ieltsCase.sentenceZh}
                          </small>
                        )}
                      </blockquote>
                    </div>
                  </div>
                ) : (
                  <div className="word-agent-no-ielts">雅思案例：暂无</div>
                )}
              </article>
            ))}
            {streamingWord && (
              <article className="word-agent-result-card word-agent-streaming-card">
                <div className="word-agent-streaming-head">
                  <span className="word-agent-result-word">{streamingWord}</span>
                  <span>AI 正在输出...</span>
                </div>
                <pre>
                  {streamingChunk || "\u00A0"}
                  <span className="word-agent-cursor" />
                </pre>
              </article>
            )}
            {loading && (words.length > 0 || streamingWord) && (
              <div className="word-agent-more-loading">
                <Spin size="small" tip="正在接收更多…" />
              </div>
            )}
          </div>
          )}
        </section>
      )}

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
