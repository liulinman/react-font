import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  classroomError,
  classroomRequest as api,
} from "@font/ui/classroom-api";

export interface PaperSummary {
  id: number;
  title: string;
  status: string;
  assignedCount: number;
  submittedCount: number;
  publishedAt?: string;
}

interface Member {
  id: number;
  name: string;
  status: string;
}

export interface Classroom {
  id: number;
  name: string;
  inviteCode: string;
  members: Member[];
  papers: PaperSummary[];
}

interface Issue {
  id: string;
  type?: string;
  message?: string;
  reason?: string;
  blocking?: boolean;
  resolved?: boolean;
}
interface Question {
  id: string;
  kind: string;
  stem: string;
  options: string[];
  correctIndex?: number | null;
  acceptedAnswers?: string[];
  explanation: string;
  evidence?: { paragraph: number; quote: string; missingInformation?: string };
}

interface Content {
  title: string;
  paragraphs: string[];
  questions: Question[];
}
interface Paper extends PaperSummary {
  failureSummary?: string;
  content: Content | null;
  workflow: {
    revision: number;
    qualityRevision?: number;
    sources?: { id: string; name: string }[];
    issues: Issue[];
    autoReview?: { status: string; message?: string };
  };
}

function useRequestUid() {
  const current = useRef<{ key: string; uid: string } | undefined>(undefined);
  return (key: string) => {
    if (current.current?.key !== key)
      current.current = { key, uid: crypto.randomUUID() };
    return current.current.uid;
  };
}

