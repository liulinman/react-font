import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { createPortal } from "react-dom";
import {
  FlagOutlined,
  LeftOutlined,
  RightOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { listeningFetch, audioFetch, requestUid } from "@/aiListening/api";
import { IeltsQuestions } from "./IeltsQuestions";
import type { Attempt, History, Material } from "./types";
import "./IeltsListeningPage.css";
const root = "/ielts-listening";
const draftKey = (id: string) => `freewing:ielts:${id}`;
const remember = (id: string, value: unknown) => {
  try {
    sessionStorage.setItem(draftKey(id), JSON.stringify(value));
  } catch {
    /* Server saves remain authoritative when storage is unavailable. */
  }
};
const recall = (id: string) => {
  try {
    return JSON.parse(sessionStorage.getItem(draftKey(id)) || "null");
  } catch {
    return null;
  }
};
const kinds = [
  ["mixed", "混合题型"],
  ["completion", "表单 / 笔记 / 表格 / 流程填空"],
  ["map", "地图 / 平面图标注"],
  ["sentence", "句子填空"],
  ["short", "简答"],
  ["single", "单选"],
  ["multiple", "多选"],
  ["matching", "配对"],
];
export default function IeltsListeningPage() {
  const [params, setParams] = useSearchParams();
  const sheetRef = useRef<HTMLElement | null>(null);
  const attemptId = params.get("attempt");
  const [materials, setMaterials] = useState<Material[]>([]),
    [history, setHistory] = useState<History[]>([]),
    [loadedAttempt, setAttempt] = useState<Attempt | null>(null);
  const attempt = loadedAttempt?.id === attemptId ? loadedAttempt : null;
  const [answers, setAnswers] = useState<Record<string, string>>({}),
    [flags, setFlags] = useState<number[]>([]),
    [active, setActive] = useState(1),
    [part, setPart] = useState(1);
  const [topic, setTopic] = useState(""),
    [kind, setKind] = useState("mixed"),
    [parts, setParts] = useState("1"),
    [mode, setMode] = useState<"training" | "simulation">("training");
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(""),
    [now, setNow] = useState(() => Date.now()),
    [confirm, setConfirm] = useState(false),
    [playing, setPlaying] = useState(false),
    [slow, setSlow] = useState(false),
    [audioPreparedFor, setAudioPreparedFor] = useState<string|null>(null);
  const [submissionFrozen,setSubmissionFrozen]=useState(false);
  const [reflectionStatus, setReflectionStatus] = useState("");
  const [reviewTab, setReviewTab] = useState<"answers" | "transcript" | "audio">("answers");
  const autoSubmitting = useRef(false);
  const advancingAudio = useRef(false);
  const playbackGeneration = useRef(0);
  const audioReady=!!attempt && audioPreparedFor===attempt.id;
  const currentAttemptId=attempt?.id;
  const attemptStatus=attempt?.status;
  const submitted=!!attempt?.result;
  const deadline=attempt?.deadline;
  const totalAudioCount=attempt?.material.sections.reduce((n,s)=>n+s.audioCount,0)||0;
  const viewState=submitted?"result":attemptStatus==="ready"?"ready":"working";
  const frozenRef = useRef<{
    answers: Record<string, string>;
    flags: number[];
  } | null>(null);
  const current = useRef<Attempt | null>(null),
    answerRef = useRef(answers),
    flagRef = useRef(flags),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    urls = useRef<string[]>([]),
    audio = useRef<HTMLAudioElement | null>(null),
    index = useRef(0),
    createRequest = useRef<string | null>(null),
    mounted = useRef(true);
  const attemptRequest = useRef<{ key: string; id: string } | null>(null);
  const [filter, setFilter] = useState({
    part: "",
    kind: "",
    keyword: "",
    status: "",
    source: "",
    completion: "",
  });
  const apply = useCallback((a: Attempt) => {
    current.current = a;
    setNow(Date.now());
    setAttempt(a);
    return a;
  }, []);
  const refresh = useCallback(async () => {
    const [m, h] = await Promise.all([
      listeningFetch<Material[]>(root + "/materials"),
      listeningFetch<History[]>(root + "/attempts"),
    ]);
    setMaterials(m);
    setHistory(h);
  }, []);
  const update = useCallback(
    (event: string, extra: Record<string, unknown> = {}) => {
      const requestedId = current.current?.id;
      const task = queue.current
        .catch(() => {})
        .then(async () => {
          const a = current.current;
          if (!a || a.id !== requestedId)
            throw new Error("已离开该记录，本次操作已取消");
          const result = await listeningFetch<Attempt>(
            `${root}/attempts/${a.id}`,
            { revision: a.revision, event, ...extra },
          );
          if (mounted.current && current.current?.id === result.id)
            apply(result);
          return result;
        });
      queue.current = task;
      return task;
    },
    [apply],
  );
  const run = useCallback(async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败，请重试");
      if (!current.current) await refresh().catch(() => {});
    } finally {
      setBusy("");
    }
  },[refresh]);
  useEffect(() => {
    if (attemptId || !materials.some((m) => m.status === "preparing")) return;
    const timer = window.setInterval(() => { void refresh().catch(() => {}); }, 3000);
    return () => window.clearInterval(timer);
  }, [attemptId, materials, refresh]);
  const remove = (type: "materials" | "attempts", id: string, title: string) => {
    const message = type === "materials"
      ? `删除材料「${title}」？已有作答记录会保留，材料本身无法恢复。`
      : `删除这条「${title}」作答记录？删除后无法恢复。`;
    if (!window.confirm(message)) return;
    void run("删除中", async () => { await listeningFetch(`${root}/${type}/${id}/delete`, {}); await refresh(); });
  };
  useEffect(() => {
    mounted.current = true;
    const media=audio.current;
    return () => {
      mounted.current = false;
      playbackGeneration.current++; media?.pause();
      urls.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);
  useEffect(() => {
    let cancelled=false;
    const media=audio.current;
    void (async()=>{
      await Promise.resolve();
      if(cancelled)return;
      setAudioPreparedFor(null);
      if(!attemptId){current.current=null;setAttempt(null);setConfirm(false);playbackGeneration.current++; media?.pause();setPlaying(false);await refresh().catch(e=>setError(e.message));return;}
      setBusy("读取记录");setError("");
      try{
        const a=await listeningFetch<Attempt>(`${root}/attempts/${attemptId}`);
        if(cancelled)return;
        apply(a);setReviewTab("answers");setSlow(false);setReflectionStatus("");index.current=0;autoSubmitting.current=false;
        const local=!a.result?recall(a.id):null;
        frozenRef.current=local?.frozen?{answers:local.answers,flags:local.flags}:null;
        setSubmissionFrozen(!!local?.frozen);
        const restored=local?.answers||a.answers,restoredFlags=local?.flags||a.flags;
        answerRef.current=restored;setAnswers(restored);flagRef.current=restoredFlags;setFlags(restoredFlags);
        if(a.result)sessionStorage.removeItem(draftKey(a.id));
        setPart(a.material.sections[0]?.part||1);setActive(a.material.sections[0]?.groups[0]?.questions[0]?.id||1);
        if(!a.result&&a.status!=="ready"){await update("interrupt");if(!cancelled)setSaved("模拟已中断，答案已恢复");}
      }catch(e){if(!cancelled)setError(e instanceof Error?e.message:"记录读取失败");}
      finally{if(!cancelled)setBusy("");}
    })();
    return()=>{cancelled=true;playbackGeneration.current++; media?.pause();};
  },[attemptId,apply,refresh,update]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!currentAttemptId) return;
    let cancelled = false;
    urls.current.forEach((u) => URL.revokeObjectURL(u));
    urls.current = [];
    const count = totalAudioCount;
    (async () => {
      const list: string[] = [];
      try {
        for (let i = 0; i < count; i++) {
          const blob = await audioFetch(
            `${root}/attempts/${currentAttemptId}/audio/${i}`,
          );
          list.push(URL.createObjectURL(blob));
        }
        if (cancelled) {
          list.forEach((u) => URL.revokeObjectURL(u));
          return;
        }
        urls.current = list;
        setAudioPreparedFor(currentAttemptId);
      } catch (e) {
        list.forEach((u) => URL.revokeObjectURL(u));
        if (!cancelled)
          setError(e instanceof Error ? e.message : "音频加载失败");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentAttemptId,totalAudioCount]);
  useEffect(() => {
    if (
      !currentAttemptId ||
      submitted ||
      attemptStatus === "ready" ||
      submissionFrozen
    )
      return;
    const timer = setTimeout(() => {
      setSaved("保存中…");
      update("save", { answers: answerRef.current, flags: flagRef.current })
        .then(() => setSaved("已保存"))
        .catch((e) => {
          setSaved("尚未保存");
          setError(e.message);
        });
    }, 650);
    return () => clearTimeout(timer);
  }, [answers, flags, currentAttemptId, attemptStatus, submitted, submissionFrozen, update]);
  useEffect(() => {
    const interrupt = () => {
      const a = current.current;
      if (a && !a.result && a.status !== "ready") {
        playbackGeneration.current++; audio.current?.pause();
        setPlaying(false);
        update("interrupt").catch(() => {});
      }
    };
    const hidden = () => {
      if (document.hidden && current.current?.mode === "simulation")
        interrupt();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("pagehide", interrupt);
    return () => {
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("pagehide", interrupt);
    };
  }, [update]);
  const submit = useCallback(async () => {
    const frozen = { ...(frozenRef.current?.answers || answerRef.current) };
    const f = [...(frozenRef.current?.flags || flagRef.current)];
    frozenRef.current = { answers: frozen, flags: f };
    setSubmissionFrozen(true);
    const submittedId = current.current!.id;
    remember(submittedId, { answers: frozen, flags: f, frozen: true });
    playbackGeneration.current++; audio.current?.pause();
    setPlaying(false);
    const result = await update("submit", { answers: frozen, flags: f });
    sessionStorage.removeItem(draftKey(submittedId));
    setConfirm(false);
    setSaved("成绩已保存");
    return result;
  }, [update]);
  useEffect(() => {
    if (
      deadline &&
      !submitted &&
      now >= deadline &&
      !autoSubmitting.current
    ) {
      autoSubmitting.current = true;
      void Promise.resolve().then(()=>run("正在交卷", submit));
    }
  }, [now, deadline, submitted, submit, run]);
  useEffect(() => {
    if (viewState==="result") {
      sheetRef.current
        ?.querySelector<HTMLElement>(".ielts-results h2")
        ?.scrollIntoView?.({ block: "start" });
    } else if (currentAttemptId&&viewState==="ready") {
      sheetRef.current?.scrollIntoView?.({ block: "start" });
    } else if (currentAttemptId) {
      sheetRef.current
        ?.querySelector<HTMLElement>(".ielts-part-banner")
        ?.scrollIntoView?.({ block: "start" });
    }
  }, [currentAttemptId, viewState, part]);
  const playAt = async (i: number) => {
    const el = audio.current;
    if (!el || !urls.current[i])
      throw new Error("音频尚未就绪，请重新打开记录");
    index.current = i;
    el.src = urls.current[i];
    el.playbackRate = slow ? 0.8 : 1;
    try {
      await el.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      throw new Error("浏览器未能播放，请点击继续播放");
    }
  };
  const start = () =>
    run("开始听力", async () => {
      const a = current.current!;
      if (a.status === "ready") await update("start");
      else {
        await update("resume");
        if (
          a.mode === "training" &&
          audio.current?.src &&
          audio.current.currentTime > 0 &&
          !audio.current.ended
        ) {
          await audio.current.play();
          setPlaying(true);
          return;
        }
      }
      await playAt(Math.min(current.current!.played, urls.current.length - 1));
    });
  const ended = async () => {
    const a = current.current;
    if (!a) return;
    const generation = playbackGeneration.current;
    advancingAudio.current = true;
    try {
      if (index.current === a.played && a.status === "playing")
        await update("segment-ended", { index: index.current });
      if (current.current?.id !== a.id || playbackGeneration.current !== generation) return;
      if (index.current + 1 < urls.current.length)
        await playAt(index.current + 1);
      else setPlaying(false);
    } catch (error) {
      setPlaying(false);
      setError(error instanceof Error ? error.message : "下一段音频加载失败，请重试");
    } finally {
      advancingAudio.current = false;
    }
  };
  const prepare = async (m: Material) => {
    let next = m;
    const retryUid = m.status === "failed" ? requestUid() : undefined;
    while (next.status !== "ready") {
      setBusy(
        `准备 Part ${next.requestedParts[next.completedParts]}，已完成 ${next.completedParts}/${next.requestedParts.length}`,
      );
      next = await listeningFetch<Material>(
        `${root}/materials/${m.id}/prepare`,
        { retryUid },
      );
      setMaterials((list) => [next, ...list.filter((x) => x.id !== next.id)]);
    }
    await refresh();
  };
  const create = () =>
    run("创建材料", async () => {
      createRequest.current ||= requestUid();
      const m = await listeningFetch<Material>(root + "/materials", {
        requestId: createRequest.current,
        ...(topic.trim() ? { topic: topic.trim() } : {}),
        kind,
        parts: parts === "full" ? "full" : "single",
        part: Number(parts) || 1,
      });
      createRequest.current = null;
      setMaterials((list) => [m, ...list.filter((x) => x.id !== m.id)]);
      await prepare(m);
    });
  const openMaterial = (m: Material, selectedMode = mode) =>
    run("创建作答记录", async () => {
      const key = m.id + ":" + selectedMode;
      if (attemptRequest.current?.key !== key)
        attemptRequest.current = { key, id: requestUid() };
      const a = await listeningFetch<Attempt>(root + "/attempts", {
        requestId: attemptRequest.current.id,
        materialId: m.id,
        mode: selectedMode,
      });
      attemptRequest.current = null;
      setParams({ attempt: a.id });
    });
  const change = (id: number, v: string) => {
    const next = { ...answerRef.current, [id]: v };
    answerRef.current = next;
    setAnswers(next);
    if (current.current)
      remember(current.current.id, {
        answers: next,
        flags: flagRef.current,
        frozen: false,
      });
    setSaved("尚未保存");
  };
  const toggleFlag = () => {
    const next = flagRef.current.includes(active)
      ? flagRef.current.filter((i) => i !== active)
      : [...flagRef.current, active];
    flagRef.current = next;
    setFlags(next);
    if (current.current)
      remember(current.current.id, {
        answers: answerRef.current,
        flags: next,
        frozen: false,
      });
  };
  const jump = (id: number) => {
    setActive(id);
    const section = attempt?.material.sections.find((s) =>
      s.groups.some((g) => g.questions.some((q) => q.id === id)),
    );
    if (section) setPart(section.part);
    setTimeout(() => document.getElementById(`ielts-answer-${id}`)?.focus(), 0);
  };
  const all =
    attempt?.material.sections.flatMap((s) =>
      s.groups.flatMap((g) => g.questions),
    ) || [];
  const section = attempt?.material.sections.find((s) => s.part === part);
  const remaining = attempt?.deadline
    ? Math.max(0, Math.ceil((attempt.deadline - now) / 1000))
    : null;
  const invalidSim =
    attempt?.mode === "simulation" &&
    (attempt.interrupted ||
      attempt.assists.replays > 0 ||
      attempt.assists.slow);
  const filteredMaterials = materials
                .filter(
                  (m) =>
                    (!filter.keyword ||
                      `${m.title} ${m.topic || ""}`
                        .toLowerCase()
                        .includes(filter.keyword.toLowerCase())) &&
                    (!filter.part ||
                      m.requestedParts.includes(Number(filter.part))) &&
                    (!filter.kind ||
                      m.sections.some((s) =>
                        s.groups.some((g) => g.kind === filter.kind),
                      )) &&
                    (!filter.source || m.source === filter.source) &&
                    (!filter.completion || m.completed === (filter.completion === "completed")) &&
                    (!filter.status ||
                      (filter.status === "ready"
                        ? m.status === "ready"
                        : m.status !== "ready")),
                );
  return (
    <main
      ref={sheetRef}
      className={`ielts-listening${attempt ? " is-sheet" : " is-preparation"}`}
    >
      <audio
        ref={audio}
        onEnded={ended}
        onPause={() => { if (!advancingAudio.current) setPlaying(false); }}
        onPlay={() => setPlaying(true)}
        onError={() => {
          if (current.current?.status !== "ready" && !current.current?.result) {
            setError("音频播放中断，答案保留。可恢复播放，本次标记为中断。");
            update("interrupt").catch(() => {});
          }
          setPlaying(false);
        }}
      />
      <header className="ielts-top">
        <div>
          <h1>雅思听力</h1>
          <p>
            {attempt
              ? `${attempt.material.title} · ${attempt.mode === "simulation" ? "考试模拟" : "专项训练"}`
              : "按雅思题型听音、作答与复盘"}
          </p>
        </div>
        {attempt && (
          <button
            onClick={() => {
              setParams({});
            }}
          >
            返回材料与记录
          </button>
        )}
      </header>
      {(error || reflectionStatus) && createPortal(
        <div className="ielts-feedback">
          {error && <div className="ielts-error" role="alert">
            {error}
            <button onClick={() => setError("")} aria-label="关闭错误提示">关闭</button>
          </div>}
          {reflectionStatus && <p className="ielts-reflection-status" role="status" aria-live="polite">{reflectionStatus}</p>}
        </div>, document.body,
      )}
      {busy && (
        <p role="status" className="ielts-progress">
          {busy}…
        </p>
      )}
      {!attempt && !attemptId && (
        <>
          <section className="ielts-create" aria-labelledby="ielts-prepare-title">
            <div className="ielts-section-heading">
              <h2 id="ielts-prepare-title">准备一份听力材料</h2>
              <p>选择练习范围，按雅思题型听音作答。</p>
            </div>
            <fieldset className="ielts-part-picker">
              <legend>练习范围</legend>
              <div className="ielts-part-options">
                {[
                  ["1", "Part 1", "生活对话 · 10题"],
                  ["2", "Part 2", "场所介绍 · 10题"],
                  ["3", "Part 3", "学习讨论 · 10题"],
                  ["4", "Part 4", "学术独白 · 10题"],
                  ["full", "四部分", "完整模拟 · 40题"],
                ].map(([value, title, description]) => (
                  <button type="button" key={value} aria-label={`${title} ${description}`} aria-pressed={parts === value}
                    onClick={() => { setParts(value); createRequest.current = null; }}>
                    <strong>{title}</strong><span>{description}</span>
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="ielts-setup-fields">
              <label>题型
                <select value={kind} onChange={event => { setKind(event.target.value); createRequest.current = null; }}>
                  {kinds.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </select>
              </label>
              <label>作答模式
                <select value={mode} onChange={event => setMode(event.target.value as typeof mode)}>
                  <option value="training">专项训练 · 可重听、慢速</option>
                  <option value="simulation">考试模拟 · 音频一次播放</option>
                </select>
              </label>
              <label>主题（选填）
                <input value={topic} maxLength={80} placeholder="例如：校园参观；留空由 AI 选择"
                  onChange={event => {setTopic(event.target.value); createRequest.current = null;}} />
              </label>
            </div>
            <div className="ielts-prepare-action">
              <p>AI 原创模拟，时长和难度不代表正式考试。生成与配音会消耗用量，准备好后再开始作答。</p>
              <button className="ielts-primary" disabled={!!busy} onClick={create}>生成原创材料</button>
            </div>
          </section>
          <section className="ielts-library" aria-labelledby="ielts-library-title">
            <div className="ielts-section-heading">
              <h2 id="ielts-library-title">我的材料与公共题库</h2>
              <p>最近50份可访问材料，准备中的材料可继续或重试。</p>
            </div>
            <div className="ielts-library-tools">
            <div className="ielts-library-primary">
              <label>
                搜索材料或主题
                <input
                  value={filter.keyword}
                  onChange={(e) =>
                    setFilter((v) => ({ ...v, keyword: e.target.value }))
                  }
                />
              </label>
              <label>
                筛选部分
                <select
                  value={filter.part}
                  onChange={(e) =>
                    setFilter((v) => ({ ...v, part: e.target.value }))
                  }
                >
                  <option value="">所有部分</option>
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      Part {n}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                筛选题型
                <select
                  value={filter.kind}
                  onChange={(e) =>
                    setFilter((v) => ({ ...v, kind: e.target.value }))
                  }
                >
                  <option value="">所有题型</option>
                  {kinds
                    .filter((k) => k[0] !== "mixed")
                    .map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <details className="ielts-extra-filters">
              <summary>更多筛选{[filter.source, filter.completion, filter.status].filter(Boolean).length > 0 ? `（${[filter.source, filter.completion, filter.status].filter(Boolean).length}）` : ""}</summary>
              <div className="ielts-form-grid">
              <label>
                来源
                <select
                  value={filter.source}
                  onChange={(e) =>
                    setFilter((v) => ({ ...v, source: e.target.value }))
                  }
                >
                  <option value="">所有来源</option>
                  {[...new Set(materials.map((m) => m.source))].map(
                    (source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <label>
                完成状态
                <select value={filter.completion} onChange={event => setFilter(value => ({...value, completion: event.target.value}))}>
                  <option value="">全部完成状态</option>
                  <option value="completed">已完成</option>
                  <option value="uncompleted">未完成</option>
                </select>
              </label>
              <label>
                材料状态
                <select
                  value={filter.status}
                  onChange={(e) =>
                    setFilter((v) => ({ ...v, status: e.target.value }))
                  }
                >
                  <option value="">全部状态</option>
                  <option value="ready">可作答</option>
                  <option value="incomplete">准备中 / 待重试</option>
                </select>
              </label>
              </div>
            </details>
            </div>
            {!materials.length && !busy && (
              <p>暂无材料，生成一份原创材料开始练习。</p>
            )}
            {!filteredMaterials.length && materials.length > 0 && <p>没有符合筛选条件的材料。</p>}
            <ul className="ielts-records">
              {filteredMaterials
                .map((m) => (
                  <li key={m.id}>
                    <div>
                      <strong>{m.title}</strong>
                      <p>
                        {m.source}{m.completed === true ? " · 已完成" : m.completed === false ? " · 未完成" : ""} ·{" "}
                        {Math.round(
                          m.sections.reduce(
                            (n, s) => n + (s.audioSeconds || 0),
                            0,
                          ),
                        )}{" "}
                        秒 ·{" "}
                        {m.sections.reduce(
                          (n, s) =>
                            n +
                            s.groups.reduce(
                              (v, g) => v + g.questions.length,
                              0,
                            ),
                          0,
                        )}
                        题 ·{" "}
                        {m.status === "ready"
                          ? "可作答"
                          : `已准备 ${m.completedParts}/${m.requestedParts.length} 部分`}
                      </p>
                      {m.error && <p className="ielts-error-text">{m.error}</p>}
                    </div>
                    <div className="ielts-record-actions">
                    {m.status === "ready" ? (
                      <button disabled={!!busy} onClick={() => openMaterial(m)}>
                        开始作答
                      </button>
                    ) : m.status === "preparing" && !m.canResume ? (
                      <span role="status">正在准备，页面会自动更新</span>
                    ) : m.canPrepare ? (
                      <button
                        disabled={!!busy}
                        onClick={() => run("继续准备", () => prepare(m))}
                      >
                        {m.status === "failed"
                          ? "重试准备（可能新增用量）"
                          : "继续准备"}
                      </button>
                    ) : null}
                    {m.owner && <button disabled={!!busy || m.status === "preparing"} onClick={() => remove("materials", m.id, m.title)}>删除</button>}
                    </div>
                  </li>
                ))}
            </ul>
          </section>
          <section className="ielts-history" aria-labelledby="ielts-history-title">
            <div className="ielts-section-heading">
              <h2 id="ielts-history-title">作答记录</h2>
              <p>最近50次作答；同题重练与原记录分别保留。</p>
            </div>
            {!history.length && <p>完成或中断的作答会保留在这里。</p>}
            <ul className="ielts-records">
              {history.map((h) => (
                <li key={h.id}>
                  <div>
                    <strong>{h.title}</strong>
                    <p>
                      {h.mode === "simulation" ? "考试模拟" : "专项训练"} ·{" "}
                      {h.status === "submitted"
                        ? `${h.score}/${h.total}`
                        : "未交卷"}
                      {h.interrupted ? " · 已中断" : ""}
                    </p>
                  </div>
                  <div className="ielts-record-actions">
                    <button onClick={() => setParams({ attempt: h.id })}>
                      {h.status === "submitted" ? "查看结果" : "继续作答"}
                    </button>
                    <button disabled={!!busy} onClick={() => remove("attempts", h.id, h.title)}>删除</button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      {attemptId && !attempt && <p role="status" className="ielts-record-loading">正在读取作答记录…</p>}
      {attempt && !attempt.result && (
        <>
          <div className="ielts-session-status">
            <span>
              <SoundOutlined />{" "}
              {playing
                ? "音频正在播放"
                : audioReady
                  ? "音频已就绪"
                  : "音频准备中"}
            </span>
            <span aria-live="polite">{saved}</span>
            {remaining !== null && (
              <strong>
                检查时间 {Math.floor(remaining / 60)}:
                {String(remaining % 60).padStart(2, "0")}
              </strong>
            )}
            {attempt.interrupted && <span>已中断 · 可继续练习</span>}
          </div>
          <div className="ielts-audio-actions">
            {attempt.status === "ready" ? (
              <>
                <p>
                  {attempt.mode === "simulation"
                    ? "开始后音频只播放一次，不能暂停、倒带或慢速。播放结束有2分钟检查。"
                    : "可暂停、重听和使用0.8倍速；辅助使用会单独记录。"}
                </p>
                <button
                  className="ielts-primary"
                  disabled={!audioReady || !!busy}
                  onClick={start}
                >
                  开始听力
                </button>
              </>
            ) : (
              <>
                {!playing && attempt.status === "playing" && (
                  <button disabled={!audioReady || !!busy} onClick={start}>
                    继续播放
                    {attempt.mode === "simulation" ? "（标记中断）" : ""}
                  </button>
                )}
                {attempt.mode === "training" && (
                  <>
                    <button
                      disabled={!audioReady || !!busy}
                      onClick={() =>
                        run("播放", async () => {
                          if (playing) {
                            playbackGeneration.current++; audio.current?.pause();
                            setPlaying(false);
                          } else {
                            await update("assist", { replay: true });
                            await playAt(index.current);
                          }
                        })
                      }
                    >
                      {playing ? "暂停" : "重听当前段"}
                    </button>
                    <button
                      aria-pressed={slow}
                      onClick={() =>
                        run("切换语速", async () => {
                          await update("assist", { slow: !slow });
                          setSlow(!slow);
                          if (audio.current)
                            audio.current.playbackRate = !slow ? 0.8 : 1;
                        })
                      }
                    >
                      {slow ? "恢复1.0×" : "0.8× 慢速"}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
          {section && (
            <>
              <div className="ielts-part-banner">
                <h2>Part {section.part}</h2>
                <p>
                  Listen and answer questions{" "}
                  {section.groups[0]?.questions[0]?.id}–
                  {section.groups.at(-1)?.questions.at(-1)?.id}.
                </p>
              </div>
              {section.groups.map((g, i) => (
                <IeltsQuestions
                  key={`${section.part}-${i}`}
                  group={g}
                  answers={answers}
                  onChange={change}
                  active={active}
                  onActive={setActive}
                  disabled={
                    attempt.status === "ready" ||
                    submissionFrozen ||
                    (!!busy && busy === "正在交卷") ||
                    remaining === 0
                  }
                />
              ))}
            </>
          )}
          {confirm && (
            <section
              className="ielts-confirm"
              role="region"
              aria-label="交卷检查"
            >
              <h2>检查后交卷</h2>
              <p>
                还有 {all.filter((q) => !answers[q.id]?.trim()).length}{" "}
                题未答。交卷后本次答案和分数将保存。
              </p>
              <button onClick={() => setConfirm(false)}>返回检查</button>
              <button
                className="ielts-primary"
                disabled={!!busy}
                onClick={() => run("正在交卷", submit)}
              >
                确认交卷
              </button>
            </section>
          )}
          <footer className="ielts-question-nav">
            <div className="ielts-number-list" aria-label="题号导航">
              {attempt.material.sections.map((s) => (
                <div key={s.part}>
                  <strong>Part {s.part}</strong>
                  {s.groups
                    .flatMap((g) => g.questions)
                    .map((q) => (
                      <button
                        key={q.id}
                        className={`${answers[q.id]?.trim() ? " is-answered" : ""}${active === q.id ? " is-current" : ""}`}
                        aria-label={`第${q.id}题${flags.includes(q.id) ? " 已标记" : ""}${answers[q.id]?.trim() ? " 已答" : " 未答"}`}
                        aria-current={active === q.id ? "step" : undefined}
                        onClick={() => jump(q.id)}
                      >
                        {q.id}
                        {flags.includes(q.id) && <FlagOutlined />}
                      </button>
                    ))}
                </div>
              ))}
            </div>
            <div className="ielts-nav-actions">
              <button
                aria-label="上一题"
                disabled={all.findIndex((q) => q.id === active) <= 0}
                onClick={() =>
                  jump(all[all.findIndex((q) => q.id === active) - 1].id)
                }
              >
                <LeftOutlined />
              </button>
              <button
                aria-label="下一题"
                disabled={
                  all.findIndex((q) => q.id === active) >= all.length - 1
                }
                onClick={() =>
                  jump(all[all.findIndex((q) => q.id === active) + 1].id)
                }
              >
                <RightOutlined />
              </button>
              <button
                disabled={submissionFrozen}
                aria-pressed={flags.includes(active)}
                onClick={toggleFlag}
              >
                <FlagOutlined /> 标记
              </button>
              <button
                className="ielts-primary"
                disabled={attempt.status === "ready" || !!busy}
                onClick={() => setConfirm(true)}
              >
                检查并交卷
              </button>
            </div>
          </footer>
        </>
      )}
      {attempt?.result && (
        <section className="ielts-results">
          <h2>
            本次结果 {attempt.result.score} / {attempt.result.total}
          </h2>
          <p>
            {attempt.mode === "training"
              ? "专项训练"
              : invalidSim
                ? "已中断模拟，不计严格一次听成绩"
                : "一次播放模拟（按播放器记录）"}{" "}
            · 原创练习成绩，不是官方 Band。
            {attempt.assists.replays > 0
              ? ` 重听 ${attempt.assists.replays} 次。`
              : ""}
            {attempt.assists.slow ? " 使用过慢速。" : ""}
          </p>
          <div className="ielts-result-actions">
            <button
              className="ielts-primary"
              disabled={!!busy}
              onClick={() => openMaterial(attempt.material, attempt.mode)}
            >
              同题再练（保留本次成绩）
            </button>
            <button onClick={() => setParams({})}>生成同类新题</button>
            <Link to="/englishWorld/words">前往词库收集生词</Link>
            <Link to="/englishWorld/knowledge-notes">整理复盘笔记</Link>
          </div>
          <nav className="ielts-review-tabs" aria-label="复盘内容">
            {([["answers", "答题解析"], ["transcript", "原文"], ["audio", "回听"]] as const).map(([id, label]) => (
              <button key={id} type="button" aria-pressed={reviewTab === id} onClick={() => {playbackGeneration.current++; audio.current?.pause();setPlaying(false);setReviewTab(id);}}>{label}</button>
            ))}
          </nav>
          {reviewTab === "answers" && <div aria-label="答题解析">
          <p>错因由你自行选择，仅用于复盘，不改变首次成绩。</p>
          <ol className="ielts-result-list">
            {attempt.result.items.map((q) => (
              <li key={q.id} value={q.id}>
                <strong>
                  {q.correct ? "正确" : "未答或错误"} · {q.reason}
                </strong>
                <p>
                  我的答案：{q.answer || "未作答"} 标准答案：
                  {q.accepted.join(" / ")}
                </p>
                <blockquote>{q.evidence}</blockquote>
                <p>中文解释：{q.explanation || "暂不可用"}</p>
                <label htmlFor={`ielts-reflection-${q.id}`}>第{q.id}题 自选错因</label>{" "}
                <select
                  id={`ielts-reflection-${q.id}`}
                  aria-label={`第${q.id}题 自选错因`}
                  value={attempt.reflections?.[q.id] || ""}
                  disabled={!!busy}
                  onChange={(event) => {
                    const cause = event.target.value;
                    void run("保存复盘", async () => {
                      setReflectionStatus(`第${q.id}题错因保存中…`);
                      try {
                        await update("reflect", { questionId: q.id, cause });
                        setReflectionStatus(`第${q.id}题错因已保存`);
                      } catch (error) {
                        setReflectionStatus(`第${q.id}题错因尚未保存，请重新选择重试`);
                        throw error;
                      }
                    });
                  }}
                >
                  <option value="">未选择</option>
                  {["听不出", "词不认识", "跟丢", "定位错误"].map(cause => <option key={cause} value={cause}>{cause}</option>)}
                </select>
                {q.accepted
                  .filter((word) => /^[a-z][a-z -]*$/i.test(word))
                  .map((word) => (
                    <Link
                      key={word}
                      to={`/englishWorld/words?englishWord=${encodeURIComponent(word)}&listeningAttempt=${attempt.id}`}
                    >
                      在词库查找并收集 {word}
                    </Link>
                  ))}
              </li>
            ))}
          </ol>
          </div>}
          {reviewTab === "transcript" && <section aria-label="原文">
          <h2>听力原文</h2>
          {attempt.result.sections.map((s) => (
            <details key={s.part}>
              <summary>
                Part {s.part} · {s.title}
              </summary>
              <p className="ielts-transcript">{s.transcript?.trim() || "本部分原文暂不可用，请使用整段回听。"}</p>
            </details>
          ))}
          </section>}
          {reviewTab === "audio" && <section aria-label="回听">
          <h2>音频回听</h2>
          <p>当前提供整段回听；尚无经核实的逐题时间定位。</p>
          <div className="ielts-replay-list">
            {Array.from({length:totalAudioCount},(_, i) => (
              <button
                key={i}
                disabled={!audioReady || !!busy}
                onClick={() => run("回听", () => playAt(i))}
              >
                回听第{i + 1}段
              </button>
            ))}
          </div>
          <button disabled={!playing} onClick={() => {playbackGeneration.current++; audio.current?.pause();setPlaying(false);}}>停止播放</button>
          </section>}
        </section>
      )}
    </main>
  );
}
