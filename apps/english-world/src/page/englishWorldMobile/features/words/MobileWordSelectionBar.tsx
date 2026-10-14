import { useState } from "react";

export type MobileWordSelection =
  | { mode: "ids"; wordIds: number[] }
  | { expectedTotal: number; filters: Record<string, unknown>; mode: "current-filter"; excludedIds: number[] };

type MobileWordSelectionBarProps = {
  disabled?: boolean;
  onBatchLevel(level: number): void;
  onStartLearning(): void;
  onContextLab?(): void;
  selectedCount: number;
};

export function MobileWordSelectionBar({
  disabled = false, onBatchLevel, onStartLearning, onContextLab, selectedCount,
}: MobileWordSelectionBarProps) {
  const [level, setLevel] = useState(0);
  const canLearn = selectedCount >= 1 && selectedCount <= 20;
  const canGenerate = selectedCount >= 3 && selectedCount <= 20;
  return (
    <section aria-label={`已选择 ${selectedCount} 个词`} className="mobile-word-selection-bar" role="toolbar">
      <div className="word-selection-main">
        <strong>已选 {selectedCount}</strong>
        <button className="word-selection-start" disabled={disabled || !canLearn} onClick={onStartLearning} type="button">开始学习</button>
        <details className="word-selection-more" onKeyDown={event => {
          if (event.key === "Escape") {
            event.currentTarget.open = false;
            event.currentTarget.querySelector("summary")?.focus();
          }
        }}>
          <summary>更多</summary>
          <div className="word-selection-options">
            <p>已选 {selectedCount} 个词</p>
            {onContextLab && <button disabled={disabled || !canGenerate} onClick={onContextLab} type="button">生成文章练习</button>}
            <p className="word-selection-hint">文章练习需要 3～20 个词</p>
            <label>批量掌握程度
              <select aria-label="批量掌握程度" disabled={disabled || !selectedCount} onChange={event => setLevel(Number(event.target.value))} value={level}>
                <option value="0">不会</option><option value="1">一般</option><option value="2">熟练</option><option value="3">精通</option>
              </select>
            </label>
            <button disabled={disabled || !selectedCount} onClick={() => onBatchLevel(level)} type="button">确认批量设置</button>
          </div>
        </details>
      </div>
      {!canLearn && <p className="word-selection-hint">{selectedCount ? "学习最多 20 个，请减少选择" : "点击词条选择，学习可选 1～20 个"}</p>}
    </section>
  );
}
