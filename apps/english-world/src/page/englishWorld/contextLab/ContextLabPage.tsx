import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Empty,
  InputNumber,
  message,
  Modal,
  Radio,
  Segmented,
  Space,
  Spin,
  Tag,
  Typography,
  Input,
} from "antd";
import {
  DownloadOutlined,
  ExperimentOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  ReloadOutlined,
  SendOutlined,
} from "@ant-design/icons";
import request from "@font/api";
import {
  contextLabCreateTask,
  contextLabHistory,
  contextLabSubmit,
  downloadContextLabPdfTemplate,
  downloadContextLabTaskPdf,
} from "../server/learning";
import type { ContextLabGenerateParams, ContextLabTask } from "../types/learning";
import type { ExerciseResultItem } from "@/server/exerciseAgent/exerciseAgent";
import {
  buildContextLabGenerateParams,
  type ContextLabSourceMode,
} from "./contextLabPlanning";
import {
  getContextLabStatusDescription,
  getContextLabStatusLabel,
  getContextLabStatusTone,
  isContextLabTaskActive,
} from "./contextLabTask";

const { Text, Title } = Typography;
const { TextArea } = Input;
const ANSWER_LETTERS = ["A", "B", "C", "D"];

function getAnswerLetter(index: number) {
  return ANSWER_LETTERS[index] ?? String(index);
}

function formatOptionLabel(option: string, optionIndex: number) {
  return `${getAnswerLetter(optionIndex)}. ${option}`;
}

function formatExplanationText(explanation: string, correctIndex: number) {
  const letter = getAnswerLetter(correctIndex);
  return explanation
    .replace(/正确答案为\s*[0-3]/g, `正确答案为 ${letter}`)
    .replace(/正确答案是\s*[0-3]/g, `正确答案是 ${letter}`);
}

