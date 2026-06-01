export type WordListSummaryInput = {
  totalNum: number;
  page: number;
  pageSize: number;
  loadedCount: number;
};

export type WordListSummaryItem = {
  key: "total" | "loaded" | "page" | "pageSize";
  label: string;
  value: string;
};

export function createWordListSummary({
  totalNum,
  page,
  pageSize,
  loadedCount,
}: WordListSummaryInput): WordListSummaryItem[] {
  const totalPages = Math.max(1, Math.ceil(totalNum / pageSize));

  return [
    { key: "total", label: "总词条", value: String(totalNum) },
    { key: "loaded", label: "当前加载", value: String(loadedCount) },
    { key: "page", label: "当前页", value: `${page} / ${totalPages}` },
    { key: "pageSize", label: "每页数量", value: String(pageSize) },
  ];
}
