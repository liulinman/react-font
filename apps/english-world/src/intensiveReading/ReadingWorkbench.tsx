import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { readMaterial } from "./api";
import type { Annotation, Material, Paragraph, Selection } from "./types";
import AnnotationText from "./AnnotationText";
import AnnotationPanel from "./AnnotationPanel";
import { useReadingPersistence } from "./useReadingPersistence";
import { overlaps } from "./annotationAnchors";
type Editor = Omit<Annotation, "id" | "version"> & { id?: string };
export default function ReadingWorkbench({
  material: m,
  onChange,
}: {
  material: Material;
  onChange: (m: Material) => void;
}) {
  const navigate = useNavigate(),
    persist = useReadingPersistence(m, onChange);
  const [collapsed, setCollapsed] = useState(false),
    [size, setSize] = useState(20),
    [filter, setFilter] = useState("all"),
    [review, setReview] = useState(false),
    [selection, setSelection] = useState<Selection | null>(null),
    [editor, setEditor] = useState<Editor | null>(null),
    [message, setMessage] = useState(""),
    [binding, setBinding] = useState<Annotation | null>(null);
  const article = useRef<HTMLElement>(null),
    restored = useRef(false),
    noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    progressTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    editorRevision = useRef(0);
  const latest = useRef(m);
  latest.current = m;
  const persistence = useRef(persist);
  persistence.current = persist;
  useEffect(() => {
    if (!restored.current && m.progress) {
      const el = document.getElementById("ir-p-" + m.progress.paragraphId);
      if (el && article.current) {
        const supplement = el.closest<HTMLDetailsElement>("details.ir-supplement");
        if (supplement) supplement.open = true;
        article.current.scrollTop =
          el.offsetTop -
          article.current.offsetTop +
          m.progress.ratio * el.offsetHeight;
        restored.current = true;
      }
    }
  }, [m.progress]);
  useEffect(
    () => () => {
      if (noteTimer.current) clearTimeout(noteTimer.current);
      if (progressTimer.current) clearTimeout(progressTimer.current);
    },
    [],
  );
  function locate(a: Annotation) {
    if (a.anchorStatus !== "active") {
      setMessage("请先在新正文中选中文字，再重新绑定这条笔记。");
      setBinding(a);
      return;
    }
    const el = document.getElementById("ir-a-" + a.id);
    const supplement = el?.closest<HTMLDetailsElement>("details.ir-supplement");
    if (supplement) supplement.open = true;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.animate(
      [{ outline: "3px solid #668c73" }, { outline: "3px solid transparent" }],
      { duration: 1400 },
    );
  }
  function open(a: Annotation) {
    if (persist.dirty || persist.busy) {
      setMessage("请先保存当前笔记");
      return;
    }
    setEditor({ ...a });
    setSelection(null);
    setFilter("all");
    document
      .getElementById("ir-note-" + a.id)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  async function saveEditor(value: Editor, close = false) {
    const revision = editorRevision.current;
    const result = await persist.perform(
      "annotations" + (value.id ? "/" + value.id : ""),
      { ...value, bodyVersionId: latest.current.activeBodyVersionId },
      value.id ? "PUT" : "POST",
    );
    if (result) {
      if (editorRevision.current === revision) {
        persist.setDirty(false);
        if (close) setEditor(null);
        else {
          const saved =
            result.annotations.find((a) => a.id === value.id) ||
            result.annotations[result.annotations.length - 1];
          setEditor(saved);
        }
      }
      return true;
    }
    return false;
  }
  function update(value: Partial<Editor>) {
    if (!editor) return;
    const next = { ...editor, ...value };
    setEditor(next);
    editorRevision.current++;
    persist.setDirty(true);
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      if (!persistence.current.busy && !persistence.current.error)
        void saveEditor(next);
    }, 800);
  }
  async function mark(color: Annotation["color"], write = false) {
    if (!selection || persist.busy || persist.dirty || persist.error) return;
    const existing = m.annotations.filter(
      (a) =>
        a.paragraphId === selection.paragraphId &&
        a.anchorStatus === "active" &&
        a.id !== binding?.id,
    );
    if (overlaps(selection, existing)) {
      setMessage("此处已有标注，请点击原标记编辑。");
      setSelection(null);
      return;
    }
    const base: Editor = binding
      ? {
          ...binding,
          ...selection,
          bodyVersionId: m.activeBodyVersionId!,
          anchorStatus: "active",
        }
      : {
          ...selection,
          bodyVersionId: m.activeBodyVersionId!,
          color,
          category: "",
          note: "",
          isQuestion: color === "pink",
          resolved: false,
          anchorStatus: "active",
        };
    if (binding) {
      const ok = await saveEditor(base, true);
      if (ok) {
        setBinding(null);
        setMessage("已重新绑定原文");
      }
    } else {
      const result = await persist.perform("annotations", base);
      if (result && write)
        setEditor(result.annotations[result.annotations.length - 1]);
    }
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }
  function progress() {
    if (progressTimer.current) clearTimeout(progressTimer.current);
    progressTimer.current = setTimeout(() => {
      const p = persistence.current,
        root = article.current;
      if (!root || p.busy || p.dirty || p.error) return;
      const top = root.getBoundingClientRect().top;
      const elements = [
        ...root.querySelectorAll<HTMLElement>("[data-paragraph-id]"),
      ];
      const el = elements.find(
        (e) => e.getClientRects().length > 0 && e.getBoundingClientRect().bottom > top + 30,
      );
      if (!el) return;
      const rect = el.getBoundingClientRect();
      void p.perform(
        "progress",
        {
          paragraphId: el.dataset.paragraphId,
          ratio: Math.max(0, Math.min(1, (top - rect.top) / rect.height)),
        },
        "PUT",
      );
    }, 1500);
  }
  const blocked = persist.busy || !!persist.error;
  const body = m.paragraphs.filter(p => !p.role || p.role === "body" || p.role === "heading");
  const supplement = m.paragraphs.filter(p => p.role && p.role !== "body" && p.role !== "heading");
  const headings = body.filter(p => p.role === "heading");
  const outline = headings.length ? headings : body;
  function renderParagraph(p: Paragraph) {
    return <section key={p.id} className={"ir-paragraph-wrap" + (p.role === "heading" ? " ir-section-heading" : "")}
      role={p.role === "heading" ? "heading" : undefined} aria-level={p.role === "heading" ? 2 : undefined}>
      <AnnotationText paragraph={p} annotations={m.annotations.filter(a => a.paragraphId === p.id)}
        onSelect={s => { setSelection(s); if (!s && window.getSelection()?.toString()) setMessage("请在同一段内选择文字进行标注"); }}
        onOpen={open} />
    </section>;
  }
  return (
    <div className={"ir-workbench" + (collapsed ? " ir-collapsed" : "")}>
      <header className="ir-workbench-header">
        <div className="ir-actions">
          <button onClick={() => navigate("/englishWorld/intensive-reading")}>
            ← 我的精读
          </button>
          <span className="ir-header-title">{m.title}</span>
        </div>
        <div className="ir-actions">
          <small role="status">
            {persist.dirty && !persist.busy ? "待保存" : persist.status}
          </small>
          <button
            onClick={() =>
              navigate(`/englishWorld/intensive-reading/${m.id}/review`)
            }
          >
            原件 / 修订
          </button>
        </div>
      </header>
      <nav className="ir-toc">
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "展开目录" : "收起目录"}
        >
          {collapsed ? "☰" : "收起目录 ‹"}
        </button>
        {!collapsed && (
          <>
            <button
              className={!review ? "ir-selected" : ""}
              onClick={() => setReview(false)}
            >
              阅读工作台
            </button>
            <button
              className={review ? "ir-selected" : ""}
              onClick={() => setReview(true)}
            >
              笔记回顾 {m.annotations.length}
            </button>
            <h4>{headings.length ? "文章目录" : "段落导航"}</h4>
            {outline.map((p, i) => (
              <button
                key={p.id}
                onClick={() =>
                  document
                    .getElementById("ir-p-" + p.id)
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                {headings.length ? p.text : `第 ${i + 1} 段 · ${p.text.slice(0, 28)}${p.text.length > 28 ? "…" : ""}`}
              </button>
            ))}
            <p className="ir-toc-hint">
              选中单词或句子，留下理解、积累与疑问。
            </p>
          </>
        )}
      </nav>
      <article
        ref={article}
        className="ir-reader"
        onScroll={progress}
        style={{ fontSize: size }}
      >
        <div className="ir-paper">
          <div className="ir-reader-tools">
            <span>原文阅读</span>
            <div>
              <button onClick={() => setSize((s) => Math.max(16, s - 1))}>
                A−
              </button>
              <button onClick={() => setSize((s) => Math.min(28, s + 1))}>
                A＋
              </button>
            </div>
          </div>
          {review && (
            <div className="ir-warning">
              笔记回顾：右侧可筛选语言积累、待解决疑问与待确认引用。点击摘录定位原文。
            </div>
          )}
          {binding && (
            <div className="ir-warning">
              正在重新绑定：“{binding.quote}”<br />
              请在新正文选中文字。
              <button onClick={() => setBinding(null)}>取消绑定</button>
            </div>
          )}
          <div className="ir-eyebrow">READ CLOSELY · THINK DEEPLY</div>
          <h1>{m.title}</h1>
          <p className="ir-dek">{body.filter(p => p.role !== "heading").length} 个段落 · 原文已确认</p>
          <div className="ir-article-body">{body.map(renderParagraph)}</div>
          <footer className="ir-end">
            — 文章结束 —
            <button onClick={() => setReview(true)}>回顾我的笔记 →</button>
          </footer>
          {supplement.length > 0 && (
            <details className="ir-supplement">
              <summary>附带练习与说明 <span>{supplement.length} 项 · 展开查看原文</span></summary>
              <p className="ir-supplement-hint">原材料中的题目、作答说明与答案保留在这里。内容归属可在“原件 / 修订”中调整。</p>
              {supplement.map(renderParagraph)}
            </details>
          )}
        </div>
      </article>
      <aside className="ir-notes">
        <h3>
          {review ? "笔记回顾" : "我的笔记"}{" "}
          <small>{m.annotations.length}</small>
        </h3>
        <p className="ir-muted">理解、积累，也留下还没想通的地方。</p>
        {message && (
          <div className="ir-warning" role="status">
            {message}
            <button onClick={() => setMessage("")}>关闭</button>
          </div>
        )}
        {persist.error && (
          <div className="ir-error" role="alert">
            {persist.error}
            <button
              disabled={persist.busy}
              onClick={async () => {
                const result = await persist.retry();
                if (result) persist.setDirty(false);
              }}
            >
              重试保存
            </button>
            <button
              disabled={persist.busy}
              onClick={async () => {
                try {
                  const next = await readMaterial(m.id);
                  onChange(next);
                  persist.discardPending();
                  setMessage("已载入最新数据，当前编辑仍保留，可重新保存");
                } catch {
                  setMessage("最新数据加载失败");
                }
              }}
            >
              载入最新版本
            </button>
          </div>
        )}
        {editor && (
          <section className="ir-editor">
            <h4>编辑标注</h4>
            <blockquote>{editor.quote}</blockquote>
            <div className="ir-actions">
              {(["yellow", "blue", "pink"] as const).map((c) => (
                <button
                  aria-label={
                    "改为" + { yellow: "黄色", blue: "蓝色", pink: "粉色" }[c]
                  }
                  key={c}
                  className={`ir-color ir-${c} ${editor.color === c ? "ir-color-selected" : ""}`}
                  disabled={blocked}
                  onClick={() => update({ color: c })}
                />
              ))}
            </div>
            <label>
              分类
              <select
                aria-label="笔记分类"
                value={editor.category}
                disabled={blocked}
                onChange={(e) =>
                  update({
                    category: e.target.value,
                    ...(e.target.value === "疑问" ? { isQuestion: true } : {}),
                  })
                }
              >
                {["", "词汇", "语法", "段意", "疑问"].map((c) => (
                  <option key={c} value={c}>
                    {c || "不分类"}
                  </option>
                ))}
              </select>
            </label>
            <textarea
              aria-label="笔记内容"
              maxLength={10000}
              rows={6}
              value={editor.note}
              disabled={blocked}
              onChange={(e) => update({ note: e.target.value })}
              placeholder="记录你的理解、翻译或疑问…"
            />
            <label className="ir-checkbox">
              <input
                type="checkbox"
                checked={editor.isQuestion}
                disabled={blocked}
                onChange={(e) => update({ isQuestion: e.target.checked })}
              />
              设为疑问
            </label>
            {editor.isQuestion && (
              <label className="ir-checkbox">
                <input
                  type="checkbox"
                  checked={editor.resolved}
                  disabled={blocked}
                  onChange={(e) => update({ resolved: e.target.checked })}
                />
                已解决
              </label>
            )}
            <div className="ir-actions">
              <button
                className="ir-primary"
                disabled={blocked}
                onClick={() => {
                  if (noteTimer.current) clearTimeout(noteTimer.current);
                  void saveEditor(editor, true);
                }}
              >
                保存笔记
              </button>
              <button
                disabled={persist.busy || persist.dirty}
                onClick={() => setEditor(null)}
              >
                收起
              </button>
              {editor.anchorStatus === "needs_confirmation" && (
                <button
                  disabled={blocked || persist.dirty}
                  onClick={() => {
                    setBinding(editor as Annotation);
                    setEditor(null);
                    setMessage("请在原文中选择新的引用位置");
                  }}
                >
                  重新绑定
                </button>
              )}
            </div>
            <button
              className="ir-delete"
              disabled={blocked}
              onClick={async () => {
                if (noteTimer.current) clearTimeout(noteTimer.current);
                const result = await persist.perform(
                  "annotations/" + editor.id,
                  {},
                  "DELETE",
                );
                if (result) {
                  persist.setDirty(false);
                  setEditor(null);
                }
              }}
            >
              删除此标注
            </button>
          </section>
        )}
        <AnnotationPanel
          annotations={m.annotations}
          filter={filter}
          setFilter={setFilter}
          onOpen={open}
          onLocate={locate}
        />
      </aside>
      {selection && (
        <div
          className="ir-selection"
          style={{ left: selection.left, top: selection.top }}
          onMouseDown={(e) => e.preventDefault()}
        >
          {binding ? (
            <button
              disabled={blocked || persist.dirty}
              onClick={() => void mark(binding.color)}
            >
              确认重新绑定
            </button>
          ) : (
            <>
              {(["yellow", "blue", "pink"] as const).map((c) => (
                <button
                  key={c}
                  className={"ir-color ir-" + c}
                  aria-label={
                    { yellow: "黄色高亮", blue: "蓝色高亮", pink: "粉色疑问" }[
                      c
                    ]
                  }
                  disabled={blocked || persist.dirty}
                  onClick={() => void mark(c)}
                />
              ))}
              <button
                disabled={blocked || persist.dirty}
                onClick={() => void mark("yellow", true)}
              >
                ＋ 笔记
              </button>
            </>
          )}
          <button aria-label="关闭选区工具" onClick={() => setSelection(null)}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
