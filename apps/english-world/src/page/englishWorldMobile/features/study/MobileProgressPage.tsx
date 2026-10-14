import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import request from "@font/api";
import {
  getReciteHistory,
  type GetHistoryResponse,
} from "@/server/recite/recite";
import { useAuth } from "@/contexts/AuthContext";
import { useStudyStats } from "./useStudyStats";
import { StudyChrome } from "./StudyChrome";
export function MobileProgressPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const stats = useStudyStats();
  const history = useQuery({
    queryKey: ["mobile", "study-progress", user?.id, "history", page],
    queryFn: () =>
      request<GetHistoryResponse>(getReciteHistory({ page, pageSize: 10 })),
    retry: false,
  });
  return (
    <StudyChrome title="每一步，都算数" eyebrow="YOUR PROGRESS">
      <p className="study-muted">最近 7 天的默写记录，与网站同步。</p>
      <div className="study-metrics">
        <div>
          <strong>{stats.data?.statistics.totalCount ?? "—"}</strong>
          <span>练习词次</span>
        </div>
        <div>
          <strong>
            {stats.data
              ? `${Math.round(stats.data.statistics.accuracy)}%`
              : "—"}
          </strong>
          <span>正确率</span>
        </div>
        <div>
          <strong>{stats.data?.statistics.correctCount ?? "—"}</strong>
          <span>正确词次</span>
        </div>
      </div>
      {stats.isError && (
        <button onClick={() => void stats.refetch()}>
          统计加载失败，点此重试
        </button>
      )}
      <h2 className="study-section-title">学习记录</h2>
      {history.isPending && <p role="status">正在读取记录…</p>}
      {history.isError && (
        <section className="study-panel" role="alert">
          <p>记录加载失败，请检查网络。</p>
          <button onClick={() => void history.refetch()}>重新加载</button>
        </section>
      )}
      {history.data?.list.length === 0 && (
        <section className="study-panel">
          <h2>从第一次练习开始</h2>
          <p>完成默写后，记录会出现在这里。</p>
          <Link className="study-primary" to="/mobile/review">
            开始复习
          </Link>
        </section>
      )}
      <div className="study-history">
        {history.data?.list.map((s) => (
          <Link
            to={`/mobile/review?sessionId=${s.sessionId}`}
            key={s.sessionId}
          >
            <span className="study-history-score">
              {Math.round(s.accuracy)}
              <small>%</small>
            </span>
            <div>
              <strong>
                {s.direction === 0 ? "中文 → 英文" : "英文 → 中文"}
              </strong>
              <p>
                {s.wordCount} 个词 · {s.correctCount} 个正确
              </p>
              <small>
                {new Date(s.createTime).toLocaleString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </small>
            </div>
            <span aria-hidden="true">↗</span>
          </Link>
        ))}
      </div>
      {(history.data?.totalPages ?? 0) > 1 && (
        <div className="study-rating">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            上一页
          </button>
          <span>
            {page} / {history.data?.totalPages}
          </span>
          <button
            disabled={page >= (history.data?.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </StudyChrome>
  );
}
