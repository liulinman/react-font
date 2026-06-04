import { useMemo, useState } from "react";
import {
  Button,
  Card,
  InputNumber,
  message,
  Radio,
  Segmented,
  Space,
  Tag,
  Typography,
  Input,
} from "antd";
import { ExperimentOutlined, SendOutlined } from "@ant-design/icons";
import { getApiBaseUrl } from "@font/api";
import request from "@font/api";
import { ContextStreamView } from "./ContextStreamView";
import { contextLabSubmit } from "../server/learning";
import { useSseStream } from "../shared/hooks/useSseStream";
import type { ContextLabGenerateParams, LearningWord } from "../types/learning";
import type {
  ExerciseGenerateResponse,
  ExerciseResultItem,
} from "@/server/exerciseAgent/exerciseAgent";
import {
  buildContextLabGenerateParams,
  type ContextLabSourceMode,
} from "./contextLabPlanning";

const { Text, Title } = Typography;
const { TextArea } = Input;

const weakWordSeeds: LearningWord[] = [
  { id: 1, word: "resilient", meaning: "有复原力的", level: 0 },
  { id: 2, word: "recover", meaning: "恢复", level: 1 },
  { id: 3, word: "fragile", meaning: "脆弱的", level: 0 },
];

export function ContextLabPage() {
  const [sourceMode, setSourceMode] = useState<ContextLabSourceMode>("weak");
  const [count, setCount] = useState(8);
  const [customWords, setCustomWords] = useState("");
  const [streamText, setStreamText] = useState("");
  const [practicePack, setPracticePack] =
    useState<ExerciseGenerateResponse | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<ExerciseResultItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const { loading, start } = useSseStream<ExerciseGenerateResponse>();

  const requestBody = useMemo<ContextLabGenerateParams>(() => {
    return buildContextLabGenerateParams({ sourceMode, count, customWords });
  }, [count, customWords, sourceMode]);

  const handleGenerate = () => {
    setStreamText("");
    setPracticePack(null);
    setAnswers({});
    setResults([]);
    start(`${getApiBaseUrl()}/context-lab/generate`, requestBody, {
      onChunk: (text) => setStreamText((prev) => prev + text),
      onDone: (data) => setPracticePack(data),
      onError: (message) => setStreamText(message),
    });
  };

  const handleSubmit = async () => {
    if (!practicePack) return;
    const questionKeys = practicePack.questions.map((question, index) =>
      question.id || `q-${index}`,
    );
    const unanswered = questionKeys.filter((key) => answers[key] == null);
    if (unanswered.length > 0) {
      message.warning(`还有 ${unanswered.length} 题未作答`);
      return;
    }

    setSubmitting(true);
    try {
      const response = await request(
        contextLabSubmit({
          sessionId: practicePack.sessionId,
          answers: practicePack.questions.map((question, index) => {
            const key = question.id || `q-${index}`;
            return {
              questionId: key,
              selectedIndex: answers[key],
            };
          }),
        }),
      );
      setResults(response.results ?? []);
      message.success("练习已提交");
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="context-lab-page">
      <section className="learning-cockpit-hero">
        <div>
          <Text className="learning-cockpit-label">B. Context Lab</Text>
          <Title level={1}>AI 语境实验室</Title>
          <p>
            把薄弱词、随机词或手输词生成短阅读、选择题和例句改写，让词库变成可练习的场景。
          </p>
        </div>
        <Tag icon={<ExperimentOutlined />} color="purple">
          AI generated
        </Tag>
      </section>

      <div className="context-lab-grid">
        <section className="learning-cockpit-card">
          <div className="learning-cockpit-card-heading">
            <div>
              <Text className="learning-cockpit-label">Source</Text>
              <Title level={3}>选择练习来源</Title>
            </div>
          </div>

          <Segmented
            block
            value={sourceMode}
            onChange={(value) => setSourceMode(value as ContextLabSourceMode)}
            options={[
              { label: "今日薄弱词", value: "weak" },
              { label: "随机词", value: "random" },
              { label: "手输词", value: "custom" },
            ]}
          />

          <div className="context-lab-source-panel">
            {sourceMode === "weak" && (
              <div className="learning-cockpit-word-strip">
                {weakWordSeeds.map((word) => (
                  <Tag key={word.id} color="red">
                    {word.word}
                  </Tag>
                ))}
              </div>
            )}

            {sourceMode === "random" && (
              <Space>
                <Text>生成数量</Text>
                <InputNumber
                  min={3}
                  max={20}
                  value={count}
                  onChange={(value) => setCount(value ?? 8)}
                />
              </Space>
            )}

            {sourceMode === "custom" && (
              <TextArea
                rows={5}
                value={customWords}
                onChange={(event) => setCustomWords(event.target.value)}
                placeholder="输入单词，用空格、英文逗号或中文逗号分隔"
              />
            )}
          </div>

          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={loading}
            onClick={handleGenerate}
          >
            生成练习包
          </Button>
        </section>

        <section className="learning-cockpit-card">
          <div className="learning-cockpit-card-heading">
            <div>
              <Text className="learning-cockpit-label">Practice Pack</Text>
              <Title level={3}>生成结果</Title>
            </div>
          </div>
          <ContextStreamView loading={loading} streamText={streamText} />
          {practicePack && (
            <div className="context-lab-practice-pack">
              <Card size="small" title="短阅读">
                <p>{practicePack.article}</p>
                <div className="learning-cockpit-word-strip">
                  {practicePack.words.map((word) => (
                    <Tag key={word} color="blue">
                      {word}
                    </Tag>
                  ))}
                </div>
              </Card>
              {practicePack.questions.map((question, index) => (
                <Card
                  key={question.id || index}
                  size="small"
                  title={`第 ${index + 1} 题`}
                >
                  <p>{question.stem}</p>
                  {results.find(
                    (result) =>
                      result.questionId === (question.id || `q-${index}`),
                  ) && (
                    <Tag
                      color={
                        results.find(
                          (result) =>
                            result.questionId ===
                            (question.id || `q-${index}`),
                        )?.correct
                          ? "green"
                          : "red"
                      }
                    >
                      {results.find(
                        (result) =>
                          result.questionId === (question.id || `q-${index}`),
                      )?.correct
                        ? "正确"
                        : "需要复盘"}
                    </Tag>
                  )}
                  <Radio.Group
                    value={answers[question.id || `q-${index}`]}
                    onChange={(event) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [question.id || `q-${index}`]: event.target.value,
                      }))
                    }
                    options={question.options.map((option, optionIndex) => ({
                      label: option,
                      value: optionIndex,
                    }))}
                  />
                </Card>
              ))}
              <Button
                type="primary"
                loading={submitting}
                onClick={handleSubmit}
              >
                提交练习
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
