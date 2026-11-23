import { DocumentReading } from "@/components/notes/DocumentReading";
import { NoteContent } from "@/components/notes/NoteContent";
import { noteSummary } from "@/components/notes/noteSummary";
import { useNoteListScroll } from "./useNoteListScroll";
import { useEffect, useState } from "react";
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
import "./knowledgeDesktop.css";
import { NoteFolders, folderPath, useFolders } from "./NoteFolders";
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
  foldersOpen = true,
  embedded = false,
}: {
  foldersOpen?: boolean;
  embedded?: boolean;
  base: string;
  filters: NoteFilters;
  listSearch: string;
}) {
  const { user } = useAuth();
  const [, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const desktop = base === DESKTOP_NOTES_PATH;
  const folders = useFolders(desktop);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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
    if (embedded) navigate(`${base}${params.size ? `?${params}` : ""}`);
    else setParams(params);
  };
  useEffect(() => {
    if (query.data && (filters.page ?? 1) > Math.max(1, Math.ceil(query.data.total / 20))) update({ ...filters, page: Math.max(1, Math.ceil(query.data.total / 20)) });
  }, [query.data, filters.page]);
  useEffect(()=>{setQ(filters.q ?? "");setCategory(filters.category ?? "");setSelectedIds([]);},[listSearch]);
  const selected = (query.data?.list ?? []).filter(n => selectedIds.includes(n.id));
  const currentFolder = typeof filters.folderId === "number" ? folderPath(folders.data?.list ?? [], filters.folderId) : filters.folderId === "unfiled" ? "未归档" : "全部笔记";
  return (
    <div ref={root} className={desktop ? `knowledge-folder-layout${embedded ? " is-embedded" : ""}${foldersOpen ? " folders-visible" : ""}` : undefined}>
      {desktop && foldersOpen && <NoteFolders current={filters.folderId} onChoose={folderId => update({ ...filters, folderId, page: 1 })} selected={selected} onMoved={() => setSelectedIds([])} />}
      <div className="knowledge-folder-content">
      {!embedded && <header className="knowledge-toolbar">
        <div>
          <h1>知识笔记</h1>
          <p>{desktop ? "用文件夹整理句子、词语辨析和课程笔记" : "记录语法、句型、易错点和阅读方法"}</p>
        </div>
        <Link className="knowledge-primary" to={`${base}/new${listSearch}`}>
          ＋ 新建笔记
        </Link>
      </header>}
      {desktop && <div className="knowledge-folder-location"><strong>{currentFolder || (folders.isPending ? "正在加载目录…" : folders.isError ? "目录暂不可用" : "文件夹已失效")}</strong>{typeof filters.folderId === "number" && <span>包含子文件夹</span>}</div>}
      <form
        className="knowledge-search"
        onSubmit={(e) => {
          e.preventDefault();
          update({ ...filters, q: q.trim(), category, page: 1 });
        }}
      >
        <input
          aria-label="搜索知识笔记"
          placeholder={desktop ? (filters.folderId ? "搜索当前文件夹…" : "搜索全部笔记…") : (filters.folderId ? "在当前目录搜索标题、正文、例句、来源" : "搜索全部笔记：标题、正文、例句、来源")}
          title="搜索标题、正文、例句和来源"
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
        <><ErrorState message={noteError(query.error)} retry={query.refetch} />{filters.folderId && <button onClick={() => update({ page: 1 })}>返回全部笔记</button>}</>
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
                    update({ folderId: filters.folderId, page: 1 });
                  }}
                >
                  清空筛选
                </button>
              ) : (
                <Link to={`${base}/new${listSearch}`}>创建第一篇知识笔记</Link>
              )}
            </div>
          ) : (
            <>
            {desktop && <div className="knowledge-selection"><label><input type="checkbox" aria-label="本页全选" checked={!!query.data.list.length && selectedIds.length === query.data.list.length} onChange={e => setSelectedIds(e.target.checked ? query.data.list.map(n => n.id) : [])} />本页全选</label><span>{selectedIds.length ? `已选 ${selectedIds.length} 条 · 在左侧选择“移动已选”` : "勾选后可批量移动"}</span></div>}
            <ul className="knowledge-list">
              {query.data.list.map((note) => (
                <li key={note.id} className={desktop ? `knowledge-selectable-row${location.pathname === `${base}/${note.id}` ? " is-active" : ""}` : undefined}>
                  {desktop && <input type="checkbox" aria-label={`选择笔记 ${note.title}`} checked={selectedIds.includes(note.id)} onChange={e => setSelectedIds(old => e.target.checked ? [...old, note.id] : old.filter(id => id !== note.id))} />}
                  <Link
                    onClick={remember}
                    to={`${base}/${note.id}${listSearch}`}
                  >
                    <div className="knowledge-list-heading">
                      <h2 title={note.title}>{note.title}</h2>
                      <span className="knowledge-category">
                        {note.category}
                      </span>
                    </div>
                    <p className="knowledge-summary">{noteSummary(note.body)}</p>
                    <div className="knowledge-meta">
                      <span>{desktop ? note.folderId ? folderPath(folders.data?.list ?? [], note.folderId) : "未归档" : note.source || "未填写来源"}</span>
                      <time>
                        {new Date(note.updatedAt).toLocaleDateString()}
                      </time>
                    </div>
                  </Link>
                </li>
              ))}
            </ul></>
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
      {base === DESKTOP_NOTES_PATH ? <DocumentReading identity={`${note.id}-${note.version}`}><NoteArticle note={note} base={base}/></DocumentReading> : <NoteArticle note={note} base={base}/>}
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
function NoteArticle({note,base}:{note:KnowledgeNote;base:string}) { return (<article className="knowledge-article">
        <span className="knowledge-category">{note.category}</span>
        <h1>{note.title}</h1>
        <p className="knowledge-muted">
          更新于 {new Date(note.updatedAt).toLocaleString()} · 版本 {note.version}
        </p>
        <NoteContent className={base === DESKTOP_NOTES_PATH ? "knowledge-body vp-doc" : "knowledge-body"} text={note.body} />
        {note.examples && (
          <section>
            <h2>例句与解释</h2>
            <NoteContent className={base === DESKTOP_NOTES_PATH ? "vp-doc" : ""} text={note.examples} />
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
      </article>); }
export function KnowledgeNotesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const [foldersOpen,setFoldersOpen] = useState(false);
  const [focus,setFocus] = useState(false);
  const base = location.pathname.startsWith("/mobile")
    ? MOBILE_NOTES_PATH
    : DESKTOP_NOTES_PATH;
  const segments = location.pathname
    .slice(base.length)
    .split("/")
    .filter(Boolean);
  const browsing = segments.length === 0;
  useEffect(() => {
    // A new document gets the reading space; toggles remain local to that route.
    setFocus(location.pathname !== base && location.pathname !== `${base}/`);
    setFoldersOpen(false);
  }, [location.pathname, base]);
  const isNew = segments[0] === "new";
  const id = Number(segments[0]);
  const editing = segments[1] === "edit";
  const copyWord = Number(params.get("copyWord"));
  const page = Number(params.get("page") ?? 1);
  const wordId = Number(params.get("wordId"));
  const folderParam = params.get("folderId");
  const filters: NoteFilters = {
    folderId: folderParam === "unfiled" ? "unfiled" : folderParam && /^[1-9]\d*$/.test(folderParam) && Number.isSafeInteger(Number(folderParam)) ? Number(folderParam) : undefined,
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
  if (base === DESKTOP_NOTES_PATH) return <section className={`knowledge-notes knowledge-desktop${focus ? " is-focus" : ""}${foldersOpen ? " has-folders" : ""}${browsing ? " is-browsing" : ""}`} aria-label="知识笔记">
    <header className="knowledge-workspace-header"><h1>知识笔记</h1><div><button aria-expanded={foldersOpen} onClick={()=>{setFoldersOpen(v=>!v);setFocus(false);}}>{foldersOpen?"收起文件夹":"文件夹"}</button>{!browsing && <button aria-expanded={!focus} onClick={()=>{setFocus(v=>!v);setFoldersOpen(false);}}>{focus?"展开笔记列表":"全宽阅读"}</button>}<Link className="knowledge-primary" to={`${base}/new${listSearch}`}>＋ 新建笔记</Link></div></header>
    <div className="knowledge-workspace-columns"><aside className="knowledge-list-pane" aria-label="笔记浏览" hidden={focus}><NoteList base={base} filters={filters} listSearch={listSearch} foldersOpen={foldersOpen} embedded/></aside><main className="knowledge-reader-pane" hidden={browsing} key={isNew?"new":`${id}-${editing}`} aria-label="笔记阅读区">{segments.length ? content : <div className="knowledge-reader-empty"><h2>选择一篇笔记开始阅读</h2><p>正文、例句、来源与关联词条会完整显示在这里。</p><Link to={`${base}/new${listSearch}`}>创建笔记</Link></div>}</main></div>
  </section>;
  return (
    <section
      aria-label="知识笔记"
      className={`knowledge-notes${base === MOBILE_NOTES_PATH ? " knowledge-notes-mobile" : ""}`}
    >
      {content}
    </section>
  );
}
