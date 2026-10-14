import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import request from "@font/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  contextLabAttemptDetail,
  contextLabAttemptHistory,
} from "@/page/englishWorld/server/learning";
import type {
  ContextLabTask,
  ContextLabSubmitResult,
} from "@/page/englishWorld/types/learning";
import { StudyChrome, StudyError } from "../study/StudyChrome";
import { articleRoot, articleKeys, useArticle } from "./articleQueries";
export function ArticleScore({
  result,
  questions = [],
}: {
  result: ContextLabSubmitResult;
  questions?: ContextLabTask["questions"];
}) {
  return (
    <>
      <section className="study-panel article-score">
        <span>本次阅读练习</span>
        <strong>
          {result.score}
          <small>分</small>
        </strong>
        <p>
          答对 {result.correctCount} 题 · 答错 {result.wrongCount} 题
        </p>
      </section>
      <h2>逐题解析</h2>
      {result.results.map((r, i) => {
        const q = questions.find((q) => q.id === r.questionId);
        return (
          <section
            className="study-panel article-explanation"
            key={r.questionId}
          >
            <span>
              {i + 1}. {r.correct ? "✓ 回答正确" : "需要再想一想"}
            </span>
            <h3>{q?.stem ?? `第 ${i + 1} 题`}</h3>
            <p>
              你的答案：
              {q?.options[r.userSelectedIndex] ??
                String.fromCharCode(65 + r.userSelectedIndex)}
            </p>
            <p>
              正确答案：
              {q?.options[r.correctIndex] ??
                String.fromCharCode(65 + r.correctIndex)}
            </p>
            <p className="article-explanation-text">{r.explanation}</p>
          </section>
        );
      })}
      {result.weakWords?.length > 0 && (
        <p>建议复习：{result.weakWords.join(" · ")}</p>
      )}
      {result.nextSuggestions?.map((text, i) => (
        <p key={i} className="study-muted">
          {text}
        </p>
      ))}
    </>
  );
}
export function MobileArticleResult() {
  const { taskId, attemptId } = useParams();
  const [retryRound] = useState(() => String(Date.now()));
  const { user } = useAuth();
  const task = useArticle(Number(taskId));
  const valid =
    Number.isSafeInteger(Number(attemptId)) && Number(attemptId) > 0;
  const result = useQuery({
    queryKey: [...articleKeys, user?.id, "attempt", Number(attemptId)],
    queryFn: () =>
      request(contextLabAttemptDetail({ attemptId: Number(attemptId) })),
    enabled: valid,
    retry: false,
  });
  return (
    <StudyChrome title="每一次练习，都有收获" eyebrow="YOUR READING REVIEW">
      <Link to={`${articleRoot}/${taskId}/attempts`}>← 答题记录</Link>
      {result.isLoading && <p role="status">正在加载评分…</p>}
      {(!valid ||
        result.isError ||
        (result.data && result.data.taskId !== Number(taskId))) && (
        <>
          <StudyError message="未能读取这次答题记录。" />
          <button onClick={() => void result.refetch()}>重试</button>
        </>
      )}
      {result.data && result.data.taskId === Number(taskId) && (
        <>
          <ArticleScore result={result.data} questions={task.data?.questions} />
          <Link
            className="study-primary"
            to={`${articleRoot}/${taskId}/answer?round=${attemptId}-${retryRound}`}
          >
            再练一次
          </Link>
          <Link to={`${articleRoot}/${taskId}/read`}>回顾原文</Link>
        </>
      )}
    </StudyChrome>
  );
}
export function MobileArticleHistory() {
  const { taskId } = useParams();
  return <History key={taskId} taskId={Number(taskId)} />;
}
function History({ taskId }: { taskId: number }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const valid = Number.isSafeInteger(taskId) && taskId > 0;
  const query = useQuery({
    queryKey: [...articleKeys, user?.id, "attempts", taskId, page],
    queryFn: () =>
      request(contextLabAttemptHistory({ taskId, page, pageSize: 20 })),
    enabled: valid,
    retry: false,
  });
  return (
    <StudyChrome title="我的阅读记录" eyebrow="READING JOURNAL">
      <Link to={`${articleRoot}/${taskId}/read`}>← 回到文章</Link>
      {query.isLoading && <p role="status">正在加载记录…</p>}
      {(query.isError || !valid) && (
        <StudyError message="记录加载失败，请重试。" />
      )}
      <button onClick={() => void query.refetch()}>刷新记录</button>
      {query.data?.list.length === 0 && (
        <p className="study-panel">
          还没有答题记录，完成练习后可在这里查看解析。
        </p>
      )}
      <div className="article-library">
        {query.data?.list.map((a) => (
          <Link
            className="study-panel article-attempt"
            key={a.attemptId}
            to={`${articleRoot}/${taskId}/result/${a.attemptId}`}
          >
            <strong>{a.score} 分</strong>
            <span>
              答对 {a.correctCount} · 答错 {a.wrongCount}
            </span>
            <small>
              {a.createTime
                ? new Date(a.createTime).toLocaleString()
                : "查看解析"}{" "}
              →
            </small>
          </Link>
        ))}
      </div>
      <div className="article-pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          上一页
        </button>
        <span>第 {page} 页</span>
        <button
          disabled={!query.data || page * 20 >= query.data.total}
          onClick={() => setPage(page + 1)}
        >
          下一页
        </button>
      </div>
    </StudyChrome>
  );
}
