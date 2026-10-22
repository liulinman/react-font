import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createMaterial, listMaterials, requestId } from "./api";
import type { Material } from "./types";
export const statusLabel = {
  uploading: "等待上传",
  processing: "正在识别",
  failed: "识别失败",
  review: "待校对",
  ready: "继续精读",
};
export default function MaterialLibrary() {
  const navigate = useNavigate();
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [rows, setRows] = useState<
      Pick<Material, "id" | "title" | "status" | "sourceType" | "updatedAt">[]
    >([]),
    [open, setOpen] = useState(false),
    [sourceType, setType] = useState<"text" | "file">("file"),
    [title, setTitle] = useState(""),
    [text, setText] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [createId, setCreateId] = useState(requestId);
  useEffect(() => {
    let active = true;
    setError("");
    listMaterials(q, page)
      .then((r) => {
        if (active) {
          setRows(r.list);
          setTotal(r.total);
        }
      })
      .catch((e) => active && setError(e.message || "材料加载失败"));
    return () => {
      active = false;
    };
  }, [q, page]);
  async function create() {
    setBusy(true);
    setError("");
    try {
      const m = await createMaterial({
        title: title || "未命名精读",
        sourceType,
        text,
        requestId: createId,
      });
      navigate(`/englishWorld/intensive-reading/${m.id}/review`);
    } catch (e) {
      setError((e as Error).message || "创建失败");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ir-library">
      <div className="ir-library-head">
        <div>
          <div className="ir-eyebrow">READ CLOSELY · THINK DEEPLY</div>
          <h1>我的精读</h1>
          <p>把理解留在原文旁边。</p>
        </div>
        <button
          className="ir-primary"
          onClick={() => {
            setCreateId(requestId());
            setOpen(true);
          }}
        >
          ＋ 导入材料
        </button>
      </div>
      <input
        className="ir-search"
        aria-label="搜索精读材料"
        placeholder="搜索文章标题"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
      />
      {error && (
        <div role="alert" className="ir-error">
          {error}
        </div>
      )}
      <div className="ir-material-grid">
        {rows.map((m) => (
          <button
            className="ir-material"
            key={m.id}
            onClick={() =>
              navigate(
                `/englishWorld/intensive-reading/${m.id}${m.status === "ready" ? "" : "/review"}`,
              )
            }
          >
            <small>{m.sourceType === "file" ? "PDF / 照片" : "文章"}</small>
            <h2>{m.title}</h2>
            <p>{new Date(m.updatedAt).toLocaleString("zh-CN")}</p>
            <span>{statusLabel[m.status]} →</span>
          </button>
        ))}
      </div>
      {!rows.length && (
        <div className="ir-empty">还没有精读材料，导入一篇文章开始。</div>
      )}
      <div className="ir-actions">
        <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
          上一页
        </button>
        <span>
          第 {page} 页 · 共 {total} 篇
        </span>
        <button
          disabled={page * 20 >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          下一页
        </button>
      </div>
      {open && (
        <div className="ir-modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="导入精读材料"
            className="ir-modal"
          >
            <h2>导入精读材料</h2>
            <p>整理排版，保留原文措辞。</p>
            <div className="ir-actions">
              <button
                className={sourceType === "file" ? "ir-selected" : ""}
                onClick={() => setType("file")}
              >
                PDF / 照片
              </button>
              <button
                className={sourceType === "text" ? "ir-selected" : ""}
                onClick={() => setType("text")}
              >
                粘贴文章
              </button>
            </div>
            <label>
              文章标题
              <input
                maxLength={200}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setCreateId(requestId());
                }}
                placeholder="可以在校对时修改"
              />
            </label>
            {sourceType === "text" ? (
              <label>
                文章原文
                <textarea
                  maxLength={100000}
                  rows={10}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setCreateId(requestId());
                  }}
                  placeholder="粘贴原文，空行分段"
                />
              </label>
            ) : (
              <div className="ir-drop">
                下一步上传 PDF 或照片
                <br />
                <small>单文件20MiB · PDF20页 · 最多20文件，共100MiB</small>
              </div>
            )}
            {error && <p role="alert">{error}</p>}
            <div className="ir-actions">
              <button disabled={busy} onClick={() => setOpen(false)}>
                取消
              </button>
              <button
                className="ir-primary"
                disabled={busy || (sourceType === "text" && !text.trim())}
                onClick={() => void create()}
              >
                {busy
                  ? "正在创建…"
                  : sourceType === "text"
                    ? "整理并校对 →"
                    : "选择文件 →"}
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
