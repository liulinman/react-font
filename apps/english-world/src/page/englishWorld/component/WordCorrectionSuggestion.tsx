import { Alert, Button, Space, Typography } from "antd";
import type { WordAgentResolution } from "./wordCorrection";

type Suggestion = Extract<WordAgentResolution, { kind: "suggestion" }>;

interface WordCorrectionSuggestionProps
  extends Pick<Suggestion, "input" | "candidate" | "status" | "reason"> {
  onUse: () => void;
  onKeep: () => void;
}

export function WordCorrectionSuggestion({
  input,
  candidate,
  status,
  reason,
  onUse,
  onKeep,
}: WordCorrectionSuggestionProps) {
  const heading =
    status === "inflected" ? "检测到词形变化" : "可能拼写错误";

  return (
    <Alert
      type="warning"
      showIcon
      message={
        <Typography.Text strong>
          {heading}: {input} → {candidate}
        </Typography.Text>
      }
      description={<Typography.Text>{reason}</Typography.Text>}
      action={
        <Space wrap>
          <Button size="small" type="primary" onClick={onUse}>
            使用建议
          </Button>
          <Button size="small" onClick={onKeep}>
            保留原词
          </Button>
        </Space>
      }
    />
  );
}
