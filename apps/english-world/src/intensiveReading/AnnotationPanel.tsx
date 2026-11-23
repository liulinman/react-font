import { useLayoutEffect, useRef, type ReactNode } from "react";
import type { Annotation } from "./types";
import { colorName } from "./annotationAnchors";
export default function AnnotationPanel({
  annotations,
  filter,
  setFilter,
  onOpen,
  onLocate,
  editorId,
  editorContent,
  editBlocked = false,
}: {
  annotations: Annotation[];
  filter: string;
  setFilter: (f: string) => void;
  onOpen: (a: Annotation) => void;
  onLocate: (a: Annotation) => void;
  editorId?: string;
  editorContent?: ReactNode;
  editBlocked?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const previousEditor = useRef<string | undefined>(undefined);
  useLayoutEffect(() => {
    const active = root.current?.querySelector<HTMLElement>(".ir-editor");
    if (editorId && active) {
      // Adjust only the notes pane; never scroll the article or outer page.
      const pane = active.closest<HTMLElement>(".ir-notes");
      if (pane) {
        const bounds = pane.getBoundingClientRect();
        const row = active.getBoundingClientRect();
        const available = bounds.height - 24;
        const delta = row.height > available || row.top < bounds.top + 12
          ? row.top - bounds.top - 12
          : Math.max(0, row.bottom - bounds.bottom + 12);
        pane.scrollTop += delta;
      }
      active.querySelector<HTMLTextAreaElement>("textarea")?.focus({ preventScroll: true });
    } else if (previousEditor.current) {
      const row = document.getElementById("ir-note-" + previousEditor.current);
      (row?.querySelector<HTMLButtonElement>(".ir-note-footer button") ?? root.current?.querySelector<HTMLButtonElement>(".ir-filters .ir-selected"))?.focus({ preventScroll: true });
    }
    previousEditor.current = editorId;
  }, [editorId]);
  const list = annotations.filter(
    (a) =>
      a.id === editorId ||
      filter === "all" ||
      (filter === "language" && a.color === "blue") ||
      (filter === "question" && a.isQuestion && !a.resolved) ||
      (filter === "unbound" && a.anchorStatus === "needs_confirmation"),
  );
  return (
    <div ref={root} className="ir-note-list">
      <div className="ir-filters">
        {[
          ["all", "全部"],
          ["language", "语言积累"],
          ["question", "待解决"],
          ["unbound", "待确认"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={filter === key ? "ir-selected" : ""}
            onClick={() => setFilter(key)}
          >
            {label}{" "}
            {
              annotations.filter(
                (a) =>
                  key === "all" ||
                  (key === "language" && a.color === "blue") ||
                  (key === "question" && a.isQuestion && !a.resolved) ||
                  (key === "unbound" &&
                    a.anchorStatus === "needs_confirmation"),
              ).length
            }
          </button>
        ))}
      </div>
      {!list.length && (
        <div className="ir-empty">暂无对应标注。选中原文开始记录。</div>
      )}
      {list.map((a) => (
        <section
          className={a.id === editorId ? "ir-note ir-editor" : "ir-note"}
          data-note-id={a.id}
          id={"ir-note-" + a.id}
          key={a.id}
        >
          {a.id === editorId ? editorContent : (<>
          <small>
            {colorName(a)}
            {a.category ? " · " + a.category : ""}
            {a.isQuestion ? (a.resolved ? " · 已解决" : " · 待解决") : ""}
          </small>
          {a.anchorStatus === "needs_confirmation" && (
            <p className="ir-warning">原文已修订，请重新绑定选区</p>
          )}
          <button
            className={"ir-quote ir-border-" + a.color}
            onClick={() => onLocate(a)}
          >
            {a.quote}
          </button>
          <p className="ir-note-body">{a.note || "仅高亮，尚未添加笔记"}</p>
          <div className="ir-note-footer">
            <small>
              {a.anchorStatus === "active" ? "关联原文" : "旧版引用"}
            </small>
            <button disabled={editBlocked} onClick={() => onOpen(a)}>编辑标注</button>
          </div>
          </>)}
        </section>
      ))}
    </div>
  );
}
