import { useEffect, useRef, useState } from "react";
import { Modal } from "antd";
import {
  booksApi,
  waitForBookJob,
  type BookJob,
  bookError,
  type BookGroup,
  type BookPreview,
  type BookScope,
} from "./api";
import { newRequestId } from "../knowledgeNotes/api";
import { BookContent } from "./BookContent";
import "./wordBook.css";
export function WordBookCreate({
  ids = [],
  filters = {},
  onClose,
  onCreated,
}: {
  ids?: number[];
  filters?: Record<string, unknown>;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [scope, setScope] = useState<BookScope>(
    ids.length ? "selected" : Object.keys(filters).length ? "filtered" : "all",
  );
  const [title, setTitle] = useState(
    `我的复习手册 ${new Date().toLocaleDateString("sv-SE")}`,
  );
  const [counts, setCounts] = useState<{
    selected: number;
    filtered: number;
    all: number;
  }>();
  const [previousJob, setPreviousJob] = useState<BookJob | null>(null);
  const controller = useRef<AbortController | undefined>(undefined);
  const [preview, setPreview] = useState<BookPreview>();
  const [activeGroupId, setActiveGroupId] = useState("");
  const [editorPage, setEditorPage] = useState(1);
  const [groups, setGroups] = useState<BookGroup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [countError, setCountError] = useState("");
  const [slow, setSlow] = useState(false);
  const [requestId, setRequestId] = useState(newRequestId);
  const alive = useRef(true);
  const lock = useRef(false);
  const source = JSON.stringify({ ids, filters });
  const loadCounts = () => {
    setCountError("");
    void booksApi
      .counts(JSON.parse(source))
      .then((data) => {
        if (alive.current) setCounts(data);
      })
      .catch((e) => {
        if (alive.current) setCountError(bookError(e));
      });
  };
  useEffect(() => {
    alive.current = true;
    loadCounts();
    void booksApi
      .currentJob()
      .then((job) => {
        if (alive.current && job?.status !== "failed") setPreviousJob(job);
      })
      .catch(() => undefined);
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, [source]);
  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 30000);
    return () => clearTimeout(timer);
  }, [busy]);
  async function generate(mode: "organized" | "basic") {
    if (lock.current || !counts) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      controller.current = new AbortController();
      const data = await booksApi.preview(
        {
          scope,
          ids: scope === "selected" ? ids : undefined,
          filters: scope === "filtered" ? filters : undefined,
          mode,
          expectedCount: counts[scope],
        },
        controller.current.signal,
      );
      if (alive.current) {
        setPreview(data);
        setGroups(data.groups);
        setRequestId(newRequestId());
      }
    } catch (e) {
      if (alive.current) {
        if ((e as { savedBookId?: string })?.savedBookId) {
          onCreated((e as { savedBookId: string }).savedBookId);
          return;
        }
        setError(bookError(e));
        loadCounts();
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function resume() {
    if (!previousJob || lock.current) return;
    if (previousJob.savedBookId) {
      onCreated(previousJob.savedBookId);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    try {
      const data = await waitForBookJob(
        previousJob.jobId,
        controller.current.signal,
      );
      if (alive.current) {
        setPreview(data);
        setGroups(data.groups);
        setRequestId(newRequestId());
        setPreviousJob(null);
      }
    } catch (e) {
      if (alive.current) {
        if ((e as { savedBookId?: string })?.savedBookId) {
          onCreated((e as { savedBookId: string }).savedBookId);
          return;
        }
        setError(bookError(e));
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (lock.current || !preview || !title.trim()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const book = await booksApi.create({
        requestId,
        title: title.trim(),
        previewId: preview.previewId,
        groups: groups.filter((g) => g.wordIds.length),
      });
      if (alive.current) onCreated(book.id);
    } catch (e) {
      if (alive.current) setError(bookError(e));
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const changeGroups = (next: BookGroup[]) => {
    setGroups(next);
    setRequestId(newRequestId());
  };
  const move = (id: number, target: string) =>
    changeGroups(
      groups.map((g) => ({
        ...g,
        wordIds:
          g.id === target
            ? [...g.wordIds.filter((v) => v !== id), id]
            : g.wordIds.filter((v) => v !== id),
        notes: [],
      })),
    );
  const activeGroup = groups.find((g) => g.id === activeGroupId) ?? groups[0];
  const editPages = Math.max(
    1,
    Math.ceil((activeGroup?.wordIds.length ?? 0) / 50),
  );
  const editPage = Math.min(editorPage, editPages);
  const visibleIds =
    activeGroup?.wordIds.slice((editPage - 1) * 50, editPage * 50) ?? [];
  return (
    <Modal
      open
      title={preview ? "预览与整理复习手册" : "制作复习手册"}
      width={preview ? 1120 : 580}
      footer={null}
      onCancel={onClose}
      maskClosable={!busy}
      className="book-create-modal"
    >
      <div className="book-create">
        {previousJob && !preview && (
          <p className="book-create-note">
            有一份上次的整理
            {previousJob.status === "pending" ? "仍在进行" : "结果可用"}。
            <button disabled={busy} onClick={() => void resume()}>
              查看上次整理
            </button>
          </p>
        )}
        <label className="book-field">
          复习手册名称
          <input
            maxLength={60}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setRequestId(newRequestId());
            }}
            disabled={busy}
          />
        </label>
        {!preview ? (
          <>
            <p className="book-muted">
              把已有单词与笔记整理成便于速读、可打印的知识讲义。
            </p>
            <fieldset disabled={busy} className="book-scope">
              <legend>选择内容范围</legend>
              {(
                [
                  ["selected", "选中单词"],
                  ["filtered", "当前筛选结果"],
                  ["all", "全部单词"],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="book-scope"
                    checked={scope === value}
                    disabled={!counts || counts[value] === 0}
                    onChange={() => setScope(value)}
                  />
                  <span>{label}</span>
                  <b>{counts ? `${counts[value]} 个` : "加载中…"}</b>
                </label>
              ))}
            </fieldset>
            <p className="book-muted">
              {scope === "selected"
                ? "仅包含已勾选的有效词条。"
                : scope === "filtered"
                  ? Object.keys(filters).length
                    ? `已应用条件：${Object.entries(filters)
                        .map(([k, v]) => `${filterLabel[k] || k}：${String(v)}`)
                        .join("；")}。包含全部分页。`
                    : "未设置筛选，与全部单词相同。"
                  : "忽略当前筛选与勾选，使用完整词库。"}
            </p>
            {countError && (
              <div role="alert">
                {countError} <button onClick={loadCounts}>重新加载数量</button>
              </div>
            )}
            <p className="book-create-note">
              按知识关系归组，保留全部选词。你可以在预览时改组名、调整归属；内容不足时不会编造知识。
            </p>
          </>
        ) : (
          <>
            <p className="book-muted">
              共 {preview.wordCount} 词 ·{" "}
              {groups.filter((g) => g.wordIds.length).length} 个小节 ·{" "}
              {preview.mode === "basic"
                ? "基础速览（未进行知识提炼）"
                : "知识整理版"}
              。点击归属选择可移动词条。
            </p>
            <div className="book-preview-layout">
              <div className="book-group-editor">
                {groups.map((g, i) => (
                  <div className="book-edit-group" key={g.id}>
                    <label>
                      小节 {i + 1}
                      <input
                        aria-label={`小节 ${i + 1} 名称`}
                        maxLength={60}
                        disabled={busy}
                        value={g.title}
                        onChange={(e) =>
                          changeGroups(
                            groups.map((x) =>
                              x.id === g.id
                                ? { ...x, title: e.target.value }
                                : x,
                            ),
                          )
                        }
                      />
                    </label>
                    <button
                      className="book-group-switch"
                      disabled={busy}
                      aria-pressed={activeGroup?.id === g.id}
                      onClick={() => {
                        setActiveGroupId(g.id);
                        setEditorPage(1);
                      }}
                    >
                      查看本节 · {g.wordIds.length} 词
                    </button>
                    {(g.id === activeGroup?.id ? visibleIds : []).map((id) => (
                      <label className="book-move" key={id}>
                        <span>
                          {preview.words.find((w) => w.id === id)?.englishWord}
                        </span>
                        <select
                          disabled={busy}
                          aria-label={`${preview.words.find((w) => w.id === id)?.englishWord} 的归属`}
                          value={g.id}
                          onChange={(e) => move(id, e.target.value)}
                        >
                          {groups.map((x) => (
                            <option key={x.id} value={x.id}>
                              {x.title || "未命名小节"}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </div>
                ))}
                <button
                  disabled={busy}
                  onClick={() =>
                    changeGroups([
                      ...groups,
                      { id: newRequestId(), title: "新小节", wordIds: [] },
                    ])
                  }
                >
                  ＋ 添加小节
                </button>
              </div>
              <div className="book-preview-paper">
                <div className="book-preview-paging">
                  <span>
                    预览当前小节 · 第 {editPage} / {editPages} 批（每批最多 50
                    词）
                  </span>
                  <div>
                    <button
                      aria-label="上一批词条"
                      disabled={editPage === 1}
                      onClick={() => setEditorPage(editPage - 1)}
                    >
                      上一批
                    </button>
                    <button
                      aria-label="下一批词条"
                      disabled={editPage === editPages}
                      onClick={() => setEditorPage(editPage + 1)}
                    >
                      下一批
                    </button>
                  </div>
                </div>
                <BookContent
                  title={title}
                  words={preview.words}
                  sectionNumbers={Object.fromEntries(
                    groups.map((g, i) => [g.id, i + 1]),
                  )}
                  groups={
                    activeGroup ? [{ ...activeGroup, wordIds: visibleIds }] : []
                  }
                />
              </div>
            </div>
          </>
        )}
        {error && (
          <div className="book-error" role="alert">
            {error}
          </div>
        )}
        {busy && (
          <p role="status">
            {slow
              ? "仍在后台整理，可以关闭窗口，稍后从制作入口查看上次整理。"
              : "正在处理，请稍候…"}
          </p>
        )}
        <div className="book-create-actions">
          <button
            disabled={busy}
            onClick={() => (preview ? setPreview(undefined) : onClose())}
          >
            {preview ? "返回调整范围" : "取消"}
          </button>
          {!preview && error && (
            <button
              disabled={busy || !counts || !counts[scope]}
              onClick={() => void generate("basic")}
            >
              改用基础速览
            </button>
          )}
          {!preview ? (
            <button
              className="book-primary"
              disabled={busy || !counts || !counts[scope] || !title.trim()}
              onClick={() => void generate("organized")}
            >
              {busy ? "整理中…" : "整理并预览"}
            </button>
          ) : (
            <button
              className="book-primary"
              disabled={
                busy ||
                !title.trim() ||
                groups.some((g) => g.wordIds.length && !g.title.trim())
              }
              onClick={() => void save()}
            >
              保存并阅读
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
const filterLabel: Record<string, string> = {
  englishWord: "单词",
  englishChinese: "释义",
  englishLevel: "熟练度",
  englishType: "类型",
  englishPhonetic: "音标",
  startTime: "开始时间",
  endTime: "结束时间",
};
