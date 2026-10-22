import { ReadingLearningRecords } from "./ReadingLearningRecords";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Modal } from "antd";
import request from "@font/api";
import { listPractices, setPracticeRemoved } from "./api";
import type { PracticeSummary } from "./types";

type Props = { basePath: string; embedded?: boolean };
export function ReadingPracticeList(props: Props) {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "removed" ? "removed" : "active";
  return <PracticeListView key={view} {...props} view={view} onViewChange={next => {
    const updated = new URLSearchParams(params);
    if (next === "removed") updated.set("view", next);
    else updated.delete("view");
    setParams(updated);
  }} />;
}
function PracticeListView({ basePath, embedded = false, view, onViewChange }: Props & {
  view: "active" | "removed"; onViewChange: (view: "active" | "removed") => void;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ list: PracticeSummary[]; total: number }>();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState<PracticeSummary>();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const actionLock = useRef(false);
  useEffect(() => {
    let active = true;
    void request(listPractices(page, view)).then(d => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(d.total / 12));
      if (page > lastPage) { setPage(lastPage); return; }
      setData(d); setError("");
    }).catch(() => { if (active) setError("练习加载失败，请联网后重试。"); });
    return () => { active = false; };
  }, [page, view, retry]);
  const changeVisibility = async (paper: PracticeSummary, removed: boolean) => {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setActionError("");
    try {
      await request(setPracticeRemoved(paper.id, removed));
      setPending(undefined);
      setNotice(removed ? "已从列表移除，学习记录仍会保留。可在“已移除”中恢复。" : "已恢复到练习列表。");
      setRetry(n => n + 1);
    } catch { setActionError("操作未完成，当前页面已保留。请重试或刷新确认。"); }
    finally { actionLock.current = false; setBusy(false); }
  };
  return (
    <main className="reading-practice">
      {!embedded && <header className="rp-heading"><h1>阅读练习</h1><p>选择练习开始作答，已完成的练习可查看解析。</p></header>}
      <div className="rp-list-toolbar" role="group" aria-label="练习列表范围">
        <button type="button" aria-pressed={view === "active"} onClick={() => onViewChange("active")} disabled={busy}>我的练习</button>
        <button type="button" aria-pressed={view === "removed"} onClick={() => onViewChange("removed")} disabled={busy}>已移除</button>
      </div>
      {view === "removed" && <p className="rp-list-help">这里的练习仅从你的列表移除，原题和学习记录仍保留，随时可以恢复。</p>}
      {notice && <p role="status">{notice}</p>}
      {actionError && !pending && <p role="alert">{actionError}</p>}
      {error && <p role="alert">{error}<button onClick={() => setRetry(n => n + 1)}>重试</button></p>}
      {!data && !error && <p role="status">正在加载…</p>}
      {data?.list.length === 0 && <div className="rp-empty">
        <h2>{view === "removed" ? "没有已移除的练习" : "还没有收到练习"}</h2>
        <p>{view === "removed" ? "从练习列表移除的文章会显示在这里。" : "新练习发布后，会显示在这里；移除过的练习可在“已移除”中恢复。"}</p>
      </div>}
      <ReadingLearningRecords basePath={basePath} />
      <div className="rp-grid">
        {data?.list.map(p => <article className="rp-card" key={p.id}>
          <span className={`rp-status ${p.submitted ? "is-done" : ""}`}>{p.submitted ? "已完成" : p.status === "withdrawn" ? "已撤回" : "待完成"}</span>
          <h2>{p.title}</h2>
          <p>{p.ieltsBand == null ? "原稿材料 · 难度未标定" : `生成配置难度 ${p.ieltsBand.toFixed(1)}（未校准）`} · {p.questionCount} 题</p>
          <div className="rp-card-actions">
            {p.submitted && <strong>{p.score === null ? "无法评分" : `${p.score} 分`}</strong>}
            <Link to={`${basePath}/${p.id}${p.submitted ? "/result" : ""}`}>{p.submitted ? "查看解析" : p.status === "withdrawn" ? "查看状态" : "开始练习"} →</Link>
            {view === "removed" ? <button type="button" aria-label={`恢复 ${p.title}`} disabled={busy} onClick={() => void changeVisibility(p, false)}>恢复</button>
              : <button type="button" aria-label={`移除 ${p.title}`} disabled={busy} onClick={() => { setActionError(""); setPending(p); }}>移除</button>}
          </div>
        </article>)}
      </div>
      {(data?.total ?? 0) > 12 && <nav className="rp-pagination" aria-label="练习分页">
        <button disabled={page === 1 || busy} onClick={() => setPage(p => p - 1)}>上一页</button><span>第 {page} 页</span>
        <button disabled={page * 12 >= (data?.total ?? 0) || busy} onClick={() => setPage(p => p + 1)}>下一页</button>
      </nav>}
      <Modal title="从我的列表移除" open={!!pending} okText="确认移除" cancelText="取消" confirmLoading={busy} closable={!busy} maskClosable={!busy} cancelButtonProps={{ disabled: busy }}
        onCancel={() => { if (!busy) setPending(undefined); }} onOk={() => pending && void changeVisibility(pending, true)}>
        <p>确认移除 <strong>{pending?.title}</strong>？</p>
        <p>从列表移除后，学习记录仍会保留。仅影响你自己的列表，可在“已移除”中恢复。</p>
        {actionError && <p role="alert">{actionError}</p>}
      </Modal>
    </main>
  );
}
