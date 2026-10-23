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
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [viewResults, setViewResults] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const completedCount = session?.questions.filter(q => q.status !== "ready").length || 0;
  const showingSummary = !!session?.questions.length && viewResults;
  const goQuestion = (index: number) => { stopListeningAudio(); setViewResults(false); setActiveQuestion(index); requestAnimationFrame(() => stageRef.current?.scrollIntoView?.({block:"start"})); };
  const [words, setWords] = useState<Word[]>([]);
  const [knownWords, setKnownWords] = useState<Record<number, Word>>({});
  const [wordsLoading, setWordsLoading] = useState(true);
  const [wordsError, setWordsError] = useState("");
  const [wordReload, setWordReload] = useState(0);
  const stageRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (session)
      stageRef.current?.scrollIntoView?.({ block: "start", behavior: "auto" });
  }, [session?.id, session?.status]);
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
  const [playback, setPlayback] = useState<{ qid: string; slow: boolean; state: "loading" | "playing" }>();
  const audioRun = useRef(0);
  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [wordAudioFailed, setWordAudioFailed] = useState<
    Record<number, boolean>
  >({});
  const epoch = useRef(0);
  const requests = useRef(new Set<AbortController>());
  const runId = useRef(0);
  const invalidate = () => {
    epoch.current++;
    audioRun.current++;
    setPlayback(undefined);
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
  const [sceneHints, setSceneHints] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [audioFailed, setAudioFailed] = useState<Record<string, boolean>>({});
  const lock = useRef(false);
  const ids = useRef<Record<string, string>>({});
  const mobile = location.pathname.startsWith("/mobile");
  const serviceFailure = (word: Session["words"][number]) =>
    word.validation?.status === "failed" ||
    (!!session?.error && word.validation?.reason === session.error);
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
    setActiveQuestion(Math.max(0, next.questions.findIndex(q => q.status === "ready")));
    setViewResults(next.status === "completed");
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
.then(next => { setSession(next); setActiveQuestion(Math.max(0, next.questions.findIndex(q => q.status === "ready"))); setViewResults(next.status === "completed"); })
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
    setWordsLoading(true);
    setWordsError("");
    setWords([]);
    const timer = setTimeout(() => {
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
        setKnownWords(previous => ({ ...previous, ...Object.fromEntries(data.list.map(word => [word.id, word])) }));
        setTotal(data.total);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setWordsError(e.message);
      }).finally(() => { if (!abort.signal.aborted) setWordsLoading(false); });
    }, 180);
    return () => { clearTimeout(timer); abort.abort(); };
  }, [search, page, wordReload]);
  const create = async (wordIds: number[]) => {
    if (wordIds.length < 1 || wordIds.length > 10)
      throw new Error("请选择 1～10 个单词");
    invalidate();
    const next = await safeFetch<Session>("/ai-learning/sessions", {
      wordIds,
      requestUid: uid(`create:${wordIds.join(",")}`),
    });
    setSession(next);
    setActiveQuestion(Math.max(0, next.questions.findIndex(q => q.status === "ready")));
    setViewResults(next.status === "completed");
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
    const audioToken = ++audioRun.current;
    setPlayback({ qid, slow, state: "loading" });
    try {
      await playListeningAudio(
        `${root}/audio${retry ? `?retryUid=${requestUid()}` : ""}`,
        {
          slow,
          onStateChange: (state) => {
            if (version !== epoch.current || audioToken !== audioRun.current) return;
            setPlayback(state === "idle" ? undefined : { qid, slow, state });
          },
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
      if (audioToken === audioRun.current) setPlayback(undefined);
      setAudioFailed((v) => ({ ...v, [qid]: true }));
      setError(e instanceof Error ? e.message : "音频失败");
      if (!began)
        void safeFetch(`${root}/event`, {
          type: "audio_failed",
          requestUid: requestUid(),
        }).catch(() => {});
    }
  };
  return (
    <div className={`ai-listening${!session ? " ai-selection-view" : ""}`}>
      <header>
        <span className="ai-listening-eyebrow">LISTEN & LEARN</span>
        <h1>场景听力</h1>
        <p>把熟悉的单词，放进真实的对话里。</p>
        <Link to={`${base}/words`}>返回词库</Link>
      </header>
      <ol className="ai-listening-steps" aria-label="学习步骤">
        {["选择单词", "看词复习", "听力填空", "学习反馈"].map(
          (label, index) => {
            const current = !session
              ? 0
              : session.status === "review" || session.status === "failed"
                ? 1
                : session.status === "completed"
                  ? 3
                  : viewResults ? 3 : 2;
            const done = index < current && !(index === 2 && session?.questions.some(q => q.status === "ready"));
            return (
              <li
                key={label}
                className={
                  index === current ? "current" : done ? "done" : ""
                }
              >
                <span>{done ? "✓" : index + 1}</span>
                {index === 3 && !!session?.questions.length ? <button className="ai-step-link" onClick={() => { setViewResults(true); stopListeningAudio(); stageRef.current?.scrollIntoView?.({block:"start"}); }}>学习反馈</button> : label}
              </li>
            );
          },
        )}
      </ol>
      {error && (
        <div role="alert" className="ai-listening-error">
          <strong>暂时未能完成</strong>
          <p>{error}</p>
          <span>当前内容已保留，请检查连接后重试刚才的操作。</span>
        </div>
      )}
      {busy && <span className="ai-busy-status" role="status">正在处理，请稍候…</span>}
      {!session ? (
        <section className="ai-selection-panel" ref={stageRef}>
          <div className="ai-section-heading">
            <div><h2>今天想练哪些词？</h2><p>选择 1～10 个单词，先复习，再听场景填空。</p></div>
          </div>
          <div className="ai-selection-layout">
            <div className="ai-word-library">
              <div className="ai-selection-toolbar">
                <div className="ai-word-search"><input aria-label="搜索单词" placeholder="搜索想练的单词" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />{search && <button aria-label="清除搜索" onClick={() => { setSearch(""); setPage(1); }}>×</button>}</div>
                <button className="ai-quick-select" disabled={wordsLoading || !!wordsError || selected.length >= 10 || !words.some(w => !selected.includes(w.id))} onClick={() => setSelected(previous => [...previous, ...words.filter(w => !previous.includes(w.id)).slice(0, Math.min(5, 10 - previous.length)).map(w => w.id)])}>快速选 5 词</button>
              </div>
              <div className="ai-library-meta"><span>{wordsLoading ? "正在加载词库…" : `共 ${total} 个单词`}</span><span>可跨页选择</span></div>
              <div className="ai-listening-words ai-word-options ai-selection-list" aria-label="可选单词" aria-busy={wordsLoading}>
                {wordsLoading ? <p className="ai-word-list-message" role="status">正在加载单词…</p> : wordsError ? <div className="ai-word-list-message" role="alert"><p>{wordsError}</p><button onClick={() => setWordReload(v => v + 1)}>重试加载</button></div> : words.length ? words.map(w => <label key={w.id} className={selected.includes(w.id) ? "selected" : ""}>
                  <input type="checkbox" checked={selected.includes(w.id)} disabled={!selected.includes(w.id) && selected.length >= 10} onChange={e => { const checked = e.target.checked; setSelected(previous => checked ? previous.includes(w.id) || previous.length >= 10 ? previous : [...previous, w.id] : previous.filter(id => id !== w.id)); }} />
                  <strong>{w.englishWord}</strong><span>{w.englishChinese}</span>
                </label>) : <div className="ai-word-list-message"><strong>{search ? "没有找到匹配的单词" : "词库里还没有单词"}</strong><p>{search ? "试试其他拼写，已选单词会保留。" : "先到词库添加单词，再回来练习。"}</p>{search ? <button onClick={() => { setSearch(""); setPage(1); }}>清除搜索</button> : <Link to={`${base}/words`}>前往词库</Link>}</div>}
              </div>
              <div className="ai-library-pagination"><button disabled={wordsLoading || page === 1} onClick={() => setPage(p => p - 1)}>上一页</button><span>第 {page} / {Math.max(1, Math.ceil(total / 20))} 页</span><button disabled={wordsLoading || page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</button></div>
            </div>
            <aside className="ai-selection-basket" aria-label="本轮已选单词">
              <div className="ai-basket-heading"><h3>本轮练习</h3><span>{selected.length} / 10</span></div>
              <p className="ai-basket-help">建议每轮 4～6 词，循序渐进。</p>
              <div className="ai-basket-start"><button className="ai-primary-button" disabled={busy || selected.length < 1 || selected.length > 10} onClick={() => void run(() => create(selected))}>{busy ? "正在校验单词…" : "开始复习"}</button><p>{selected.length >= 10 ? "已选满 10 词，可移除后更换" : selected.length ? "下一步：确认词义与发音" : "选好单词后即可开始"}</p></div>
              {selected.length ? <><ul className="ai-basket-list">{selected.map(id => <li key={id}><div><strong>{knownWords[id]?.englishWord || `单词 #${id}`}</strong><span>{knownWords[id]?.englishChinese || "已从词库选中"}</span></div><button aria-label={`移除 ${knownWords[id]?.englishWord || `单词 #${id}`}`} disabled={busy} onClick={() => setSelected(v => v.filter(wordId => wordId !== id))}>×</button></li>)}</ul><button className="ai-text-button ai-basket-clear" disabled={busy} onClick={() => setSelected([])}>清空选择</button></> : <div className="ai-basket-empty"><span aria-hidden="true">＋</span><strong>还没有选词</strong><p>点击单词所在行，或用<br />“快速选 5 词”开始。</p></div>}

            </aside>
          </div>
        </section>
      ) : (
        <section ref={stageRef}>
          <div className="ai-listening-actions ai-section-heading">
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
              <p className="ai-review-intro">
                先熟悉词义与读音，准备好后进入听力。
                <span>
                  {
                    session.words.filter(
                      (w) => w.validation?.status === "valid",
                    ).length
                  }{" "}
                  / {session.words.length} 个可用于练习
                </span>
              </p>
              <div className="ai-listening-words ai-review-words">
                {session.words.map((w) => (
                  <article key={w.id} className="ai-review-word">
                    <h3>
                      {w.word} <small>{w.phonetic}</small>
                    </h3>
                    <p className="ai-word-meaning">
                      <span>
                        {w.partSpeech !== "未分类" ? w.partSpeech : ""}
                      </span>{" "}
                      {w.meaning}
                    </p>
                    {w.example && (
                      <p className="ai-word-example">{w.example}</p>
                    )}
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
                    <details
                      className={`ai-validation ${w.validation?.status === "valid" ? "valid" : serviceFailure(w) ? "unavailable" : "uncertain"}`}
                    >
                      <summary>
                        {w.validation?.status === "valid"
                          ? "✓ 词条校验通过"
                          : serviceFailure(w)
                            ? "校验服务暂不可用"
                            : "! 词条需要确认"}
                        <span>查看详情</span>
                      </summary>
                      <p>
                        {w.validation?.status === "valid"
                          ? "校验通过"
                          : serviceFailure(w)
                            ? "系统提示"
                            : "待确认"}
                        ：
                        {w.validation?.reason || "尚未校验，请重新校验后再出题"}
                      </p>
                      {w.validation?.suggestion && (
                        <p>建议：{w.validation?.suggestion}</p>
                      )}
                      {w.validation?.status !== "valid" &&
                        !serviceFailure(w) && (
                          <Link to={`${base}/words`}>
                            前往词库修改，再重新校验
                          </Link>
                        )}
                    </details>
                  </article>
                ))}
              </div>
              <div className="ai-listening-actions ai-review-footer">
                <span>
                  {session.words.some((w) => w.validation?.status === "valid")
                    ? "准备好了吗？听听这些词在场景中怎么用。"
                    : session.words.some(serviceFailure)
                      ? "服务恢复后可重新校验；单词已保留，无需因此修改词条。"
                      : "本组词条尚未通过校验，请展开详情或重新校验。"}
                </span>
                <button
                  disabled={busy}
                  onClick={() => void run(() => action("recheck"))}
                >
                  重新校验
                </button>
                <button
                  className="ai-primary-button"
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
          {!!session.questions.length && <div className="ai-question-progress"><strong>本轮进度 {completedCount} / {session.questions.length}</strong><div>{session.questions.map((q,i) => <button key={q.id} aria-label={`前往场景 ${i+1}`} aria-pressed={!showingSummary && i === activeQuestion} className={q.status === "submitted" && !q.revealed ? q.feedback?.correct ? "question-correct" : "question-wrong" : ""} onClick={() => goQuestion(i)}>{i+1}{q.status === "submitted" && !q.revealed ? q.feedback?.correct ? " ✓" : " ✕" : q.status !== "ready" ? " —" : ""}</button>)}</div><button onClick={() => { setViewResults(true); stopListeningAudio(); }}>查看本轮反馈</button></div>}
          {showingSummary && <div className="ai-round-summary"><h3>{session.status === "completed" ? "本轮练习已完成" : "本轮学习进度"}</h3><p>已完成 {completedCount} / {session.questions.length} 题 · 首次答对 {session.questions.filter(q => q.feedback?.correct && !q.revealed).length} 题</p>{session.questions.map((q,i)=><button key={q.id} onClick={()=>goQuestion(i)}>场景 {i+1} · {q.status === "ready" ? "待完成" : q.status === "skipped" ? "已跳过" : q.revealed ? "已查看答案" : q.feedback?.correct ? "回答正确" : "回答错误"}</button>)}{completedCount < session.questions.length && <button className="ai-primary-button" onClick={()=>goQuestion(Math.max(0,session.questions.findIndex(q=>q.status === "ready")))}>继续未完成的题目</button>}</div>}
          {session.questions.map((q, index) => (!showingSummary && index === activeQuestion ? (
            <article className="ai-listening-question" key={q.id}>
              <h3>
                场景 {index + 1} ·{" "}
                {q.audioMode === "dual" ? "双声对话" : "单声朗读"}
                {q.status === "submitted" && q.feedback && !retrying[q.id] && <span className={`ai-question-outcome ${q.revealed ? "neutral" : (q.attempts?.length ? q.attempts[q.attempts.length-1].correct : q.feedback.correct) ? "correct" : "wrong"}`}>{q.revealed ? "已查看答案" : (q.attempts?.length ? q.attempts[q.attempts.length-1].correct : q.feedback.correct) ? "答对了" : "答错了"}</span>}
              </h3>
              {q.status !== "submitted" && (
                <button
                  className="ai-scene-toggle"
                  aria-expanded={!!sceneHints[q.id]}
                  onClick={() =>
                    setSceneHints((current) => ({
                      ...current,
                      [q.id]: !current[q.id],
                    }))
                  }
                >
                  {sceneHints[q.id] ? "隐藏中文提示" : "查看中文提示"}
                </button>
              )}
              {q.status !== "submitted" && sceneHints[q.id] && (
                <p className="ai-scene-context">{q.scene}</p>
              )}
              <p className="ai-listening-gap">{q.gap}</p>
              <div className="ai-listening-actions">
                <button
                  className="ai-primary-button ai-play-button"
                  aria-label={playback?.qid === q.id && !playback.slow ? (playback.state === "loading" ? "正在准备音频" : "正在播放，点击停止") : "播放完整句子"}
                  title={playback?.qid === q.id && !playback.slow ? (playback.state === "loading" ? "正在准备音频" : "正在播放，点击停止") : "播放完整句子"}
                  aria-busy={playback?.qid === q.id && !playback.slow && playback.state === "loading"}
                  disabled={busy}
                  onClick={() => playback?.qid === q.id && !playback.slow ? stopListeningAudio() : void play(q.id)}
                >
                  {playback?.qid === q.id && !playback.slow ? <span aria-hidden="true" className={playback.state === "loading" ? "ai-audio-spinner" : "ai-audio-playing"}>{playback.state === "playing" && <><i /><i /><i /></>}</span> : <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    width="22"
                    height="22"
                  >
                    <path fill="currentColor" d="M8 5v14l11-7z" />
                  </svg>}
                </button>
                <button
                  className="ai-slow-button"
                  aria-label={playback?.qid === q.id && playback.slow ? (playback.state === "loading" ? "正在准备慢速音频" : "正在慢速播放，点击停止") : "慢速播放"}
                  title="慢速播放 · 0.8倍速"
                  aria-busy={playback?.qid === q.id && playback.slow && playback.state === "loading"}
                  disabled={busy}
                  onClick={() => playback?.qid === q.id && playback.slow ? stopListeningAudio() : void play(q.id, true)}
                >
                  {playback?.qid === q.id && playback.slow && <span aria-hidden="true" className={playback.state === "loading" ? "ai-audio-spinner" : "ai-audio-playing"}>{playback.state === "playing" && <><i /><i /><i /></>}</span>}
                  <span aria-hidden="true">0.8×</span>
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
                      className="ai-primary-button"
                      disabled={busy || !q.played || !answers[q.id]?.trim()}
                      onClick={() =>
                        void run(async () => {
                          await action(`questions/${q.id}/submit`, {
                            answer: answers[q.id],
                          });
                          setRetrying((v) => ({ ...v, [q.id]: false }));
                          requestAnimationFrame(() => document.getElementById(`ai-result-${q.id}`)?.scrollIntoView?.({block:"nearest"}));
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
              {q.feedback && !retrying[q.id] && (() => {
                const latest = q.attempts?.[q.attempts.length - 1];
                const correct = latest ? latest.correct : q.feedback.correct;
                const neutral = !latest && q.revealed;
                return <div id={`ai-result-${q.id}`} role="status" className={`ai-listening-feedback ai-result-${neutral ? "neutral" : correct ? "correct" : "wrong"}`}>
                  <strong className="ai-result-title">{neutral ? "已查看答案" : correct ? "✓ 回答正确" : "✕ 回答错误"}{latest ? " · 本次再练" : ""}</strong>
                  <p>你的答案：<b>{latest?.answer || q.feedback.userAnswer || "未填写"}</b></p><p>正确答案：<b>{q.feedback.answer}</b></p>
                  {latest && <small>再练不改变首次成绩：{q.feedback.correct ? "首次答对" : "首次答错"}</small>}
                  <details className="ai-answer-details"><summary>查看完整句子与解析</summary><p>{q.feedback.transcript}</p><p>{q.scene}</p><p>{q.feedback.explanation}</p>{q.feedback.wordForm && <div className="ai-word-form"><span>相关词形</span><p><strong>{q.feedback.wordForm.base}</strong> → <strong>{q.feedback.wordForm.answer}</strong><small>{q.feedback.wordForm.partSpeech}</small></p><p>{q.feedback.wordForm.relation}</p></div>}<details><summary>近义词辨析</summary><p>{readableExplanation(q.feedback.synonyms)}</p></details>{(q.attempts || []).map(attempt=><p key={attempt.sequence}>第 {attempt.sequence} 次：{attempt.answer} · {attempt.correct ? "正确" : "错误"}（不改变首次成绩）</p>)}</details>
                </div>;
              })()}
              {q.status !== "ready" && <div className="ai-listening-actions"><button className="ai-primary-button" onClick={()=>{const next=session.questions.findIndex((question,i)=>i>index && question.status === "ready"); if(next>=0)goQuestion(next);else {setViewResults(true);stageRef.current?.scrollIntoView?.({block:"start"});}}}>{session.questions.some((question,i)=>i>index && question.status === "ready") ? "下一题" : "查看本轮反馈"}</button></div>}
            </article>
          ) : null))}
        </section>
      )}
      <section className="ai-history-panel">
        <h2>学习记录与复查</h2>
        {history.sessions.length === 0 && (
          <p className="ai-empty-history">
            完成一次练习后，会在这里留下学习记录。
          </p>
        )}
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
        {history.sessions.slice((historyPage - 1) * 4, historyPage * 4).map((s) => (
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
              {s.status === "completed" ? "查看结果" : "继续练习"}
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
            <button className="ai-delete-history" disabled={busy} onClick={() => {
              if (!confirm("删除这条学习记录？将删除这一轮的题目和作答结果，不影响词库及其他记录，删除后无法恢复。")) return;
              void run(async () => {
                await safeFetch(`/ai-learning/sessions/${s.id}/remove`, {confirmed:true});
                if(session?.id===s.id){invalidate();setSession(undefined);setParams({});}
                await loadHistory(); setHistoryPage(1);
              });
            }}>删除记录</button>
          </div>
        ))}
        {history.sessions.length > 4 && <div className="ai-library-pagination"><button disabled={historyPage===1 || busy} onClick={()=>setHistoryPage(v=>v-1)}>上一页记录</button><span>第 {historyPage} / {Math.ceil(history.sessions.length/4)} 页</span><button disabled={historyPage*4>=history.sessions.length || busy} onClick={()=>setHistoryPage(v=>v+1)}>下一页记录</button></div>}
      </section>
    </div>
  );
}
