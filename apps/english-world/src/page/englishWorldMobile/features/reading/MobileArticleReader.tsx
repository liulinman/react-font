import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import request from "@font/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  contextLabSubmit,
  contextLabTranslateArticle,
} from "@/page/englishWorld/server/learning";
import type { ContextLabSubmitResult } from "@/page/englishWorld/types/learning";
import { ArticlePassage, ArticleReadingDialog } from "./ArticlePassage";
import { useStudyDraft } from "../study/studyStorage";
import { StudyError } from "../study/StudyChrome";
import { useConnectivity } from "../../offline/useConnectivity";
import {
  articleRoot,
  articleTitle,
  useArticle,
  taskPending,
} from "./articleQueries";
import { ArticleScore } from "./MobileArticleHistory";
type AnswerDraft = {
  choices: Record<string, number>;
  pending: boolean;
  result: ContextLabSubmitResult | null;
  started: number;
  index?: number;
};
function validDraft(v: unknown): v is AnswerDraft {
  const d = v as AnswerDraft | null;
  return (
    !!d &&
    !!d.choices &&
    typeof d.choices === "object" &&
    !Array.isArray(d.choices) &&
    Object.values(d.choices).every((n) => Number.isInteger(n) && n >= 0) &&
    typeof d.pending === "boolean" &&
    Number.isFinite(d.started) &&
    (d.index === undefined || (Number.isInteger(d.index) && d.index >= 0)) &&
    (d.result === null ||
      (!!d.result &&
        Array.isArray(d.result.results) &&
        Number.isFinite(d.result.score)))
  );
}
export function MobileArticleReader() {
  const { user } = useAuth();
  const { taskId } = useParams();
  const { search, pathname } = useLocation();
  return (
    <Reader
      key={`${user?.id}:${taskId}:${search}`}
      userId={user?.id ?? 0}
      taskId={Number(taskId)}
      search={search}
      answering={pathname.endsWith("/answer")}
    />
  );
}
function Reader({
  userId,
  taskId,
  search,
  answering,
}: {
  userId: number;
  taskId: number;
  search: string;
  answering: boolean;
}) {
  const query = useArticle(taskId);
  const task = query.data;
  const online = useConnectivity();
  const navigate = useNavigate();
  const lock = useRef(false);
  const activeAnswer = useRef(answering);
  useEffect(() => {
    activeAnswer.current = answering;
    return () => {
      activeAnswer.current = false;
    };
  }, [answering]);
  const roundKey = `english-world:study:v1:${userId}:article-active:${taskId}`;
  const [round] = useState(() => {
    const explicit = new URLSearchParams(search).get("round");
    if (explicit) return explicit;
    try {
      return localStorage.getItem(roundKey) || "first";
    } catch {
      return "first";
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(roundKey, round);
    } catch {
      /* Draft hook reports unavailable storage. */
    }
  }, [roundKey, round]);
  const [started] = useState(() => Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [retryRound] = useState(() => String(Date.now()));
  const [error, setError] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translations, setTranslations] = useState<string[]>([]);
  const [showTranslation, setShowTranslation] = useState(false);
  const { draft, setDraft, storageError, reloadDraft } = useStudyDraft(
    userId,
    `article:${taskId}:${round}`,
    validDraft,
  );
  const state = draft ?? {
    choices: {},
    pending: false,
    result: null,
    started,
  };
  const questions = task?.questions ?? [];
  const index = Math.min(state.index ?? 0, Math.max(0, questions.length - 1));
  const question = questions[index];
  const [expanded, setExpanded] = useState(false);
  const [showNavigator, setShowNavigator] = useState(false);
  const answerPane = useRef<HTMLDivElement>(null);
  const { draft: readingPosition, setDraft: setReadingPosition } =
    useStudyDraft(
      userId,
      `article-position:${taskId}`,
      (n: unknown): n is number =>
        typeof n === "number" && Number.isFinite(n) && n >= 0,
    );
  useEffect(() => {
    if (answerPane.current) answerPane.current.scrollTop = 0;
  }, [index]);
  const goToQuestion = (next: number) => {
    setDraft({ ...state, index: next });
    setShowNavigator(false);
  };
  const validQuestions =
    questions.length > 0 &&
    questions.every((q) => q.id?.trim() && q.options?.length > 1) &&
    new Set(questions.map((q) => q.id)).size === questions.length;
  const answered = questions.filter(
    (q) =>
      Number.isInteger(state.choices[q.id]) &&
      state.choices[q.id] >= 0 &&
      state.choices[q.id] < q.options.length,
  ).length;
  const submit = async () => {
    if (
      lock.current ||
      state.pending ||
      state.result ||
      !online ||
      !task?.articleExerciseId ||
      !validQuestions ||
      answered !== questions.length
    )
      return;
    lock.current = true;
    setSubmitting(true);
    setError("");
    setDraft({ ...state, pending: true });
    try {
      const result = await request(
        contextLabSubmit({
          sessionId: task.articleExerciseId,
          elapsedSeconds: Math.max(
            0,
            Math.floor((Date.now() - state.started) / 1000),
          ),
          answers: questions.map((q) => ({
            questionId: q.id,
            selectedIndex: state.choices[q.id],
          })),
        }),
      );
      setDraft({ ...state, pending: false, result });
      if (result.attemptId && activeAnswer.current)
        navigate(`${articleRoot}/${taskId}/result/${result.attemptId}`);
    } catch {
      setError(
        "未确认提交结果。请先查看答题记录，确认是否已评分，避免重复提交。",
      );
    } finally {
      lock.current = false;
      setSubmitting(false);
    }
  };
  const translate = async () => {
    if (translating) return;
    if (translations.length) {
      setShowTranslation(!showTranslation);
      return;
    }
    setTranslating(true);
    setError("");
    try {
      const result = await request(
        contextLabTranslateArticle({ article: task?.article ?? "" }),
      );
      setTranslations(result.translations);
      setShowTranslation(true);
    } catch {
      setError("翻译暂时不可用，请稍后重试。");
    } finally {
      setTranslating(false);
    }
  };
  const passage = (
    <ArticlePassage
      article={task?.article ?? ""}
      translations={showTranslation ? translations : []}
      position={readingPosition ?? 0}
      onPosition={setReadingPosition}
    />
  );
  const translateButton = (
    <button
      className="article-translate-toggle"
      disabled={translating || !online}
      onClick={() => void translate()}
    >
      {translating
        ? "翻译中…"
        : showTranslation
          ? "隐藏中文翻译"
          : "查看中文翻译"}
    </button>
  );
  const canSubmit =
    !state.pending &&
    online &&
    validQuestions &&
    answered === questions.length &&
    Number.isSafeInteger(task?.articleExerciseId) &&
    !!task?.articleExerciseId &&
    task.articleExerciseId > 0;
  return (
    <section
      className={`article-workspace ${answering && !state.result ? "article-workspace--split" : ""}`}
      aria-label="文章练习"
    >
      <header className="article-workspace-header">
        <Link to={articleRoot} aria-label="← 我的文章">
          ←
        </Link>
        <div>
          <span>{answering ? "阅读与练习" : "专注阅读"}</span>
          <h1>{task ? articleTitle(task) : "文章练习"}</h1>
        </div>
        <Link to={`${articleRoot}/${taskId}/attempts`}>记录</Link>
      </header>
      <StudyError message={error} />
      {storageError && <p role="status">本机存储不可用，请保持页面打开。</p>}
      {query.isLoading && (
        <p className="article-status-message" role="status">
          正在加载文章…
        </p>
      )}
      {(query.isError || !Number.isSafeInteger(taskId) || taskId <= 0) && (
        <div className="article-status-message">
          <StudyError message="文章未能加载，请返回列表或重试。" />
          <button onClick={() => void query.refetch()}>重新加载</button>
        </div>
      )}
      {taskPending(task) && (
        <div className="article-status-message">
          <h2>文章正在准备中</h2>
          <p>完成后会自动显示，你也可以稍后从文章列表回来。</p>
        </div>
      )}
      {task?.status === "failed" && (
        <StudyError
          message={task.errorMessage || "生成失败，请返回列表重新创建。"}
        />
      )}
      {task?.status === "succeeded" && (
        <>
          {(!answering || !state.result) && (
            <section className="article-reading-pane" aria-label="原文区域">
              <div className="article-pane-toolbar">
                <span>英文原文</span>
                <div>
                  {translateButton}
                  {answering && (
                    <button
                      onClick={() => setExpanded(true)}
                      aria-label="查看原文"
                    >
                      放大 ↗
                    </button>
                  )}
                </div>
              </div>
              {passage}
            </section>
          )}
          {!answering && (
            <footer className="article-reader-footer">
              <span>{questions.length} 道练习 · 进度自动保存</span>
              <Link
                className="study-primary"
                to={`${articleRoot}/${taskId}/answer${search}`}
                aria-label="去答题"
              >
                开始答题 →
              </Link>
            </footer>
          )}
          {answering &&
            (state.result ? (
              <div className="article-completed">
                <ArticleScore result={state.result} questions={questions} />
                <Link
                  className="study-primary"
                  to={`${articleRoot}/${taskId}/answer?round=${retryRound}`}
                >
                  再练一次
                </Link>
              </div>
            ) : (
              <section className="article-answer-pane" aria-label="答题区域">
                <header className="article-question-toolbar">
                  <strong>
                    第 {index + 1} 题 <span>/ {questions.length}</span>
                  </strong>
                  <button
                    aria-expanded={showNavigator}
                    onClick={() => setShowNavigator(!showNavigator)}
                  >
                    答题卡 · {answered}/{questions.length}
                  </button>
                </header>
                <progress
                  aria-label="答题进度"
                  value={answered}
                  max={Math.max(1, questions.length)}
                />
                <div className="article-question-scroll" ref={answerPane}>
                  {showNavigator && (
                    <nav
                      className="article-question-navigator"
                      aria-label="选择题号"
                    >
                      {questions.map((q, i) => (
                        <button
                          key={q.id}
                          aria-label={`第 ${i + 1} 题${Number.isInteger(state.choices[q.id]) ? "，已答" : "，未答"}`}
                          aria-current={i === index ? "step" : undefined}
                          data-answered={Number.isInteger(state.choices[q.id])}
                          onClick={() => goToQuestion(i)}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </nav>
                  )}
                  {question && (
                    <fieldset
                      className="article-single-question"
                      disabled={state.pending}
                    >
                      <legend className="visually-hidden">
                        第 {index + 1} 题
                      </legend>
                      <h2>{question.stem}</h2>
                      {question.options.map((option, optionIndex) => (
                        <label
                          key={optionIndex}
                          className={
                            state.choices[question.id] === optionIndex
                              ? "is-selected"
                              : ""
                          }
                        >
                          <input
                            type="radio"
                            name={`question-${question.id}`}
                            checked={state.choices[question.id] === optionIndex}
                            onChange={() =>
                              setDraft({
                                ...state,
                                index,
                                choices: {
                                  ...state.choices,
                                  [question.id]: optionIndex,
                                },
                              })
                            }
                          />
                          <span
                            className="article-option-letter"
                            aria-hidden="true"
                          >
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <span>{option}</span>
                          {state.choices[question.id] === optionIndex && (
                            <span
                              className="article-option-check"
                              aria-hidden="true"
                            >
                              ✓
                            </span>
                          )}
                        </label>
                      ))}
                    </fieldset>
                  )}
                  {(!Number.isSafeInteger(task.articleExerciseId) ||
                    !task.articleExerciseId ||
                    task.articleExerciseId <= 0) && (
                    <StudyError message="缺少有效练习编号，请返回文章列表刷新后重试。" />
                  )}
                  {!validQuestions && (
                    <StudyError message="题目数据不完整，请重新加载文章。" />
                  )}
                  {!online && <p role="status">联网后可以提交，答案已保留。</p>}
                  {state.pending && (
                    <div className="study-notice">
                      <p>正在等待或确认评分结果，请勿重复提交。</p>
                      <Link to={`${articleRoot}/${taskId}/attempts`}>
                        查看答题记录
                      </Link>
                      <button onClick={reloadDraft}>刷新本机结果</button>
                      <button
                        disabled={submitting}
                        onClick={() => {
                          if (
                            window.confirm(
                              "请先确认答题记录中没有本次结果。重新提交可能产生重复记录，确定解锁重试吗？",
                            )
                          )
                            setDraft({ ...state, pending: false });
                        }}
                      >
                        已核对记录，解锁重试
                      </button>
                    </div>
                  )}
                </div>
                <footer className="article-answer-actions">
                  <button
                    disabled={index === 0}
                    onClick={() => goToQuestion(index - 1)}
                  >
                    上一题
                  </button>
                  {index < questions.length - 1 ? (
                    <button
                      className="study-primary"
                      onClick={() => goToQuestion(index + 1)}
                    >
                      下一题
                    </button>
                  ) : (
                    <button
                      className="study-primary"
                      disabled={!canSubmit}
                      onClick={() => void submit()}
                    >
                      {submitting ? "正在评分…" : "提交练习"}
                    </button>
                  )}
                </footer>
              </section>
            ))}
          {expanded && (
            <ArticleReadingDialog onClose={() => setExpanded(false)}>
              <div className="article-pane-toolbar">
                <span>上下滚动阅读</span>
                {translateButton}
              </div>
              {passage}
            </ArticleReadingDialog>
          )}
        </>
      )}
    </section>
  );
}
