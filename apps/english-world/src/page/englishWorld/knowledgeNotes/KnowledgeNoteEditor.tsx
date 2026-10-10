import { MobileActivityLockContext } from "@/page/englishWorldMobile/offline/MobileActivityLockContext";
import { useContext, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AutoGrowTextarea } from "./AutoGrowTextarea";
import { UnsavedNoteGuard } from "./UnsavedNoteGuard";
import {
  NOTE_CATEGORIES,
  newRequestId,
  noteError,
  notesApi,
  type KnowledgeNote,
  type NoteFields,
  type NoteWord,
} from "./api";
const template = "知识点：\n\n我的原理解：\n\n正确理解：\n\n容易混淆的地方：\n";
export function KnowledgeNoteEditor({
  note,
  copy,
  base,
  listSearch,
}: {
  note?: KnowledgeNote;
  copy?: NoteWord & { englishNote: string; englishReference: string };
  base: string;
  listSearch: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [initial] = useState<NoteFields>(() => ({
    title: note?.title ?? "",
    body: note?.body ?? copy?.englishNote ?? "",
    category: note?.category ?? "其他",
    examples: note?.examples ?? "",
    source: note?.source ?? copy?.englishReference ?? "",
    wordIds: note?.words.map((w) => w.id) ?? (copy ? [copy.id] : []),
  }));
  const [baseVersion] = useState(note?.version);
  const [values, setValues] = useState(initial);
  const [words, setWords] = useState<NoteWord[]>(
    note?.words ?? (copy ? [copy] : []),
  );
  const [requestId] = useState(newRequestId);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const allowLeave = useRef(false);
  const [error, setError] = useState("");
  const [validation, setValidation] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [wordQuery, setWordQuery] = useState<string | null>(null);
  const [latest, setLatest] = useState<KnowledgeNote | null>(null);
  const results = useQuery({
    queryKey: ["knowledge-notes", user?.id, "word-search", wordQuery],
    queryFn: () => notesApi.words(wordQuery ?? ""),
    enabled: wordQuery !== null,
  });
  const activityLock = useContext(MobileActivityLockContext);
  const dirty =
    JSON.stringify(values) !== JSON.stringify(initial) || Boolean(copy);
  const lock = activityLock?.lock,
    unlock = activityLock?.unlock;
  useEffect(() => {
    if ((!dirty && !saving) || !lock || !unlock) return;
    lock("knowledge-note-draft");
    return () => unlock("knowledge-note-draft");
  }, [dirty, saving, lock, unlock]);
  const field = <K extends keyof NoteFields>(key: K, value: NoteFields[K]) =>
    setValues((current) => ({ ...current, [key]: value }));
  function validate() {
    const errors: Record<string, string> = {};
    for (const [key, label, max, required] of [
      ["title", "标题", 120, true],
      ["body", "正文", 30000, true],
      ["examples", "例句", 10000, false],
      ["source", "来源", 1000, false],
    ] as const) {
      if (required && !values[key].trim()) errors[key] = `请填写${label}`;
      else if (values[key].length > max)
        errors[key] =
          `${label}最多 ${max} 字符，当前 ${values[key].length} 字符`;
    }
    setValidation(errors);
    return Object.keys(errors).length === 0;
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (submitting.current || !validate()) return;
    if (!navigator.onLine) {
      setError("当前离线，保存需要联网。当前输入已保留。");
      return;
    }
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const saved = note
        ? await notesApi.update(note.id, { ...values, version: baseVersion! })
        : await notesApi.create({ ...values, requestId });
      allowLeave.current = true;
      await client.invalidateQueries({
        queryKey: ["knowledge-notes", user?.id],
      });
      client.setQueryData(
        ["knowledge-notes", user?.id, "detail", saved.id],
        saved,
      );
      navigate(`${base}/${saved.id}${listSearch}`, {
        replace: true,
        state: { saved: true },
      });
    } catch (e) {
      setError(noteError(e));
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return (
    <>
      <UnsavedNoteGuard
        dirty={dirty || saving}
        busy={saving}
        allowLeave={allowLeave}
      />
      <form onSubmit={save} className="knowledge-editor" noValidate>
        <header className="knowledge-toolbar">
          <Link to={`${base}${listSearch}`}>返回列表</Link>
          <h1>{note ? "编辑知识笔记" : "新建知识笔记"}</h1>
          <button className="knowledge-primary" type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
        </header>
        {copy && (
          <p className="knowledge-notice">
            已复制原笔记，保存后原词条内容仍保留。
          </p>
        )}
        {error && (
          <div role="alert" className="knowledge-error">
            {error}
            {note && (
              <button
                type="button"
                onClick={async () => {
                  try {
                    setLatest(await notesApi.get(note.id));
                  } catch (e) {
                    setError(noteError(e));
                  }
                }}
              >
                查看最新版本（保留当前输入）
              </button>
            )}
          </div>
        )}
        {latest && (
          <aside className="knowledge-latest">
            <h2>服务器最新版本 · {latest.title}</h2>
            <p>当前输入保留在下方。请先复制需要保留的修改，再重新打开编辑。</p>
            <p>{latest.body}</p>
            <p>{latest.examples}</p>
            <p>{latest.source}</p>
            <Link to={`${base}/${latest.id}${listSearch}`}>打开最新详情</Link>
          </aside>
        )}
        <fieldset disabled={saving}>
          <label htmlFor="knowledge-title">
            标题 <span aria-hidden="true">*</span>
          </label>
          <input
            id="knowledge-title"
            aria-label="标题"
            value={values.title}
            onChange={(e) => field("title", e.target.value)}
            aria-invalid={!!validation.title}
            placeholder="例如：find it + 形容词 + to do"
          />
          {validation.title && <p role="alert">{validation.title}</p>}
          <label htmlFor="knowledge-category">分类</label>
          <select
            id="knowledge-category"
            value={values.category}
            onChange={(e) => field("category", e.target.value)}
          >
            {NOTE_CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <div className="knowledge-field-heading">
            <label htmlFor="knowledge-body">
              正文 <span aria-hidden="true">*</span>
            </label>
            <button
              type="button"
              onClick={() =>
                field(
                  "body",
                  values.body ? `${values.body}\n\n${template}` : template,
                )
              }
            >
              {values.body ? "在末尾追加记录模板" : "插入记录模板"}
            </button>
          </div>
          <AutoGrowTextarea
            id="knowledge-body"
            aria-label="正文"
            rows={12}
            value={values.body}
            onChange={(e) => field("body", e.target.value)}
            aria-invalid={!!validation.body}
            placeholder="粘贴老师的解释，或写下自己的理解……"
          />
          <small>{values.body.length.toLocaleString()} / 30,000 字符</small>
          {validation.body && <p role="alert">{validation.body}</p>}
          <details
            className="knowledge-extras"
            open={
              Boolean(
                initial.examples || initial.source || initial.wordIds.length,
              ) || undefined
            }
          >
            <summary>补充例句、来源和关联单词</summary>
            <label htmlFor="knowledge-examples">例句与解释</label>
            <AutoGrowTextarea
              id="knowledge-examples"
              rows={4}
              value={values.examples}
              onChange={(e) => field("examples", e.target.value)}
            />
            {validation.examples && <p role="alert">{validation.examples}</p>}
            <label htmlFor="knowledge-source">来源</label>
            <AutoGrowTextarea
              id="knowledge-source"
              rows={2}
              value={values.source}
              onChange={(e) => field("source", e.target.value)}
              placeholder="课程、日期、文章标题或网址"
            />
            {validation.source && <p role="alert">{validation.source}</p>}
            <label htmlFor="knowledge-word-search">
              关联单词（可选，最多 20 个）
            </label>
            <div className="knowledge-actions">
              <input
                id="knowledge-word-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索自己的词库"
              />
              <button type="button" onClick={() => setWordQuery(search.trim())}>
                查找单词
              </button>
            </div>
            <div className="knowledge-tags">
              {words.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  aria-label={`移除关联 ${w.englishWord}`}
                  onClick={() => {
                    setWords(words.filter((x) => x.id !== w.id));
                    field(
                      "wordIds",
                      values.wordIds.filter((id) => id !== w.id),
                    );
                  }}
                >
                  {w.englishWord} ×
                </button>
              ))}
            </div>
            {results.isFetching && <p role="status">查找中…</p>}
            {results.isError && <p role="alert">单词查找失败，请重试。</p>}
            {results.data && (
              <div className="knowledge-tags" aria-label="单词搜索结果">
                {results.data.length ? (
                  results.data.map((w) => (
                    <button
                      type="button"
                      key={w.id}
                      disabled={
                        values.wordIds.includes(w.id) ||
                        values.wordIds.length >= 20
                      }
                      onClick={() => {
                        setWords([...words, w]);
                        field("wordIds", [...values.wordIds, w.id]);
                      }}
                    >
                      {w.englishWord}
                      {values.wordIds.includes(w.id) ? " · 已关联" : " ＋"}
                    </button>
                  ))
                ) : (
                  <p>没有找到单词，知识笔记也可以独立保存。</p>
                )}
              </div>
            )}
          </details>
        </fieldset>
      </form>
    </>
  );
}
