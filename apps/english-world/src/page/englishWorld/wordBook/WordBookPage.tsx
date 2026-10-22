import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Modal } from "antd";
import { booksApi, bookError, type BookSummary } from "./api";
import { WordBookCreate } from "./WordBookCreate";
import "./wordBook.css";
export default function WordBookPage() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [create, setCreate] = useState(false);
  const [rename, setRename] = useState<BookSummary>();
  const [name, setName] = useState("");
  const [remove, setRemove] = useState<BookSummary>();
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setBooks((await booksApi.list()).list);
    } catch (e) {
      setError(bookError(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function saveName() {
    if (!rename || !name.trim()) return;
    setBusy(true);
    try {
      await booksApi.update(rename.id, { title: name.trim() });
      setRename(undefined);
      await load();
    } catch (e) {
      setError(bookError(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteBook() {
    if (!remove) return;
    setBusy(true);
    try {
      await booksApi.remove(remove.id);
      setRemove(undefined);
      await load();
    } catch (e) {
      setError(bookError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="book-library">
      <header className="book-library-heading">
        <div>
          <span className="book-eyebrow">YOUR PERSONAL HANDBOOKS</span>
          <h1>复习手册</h1>
          <p>把积累的单词与知识，整理成随时能翻阅的讲义。</p>
        </div>
        <button className="book-primary" onClick={() => setCreate(true)}>
          ＋ 制作复习手册
        </button>
      </header>
      {error && (
        <div className="book-error" role="alert">
          {error} <button onClick={() => void load()}>重试</button>
        </div>
      )}
      {loading ? (
        <p role="status">正在加载复习手册…</p>
      ) : books.length ? (
        <div className="book-shelf">
          {books.map((book) => (
            <article className="book-cover" key={book.id}>
              <Link
                to={`/englishWorld/word-books/${book.id}`}
                className="book-cover-main"
              >
                <span className="book-eyebrow">ENGLISH WORLD</span>
                <h2>{book.title}</h2>
                <span>
                  {book.wordCount} 个词条 ·{" "}
                  {book.mode === "basic" ? "基础速览" : "知识整理"}
                </span>
                <div className="book-cover-rule" />
                <small>
                  {new Date(book.createdAt).toLocaleDateString("zh-CN")} 制作
                </small>
                <strong>继续阅读 →</strong>
              </Link>
              <div className="book-cover-actions">
                <button
                  onClick={() => {
                    setRename(book);
                    setName(book.title);
                  }}
                >
                  重命名
                </button>
                <button onClick={() => setRemove(book)}>删除</button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="book-empty">
          <span>书架还是空的</span>
          <h2>给已有知识一个清晰的顺序</h2>
          <p>从全部词库制作，或先到词库挑选单词、设置筛选条件。</p>
          <button onClick={() => setCreate(true)}>从全部单词开始</button>
          <Link to="/englishWorld/words">去词库选择</Link>
        </div>
      )}
      {create && (
        <WordBookCreate
          onClose={() => setCreate(false)}
          onCreated={(id) => {
            setCreate(false);
            navigate(`/englishWorld/word-books/${id}`);
          }}
        />
      )}
      <Modal
        open={!!rename}
        title="重命名复习手册"
        onCancel={() => !busy && setRename(undefined)}
        onOk={() => void saveName()}
        confirmLoading={busy}
        okButtonProps={{ disabled: !name.trim() }}
      >
        <label className="book-field">
          复习手册名称
          <input
            aria-label="新的复习手册名称"
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
      </Modal>
      <Modal
        open={!!remove}
        title="删除复习手册"
        onCancel={() => !busy && setRemove(undefined)}
        onOk={() => void deleteBook()}
        confirmLoading={busy}
        okText="删除"
        okButtonProps={{ danger: true }}
      >
        <p>删除“{remove?.title}”？这会移除该册及阅读位置，原词库不受影响。</p>
      </Modal>
    </div>
  );
}
