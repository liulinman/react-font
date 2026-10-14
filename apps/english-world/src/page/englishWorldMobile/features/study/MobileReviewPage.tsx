import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import request from "@font/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  startRecite,
  submitAnswer,
  getReciteSessionResult,
  type Question,
  type StartReciteResponse,
  type SubmitAnswerResponse,
} from "@/server/recite/recite";
import { MobileBritishPronunciationButton } from "../../MobileBritishPronunciationButton";
import { useConnectivity } from "../../offline/useConnectivity";
import { selectedWordIds, useStudyDraft } from "./studyStorage";
import { StudyChrome, StudyError, StudyProgress } from "./StudyChrome";

type ReviewDraft = {
  questions: Question[];
  direction: number;
  answers: Record<number, string>;
  index: number;
  result: SubmitAnswerResponse | null;
  submissionPending?: boolean;
};
function validReview(value: unknown): value is ReviewDraft {
  const d = value as ReviewDraft | null;
  return (
    !!d &&
    Array.isArray(d.questions) &&
    d.questions.length > 0 &&
    d.questions.length <= 50 &&
    d.questions.every(
      (q) =>
        Number.isSafeInteger(q.wordId) &&
        q.wordId > 0 &&
        typeof q.question === "string",
    ) &&
    (d.direction === 0 || d.direction === 1) &&
    Number.isInteger(d.index) &&
    d.index >= 0 &&
    d.index < d.questions.length &&
    !!d.answers &&
    typeof d.answers === "object" &&
    Object.values(d.answers).every((a) => typeof a === "string") &&
    (d.result === null ||
      (typeof d.result?.sessionId === "number" &&
        Array.isArray(d.result.results) &&
        !!d.result.statistics))
  );
}
export function MobileReviewPage() {
  const { user } = useAuth();
  const { search } = useLocation();
  return (
    <ReviewFlow
      key={`${user?.id}:${search}`}
      userId={user?.id ?? 0}
      search={search}
    />
  );
}
function ReviewFlow({ userId, search }: { userId: number; search: string }) {
  const navigate = useNavigate();
  const resultId = Number(new URLSearchParams(search).get("sessionId"));
  const ids = selectedWordIds(search);
  const online = useConnectivity();
  const qc = useQueryClient();
  const { draft, setDraft, storageError, reloadDraft } = useStudyDraft(
    userId,
    resultId
      ? `history-view:${resultId}`
      : `review:${ids.join(",")}${new URLSearchParams(search).get("round") ? `:round:${new URLSearchParams(search).get("round")}` : ""}`,
    validReview,
    resultId
      ? undefined
      : { path: `/mobile/review${search}`, complete: (d) => !!d.result },
  );
  const [count, setCount] = useState(10);
  const [direction, setDirection] = useState(
    new URLSearchParams(search).get("direction") === "1" ? 1 : 0,
  );
  const [level, setLevel] = useState("all");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const [restoredResult, setRestoredResult] =
    useState<SubmitAnswerResponse | null>(null);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  useEffect(() => {
    if (!resultId) return;
    let active = true;
    void request<SubmitAnswerResponse>(
      getReciteSessionResult({ sessionId: resultId }),
    )
      .then((r) => {
        if (active) {
          setRestoredResult(r);
          setError("");
        }
      })
      .catch(() => {
        if (active) setError("复习记录加载失败，请重试。");
      });
    return () => {
      active = false;
    };
  }, [resultId, recoveryAttempt]);
  const start = async (wordIds = ids, dir = direction) => {
    if (resultId) {
      navigate(
        `/mobile/review?wordIds=${wordIds.join(",")}&direction=${dir}&round=${resultId}-${dir}-${Date.now()}`,
      );
      return;
    }
    if (lock.current || !online) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = await request<StartReciteResponse>(
        startRecite({
          wordCount: wordIds.length || count,
          direction: dir,
          ...(wordIds.length
            ? { wordIds }
            : level !== "all"
              ? { proficiencyLevels: [Number(level)] }
              : {}),
        }),
      );
      if (!data.questions?.length) {
        setError("这个范围没有可复习的词，请换个范围或先添加单词。");
        return;
      }
      setDraft({
        questions: data.questions,
        direction: data.direction,
        answers: {},
        index: 0,
        result: null,
      });
      setRestoredResult(null);
    } catch {
      setError("复习加载失败，请检查网络后重试。");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = async () => {
    if (!draft || draft.submissionPending || lock.current || !online) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setDraft({ ...draft, submissionPending: true });
    try {
      const result = await request<SubmitAnswerResponse>(
        submitAnswer({
          direction: draft.direction,
          answers: draft.questions.map((q) => ({
            wordId: q.wordId,
            userAnswer: (draft.answers[q.wordId] ?? "").trim(),
          })),
        }),
      );
      setDraft({ ...draft, result, submissionPending: false });
      void qc.invalidateQueries({ queryKey: ["mobile", "study-progress"] });
    } catch {
      setError(
        "未收到提交结果，答案已保留。请先在学习记录确认是否已保存，再决定重试，避免重复记录。",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const result = resultId ? restoredResult : draft?.result;
  const question = draft?.questions[draft.index];
  const wrong = result?.results.filter((r) => !r.isCorrect) ?? [];
  return (
    <StudyChrome
      title={result ? "学习回顾" : "默写复习"}
      eyebrow="A LITTLE BETTER, EVERY DAY"
    >
      {!online && (
        <p className="study-notice" role="status">
          当前离线，答案会保留在本机。联网后可以提交。
        </p>
      )}
      {storageError && (
        <p role="status">本机存储不可用，请保持当前页面直到提交完成。</p>
      )}
      <StudyError message={error} />
      {error.includes("未收到") && (
        <Link to="/mobile/cockpit">检查学习记录 →</Link>
      )}
      {result ? (
        <section className="study-completion">
          <div className="study-completion__mark">✓</div>
          <span className="study-kicker">PRACTICE MAKES PROGRESS</span>
          <h2>复习完成</h2>
          <div className="study-score">
            <strong>
              {Math.round(result.statistics.accuracy)}
              <small>%</small>
            </strong>
            <span>
              正确率 · {result.statistics.correctCount} /{" "}
              {result.statistics.totalCount} 词
            </span>
          </div>
          <p>
            {wrong.length
              ? "把还没记牢的词，再见一面。"
              : "这组词，你记得很扎实。"}
          </p>
          {wrong.length > 0 && (
            <button
              className="study-primary"
              disabled={busy || !online}
              onClick={() =>
                void start(
                  wrong.map((w) => w.wordId),
                  result.direction ?? draft?.direction ?? 0,
                )
              }
            >
              {busy ? "正在准备…" : `重练错词 · ${wrong.length}`}
            </button>
          )}
          <div className="study-result-list">
            {[...result.results]
              .sort((a, b) => Number(a.isCorrect) - Number(b.isCorrect))
              .map((r) => (
                <article key={r.wordId} className="study-result-word">
                  <div>
                    <span
                      className={r.isCorrect ? "study-correct" : "study-wrong"}
                    >
                      {r.isCorrect ? "✓ 已记住" : "↻ 再巩固"}
                    </span>
                    <h3>{r.englishWord}</h3>
                    <p>{r.correctAnswer}</p>
                    {!r.isCorrect && (
                      <small>你的答案：{r.userAnswer || "未填写"}</small>
                    )}
                  </div>
                  <MobileBritishPronunciationButton word={r.englishWord} />
                </article>
              ))}
          </div>
          <Link className="study-text-link" to="/mobile">
            返回学习首页
          </Link>
          <button
            onClick={() => {
              if (resultId) navigate("/mobile/review");
              else setDraft(null);
            }}
          >
            {resultId ? "返回复习" : "新的一轮"}
          </button>
        </section>
      ) : resultId ? (
        <section className="study-panel">
          <p>{error ? "暂时无法读取记录" : "正在读取复习记录…"}</p>
          {error && (
            <button onClick={() => setRecoveryAttempt((n) => n + 1)}>
              重新加载
            </button>
          )}
        </section>
      ) : draft && question ? (
        <>
          {draft.submissionPending && (
            <section className="study-notice" role="status">
              <p>
                这轮答案已发出，保存状态尚待确认。请先查看学习记录，避免重复提交。
              </p>
              <Link to="/mobile/cockpit">查看学习记录 →</Link>
              <button onClick={reloadDraft}>重新读取保存状态</button>
              <button
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      "请先确认学习记录中没有本轮结果。再次提交可能产生重复记录，仍要重试吗？",
                    )
                  )
                    setDraft({ ...draft, submissionPending: false });
                }}
              >
                已核对记录，允许重试
              </button>
            </section>
          )}
          <StudyProgress
            current={draft.index + 1}
            total={draft.questions.length}
          />
          <article className="study-word-card study-word-card--review">
            <span className="study-kicker">
              {draft.direction === 0 ? "看中文，写英文" : "看英文，写中文"}
            </span>
            <h2 lang={draft.direction === 0 ? "zh" : "en"}>
              {question.question}
            </h2>
            {draft.direction === 1 && (
              <MobileBritishPronunciationButton word={question.question} />
            )}
          </article>
          <form
            className="study-answer"
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.index < draft.questions.length - 1)
                setDraft({ ...draft, index: draft.index + 1 });
              else void submit();
            }}
          >
            <label htmlFor="study-answer">你的答案</label>
            <input
              id="study-answer"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={
                draft.direction === 0 ? "输入英文单词" : "输入中文释义"
              }
              value={draft.answers[question.wordId] ?? ""}
              disabled={busy || draft.submissionPending}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  answers: {
                    ...draft.answers,
                    [question.wordId]: e.target.value,
                  },
                })
              }
            />
            <div className="study-rating">
              <button
                type="button"
                disabled={busy || draft.submissionPending || draft.index === 0}
                onClick={() => setDraft({ ...draft, index: draft.index - 1 })}
              >
                上一词
              </button>
              <button
                className="study-primary"
                type="submit"
                disabled={
                  busy ||
                  draft.submissionPending ||
                  (!online && draft.index === draft.questions.length - 1)
                }
              >
                {busy
                  ? "正在提交…"
                  : draft.index === draft.questions.length - 1
                    ? "完成并查看结果"
                    : "下一词"}
              </button>
            </div>
          </form>
          <p className="study-footnote">
            不会的词可以留空。答案自动保存在本机。
          </p>
        </>
      ) : (
        <>
          <p className="study-muted">不翻答案，看看哪些词真正留在了记忆里。</p>
          <section className="study-panel">
            <span className="study-kicker">本轮复习</span>
            <h2>
              {ids.length ? `选中的 ${ids.length} 个词` : "从我的词库抽取"}
            </h2>
            <fieldset className="study-segment">
              <legend>默写方向</legend>
              {[
                { id: 0, label: "中文 → 英文" },
                { id: 1, label: "英文 → 中文" },
              ].map((o) => (
                <button
                  type="button"
                  key={o.id}
                  aria-pressed={direction === o.id}
                  onClick={() => setDirection(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </fieldset>
            {!ids.length && (
              <>
                <label>
                  词数
                  <select
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    {[5, 10, 20, 50].map((n) => (
                      <option key={n} value={n}>
                        {n} 个词
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  掌握程度
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                  >
                    <option value="all">全部单词</option>
                    <option value="0">不会</option>
                    <option value="1">一般</option>
                    <option value="2">熟练</option>
                    <option value="3">精通</option>
                  </select>
                </label>
              </>
            )}
            <button
              className="study-primary"
              disabled={busy || !online || ids.length > 50}
              onClick={() => void start()}
            >
              {busy ? "正在准备…" : "开始复习"}
            </button>
            {ids.length > 50 && (
              <StudyError message="每轮最多 50 个词，请返回词库重新选择。" />
            )}
          </section>
          <Link className="study-text-link" to="/mobile/cockpit">
            查看学习记录 →
          </Link>
        </>
      )}
    </StudyChrome>
  );
}
