import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  readMaterial,
  sourceUrl,
  uploadSource,
  requestId,
  readVersions,
} from "./api";
import type { Material, Paragraph, ParagraphRole } from "./types";
import { useReadingPersistence } from "./useReadingPersistence";
export default function ImportReview({
  material: m,
  onChange,
}: {
  material: Material;
  onChange: (m: Material) => void;
}) {
  const navigate = useNavigate();
  const [title, setTitle] = useState(m.title),
    [paragraphs, setParagraphs] = useState<Paragraph[]>(m.paragraphs),
    [sources, setSources] = useState(m.sources || []),
    [selected, setSelected] = useState(m.sources?.[0]?.id || ""),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState(""),
    [history, setHistory] = useState<Awaited<ReturnType<typeof readVersions>>>(
      [],
    );
  const persist = useReadingPersistence(m, onChange);
  const busy = uploading || persist.busy;
  const latest = useRef(m);
  latest.current = m;
  useEffect(() => {
    if (m.status !== "processing") return;
    let active = true;
    const timer = setInterval(() => {
      readMaterial(m.id)
        .then((next) => {
          if (!active) return;
          onChange(next);
          if (next.status === "review") {
            setTitle(next.title);
            setParagraphs(next.paragraphs);
          }
        })
        .catch((e) => active && setError(e.message || "状态读取失败"));
    }, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [m.id, m.status, onChange]);
  const pendingFiles = useRef(new Map<string, File>());
  const missingUploads = (m.uploadPlan || []).filter(
    (u) => !sources.some((s) => s.uploadKey === u.key),
  );
  async function sendFiles(entries: { key: string; file: File }[]) {
    setUploading(true);
    setError("");
    try {
      for (const { key, file } of entries) {
        const source = await uploadSource(m.id, file, key);
        setSources((s) =>
          s.some((x) => x.id === source.id) ? s : [...s, source],
        );
        setSelected((s) => s || source.id);
        pendingFiles.current.delete(key);
      }
    } catch (e) {
      setError(
        (e as Error).message ||
          "上传失败；请重试剩余文件，未全部上传前不能开始识别",
      );
    } finally {
      setUploading(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const plan = [...(latest.current.uploadPlan || [])];
    const assigned = new Set<string>();
    const entries = Array.from(files).map((file) => {
      let item = plan.find(
        (u) =>
          !assigned.has(u.key) &&
          !sources.some((s) => s.uploadKey === u.key) &&
          u.name === file.name &&
          u.size === file.size,
      );
      if (!item) {
        item = { key: requestId(), name: file.name, size: file.size };
        plan.push(item);
      }
      assigned.add(item.key);
      pendingFiles.current.set(item.key, file);
      return { key: item.key, file };
    });
    if (
      plan.length > 20 ||
      plan.reduce((n, f) => n + f.size, 0) > 100 * 1024 * 1024 ||
      plan.some((f) => f.size > 20 * 1024 * 1024)
    ) {
      setError("最多20个文件，单文件20MiB，合计100MiB");
      return;
    }
    setUploading(true);
    const next = await persist.perform("upload-plan", { uploads: plan });
    setUploading(false);
    if (next) await sendFiles(entries);
  }
  async function start(retry = false) {
    if (!retry && missingUploads.length) {
      setError("仍有文件未上传完成，请补传后再开始");
      return;
    }
    setError("");
    const next = await persist.perform(retry ? "import/retry" : "import", {
      sourceIds: sources.map((s) => s.id),
    });
    if (next) {
      persist.setDirty(false);
      onChange({ ...next, sources });
    }
  }
  async function confirm() {
    const result = await persist.perform("versions", { title, paragraphs });
    if (result) {
      persist.setDirty(false);
      navigate(`/englishWorld/intensive-reading/${m.id}`);
    }
  }
  function move(i: number, d: number) {
    setSources((s) => {
      const next = [...s];
      [next[i], next[i + d]] = [next[i + d], next[i]];
      return next;
    });
  }
  return (
    <section className="ir-review">
      <div className="ir-review-heading">
        <div>
          <div className="ir-eyebrow">IMPORT & REVIEW</div>
          <h1>
            {m.status === "uploading"
              ? "导入精读材料"
              : m.status === "ready"
                ? "修订正文"
                : "确认原文"}
          </h1>
          <p>对照原件修正识别内容，保留每一句原文。</p>
        </div>
        <button
          disabled={busy}
          onClick={() => navigate("/englishWorld/intensive-reading")}
        >
          返回材料库
        </button>
      </div>
      {(error || persist.error) && (
        <div className="ir-error" role="alert">
          {error || persist.error}
          {persist.error && (
            <>
              <button disabled={busy} onClick={() => void persist.retry()}>
                重试保存
              </button>
              <button
                onClick={async () => {
                  const next = await readMaterial(m.id);
                  onChange(next);
                  persist.discardPending();
                }}
              >
                载入最新版本（保留本地编辑）
              </button>
            </>
          )}
        </div>
      )}
      {m.status === "uploading" ? (
        <>
          <div className="ir-drop">
            <label>
              选择 PDF 或照片
              <input
                type="file"
                multiple
                accept="application/pdf,image/png,image/jpeg,image/webp"
                disabled={busy}
                onChange={(e) => {
                  void upload(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
            <small>
              单文件20MiB，PDF20页，图片2500万像素；最多20个文件，共100MiB。
            </small>
          </div>
          <div>
            {sources.map((s, i) => (
              <div className="ir-file-row" key={s.id}>
                <span>
                  {i + 1}. {s.name} · {s.pages}页
                </span>
                <button disabled={i === 0 || busy} onClick={() => move(i, -1)}>
                  上移
                </button>
                <button
                  disabled={i === sources.length - 1 || busy}
                  onClick={() => move(i, 1)}
                >
                  下移
                </button>
              </div>
            ))}
          </div>
          {missingUploads.length > 0 && (
            <div className="ir-warning">
              仍有 {missingUploads.length} 个文件待上传：
              {missingUploads.map((u) => u.name).join("、")}
              <button
                disabled={
                  busy ||
                  !!persist.error ||
                  missingUploads.some((u) => !pendingFiles.current.has(u.key))
                }
                onClick={() =>
                  void sendFiles(
                    missingUploads.map((u) => ({
                      key: u.key,
                      file: pendingFiles.current.get(u.key)!,
                    })),
                  )
                }
              >
                重试剩余上传
              </button>
              <p>刷新页面后，请重新选择上述文件以补传。</p>
            </div>
          )}
          <div className="ir-actions">
            <span>
              {uploading
                ? "正在上传，请稍候…"
                : `已上传 ${sources.length} 个文件`}
            </span>
            <button
              className="ir-primary"
              disabled={
                busy ||
                !sources.length ||
                !!persist.error ||
                missingUploads.length > 0
              }
              onClick={() => void start()}
            >
              开始识别原文 →
            </button>
          </div>
        </>
      ) : m.status === "processing" || m.status === "failed" ? (
        <div className="ir-processing">
          <h2>
            {m.status === "processing" ? "正在整理原文…" : "识别暂未完成"}
          </h2>
          <p>
            已处理 {m.job?.results.length || 0} / {m.job?.pages.length || 0}{" "}
            页，刷新后可继续查看。
          </p>
          {m.job?.error && <p role="alert">{m.job.error}</p>}
          {m.status === "failed" && (
            <button
              className="ir-primary"
              disabled={busy || !!persist.error}
              onClick={() => void start(true)}
            >
              保留进度并重试
            </button>
          )}
          <div>
            {sources.map((s) => (
              <p key={s.id}>
                <a
                  href={sourceUrl(m.id, s.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  查看原件：{s.name}
                </a>
              </p>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="ir-review-columns">
            <section className="ir-original">
              <h3>原始材料</h3>
              {m.sourceType === "text" ? (
                <pre>{m.originalText}</pre>
              ) : (
                <>
                  <select
                    aria-label="原始文件"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                  >
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {sources.find((s) => s.id === selected)?.mime ===
                  "application/pdf" ? (
                    <iframe title="PDF原件" src={sourceUrl(m.id, selected)} />
                  ) : selected ? (
                    <img alt="上传的原始照片" src={sourceUrl(m.id, selected)} />
                  ) : null}
                </>
              )}
            </section>
            <section className="ir-review-text">
              <h3>原文与内容归属</h3>
              <p className="ir-muted">正文与真实小标题进入阅读区；题目、作答说明和答案收入默认收起的附带练习。归属不确定时请对照原件调整，原句不会自动改写。</p>
              {m.uncertainties?.length > 0 && (
                <div className="ir-warning">
                  请重点核对：
                  {m.uncertainties.map((t, i) => (
                    <p key={i}>{t}</p>
                  ))}
                </div>
              )}
              <label>
                文章标题
                <input
                  aria-label="文章标题"
                  maxLength={200}
                  disabled={busy}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    persist.setDirty(true);
                  }}
                />
              </label>
              {paragraphs.map((p, i) => (
                <div className="ir-paragraph-edit" key={p.id}>
                  <div>
                    <small>内容 {i + 1}</small>
                    <select aria-label={`内容归属 ${i + 1}`} value={p.role || "body"} disabled={busy}
                      onChange={e => { const role = e.target.value as ParagraphRole; setParagraphs(ps => ps.map(x => x.id === p.id ? {...x, role} : x)); persist.setDirty(true); }}>
                      <option value="body">文章正文</option>
                      <option value="heading">文章小标题</option>
                      <option value="exercise">附带题目</option>
                      <option value="instruction">作答说明</option>
                      <option value="answer">参考答案</option>
                    </select>
                    <button
                      disabled={busy}
                      onClick={() => {
                        setParagraphs((ps) => ps.filter((x) => x.id !== p.id));
                        persist.setDirty(true);
                      }}
                    >
                      删除段落
                    </button>
                    {i > 0 && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          setParagraphs((ps) => {
                            const a = [...ps];
                            [a[i], a[i - 1]] = [a[i - 1], a[i]];
                            return a;
                          });
                          persist.setDirty(true);
                        }}
                      >
                        上移
                      </button>
                    )}
                  </div>
                  <textarea
                    aria-label={`段落 ${i + 1}`}
                    disabled={busy}
                    value={p.text}
                    onChange={(e) => {
                      setParagraphs((ps) =>
                        ps.map((x) =>
                          x.id === p.id ? { ...x, text: e.target.value } : x,
                        ),
                      );
                      persist.setDirty(true);
                    }}
                  />
                </div>
              ))}
              <button
                disabled={busy}
                onClick={() => {
                  setParagraphs((ps) => [...ps, { id: requestId(), text: "" }]);
                  persist.setDirty(true);
                }}
              >
                ＋ 添加段落
              </button>
            </section>
          </div>
          <div className="ir-review-footer">
            <span>
              {m.status === "ready"
                ? "修订后保留旧版本，变更段落的标注需重新确认。"
                : "核对原文后即可开始高亮和批注。"}
            </span>
            <button
              className="ir-primary"
              disabled={
                busy ||
                !!persist.error ||
                !title.trim() ||
                !paragraphs.length ||
                paragraphs.some((p) => !p.text.trim())
              }
              onClick={() => void confirm()}
            >
              确认正文，开始精读 →
            </button>
          </div>
        </>
      )}
      {m.status === "ready" && (
        <div className="ir-history">
          <button
            onClick={() =>
              void readVersions(m.id)
                .then(setHistory)
                .catch((e) => setError(e.message))
            }
          >
            查看历史正文与笔记
          </button>
          {history.map((v) => (
            <details key={v.id}>
              <summary>
                {new Date(v.createdAt).toLocaleString("zh-CN")} ·{" "}
                {v.snapshot.title}
              </summary>
              {v.snapshot.paragraphs.map((p) => (
                <p key={p.id}>{p.text}</p>
              ))}
              {v.snapshot.annotations.map((a) => (
                <blockquote key={a.id}>
                  {a.quote}
                  <p>{a.note}</p>
                </blockquote>
              ))}
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
