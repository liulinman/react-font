import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import request from "@font/api";
import { useAuth } from "@/contexts/AuthContext";
import { contextLabHistory } from "@/page/englishWorld/server/learning";
import { StudyChrome } from "../study/StudyChrome";
import { useConnectivity } from "../../offline/useConnectivity";
import {
  articleRoot,
  articleKeys,
  articleTitle,
  articleStatus,
  taskPending,
} from "./articleQueries";
export function MobileArticleLibrary() {
  const { user } = useAuth();
  const online = useConnectivity();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const query = useQuery({
    queryKey: [...articleKeys, user?.id, "list", page, keyword],
    queryFn: () =>
      request(
        contextLabHistory({
          page,
          pageSize: 12,
          ...(keyword ? { keyword } : {}),
        }),
      ),
    retry: false,
    refetchInterval: (q) =>
      online && q.state.data?.list.some(taskPending) ? 5000 : false,
  });
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / 12));
  return (
    <StudyChrome title="在文章里，读懂单词" eyebrow="READ · THINK · UNDERSTAND">
      <p className="study-muted">
        阅读一篇文章，完成配套练习，再看清每一道题。
      </p>
      <Link className="study-primary" to={`${articleRoot}/new`}>
        新建文章练习 <span aria-hidden="true">＋</span>
      </Link>
      {!online && (
        <p className="study-notice">当前离线，联网后可加载文章与提交练习。</p>
      )}
      <form
        className="study-home-search"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setKeyword(search.trim());
          setPage(1);
        }}
      >
        <input
          aria-label="搜索文章练习"
          placeholder="搜索标题或单词"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button>搜索</button>
      </form>
      <div className="study-section-heading">
        <h2>我的文章</h2>
        <button
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
        >
          刷新
        </button>
      </div>
      {query.isPending && <p role="status">正在读取文章…</p>}
      {query.isError && (
        <div className="study-error" role="alert">
          文章列表加载失败。
          <button onClick={() => void query.refetch()}>重新加载</button>
        </div>
      )}
      {query.data?.list.length === 0 && (
        <section className="study-panel">
          <h2>{keyword ? "没有找到这篇文章" : "从第一篇文章开始"}</h2>
          <p>
            {keyword
              ? "换个关键词试试。"
              : "可以用词库生成文章，也可以粘贴你想读的材料。"}
          </p>
        </section>
      )}
      <div className="article-library">
        {query.data?.list.map((task) => (
          <article key={task.taskId} className="article-library-card">
            <div className="article-card-meta">
              <span data-status={task.status}>{articleStatus(task)}</span>
              <span>
                {task.sourceType === "pasted-article"
                  ? "自选材料"
                  : `${task.words?.length ?? 0} 个目标词`}
              </span>
            </div>
            <Link to={`${articleRoot}/${task.taskId}/read`}>
              <h2>{articleTitle(task)}</h2>
              <span aria-hidden="true">↗</span>
            </Link>
            {task.status === "failed" ? (
              <p className="study-muted">
                {task.errorMessage || "生成未成功，可调整材料后重新创建。"}
              </p>
            ) : taskPending(task) ? (
              <p className="study-muted">
                生成完成后会自动更新，可先离开此页。
              </p>
            ) : (
              <p className="study-muted">
                {task.questions?.length
                  ? `${task.questions.length} 道练习题 · `
                  : ""}
                {task.latestScore != null
                  ? `最近得分 ${task.latestScore}`
                  : "开始阅读，留下你的第一次练习"}
              </p>
            )}
            {task.status === "succeeded" && (
              <Link
                className="article-history-link"
                to={`${articleRoot}/${task.taskId}/attempts`}
              >
                练习记录 →
              </Link>
            )}
          </article>
        ))}
      </div>
      {totalPages > 1 && (
        <div className="study-rating">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
            上一页
          </button>
          <span>
            {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </StudyChrome>
  );
}