export function NewPaper({ path, route }: { path: string; route: string }) {
  const [mode, setMode] = useState("format");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const uid = useRequestUid();
  const uploaded = useRef(new Map<File, string>());

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = String(data.get("text") ?? "");
    const files = Array.from(
      (form.elements.namedItem("sources") as HTMLInputElement).files ?? [],
    );
    if ((!text.trim() && !files.length) || files.length > 10) {
      setError("请输入原文，或上传 1 至 10 个 PDF／图片文件。");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const sourceIds: string[] = [];
      for (const file of files) {
        const cached = uploaded.current.get(file);
        if (cached) {
          sourceIds.push(cached);
          continue;
        }
        setProgress("正在上传 " + file.name);
        const body = new FormData();
        body.append("file", file);
        const source = await api<{ id: string }>(path + "/sources", body);
        uploaded.current.set(file, source.id);
        sourceIds.push(source.id);
      }
      const input = {
        title: String(data.get("title") ?? ""),
        text,
        answerText: String(data.get("answers") ?? ""),
        sourceIds,
        mode,
        questionCount: Number(data.get("count") || 5),
      };
      setProgress("正在创建作业草稿…");
      const result = await api<Paper>(path + "/papers", {
        ...input,
        requestUid: uid(JSON.stringify(input)),
      });
      location.hash = route + "/paper/" + result.id;
    } catch (cause) {
      setError(classroomError(cause));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <form className="panel stack pad" onSubmit={(event) => void create(event)}>
      <h2>新建阅读作业</h2>
      <label>
        处理方式
        <select
          value={mode}
          disabled={busy}
          onChange={(event) => setMode(event.target.value)}
        >
          <option value="format">导入并整理原题</option>
          <option value="generate_questions">根据材料 AI 出题</option>
          <option value="complete_answers">补全答案和解析</option>
        </select>
      </label>
      <label>
        作业标题
        <input name="title" maxLength={160} disabled={busy} />
      </label>
      <label>
        阅读材料
        <textarea
          name="text"
          maxLength={100000}
          placeholder="粘贴原文或题目"
          disabled={busy}
        />
      </label>
      <label>
        PDF／图片
        <input
          type="file"
          name="sources"
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          multiple
          disabled={busy}
        />
      </label>
      {mode === "generate_questions" ? (
        <label>
          出题数量
          <input
            name="count"
            type="number"
            defaultValue={5}
            min={3}
            max={13}
            required
            disabled={busy}
          />
        </label>
      ) : (
        <label>
          参考答案
          <textarea
            name="answers"
            maxLength={100000}
            placeholder="可粘贴原稿提供的答案"
            disabled={busy}
          />
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {progress && <p role="status">{progress}</p>}
      <div className="actions">
        <a href={route} className="button">
          取消
        </a>
        <button className="primary" disabled={busy}>
          创建草稿
        </button>
      </div>
    </form>
  );
}

export function PaperEditor({
  path,
  route,
  paper,
  members,
  reload,
}: {
  path: string;
  route: string;
  paper: number;
  members: Member[];
  reload: () => Promise<void>;
}) {
  const endpoint = `${path}/papers/${paper}`;
  const [item, setItem] = useState<Paper>();
  const [draft, setDraft] = useState<Content>();
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [verifyIssue, setVerifyIssue] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const uid = useRequestUid();

  const read = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const next = await api<Paper>(endpoint, undefined, signal);
        if (signal?.aborted) return;
        setItem(next);
        setError("");
      } catch (cause) {
        if (!signal?.aborted) setError(classroomError(cause));
      }
    },
    [endpoint],
  );

  useEffect(() => {
    const controller = new AbortController();
    void read(controller.signal);
    return () => controller.abort();
  }, [read]);
  useEffect(() => {
    if (!dirty) setDraft(item?.content ?? undefined);
  }, [dirty, item?.content]);
  useEffect(() => {
    setReviewed(false);
  }, [item?.workflow.revision]);
  const waiting =
    !item ||
    ["queued", "generating"].includes(item.status) ||
    ["pending", "running"].includes(item.workflow?.autoReview?.status ?? "");
  useEffect(() => {
    if (!waiting || !item) return;
    const controller = new AbortController();
    const timer = setInterval(() => void read(controller.signal), 2500);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [item, read, waiting]);

  async function action(run: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await run();
    } catch (cause) {
      setError(classroomError(cause));
    } finally {
      setBusy(false);
    }
  }

  function change(content: Content) {
    setDraft(content);
    setDirty(true);
    setReviewed(false);
  }
  function editQuestion(index: number, patch: Partial<Question>) {
    if (!draft) return;
    change({
      ...draft,
      questions: draft.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    });
  }

  const ids = members
    .filter((member) => member.status === "active")
    .map((member) => member.id)
    .sort((a, b) => a - b);
  const blockers =
    item?.workflow.issues.filter(
      (issue) => issue.blocking && !issue.resolved,
    ) ?? [];
  const ready =
    item?.status === "draft" &&
    item.workflow.qualityRevision === item.workflow.revision &&
    !blockers.length &&
    !dirty;

  async function save() {
    if (!item || !draft) return;
    const next = await api<Paper>(endpoint + "/save", {
      revision: item.workflow.revision,
      content: draft,
    });
    setItem(next);
    setDraft(next.content ?? draft);
    setDirty(false);
    setReviewed(false);
  }

  async function publish() {
    if (!item || !ready || !reviewed || !ids.length) return;
    const input = {
      revision: item.workflow.revision,
      userIds: ids,
      reviewed: true,
    };
    await api(endpoint + "/publish", {
      ...input,
      requestUid: uid(JSON.stringify(input)),
    });
    dialog.current?.close();
    location.hash = route;
    await reload();
  }

  return (
    <section className="stack">
      <div className="section-title panel">
        <h2>{preview ? "学生预览" : (item?.title ?? "阅读草稿")}</h2>
        <a href={route}>返回作业</a>
      </div>
      {error && (
        <p role="alert" className="error">
          {error} <button onClick={() => void read()}>刷新状态</button>
        </p>
      )}
      {waiting && (
        <p role="status">
          {item?.status === "queued"
            ? "正在排队…"
            : "正在处理阅读材料或检查草稿…"}
        </p>
      )}
      {item?.status === "failed" && (
        <div className="panel stack pad">
          <p role="alert">{item.failureSummary || "材料处理失败"}</p>
          <div>
            <button
              onClick={() =>
                void action(async () =>
                  setItem(await api(endpoint + "/retry", {})),
                )
              }
              disabled={busy}
            >
              重新处理
            </button>
          </div>
        </div>
      )}
      {item?.status === "published" && (
        <p>
          作业已发布。<a href={route + "/scores/" + item.id}>查看成绩</a>
        </p>
      )}
      {item?.status === "draft" && draft && (
        <>
          {!!item.workflow.sources?.length && (
            <div className="panel pad actions" aria-label="阅读原稿">
              {item.workflow.sources.map((source) => (
                <a
                  className="button"
                  key={source.id}
                  href={`/api${path}/sources/${encodeURIComponent(source.id)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  查看原稿：{source.name}
                </a>
              ))}
            </div>
          )}
          {blockers.length > 0 && (
            <section className="panel pad">
              <h2>发布前需处理</h2>
              <ul>
                {blockers.map((issue) => (
                  <li key={issue.id}>
                    {issue.message ?? issue.reason ?? "请核对原稿和题目"}{" "}
                    {issue.type === "source_text" &&
                      !!item.workflow.sources?.length && (
                        <button
                          disabled={dirty || busy}
                          onClick={() => setVerifyIssue(issue.id)}
                        >
                          核对原稿
                        </button>
                      )}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {verifyIssue && (
            <form
              className="panel stack pad"
              onSubmit={(event) => {
                event.preventDefault();
                const fields = Object.fromEntries(
                  new FormData(event.currentTarget),
                );
                void action(async () => {
                  setItem(
                    await api(endpoint + "/verify-source", {
                      ...fields,
                      revision: item.workflow.revision,
                      issueId: verifyIssue,
                    }),
                  );
                  setVerifyIssue(undefined);
                });
              }}
            >
              <h2>核对原稿文字</h2>
              <label>
                原稿
                <select name="sourceId" required>
                  {item.workflow.sources?.map((source) => (
                    <option value={source.id} key={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                核对说明
                <textarea name="reason" required maxLength={3000} />
              </label>
              <label>
                原文证据
                <textarea name="evidence" required maxLength={3000} />
              </label>
              <div className="actions">
                <button type="button" onClick={() => setVerifyIssue(undefined)}>
                  取消
                </button>
                <button className="primary" disabled={dirty || busy}>
                  确认核对
                </button>
              </div>
            </form>
          )}
          {item.workflow.autoReview?.status === "failed" && (
            <p role="alert" className="error">
              {item.workflow.autoReview.message ??
                "检查失败，请保存并重新检查。"}
            </p>
          )}
          {preview ? (
            <div className="panel pad stack">
              <h2>{draft.title}</h2>
              {draft.paragraphs.map((paragraph, index) => (
                <p className="paper-text" key={index}>
                  {paragraph}
                </p>
              ))}
              <ol>
                {draft.questions.map((question) => (
                  <li key={question.id}>
                    {question.stem}
                    {question.options.length > 0 && (
                      <ul>
                        {question.options.map((option, index) => (
                          <li key={index}>{option}</li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          ) : (
            <div className="paper-editor">
              <div className="panel pad stack">
                <label>
                  作业标题
                  <input
                    value={draft.title}
                    maxLength={160}
                    disabled={busy}
                    onChange={(event) =>
                      change({ ...draft, title: event.target.value })
                    }
                  />
                </label>
                {draft.paragraphs.map((paragraph, index) => (
                  <label key={index}>
                    原文段落 {index + 1}
                    <textarea
                      value={paragraph}
                      disabled={busy}
                      onChange={(event) =>
                        change({
                          ...draft,
                          paragraphs: draft.paragraphs.map((value, i) =>
                            i === index ? event.target.value : value,
                          ),
                        })
                      }
                    />
                  </label>
                ))}
                <div>
                  <button
                    type="button"
                    disabled={busy || draft.paragraphs.length >= 100}
                    onClick={() =>
                      change({
                        ...draft,
                        paragraphs: [...draft.paragraphs, ""],
                      })
                    }
                  >
                    添加段落
                  </button>
                </div>
              </div>
              <div className="panel pad stack">
                <h2>题目、答案和解析</h2>
                {draft.questions.map((question, index) => (
                  <fieldset
                    className="question-editor stack"
                    key={question.id}
                    disabled={busy}
                  >
                    <legend>第 {index + 1} 题</legend>
                    <label>
                      题干
                      <textarea
                        value={question.stem}
                        onChange={(event) =>
                          editQuestion(index, { stem: event.target.value })
                        }
                      />
                    </label>
                    {question.options.map((option, i) => (
                      <label key={i}>
                        选项 {i + 1}
                        <input
                          value={option}
                          onChange={(event) =>
                            editQuestion(index, {
                              options: question.options.map((value, j) =>
                                i === j ? event.target.value : value,
                              ),
                            })
                          }
                        />
                      </label>
                    ))}
                    {question.kind === "sentence_completion" ? (
                      <label>
                        可接受答案（每行一个）
                        <textarea
                          value={(question.acceptedAnswers ?? []).join("\n")}
                          onChange={(event) =>
                            editQuestion(index, {
                              acceptedAnswers: event.target.value.split("\n"),
                            })
                          }
                        />
                      </label>
                    ) : (
                      <label>
                        正确选项
                        <select
                          value={question.correctIndex ?? ""}
                          onChange={(event) =>
                            editQuestion(index, {
                              correctIndex:
                                event.target.value === ""
                                  ? null
                                  : Number(event.target.value),
                            })
                          }
                        >
                          <option value="">请选择</option>
                          {question.options.map((option, i) => (
                            <option value={i} key={i}>
                              {option || `选项 ${i + 1}`}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label>
                      解析
                      <textarea
                        value={question.explanation ?? ""}
                        onChange={(event) =>
                          editQuestion(index, {
                            explanation: event.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      证据段落
                      <input
                        type="number"
                        min={1}
                        max={draft.paragraphs.length}
                        value={question.evidence?.paragraph || ""}
                        onChange={(event) =>
                          editQuestion(index, {
                            evidence: {
                              quote: "",
                              ...question.evidence,
                              paragraph: Number(event.target.value),
                            },
                          })
                        }
                      />
                    </label>
                    {question.kind === "true_false_not_given" &&
                    question.correctIndex === 2 ? (
                      <label>
                        原文未提及的信息
                        <textarea
                          value={question.evidence?.missingInformation ?? ""}
                          onChange={(event) =>
                            editQuestion(index, {
                              evidence: {
                                paragraph: 0,
                                quote: "",
                                ...question.evidence,
                                missingInformation: event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    ) : (
                      <label>
                        原文引用
                        <textarea
                          value={question.evidence?.quote ?? ""}
                          onChange={(event) =>
                            editQuestion(index, {
                              evidence: {
                                paragraph: 0,
                                ...question.evidence,
                                quote: event.target.value,
                              },
                            })
                          }
                        />
                      </label>
                    )}
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          change({
                            ...draft,
                            questions: draft.questions.filter(
                              (_, i) => i !== index,
                            ),
                          })
                        }
                      >
                        移除此题
                      </button>
                    </div>
                  </fieldset>
                ))}
                <div>
                  <button
                    type="button"
                    disabled={busy || draft.questions.length >= 100}
                    onClick={() =>
                      change({
                        ...draft,
                        questions: [
                          ...draft.questions,
                          {
                            id: crypto.randomUUID(),
                            kind: "choice",
                            stem: "",
                            options: ["", "", "", ""],
                            correctIndex: null,
                            explanation: "",
                          },
                        ],
                      })
                    }
                  >
                    添加单选题
                  </button>
                </div>
              </div>
            </div>
          )}
          <div className="panel pad stack">
            <label className="check">
              <input
                type="checkbox"
                checked={reviewed}
                disabled={!ready || busy}
                onChange={(event) => setReviewed(event.target.checked)}
              />
              我已核对文章、题目、答案和解析
            </label>
            {!ids.length && (
              <p className="muted">课堂暂无有效学生。邀请学生后即可发布。</p>
            )}
            <div className="actions">
              {!preview && (
                <button disabled={busy} onClick={() => void action(save)}>
                  保存并检查
                </button>
              )}
              <button disabled={busy} onClick={() => setPreview(!preview)}>
                {preview ? "返回编辑" : "学生预览"}
              </button>
              <button
                className="primary"
                disabled={
                  busy || !ready || !reviewed || !ids.length || !preview
                }
                onClick={() => dialog.current?.showModal()}
              >
                确认发布
              </button>
            </div>
          </div>
          <dialog ref={dialog} aria-label="向课堂发布作业">
            <div className="pad stack">
              <h2>向课堂发布作业</h2>
              <p>
                {draft.title} · 本班 {ids.length} 位有效学生
              </p>
              {error && (
                <p role="alert" className="error">
                  {error}{" "}
                  <button onClick={() => void reload()} disabled={busy}>
                    刷新名单
                  </button>
                </p>
              )}
              <div className="actions">
                <button onClick={() => dialog.current?.close()} disabled={busy}>
                  取消
                </button>
                <button
                  className="primary"
                  onClick={() => void action(publish)}
                  disabled={busy || !ids.length}
                >
                  确认发布
                </button>
              </div>
            </div>
          </dialog>
        </>
      )}
    </section>
  );
}

interface ScoreReport {
  title: string;
  summary: {
    assignedCount: number;
    completedCount: number;
    incompleteCount: number;
    averageScore: number | null;
  };
  learners: {
    userId: number;
    username: string;
    status: string;
    score: number | null;
  }[];
}

export function PaperScores({
  path,
  route,
  paper,
  members,
  assigning,
  reload,
}: {
  path: string;
  route: string;
  paper: number;
  members: Member[];
  assigning: boolean;
  reload: () => Promise<void>;
}) {
  const endpoint = `${path}/papers/${paper}`;
  const [report, setReport] = useState<ScoreReport>();
  const [assigned, setAssigned] = useState<number[]>();
  const [chosen, setChosen] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const uid = useRequestUid();

  const load = useCallback(
    async (signal?: AbortSignal) => {
      try {
        if (assigning) {
          const data = await api<{ list: { userId: number }[] }>(
            endpoint + "/recipients",
            undefined,
            signal,
          );
          setAssigned(data.list.map((user) => user.userId));
        } else setReport(await api(endpoint + "/scores", undefined, signal));
        setError("");
      } catch (cause) {
        if (!signal?.aborted) setError(classroomError(cause));
      }
    },
    [assigning, endpoint],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const eligible = members.filter(
    (member) => member.status === "active" && !assigned?.includes(member.id),
  );
  async function assign(event: FormEvent) {
    event.preventDefault();
    if (busy || !chosen.length) return;
    setBusy(true);
    setError("");
    try {
      const userIds = [...chosen].sort((a, b) => a - b);
      const result = await api<{ assignmentResult: { addedCount: number } }>(
        endpoint + "/assign",
        { userIds, requestUid: uid(JSON.stringify(userIds)) },
      );
      setNotice(`已补发给 ${result.assignmentResult.addedCount} 位学生`);
      setChosen([]);
      await Promise.all([load(), reload()]);
    } catch (cause) {
      setError(classroomError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel pad stack">
      <div className="page-title">
        <h2>{assigning ? "补发旧作业" : (report?.title ?? "学生成绩")}</h2>
        <a href={route}>返回作业</a>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <button onClick={() => void load()} disabled={busy}>
            重试
          </button>
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {assigning
        ? assigned && (
            <form className="stack" onSubmit={(event) => void assign(event)}>
              {eligible.length ? (
                eligible.map((member) => (
                  <label className="check" key={member.id}>
                    <input
                      type="checkbox"
                      checked={chosen.includes(member.id)}
                      disabled={busy}
                      onChange={(event) =>
                        setChosen((ids) =>
                          event.target.checked
                            ? [...ids, member.id]
                            : ids.filter((id) => id !== member.id),
                        )
                      }
                    />
                    {member.name}
                  </label>
                ))
              ) : (
                <p>本班有效学生均已收到这份作业。</p>
              )}
              <div>
                <button className="primary" disabled={busy || !chosen.length}>
                  确认补发{chosen.length ? ` ${chosen.length} 人` : ""}
                </button>
              </div>
            </form>
          )
        : report && (
            <>
              <p>
                接收 {report.summary.assignedCount} 人 · 已提交{" "}
                {report.summary.completedCount} 人 · 未提交{" "}
                {report.summary.incompleteCount} 人 · 平均{" "}
                {report.summary.averageScore === null
                  ? "—"
                  : `${Math.round(report.summary.averageScore * 10) / 10} 分`}
              </p>
              <table>
                <thead>
                  <tr>
                    <th>学生</th>
                    <th>提交状态</th>
                    <th>成绩</th>
                  </tr>
                </thead>
                <tbody>
                  {report.learners.map((row) => (
                    <tr key={row.userId}>
                      <td>
                        {members.find((member) => member.id === row.userId)
                          ?.name ?? row.username}
                      </td>
                      <td>
                        {row.status === "completed"
                          ? "已提交"
                          : row.status === "in_progress"
                            ? "作答中"
                            : "未开始"}
                      </td>
                      <td>
                        {row.score === null
                          ? row.status === "completed"
                            ? "无法评分"
                            : "—"
                          : `${row.score} 分`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
      {!(assigning ? assigned : report) && !error && (
        <p role="status">正在载入…</p>
      )}
    </section>
  );
}
