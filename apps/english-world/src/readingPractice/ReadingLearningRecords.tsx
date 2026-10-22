import { useState } from "react";
import { Link } from "react-router-dom";
import request from "@font/api";
export function ReadingLearningRecords({ basePath }: { basePath: string }) {
  const [open, setOpen] = useState(false),
    [data, setData] = useState<any>(),
    [error, setError] = useState("");
  const load = async () => {
    setOpen(true);
    setError("");
    try {
      setData(
        await request({
          url: "/reading-practices/learning-records",
          method: "GET",
          __responseType: undefined as any,
        }),
      );
    } catch {
      setError("学习记录读取失败，请重试。");
    }
  };
  return (
    <section className="rp-learning">
      <button onClick={() => (open ? setOpen(false) : void load())}>
        {open ? "收起阅读学习记录" : "查看阅读学习记录与错题"}
      </button>
      {open && (
        <>
          {error ? (
            <p role="alert">
              {error}
              <button onClick={() => void load()}>重试</button>
            </p>
          ) : !data ? (
            <p>正在读取学习记录…</p>
          ) : (
            <>
              <h2>阅读学习记录</h2>
              <p>
                已完成 {data.submittedCount} 套 · 当前有效题 {data.total} 道 ·
                正确率{" "}
                {data.accuracy === null ? "无法评分" : `${data.accuracy}%`}
                。作废题不参与统计。
              </p>
              <h3>题型与薄弱项</h3>
              {data.byKind.map((s: any) => (
                <p key={s.kind}>
                  {s.kind === "sentence_completion" ? "句子填空" : s.kind === "matching_features" ? "人物匹配" : s.kind === "choice"
                    ? "单项选择"
                    : "True / False / Not Given"}
                  ：{s.correct}/{s.total} ·{" "}
                  {Math.round((s.correct * 100) / s.total)}%
                  {s.correct / s.total < 0.7 ? " · 建议重点回顾" : ""}
                </p>
              ))}
              <h3>当前错题</h3>
              {data.wrongQuestions.length === 0 ? (
                <p>暂无有效错题。</p>
              ) : (
                data.wrongQuestions.map((q: any) => (
                  <details key={`${q.practiceId}-${q.questionId}`}>
                    <summary>
                      {q.title} · {q.stem}
                    </summary>
                    <p>
                      你的答案：{q.kind === "sentence_completion" ? q.answerText || "未作答" : q.options[q.selectedIndex ?? -1]}；当前答案：
                      {q.kind === "sentence_completion" ? q.acceptedAnswers?.join(" / ") : q.options[q.correctIndex ?? -1]}
                    </p>
                    <p>{q.explanation}</p>
                    <Link to={`${basePath}/${q.practiceId}/result`}>
                      查看原文与解析
                    </Link>
                  </details>
                ))
              )}
              <h3>学习时间线</h3>
              {data.timeline.map((t: any) => (
                <article key={t.practiceId}>
                  <Link to={`${basePath}/${t.practiceId}/result`}>
                    {t.title}
                  </Link>
                  <p>
                    {new Date(t.submittedAt).toLocaleString("zh-CN")} ·{" "}
                    {t.score === null
                      ? "本次练习无法评分"
                      : `${t.correctCount}/${t.total} · ${t.score}分`}
                  </p>
                  {t.adjustments.map((a: any) => (
                    <p key={a.id}>
                      评分修订 {a.revision} · {a.questionId} · {a.reason}
                    </p>
                  ))}
                </article>
              ))}
            </>
          )}
        </>
      )}
    </section>
  );
}
