const PRIMARY_LABELS: Record<string, string> = {
  cockpit: "今天",
  words: "词库",
  recite: "学习",
  stats: "数据",
  aiWord: "词库",
  memoryMap: "词库",
  contextLab: "学习",
  setting: "设置",
};

export function getEnglishWorldSectionLabel(activeKey: string) {
  return PRIMARY_LABELS[activeKey] ?? "English World";
}

export function formatEnglishWorldDate(date: Date) {
  const parts = new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    weekday: "long",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${value("month")} 月 ${value("day")} 日 · ${value("weekday")}`;
}
