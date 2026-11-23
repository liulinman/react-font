import type { CSSProperties, ReactNode } from "react";

export const hasReadingAnswer = (value: number | string | undefined) =>
  typeof value === "number" || (typeof value === "string" && value.trim().length > 0);
export const exceedsWordLimit = (value: number | string | undefined, maxWords?: number) =>
  typeof value === "string" && !!maxWords && value.trim().split(/\s+/).filter(Boolean).length > maxWords;

/** A sentence has one answer field; preserve punctuation around its printed blank. */
export function SentenceAnswer({ stem, value, onChange, number, maxWords, disabled, renderText }: {
  stem: string; value: number | string | undefined; onChange: (text: string) => void;
  number: number; maxWords?: number; disabled?: boolean; renderText?: (text: string, offset: number) => ReactNode;
}) {
  const blank = /_{2,}|\.{3,}|…{2,}|＿{2,}/.exec(stem);
  const over = exceedsWordLimit(value, maxWords);
  const style: CSSProperties = { display: "inline-block", width: "min(13rem, 100%)", padding: "6px 10px", margin: "4px 6px", border: `1px solid ${over ? "#dc2626" : "#94a3b8"}`, borderRadius: 4, font: "inherit", background: "var(--surface, #fff)", color: "inherit" };
  return <div>
    <div>{renderText ? renderText(blank ? stem.slice(0, blank.index) : stem, 0) : blank ? stem.slice(0, blank.index) : stem}<input maxLength={1000} type="text" style={style}
      aria-label={`第 ${number} 题答案`} aria-invalid={over} aria-describedby={maxWords ? `sentence-limit-${number}` : undefined}
      autoComplete="off" spellCheck={false} disabled={disabled}
      value={typeof value === "string" ? value : ""} onChange={event => onChange(event.target.value)} />
      {blank && (renderText ? renderText(stem.slice(blank.index + blank[0].length), blank.index + blank[0].length) : stem.slice(blank.index + blank[0].length))}</div>
    {maxWords && <small id={`sentence-limit-${number}`} role={over ? "alert" : undefined}>
      最多填写 {maxWords} 个单词{over ? "，当前答案超过词数限制" : ""}
    </small>}
  </div>;
}
