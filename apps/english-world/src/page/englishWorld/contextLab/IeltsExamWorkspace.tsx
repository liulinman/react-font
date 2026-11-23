import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { ExamTask, ExamSubmission, ExamResult } from "./examWorkspace.types";
import { isTextQuestion, examOptionLabel } from "./examWorkspace.types";
import { SentenceAnswer, hasReadingAnswer, exceedsWordLimit } from "../../../readingPractice/SentenceAnswer";
import {
  examElapsedSeconds,
  examQuestionId,
  examRemainingSeconds,
  examStorageKey,
  newExamDraft,
  restoreExamDraft,
  type ExamAnnotation,
  type ExamDraft,
} from "./ieltsExamState";
import "./ieltsExam.css";

type Props = {
  task: ExamTask;
  userId: number;
  onSubmit: (params: ExamSubmission) => Promise<ExamResult>;
  storageNamespace?: string;
  allowRestart?: boolean;
  initialResult?: ExamResult | null;
  renderQuestionFooter?: (questionId: string) => ReactNode;
  resultDetails?: ReactNode;
  initialAnswers?: Record<string, number | string>;
  onStart?: () => Promise<void>;
  defaultDuration?: number;
  onExit: () => void;
};
import {
  ExamAnnotationText as AnnotatedText,
  type ExamTextSelection as Selection,
  type AnnotationAnchor,
} from "./ExamAnnotationText";
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function IeltsExamWorkspace({ task, userId, onSubmit, onExit, storageNamespace = "context-lab", allowRestart = true, initialResult, initialAnswers, onStart, defaultDuration = 20, renderQuestionFooter, resultDetails }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const storageKey = examStorageKey(userId, task.taskId, storageNamespace);
  const [storageError, setStorageError] = useState(false);
  const [draft, setDraft] = useState<ExamDraft>(() => {
    let restored = newExamDraft(task);
    try { restored = restoreExamDraft(localStorage.getItem(storageKey), task); } catch { /* Continue in memory when browser storage is unavailable. */ }
    if (initialResult) {
      const time = Date.now();
      return { ...restored, answers: initialAnswers ?? restored.answers, result: initialResult, startedAt: restored.startedAt ?? time, deadline: restored.deadline ?? time + defaultDuration * 60000, endedAt: restored.endedAt ?? time };
    }
    if (!allowRestart || initialResult === null) restored.result = null;
    return { ...restored, answers: { ...initialAnswers, ...restored.answers } };
  });
  const [historicalWithoutTiming] = useState(() => !!initialResult && draft.startedAt === draft.endedAt);
  const draftRef = useRef(draft);
  const [now, setNow] = useState(Date.now);
  const [duration, setDuration] = useState(defaultDuration);
  const [active, setActive] = useState(0);
  const [mobilePane, setMobilePane] = useState<"passage" | "questions">("passage");
  const [fontSize, setFontSize] = useState(18);
  const [contrast, setContrast] = useState(false);
  const [split, setSplit] = useState(50);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [note, setNote] = useState("");
  const [annotationMode, setAnnotationMode] = useState<"menu" | "note" | null>(
    null,
  );
  const [annotationId, setAnnotationId] = useState<string>();
  const [anchor, setAnchor] = useState<AnnotationAnchor>({
    left: 20,
    top: 100,
  });
  const [utility, setUtility] = useState<"help" | "hide" | null>(null);
  const [annotationNotice, setAnnotationNotice] = useState("");
  const [confirm, setConfirm] = useState<
    "submit" | "exit" | "restart" | "clear_annotations" | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const timeoutAttempted = useRef(false);
  const questionRefs = useRef<(HTMLElement | null)[]>([]);
  const questions = task.questions ?? [];
  const remaining = examRemainingSeconds(draft, now);
  const started = draft.startedAt !== null;
  const locked =
    draft.endedAt !== null || (started && remaining === 0) || submitting;
  const answeredCount = questions.filter(
    (_, i) => hasReadingAnswer(draft.answers[examQuestionId(task, i)]),
  ).length;

  const update = (next: ExamDraft) => {
    draftRef.current = next;
    setDraft(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError(false);
      return true;
    } catch {
      setStorageError(true);
      return false;
    }
  };
  const editable = () =>
    draftRef.current.startedAt !== null &&
    draftRef.current.endedAt === null &&
    Date.now() < draftRef.current.deadline! &&
    !inFlight.current;
  const jump = (index: number) => {
    setMobilePane("questions");
    setActive(index);
    questionRefs.current[index]?.scrollIntoView?.({
      block: "start",
      behavior: "smooth",
    });
    questionRefs.current[index]?.focus({ preventScroll: true });
  };
  const overLimit = questions.some((q, i) => isTextQuestion(q) && exceedsWordLimit(draft.answers[examQuestionId(task, i)], q.maxWords));
  const send = async () => {
    if (
      inFlight.current ||
      draftRef.current.result ||
      draftRef.current.startedAt === null
    )
      return;
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    setConfirm(null);
    setSelection(null);
    const frozen = {
      ...draftRef.current,
      endedAt:
        draftRef.current.endedAt ??
        Math.min(Date.now(), draftRef.current.deadline!),
    };
    update(frozen);
    try {
      const result = await onSubmit({
        sessionId: task.articleExerciseId ?? task.taskId,
        elapsedSeconds: examElapsedSeconds(frozen, Date.now()),
        allowUnanswered: true,
        answers: questions.map((_, index) => {
          const questionId = examQuestionId(task, index);
          const answer = frozen.answers[questionId];
          return !hasReadingAnswer(answer)
            ? { questionId, unanswered: true as const }
            : typeof answer === "string" ? { questionId, answerText: answer } : { questionId, selectedIndex: answer as number };
        }),
      });
      // Another tab may already have submitted this one-attempt paper. Display
      // exactly the answers the server graded, including its unanswered entries.
      const answers: ExamDraft["answers"] = {};
      for (const item of result.results) {
        const question = questions.find(q => q.id === item.questionId);
        if (!question) continue;
        if (isTextQuestion(question)) {
          if (typeof item.answerText === "string" && item.answerText.trim()) answers[item.questionId] = item.answerText;
        } else if (typeof item.userSelectedIndex === "number") {
          answers[item.questionId] = item.userSelectedIndex;
        }
      }
      update({ ...frozen, answers, result });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "交卷失败，请重试");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };
  const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(() => {
    if (mobilePane === "questions") {
      questionRefs.current[activeRef.current]?.scrollIntoView?.({ block: "start" });
    }
  }, [mobilePane]);
  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    if (!started || draft.result || draft.endedAt !== null) return;
    const tick = () => setNow(Date.now());
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, [started, draft.result, draft.endedAt]);
  useEffect(() => {
    if (
      started &&
      remaining === 0 &&
      draft.endedAt === null &&
      !draft.result &&
      !timeoutAttempted.current
    ) {
      timeoutAttempted.current = true;
      void sendRef.current();
    }
  }, [started, remaining, draft.endedAt, draft.result]);
  useEffect(() => {
    if (!started || draft.result) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [started, draft.result]);

  useEffect(() => {
    const blockFind = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("keydown", blockFind, true);
    return () => window.removeEventListener("keydown", blockFind, true);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    root?.focus();
    const siblings = Array.from(document.body.children).filter(
      (node) => node !== root && !node.contains(root),
    );
    const previousInert = siblings.map((node) => node.hasAttribute("inert"));
    siblings.forEach((node) => node.setAttribute("inert", ""));
    return () => {
      siblings.forEach((node, i) => {
        if (!previousInert[i]) node.removeAttribute("inert");
      });
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    if (!utility && !confirm) return;
    const children = Array.from(rootRef.current?.children || []).filter(
      (node) => !node.classList.contains("ielts-exam-overlay"),
    );
    const prior = children.map((node) => node.hasAttribute("inert"));
    children.forEach((node) => node.setAttribute("inert", ""));
    return () =>
      children.forEach((node, index) => {
        if (!prior[index]) node.removeAttribute("inert");
      });
  }, [utility, confirm]);

  const start = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError("");
    try {
      if (onStart) await onStart();
      const time = Date.now();
      setNow(time);
      setAnnotationNotice("");
      update({
        ...draftRef.current,
        startedAt: time,
        deadline: time + duration * 60000,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "开始失败，请重试");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };
  const positionAnnotation = (point: AnnotationAnchor) => {
    const footer = rootRef.current
      ?.querySelector(".ielts-exam-footer")
      ?.getBoundingClientRect();
    const bottom = footer?.top || window.innerHeight - 16;
    setAnchor({
      left: Math.max(12, Math.min(point.left, window.innerWidth - 372)),
      top: Math.max(12, Math.min(point.top + 8, bottom - 280)),
    });
  };
  const selectText = (value: Selection, point: AnnotationAnchor) => {
    if (!editable()) return;
    setSelection(value);
    positionAnnotation(point);
    setAnnotationMode("menu");
    setAnnotationId(undefined);
    setAnnotationNotice("");
  };
  const openAnnotation = (
    value: ExamAnnotation,
    point: AnnotationAnchor,
    menu: boolean,
  ) => {
    setSelection({
      block: value.block,
      start: value.start,
      end: value.end,
      text: value.text,
    });
    setAnnotationId(value.id);
    setNote(value.note);
    positionAnnotation(point);
    setAnnotationMode(menu && !locked ? "menu" : "note");
  };
  const writeAnnotation = (
    kind: "highlight" | "note",
    value: string,
    id = annotationId,
  ) => {
    if (!selection || !editable()) return undefined;
    const existing =
      draftRef.current.annotations.find((a) => a.id === id) ||
      draftRef.current.annotations.find(
        (a) =>
          a.block === selection.block &&
          a.start === selection.start &&
          a.end === selection.end,
      );
    const nextId =
      existing?.id ??
      globalThis.crypto?.randomUUID?.() ??
      `annotation-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const annotation: ExamAnnotation = {
      ...selection,
      id: nextId,
      note: value,
      kind,
    };
    const persisted = update({
      ...draftRef.current,
      annotations: [
        ...draftRef.current.annotations.filter((a) => a.id !== nextId),
        annotation,
      ],
    });
    setAnnotationId(nextId);
    setAnnotationNotice(
      persisted
        ? kind === "note"
          ? "笔记已保存"
          : "高亮已保存"
        : "标注已保留在当前页面，无法写入本机，请勿关闭页面。",
    );
    return nextId;
  };
  const openNoteEditor = () => {
    const existing =
      draftRef.current.annotations.find((a) => a.id === annotationId) ||
      draftRef.current.annotations.find(
        (a) =>
          a.block === selection?.block &&
          a.start === selection?.start &&
          a.end === selection?.end,
      );
    const overlappingNote =
      !(existing?.kind === "note" || existing?.note) &&
      selection &&
      draftRef.current.annotations.find(
        (a) =>
          a.block === selection.block &&
          a.end > selection.start &&
          a.start < selection.end &&
          (a.note || a.kind === "note"),
      );
    if (overlappingNote) {
      openAnnotation(
        overlappingNote,
        { left: anchor.left, top: anchor.top - 8 },
        false,
      );
      setAnnotationNotice("此处已有笔记，已打开原笔记");
      window.getSelection()?.removeAllRanges();
      return;
    }
    const value = existing?.note || "";
    if (writeAnnotation("note", value, existing?.id)) {
      window.getSelection()?.removeAllRanges();
      setNote(value);
      setAnnotationMode("note");
    }
  };
  const clearSelected = () => {
    if (!selection || !editable()) return;
    update({
      ...draftRef.current,
      annotations: draftRef.current.annotations.filter(
        (a) =>
          a.block !== selection.block ||
          a.end <= selection.start ||
          a.start >= selection.end,
      ),
    });
    setAnnotationMode(null);
    setSelection(null);
    setAnnotationNotice("所选标注已清除");
    window.getSelection()?.removeAllRanges();
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="雅思机考模式"
      tabIndex={-1}
      onKeyDown={(event) => {
        if (event.key === "Escape" && annotationMode) {
          setAnnotationMode(null);
          setSelection(null);
          return;
        }
        if (event.key !== "Tab" || confirm || utility) return;
        const elements = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
          ),
        );
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === rootRef.current)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      onPointerDown={(event) => {
        if (
          !(event.target as Element).closest(
            ".ielts-exam-annotation-editor, .ielts-exam-annotation-menu, mark",
          )
        ) {
          setAnnotationMode(null);
        }
      }}
      className={`ielts-exam${contrast ? " ielts-exam-contrast" : ""}`}
      style={
        {
          "--exam-font-size": `${fontSize}px`,
          "--surface": "var(--exam-paper)",
          "--exam-split": `${split}%`,
        } as CSSProperties
      }
    >
      <header className="ielts-exam-header">
        <div>
          <strong>IELTS Reading</strong>
          <span>普通雅思学术类 · 单篇训练</span>
        </div>
        {started && (
          <div
            onPointerDown={(event) => {
              if (
                !(event.target as Element).closest(
                  ".ielts-exam-annotation-editor, .ielts-exam-annotation-menu, mark",
                )
              ) {
                setAnnotationMode(null);
              }
            }}
            className={`ielts-exam-clock${remaining <= 300 ? " is-urgent" : ""}${((remaining <= 600 && remaining > 595) || (remaining <= 300 && remaining > 295)) ? " is-time-warning" : ""}`}
            role="timer"
            aria-label="剩余时间"
          >
            {historicalWithoutTiming ? "--:--" : clock(remaining)}
            <small>{draft.result ? "已交卷" : "剩余时间"}</small>
          </div>
        )}
        <div className="ielts-exam-header-actions">
          {started && (
            <button
              onClick={() => {
                setAnnotationMode(null);
                setUtility("hide");
              }}
            >
              Hide
            </button>
          )}
          <button
            onClick={() => {
              setAnnotationMode(null);
              setUtility("help");
            }}
          >
            Help
          </button>
          <button
            onClick={() =>
              started && !draft.result ? setConfirm("exit") : onExit()
            }
            disabled={submitting}
          >
            退出考试界面
          </button>
        </div>
      </header>
      {storageError && (
        <p role="alert" className="ielts-exam-warning">
          无法保存到本机，请勿刷新或关闭页面。当前答案仍保留在页面中。
        </p>
      )}
      {error && !started && <p role="alert" className="ielts-exam-warning">{error}</p>}
      {!started ? (
        <section className="ielts-exam-intro">
          <span className="ielts-exam-eyebrow">
            READING • COMPUTER PRACTICE
          </span>
          <h1>{task.title || "准备开始阅读考试"}</h1>
          <p>
            本练习包含 1 篇文章、{questions.length} 道题。完整雅思阅读考试为
            60 分钟、3 个部分、40 题；当前是单篇模拟。
          </p>
          <ul>
            <li>左侧阅读文章，右侧作答；底部题号可直接跳转。</li>
            <li>
              选中文章、题干或选项文字可高亮、添加笔记；不确定的题可以标记待检查。
            </li>
            <li>
              开始后不暂停计时。刷新、退出界面后仍继续计时；到时锁定答案并尝试交卷。
            </li>
            <li>
              未答题计为错误。答案和笔记自动保存在当前浏览器，交卷后显示解析。
            </li>
          </ul>
          <label>
            本次限时{" "}
            <select
              aria-label="本次限时"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              <option value={20}>20 分钟（单篇建议）</option>
              <option value={10}>10 分钟</option>
              <option value={30}>30 分钟</option>
              <option value={60}>60 分钟（单篇延长练习）</option>
            </select>
          </label>
          <button
            className="ielts-exam-primary"
            onClick={start}
            disabled={!questions.length || submitting}
          >
            开始考试
          </button>
        </section>
      ) : (
        <>
          <div className="ielts-exam-tools">
            <strong>阅读文章</strong>
            <span>Questions 1–{questions.length} · {questions.some(isTextQuestion) ? "Complete the answers" : "Choose ONE answer"}</span>
            <label>
              字号{" "}
              <select
                aria-label="考试字号"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              >
                <option value={16}>标准</option>
                <option value={18}>较大</option>
                <option value={22}>大</option>
              </select>
            </label>
            <label>
              <input
                type="checkbox"
                checked={contrast}
                onChange={(e) => setContrast(e.target.checked)}
              />
              高对比
            </label>
            <label className="ielts-exam-split-control">
              阅读区宽度{" "}
              <input
                aria-label="阅读区宽度"
                type="range"
                min={35}
                max={65}
                value={split}
                onChange={(e) => setSplit(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="ielts-exam-status" role="status" aria-live="polite">
            {draft.result ? (
              <strong>考试已完成</strong>
            ) : locked ? (
              <strong>作答已结束，答案已锁定</strong>
            ) : remaining <= 600 ? (
              <strong>
                {remaining <= 300
                  ? "剩余不足 5 分钟，请检查答案"
                  : "剩余不足 10 分钟，请注意时间"}
              </strong>
            ) : (
              <span>
                选中文字后右键：Highlight / Notes · 点击笔记标记可再次打开
              </span>
            )}
            {annotationNotice && !locked && <span>{annotationNotice}</span>}
            {submitting && <span>正在交卷…</span>}
            {draft.result && allowRestart && (
              <button onClick={() => setConfirm("restart")}>再考一次</button>
            )}
            {draft.result && (
              <span>
                答对 {draft.result.correctCount}/{draft.result.total ?? questions.length} 题
                {!historicalWithoutTiming && <> · 用时 {clock(examElapsedSeconds(draft, now))}</>}
              </span>
            )}
            {draft.result && resultDetails}
            {locked && !draft.result && !submitting && (
              <button onClick={() => void send()}>重试交卷</button>
            )}
          </div>
          {error && (
            <p role="alert" className="ielts-exam-warning">
              {error}{locked ? "。答案已保留，请重试交卷。" : ""}
            </p>
          )}
          <div className="ielts-exam-mobile-tabs" role="group" aria-label="阅读与作答切换">
            <button aria-pressed={mobilePane === "passage"} onClick={() => setMobilePane("passage")}>阅读文章</button>
            <button aria-pressed={mobilePane === "questions"} onClick={() => setMobilePane("questions")}>作答题目</button>
          </div>
          <main className="ielts-exam-panes" data-mobile-pane={mobilePane}>
            <section
              className="ielts-exam-passage"
              aria-label="考试阅读区"
              tabIndex={0}
            >
              <h2>{task.title || "阅读文章"}</h2>
              <AnnotatedText
                block="article"
                text={task.article ?? ""}
                omissions={task.articleOmissions}
                annotations={draft.annotations}
                onSelect={selectText}
                onOpen={openAnnotation}
                readOnly={locked}
              />
            </section>
            <section className="ielts-exam-questions" aria-label="考试作答区">
              {questions.map((question, index) => {
                const id = examQuestionId(task, index);
                const result = draft.result?.results.find(
                  (r) => r.questionId === id,
                );
                return (
                  <section
                    onPointerDown={(event) => {
                      if (
                        !(event.target as Element).closest(
                          ".ielts-exam-annotation-editor, .ielts-exam-annotation-menu, mark",
                        )
                      ) {
                        setAnnotationMode(null);
                      }
                    }}
                    className={`ielts-exam-question${active === index ? " is-active" : ""}`}
                    key={id}
                    tabIndex={-1}
                    ref={(node) => {
                      questionRefs.current[index] = node;
                    }}
                    onFocus={() => setActive(index)}
                  >
                    <div className="ielts-exam-question-heading">
                      <h3>Question {index + 1}</h3>
                    </div>
                    {question.instructions && (index === 0 || questions[index - 1].instructions !== question.instructions) && <p className="ielts-exam-instructions">{question.instructions}</p>}
                    {isTextQuestion(question) ? <SentenceAnswer renderText={(text, offset) => (
                      <AnnotatedText inline block={id} text={text}
                        annotations={draft.annotations
                          .filter(a => a.block === id && a.start >= offset && a.end <= offset + text.length)
                          .map(a => ({ ...a, start: a.start - offset, end: a.end - offset }))}
                        onSelect={(selected, point) => selectText({
                          ...selected, start: selected.start + offset, end: selected.end + offset,
                        }, point)}
                        onOpen={(annotation, point, menu) => openAnnotation({
                          ...annotation, start: annotation.start + offset, end: annotation.end + offset,
                        }, point, menu)}
                        readOnly={locked}
                      />
                    )} stem={question.stem} number={index + 1} maxWords={question.maxWords} value={draft.answers[id]} disabled={locked} onChange={(text) => {
                      if (editable()) update({ ...draftRef.current, answers: { ...draftRef.current.answers, [id]: text } });
                    }} /> : <>
                    <AnnotatedText
                      block={id}
                      text={question.stem}
                      annotations={draft.annotations}
                      onSelect={selectText}
                      onOpen={openAnnotation}
                      readOnly={locked}
                    />
                    <fieldset disabled={locked}>
                      <legend className="ielts-exam-sr-only">
                        第 {index + 1} 题，选择一个答案
                      </legend>
                      {question.options.map((_, optionIndex) => (
                        <label className="ielts-exam-option" key={optionIndex} onClick={(event) => {
                          if (window.getSelection()?.isCollapsed === false || (event.target as Element).closest("mark")) event.preventDefault();
                        }}>
                          <input
                            type="radio"
                            name={`exam-${id}`}
                            aria-label={examOptionLabel(question, optionIndex)}
                            checked={draft.answers[id] === optionIndex}
                            onChange={() => {
                              if (editable())
                                update({
                                  ...draftRef.current,
                                  answers: {
                                    ...draftRef.current.answers,
                                    [id]: optionIndex,
                                  },
                                });
                            }}
                          />
                          <AnnotatedText block={`${id}:option:${optionIndex}`} text={examOptionLabel(question, optionIndex)} annotations={draft.annotations} onSelect={selectText} onOpen={openAnnotation} readOnly={locked} />
                        </label>
                      ))}
                    </fieldset>
                    </>}
                    {!locked && (
                      <button
                        style={{ visibility: draft.answers[id] === undefined ? "hidden" : "visible" }}
                        disabled={draft.answers[id] === undefined}
                        className="ielts-exam-link"
                        onClick={() => {
                          if (!editable()) return;
                          const answers = { ...draftRef.current.answers };
                          delete answers[id];
                          update({ ...draftRef.current, answers });
                        }}
                      >
                        清除答案
                      </button>
                    )}
                    {renderQuestionFooter?.(id)}
                    {result && (
                      <div className="ielts-exam-feedback">
                        <strong>
                          {result.voided ? "本题已作废" : result.correct
                            ? "回答正确"
                            : !hasReadingAnswer(draft.answers[id])
                              ? "未作答"
                              : "回答错误"}
                        </strong>
                        <p>
                          正确答案：
                          {isTextQuestion(question) ? (result.acceptedAnswers?.join(" / ") || result.answerText || "—") : result.correctIndex != null ? examOptionLabel(question, result.correctIndex) : "—"}
                        </p>
                        <p>{result.explanation}</p>
                      </div>
                    )}
                  </section>
                );
              })}
            </section>
          </main>
          <footer className="ielts-exam-footer">
            <div>
              <strong>Part 1</strong>
              <span>
                已答 {answeredCount}/{questions.length} · 待检查{" "}
                {draft.review.length}
              </span>
            </div>
            <label className="ielts-exam-review">
              <input
                type="checkbox"
                aria-label="待检查"
                disabled={locked}
                checked={draft.review.includes(examQuestionId(task, active))}
                onChange={() => {
                  if (!editable()) return;
                  const id = examQuestionId(task, active),
                    checked = draftRef.current.review.includes(id);
                  update({
                    ...draftRef.current,
                    review: checked
                      ? draftRef.current.review.filter((q) => q !== id)
                      : [...draftRef.current.review, id],
                  });
                }}
              />
              <span>Review</span>
            </label>
            <nav aria-label="考试题号导航">
              {questions.map((_, i) => {
                const id = examQuestionId(task, i);
                const answered = hasReadingAnswer(draft.answers[id]);
                const review = draft.review.includes(id);
                return (
                  <button
                    key={id}
                    aria-label={`第 ${i + 1} 题，${answered ? "已答" : "未答"}${review ? "，待检查" : ""}`}
                    aria-current={active === i ? "step" : undefined}
                    className={`${answered ? "is-answered" : ""} ${review ? "is-review" : ""}`}
                    onClick={() => jump(i)}
                  >
                    {i + 1}
                    {review && <sup>●</sup>}
                  </button>
                );
              })}
            </nav>
            <div className="ielts-exam-navigation">
              <button
                aria-label="上一题"
                disabled={active === 0}
                onClick={() => jump(active - 1)}
              >
                ←
              </button>
              <button
                aria-label="下一题"
                disabled={active === questions.length - 1}
                onClick={() => jump(active + 1)}
              >
                →
              </button>
              <button
                className="ielts-exam-primary"
                disabled={locked}
                onClick={() => {
                  if (overLimit) { setError("填空答案超过词数限制，请修改后交卷"); const index = questions.findIndex((q, i) => isTextQuestion(q) && exceedsWordLimit(draft.answers[examQuestionId(task, i)], q.maxWords)); jump(index); return; }
                  setError(""); setConfirm("submit");
                }}
              >
                交卷
              </button>
            </div>
          </footer>
        </>
      )}
      {selection && annotationMode === "menu" && !locked && (
        <div
          className="ielts-exam-annotation-menu"
          role="menu"
          aria-label="文字标注"
          style={{ left: anchor.left, top: anchor.top }}
          onKeyDown={(event) => {
            if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
              return;
            event.preventDefault();
            const items = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              ),
            );
            const current = items.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? items.length - 1
                  : (current +
                      (event.key === "ArrowDown" ? 1 : -1) +
                      items.length) %
                    items.length;
            items[next]?.focus();
          }}
        >
          <button
            autoFocus
            role="menuitem"
            onClick={() => {
              const existing =
                draftRef.current.annotations.find(
                  (a) => a.id === annotationId,
                ) ||
                draftRef.current.annotations.find(
                  (a) =>
                    a.block === selection.block &&
                    a.start === selection.start &&
                    a.end === selection.end,
                );
              writeAnnotation(
                existing?.note || existing?.kind === "note"
                  ? "note"
                  : "highlight",
                existing?.note || "",
              );
              window.getSelection()?.removeAllRanges();
              setAnnotationMode(null);
            }}
          >
            Highlight
          </button>
          <button role="menuitem" onClick={openNoteEditor}>
            Notes
          </button>
          <button
            role="menuitem"
            disabled={
              !draft.annotations.some(
                (a) =>
                  a.block === selection.block &&
                  a.end > selection.start &&
                  a.start < selection.end,
              )
            }
            onClick={clearSelected}
          >
            Clear
          </button>
          <button
            role="menuitem"
            disabled={!draft.annotations.length}
            onClick={() => {
              setAnnotationMode(null);
              setConfirm("clear_annotations");
            }}
          >
            Clear all
          </button>
        </div>
      )}
      {selection && annotationMode === "note" && (
        <section
          className="ielts-exam-annotation-editor"
          role="region"
          aria-label="选文标注"
          style={{ left: anchor.left, top: anchor.top }}
        >
          <header>
            <strong>Notes</strong>
            <button
              aria-label="关闭笔记"
              onClick={() => {
                setAnnotationMode(null);
                setSelection(null);
              }}
            >
              ×
            </button>
          </header>
          <blockquote>{selection.text}</blockquote>
          <textarea
            autoFocus
            aria-label="选文笔记"
            placeholder="输入笔记，自动保存"
            value={note}
            readOnly={locked}
            onChange={(event) => {
              setNote(event.target.value);
              writeAnnotation("note", event.target.value);
            }}
          />
          <small>
            {locked
              ? "考试已结束，笔记只读"
              : storageError
                ? "仅保留在当前页面，请勿关闭"
                : "自动保存到当前浏览器"}
          </small>
        </section>
      )}
      {utility && (
        <div
          className="ielts-exam-overlay"
          onKeyDown={(event) => {
            if (event.key === "Escape") setUtility(null);
            if (event.key === "Tab") {
              event.preventDefault();
              event.currentTarget.querySelector("button")?.focus();
            }
            event.stopPropagation();
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={utility === "help" ? "Help" : "试卷已隐藏"}
            className="ielts-exam-dialog"
          >
            {utility === "help" ? (
              <>
                <h2>Help</h2>
                <p>
                  左侧阅读文章，右侧作答；底部题号可跳题，Review 标记稍后检查。
                </p>
                <p>
                  选中文字后单击鼠标右键：Highlight 高亮，Notes 添加笔记，Clear
                  清除所选标注，Clear all 清除全部标注。
                </p>
                <p>
                  点击原文带笔记标记的文字，可重新打开 Notes
                  查看和编辑；输入自动保存到本机。
                </p>
                <p>
                  Hide 隐藏试卷，Resume
                  返回；隐藏时计时继续。当前为单篇训练，不是三篇完整正式考试。
                </p>
                <button autoFocus onClick={() => setUtility(null)}>
                  关闭帮助
                </button>
              </>
            ) : (
              <>
                <h2>试卷已隐藏</h2>
                <p>计时仍在继续。点击 Resume 返回作答。</p>
                <button
                  autoFocus
                  className="ielts-exam-primary"
                  onClick={() => setUtility(null)}
                >
                  Resume
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {confirm && (
        <div className="ielts-exam-overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-label={
              confirm === "clear_annotations"
                ? "清除全部标注"
                : confirm === "submit"
                  ? "交卷检查"
                  : confirm === "restart"
                    ? "重新考试"
                    : "退出考试界面"
            }
            className="ielts-exam-dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape") setConfirm(null);
              if (event.key === "Tab") {
                const buttons = Array.from(
                  event.currentTarget.querySelectorAll("button"),
                );
                const first = buttons[0];
                const last = buttons[buttons.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault();
                  last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <h2>
              {confirm === "clear_annotations"
                ? "清除全部标注"
                : confirm === "submit"
                  ? "交卷检查"
                  : confirm === "restart"
                    ? "重新考试？"
                    : "暂时离开考试？"}
            </h2>
            {confirm === "clear_annotations" ? (
              <p>清除全部高亮与笔记？已保存的答案不会改变。</p>
            ) : confirm === "restart" ? (
              <p>
                清空本机答案、标记和笔记，开始新的考试。已提交的练习记录仍保留。
              </p>
            ) : confirm === "submit" ? (
              <>
                <p>
                  {questions.length - answeredCount} 道题未作答，
                  {draft.review.length} 道题标记待检查。
                </p>
                <p>交卷后无法修改答案，未答题计为错误。</p>
              </>
            ) : (
              <p>
                {storageError
                  ? "本机保存不可用，离开可能丢失作答。"
                  : "答案已保存在当前浏览器。"}
                退出后计时仍会继续；重新进入后恢复作答，超时则锁定并交卷。
              </p>
            )}
            <div>
              <button autoFocus onClick={() => setConfirm(null)}>
                {confirm === "restart" || confirm === "clear_annotations"
                  ? "取消"
                  : "继续检查"}
              </button>
              <button
                className="ielts-exam-primary"
                onClick={() =>
                  confirm === "clear_annotations"
                    ? (() => {
                        if (editable()) {
                          update({ ...draftRef.current, annotations: [] });
                          setSelection(null);
                          setAnnotationNotice("全部标注已清除");
                        }
                        setConfirm(null);
                      })()
                    : confirm === "submit"
                      ? void send()
                      : confirm === "restart"
                        ? (() => {
                            update(newExamDraft(task));
                            setConfirm(null);
                            setSelection(null);
                            setError("");
                            setActive(0);
                            timeoutAttempted.current = false;
                          })()
                        : onExit()
                }
              >
                {confirm === "clear_annotations"
                  ? "确认清除全部"
                  : confirm === "submit"
                    ? "确认交卷"
                    : confirm === "restart"
                      ? "确认重新开始"
                      : "保存并退出"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
