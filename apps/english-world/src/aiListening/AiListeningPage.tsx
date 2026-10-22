import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { listeningFetch, requestUid } from "./api";
import { playListeningAudio, stopListeningAudio } from "./audio";
import type { Session } from "./types";
import "./AiListeningPage.css";
type Word = { id: number; englishWord: string; englishChinese: string };
function readableExplanation(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value))
    return value.map(readableExplanation).filter(Boolean).join("；");
  if (value && typeof value === "object")
    return Object.values(value)
      .map(readableExplanation)
      .filter(Boolean)
      .join("：");
  return "暂无额外辨析";
}
export default function AiListeningPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const [session, setSession] = useState<Session>();
  const [words, setWords] = useState<Word[]>([]);
  const [selected, setSelected] = useState<number[]>(() => [
    ...new Set(
      (params.get("wordIds") || "")
        .split(",")
        .map(Number)
        .filter((n) => Number.isSafeInteger(n) && n > 0),
    ),
  ]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<{
    sessions: Session[];
    reviewWordIds: number[];
  }>({ sessions: [], reviewWordIds: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [preparingAudio, setPreparingAudio] = useState("");
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [wordAudioFailed, setWordAudioFailed] = useState<
    Record<number, boolean>
  >({});
  const epoch = useRef(0);
  const requests = useRef(new Set<AbortController>());
  const runId = useRef(0);
  const invalidate = () => {
    epoch.current++;
    for (const request of requests.current) request.abort();
    requests.current.clear();
    stopListeningAudio();
  };
  const safeFetch = async <T,>(
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<T> => {
    const version = epoch.current;
    const abort = new AbortController();
    requests.current.add(abort);
    signal?.addEventListener("abort", () => abort.abort(), { once: true });
    try {
      const data = await listeningFetch<T>(path, body, abort.signal);
      if (version !== epoch.current || abort.signal.aborted)
        throw new DOMException("Cancelled", "AbortError");
      return data;
    } finally {
      requests.current.delete(abort);
    }
  };
  useEffect(
    () => () => {
      invalidate();
      runId.current++;
    },
    [],
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [audioFailed, setAudioFailed] = useState<Record<string, boolean>>({});
  const lock = useRef(false);
  const ids = useRef<Record<string, string>>({});
  const mobile = location.pathname.startsWith("/mobile");
  const base = mobile ? "/mobile" : "/englishWorld";
  const uid = (action: string) =>
    ids.current[action] || (ids.current[action] = requestUid());
  const run = async (task: () => Promise<void>) => {
    if (lock.current) return;
    const currentRun = ++runId.current;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await task();
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      if (currentRun === runId.current) {
        lock.current = false;
        setBusy(false);
      }
    }
  };
  const loadHistory = async () =>
    setHistory(await safeFetch("/ai-learning/history"));
  const restore = async (id: string) => {
    invalidate();
    const next = await safeFetch<Session>(
      `/ai-learning/sessions/${encodeURIComponent(id)}`,
    );
    setSession(next);
    setParams({ sessionId: next.id });
  };
  useEffect(() => {
    const abort = new AbortController();
    const id = params.get("sessionId");
    if (id)
      void safeFetch<Session>(
        `/ai-learning/sessions/${encodeURIComponent(id)}`,
        undefined,
        abort.signal,
      )
        .then(setSession)
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        });
    void loadHistory().catch(() => {});
    return () => {
      abort.abort();
      stopListeningAudio();
    };
  }, [params.get("sessionId")]);
  useEffect(() => {
    const abort = new AbortController();
    void safeFetch<{ list: Word[]; total: number }>(
      "/english/filterWordList",
      {
        page,
        pageSize: 20,
        ...(search.trim() ? { englishWord: search.trim() } : {}),
      },
      abort.signal,
    )
      .then((data) => {
        setWords(data.list);
        setTotal(data.total);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => abort.abort();
  }, [search, page]);
  const create = async (wordIds: number[]) => {
    if (wordIds.length < 1 || wordIds.length > 10)
      throw new Error("请选择 1～10 个单词");
    invalidate();
    const next = await safeFetch<Session>("/ai-learning/sessions", {
      wordIds,
      requestUid: uid(`create:${wordIds.join(",")}`),
    });
    setSession(next);
    setParams({ sessionId: next.id });
    setAnswers({});
    await loadHistory();
  };
  const action = async (suffix: string, body: Record<string, unknown> = {}) => {
    if (!session) return;
    const key = `${session.id}:${suffix}`;
    try {
      const next = await safeFetch<Session>(
        `/ai-learning/sessions/${session.id}/${suffix}`,
        { ...body, requestUid: uid(key) },
      );
      setSession(next);
      delete ids.current[key];
    } catch (e) {
      if (e instanceof Error && "status" in e) delete ids.current[key];
      throw e;
    }
  };
  const play = async (qid: string, slow = false, retry = false) => {
    if (!session) return;
    const version = epoch.current;
    const root = `/ai-learning/sessions/${session.id}/questions/${qid}`;
    let began = false;
    setPreparingAudio(qid);
    try {
      await playListeningAudio(
        `${root}/audio${retry ? `?retryUid=${requestUid()}` : ""}`,
        {
          slow,
          onError: (e) => {
            if (version === epoch.current) {
              setAudioFailed((v) => ({ ...v, [qid]: true }));
              setError(e.message);
            }
          },
          onPlaying: async () => {
            if (version !== epoch.current) return;
            began = true;
            await run(async () => {
              const next = await safeFetch<Session>(`${root}/event`, {
                type: "played",
                requestUid: requestUid(),
              });
              setSession(next);
              if (slow)
                setSession(
                  await safeFetch(`${root}/event`, {
                    type: "slow",
                    requestUid: requestUid(),
                  }),
                );
            });
          },
        },
      );
      if (version === epoch.current)
        setAudioFailed((v) => ({ ...v, [qid]: false }));
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      if (version !== epoch.current) return;
      setAudioFailed((v) => ({ ...v, [qid]: true }));
      setError(e instanceof Error ? e.message : "音频失败");
      if (!began)
        void safeFetch(`${root}/event`, {
          type: "audio_failed",
          requestUid: requestUid(),
        }).catch(() => {});
    } finally {
      if (version === epoch.current)
        setPreparingAudio((current) => (current === qid ? "" : current));
    }
  };
  return (
    <div className="ai-listening">
      <header>
        <span>看词 → 场景听力 → 反馈</span>
        <h1>场景听力</h1>
        <p>
          先看词复习，再听完整句子，填写空缺。发音可能使用词条例句帮助区分读音。
        </p>
        <Link to={`${base}/words`}>返回词库</Link>
      </header>
      {error && (
        <div role="alert" className="ai-listening-error">
          {error}
        </div>
      )}
      {busy && <p role="status">正在准备，请稍候…</p>}
      {preparingAudio && <p role="status">正在准备音频，请稍候…</p>}
      {!session ? (
        <section>
          <h2>选择已有单词（1～10 个）</h2>
          <input
            aria-label="搜索单词"
            placeholder="搜索单词"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <p>已选 {selected.length} 个</p>
          <div className="ai-listening-words">
            {words.map((w) => (
              <label key={w.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(w.id)}
                  onChange={(e) =>
                    setSelected((v) =>
                      e.target.checked
                        ? [...v, w.id]
                        : v.filter((id) => id !== w.id),
                    )
                  }
                />
                <strong>{w.englishWord}</strong>
                <span>{w.englishChinese}</span>
              </label>
            ))}
          </div>
          {!words.length && <p>没有匹配单词，请先添加到词库。</p>}
          <div className="ai-listening-actions">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              上一页
            </button>
            <span>第 {page} 页</span>
            <button
              disabled={page * 20 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </button>
            <button
              disabled={busy || selected.length < 1 || selected.length > 10}
              onClick={() => void run(() => create(selected))}
            >
              开始复习
            </button>
          </div>
        </section>
      ) : (
        <section>
          <div className="ai-listening-actions">
            <h2>
              {session.status === "review"
                ? "看词复习"
                : session.status === "completed"
                  ? "本轮已完成"
                  : "听场景填空"}
            </h2>
            <button
              disabled={busy}
              onClick={() => {
                invalidate();
                runId.current++;
                lock.current = false;
                setBusy(false);
                setSession(undefined);
                setPreparingAudio("");
                setRetrying({});
                ids.current = {};
                setParams({});
              }}
            >
              选择其他单词
            </button>
          </div>
          {session.error && <p role="alert">{session.error}</p>}
          {(session.status === "review" ||
            (session.status === "failed" && session.words.length > 0)) && (
            <>
              <div className="ai-listening-words">
                {session.words.map((w) => (
                  <article key={w.id}>
                    <h3>
                      {w.word} <small>{w.phonetic}</small>
                    </h3>
                    <p>
                      {w.partSpeech} {w.meaning}
                    </p>
                    <p>{w.example}</p>
                    <button
                      onClick={() => {
                        const version = epoch.current;
                        void playListeningAudio("/speech/word", {
                          body: {
                            wordId: w.id,
                            ...(wordAudioFailed[w.id]
                              ? { retryUid: requestUid() }
                              : {}),
                          },
                          onError: () => {
                            if (version === epoch.current)
                              setWordAudioFailed((v) => ({
                                ...v,
                                [w.id]: true,
                              }));
                          },
                        })
                          .then(() => {
                            if (version === epoch.current)
                              setWordAudioFailed((v) => ({
                                ...v,
                                [w.id]: false,
                              }));
                          })
                          .catch((e) => {
                            if (
                              version === epoch.current &&
                              e.name !== "AbortError"
                            ) {
                              setError(e.message);
                              setWordAudioFailed((v) => ({
                                ...v,
                                [w.id]: true,
                              }));
                            }
                          });
                      }}
                    >
                      {wordAudioFailed[w.id] ? "重试发音" : "播放发音"}
                    </button>
                    <p>
                      {w.validation?.status === "valid" ? "校验通过" : "待确认"}
                      ：{w.validation?.reason || "尚未校验，请重新校验后再出题"}
                    </p>
                    {w.validation?.suggestion && (
                      <p>建议：{w.validation?.suggestion}</p>
                    )}
                    {w.validation?.status !== "valid" && (
                      <Link to={`${base}/words`}>前往词库修改，再重新校验</Link>
                    )}
                  </article>
                ))}
              </div>
              <div className="ai-listening-actions">
                <button
                  disabled={busy}
                  onClick={() => void run(() => action("recheck"))}
                >
                  重新校验
                </button>
                <button
                  disabled={
                    busy ||
                    session.status !== "review" ||
                    !session.words.some((w) => w.validation?.status === "valid")
                  }
                  onClick={() => void run(() => action("ready"))}
                >
                  看完了，生成场景
                </button>
              </div>
            </>
          )}
          {session.status === "failed" && (
            <button
              disabled={busy}
              onClick={() => void run(() => action("recheck"))}
            >
              重试校验
            </button>
          )}
          {session.questions.map((q, index) => (
            <article className="ai-listening-question" key={q.id}>
              <h3>
                场景 {index + 1} ·{" "}
                {q.audioMode === "dual" ? "双声对话" : "单声朗读"}
              </h3>
              <p>{q.scene}</p>
              <p className="ai-listening-gap">{q.gap}</p>
              <div className="ai-listening-actions">
                <button disabled={busy} onClick={() => void play(q.id)}>
                  播放完整句子
                </button>
                <button disabled={busy} onClick={() => void play(q.id, true)}>
                  慢速播放
                </button>
                {audioFailed[q.id] && (
                  <button
                    disabled={busy}
                    onClick={() => void play(q.id, false, true)}
                  >
                    重试音频（可能消耗用量）
                  </button>
                )}
              </div>
              {((q.status === "ready" && !q.revealed) || retrying[q.id]) && (
                <>
                  <label>
                    填写听到的词
                    <input
                      autoComplete="off"
                      aria-label={`场景 ${index + 1} 答案`}
                      value={answers[q.id] || ""}
                      onChange={(e) =>
                        setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                      }
                    />
                  </label>
                  <div className="ai-listening-actions">
                    <button
                      disabled={busy || !q.played || !answers[q.id]?.trim()}
                      onClick={() =>
                        void run(async () => {
                          await action(`questions/${q.id}/submit`, {
                            answer: answers[q.id],
                          });
                          setRetrying((v) => ({ ...v, [q.id]: false }));
                        })
                      }
                    >
                      提交
                    </button>
                    <button
                      disabled={busy}
                      onClick={() =>
                        q.status === "submitted"
                          ? setRetrying((v) => ({ ...v, [q.id]: false }))
                          : void run(() => action(`questions/${q.id}/skip`))
                      }
                    >
                      {q.status === "submitted" ? "取消再练" : "跳过（不计错）"}
                    </button>
                    {q.status === "ready" && (
                      <button
                        disabled={busy}
                        onClick={() => {
                          if (confirm("查看后不计独立答对，确定查看答案？"))
                            void run(() =>
                              action(`questions/${q.id}/event`, {
                                type: "revealed",
                              }),
                            );
                        }}
                      >
                        查看答案
                      </button>
                    )}
                  </div>
                </>
              )}
              {q.status === "ready" && q.revealed && (
                <button
                  disabled={busy}
                  onClick={() =>
                    void run(() => action(`questions/${q.id}/skip`))
                  }
                >
                  结束本题（已查看答案，不计错）
                </button>
              )}
              {q.status === "skipped" && <p>已跳过，不计错。</p>}
              {q.status === "submitted" && !retrying[q.id] && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setAnswers((v) => ({ ...v, [q.id]: "" }));
                    setRetrying((v) => ({ ...v, [q.id]: true }));
                  }}
                >
                  再练本题
                </button>
              )}
              {(q.attempts || []).map((attempt) => (
                <p key={attempt.sequence}>
                  第 {attempt.sequence} 次：{attempt.answer} ·{" "}
                  {attempt.correct ? "正确" : "错误"} · 播放 {attempt.played} 次
                  / 慢速 {attempt.slow} 次{attempt.revealed ? " · 已揭示" : ""}
                  （不改变首次成绩）
                </p>
              ))}
              {q.feedback && (
                <div className="ai-listening-feedback">
                  <strong>
                    {q.revealed
                      ? "已查看答案"
                      : q.feedback.correct
                        ? "回答正确"
                        : "再练一次"}
                    {!q.feedback.independent ? " · 非独立作答" : ""}
                  </strong>
                  <p>
                    首次答案：{q.feedback.userAnswer || "未填写"}；标准答案：
                    {q.feedback.answer}
                  </p>
                  <p>{q.feedback.transcript}</p>
                  <p>{q.feedback.explanation}</p>
                  <details>
                    <summary>近义词辨析</summary>
                    <p>{readableExplanation(q.feedback.synonyms)}</p>
                  </details>
                </div>
              )}
            </article>
          ))}
        </section>
      )}
      <section>
        <h2>学习记录与复查</h2>
        <button disabled={busy} onClick={() => void run(loadHistory)}>
          刷新记录
        </button>
        {history.reviewWordIds.length > 0 && (
          <button
            disabled={busy}
            onClick={() =>
              void run(() => create(history.reviewWordIds.slice(0, 10)))
            }
          >
            复查待练单词（最多10个）
          </button>
        )}
        {history.sessions.map((s) => (
          <div key={s.id} className="ai-listening-history">
            <span>
              {new Date(s.createdAt).toLocaleString()} ·{" "}
              {
                {
                  review: "看词复习",
                  listening: "听力作答",
                  completed: "已完成",
                  failed: "待重试",
                }[s.status]
              }
            </span>
            <button
              disabled={busy}
              onClick={() => void run(() => restore(s.id))}
            >
              继续 / 查看结果
            </button>
            <button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const old = await safeFetch<Session>(
                    `/ai-learning/sessions/${s.id}`,
                  );
                  const wordIds = [
                    ...new Set([
                      ...old.words.map((w) => w.id),
                      ...old.questions.map((q) => q.wordId),
                    ]),
                  ];
                  delete ids.current[`create:${wordIds.join(",")}`];
                  await create(wordIds);
                })
              }
            >
              新场景再练
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
