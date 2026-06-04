import { Button, Progress, Space, Tag, Typography } from "antd";
import { PlayCircleOutlined, ThunderboltOutlined } from "@ant-design/icons";
import type { DailyCoachSummary } from "../types/learning";
import { createCoachInsight } from "../utils/coachPlanning";

const { Text, Title } = Typography;

type CoachSummaryPanelProps = {
  summary: DailyCoachSummary;
  onStartReview?: () => void;
  onOpenContextLab?: () => void;
};

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

  return (
    <section className="learning-cockpit-card learning-cockpit-card-primary">
      <div className="learning-cockpit-card-heading">
        <div>
          <Text className="learning-cockpit-label">A. Daily Coach</Text>
          <Title level={3}>今日 AI 任务</Title>
        </div>
        <Tag icon={<ThunderboltOutlined />} color="blue">
          {summary.suggestedActions[0]?.estimatedMinutes ?? 8} min
        </Tag>
      </div>

      <p className="learning-cockpit-card-copy">{insight.description}</p>

      <div className="learning-cockpit-progress-row">
        <Text type="secondary">掌握稳定度</Text>
        <strong>{progress}%</strong>
      </div>
      <Progress percent={progress} size="small" />

      <div className="learning-cockpit-word-strip">
        {summary.weakWords.slice(0, 6).map((word) => (
          <Tag key={word.id} color={word.level === 0 ? "red" : "orange"}>
            {word.word}
          </Tag>
        ))}
      </div>

      <Space wrap>
        <Button type="primary" icon={<PlayCircleOutlined />} onClick={onStartReview}>
          开始今日复习
        </Button>
        <Button onClick={onOpenContextLab}>进入语境练习</Button>
      </Space>
    </section>
  );
}
