import React, { useState } from "react";
import { Button, Card, Form, Input, InputNumber, message, Radio, Select, Spin } from "antd";
import { BookOutlined, CheckCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import request, { getApiBaseUrl } from "@font/api";
import { exerciseGenerate, exerciseSubmit } from "@/server/exerciseAgent/exerciseAgent";
import type {
  ExerciseGenerateParams,
  ExerciseGenerateResponse,
  ExerciseQuestion,
  ExerciseResultItem,
} from "@/server/exerciseAgent/exerciseAgent";
import { EnglishAbsorb } from "../enum";

const OPTION_LABELS = ["A", "B", "C", "D"];

export const ExerciseAgentTab: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [article, setArticle] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ExerciseQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<ExerciseResultItem[] | null>(null);
  /** 流式生成时的打字机内容（与 AI 单词查询一致） */
  const [streamingChunk, setStreamingChunk] = useState("");

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      const sourceType = values.sourceType as "proficiency" | "random" | "custom";

      let params: ExerciseGenerateParams;
      if (sourceType === "proficiency") {
        params = {
          sourceType: "proficiency",
          proficiencyLevels: values.proficiencyLevels ?? [0, 1],
          count: Math.min(20, Math.max(3, values.count ?? 8)),
        };
      } else if (sourceType === "random") {
        params = {
          sourceType: "random",
          count: Math.min(20, Math.max(3, values.count ?? 8)),
        };
      } else {
        const raw = (values.words ?? "")
          .trim()
          .split(/[\s,，]+/)
          .filter(Boolean);
        if (raw.length < 3) {
          message.warning("自定义单词至少需要 3 个");
          return;
        }
        params = { sourceType: "custom", words: raw };
      }

      setLoading(true);
      setResults(null);
      setAnswers({});
      setStreamingChunk("");

      const url = `${getApiBaseUrl()}/exercise-agent/generate`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
        credentials: "include",
      });

      const contentType = res.headers.get("content-type") || "";

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        message.error((err as { message?: string }).message ?? "生成失败");
        return;
      }

      if (contentType.includes("text/event-stream")) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error("无响应体");
        const decoder = new TextDecoder();
        let buf = "";
        let jsonAccum = "";
        let doneData: ExerciseGenerateResponse | null = null;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split(/\r?\n/);
          buf = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (!payload) continue;
            try {
              const obj = JSON.parse(payload) as {
                type?: string;
                data?: string | ExerciseGenerateResponse | { data?: ExerciseGenerateResponse };
              };
              if (obj.type === "chunk" && typeof obj.data === "string") {
                jsonAccum += obj.data;
                setStreamingChunk((prev) => prev + obj.data);
              } else if (obj.type === "done" && obj.data != null) {
                const d = obj.data as
                  | ExerciseGenerateResponse
                  | { data?: ExerciseGenerateResponse };
                doneData =
                  d && typeof d === "object" && "sessionId" in d
                    ? (d as ExerciseGenerateResponse)
                    : ((d as { data?: ExerciseGenerateResponse }).data ?? null);
              }
            } catch {
              // 忽略单行解析错误
            }
          }
        }

        if (buf.trim()) {
          try {
            const obj = JSON.parse(buf.replace(/^data:\s*/, "").trim()) as {
              type?: string;
              data?: string | ExerciseGenerateResponse;
            };
            if (obj.type === "chunk" && typeof obj.data === "string") {
              jsonAccum += obj.data;
              setStreamingChunk((prev) => prev + obj.data);
            } else if (obj.type === "done" && obj.data != null && typeof obj.data === "object")
              doneData = obj.data as ExerciseGenerateResponse;
          } catch {
            // ignore
          }
        }

        let data: ExerciseGenerateResponse;
        if (doneData != null) {
          data = doneData;
        } else if (jsonAccum.trim()) {
          try {
            const parsed = JSON.parse(jsonAccum) as
              | ExerciseGenerateResponse
              | { code?: number; data?: ExerciseGenerateResponse };
            data =
              parsed && "data" in parsed && parsed.data != null
                ? parsed.data
                : (parsed as ExerciseGenerateResponse);
          } catch {
            throw new Error("流式数据解析失败，请重试");
          }
        } else {
          throw new Error("流式响应为空，请重试");
        }
        setStreamingChunk("");
        setSessionId(data.sessionId);
        setArticle(data.article ?? "");
        setWords(Array.isArray(data.words) ? data.words : []);
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        message.success("练习已生成");
      } else if (res.ok && contentType.includes("application/json")) {
        const json = await res.json();
        const data = (json.data ?? json) as ExerciseGenerateResponse;
        setSessionId(data.sessionId);
        setArticle(data.article ?? "");
        setWords(data.words ?? []);
        setQuestions(data.questions ?? []);
        message.success("练习已生成");
      } else {
        const data = await request<ExerciseGenerateResponse>(exerciseGenerate(params));
        setSessionId(data.sessionId);
        setArticle(data.article ?? "");
        setWords(data.words ?? []);
        setQuestions(data.questions ?? []);
        message.success("练习已生成");
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err?.message ?? "生成失败");
      setStreamingChunk("");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (sessionId == null || questions.length === 0) {
        message.warning("请先生成练习");
        return;
      }
      const keys = questions.map((q, i) => getQuestionKey(q, i));
      const unanswered = questions.filter((_, i) => {
        const key = keys[i];
        const v = answers[key];
        return v === undefined || v === null;
      });
      if (unanswered.length > 0) {
        message.warning(`还有 ${unanswered.length} 题未作答，请先完成所有题目`);
        return;
      }
      const res = await request(
        exerciseSubmit({
          sessionId,
          answers: questions.map((q, i) => {
            const key = keys[i];
            const selectedIndex = Number(answers[key]);
            return {
              questionId: q?.id != null && String(q.id).trim() !== "" ? q.id : key,
              selectedIndex: Number.isNaN(selectedIndex) ? 0 : selectedIndex,
            };
          }),
        }),
      );
      setResults(res.results ?? []);
      message.success("已提交");
    } catch (e: unknown) {
      const err = e as { message?: string };
      message.error(err?.message ?? "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  /** 题目唯一 key：优先用 id，否则用索引避免空 id 导致答案丢失 */
  const getQuestionKey = (q: ExerciseQuestion, idx: number) =>
    q?.id != null && String(q.id).trim() !== "" ? String(q.id) : `q-${idx}`;

  const getResult = (questionId: string) => results?.find((r) => r.questionId === questionId);

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
            marginBottom: 8,
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
            <BookOutlined />
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
              阅读 + 选择题练习
            </h1>
            <p
              style={{
                margin: "4px 0 0 0",
                color: "rgba(255,255,255,0.9)",
                fontSize: 14,
              }}
            >
              按熟练度 / 随机 / 自定义单词生成短文与单选题，提交后查看解析。
            </p>
          </div>
        </div>
      </div>

      <Card
        style={{
          borderRadius: 16,
          boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.04)",
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            sourceType: "proficiency",
            proficiencyLevels: [0, 1],
            count: 8,
          }}
        >
          <Form.Item label="选题方式" name="sourceType" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "proficiency", label: "按熟练度筛选" },
                { value: "random", label: "随机抽词" },
                { value: "custom", label: "自定义单词" },
              ]}
            />
          </Form.Item>

          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.sourceType !== cur.sourceType}>
            {({ getFieldValue }) => {
              const st = getFieldValue("sourceType");
              if (st === "proficiency") {
                return (
                  <>
                    <Form.Item
                      label="熟练度"
                      name="proficiencyLevels"
                      rules={[{ required: true, message: "请选择至少一个熟练度" }]}
                    >
                      <Select
                        mode="multiple"
                        placeholder="选择要练习的熟练度"
                        options={[
                          { value: 0, label: EnglishAbsorb[0] },
                          { value: 1, label: EnglishAbsorb[1] },
                          { value: 2, label: EnglishAbsorb[2] },
                          { value: 3, label: EnglishAbsorb[3] },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item
                      label="抽词数量"
                      name="count"
                      initialValue={8}
                      rules={[
                        { required: true },
                        {
                          type: "number",
                          min: 3,
                          max: 20,
                          message: "3～20 个",
                        },
                      ]}
                    >
                      <InputNumber min={3} max={20} style={{ width: 120 }} />
                    </Form.Item>
                  </>
                );
              }
              if (st === "random") {
                return (
                  <Form.Item
                    label="抽词数量"
                    name="count"
                    initialValue={8}
                    rules={[
                      { required: true },
                      { type: "number", min: 3, max: 20, message: "3～20 个" },
                    ]}
                  >
                    <InputNumber min={3} max={20} style={{ width: 120 }} />
                  </Form.Item>
                );
              }
              return (
                <Form.Item
                  label="单词列表"
                  name="words"
                  rules={[
                    {
                      required: true,
                      message: "至少输入 3 个单词（逗号或空格分隔）",
                    },
                  ]}
                >
                  <Input.TextArea placeholder="例如：fake, confront, habitat, reluctant" rows={3} />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="button"
              onClick={handleGenerate}
              loading={loading}
              size="large"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                border: "none",
                borderRadius: 12,
              }}
            >
              生成练习
            </Button>
          </Form.Item>
        </Form>

        {loading && !streamingChunk && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" tip="AI 正在生成短文与题目…" />
          </div>
        )}

        {loading && streamingChunk && (
          <div
            style={{
              marginTop: 24,
              padding: 20,
              background: "#fff",
              border: "1px dashed #c7d2fe",
              borderRadius: 12,
              boxShadow: "0 2px 12px rgba(102, 126, 234, 0.1)",
            }}
          >
            <div style={{ marginBottom: 12, color: "#667eea", fontWeight: 600 }}>AI 正在生成…</div>
            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontFamily: "inherit",
                fontSize: 14,
                lineHeight: 1.8,
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

        {!loading && (article || questions.length > 0) && (
          <>
            {article ? (
              <div
                style={{
                  marginTop: 24,
                  padding: 20,
                  background: "#fafbff",
                  borderRadius: 12,
                  border: "1px solid #e8ecf4",
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 12,
                    color: "#334155",
                  }}
                >
                  阅读短文
                </div>
                <div
                  style={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.8,
                    color: "#475569",
                  }}
                >
                  {article}
                </div>
                {words.length > 0 && (
                  <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
                    涉及词汇：{words.join("、")}
                  </div>
                )}
              </div>
            ) : null}

            <div style={{ marginTop: 24 }}>
              <div style={{ fontWeight: 600, marginBottom: 16, color: "#334155" }}>选择题</div>
              {questions.map((q, idx) => {
                const qKey = getQuestionKey(q, idx);
                const result = getResult(q.id ?? qKey);
                return (
                  <Card
                    key={qKey}
                    size="small"
                    style={{
                      marginBottom: 16,
                      borderColor: result ? (result.correct ? "#52c41a" : "#ff4d4f") : undefined,
                      borderWidth: result ? 2 : 1,
                    }}
                  >
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ color: "#64748b", marginRight: 8 }}>{idx + 1}.</span>
                      {result && (
                        <span style={{ marginRight: 8 }}>
                          {result.correct ? (
                            <CheckCircleOutlined style={{ color: "#52c41a" }} />
                          ) : (
                            <CloseCircleOutlined style={{ color: "#ff4d4f" }} />
                          )}
                        </span>
                      )}
                      <span style={{ color: "#334155" }}>{q.stem}</span>
                    </div>
                    <Radio.Group
                      value={answers[qKey]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnswers((prev) => ({
                          ...prev,
                          [qKey]: typeof val === "number" ? val : Number(val),
                        }));
                      }}
                      disabled={results != null}
                    >
                      {q.options.map((opt, i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <Radio value={i}>
                            {OPTION_LABELS[i]}. {opt}
                            {result &&
                              result.correctIndex === i &&
                              result.userSelectedIndex !== i && (
                                <span style={{ color: "#52c41a", marginLeft: 8 }}>
                                  （正确答案）
                                </span>
                              )}
                          </Radio>
                        </div>
                      ))}
                    </Radio.Group>
                    {result?.explanation && (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          background: "#f6ffed",
                          borderRadius: 8,
                          fontSize: 13,
                          color: "#475569",
                        }}
                      >
                        {result.explanation}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>

            {results == null && (
              <div style={{ marginTop: 24 }}>
                <Button
                  type="primary"
                  htmlType="button"
                  size="large"
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={sessionId == null || questions.length === 0}
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    border: "none",
                    borderRadius: 12,
                  }}
                >
                  提交答案
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
};
