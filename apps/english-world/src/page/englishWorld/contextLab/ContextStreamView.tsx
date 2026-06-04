import { Empty, Spin, Typography } from "antd";

const { Text } = Typography;

type ContextStreamViewProps = {
  loading: boolean;
  streamText: string;
};

export function ContextStreamView({
  loading,
  streamText,
}: ContextStreamViewProps) {
  if (loading && !streamText) {
    return (
      <div className="context-lab-stream context-lab-stream-empty">
        <Spin />
        <Text type="secondary">AI 正在生成语境练习...</Text>
      </div>
    );
  }

  if (!streamText) {
    return (
      <div className="context-lab-stream context-lab-stream-empty">
        <Empty description="选择一组词，生成你的语境练习包" />
      </div>
    );
  }

  return (
    <div className="context-lab-stream">
      <pre>{streamText}</pre>
    </div>
  );
}
