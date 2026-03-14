import React, { useRef, useState } from "react";
import { Button, Card, Input, Toast, Popup, Form, Picker } from "antd-mobile";
import type { PickerActions } from "antd-mobile/es/components/picker";
import { AddOutline, SearchOutline } from "antd-mobile-icons";
import request, { getApiBaseUrl } from "@font/api";
import { wordAgentQuery } from "@/server/wordAgent/wordAgent";
import type {
  WordAgentItem,
  WordAgentResponse,
} from "@/server/wordAgent/wordAgent";
import { wordAdd, wordExist } from "@/server/word/word";
import type { WordList } from "@/server/word/word.type";
import { EnglishPartSpeech } from "@/page/englishWorld/enum";

const STREAM_PATH = "/word-agent/query-stream";

function buildRequestBody(
  inputText: string
): { word?: string; words?: string[] } {
  const trimmed = inputText.trim();
  if (!trimmed) return {};
  const parts = trimmed.split(/[\s,]+/).filter(Boolean);
  if (parts.length <= 1) return { word: trimmed };
  return { words: parts };
}

export const WordAgentTabMobile: React.FC = () => {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [words, setWords] = useState<WordAgentItem[]>([]);
  const [streamingWord, setStreamingWord] = useState<string | null>(null);
  const [streamingChunk, setStreamingChunk] = useState("");
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addInitialValues, setAddInitialValues] = useState<
    Partial<WordList> | null
  >(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamCountRef = useRef(0);
  const [form] = Form.useForm();
  const levelPickerRef = useRef<PickerActions>(null);
  const typePickerRef = useRef<PickerActions>(null);

  const openAddModal = (item: WordAgentItem) => {
    setAddInitialValues({
      englishWord: item.word,
      englishPhonetic: item.phonetic,
      englishChinese: item.meaning,
      englishPartSpeech: item.partOfSpeech?.length ? item.partOfSpeech : undefined,
      englishLevel: 0,
      englishType: 0,
    });
    setAddModalVisible(true);
    setTimeout(() => {
      form.setFieldsValue({
        englishWord: item.word,
        englishPhonetic: item.phonetic,
        englishChinese: item.meaning,
        englishLevel: 0,
        englishType: 0,
        englishPartSpeech: item.partOfSpeech ?? [],
      });
    }, 100);
  };

  const tryOneShotQuery = async (body: {
    word?: string;
    words?: string[];
  }) => {
    try {
      const data = await request<WordAgentResponse>(wordAgentQuery(body));
      if (data?.words?.length) {
        setWords(data.words);
        Toast.show({ icon: "success", content: `已查询 ${data.words.length} 个单词` });
      } else {
        Toast.show({ icon: "fail", content: "未返回结果" });
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      Toast.show({ icon: "fail", content: err?.message ?? "查询失败" });
    } finally {
      setLoading(false);
    }
  };

  const handleQuery = async () => {
    const body = buildRequestBody(input);
    if (!body.word && !body.words?.length) {
      Toast.show({ icon: "fail", content: "请输入要查询的单词" });
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
        Toast.show({ icon: "fail", content: "请求失败" });
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
          Toast.show({ icon: "success", content: `已查询 ${list.length} 个单词` });
        } else {
          Toast.show({ icon: "fail", content: "未返回结果" });
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
            if (
              obj.type === "chunk" &&
              obj.word != null &&
              typeof obj.data === "string"
            ) {
              setStreamingWord(obj.word);
              setStreamingChunk((prev) => prev + obj.data);
            } else if (
              obj.type === "word" &&
              obj.data &&
              typeof obj.data === "object"
            ) {
              setStreamingWord(null);
              setStreamingChunk("");
              streamCountRef.current += 1;
              setWords((prev) => [...prev, obj.data as WordAgentItem]);
            } else if (obj.type === "done") {
              setStreamingWord(null);
              setStreamingChunk("");
              Toast.show({
                icon: "success",
                content: `已返回 ${streamCountRef.current} 个单词`,
              });
              setLoading(false);
            } else if (obj.type === "error") {
              setStreamingWord(null);
              setStreamingChunk("");
              Toast.show({ icon: "fail", content: obj.message ?? "查询出错" });
              setLoading(false);
            }
          } catch {
            // ignore
          }
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

  const handleAddSubmit = async () => {
    try {
      const values = await form.validateFields();
      const englishWord = (values.englishWord ?? "").trim();
      if (!englishWord) {
        Toast.show({ icon: "fail", content: "请输入单词名" });
        return;
      }
      const exists = await request<boolean>(wordExist({ englishWord }));
      if (exists) {
        Toast.show({ icon: "fail", content: "该单词已存在" });
        return;
      }
      const submitData: WordList = {
        ...values,
        englishPartSpeech: Array.isArray(values.englishPartSpeech)
          ? values.englishPartSpeech
          : [],
      } as WordList;
      await request(wordAdd(submitData));
      Toast.show({ icon: "success", content: "已保存到单词本" });
      setAddModalVisible(false);
      setAddInitialValues(null);
      form.resetFields();
    } catch (err) {
      // validation or request error
    }
  };

  const partSpeechOptions = [
    { label: "动词", value: 1 },
    { label: "名词", value: 2 },
    { label: "形容词", value: 3 },
    { label: "副词", value: 4 },
    { label: "代词", value: 5 },
    { label: "介词", value: 6 },
    { label: "连词", value: 7 },
    { label: "感叹词", value: 8 },
    { label: "未分类", value: 9 },
  ];

  return (
    <div style={{ padding: "16px", paddingBottom: 24 }}>
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ marginBottom: 12, color: "#667eea", fontWeight: 600 }}>
          AI 单词查询
        </div>
        <p style={{ margin: "0 0 12px 0", fontSize: 13, color: "#666" }}>
          输入单词（支持多个，逗号或空格分隔），获取释义、音标等。
        </p>
        <Input
          value={input}
          onChange={setInput}
          placeholder="例如：confront 或 confront, reluctant"
          style={{ marginBottom: 12 }}
        />
        <Button
          block
          color="primary"
          onClick={handleQuery}
          loading={loading}
          style={{ borderRadius: 10 }}
        >
          <SearchOutline /> 查询
        </Button>
      </Card>

      {loading && words.length === 0 && !streamingWord && (
        <div style={{ textAlign: "center", padding: 32, color: "#999" }}>
          AI 正在查询…
        </div>
      )}

      {(words.length > 0 || streamingWord) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {words.map((item, index) => (
            <Card key={`${item.word}-${index}`} style={{ borderRadius: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 8,
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#667eea",
                      marginRight: 8,
                    }}
                  >
                    {item.word}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 14 }}>
                    {item.phonetic}
                  </span>
                </div>
                <Button
                  size="small"
                  color="primary"
                  fill="outline"
                  onClick={() => openAddModal(item)}
                >
                  <AddOutline /> 加入单词本
                </Button>
              </div>
              {item.partOfSpeech?.length ? (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 4,
                    marginBottom: 8,
                  }}
                >
                  {item.partOfSpeech.map((code) => (
                    <span
                      key={code}
                      style={{
                        padding: "2px 6px",
                        borderRadius: 4,
                        fontSize: 11,
                        background: "#eef2ff",
                        color: "#4f46e5",
                      }}
                    >
                      {(EnglishPartSpeech as Record<number, string>)[code] ??
                        `词性${code}`}
                    </span>
                  ))}
                </div>
              ) : null}
              <p style={{ margin: 0, fontSize: 14, color: "#334155" }}>
                {item.meaning}
              </p>
              {item.examples?.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>例句</span>
                  <ul style={{ margin: "4px 0 0 0", paddingLeft: 16 }}>
                    {item.examples.slice(0, 2).map((ex, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#475569" }}>
                        {ex.en}
                        {ex.zh ? ` — ${ex.zh}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          ))}
          {streamingWord && (
            <Card style={{ borderRadius: 12, borderStyle: "dashed" }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600, color: "#667eea" }}>
                  {streamingWord}
                </span>
                <span style={{ marginLeft: 8, fontSize: 12, color: "#94a3b8" }}>
                  AI 正在输出…
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  fontSize: 13,
                  color: "#334155",
                }}
              >
                {streamingChunk || "\u00A0"}
              </pre>
            </Card>
          )}
        </div>
      )}

      <Popup
        visible={addModalVisible}
        onMaskClick={() => setAddModalVisible(false)}
        position="bottom"
        bodyStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
      >
        <div style={{ padding: 16 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <span style={{ fontWeight: 600 }}>加入单词本</span>
            <Button
              fill="none"
              size="small"
              onClick={() => setAddModalVisible(false)}
            >
              取消
            </Button>
            <Button
              color="primary"
              size="small"
              onClick={handleAddSubmit}
            >
              保存
            </Button>
          </div>
          <Form form={form} layout="vertical">
            <Form.Item
              name="englishWord"
              label="单词"
              rules={[{ required: true, message: "请输入单词" }]}
            >
              <Input placeholder="单词" />
            </Form.Item>
            <Form.Item name="englishPhonetic" label="音标">
              <Input placeholder="音标" />
            </Form.Item>
            <Form.Item name="englishChinese" label="释义">
              <Input placeholder="释义" />
            </Form.Item>
            <Form.Item
              name="englishLevel"
              label="掌握程度"
              trigger="onConfirm"
              getValueFromEvent={(v) => (Array.isArray(v) ? v[0] : v)}
              getValueProps={(v) => ({ value: v != null ? [v] : undefined })}
              onClick={() => levelPickerRef.current?.open()}
            >
              <Picker
                ref={levelPickerRef}
                columns={[
                  [
                    { label: "不会", value: 0 },
                    { label: "一般", value: 1 },
                    { label: "熟练", value: 2 },
                    { label: "精通", value: 3 },
                  ],
                ]}
              >
                {(items) => (
                  <div style={{ padding: "8px 0" }}>
                    {items?.[0]?.label ?? "请选择"}
                  </div>
                )}
              </Picker>
            </Form.Item>
            <Form.Item
              name="englishType"
              label="类型"
              trigger="onConfirm"
              getValueFromEvent={(v) => (Array.isArray(v) ? v[0] : v)}
              getValueProps={(v) => ({ value: v != null ? [v] : undefined })}
              onClick={() => typePickerRef.current?.open()}
            >
              <Picker
                ref={typePickerRef}
                columns={[
                  [
                    { label: "单词", value: 0 },
                    { label: "短语", value: 1 },
                    { label: "句子", value: 2 },
                  ],
                ]}
              >
                {(items) => (
                  <div style={{ padding: "8px 0" }}>
                    {items?.[0]?.label ?? "请选择"}
                  </div>
                )}
              </Picker>
            </Form.Item>
          </Form>
        </div>
      </Popup>
    </div>
  );
};
