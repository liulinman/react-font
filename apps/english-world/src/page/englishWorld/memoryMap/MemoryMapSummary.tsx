import { Button, Progress, Typography } from "antd";
import { ArrowRightOutlined, NodeIndexOutlined } from "@ant-design/icons";
import type { MemoryMapOverview } from "../types/learning";
import { getMemoryClusterLabel } from "./memoryClusterLabels";

const { Text, Title } = Typography;

type MemoryMapSummaryProps = {
  overview: MemoryMapOverview;
  onOpenMemoryMap?: () => void;
};

export function MemoryMapSummary({
  overview,
  onOpenMemoryMap,
}: MemoryMapSummaryProps) {
  const total = overview.levels.reduce((sum, item) => sum + item.count, 0);
  const mastered = overview.levels
    .filter((item) => item.level >= 2)
    .reduce((sum, item) => sum + item.count, 0);
  const masteryPercent = total ? Math.round((mastered / total) * 100) : 0;

  return (
    <section className="learning-cockpit-card memory-map-summary-card">
      <div className="learning-cockpit-card-heading">
        <div>
          <Text className="learning-cockpit-label">复习线索</Text>
          <Title level={4}>记忆地图</Title>
        </div>
        <NodeIndexOutlined className="learning-cockpit-card-icon" />
      </div>

      <div className="memory-map-orbit" aria-label="记忆地图摘要">
        <span className="memory-node memory-node-weak">薄弱</span>
        <span className="memory-node memory-node-similar">易混</span>
        <span className="memory-node memory-node-mastered">掌握</span>
      </div>

      <div
        className="memory-map-mastery-zone"
        role="region"
        aria-label="掌握路径"
      >
        <div className="learning-cockpit-progress-row">
          <Text type="secondary">掌握路径</Text>
          <strong>{masteryPercent}%</strong>
        </div>
        <Progress
          percent={masteryPercent}
          size="small"
          showInfo={false}
          strokeColor="var(--ew-accent)"
          aria-label={`掌握进度 ${masteryPercent}%`}
        />
      </div>

      <div
        className="memory-map-clues-zone"
        role="region"
        aria-label="近期薄弱词"
      >
        <div className="memory-map-clues-label">近期薄弱词</div>
        <div className="memory-map-clue-list">
          {overview.recentMistakes.slice(0, 4).map((item) => (
            <span className="memory-map-mistake-tag" key={item.wordId}>
              <strong>{item.word}</strong>
              <span aria-hidden="true" />
              <em>{getMemoryClusterLabel(item.cluster)}</em>
            </span>
          ))}
          {!overview.recentMistakes.length ? (
            <span className="memory-map-clues-empty">近期状态稳定</span>
          ) : null}
        </div>
      </div>

      <Button
        block
        className="memory-map-entry-button"
        icon={<NodeIndexOutlined aria-hidden="true" />}
        onClick={onOpenMemoryMap}
      >
        查看记忆地图
        <ArrowRightOutlined
          aria-hidden="true"
          className="memory-map-entry-arrow"
        />
      </Button>
    </section>
  );
}
