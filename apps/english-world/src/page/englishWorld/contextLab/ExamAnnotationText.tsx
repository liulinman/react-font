import { useRef, type ReactNode } from "react";
import type { ExamAnnotation } from "./ieltsExamState";
export type ExamTextSelection = {
  block: string;
  start: number;
  end: number;
  text: string;
};
export type AnnotationAnchor = { left: number; top: number };
export function ExamAnnotationText({
  block,
  text,
  annotations,
  onSelect,
  onOpen,
  readOnly,
  omissions = [],
  inline = false,
}: {
  block: string;
  text: string;
  annotations: ExamAnnotation[];
  readOnly?: boolean;
  inline?: boolean;
  omissions?: Array<{start:number;end:number}>;
  onSelect: (selection: ExamTextSelection, anchor: AnnotationAnchor) => void;
  onOpen: (
    annotation: ExamAnnotation,
    anchor: AnnotationAnchor,
    menu: boolean,
  ) => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const hidden=omissions.filter(r=>r.start>=0&&r.end>r.start&&r.end<=text.length).sort((a,b)=>a.start-b.start);
  const sourceOffset=(visible:number,right:boolean)=>{let skipped=0;for(const r of hidden){const boundary=r.start-skipped;if(visible<boundary||visible===boundary&&!right)break;skipped+=r.end-r.start;}return visible+skipped;};
  const marks = annotations.filter((a) => a.block === block);
  const boundaries = [
    ...new Set([0, text.length, ...marks.flatMap((a) => [a.start, a.end]), ...hidden.flatMap(r=>[r.start,r.end])]),
  ].sort((a, b) => a - b);
  const capture = (point: AnnotationAnchor) => {
    const selected = window.getSelection();
    if (
      readOnly ||
      !ref.current ||
      !selected?.rangeCount ||
      selected.isCollapsed
    )
      return false;
    const range = selected.getRangeAt(0);
    if (
      !ref.current.contains(range.startContainer) ||
      !ref.current.contains(range.endContainer)
    )
      return false;
    const prefix = range.cloneRange();
    prefix.selectNodeContents(ref.current);
    prefix.setEnd(range.startContainer, range.startOffset);
    const visibleStart=prefix.toString().length;
    const start = sourceOffset(visibleStart,true),
      end = sourceOffset(visibleStart+range.toString().length,false);
    if (!text.slice(start, end).trim()) return false;
    const rect = range.getBoundingClientRect?.();
    onSelect(
      { block, start, end, text: text.slice(start, end) },
      {
        left: point.left || rect?.left || 20,
        top: point.top || rect?.bottom || 100,
      },
    );
    return true;
  };
  const nodes: ReactNode[] = boundaries.slice(0, -1).map((start, i) => {
    const end = boundaries[i + 1],
      covering = marks.filter((a) => a.start <= start && a.end >= end);
    if (hidden.some(r=>r.start<=start&&r.end>=end)) return null;
    if (!covering.length) return text.slice(start, end);
    const mark =
      covering.find((a) => a.kind === "note" || a.note) || covering[0];
    const hasNote = mark.kind === "note" || !!mark.note;
    return (
      <mark
        key={`${start}:${end}`}
        data-annotation-id={mark.id}
        className={hasNote ? "has-note" : ""}
        role="button"
        tabIndex={0}
        aria-label={`${hasNote ? "打开笔记" : "查看高亮"}：${mark.text}`}
        title={hasNote ? "点击查看笔记" : "右键管理高亮"}
        onClick={(event) => {
          if (window.getSelection()?.isCollapsed === false) return;
          const rect = event.currentTarget.getBoundingClientRect();
          onOpen(mark, { left: rect.left, top: rect.bottom }, !hasNote);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            onOpen(mark, { left: rect.left, top: rect.bottom }, !hasNote);
          }
        }}
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          const point = { left: event.clientX, top: event.clientY };
          if (!capture(point)) onOpen(mark, point, true);
        }}
      >
        {text.slice(start, end)}
      </mark>
    );
  });
  return (
    <span
      ref={ref}
      data-testid={`exam-text-${block}`}
      className="ielts-exam-text"
      style={{ display: inline ? "inline" : "block" }}
      onContextMenu={(event) => {
        if (capture({ left: event.clientX, top: event.clientY }))
          event.preventDefault();
      }}
      onKeyDown={(event) => {
        if (
          event.key === "ContextMenu" ||
          (event.shiftKey && event.key === "F10")
        ) {
          if (capture({ left: 0, top: 0 })) event.preventDefault();
        }
      }}
    >
      {nodes}
    </span>
  );
}
