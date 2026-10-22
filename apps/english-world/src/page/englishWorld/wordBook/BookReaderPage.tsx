import { useCallback, useEffect, useRef, useState } from "react";
import { getApiBaseUrl } from "@font/api";
import printStyleUrl from "./bookPrint.css?url";
import { Link, useParams } from "react-router-dom";
import { booksApi, bookError, type Book } from "./api";
import { BookContent } from "./BookContent";
import "./wordBook.css";
export default function BookReaderPage() {
  const { id = "" } = useParams();
  return <BookReader key={id} id={id} />;
}
function BookReader({ id }: { id: string }) {
  const [book, setBook] = useState<Book>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");
  const [toc, setToc] = useState(false);
  const [size, setSize] = useState(1);
  const [sync, setSync] = useState("");
  const pending = useRef<Book["progress"] | undefined>(undefined);
  const saving = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  const loadSequence = useRef(0);
  const restoring = useRef(true);
  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setError("");
    try {
      const data = await booksApi.get(id);
      if (sequence !== loadSequence.current || !mounted.current) return;
      try {
        const raw = localStorage.getItem(`book-pending:${id}`);
        if (raw) {
          const progress = JSON.parse(raw);
          const group = data.groups.find((g) => g.id === progress.groupId);
          if (
            group &&
            (progress.wordId === undefined ||
              group.wordIds.includes(progress.wordId))
          ) {
            data.progress = progress;
            pending.current = progress;
            setSync("进度尚未同步");
          } else localStorage.removeItem(`book-pending:${id}`);
        }
      } catch {}
      setBook(data);
      setActive(data.progress?.groupId || data.groups[0]?.id || "");
      try {
        const raw = localStorage.getItem(`book-size:${id}`);
        const stored = Number(raw);
        if (
          raw !== null &&
          Number.isInteger(stored) &&
          stored >= 0 &&
          stored <= 2
        )
          setSize(stored);
      } catch {}
      restoring.current = true;
      setTimeout(() => {
        if (sequence !== loadSequence.current) return;
        const node = data.progress?.wordId
          ? document.getElementById(`word-${data.progress.wordId}`)
          : document.getElementById(`group-${data.progress?.groupId}`);
        node?.scrollIntoView?.({ block: "start" });
        restoring.current = false;
      }, 100);
    } catch (e) {
      if (mounted.current && sequence === loadSequence.current)
        setError(bookError(e));
    } finally {
      if (mounted.current && sequence === loadSequence.current)
        setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
      loadSequence.current++;
      clearTimeout(timer.current);
    };
  }, [load]);
  const flush = useCallback(async () => {
    if (saving.current || !pending.current) return;
    saving.current = true;
    const value = pending.current;
    try {
      await booksApi.update(id, { progress: value });
      if (pending.current === value) {
        pending.current = undefined;
        try {
          localStorage.removeItem(`book-pending:${id}`);
        } catch {}
      }
      if (mounted.current)
        setSync(pending.current ? "正在保存…" : "进度已保存");
    } catch {
      if (mounted.current) setSync("进度尚未同步");
    } finally {
      saving.current = false;
      if (pending.current && pending.current !== value) {
        clearTimeout(timer.current);
        timer.current = setTimeout(() => void flush(), 300);
      }
    }
  }, [id]);
  useEffect(() => {
    const lastChance = () => {
      const progress = pending.current;
      if (!progress || saving.current) return;
      void fetch(`${getApiBaseUrl()}/word-books/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        body: JSON.stringify({ progress }),
      }).catch(() => undefined);
    };
    window.addEventListener("pagehide", lastChance);
    return () => {
      window.removeEventListener("pagehide", lastChance);
      void flush();
    };
  }, [id, flush]);
  const remember = useCallback(
    (groupId: string, wordId?: number) => {
      if (restoring.current) return;
      setActive(groupId);
      pending.current = { groupId, ...(wordId ? { wordId } : {}) };
      try {
        localStorage.setItem(
          `book-pending:${id}`,
          JSON.stringify(pending.current),
        );
      } catch {}
      setSync("正在保存…");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 600);
    },
    [flush, id],
  );
  useEffect(() => {
    if (book && pending.current) void flush();
  }, [book, flush]);
  useEffect(() => {
    const retry = () => void flush();
    window.addEventListener("online", retry);
    const interval = setInterval(retry, 15000);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(interval);
    };
  }, [flush]);
  useEffect(() => {
    if (!book || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (restoring.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (!visible.length) return;
        const wordId = Number(visible[0].target.id.replace("word-", ""));
        const group = book.groups.find((g) => g.wordIds.includes(wordId));
        if (group) remember(group.id, wordId);
      },
      { rootMargin: "-70px 0px -65% 0px", threshold: 0 },
    );
    document
      .querySelectorAll(".book-screen .book-entry")
      .forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, [book, remember]);
  useEffect(() => {
    if (!book) return;
    document.body.classList.add("word-book-reading");
    const before = document.title;
    document.title = book.title;
    return () => {
      document.body.classList.remove("word-book-reading");
      document.title = before;
    };
  }, [book]);
  function jump(groupId: string, wordId?: number) {
    restoring.current = false;
    remember(groupId, wordId);
    document
      .getElementById(wordId ? `word-${wordId}` : `group-${groupId}`)
      ?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    setToc(false);
  }
  function changeSize(next: number) {
    setSize(next);
    try {
      localStorage.setItem(`book-size:${id}`, String(next));
    } catch {}
  }
  if (loading)
    return (
      <div className="book-reader-state" role="status">
        正在打开复习手册…
      </div>
    );
  if (error || !book)
    return (
      <div className="book-reader-state">
        <p role="alert">{error || "复习手册不存在"}</p>
        <button onClick={() => void load()}>重试</button>
        <Link to="/englishWorld/word-books">返回复习手册</Link>
      </div>
    );
  const index = Math.max(
    0,
    book.groups.findIndex((g) => g.id === active),
  );
  const needle = q.trim().toLowerCase();
  const matches = book.words.filter(
    (w) => needle && w.englishWord.toLowerCase().includes(needle),
  );
  return (
    <div className={`book-reader book-size-${size}`}>
      <link rel="stylesheet" href={printStyleUrl} media="print" />
      <header className="book-reader-toolbar">
        <Link to="/englishWorld/word-books" onClick={() => void flush()}>
          〈 复习手册
        </Link>
        <strong>{book.title}</strong>
        <div>
          <button className="book-toc-toggle" onClick={() => setToc(!toc)}>
            目录
          </button>
          <button
            aria-label="缩小字号"
            disabled={size === 0}
            onClick={() => changeSize(size - 1)}
          >
            A−
          </button>
          <button
            aria-label="放大字号"
            disabled={size === 2}
            onClick={() => changeSize(size + 1)}
          >
            A＋
          </button>
          <button className="book-print-button" onClick={() => window.print()}>
            打印 / PDF
          </button>
        </div>
      </header>
      <div className="book-reader-layout">
        <aside className={`book-toc ${toc ? "book-toc-open" : ""}`}>
          <h2>目录</h2>
          <input
            aria-label="搜索单词或知识点"
            placeholder="搜索单词或知识点"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <p>
            {book.wordCount} 词 · {book.groups.length} 个小节
          </p>
          <nav aria-label="复习手册目录">
            {book.groups
              .filter((g) => !needle || g.title.toLowerCase().includes(needle))
              .map((g) => (
                <button
                  key={g.id}
                  aria-current={active === g.id ? "location" : undefined}
                  onClick={() => jump(g.id)}
                >
                  <span>
                    {String(book.groups.indexOf(g) + 1).padStart(2, "0")}
                  </span>
                  {g.title}
                  <small>{g.wordIds.length}</small>
                </button>
              ))}
            {matches.map((w) => (
              <button
                key={`word-${w.id}`}
                onClick={() => {
                  const g = book.groups.find((x) => x.wordIds.includes(w.id));
                  if (g) jump(g.id, w.id);
                }}
              >
                {w.englishWord}
                <small>定位词条</small>
              </button>
            ))}
            {needle &&
              !matches.length &&
              !book.groups.some((g) =>
                g.title.toLowerCase().includes(needle),
              ) && <p>没有匹配结果</p>}
          </nav>
          <small className="book-snapshot-note">
            内容保存于制作时
            <br />
            {book.mode === "basic"
              ? "基础速览 · 未进行知识提炼"
              : "依据所选词条与笔记整理"}
          </small>
        </aside>
        <main className="book-screen">
          <div className="book-reading-intro">
            <span>PERSONAL REVIEW HANDBOOK</span>
            <h1>{book.title}</h1>
            <p>核心词义 · 知识要点 · 关联辨析</p>
            {book.mode === "basic" && (
              <p>基础速览版：原有词义与笔记摘录，未进行知识分组整理。</p>
            )}
          </div>
          <BookContent
            title={book.title}
            groups={book.groups}
            words={book.words}
            activeId={active}
            onRead={remember}
          />
          <footer className="book-reader-bottom">
            <button
              disabled={index === 0}
              onClick={() => jump(book.groups[index - 1].id)}
            >
              ← 上一节
            </button>
            <span>
              第 {index + 1} / {book.groups.length} 节
            </span>
            <button
              disabled={index === book.groups.length - 1}
              onClick={() => jump(book.groups[index + 1].id)}
            >
              下一节 →
            </button>
            <span className="book-sync" role="status">
              {sync}
              {sync === "进度尚未同步" && (
                <button onClick={() => void flush()}>重试</button>
              )}
            </span>
          </footer>
        </main>
      </div>
      <div className="book-print-only">
        <BookContent
          title={book.title}
          words={book.words}
          groups={book.groups}
          print
        />
      </div>
    </div>
  );
}
