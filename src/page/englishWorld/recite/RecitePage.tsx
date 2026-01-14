import React, { useState, useCallback } from "react";
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
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  HistoryOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { EnglishHeader } from "../component/EnglishHeader";
import request from "@/utils/axios/axios";
import {
  startRecite,
  submitAnswer,
  getReciteHistory,
  getReciteStats,
  type StartReciteResponse,
  type SubmitAnswerResponse,
  type Question,
  type AnswerItem,
  type HistoryItem,
  type GetStatsResponse,
} from "@/server/recite/recite";
import { getSystemSettings } from "../component/SystemSettings";
import { PracticeDirection } from "../enum";

const { Title, Text } = Typography;

type ReciteStatus = "idle" | "practicing" | "submitted" | "loading";

export const RecitePage: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [status, setStatus] = useState<ReciteStatus>("idle");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [direction, setDirection] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [results, setResults] = useState<SubmitAnswerResponse | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [stats, setStats] = useState<GetStatsResponse | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [loading, setLoading] = useState(false);

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
        })
      );

      setQuestions(response.questions);
      setDirection(response.direction);
      setAnswers({});
      setResults(null);
      setStatus("practicing");
      form.resetFields();

      message.success("开始默写！");
    } catch (error: unknown) {
      console.error("开始默写失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "开始默写失败，请重试";
      message.error(errorMessage);
      setStatus("idle");
    } finally {
      setLoading(false);
    }
  }, [form]);

  // 提交答案
  const handleSubmit = useCallback(async () => {
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

      setResults(response);
      setStatus("submitted");
      message.success("提交成功！");
    } catch (error: unknown) {
      console.error("提交答案失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "提交答案失败，请重试";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [questions, answers, direction]);

  // 获取历史记录
  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const response = await request<{ list: HistoryItem[] }>(
        getReciteHistory({
          page: 1,
          pageSize: 50,
        })
      );
      setHistory(response.list || []);
    } catch (error: unknown) {
      console.error("获取历史记录失败:", error);
      const errorMessage =
        error instanceof Error ? error.message : "获取历史记录失败";
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
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

  // 处理导航点击
  const handleNavClick = (key: string) => {
    if (key === "list") {
      navigate("/englishWorld");
    } else if (key === "stat") {
      navigate("/englishWorld");
    } else if (key === "setting") {
      navigate("/englishWorld/settings");
    }
  };

  // 重新开始
  const handleRestart = () => {
    setStatus("idle");
    setQuestions([]);
    setAnswers({});
    setResults(null);
    form.resetFields();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <EnglishHeader activeKey="recite" onNavClick={handleNavClick} />
      <div className="pt-20 px-4 pb-8 max-w-6xl mx-auto">
        {/* 标题和操作按钮 */}
        <div className="mb-6 flex items-center justify-between">
          <Title level={2} className="mb-0">
            单词默写
          </Title>
          <Space>
            <Button
              icon={<HistoryOutlined />}
              onClick={() => {
                setShowHistory(true);
                loadHistory();
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
            {status === "idle" && (
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStartRecite}
                loading={loading}
                size="large"
              >
                开始默写
              </Button>
            )}
            {status === "practicing" && (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={loading}
                size="large"
              >
                提交答案
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
        </div>

        {/* 练习中 */}
        {status === "practicing" && (
          <Card>
            <div className="mb-4">
              <Text type="secondary">
                练习方向:{" "}
                {direction === PracticeDirection.ChineseToEnglish
                  ? "中文写英文"
                  : "英文写中文"}
              </Text>
              <Text type="secondary" className="ml-4">
                共 {questions.length} 题
              </Text>
            </div>
            <Divider />
            <Form form={form} layout="vertical">
              {questions.map((question, index) => (
                <Form.Item
                  key={question.wordId}
                  label={
                    <Text strong>
                      第 {index + 1} 题: {question.question}
                    </Text>
                  }
                  name={`answer_${question.wordId}`}
                >
                  <Input
                    placeholder="请输入答案"
                    size="large"
                    value={answers[question.wordId] || ""}
                    onChange={(e) => {
                      const newAnswers = {
                        ...answers,
                        [question.wordId]: e.target.value,
                      };
                      setAnswers(newAnswers);
                    }}
                    onPressEnter={(e) => {
                      e.preventDefault();
                      const currentIndex = questions.findIndex(
                        (q) => q.wordId === question.wordId
                      );
                      if (currentIndex < questions.length - 1) {
                        const nextQuestion = questions[currentIndex + 1];
                        const nextInput = document.querySelector(
                          `input[name="answer_${nextQuestion.wordId}"]`
                        ) as HTMLInputElement;
                        nextInput?.focus();
                      }
                    }}
                  />
                </Form.Item>
              ))}
            </Form>
          </Card>
        )}

        {/* 提交结果 */}
        {status === "submitted" && results && (
          <Card>
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
            <div className="space-y-4">
              {results.results.map((result, index) => (
                <div
                  key={result.wordId}
                  className={`p-4 rounded-lg border ${
                    result.isCorrect
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Text strong>第 {index + 1} 题</Text>
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
                  <div className="space-y-1">
                    <div>
                      <Text type="secondary">题目: </Text>
                      <Text>{result.englishWord}</Text>
                    </div>
                    <div>
                      <Text type="secondary">正确答案: </Text>
                      <Text strong className="text-green-600">
                        {result.correctAnswer}
                      </Text>
                    </div>
                    {!result.isCorrect && (
                      <div>
                        <Text type="secondary">你的答案: </Text>
                        <Text strong className="text-red-600">
                          {result.userAnswer}
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
          <Card>
            <Empty
              description="点击「开始默写」按钮开始练习"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        )}

        {/* 加载中 */}
        {status === "loading" && (
          <Card>
            <div className="text-center py-8">
              <Spin size="large" />
              <div className="mt-4">
                <Text type="secondary">正在加载题目...</Text>
              </div>
            </div>
          </Card>
        )}

        {/* 历史记录弹窗 */}
        <Modal
          title="默写历史记录"
          open={showHistory}
          onCancel={() => setShowHistory(false)}
          footer={null}
          width={800}
        >
          <Spin spinning={loading}>
            {history.length === 0 ? (
              <Empty description="暂无历史记录" />
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {history.map((item) => (
                  <Card key={item.id} size="small" className="mb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Text strong>{item.englishWord}</Text>
                          <Tag
                            color={
                              item.direction ===
                              PracticeDirection.ChineseToEnglish
                                ? "blue"
                                : "purple"
                            }
                          >
                            {item.direction ===
                            PracticeDirection.ChineseToEnglish
                              ? "中文写英文"
                              : "英文写中文"}
                          </Tag>
                          {item.isCorrect === 1 ? (
                            <Tag color="success" icon={<CheckOutlined />}>
                              正确
                            </Tag>
                          ) : (
                            <Tag color="error" icon={<CloseOutlined />}>
                              错误
                            </Tag>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          <div>
                            正确答案:{" "}
                            <Text className="text-green-600">
                              {item.correctAnswer}
                            </Text>
                          </div>
                          {item.isCorrect === 0 && (
                            <div>
                              你的答案:{" "}
                              <Text className="text-red-600">
                                {item.userAnswer}
                              </Text>
                            </div>
                          )}
                          <div>
                            时间: {new Date(item.createTime).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
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
    </div>
  );
};
