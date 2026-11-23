import { wordLookupContext } from './wordLookupContext';
import { memo, useRef } from "react";
import type { Paragraph, Annotation, Selection } from "./types";
import { captureSelection, segments } from "./annotationAnchors";
function AnnotationText({
  paragraph,
  annotations,
  onSelect,
  onOpen,
  onWord,
}: {
  paragraph: Paragraph;
  annotations: Annotation[];
  onSelect: (s: Selection | null) => void;
  onOpen: (a: Annotation) => void;
  onWord?: (word: string, context: string) => void;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const contextAt = (start: number, length: number) => wordLookupContext(paragraph.text, start, start + length);
  function renderWords(text: string, start: number, annotation?: Annotation) {
    let offset = start;
    return text.split(/([A-Za-z]+(?:['’\-][A-Za-z]+)*)/g).map((word, i) => {
      const at = offset; offset += word.length;
      return i % 2 && onWord ? <span key={`${start}-${i}`} className="ir-word"
        role="button" tabIndex={0} aria-label={`查看词库：${word}`}
        onClick={e => { if (!window.getSelection()?.toString()) { e.currentTarget.focus({preventScroll: true}); onWord(word, contextAt(at, word.length)); } }}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (annotation) onOpen(annotation); onWord(word, contextAt(at, word.length)); } }}
      >{word}</span> : word;
    });
  }
  return (
    <p
      ref={ref}
      tabIndex={-1}
      className="ir-paragraph"
      data-paragraph-id={paragraph.id}
      id={"ir-p-" + paragraph.id}
      onMouseUp={() =>
        onSelect(ref.current ? captureSelection(ref.current, paragraph) : null)
      }
    >
      {segments(paragraph.text, annotations).map((s) =>
        s.annotation ? (
          <mark
            key={s.start}
            id={"ir-a-" + s.annotation.id}
            data-annotation-id={s.annotation.id}
            className={`ir-${s.annotation.color}`}
            role="button"
            tabIndex={0}
            aria-label={"打开标注：" + s.annotation.quote}
            onClick={(e) => {
              if (!window.getSelection()?.toString()) { if (e.target === e.currentTarget) e.currentTarget.focus({preventScroll: true}); onOpen(s.annotation!);
                if (e.target === e.currentTarget && /^[A-Za-z]+(?:['’\-][A-Za-z]+)*$/.test(s.annotation!.quote)) onWord?.(s.annotation!.quote, contextAt(s.annotation!.start, s.annotation!.quote.length)); }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(s.annotation!);
                if (/^[A-Za-z]+(?:['’\-][A-Za-z]+)*$/.test(s.annotation!.quote)) onWord?.(s.annotation!.quote, contextAt(s.annotation!.start, s.annotation!.quote.length));
              }
            }}
          >
            {renderWords(s.text, s.start, s.annotation)}
          </mark>
        ) : (
          renderWords(s.text, s.start)
        ),
      )}
    </p>
  );
}

export default memo(AnnotationText);
