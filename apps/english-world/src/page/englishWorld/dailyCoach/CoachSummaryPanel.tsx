import { Button, Progress, Tag, Typography } from "antd";
import { PlayCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { DailyCoachAction, DailyCoachSummary } from "../types/learning";
import { createCoachInsight } from "../utils/coachPlanning";

const { Text, Title } = Typography;

type CoachSummaryPanelProps = {
  summary: DailyCoachSummary;
  onStartReview?: (action?: DailyCoachAction) => void;
  onOpenContextLab?: (action?: DailyCoachAction) => void;
};

function isReviewAction(action: DailyCoachAction) {
  return (
    action.type === "review" ||
    action.type === "repair" ||
    action.type === "listening"
  );
}

export function CoachSummaryPanel({
  summary,
  onStartReview,
  onOpenContextLab,
}: CoachSummaryPanelProps) {
  const insight = createCoachInsight({
    reciteAccuracy: summary.reciteAccuracy,
    weakWords: summary.weakWords,
  });
  const weakCount = summary.weakWords.length;
  const progress = summary.totalWords
    ? Math.round(((summary.totalWords - weakCount) / summary.totalWords) * 100)
    : 0;
  const actions = summary.suggestedActions ?? [];

  return (
    <section className="learning-cockpit-card learning-cockpit-card-primary">
      <div className="learning-cockpit-card-heading">
        <div>
          <Text className="learning-cockpit-label">A. Review</Text>
          <Title level={3}>今天先做这一步</Title>
        </div>
        <Tag icon={<ThunderboltOutlined />} color="blue">
          {summary.suggestedActions[0]?.estimatedMinutes ?? 8} min
        </Tag>
      </div>

      <p className="learning-cockpit-card-copy learning-cockpit-route-copy">
        {insight.description}
      </p>

      <div className="learning-cockpit-progress-row">
        <Text type="secondary">复习稳定度</Text>
        <strong>{progress}%</strong>
      </div>
      <Progress percent={progress} size="small" />

      <div className="learning-cockpit-focus-row">
        <span>今日薄弱词</span>
        <div className="learning-cockpit-word-strip">
          {summary.weakWords.slice(0, 6).map((word) => (
            <Tag key={word.id} color={word.level === 0 ? "red" : "orange"}>
              {word.word}
            </Tag>
          ))}
          {!summary.weakWords.length ? <Tag color="green">状态稳定</Tag> : null}
        </div>
      </div>

      <div className="learning-cockpit-task-list" aria-label="今日行动清单">
        {actions.slice(0, 3).map((action, index) => (
          <div className="learning-cockpit-task-item" key={`${action.type}-${index}`}>
            <div className="learning-cockpit-task-index">{index + 1}</div>
            <div className="learning-cockpit-task-copy">
              <strong>{action.title}</strong>
              <span>{action.description}</span>
            </div>
            <Tag color={isReviewAction(action) ? "blue" : "purple"}>
              {action.estimatedMinutes} min
            </Tag>
            <Button
              type={index === 0 ? "primary" : "default"}
              icon={isReviewAction(action) ? <PlayCircleOutlined /> : undefined}
              onClick={() =>
                isReviewAction(action)
                  ? onStartReview?.(action)
                  : onOpenContextLab?.(action)
              }
            >
              {isReviewAction(action) ? "定向复习" : "进入练习"}
            </Button>
          </div>
        ))}
      </div>

      {!actions.length ? (
        <div className="learning-cockpit-action-row">
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={() => onStartReview?.()}
          >
            开始今日复习
          </Button>
        </div>
      ) : null}
    </section>
  );
}
