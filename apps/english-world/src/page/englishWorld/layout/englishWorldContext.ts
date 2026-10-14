const PRIMARY_LABELS: Record<string, string> = {
  cockpit: "今天",
  readingPractices: "阅读练习",
  knowledgeNotes: "知识笔记",
  words: "词库",
  recite: "今日复习",
  stats: "数据",
  aiWord: "词汇生成",
  bulkImport: "批量导入",
  overwriteStats: "覆盖统计",
  memoryMap: "词汇掌握情况",
  contextLab: "语境练习",
  ieltsCore: "雅思核心复习",
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
