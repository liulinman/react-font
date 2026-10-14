import { useNoteListScroll } from "./useNoteListScroll";
import { useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { KnowledgeNoteEditor } from "./KnowledgeNoteEditor";
import {
  NOTE_CATEGORIES,
  noteError,
  notesApi,
  type KnowledgeNote,
  type NoteFilters,
} from "./api";
import "./knowledgeNotes.css";
export const DESKTOP_NOTES_PATH = "/englishWorld/knowledge-notes";
export const MOBILE_NOTES_PATH = "/mobile/tools/knowledge-notes";
function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry: () => unknown;
}) {
  return (
    <div role="alert" className="knowledge-error">
      <p>{message}</p>
      <button onClick={() => void retry()}>重试</button>
    </div>
  );
}
function NoteList({
  base,
  filters,
  listSearch,
}: {
  base: string;
  filters: NoteFilters;
  listSearch: string;
}) {
  const { user } = useAuth();
  const [, setParams] = useSearchParams();
  const [q, setQ] = useState(filters.q ?? "");
  const [category, setCategory] = useState(filters.category ?? "");
  const query = useQuery({
    queryKey: ["knowledge-notes", user?.id, "list", filters],
    queryFn: () => notesApi.list(filters),
  });
  const { root, remember } = useNoteListScroll(
    `${user?.id}:${listSearch}`,
    query.isSuccess,
  );
  const update = (next: NoteFilters) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next))
      if (value) params.set(key, String(value));
    setParams(params);
  };
  return (
    <div ref={root}>
      <header className="knowledge-toolbar">
        <div>
          <h1>知识笔记</h1>
          <p>记录语法、句型、易错点和阅读方法</p>
        </div>
        <Link className="knowledge-primary" to={`${base}/new${listSearch}`}>
          ＋ 新建笔记
        </Link>
      </header>
      <form
        className="knowledge-search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ ...filters, q: q.trim(), category, page: 1 });
        }}
      >
        <input
          aria-label="搜索知识笔记"
          placeholder="搜索标题、正文、例句、来源"
          value={q}
          maxLength={200}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          aria-label="筛选分类"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">全部分类</option>
          {NOTE_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button type="submit">搜索</button>
      </form>
      {filters.wordId && (
        <p className="knowledge-notice">
          正在查看关联单词的知识笔记{" "}
          <button
            onClick={() => update({ ...filters, wordId: undefined, page: 1 })}
          >
            查看全部
          </button>
        </p>
      )}
      {query.isPending ? (
        <p role="status">正在加载笔记…</p>
      ) : query.isError ? (
        <ErrorState message={noteError(query.error)} retry={query.refetch} />
      ) : (
        <>
          {!query.data.list.length ? (
            <div className="knowledge-empty">
              <h2>
                {filters.q || filters.category || filters.wordId
                  ? "没有找到相关笔记"
                  : "把今天学到的知识记在这里"}
              </h2>
              <p>一段解释、一个句型，或一次理解的纠正，都值得留下。</p>
              {filters.q || filters.category || filters.wordId ? (
                <button
                  onClick={() => {
                    setQ("");
                    setCategory("");
                    update({ page: 1 });
                  }}
                >
                  清空筛选
                </button>
              ) : (
                <Link to={`${base}/new`}>创建第一篇知识笔记</Link>
              )}
            </div>
          ) : (
            <ul className="knowledge-list">
              {query.data.list.map((note) => (
                <li key={note.id}>
                  <Link
                    onClick={remember}
                    to={`${base}/${note.id}${listSearch}`}
                  >
                    <div className="knowledge-list-heading">
                      <h2>{note.title}</h2>
                      <span className="knowledge-category">
                        {note.category}
                      </span>
                    </div>
                    <p className="knowledge-summary">{note.body}</p>
                    <div className="knowledge-meta">
                      <span>{note.source || "未填写来源"}</span>
                      <time>
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="knowledge-pagination">
            <span>
              共 {query.data.total} 条 · 第 {filters.page ?? 1} 页
            </span>
            <button
              disabled={(filters.page ?? 1) <= 1}
              onClick={() =>
                update({ ...filters, page: (filters.page ?? 1) - 1 })
              }
            >
              上一页
            </button>
            <button
              disabled={(filters.page ?? 1) * 20 >= query.data.total}
              onClick={() =>
                update({ ...filters, page: (filters.page ?? 1) + 1 })
              }
            >
              下一页
            </button>
          </div>
        </>
      )}
    </div>
  );
}
function NoteDetail({
  note,
  base,
  listSearch,
}: {
  note: KnowledgeNote;
  base: string;
  listSearch: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const client = useQueryClient();
  const [deleting, setDeleting] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  async function remove() {
    if (deleting) return;
    setDeleting(true);
    try {
      await notesApi.remove(note.id);
      await client.invalidateQueries({
        queryKey: ["knowledge-notes", user?.id],
      });
      navigate(`${base}${listSearch}`, { replace: true });
    } catch (e) {
      setError(noteError(e));
      setDeleting(false);
      setConfirm(false);
    }
  }
  return (
    <>
      <header className="knowledge-toolbar">
        <Link to={`${base}${listSearch}`}>返回列表</Link>
        <div className="knowledge-actions">
          <Link to={`${base}/${note.id}/edit${listSearch}`}>编辑</Link>
          <details className="knowledge-more">
            <summary>更多</summary>
            <button onClick={() => setConfirm(true)}>删除笔记</button>
          </details>
        </div>
      </header>
      {location.state?.saved && (
        <p role="status" className="knowledge-notice">
          已保存
        </p>
      )}
      {error && <p role="alert">{error}</p>}
      <article className="knowledge-article">
        <span className="knowledge-category">{note.category}</span>
        <h1>{note.title}</h1>
        <p className="knowledge-muted">
          更新于 {new Date(note.updatedAt).toLocaleString()}
        </p>
        <div className="knowledge-body">{note.body}</div>
        {note.examples && (
          <section>
            <h2>例句与解释</h2>
            <p>{note.examples}</p>
          </section>
        )}
        {note.source && (
          <section>
            <h2>来源</h2>
            <p>{note.source}</p>
          </section>
        )}
        {!!note.words?.length && (
          <section>
            <h2>关联单词</h2>
            <div className="knowledge-tags">
              {note.words.map((w) => (
                <Link
                  key={w.id}
                  to={
                    base === MOBILE_NOTES_PATH
                      ? `/mobile/words/${w.id}`
                      : `/englishWorld/words?englishWord=${encodeURIComponent(w.englishWord)}`
                  }
                >
                  {w.englishWord} ↗
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
      {confirm && (
        <div className="knowledge-dialog-backdrop">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-note-title"
            className="knowledge-dialog"
          >
            <h2 id="delete-note-title">删除“{note.title}”？</h2>
            <p>删除后无法恢复。关联单词和原单词笔记会保留。</p>
            <div className="knowledge-actions">
              <button
                autoFocus
                disabled={deleting}
                onClick={() => setConfirm(false)}
              >
                取消
              </button>
              <button disabled={deleting} onClick={() => void remove()}>
                {deleting ? "删除中…" : "确认删除"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
export function KnowledgeNotesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const base = location.pathname.startsWith("/mobile")
    ? MOBILE_NOTES_PATH
    : DESKTOP_NOTES_PATH;
  const segments = location.pathname
    .slice(base.length)
    .split("/")
    .filter(Boolean);
  const isNew = segments[0] === "new";
  const id = Number(segments[0]);
  const editing = segments[1] === "edit";
  const copyWord = Number(params.get("copyWord"));
  const page = Number(params.get("page") ?? 1);
  const wordId = Number(params.get("wordId"));
  const filters: NoteFilters = {
    q: params.get("q") || undefined,
    category: params.get("category") || undefined,
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    wordId: Number.isSafeInteger(wordId) && wordId > 0 ? wordId : undefined,
  };
  const listParams = new URLSearchParams(params);
  listParams.delete("copyWord");
  const listSearch = listParams.size ? `?${listParams}` : "";
  const detail = useQuery({
    queryKey: ["knowledge-notes", user?.id, "detail", id],
    queryFn: () => notesApi.get(id),
    enabled: !isNew && Number.isSafeInteger(id) && id > 0,
  });
  const copy = useQuery({
    queryKey: ["knowledge-notes", user?.id, "copy", copyWord],
    queryFn: () => notesApi.copy(copyWord),
    enabled: isNew && Number.isSafeInteger(copyWord) && copyWord > 0,
  });
  let content;
  if (isNew) {
    content =
      params.has("copyWord") &&
      (!Number.isSafeInteger(copyWord) || copyWord <= 0) ? (
        <p role="alert">原单词地址无效</p>
      ) : copyWord && copy.isPending ? (
        <p role="status">正在读取原笔记…</p>
      ) : copyWord && copy.isError && !copy.data ? (
        <ErrorState message={noteError(copy.error)} retry={copy.refetch} />
      ) : (
        <KnowledgeNoteEditor
          key={`new-${user?.id}-${copyWord}`}
          copy={copy.data}
          base={base}
          listSearch={listSearch}
        />
      );
  } else if (segments.length) {
    content =
      !Number.isSafeInteger(id) || id <= 0 ? (
        <p role="alert">笔记地址无效</p>
      ) : detail.isPending ? (
        <p role="status">正在加载笔记…</p>
      ) : detail.isError && !detail.data ? (
        <ErrorState message={noteError(detail.error)} retry={detail.refetch} />
      ) : editing ? (
        <KnowledgeNoteEditor
          key={`${user?.id}-${id}`}
          note={detail.data!}
          base={base}
          listSearch={listSearch}
        />
      ) : (
        <NoteDetail
          key={`${user?.id}-${id}`}
          note={detail.data!}
          base={base}
          listSearch={listSearch}
        />
      );
  } else
    content = (
      <NoteList
        key={location.search}
        base={base}
        filters={filters}
        listSearch={listSearch}
      />
    );
  return (
    <section
      aria-label="知识笔记"
      className={`knowledge-notes${base === MOBILE_NOTES_PATH ? " knowledge-notes-mobile" : ""}`}
    >
      {content}
    </section>
  );
}
