import type { DailyCoachSummary } from "../types/learning";

type LearningSnapshotProps = {
  summary: DailyCoachSummary;
};

export function LearningSnapshot({ summary }: LearningSnapshotProps) {
  const metrics = [
    { label: "词库总量", value: summary.totalWords },
    { label: "今日新增", value: summary.todayNewWords },
    { label: "近期正确率", value: `${summary.reciteAccuracy}%` },
  ];

  return (
    <section
      className="learning-snapshot"
      aria-label="学习概览"
      role="region"
    >
      <div className="learning-snapshot-heading">
        <span>学习概览</span>
        <strong>保持节奏</strong>
      </div>
      <div className="learning-snapshot-metrics">
        {metrics.map((metric) => (
          <div className="learning-snapshot-metric" key={metric.label}>
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
