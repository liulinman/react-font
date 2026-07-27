import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Button,
  Card,
  Form,
  Input,
  message,
  Space,
  Typography,
  Divider,
  Statistic,
  Row,
  Col,
  Tag,
  Spin,
  Empty,
  Modal,
  Progress,
  Alert,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  HistoryOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { EnglishWorldLayout } from "../layout/EnglishWorldLayout";
import request from "@font/api";
import {
  startRecite,
  submitAnswer,
  getReciteHistory,
  getReciteStats,
  getReciteSessionResult,
  type StartReciteResponse,
  type SubmitAnswerResponse,
  type Question,
  type AnswerItem,
  type ReciteSession,
  type HistoryWordItem,
  type GetHistoryResponse,
  type GetStatsResponse,
} from "@/server/recite/recite";
import { getSystemSettings } from "../component/SystemSettings";
import { PracticeDirection } from "../enum";
import {
  createReviewProgress,
  createReviewResultInsight,
  createReviewCardState,
  getWrongWordIds,
  getContextRepairWords,
  buildMicroContextPath,
  orderResultsForReview,
} from "./reviewExperience";
import { BritishPronunciationButton } from "../component/BritishPronunciationButton";
import { parsePlanReviewSearch } from "./planReview";
import {
  buildLearningEventUid,
  recordLearningEvent,
} from "../analytics/learningEvents";

const { Title, Text } = Typography;

type ReciteStatus = "idle" | "practicing" | "submitted" | "loading";

