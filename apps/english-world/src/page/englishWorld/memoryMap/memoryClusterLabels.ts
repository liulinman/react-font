import type { MemoryClusterType } from "../types/learning";

const memoryClusterLabels: Record<MemoryClusterType, string> = {
  similar: "易混淆",
  "low-mastery": "低掌握",
  "recent-error": "最近错词",
};

export function getMemoryClusterLabel(cluster: MemoryClusterType) {
  return memoryClusterLabels[cluster];
}
