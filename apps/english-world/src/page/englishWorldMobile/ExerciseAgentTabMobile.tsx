import React, { useState } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  Radio,
  Toast,
  Picker,
} from "antd-mobile";
import type { PickerActions } from "antd-mobile/es/components/picker";
import { CheckCircleOutline, CloseCircleOutline } from "antd-mobile-icons";
import request, { getApiBaseUrl } from "@font/api";
import {
  exerciseGenerate,
  exerciseSubmit,
} from "@/server/exerciseAgent/exerciseAgent";
import type {
  ExerciseGenerateParams,
  ExerciseGenerateResponse,
  ExerciseQuestion,
  ExerciseResultItem,
} from "@/server/exerciseAgent/exerciseAgent";
import { EnglishAbsorb } from "@/page/englishWorld/enum";

const OPTION_LABELS = ["A", "B", "C", "D"];

function getQuestionKey(q: ExerciseQuestion, idx: number) {
  return q?.id != null && String(q.id).trim() !== "" ? String(q.id) : `q-${idx}`;
}

export const ExerciseAgentTabMobile: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [article, setArticle] = useState("");
  const [words, setWords] = useState<string[]>([]);
  const [questions, setQuestions] = useState<ExerciseQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<ExerciseResultItem[] | null>(null);
  const [streamingChunk, setStreamingChunk] = useState("");
  const sourceTypePickerRef = React.useRef<PickerActions>(null);
  const proficiencyPickerRef = React.useRef<PickerActions>(null);

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      const sourceType = values.sourceType as
        | "proficiency"
        | "random"
        | "custom";

      let params: ExerciseGenerateParams;
      if (sourceType === "proficiency") {
        const levels = values.proficiencyLevels;
        const arr = Array.isArray(levels) ? levels : levels != null ? [levels] : [0, 1];
        params = {
          sourceType: "proficiency",
          proficiencyLevels: arr.map(Number),
          count: Math.min(20, Math.max(3, Number(values.count) ?? 8)),
        };
      } else if (sourceType === "random") {
        params = {
          sourceType: "random",
          count: Math.min(20, Math.max(3, Number(values.count) ?? 8)),
        };
      } else {
        const raw = (values.words ?? "")
          .trim()
          .split(/[\s,，]+/)
          .filter(Boolean);
        if (raw.length < 3) {
          Toast.show({ icon: "fail", content: "自定义单词至少需要 3 个" });
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

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        Toast.show({
          icon: "fail",
          content: (err as { message?: string }).message ?? "生成失败",
        });
        setLoading(false);
        return;
      }

      if (contentType.includes("text/event-stream") && res.body) {
        const reader = res.body.getReader();
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
              // ignore
            }
          }
        }
        if (buf.trim()) {
          try {
            const obj = JSON.parse(buf.replace(/^data:\s*/, "").trim()) as {
              type?: string;
              data?: string | ExerciseGenerateResponse;
            };
            if (obj.type === "done" && obj.data != null && typeof obj.data === "object") {
              doneData = obj.data as ExerciseGenerateResponse;
            }
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
            Toast.show({ icon: "fail", content: "流式数据解析失败" });
            setLoading(false);
            return;
          }
        } else {
          Toast.show({ icon: "fail", content: "流式响应为空" });
          setLoading(false);
          return;
        }
        setStreamingChunk("");
        setSessionId(data.sessionId);
        setArticle(data.article ?? "");
        setWords(Array.isArray(data.words) ? data.words : []);
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        Toast.show({ icon: "success", content: "练习已生成" });
      } else if (contentType.includes("application/json")) {
        const json = await res.json();
        const data = (json.data ?? json) as ExerciseGenerateResponse;
        setSessionId(data.sessionId);
        setArticle(data.article ?? "");
        setWords(data.words ?? []);
        setQuestions(data.questions ?? []);
        Toast.show({ icon: "success", content: "练习已生成" });
      } else {
        const data = await request<ExerciseGenerateResponse>(
          exerciseGenerate(params)
        );
        setSessionId(data.sessionId);
        setArticle(data.article ?? "");
        setWords(data.words ?? []);
        setQuestions(data.questions ?? []);
        Toast.show({ icon: "success", content: "练习已生成" });
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      Toast.show({ icon: "fail", content: err?.message ?? "生成失败" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (sessionId == null || questions.length === 0) {
        Toast.show({ icon: "fail", content: "请先生成练习" });
        return;
      }
      const keys = questions.map((q, i) => getQuestionKey(q, i));
      const unanswered = questions.filter((_, i) => {
        const key = keys[i];
        const v = answers[key];
        return v === undefined || v === null;
      });
      if (unanswered.length > 0) {
        Toast.show({
          icon: "fail",
          content: `还有 ${unanswered.length} 题未作答`,
        });
        return;
      }
      const res = await request(
        exerciseSubmit({
          sessionId,
          answers: questions.map((q, i) => {
            const key = keys[i];
            const selectedIndex = Number(answers[key]);
            return {
              questionId:
                q?.id != null && String(q.id).trim() !== "" ? q.id : key,
              selectedIndex: Number.isNaN(selectedIndex) ? 0 : selectedIndex,
            };
          }),
        })
      );
      setResults(res.results ?? []);
      Toast.show({ icon: "success", content: "已提交" });
    } catch (e: unknown) {
      const err = e as { message?: string };
      Toast.show({ icon: "fail", content: err?.message ?? "提交失败" });
    } finally {
      setSubmitting(false);
    }
  };

  const getResult = (questionId: string) =>
    results?.find((r) => r.questionId === questionId);

  return (
    <div style={{ padding: "16px", paddingBottom: 24 }}>
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <div style={{ marginBottom: 8, color: "#667eea", fontWeight: 600 }}>
          阅读 + 选择题练习
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
          按熟练度/随机/自定义单词生成短文与单选题，提交后查看解析。
        </p>
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            sourceType: "proficiency",
            proficiencyLevels: [0],
            count: 8,
          }}
        >
          <Form.Item
            label="选题方式"
            name="sourceType"
            trigger="onConfirm"
            getValueFromEvent={(v) => (Array.isArray(v) ? v[0] : v)}
            getValueProps={(v) => ({ value: v != null ? [v] : undefined })}
            onClick={() => sourceTypePickerRef.current?.open()}
          >
            <Picker
              ref={sourceTypePickerRef}
              columns={[
                [
                  { label: "按熟练度筛选", value: "proficiency" },
                  { label: "随机抽词", value: "random" },
                  { label: "自定义单词", value: "custom" },
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
            noStyle
            shouldUpdate={(prev, cur) => prev.sourceType !== cur.sourceType}
          >
            {({ getFieldValue }) => {
              const st = getFieldValue("sourceType");
              if (st === "proficiency") {
                return (
                  <>
                    <Form.Item
                      label="熟练度"
                      name="proficiencyLevels"
                      trigger="onConfirm"
                      getValueFromEvent={(v) => (Array.isArray(v) ? v : [v])}
                      getValueProps={(v) => ({
                        value: Array.isArray(v) ? v : v != null ? [v] : undefined,
                      })}
                      onClick={() => proficiencyPickerRef.current?.open()}
                    >
                      <Picker
                        ref={proficiencyPickerRef}
                        columns={[
                          [
                            { label: EnglishAbsorb[0], value: 0 },
                            { label: EnglishAbsorb[1], value: 1 },
                            { label: EnglishAbsorb[2], value: 2 },
                            { label: EnglishAbsorb[3], value: 3 },
                          ],
                        ]}
                      >
                        {(items) => (
                          <div style={{ padding: "8px 0" }}>
                            {items?.map((i) => i?.label).join("、") ?? "请选择"}
                          </div>
                        )}
                      </Picker>
                    </Form.Item>
                    <Form.Item label="抽词数量" name="count">
                      <Input type="number" placeholder="3～20" min={3} max={20} />
                    </Form.Item>
                  </>
                );
              }
              if (st === "random") {
                return (
                  <Form.Item label="抽词数量" name="count">
                    <Input type="number" placeholder="3～20" min={3} max={20} />
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
                  <Input.TextArea
                    placeholder="例如：fake, confront, habitat"
                    rows={3}
                  />
                </Form.Item>
              );
            }}
          </Form.Item>

          <Form.Item>
            <Button
              block
              color="primary"
              onClick={handleGenerate}
              loading={loading}
              style={{ borderRadius: 10 }}
            >
              生成练习
            </Button>
          </Form.Item>
        </Form>

        {loading && !streamingChunk && (
          <div style={{ textAlign: "center", padding: 24, color: "#999" }}>
            AI 正在生成短文与题目…
          </div>
        )}

        {loading && streamingChunk && (
          <div
            style={{
              padding: 16,
              background: "#fafbff",
              borderRadius: 10,
              border: "1px dashed #c7d2fe",
            }}
          >
            <div style={{ marginBottom: 8, color: "#667eea", fontWeight: 600 }}>
              AI 正在生成…
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
          </div>
        )}
      </Card>

      {!loading && (article || questions.length > 0) && (
        <>
          {article ? (
            <Card
              title="阅读短文"
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <div
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.8,
                  color: "#475569",
                  fontSize: 14,
                }}
              >
                {article}
              </div>
              {words.length > 0 && (
                <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>
                  涉及词汇：{words.join("、")}
                </div>
              )}
            </Card>
          ) : null}

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 12, color: "#334155" }}>
              选择题
            </div>
            {questions.map((q, idx) => {
              const qKey = getQuestionKey(q, idx);
              const result = getResult(q.id ?? qKey);
              return (
                <Card
                  key={qKey}
                  style={{
                    marginBottom: 12,
                    borderRadius: 12,
                    borderColor: result
                      ? result.correct
                        ? "#52c41a"
                        : "#ff4d4f"
                      : undefined,
                    borderWidth: result ? 2 : 1,
                  }}
                >
                  <div style={{ marginBottom: 10 }}>
                    <span style={{ color: "#64748b", marginRight: 6 }}>
                      {idx + 1}.
                    </span>
                    {result && (
                      <span style={{ marginRight: 6 }}>
                        {result.correct ? (
                          <CheckCircleOutline
                            style={{ color: "#52c41a", fontSize: 16 }}
                          />
                        ) : (
                          <CloseCircleOutline
                            style={{ color: "#ff4d4f", fontSize: 16 }}
                          />
                        )}
                      </span>
                    )}
                    <span style={{ color: "#334155", fontSize: 14 }}>
                      {q.stem}
                    </span>
                  </div>
                  <Radio.Group
                    value={answers[qKey]}
                    onChange={(val) => {
                      setAnswers((prev) => ({
                        ...prev,
                        [qKey]: typeof val === "number" ? val : Number(val),
                      }));
                    }}
                    disabled={results != null}
                  >
                    {q.options.map((opt, i) => (
                      <Radio key={i} value={i} style={{ display: "block", marginBottom: 8 }}>
                        {OPTION_LABELS[i]}. {opt}
                        {result &&
                          result.correctIndex === i &&
                          result.userSelectedIndex !== i && (
                            <span style={{ color: "#52c41a", marginLeft: 6 }}>
                              （正确答案）
                            </span>
                          )}
                      </Radio>
                    ))}
                  </Radio.Group>
                  {result?.explanation && (
                    <div
                      style={{
                        marginTop: 12,
                        padding: 10,
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
            <Button
              block
              color="primary"
              size="large"
              onClick={handleSubmit}
              loading={submitting}
              disabled={sessionId == null || questions.length === 0}
              style={{ borderRadius: 10 }}
            >
              提交答案
            </Button>
          )}
        </>
      )}
    </div>
  );
};
