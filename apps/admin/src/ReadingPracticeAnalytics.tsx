import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
} from "antd";
import request from "@font/api";
import {
  getReadingAnalytics,
  getReadingAnalyticsDetail,
} from "./api/readingAnalytics";
import type {
  AnalyticsLearner,
  ReadingAnalytics,
  ReadingAnalyticsDetail,
} from "./api/readingAnalytics";
import { formatDate } from "./adminPresentation";
import "./readingAnalytics.css";
const labels = {
  completed: "已完成",
  in_progress: "作答中",
  not_started: "未开始",
};
export const showNumber = (n: number | null | undefined, percent = false) =>
  n == null ? "—" : `${n.toFixed(1)}${percent ? "%" : ""}`;
export function compareMetric(
  a: AnalyticsLearner,
  b: AnalyticsLearner,
  key: "score" | "errorRate",
  order?: string | null,
) {
  const av = a[key],
    bv = b[key];
  if (av === null && bv !== null) return order === "descend" ? -1 : 1;
  if (bv === null && av !== null) return order === "descend" ? 1 : -1;
  return av !== null && bv !== null && av !== bv
    ? av - bv
    : (order === "descend" ? -1 : 1) * (a.userId - b.userId);
}
const scoreText = (l: AnalyticsLearner) =>
  l.dataIssue
    ? "数据异常"
    : l.status !== "completed"
      ? "—"
      : l.total === 0
        ? "不可评分"
        : showNumber(l.score);
