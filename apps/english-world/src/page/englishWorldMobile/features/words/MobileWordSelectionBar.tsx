import { useState } from "react";
import { SafeAreaActions } from "../../components/SafeAreaActions";

export type MobileWordSelection =
  | { mode: "ids"; wordIds: number[] }
  | { expectedTotal: number; filters: Record<string, unknown>; mode: "current-filter" };

type MobileWordSelectionBarProps = {
  disabled?: boolean;
  onBatchLevel(level: number): void;
  onContextLab(): void;
  onSelectCurrentFilter(): void;
  onSelectPage(): void;
  onStartLearning(): void;
  onStopSelecting(): void;
  selectedCount: number;
  selection: MobileWordSelection;
};

export function MobileWordSelectionBar({
  disabled = false,
  onBatchLevel,
  onContextLab,
  onSelectCurrentFilter,
  onSelectPage,
  onStartLearning,
  onStopSelecting,
  selectedCount,
  selection,
}: MobileWordSelectionBarProps) {
  const [level, setLevel] = useState(0);
  return (
    <section aria-label={`已选择 ${selectedCount} 个词`} className="mobile-word-selection-bar" role="toolbar">
      <p>{selection.mode === "current-filter" ? `已选择当前筛选结果（${selection.expectedTotal} 个词）` : `已选择 ${selectedCount} 个词`}</p>
      <SafeAreaActions>
        <button disabled={disabled} onClick={onSelectPage} type="button">全选当前页</button>
        <button disabled={disabled} onClick={onSelectCurrentFilter} type="button">使用当前筛选结果</button>
        <button disabled={disabled} onClick={onStartLearning} type="button">开始混合记忆</button>
        <button disabled={disabled} onClick={onContextLab} type="button">生成语境题</button>
        <label>
          批量掌握程度
          <select aria-label="批量掌握程度" disabled={disabled} onChange={(event) => setLevel(Number(event.target.value))} value={level}>
            <option value="0">不会</option>
            <option value="1">一般</option>
            <option value="2">熟练</option>
            <option value="3">精通</option>
          </select>
        </label>
        <button disabled={disabled} onClick={() => onBatchLevel(level)} type="button">确认批量设置</button>
        <button onClick={onStopSelecting} type="button">完成选择</button>
      </SafeAreaActions>
    </section>
  );
}