const createFlowId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `flow-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const RecitePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const [status, setStatus] = useState<ReciteStatus>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [direction, setDirection] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<SubmitAnswerResponse | null>(null);
  const [history, setHistory] = useState<ReciteSession[]>([]);
  const [stats, setStats] = useState<GetStatsResponse | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<number[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [recoveryError, setRecoveryError] = useState(false);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const flowIdRef = useRef(createFlowId());
  const submitInFlightRef = useRef(false);
  const recoveredSessionRef = useRef<number | null>(null);

  const answeredCount = questions.filter(
    (question) => answers[question.wordId]?.trim(),
  ).length;
  const progress = createReviewProgress({
    totalCount: questions.length,
    answeredCount,
  });
  const resultInsight = results
    ? createReviewResultInsight(results.statistics)
    : null;
  const orderedResults = results ? orderResultsForReview(results.results) : [];
  const wrongWordIds = useMemo(
    () => (results ? getWrongWordIds(results.results) : []),
    [results],
  );
  const contextRepairWords = useMemo(
    () => (results ? getContextRepairWords(results.results) : []),
    [results],
  );
  const currentQuestion = questions[currentIndex];
  const cardState = createReviewCardState({
    totalCount: questions.length,
    currentIndex,
  });
  const progressDots = Array.from(
    { length: cardState.totalCount },
    (_, index) => index,
  );
  const planReview = useMemo(
    () => parsePlanReviewSearch(location.search),
    [location.search],
  );
  const isPlanReview = planReview.wordIds.length > 0;
  const displayedPlanWordCount = Math.min(planReview.wordIds.length, 50);
  const isNextDayRepair = planReview.title === "复查昨日错词";
  const recoverySessionId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("view") !== "result") return null;
    const sessionId = Number(params.get("sessionId"));
    return Number.isInteger(sessionId) && sessionId > 0 ? sessionId : null;
  }, [location.search]);

  useEffect(() => {
    if (!recoverySessionId) {
      if (recoveredSessionRef.current !== null) {
        recoveredSessionRef.current = null;
        setResults(null);
        setRecoveryError(false);
        setStatus("idle");
      }
      return;
    }
    if (recoveredSessionRef.current === recoverySessionId) {
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      if (!active) return;
      setRecoveryError(false);
      setStatus("loading");
      void request<SubmitAnswerResponse>(
        getReciteSessionResult({ sessionId: recoverySessionId }),
      )
        .then((response) => {
          if (!active) return;
          recoveredSessionRef.current = response.sessionId;
          setResults(response);
          setDirection(response.direction ?? 0);
          setStatus("submitted");
          const words = getContextRepairWords(response.results);
          if (words.length > 0) {
            void recordLearningEvent({
              eventUid: buildLearningEventUid(
                "eligible_wrong_result_viewed",
                response.sessionId,
              ),
              eventType: "eligible_wrong_result_viewed",
              reciteSessionId: response.sessionId,
              wordCount: words.length,
              timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
              status: "viewed",
            });
          }
        })
        .catch(() => {
          if (!active) return;
          setRecoveryError(true);
          setStatus("idle");
        });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [recoveryAttempt, recoverySessionId]);

  // 开始默写
  const handleStartRecite = useCallback(async () => {
    try {
      setLoading(true);
      setStatus("loading");

      // 获取用户配置
      const settings = await getSystemSettings();
      const config = settings.wordDictation;

      // 调用开始默写接口
      const response = await request<StartReciteResponse>(
        startRecite({
          wordCount: config.dictationCount,
          proficiencyLevels: config.proficiencyLevels,
          types: config.types,
          direction: config.direction,
          ...(isPlanReview ? { wordIds: planReview.wordIds } : {}),
          ...(isPlanReview ? { wordCount: planReview.wordIds.length } : {}),
        })
      );

      setQuestions(response.questions);
      setDirection(response.direction);
      setAnswers({});
      setResults(null);
      setCurrentIndex(0);
      setStatus("practicing");
      form.resetFields();
      flowIdRef.current = createFlowId();
      void recordLearningEvent({
        eventUid: buildLearningEventUid("recite_started", flowIdRef.current),
        eventType: "recite_started",
        flowId: flowIdRef.current,
        wordCount: response.totalCount,
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        status: "started",
      });
      if (isNextDayRepair) {
        void recordLearningEvent({
          eventUid: buildLearningEventUid(
            "next_day_repair_started",
            flowIdRef.current,
          ),
          eventType: "next_day_repair_started",
          flowId: flowIdRef.current,
          wordCount: response.totalCount,
          timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
          status: "started",
        });
      }
    } catch (error: unknown) {
      console.error("开始默写失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "今日复习加载失败，请重试";
      message.error(errorMessage);
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  }, [form, isNextDayRepair, isPlanReview, planReview.wordIds]);

  // 提交答案
  const handleSubmit = useCallback(async () => {
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    try {
      // 所有题目都提交，空答案默认为 ''
      const answerItems: AnswerItem[] = questions.map((q) => {
        const userAnswer = answers[q.wordId]?.trim() || "";
        return {
          wordId: q.wordId,
          userAnswer,
        };
      });

      setLoading(true);

      // 调用提交答案接口
      const response = await request<SubmitAnswerResponse>(
        submitAnswer({
          answers: answerItems,
          direction,
        })
      );

      recoveredSessionRef.current = response.sessionId;
      setResults(response);
      setStatus("submitted");
      message.success("今日复习完成");
      const repairWords = getContextRepairWords(response.results);
      void recordLearningEvent({
        eventUid: buildLearningEventUid("recite_completed", response.sessionId),
        eventType: "recite_completed",
        flowId: flowIdRef.current,
        reciteSessionId: response.sessionId,
        wordCount: response.statistics.totalCount,
        correctCount: response.statistics.correctCount,
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        status: "completed",
      });
      if (repairWords.length > 0) {
        void recordLearningEvent({
          eventUid: buildLearningEventUid(
            "eligible_wrong_result_viewed",
            response.sessionId,
          ),
          eventType: "eligible_wrong_result_viewed",
          reciteSessionId: response.sessionId,
          wordCount: repairWords.length,
          timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
          status: "viewed",
        });
      }
      if (isNextDayRepair && response.statistics.correctCount > 0) {
        void recordLearningEvent({
          eventUid: buildLearningEventUid(
            "next_day_repair_correct",
            response.sessionId,
          ),
          eventType: "next_day_repair_correct",
          flowId: flowIdRef.current,
          reciteSessionId: response.sessionId,
          wordCount: response.statistics.totalCount,
          correctCount: response.statistics.correctCount,
          timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
          status: "completed",
        });
      }
      navigate(
        `/englishWorld/recite?view=result&sessionId=${response.sessionId}`,
        { replace: true },
      );
    } catch (error: unknown) {
      console.error("提交答案失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "提交复习结果失败，请重试";
      message.error(errorMessage);
    } finally {
      submitInFlightRef.current = false;
      setLoading(false);
    }
  }, [questions, answers, direction, isNextDayRepair, navigate]);

  const handleContextRepair = useCallback(() => {
    if (!results || contextRepairWords.length === 0) return;
    void recordLearningEvent({
      eventUid: buildLearningEventUid(
        "micro_context_started",
        results.sessionId,
      ),
      eventType: "micro_context_started",
      flowId: flowIdRef.current,
      reciteSessionId: results.sessionId,
      wordCount: contextRepairWords.length,
      timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
      status: "started",
    });
    navigate(buildMicroContextPath(results.sessionId, contextRepairWords));
  }, [contextRepairWords, navigate, results]);

  const handleRepairWrongWords = useCallback(async () => {
    if (wrongWordIds.length === 0) {
      navigate("/englishWorld");
      return;
    }

    try {
      setLoading(true);
      setStatus("loading");
      const response = await request<StartReciteResponse>(
        startRecite({
          wordIds: wrongWordIds,
          wordCount: wrongWordIds.length,
          direction,
        }),
      );

      setQuestions(response.questions);
      setDirection(response.direction);
      setAnswers({});
      setResults(null);
      setCurrentIndex(0);
      setStatus("practicing");
      form.resetFields();
      flowIdRef.current = createFlowId();
      void recordLearningEvent({
        eventUid: buildLearningEventUid("recite_started", flowIdRef.current),
        eventType: "recite_started",
        flowId: flowIdRef.current,
        wordCount: response.totalCount,
        timezoneOffsetMinutes: -new Date().getTimezoneOffset(),
        status: "started",
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "错词复习加载失败，请重试";
      message.error(errorMessage);
      setStatus("submitted");
    } finally {
      setLoading(false);
    }
  }, [direction, form, navigate, wrongWordIds]);

  // 获取历史记录
  const loadHistory = useCallback(async (pageNum: number = 1) => {
    try {
      setLoading(true);
      const response = await request<GetHistoryResponse>(
        getReciteHistory({
          page: pageNum,
          pageSize: 10, // 每页显示10个会话
        })
      );
      setHistory(response.list || []);
      setHistoryTotal(response.total || 0);
      setHistoryPage(response.page || 1);
    } catch (error: unknown) {
      console.error("获取历史记录失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "获取历史记录失败";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 切换会话展开状态
  const toggleSession = useCallback((sessionId: number) => {
    setExpandedSessions((prev) =>
      prev.includes(sessionId)
        ? prev.filter((id) => id !== sessionId)
        : [...prev, sessionId]
    );
  }, []);

  // 获取统计信息
  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await request<GetStatsResponse>(getReciteStats());
      setStats(response);
    } catch (error: unknown) {
      console.error("获取统计信息失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "获取统计信息失败";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // 重新开始
  const handleRestart = () => {
    setStatus("idle");
    setQuestions([]);
    setAnswers({});
    setResults(null);
    setCurrentIndex(0);
    form.resetFields();
  };

  const handleAnswerChange = (wordId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [wordId]: value,
    }));
  };

  const goPrevQuestion = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const goNextQuestion = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1));
  };

  return (
    <EnglishWorldLayout activeKey="recite">
      <div className="recite-loop">
        {/* 标题和操作按钮 */}
        <section className="recite-loop-topbar">
          <Title level={2} className="mb-0">
            今日复习
          </Title>
          <Space>
            {status !== "idle" && (
              <>
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => {
                    setShowHistory(true);
                    loadHistory(1);
                  }}
                >
                  历史记录
                </Button>
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => {
                    setShowStats(true);
                    loadStats();
                  }}
                >
                  统计信息
                </Button>
              </>
            )}
            {status === "practicing" && cardState.isLast && (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                size="large"
              >
                完成复习
              </Button>
            )}
            {status === "submitted" && (
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRestart}
                size="large"
              >
                重新开始
              </Button>
            )}
          </Space>
        </section>

        {/* 练习中 */}
        {status === "practicing" && (
          <Card className="recite-question-panel recite-studio-shell">
            <div className="recite-session-header">
              <div>
                <Text className="recite-session-kicker">REVIEW STUDIO</Text>
                <Title level={3}>默写训练舱</Title>
                <Text type="secondary">
                  {direction === PracticeDirection.ChineseToEnglish
                    ? "看中文，准确写出英文。"
                    : "看英文，准确写出中文。"}
                  先完成本轮，再集中处理错词。
                </Text>
              </div>
              <div className="recite-session-metrics">
                <div>
                  <span>当前</span>
                  <strong>{cardState.displayIndex}</strong>
                </div>
                <div>
                  <span>题量</span>
                  <strong>{cardState.totalCount}</strong>
                </div>
                <div>
                  <span>完成</span>
                  <strong>{progress.percent}%</strong>
                </div>
              </div>
            </div>
            {currentQuestion && (
              <div className="recite-studio-grid">
                <section className="recite-question-canvas">
                  <div className="recite-question-topline">
                    <span>第 {cardState.displayIndex} 题</span>
                    <span>
                      {direction === PracticeDirection.ChineseToEnglish
                        ? "中文提示"
                        : "英文提示"}
                    </span>
                  </div>
                  <div
                    className="recite-question-stage"
                    key={currentQuestion.wordId}
                  >
                    <div className="recite-prompt-card">
                      <div className="recite-prompt-content">
                        <Title level={2}>
                          {currentQuestion.question}
                        </Title>
                        {direction === PracticeDirection.EnglishToChinese && (
                          <BritishPronunciationButton
                            word={currentQuestion.question}
                            size="middle"
                          />
                        )}
                      </div>
                    </div>
                    <div className="recite-answer-dock">
                      <div className="recite-answer-dock-head">
                        <Text strong>写下答案</Text>
                        <Text type="secondary">
                          {answers[currentQuestion.wordId]?.trim()
                            ? "已记录"
                            : "留空也可以继续"}
                        </Text>
                      </div>
                      <Form form={form} layout="vertical" className="recite-answer-form">
                        <Form.Item name={`answer_${currentQuestion.wordId}`}>
                          <Input
                            aria-label="你的答案"
                            key={currentQuestion.wordId}
                            autoFocus
                            placeholder="输入答案，按 Enter 继续"
                            size="large"
                            value={answers[currentQuestion.wordId] || ""}
                            onChange={(e) =>
                              handleAnswerChange(currentQuestion.wordId, e.target.value)
                            }
                            onPressEnter={(e) => {
                              e.preventDefault();
                              if (cardState.canGoNext) {
                                goNextQuestion();
                              } else {
                                handleSubmit();
                              }
                            }}
                          />
                        </Form.Item>
                      </Form>
                    </div>
                  </div>
                  <div className="recite-answer-bar">
                    <Button
                      size="large"
                      disabled={!cardState.canGoPrev}
                      onClick={goPrevQuestion}
                    >
                      上一题
                    </Button>
                    <Text type="secondary">Enter 继续，最后一题自动提交</Text>
                    {cardState.canGoNext ? (
                      <Button type="primary" size="large" onClick={goNextQuestion}>
                        下一题
                      </Button>
                    ) : (
                      <Button
                        type="primary"
                        size="large"
                        loading={loading}
                        onClick={handleSubmit}
                      >
                        完成复习
                      </Button>
                    )}
                  </div>
                </section>
                <aside className="recite-practice-rail">
                  <div className="recite-rail-card">
                    <Text className="recite-rail-label">SESSION PROGRESS</Text>
                    <div className="recite-progress-meta">
                      <span>已完成 {progress.answeredCount}</span>
                      <span>剩余 {progress.remainingCount}</span>
                    </div>
                    <Progress percent={progress.percent} size="small" />
                    <div className="recite-progress-dots" aria-label="题目进度">
                      {progressDots.map((index) => {
                        const dotQuestion = questions[index];
                        const isAnswered = Boolean(
                          dotQuestion && answers[dotQuestion.wordId]?.trim(),
                        );
                        const isCurrent = index === currentIndex;
                        const className = [
                          "recite-progress-dot",
                          isAnswered ? "recite-progress-dot-active" : "",
                          isCurrent ? "recite-progress-dot-current" : "",
                        ]
                          .filter(Boolean)
                          .join(" ");

                        return <span key={index} className={className} />;
                      })}
                    </div>
                  </div>
                  <div className="recite-rail-card recite-rail-tip">
                    <Text strong>完成感设计</Text>
                    <Text type="secondary">
                      一题一题推进，先完成，再修错。结果页会自动把错词提到最前面。
                    </Text>
                  </div>
                </aside>
              </div>
            )}
          </Card>
        )}
        {/* 提交结果 */}
        {status === "submitted" && results && (
          <Card className="recite-result-panel">
            {resultInsight && (
              <div className="recite-result-next">
                <Alert
                  className="mb-4"
                  type={resultInsight.tone === "danger" ? "error" : resultInsight.tone}
                  showIcon
                  message={resultInsight.title}
                  description={
                    <div>
                      <div>{resultInsight.description}</div>
                      <div className="mt-1">{resultInsight.nextAction}</div>
                    </div>
                  }
                />
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <Text strong>下一步</Text>
                    <div className="mt-1 text-sm text-gray-500">
                      {resultInsight.priority === "repair"
                        ? "优先巩固本轮没记牢的词，完成后再回到今日路线。"
                        : "今天的复习已经闭环，回到首页查看整体学习节奏。"}
                    </div>
                  </div>
                  <Space wrap className="recite-result-actions">
                    <Button
                      type="primary"
                      size="large"
                      icon={
                        resultInsight.priority === "repair" ? (
                          <ReloadOutlined />
                        ) : (
                          <CheckOutlined />
                        )
                      }
                      onClick={
                        wrongWordIds.length > 0
                          ? handleRepairWrongWords
                          : () => navigate("/englishWorld")
                      }
                      loading={loading}
                    >
                      {wrongWordIds.length > 0
                        ? "再练错词"
                        : "完成，回到今日路线"}
                    </Button>
                    {contextRepairWords.length > 0 && (
                      <Button
                        className="recite-context-repair-action"
                        size="large"
                        icon={<ExperimentOutlined aria-label="语境练习" />}
                        onClick={handleContextRepair}
                      >
                        用错词做语境练习 · {contextRepairWords.length} 个词 · 约 3 分钟
                      </Button>
                    )}
                    <Button
                      size="large"
                      onClick={() => navigate("/englishWorld")}
                    >
                      回到今日路线
                    </Button>
                  </Space>
                </div>
              </div>
            )}
            <div className="mb-6">
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="总题数"
                    value={results.statistics.totalCount}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="正确数"
                    value={results.statistics.correctCount}
                    valueStyle={{ color: "#3f8600" }}
                    prefix={<CheckOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="错误数"
                    value={results.statistics.errorCount}
                    valueStyle={{ color: "#cf1322" }}
                    prefix={<CloseOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="正确率"
                    value={results.statistics.accuracy}
                    precision={2}
                    suffix="%"
                    valueStyle={{
                      color:
                        results.statistics.accuracy >= 80
                          ? "#3f8600"
                          : results.statistics.accuracy >= 60
                          ? "#faad14"
                          : "#cf1322",
                    }}
                  />
                </Col>
              </Row>
	            </div>
	            <Divider />
            <div className="recite-result-list">
              {orderedResults.map((result, index) => (
                <div
                  key={`${result.wordId}-${index}`}
                  data-testid="recite-result-item"
                  className={`recite-result-item ${
                    result.isCorrect
                      ? "recite-result-item-correct"
                      : "recite-result-item-wrong"
                  }`}
                >
                  <div className="recite-result-item-head">
                    <Text strong>{result.englishWord}</Text>
                    {result.isCorrect ? (
                      <Tag color="success" icon={<CheckOutlined />}>
                        正确
                      </Tag>
                    ) : (
                      <Tag color="error" icon={<CloseOutlined />}>
                        错误
                      </Tag>
                    )}
                  </div>
                  <div>
                    <div className="recite-result-answer">
                      <Text type="secondary">单词: </Text>
                      <span className="inline-flex items-center gap-1">
                        <Text>{result.englishWord}</Text>
                        <BritishPronunciationButton word={result.englishWord} />
                      </span>
                    </div>
                    <div className="recite-result-answer">
                      <Text type="secondary">正确答案: </Text>
                      <Text strong className="text-green-600">
                        {result.correctAnswer}
                      </Text>
                    </div>
                    {!result.isCorrect && (
                      <div className="recite-result-answer">
                        <Text type="secondary">你的答案: </Text>
                        <Text strong className="text-red-600">
                          {result.userAnswer || "(未填写)"}
                        </Text>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* 初始状态 */}
        {status === "idle" && (
          <Card className="recite-intro-panel">
            <div className="flex flex-col gap-6">
              {recoveryError && (
                <Alert
                  type="warning"
                  showIcon
                  message="本次复习记录不可用"
                  description="记录可能已失效，请返回今日路线重新开始。"
                  action={
                    <Space>
                      <Button onClick={() => setRecoveryAttempt((value) => value + 1)}>
                        重试加载
                      </Button>
                      <Button onClick={() => navigate("/englishWorld")}>
                        返回今日路线
                      </Button>
                    </Space>
                  }
                />
              )}
              <div>
                <Tag color="blue" icon={<ThunderboltOutlined />}>
                  今日任务
                </Tag>
                <Title level={3} className="mt-4 mb-2">
                  先完成一轮短复习
                </Title>
                <Text type="secondary">
                  {isPlanReview
                    ? "这组词来自今日计划，会优先复习刚被标记为薄弱的词。"
                    : "系统会按你的配置抽取一组词。目标不是刷很多，而是每天稳定完成一次。"}
                </Text>
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="建议时长" value={3} suffix="分钟" />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="任务规模"
                    value={isPlanReview ? displayedPlanWordCount : "短组"}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={isPlanReview ? "计划来源" : "完成反馈"}
                    value={isPlanReview ? planReview.title ?? "今日计划" : "即时"}
                  />
                </Col>
              </Row>
              <Space>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartRecite}
                  loading={loading}
                  size="large"
                >
                  开始今日复习
                </Button>
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => {
                    setShowHistory(true);
                    loadHistory(1);
                  }}
                >
                  看历史
                </Button>
                <Button
                  icon={<BarChartOutlined />}
                  onClick={() => {
                    setShowStats(true);
                    loadStats();
                  }}
                >
                  看统计
                </Button>
                <Button
                  icon={<ExperimentOutlined />}
                  onClick={() => navigate("/englishWorld/ielts-core")}
                >
                  雅思核心复习
                </Button>
              </Space>
            </div>
          </Card>
        )}

        {/* 加载中 */}
        {status === "loading" && (
          <Card className="recite-intro-panel">
            <div className="text-center py-8">
              <Spin size="large" />
              <div className="mt-4">
                <Text type="secondary">正在准备今日复习...</Text>
              </div>
            </div>
          </Card>
        )}

        {/* 历史记录弹窗 */}
        <Modal
          title="默写历史记录"
          open={showHistory}
          onCancel={() => {
            setShowHistory(false);
            setExpandedSessions([]);
          }}
          footer={null}
          width={900}
        >
          <Spin spinning={loading}>
            {history.length === 0 ? (
              <Empty description="暂无历史记录" />
            ) : (
              <div className="space-y-4">
                {/* 会话列表 */}
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {history.map((session) => (
                    <Card
                      key={session.sessionId}
                      size="small"
                      className="mb-3 border border-gray-200"
                    >
                      {/* 会话摘要信息 */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <Text strong className="text-base">
                              {new Date(session.createTime).toLocaleString(
                                "zh-CN"
                              )}
                            </Text>
                            <Tag
                              color={
                                session.direction ===
                                PracticeDirection.ChineseToEnglish
                                  ? "blue"
                                  : "purple"
                              }
                            >
                              {session.direction ===
                              PracticeDirection.ChineseToEnglish
                                ? "中文写英文"
                                : "英文写中文"}
                            </Tag>
                          </div>
                          <Button
                            type="link"
                            size="small"
                            onClick={() => toggleSession(session.sessionId)}
                          >
                            {expandedSessions.includes(session.sessionId)
                              ? "收起详情"
                              : "展开详情"}
                          </Button>
                        </div>
                        <Row gutter={16}>
                          <Col span={6}>
                            <Statistic
                              title="总数"
                              value={session.wordCount}
                              valueStyle={{ fontSize: "16px" }}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="正确"
                              value={session.correctCount}
                              valueStyle={{
                                color: "#3f8600",
                                fontSize: "16px",
                              }}
                              prefix={<CheckOutlined />}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="错误"
                              value={session.errorCount}
                              valueStyle={{
                                color: "#cf1322",
                                fontSize: "16px",
                              }}
                              prefix={<CloseOutlined />}
                            />
                          </Col>
                          <Col span={6}>
                            <Statistic
                              title="正确率"
                              value={session.accuracy}
                              precision={2}
                              suffix="%"
                              valueStyle={{
                                color:
                                  session.accuracy >= 80
                                    ? "#3f8600"
                                    : session.accuracy >= 60
                                    ? "#faad14"
                                    : "#cf1322",
                                fontSize: "16px",
                              }}
                            />
                          </Col>
                        </Row>
                      </div>

                      {/* 单词详情（可展开） */}
                      {expandedSessions.includes(session.sessionId) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <Text strong className="mb-2 block">
                            单词详情 ({session.words.length} 个)
                          </Text>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {session.words.map((word: HistoryWordItem) => (
                              <div
                                key={word.id}
                                className={`p-3 rounded border ${
                                  word.isCorrect
                                    ? "bg-green-50 border-green-200"
                                    : "bg-red-50 border-red-200"
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <Text strong className="text-base">
                                    {word.englishWord}
                                  </Text>
                                  {word.isCorrect ? (
                                    <Tag
                                      color="success"
                                      icon={<CheckOutlined />}
                                    >
                                      正确
                                    </Tag>
                                  ) : (
                                    <Tag color="error" icon={<CloseOutlined />}>
                                      错误
                                    </Tag>
                                  )}
                                </div>
                                <div className="text-sm space-y-1">
                                  <div>
                                    <Text type="secondary">正确答案: </Text>
                                    <Text strong className="text-green-600">
                                      {word.correctAnswer}
                                    </Text>
                                  </div>
                                  {!word.isCorrect && (
                                    <div>
                                      <Text type="secondary">你的答案: </Text>
                                      <Text strong className="text-red-600">
                                        {word.userAnswer || "(未填写)"}
                                      </Text>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>

                {/* 分页 */}
                {historyTotal > 0 && (
                  <div className="flex items-center justify-center gap-4 pt-4 border-t">
                    <Button
                      disabled={historyPage === 1}
                      onClick={() => {
                        const newPage = historyPage - 1;
                        setHistoryPage(newPage);
                        loadHistory(newPage);
                      }}
                    >
                      上一页
                    </Button>
                    <Text>
                      第 {historyPage} 页，共 {Math.ceil(historyTotal / 10)}{" "}
                      页（共 {historyTotal} 次默写）
                    </Text>
                    <Button
                      disabled={historyPage >= Math.ceil(historyTotal / 10)}
                      onClick={() => {
                        const newPage = historyPage + 1;
                        setHistoryPage(newPage);
                        loadHistory(newPage);
                      }}
                    >
                      下一页
                    </Button>
                  </div>
                )}
              </div>
            )}
          </Spin>
        </Modal>

        {/* 统计信息弹窗 */}
        <Modal
          title="默写统计信息"
          open={showStats}
          onCancel={() => setShowStats(false)}
          footer={null}
          width={600}
        >
          <Spin spinning={loading}>
            {stats ? (
              <div className="space-y-6">
                <div>
                  <Title level={4}>总体统计</Title>
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="总题数"
                        value={stats.statistics.totalCount}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="正确数"
                        value={stats.statistics.correctCount}
                        valueStyle={{ color: "#3f8600" }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="错误数"
                        value={stats.statistics.errorCount}
                        valueStyle={{ color: "#cf1322" }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="正确率"
                        value={stats.statistics.accuracy}
                        precision={2}
                        suffix="%"
                        valueStyle={{
                          color:
                            stats.statistics.accuracy >= 80
                              ? "#3f8600"
                              : stats.statistics.accuracy >= 60
                              ? "#faad14"
                              : "#cf1322",
                        }}
                      />
                    </Col>
                  </Row>
                </div>
                <Divider />
                <div>
                  <Title level={4}>按方向统计</Title>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Card size="small">
                        <div className="mb-2">
                          <Tag color="blue">中文写英文</Tag>
                        </div>
                        <Statistic
                          title="总题数"
                          value={stats.directionStats["0"]?.total || 0}
                        />
                        <Statistic
                          title="正确数"
                          value={stats.directionStats["0"]?.correct || 0}
                          valueStyle={{ color: "#3f8600" }}
                        />
                        <Statistic
                          title="正确率"
                          value={stats.directionStats["0"]?.accuracy || 0}
                          precision={2}
                          suffix="%"
                        />
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small">
                        <div className="mb-2">
                          <Tag color="purple">英文写中文</Tag>
                        </div>
                        <Statistic
                          title="总题数"
                          value={stats.directionStats["1"]?.total || 0}
                        />
                        <Statistic
                          title="正确数"
                          value={stats.directionStats["1"]?.correct || 0}
                          valueStyle={{ color: "#3f8600" }}
                        />
                        <Statistic
                          title="正确率"
                          value={stats.directionStats["1"]?.accuracy || 0}
                          precision={2}
                          suffix="%"
                        />
                      </Card>
                    </Col>
                  </Row>
                </div>
              </div>
            ) : (
              <Empty description="暂无统计数据" />
            )}
          </Spin>
        </Modal>
      </div>
    </EnglishWorldLayout>
  );
};
