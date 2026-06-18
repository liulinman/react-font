import type { ContextLabTaskStatus } from "../types/learning";

export function isContextLabTaskActive(status: ContextLabTaskStatus) {
  return status === "pending" || status === "processing";
}

export function getContextLabStatusLabel(status: ContextLabTaskStatus) {
  const labels: Record<ContextLabTaskStatus, string> = {
    pending: "等待回调",
    processing: "处理中",
    succeeded: "生成完成",
    failed: "生成失败",
  };
  return labels[status];
}

export function getContextLabStatusTone(status: ContextLabTaskStatus) {
  const tones: Record<ContextLabTaskStatus, "default" | "processing" | "success" | "error"> = {
    pending: "default",
    processing: "processing",
    succeeded: "success",
    failed: "error",
  };
  return tones[status];
}

export function getContextLabStatusDescription(status: ContextLabTaskStatus) {
  const descriptions: Record<ContextLabTaskStatus, string> = {
    pending: "任务已创建，正在等待 AI 服务回调。",
    processing: "AI 正在整理雅思阅读、题目和练习数据。",
    succeeded: "练习包已准备好，可以开始做题。",
    failed: "生成失败，请查看原因后重新提交。",
  };
  return descriptions[status];
}
