import { Button, Progress, Tag, Typography } from "antd";
import { NodeIndexOutlined } from "@ant-design/icons";
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
    <section className="learning-cockpit-card">
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

      <div className="learning-cockpit-progress-row">
        <Text type="secondary">掌握路径</Text>
        <strong>{masteryPercent}%</strong>
      </div>
      <Progress percent={masteryPercent} size="small" />

      <div className="learning-cockpit-word-strip">
        {overview.recentMistakes.slice(0, 4).map((item) => (
          <Tag key={item.wordId} color="volcano">
            {item.word} · {getMemoryClusterLabel(item.cluster)}
          </Tag>
        ))}
      </div>

      <Button block onClick={onOpenMemoryMap}>
        查看记忆地图
      </Button>
    </section>
  );
}