function splitArticleParagraphs(article: string) {
  return article
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parseArticleContent(article: string) {
  const blocks = splitArticleParagraphs(article);
  if (blocks.length >= 4) {
    return {
      topic: blocks[0],
      paragraphs: blocks.slice(1),
    };
  }
  return {
    topic: undefined,
    paragraphs: blocks,
  };
}

export function formatElapsedSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0",
  )}`;
}

export function ContextLabPage() {
  const [sourceMode, setSourceMode] = useState<ContextLabSourceMode>("weak");
  const [count, setCount] = useState(8);
  const [customWords, setCustomWords] = useState("");
  const [creating, setCreating] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<ContextLabTask[]>([]);
  const [currentTask, setCurrentTask] = useState<ContextLabTask | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<ExerciseResultItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadingTaskId, setDownloadingTaskId] = useState<number | null>(
    null,
  );
  const [practiceModalOpen, setPracticeModalOpen] = useState(false);
  const [practiceFullscreen, setPracticeFullscreen] = useState(false);

  const requestBody = useMemo<ContextLabGenerateParams>(() => {
    return buildContextLabGenerateParams({ sourceMode, count, customWords });
  }, [count, customWords, sourceMode]);

  const hasActiveTask = history.some((task) =>
    isContextLabTaskActive(task.status),
  );

  const answeredCount =
    currentTask?.questions?.filter((question, index) => {
      const key = question.id || `q-${index}`;
      return answers[key] != null;
    }).length ?? 0;

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await request(
        contextLabHistory({ page: 1, pageSize: 10 }),
      );
      setHistory(response.list ?? []);
      setCurrentTask((prev) => {
        if (!prev) return prev;
        return (
          response.list?.find((task) => task.taskId === prev.taskId) ?? prev
        );
      });
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "历史记录加载失败");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  useEffect(() => {
    if (!hasActiveTask) return;
    const timer = window.setInterval(() => {
      void loadHistory();
    }, 2000);
    return () => window.clearInterval(timer);
  }, [hasActiveTask]);

  useEffect(() => {
    if (
      !practiceModalOpen ||
      currentTask?.status !== "succeeded" ||
      !currentTask.questions?.length ||
      results.length > 0
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [
    currentTask?.questions?.length,
    currentTask?.status,
    currentTask?.taskId,
    practiceModalOpen,
    results.length,
  ]);

  const handleGenerate = async () => {
    setCreating(true);
    setCurrentTask(null);
    setAnswers({});
    setResults([]);
    setElapsedSeconds(0);
    try {
      const task = await request(contextLabCreateTask(requestBody));
      setHistory((prev) => [
        task,
        ...prev.filter((item) => item.taskId !== task.taskId),
      ]);
      message.success("生成任务已提交");
      await loadHistory();
      setCurrentTask(task);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "任务提交失败");
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await downloadContextLabPdfTemplate();
      message.success("PDF 模板已开始下载");
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "PDF 模板下载失败");
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadTaskPdf = async (task: ContextLabTask) => {
    setDownloadingTaskId(task.taskId);
    try {
      await downloadContextLabTaskPdf(task.taskId);
      message.success("本次练习 PDF 已开始下载");
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "本次练习 PDF 下载失败");
    } finally {
      setDownloadingTaskId(null);
    }
  };

  const handleOpenTask = (task: ContextLabTask) => {
    setCurrentTask(task);
    setAnswers({});
    setResults([]);
    setElapsedSeconds(0);
    setPracticeFullscreen(false);
    setPracticeModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentTask?.questions?.length) return;
    const sessionId = currentTask.articleExerciseId ?? currentTask.taskId;
    const questionKeys = currentTask.questions.map((question, index) =>
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
          sessionId,
          answers: currentTask.questions.map((question, index) => {
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

  const renderTaskStatus = (task: ContextLabTask) => (
    <div className="context-lab-task-status">
      <div>
        <Text className="learning-cockpit-label">Task #{task.taskId}</Text>
        <Title level={4}>{getContextLabStatusLabel(task.status)}</Title>
        <Text type="secondary">
          {task.errorMessage || getContextLabStatusDescription(task.status)}
        </Text>
      </div>
      <Space>
        {task.status === "succeeded" && (
          <Button
            aria-label="下载本次练习 PDF"
            icon={<DownloadOutlined />}
            loading={downloadingTaskId === task.taskId}
            onClick={() => handleDownloadTaskPdf(task)}
          >
            下载本次练习 PDF
          </Button>
        )}
        <Tag color={getContextLabStatusTone(task.status)}>
          {getContextLabStatusLabel(task.status)}
        </Tag>
      </Space>
    </div>
  );

  const renderPracticeWorkspace = () => {
    if (
      currentTask?.status !== "succeeded" ||
      !currentTask.article ||
      !currentTask.questions
    ) {
      return null;
    }

    return (
      <div className="context-lab-practice-pack">
        <div className="context-lab-practice-workspace">
          <section aria-label="文章阅读区" className="context-lab-reading-pane">
            <div className="context-lab-article">
              {(() => {
                const articleContent = parseArticleContent(currentTask.article);
                return (
                  <>
                    <div className="context-lab-article-topic-wrap">
                      <Text className="learning-cockpit-label">
                        雅思阅读
                      </Text>
                      {articleContent.topic && (
                        <>
                          <Text className="context-lab-topic-label">
                            文章主题
                          </Text>
                          <span aria-hidden="true" className="context-lab-topic-divider">
                            /
                          </span>
                          <h4 className="context-lab-article-topic">
                            {articleContent.topic}
                          </h4>
                        </>
                      )}
                    </div>
                    {articleContent.paragraphs.map((paragraph, index) => (
                      <p
                        className="context-lab-article-paragraph"
                        key={`${paragraph}-${index}`}
                      >
                        {paragraph}
                      </p>
                    ))}
                  </>
                );
              })()}
            </div>
            <div className="learning-cockpit-word-strip">
              {currentTask.words.map((word) => (
                <Tag key={word} color="blue">
                  {word}
                </Tag>
              ))}
            </div>
          </section>

          <section aria-label="题目作答区" className="context-lab-question-pane">
            <div className="context-lab-question-toolbar">
              <div>
                <Text className="learning-cockpit-label">Questions</Text>
                <Title level={4}>题目</Title>
              </div>
              <div className="context-lab-timer">
                <Text>做题计时</Text>
                <strong>{formatElapsedSeconds(elapsedSeconds)}</strong>
                <span>
                  已答 {answeredCount}/{currentTask.questions.length}
                </span>
              </div>
            </div>

            <div className="context-lab-question-list">
              {currentTask.questions.map((question, index) => {
                const questionKey = question.id || `q-${index}`;
                const result = results.find(
                  (item) => item.questionId === questionKey,
                );
                return (
                  <section
                    className="context-lab-question-card"
                    key={questionKey}
                  >
                    <div className="context-lab-question-index">
                      第 {index + 1} 题
                    </div>
                    <p>{question.stem}</p>
                    {result && (
                      <Tag color={result.correct ? "green" : "red"}>
                        {result.correct ? "正确" : "需要复盘"}
                      </Tag>
                    )}
                    {result?.explanation && (
                      <div className="context-lab-question-explanation">
                        <Text className="learning-cockpit-label">解析</Text>
                        <p>
                          {formatExplanationText(
                            result.explanation,
                            result.correctIndex,
                          )}
                        </p>
                      </div>
                    )}
                    <Radio.Group
                      value={answers[questionKey]}
                      onChange={(event) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [questionKey]: event.target.value,
                        }))
                      }
                      options={question.options.map((option, optionIndex) => ({
                        label: formatOptionLabel(option, optionIndex),
                        value: optionIndex,
                      }))}
                    />
                  </section>
                );
              })}
            </div>

            <div className="context-lab-question-actions">
              <Button type="primary" loading={submitting} onClick={handleSubmit}>
                提交练习
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="context-lab-page">
        <section className="learning-cockpit-hero">
          <div>
            <Text className="learning-cockpit-label">B. Context Lab</Text>
            <Title level={1}>AI 语境实验室</Title>
            <p>
              把薄弱词、随机词或手输词生成雅思长度阅读、选择题和例句改写，让词库变成可练习的场景。
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
            loading={creating}
            onClick={handleGenerate}
          >
            生成练习包
          </Button>
          <Button
            icon={<DownloadOutlined />}
            loading={downloading}
            onClick={handleDownloadTemplate}
          >
            下载 PDF 模板
          </Button>
        </section>

        <section className="learning-cockpit-card">
          <div className="learning-cockpit-card-heading">
            <div>
              <Text className="learning-cockpit-label">Tasks</Text>
              <Title level={3}>生成任务</Title>
            </div>
            <Button
              icon={<ReloadOutlined />}
              loading={historyLoading}
              onClick={loadHistory}
            >
              刷新状态
            </Button>
          </div>

          {currentTask && renderTaskStatus(currentTask)}

          {!currentTask && historyLoading && (
            <div className="context-lab-history-empty">
              <Spin />
              <Text type="secondary">正在读取生成历史...</Text>
            </div>
          )}

          {!currentTask && !historyLoading && history.length === 0 && (
            <Empty description="还没有生成记录。先提交一组词。" />
          )}

          <div className="context-lab-history-list">
            {history.map((task) => (
              <div className="context-lab-history-item" key={task.taskId}>
                <div>
                  <Space wrap>
                    <Tag color={getContextLabStatusTone(task.status)}>
                      {getContextLabStatusLabel(task.status)}
                    </Tag>
                    <Text strong>{task.words.slice(0, 4).join(" / ")}</Text>
                  </Space>
                  <p>{task.errorMessage || `${task.words.length} 个词`}</p>
                </div>
                <Space>
                  {isContextLabTaskActive(task.status) && (
                    <Button size="small" onClick={loadHistory}>
                      刷新
                    </Button>
                  )}
                  {task.status === "succeeded" && (
                    <>
                      <Button size="small" onClick={() => handleOpenTask(task)}>
                        开始练习
                      </Button>
                      <Button
                        aria-label="下载练习 PDF"
                        size="small"
                        onClick={() => handleDownloadTaskPdf(task)}
                      >
                        下载练习 PDF
                      </Button>
                    </>
                  )}
                  {task.status === "failed" && (
                    <Button size="small" onClick={handleGenerate}>
                      重试
                    </Button>
                  )}
                </Space>
              </div>
            ))}
          </div>
        </section>
      </div>
      </div>

      <Modal
        className={`context-lab-practice-modal${
          practiceFullscreen ? " context-lab-practice-modal-fullscreen" : ""
        }`}
        destroyOnHidden={false}
        footer={null}
        open={practiceModalOpen}
        title={
          <div className="context-lab-practice-modal-title">
            <span>AI 语境练习</span>
            <Button
              aria-label={practiceFullscreen ? "退出满屏" : "占满屏幕"}
              icon={
                practiceFullscreen ? (
                  <FullscreenExitOutlined />
                ) : (
                  <FullscreenOutlined />
                )
              }
              size="small"
              type="text"
              onClick={() => setPracticeFullscreen((value) => !value)}
            >
              {practiceFullscreen ? "退出满屏" : "占满屏幕"}
            </Button>
          </div>
        }
        width={practiceFullscreen ? "100vw" : "min(1280px, 96vw)"}
        onCancel={() => setPracticeModalOpen(false)}
      >
        {renderPracticeWorkspace()}
      </Modal>
    </>
  );
}
