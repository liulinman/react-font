import { useRef } from "react";
import type { Paragraph, Annotation, Selection } from "./types";
import { captureSelection, segments } from "./annotationAnchors";
export default function AnnotationText({
  paragraph,
  annotations,
  onSelect,
  onOpen,
}: {
  paragraph: Paragraph;
  annotations: Annotation[];
  onSelect: (s: Selection | null) => void;
  onOpen: (a: Annotation) => void;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  return (
    <p
      ref={ref}
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
            onClick={() => {
              if (!window.getSelection()?.toString()) onOpen(s.annotation!);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen(s.annotation!);
              }
            }}
          >
            {s.text}
          </mark>
        ) : (
          s.text
        ),
      )}
    </p>
  );
}
