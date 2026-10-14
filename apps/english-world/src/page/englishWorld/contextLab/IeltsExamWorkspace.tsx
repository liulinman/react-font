import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type {
  ContextLabSubmitParams,
  ContextLabSubmitResult,
  ContextLabTask,
} from "../types/learning";
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
  task: ContextLabTask;
  userId: number;
  onSubmit: (params: ContextLabSubmitParams) => Promise<ContextLabSubmitResult>;
  onExit: () => void;
};
type Selection = { block: string; start: number; end: number; text: string };
function clock(seconds: number) {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

function AnnotatedText({
  block,
  text,
  annotations,
  onSelect,
}: {
  block: string;
  text: string;
  annotations: ExamAnnotation[];
  onSelect: (selection: Selection) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const marks = annotations
    .filter((a) => a.block === block)
    .sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let offset = 0;
  for (const mark of marks) {
    if (mark.start < offset) continue;
    nodes.push(
      text.slice(offset, mark.start),
      <mark key={mark.id} title={mark.note || "高亮"}>
        {text.slice(mark.start, mark.end)}
      </mark>,
    );
    offset = mark.end;
  }
  nodes.push(text.slice(offset));
  const captureSelection = () => {
    const selection = window.getSelection();
    if (!ref.current || !selection?.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (
      !ref.current.contains(range.startContainer) ||
      !ref.current.contains(range.endContainer)
    )
      return;
    const prefix = range.cloneRange();
    prefix.selectNodeContents(ref.current);
    prefix.setEnd(range.startContainer, range.startOffset);
    const start = prefix.toString().length;
    const end = start + range.toString().length;
    if (!text.slice(start, end).trim()) return;
    onSelect({ block, start, end, text: text.slice(start, end) });
  };
  return (
    <div
      ref={ref}
      data-testid={`exam-text-${block}`}
      className="ielts-exam-text"
      onMouseUp={captureSelection}
      onKeyUp={captureSelection}
    >
      {nodes}
    </div>
  );
}

export function IeltsExamWorkspace({ task, userId, onSubmit, onExit }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const storageKey = examStorageKey(userId, task.taskId);
  const [storageError, setStorageError] = useState(false);
  const [draft, setDraft] = useState<ExamDraft>(() => {
    try {
      return restoreExamDraft(localStorage.getItem(storageKey), task);
    } catch {
      return newExamDraft(task);
    }
  });
  const draftRef = useRef(draft);
  const [now, setNow] = useState(Date.now);
  const [duration, setDuration] = useState(20);
  const [active, setActive] = useState(0);
  const [fontSize, setFontSize] = useState(18);
  const [contrast, setContrast] = useState(false);
  const [split, setSplit] = useState(50);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState<"submit" | "exit" | "restart" | null>(
    null,
  );
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
    (_, i) => draft.answers[examQuestionId(task, i)] !== undefined,
  ).length;

  const update = (next: ExamDraft) => {
    draftRef.current = next;
    setDraft(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  };
  const editable = () =>
    draftRef.current.startedAt !== null &&
    draftRef.current.endedAt === null &&
    Date.now() < draftRef.current.deadline! &&
    !inFlight.current;
  const jump = (index: number) => {
    setActive(index);
    questionRefs.current[index]?.scrollIntoView?.({
      block: "start",
      behavior: "smooth",
    });
    questionRefs.current[index]?.focus({ preventScroll: true });
  };
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
        answers: questions.flatMap((_, index) => {
          const questionId = examQuestionId(task, index);
          return frozen.answers[questionId] === undefined
            ? []
            : [{ questionId, selectedIndex: frozen.answers[questionId] }];
        }),
      });
      update({ ...frozen, result });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "交卷失败，请重试");
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };
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

  const start = () => {
    const time = Date.now();
    setNow(time);
    update({
      ...newExamDraft(task),
      startedAt: time,
      deadline: time + duration * 60000,
    });
  };
  const selectText = (value: Selection) => {
    if (editable()) {
      setSelection(value);
      setNote("");
    }
  };
  const saveAnnotation = () => {
    if (!selection || !editable()) return;
    const annotation = { ...selection, id: crypto.randomUUID(), note };
    // A new selection replaces overlapping marks, never unrelated occurrences.
    const annotations = draftRef.current.annotations.filter(
      (a) =>
        a.block !== selection.block ||
        a.end <= selection.start ||
        a.start >= selection.end,
    );
    update({ ...draftRef.current, annotations: [...annotations, annotation] });
    setSelection(null);
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
        if (event.key !== "Tab" || confirm) return;
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
      className={`ielts-exam${contrast ? " ielts-exam-contrast" : ""}`}
      style={
        {
          "--exam-font-size": `${fontSize}px`,
          "--exam-split": `${split}%`,
        } as CSSProperties
      }
    >
      <header className="ielts-exam-header">
        <div>
          <strong>IELTS Reading</strong>
          <span>雅思机考模式 · 单篇模拟</span>
        </div>
        {started && (
          <div
            className={`ielts-exam-clock${remaining <= 300 ? " is-urgent" : ""}`}
            role="timer"
            aria-label="剩余时间"
          >
            {clock(remaining)}
            <small>{draft.result ? "已交卷" : "剩余时间"}</small>
          </div>
        )}
        <button
          onClick={() =>
            started && !draft.result ? setConfirm("exit") : onExit()
          }
          disabled={submitting}
        >
          退出考试界面
        </button>
      </header>
      {storageError && (
        <p role="alert" className="ielts-exam-warning">
          无法保存到本机，请勿刷新或关闭页面。当前答案仍保留在页面中。
        </p>
      )}
      {!started ? (
        <section className="ielts-exam-intro">
          <span className="ielts-exam-eyebrow">
            READING • COMPUTER PRACTICE
          </span>
          <h1>准备开始阅读考试</h1>
          <p>
            本练习包含 1 篇文章、{questions.length} 道选择题。完整雅思阅读考试为
            60 分钟、3 个部分、40 题；当前是单篇模拟。
          </p>
          <ul>
            <li>左侧阅读文章，右侧作答；底部题号可直接跳转。</li>
            <li>
              选中文章或题干文字可高亮、添加笔记；不确定的题可以标记待检查。
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
            disabled={!questions.length}
          >
            开始考试
          </button>
        </section>
      ) : (
        <>
          <div className="ielts-exam-tools">
            <strong>Reading Passage 1</strong>
            <span>Questions 1–{questions.length} · Choose ONE answer</span>
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
          <div className="ielts-exam-status" aria-live="polite">
            {draft.result ? (
              <strong>考试已完成</strong>
            ) : locked ? (
              <strong>作答已结束，答案已锁定</strong>
            ) : remaining <= 300 ? (
              <strong>剩余不足 5 分钟，请检查答案</strong>
            ) : (
              <span>答案与笔记自动保存 · 选中文字可高亮和记笔记</span>
            )}
            {submitting && <span>正在交卷…</span>}
            {draft.result && (
              <button onClick={() => setConfirm("restart")}>再考一次</button>
            )}
            {draft.result && (
              <span>
                答对 {draft.result.correctCount}/{questions.length} 题 · 用时{" "}
                {clock(examElapsedSeconds(draft, now))}
              </span>
            )}
            {locked && !draft.result && !submitting && (
              <button onClick={() => void send()}>重试交卷</button>
            )}
          </div>
          {error && (
            <p role="alert" className="ielts-exam-warning">
              {error}。答案已保留，请重试交卷。
            </p>
          )}
          <main className="ielts-exam-panes">
            <section
              className="ielts-exam-passage"
              aria-label="考试阅读区"
              tabIndex={0}
            >
              <h2>Reading Passage 1</h2>
              <AnnotatedText
                block="article"
                text={task.article ?? ""}
                annotations={draft.annotations}
                onSelect={selectText}
              />
            </section>
            <section className="ielts-exam-questions" aria-label="考试作答区">
              {questions.map((question, index) => {
                const id = examQuestionId(task, index);
                const checked = draft.review.includes(id);
                const result = draft.result?.results.find(
                  (r) => r.questionId === id,
                );
                return (
                  <section
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
                      <label>
                        <input
                          type="checkbox"
                          aria-label="待检查"
                          checked={checked}
                          disabled={locked}
                          onChange={() => {
                            if (editable())
                              update({
                                ...draftRef.current,
                                review: checked
                                  ? draftRef.current.review.filter(
                                      (q) => q !== id,
                                    )
                                  : [...draftRef.current.review, id],
                              });
                          }}
                        />
                        待检查
                      </label>
                    </div>
                    <AnnotatedText
                      block={id}
                      text={question.stem}
                      annotations={draft.annotations}
                      onSelect={selectText}
                    />
                    <fieldset disabled={locked}>
                      <legend className="ielts-exam-sr-only">
                        第 {index + 1} 题，选择一个答案
                      </legend>
                      {question.options.map((option, optionIndex) => (
                        <label className="ielts-exam-option" key={optionIndex}>
                          <input
                            type="radio"
                            name={`exam-${id}`}
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
                          {String.fromCharCode(65 + optionIndex)}.{" "}
                          {option.replace(/^[A-Z][.、)）]\s*/, "")}
                        </label>
                      ))}
                    </fieldset>
                    {draft.answers[id] !== undefined && !locked && (
                      <button
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
                    {result && (
                      <div className="ielts-exam-feedback">
                        <strong>
                          {result.correct
                            ? "回答正确"
                            : draft.answers[id] === undefined
                              ? "未作答"
                              : "回答错误"}
                        </strong>
                        <p>
                          正确答案：
                          {String.fromCharCode(65 + result.correctIndex)}.{" "}
                          {question.options[result.correctIndex]}
                        </p>
                        <p>{result.explanation}</p>
                      </div>
                    )}
                  </section>
                );
              })}
              {draft.annotations.length > 0 && (
                <aside className="ielts-exam-notes" aria-label="考试笔记">
                  <h3>高亮与笔记</h3>
                  {draft.annotations.map((a, i) => (
                    <div key={a.id}>
                      <blockquote>{a.text}</blockquote>
                      <textarea
                        aria-label={`笔记 ${i + 1}`}
                        value={a.note}
                        disabled={locked}
                        onChange={(e) => {
                          if (editable())
                            update({
                              ...draftRef.current,
                              annotations: draftRef.current.annotations.map(
                                (item) =>
                                  item.id === a.id
                                    ? { ...item, note: e.target.value }
                                    : item,
                              ),
                            });
                        }}
                      />
                      <button
                        disabled={locked}
                        onClick={() => {
                          if (editable())
                            update({
                              ...draftRef.current,
                              annotations: draftRef.current.annotations.filter(
                                (item) => item.id !== a.id,
                              ),
                            });
                        }}
                      >
                        删除标注 {i + 1}
                      </button>
                    </div>
                  ))}
                </aside>
              )}
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
            <nav aria-label="考试题号导航">
              {questions.map((_, i) => {
                const id = examQuestionId(task, i);
                const answered = draft.answers[id] !== undefined;
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
                onClick={() => setConfirm("submit")}
              >
                交卷
              </button>
            </div>
          </footer>
        </>
      )}
      {selection && !locked && (
        <div
          className="ielts-exam-annotation-editor"
          role="region"
          aria-label="选文标注"
        >
          <strong>高亮 / 笔记</strong>
          <blockquote>{selection.text}</blockquote>
          <textarea
            autoFocus
            aria-label="选文笔记"
            placeholder="可选：为选中文字添加笔记"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div>
            <button onClick={() => setSelection(null)}>取消</button>
            <button className="ielts-exam-primary" onClick={saveAnnotation}>
              保存高亮与笔记
            </button>
          </div>
        </div>
      )}
      {confirm && (
        <div className="ielts-exam-overlay">
          <section
            role="dialog"
            aria-modal="true"
            aria-label={
              confirm === "submit"
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
              {confirm === "submit"
                ? "交卷检查"
                : confirm === "restart"
                  ? "重新考试？"
                  : "暂时离开考试？"}
            </h2>
            {confirm === "restart" ? (
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
                {confirm === "restart" ? "取消" : "继续检查"}
              </button>
              <button
                className="ielts-exam-primary"
                onClick={() =>
                  confirm === "submit"
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
                {confirm === "submit"
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
