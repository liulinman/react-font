import { SharedReadingExam } from "./SharedReadingExam";
import { ReadingFeedback } from "./ReadingFeedback";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import request from "@font/api";
import { getPractice, getResult } from "./api";
import type { PracticeResult, PublicPractice } from "./types";
export function ResultContent({
  result,
  paper,
}: {
  result: PracticeResult;
  paper: PublicPractice;
}) {
  const [tab, setTab] = useState<"article" | "questions">("questions");
  useEffect(() => {
    document.querySelector(".rp-score")?.scrollIntoView?.({ block: "start" });
  }, [result.practiceId]);
  return (
    <>
      <div className="rp-score">
        <span>
          <strong>{result.score === null ? "无法评分" : result.score}</strong>
          {result.score !== null && <small> / 100</small>}
        </span>
        <div>
          <h2>练习已完成</h2>
          <p>
            {result.score === null
              ? "全部题目已作废，本次练习无法评分"
              : `答对 ${result.correctCount} / ${result.total} 题`}{" "}
            · {new Date(result.submittedAt).toLocaleString("zh-CN")}
          </p>
        </div>
      </div>
      {result.originalResult && (
        <section className="rp-adjustments">
          <h3>成绩调整说明</h3>
          <p>
            原始成绩：
            {result.originalResult.score === null
              ? "无法评分"
              : `${result.originalResult.correctCount}/${result.originalResult.total} · ${result.originalResult.score}分`}
            ；当前评分修订 {result.gradingRevision}
          </p>
          {result.adjustments?.map((a) => (
            <p key={a.id}>
              {a.questionId} · {a.reason}
            </p>
          ))}
        </section>
      )}
      <div className="rp-mobile-tabs" role="group" aria-label="原文和解析">
        <button
          aria-pressed={tab === "article"}
          onClick={() => setTab("article")}
        >
          回看原文
        </button>
        <button
          aria-pressed={tab === "questions"}
          onClick={() => setTab("questions")}
        >
          答案与解析
        </button>
      </div>
      <div className={`rp-columns rp-tab-${tab}`}>
        <article className="rp-article">
          <h2>{paper.title}</h2>
          {paper.paragraphs.map((p, i) => (
            <p id={`paragraph-${i + 1}`} key={i}>
              <span className="rp-paragraph-number">{i + 1}</span>
              {p}
            </p>
          ))}
        </article>
        <section className="rp-questions" aria-label="答案与解析">
          <h2>答案与解析</h2>
          {result.results.map((q, i) => (
            <article
              className={`rp-result ${q.voided ? "is-voided" : q.correct ? "is-correct" : "is-incorrect"}`}
              key={q.id}
            >
              <span className="rp-status">
                {q.voided
                  ? "本题已作废，不计入成绩"
                  : q.correct
                    ? "回答正确"
                    : "需要回顾"}
              </span>
              <h3>
                {i + 1}. {q.stem}
              </h3>
              <p>
                你的答案：<strong>{q.kind === "sentence_completion" ? q.answerText || "未作答" : q.options[q.selectedIndex ?? -1]}</strong>
              </p>
              <p>
                正确答案：<strong>{q.kind === "sentence_completion" ? q.acceptedAnswers?.join(" / ") : q.options[q.correctIndex ?? -1]}</strong>
              </p>
              <p className="rp-explanation">{q.explanation}</p>
              <blockquote>
                <a
                  href={`#paragraph-${q.evidence.paragraph}`}
                  onClick={() => {
                    setTab("article");
                    setTimeout(
                      () =>
                        document
                          .getElementById(`paragraph-${q.evidence.paragraph}`)
                          ?.scrollIntoView?.({ block: "center" }),
                      0,
                    );
                  }}
                >
                  原文第 {q.evidence.paragraph} 段
                </a>
                <p>{q.evidence.quote || q.evidence.missingInformation}</p>
              </blockquote>
              <ReadingFeedback practiceId={paper.id} questionId={q.id} />
            </article>
          ))}
        </section>
      </div>
    </>
  );
}
export function ReadingPracticeResult({
  userId,
  practiceId,
  basePath,
}: {
  userId: number;
  practiceId: number;
  basePath: string;
}) {
  const [data, setData] = useState<{
      paper: PublicPractice;
      result: PracticeResult;
    }>(),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setData(undefined);
    setError("");
    void Promise.all([
      request(getPractice(practiceId)),
      request(getResult(practiceId)),
    ])
      .then(([paper, result]) => {
        if (active) {
          setData({ paper, result });
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("无法读取结果，请确认你已提交这套练习。");
      });
    return () => {
      active = false;
    };
  }, [practiceId, userId, retry]);
  return (
    <main className="reading-practice">
      <Link to={basePath}>← 返回练习列表</Link>
      {error ? (
        <div role="alert">
          {error}
          <button onClick={() => setRetry((n) => n + 1)}>重试</button>
        </div>
      ) : data ? (
        <SharedReadingExam key={`${userId}:${practiceId}:result`} paper={data.paper} initialResult={data.result} userId={userId} basePath={basePath} />
      ) : (
        <p role="status">正在读取结果…</p>
      )}
    </main>
  );
}