const kindLabels: Record<string, string> = {
  choice: "单选题",
  single_choice: "单选题",
  multiple_choice: "单选题",
  true_false_not_given: "判断题",
};
export function ReadingPracticeAnalytics({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const [data, setData] = useState<ReadingAnalytics | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1);
  const [detailUser, setDetailUser] = useState<number | null>(null),
    [detail, setDetail] = useState<ReadingAnalyticsDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false),
    [detailError, setDetailError] = useState(""),
    [onlyWrong, setOnlyWrong] = useState(true);
  const [notice, setNotice] = useState(""),
    [wrongQuestion, setWrongQuestion] = useState<string | null>(null);
  const version = useRef(0),
    detailVersion = useRef(0),
    revision = useRef<number | null>(null),
    overviewPending = useRef(false),
    activeDetail = useRef<{ userId: number; revision: number | null } | null>(
      null,
    );
  const refresh = useCallback(async () => {
    const v = ++version.current;
    overviewPending.current = true;
    setLoading(true);
    setError("");
    try {
      const next = await request(getReadingAnalytics(id));
      if (v !== version.current) return;
      if (
        activeDetail.current &&
        activeDetail.current.revision !== next.gradingRevision
      ) {
        detailVersion.current++;
        activeDetail.current = null;
        setDetail(null);
        setDetailLoading(false);
        setDetailError("评分已更新，请重新加载答题详情。");
        setNotice("评分已更新，旧答题详情已清除，请重新加载。");
      }
      revision.current = next.gradingRevision;
      setData(next);
    } catch {
      if (v === version.current) setError("完成情况加载失败，请重试。");
    } finally {
      if (v === version.current) {
        overviewPending.current = false;
        setLoading(false);
      }
    }
  }, [id]);
  useEffect(() => {
    setData(null);
    void refresh();
    return () => {
      version.current++;
      detailVersion.current++;
    };
  }, [refresh]);
  const loadDetail = useCallback(
    async (userId: number) => {
      if (overviewPending.current) return;
      activeDetail.current = { userId, revision: null };
      const v = ++detailVersion.current;
      setDetailUser(userId);
      setDetail(null);
      setDetailLoading(true);
      setDetailError("");
      setOnlyWrong(true);
      try {
        const next = await request(getReadingAnalyticsDetail(id, userId));
        if (v !== detailVersion.current) return;
        activeDetail.current = { userId, revision: next.gradingRevision };
        if (
          revision.current !== null &&
          next.gradingRevision !== revision.current
        ) {
          setNotice("评分已更新，正在同步概览；答题详情使用最新评分修订。");
          await refresh();
          if (v !== detailVersion.current) return;
          if (revision.current !== next.gradingRevision) {
            setDetailError("评分再次变化，请重新加载详情。");
            return;
          }
        }
        setDetail(next);
      } catch {
        if (v === detailVersion.current)
          setDetailError("答题详情加载失败，请重试。");
      } finally {
        if (v === detailVersion.current) setDetailLoading(false);
      }
    },
    [id, refresh],
  );
  const closeDetail = () => {
    activeDetail.current = null;
    detailVersion.current++;
    setDetailUser(null);
    setDetail(null);
  };
  const filtered = (data?.learners || []).filter(
    (l) =>
      (status === "all" ||
        (status === "incomplete"
          ? l.status !== "completed"
          : l.status === status)) &&
      (!search.trim() ||
        `${l.username} ${l.userId}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );
  const wrong = data?.questions.find((q) => q.id === wrongQuestion);
  const time = (v: string | null) => (v ? formatDate(v) : "—");
  return (
    <Modal
      open
      title="完成情况"
      width={1100}
      footer={<Button onClick={onClose}>关闭</Button>}
      onCancel={onClose}
      className="reading-analytics"
    >
      <Space wrap style={{ marginBottom: 16 }}>
        <Button
          loading={loading}
          onClick={() => {
            closeDetail();
            void refresh();
          }}
        >
          刷新统计
        </Button>
        <span>筛选仅影响学生明细，概览为全篇统计</span>
      </Space>
      {notice && (
        <Alert
          type="info"
          message={notice}
          closable
          onClose={() => setNotice("")}
        />
      )}
      {error && (
        <Alert
          type="error"
          message={error}
          action={<Button onClick={() => void refresh()}>重试</Button>}
        />
      )}
      {loading && !data && <Spin />}
      {data && (
        <>
          <h3>{data.title}</h3>
          <p>
            内容 v{data.version} · 评分修订 {data.gradingRevision} ·{" "}
            {data.status === "withdrawn" ? "已撤回" : "已发布"} · 更新于{" "}
            {time(data.generatedAt)}
          </p>
          {data.summary.dataIssueCount > 0 && (
            <Alert
              type="warning"
              message={`${data.summary.dataIssueCount} 份历史答卷数据异常，保留完成状态，暂不计入成绩统计。`}
            />
          )}
          <div className="reading-analytics-summary">
            {[
              ["接收人数", data.summary.assignedCount],
              ["已完成", data.summary.completedCount],
              ["未完成", data.summary.incompleteCount],
              ["完成率", showNumber(data.summary.completionRate, true)],
              ["平均分", showNumber(data.summary.averageScore)],
              ["整体错误率", showNumber(data.summary.errorRate, true)],
            ].map(([label, value]) => (
              <Card size="small" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </Card>
            ))}
          </div>
          <p>
            未开始 {data.summary.notStartedCount} 人 · 作答中{" "}
            {data.summary.inProgressCount} 人 · 有效错题{" "}
            {data.summary.wrongAttempts} / 有效作答 {data.summary.validAttempts}{" "}
            题次
          </p>
          {!data.summary.assignedCount && (
            <Alert type="info" message="暂无接收人" />
          )}
          {!!data.summary.assignedCount && !data.summary.completedCount && (
            <Alert
              type="info"
              message="暂无提交，成绩和错题率将在学生提交后显示。"
            />
          )}
          <Tabs
            items={[
              {
                key: "learners",
                label: "学生明细",
                children: (
                  <>
                    <Space wrap style={{ marginBottom: 12 }}>
                      <Input
                        aria-label="搜索用户名或ID"
                        placeholder="搜索用户名或ID"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.target.value);
                          setPage(1);
                        }}
                        allowClear
                      />
                      <Select
                        aria-label="完成状态"
                        value={status}
                        style={{ width: 150 }}
                        onChange={(v) => {
                          setStatus(v);
                          setPage(1);
                        }}
                        options={[
                          ["all", "全部状态"],
                          ["incomplete", "未完成"],
                          ["not_started", "未开始"],
                          ["in_progress", "作答中"],
                          ["completed", "已完成"],
                        ].map(([value, label]) => ({ value, label }))}
                      />
                    </Space>
                    <Table
                      rowKey="userId"
                      size="small"
                      dataSource={filtered}
                      scroll={{ x: 950 }}
                      pagination={{
                        pageSize: 10,
                        showSizeChanger: false,
                        current: page,
                        onChange: setPage,
                      }}
                      locale={{ emptyText: "没有符合条件的学生" }}
                      columns={[
                        {
                          title: "学生",
                          render: (_, l: AnalyticsLearner) => (
                            <>
                              {l.username} <small>#{l.userId}</small>
                              {l.accountStatus !== "active" && (
                                <Tag>已停用</Tag>
                              )}
                            </>
                          ),
                        },
                        {
                          title: "状态",
                          render: (_, l) => (
                            <>
                              {labels[l.status]}
                              {l.dataIssue && (
                                <Tag color="orange">答卷数据异常</Tag>
                              )}
                            </>
                          ),
                        },
                        {
                          title: "分数",
                          render: (_, l) => scoreText(l),
                          sorter: (a, b, order) =>
                            compareMetric(a, b, "score", order),
                        },
                        {
                          title: "正确 / 有效题",
                          render: (_, l) =>
                            l.total == null
                              ? "—"
                              : `${l.correctCount} / ${l.total}`,
                        },
                        {
                          title: "错题数 / 错题率",
                          render: (_, l) =>
                            l.wrongCount == null
                              ? "—"
                              : `${l.wrongCount} / ${showNumber(l.errorRate, true)}`,
                          sorter: (a, b, order) =>
                            compareMetric(a, b, "errorRate", order),
                        },
                        {
                          title: "开始时间",
                          render: (_, l) => time(l.startedAt),
                        },
                        {
                          title: "提交时间",
                          render: (_, l) => time(l.submittedAt),
                        },
                        {
                          title: "操作",
                          render: (_, l) =>
                            l.status === "completed" ? (
                              <Button
                                type="link"
                                disabled={loading}
                                onClick={() => void loadDetail(l.userId)}
                              >
                                答题详情
                              </Button>
                            ) : (
                              <span>尚未提交</span>
                            ),
                        },
                      ]}
                    />
                  </>
                ),
              },
              {
                key: "questions",
                label: "逐题分析",
                children: (
                  <div>
                    {data.questions.map((q) => (
                      <Card
                        key={q.id}
                        size="small"
                        style={{ marginBottom: 12 }}
                      >
                        <h4>
                          第 {q.number} 题 · {kindLabels[q.kind] || q.kind}{" "}
                          {q.voided && <Tag>已作废</Tag>}
                        </h4>
                        <p>{q.stem}</p>
                        <p>
                          当前正确答案：
                          {String.fromCharCode(65 + q.correctIndex)} · 提交{" "}
                          {q.submittedCount} 人 · 答对 {q.correctCount ?? "—"}{" "}
                          人 · 答错 {q.wrongCount ?? "—"} 人 · 错误率{" "}
                          {showNumber(q.errorRate, true)}
                        </p>
                        {q.voided && <p>已作废，不计入统计</p>}
                        {q.options.map((o, i) => (
                          <p key={i}>
                            {String.fromCharCode(65 + i)}. {o.text} — {o.count}{" "}
                            人（{showNumber(o.percentage, true)}）
                          </p>
                        ))}
                        <Button
                          disabled={!q.wrongUserIds.length}
                          onClick={() => setWrongQuestion(q.id)}
                        >
                          查看答错学生（{q.wrongUserIds.length}）
                        </Button>
                      </Card>
                    ))}
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
      <Modal
        open={wrongQuestion !== null}
        title={wrong ? `第 ${wrong.number} 题答错学生` : "答错学生"}
        footer={null}
        onCancel={() => setWrongQuestion(null)}
      >
        {data?.learners
          .filter((l) => wrong?.wrongUserIds.includes(l.userId))
          .map((l) => (
            <p key={l.userId}>
              {l.username} #{l.userId}{" "}
              <Button
                disabled={loading}
                onClick={() => void loadDetail(l.userId)}
              >
                答题详情
              </Button>
            </p>
          ))}
        {!wrong?.wrongUserIds.length && (
          <Empty description="当前没有答错该题的学生" />
        )}
      </Modal>
      <Modal
        open={detailUser !== null}
        width={850}
        title="学生答题详情"
        onCancel={closeDetail}
        footer={<Button onClick={closeDetail}>关闭详情</Button>}
        className="reading-analytics"
      >
        {detailLoading && <Spin />}
        {detailError && (
          <Alert
            type="error"
            message={detailError}
            action={
              <Button
                onClick={() =>
                  detailUser !== null && void loadDetail(detailUser)
                }
              >
                重试
              </Button>
            }
          />
        )}
        {detail && (
          <>
            <h3>
              {detail.learner.username} #{detail.learner.userId}
            </h3>
            <p>
              {labels[detail.learner.status]} · 分数 {scoreText(detail.learner)}{" "}
              · 评分修订 {detail.gradingRevision}
            </p>
            {detail.learner.dataIssue && (
              <Alert type="warning" message={detail.learner.dataIssue} />
            )}
            {detail.learner.status !== "completed" ? (
              <Empty description="尚未提交，暂无答题详情" />
            ) : detail.learner.dataIssue ? (
              <Empty description="答卷数据异常，暂时无法分析错题" />
            ) : (
              <>
                <Checkbox
                  checked={onlyWrong}
                  onChange={(e) => setOnlyWrong(e.target.checked)}
                >
                  只看错题
                </Checkbox>
                {!detail.questions.filter(
                  (q) => !onlyWrong || (!q.correct && !q.voided),
                ).length && (
                  <Empty
                    description={
                      onlyWrong
                        ? "当前没有有效错题，可取消勾选查看全部题目"
                        : "暂无可用答题数据"
                    }
                  />
                )}
                {detail.questions
                  .filter((q) => !onlyWrong || (!q.correct && !q.voided))
                  .map((q) => (
                    <Card key={q.id} size="small" style={{ marginTop: 12 }}>
                      <h4>
                        第 {q.number} 题 ·{" "}
                        {q.voided
                          ? "已作废，不计分"
                          : q.correct
                            ? "正确"
                            : "错误"}
                      </h4>
                      <p>{q.stem}</p>
                      {q.options.map((o, i) => (
                        <p key={i}>
                          {String.fromCharCode(65 + i)}. {o}{" "}
                          {i === q.selectedIndex && <Tag>学生作答</Tag>}
                          {i === q.correctIndex && (
                            <Tag color="green">正确答案</Tag>
                          )}
                        </p>
                      ))}
                      <p>解析：{q.explanation}</p>
                      <p>
                        原文证据（第 {q.evidence.paragraph} 段）：
                        {q.evidence.quote || q.evidence.missingInformation}
                      </p>
                      <blockquote>
                        {detail.paragraphs[q.evidence.paragraph - 1]}
                      </blockquote>
                    </Card>
                  ))}
              </>
            )}
          </>
        )}
      </Modal>
    </Modal>
  );
}
