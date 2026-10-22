import type { Annotation, Paragraph, Selection } from "./types";
export function segments<
  T extends { id: string; start: number; end: number; anchorStatus: string },
>(text: string, annotations: T[]) {
  const active = annotations.filter(
    (a) => a.anchorStatus === "active" && a.start >= 0 && a.end <= text.length,
  );
  const points = [
    ...new Set([0, text.length, ...active.flatMap((a) => [a.start, a.end])]),
  ].sort((a, b) => a - b);
  return points
    .slice(0, -1)
    .map((start, i) => ({
      start,
      text: text.slice(start, points[i + 1]),
      annotation: active.find(
        (a) => a.start <= start && a.end >= points[i + 1],
      ),
    }));
}
export const overlaps = (
  a: { start: number; end: number },
  list: { start: number; end: number }[],
) => list.some((b) => a.start < b.end && a.end > b.start);
export function captureSelection(
  root: HTMLElement,
  paragraph: Paragraph,
): Selection | null {
  const sel = window.getSelection();
  if (!sel?.rangeCount || sel.isCollapsed) return null;
  const range = sel.getRangeAt(0);
  if (
    !root.contains(range.startContainer) ||
    !root.contains(range.endContainer)
  )
    return null;
  const prefix = range.cloneRange();
  prefix.selectNodeContents(root);
  prefix.setEnd(range.startContainer, range.startOffset);
  const start = prefix.toString().length,
    end = start + range.toString().length;
  const quote = paragraph.text.slice(start, end);
  if (!quote.trim()) return null;
  const rect = range.getBoundingClientRect();
  return {
    paragraphId: paragraph.id,
    start,
    end,
    quote,
    left: Math.max(12, Math.min(rect.left, innerWidth - 320)),
    top: Math.max(70, Math.min(rect.bottom + 8, innerHeight - 65)),
  };
}
export const colorName = (a: Pick<Annotation, "color">) =>
  ({ yellow: "重点信息", blue: "语言积累", pink: "疑问待解" })[a.color];
