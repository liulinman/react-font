import type { Annotation } from "./types";
import { colorName } from "./annotationAnchors";
export default function AnnotationPanel({
  annotations,
  filter,
  setFilter,
  onOpen,
  onLocate,
}: {
  annotations: Annotation[];
  filter: string;
  setFilter: (f: string) => void;
  onOpen: (a: Annotation) => void;
  onLocate: (a: Annotation) => void;
}) {
  const list = annotations.filter(
    (a) =>
      filter === "all" ||
      (filter === "language" && a.color === "blue") ||
      (filter === "question" && a.isQuestion && !a.resolved) ||
      (filter === "unbound" && a.anchorStatus === "needs_confirmation"),
  );
  return (
    <>
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
          className="ir-note"
          data-note-id={a.id}
          id={"ir-note-" + a.id}
          key={a.id}
        >
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
            <button onClick={() => onOpen(a)}>编辑标注</button>
          </div>
        </section>
      ))}
    </>
  );
}
