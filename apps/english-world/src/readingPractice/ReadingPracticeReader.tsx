import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import request from "@font/api";
import { getPractice, getResult } from "./api";
import type { PracticeResult, PublicPractice } from "./types";
import { SharedReadingExam } from "./SharedReadingExam";
export function ReadingPracticeReader({
  practiceId,
  basePath,
  userId,
}: {
  practiceId: number;
  basePath: string;
  userId: number;
}) {
  const [paper, setPaper] = useState<PublicPractice>(),
    [result, setResult] = useState<PracticeResult>(),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setPaper(undefined);
    setResult(undefined);
    setError("");
    void request(getPractice(practiceId))
      .then(async (p) => {
        const r = p.submitted
          ? await request(getResult(practiceId))
          : undefined;
        if (active) {
          setPaper(p);
          setResult(r);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("练习暂时无法打开，请检查网络或确认你是接收人。");
      });
    return () => {
      active = false;
    };
  }, [practiceId, userId, retry]);
  return (
    <main className="reading-practice">
      <Link className="rp-back" to={basePath}>
        ← 返回练习列表
      </Link>
      {error ? (
        <div role="alert">
          {error}
          <button onClick={() => setRetry((n) => n + 1)}>重试</button>
        </div>
      ) : !paper ? (
        <p role="status">正在加载练习…</p>
      ) : result ? (
        <SharedReadingExam key={`${userId}:${practiceId}:result`} initialResult={result} paper={paper} userId={userId} basePath={basePath} />
      ) : paper.status === "withdrawn" && !paper.started ? (
        <div className="rp-empty">
          <h1>练习已撤回</h1>
          <p>这套练习已停止作答，请查看其他阅读练习。</p>
        </div>
      ) : (
        <SharedReadingExam key={`${userId}:${practiceId}`} paper={paper} userId={userId} basePath={basePath} />
      )}
    </main>
  );
}
