import { useState } from "react";

export type MobileWordUrlFilters = {
  q?: string;
  word?: string;
  meaning?: string;
  phonetic?: string;
  type?: number;
  level?: number;
  start?: string;
  end?: string;
  sort?: "newest" | "oldest" | "alphabetical";
};

type MobileWordFiltersSheetProps = {
  filters: MobileWordUrlFilters;
  onApply(filters: MobileWordUrlFilters): void;
  onClose(): void;
  open: boolean;
};

function valueOrEmpty(value?: string | number) {
  return value === undefined ? "" : String(value);
}

export function MobileWordFiltersSheet({
  filters,
  onApply,
  onClose,
  open,
}: MobileWordFiltersSheetProps) {
  const [draft, setDraft] = useState<MobileWordUrlFilters>(filters);

  if (!open) return null;

  const setText = (key: "word" | "meaning" | "phonetic" | "start" | "end") => (
    value: string,
  ) => setDraft((current) => ({ ...current, [key]: value || undefined }));

  return (
    <div aria-label="筛选词库" aria-modal="true" className="mobile-word-filters" role="dialog">
      <div className="mobile-word-filters__header">
        <h2>筛选词库</h2>
        <button onClick={onClose} type="button">关闭</button>
      </div>
      <label>
        英文单词
        <input aria-label="英文单词" onChange={(event) => setText("word")(event.target.value)} value={draft.word ?? ""} />
      </label>
      <label>
        中文释义
        <input aria-label="中文释义" onChange={(event) => setText("meaning")(event.target.value)} value={draft.meaning ?? ""} />
      </label>
      <label>
        音标
        <input aria-label="音标" onChange={(event) => setText("phonetic")(event.target.value)} value={draft.phonetic ?? ""} />
      </label>
      <label>
        词条类型
        <select
          aria-label="词条类型"
          onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value === "" ? undefined : Number(event.target.value) }))}
          value={valueOrEmpty(draft.type)}
        >
          <option value="">全部</option>
          <option value="0">单词</option>
          <option value="1">短语</option>
          <option value="2">句子</option>
        </select>
      </label>
      <label>
        掌握程度
        <select
          aria-label="掌握程度"
          onChange={(event) => setDraft((current) => ({ ...current, level: event.target.value === "" ? undefined : Number(event.target.value) }))}
          value={valueOrEmpty(draft.level)}
        >
          <option value="">全部</option>
          <option value="0">不会</option>
          <option value="1">一般</option>
          <option value="2">熟练</option>
          <option value="3">精通</option>
        </select>
      </label>
      <label>
        开始日期
        <input aria-label="开始日期" onChange={(event) => setText("start")(event.target.value)} type="date" value={draft.start ?? ""} />
      </label>
      <label>
        结束日期
        <input aria-label="结束日期" onChange={(event) => setText("end")(event.target.value)} type="date" value={draft.end ?? ""} />
      </label>
      <label>
        排序
        <select
          aria-label="排序"
          onChange={(event) => setDraft((current) => ({ ...current, sort: (event.target.value || undefined) as MobileWordUrlFilters["sort"] }))}
          value={draft.sort ?? ""}
        >
          <option value="">默认排序</option>
          <option value="newest">最近更新</option>
          <option value="oldest">最早创建</option>
          <option value="alphabetical">字母顺序</option>
        </select>
      </label>
      <div className="mobile-word-filters__actions">
        <button onClick={() => setDraft({})} type="button">清除筛选</button>
        <button onClick={() => onApply(draft)} type="button">应用筛选</button>
      </div>
    </div>
  );
}
