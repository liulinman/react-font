import { ReadingSourceIssueReview } from "./ReadingSourceIssueReview";
import { ReadingImportProgress } from "./ReadingImportProgress";
import { PracticePublishDialog } from "./PracticePublishDialog";
import "./readingWorkbench.css";
import { ReadingQuestionReadout, readingOptionLabel } from "./ReadingQuestionReadout";
import { ReadingPracticeRecipients } from "./ReadingPracticeRecipients";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Drawer,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
} from "antd";
import request from "@font/api";
import { getPractice, newRequestId } from "./api/readingPractice";
import type {
  AdminPractice,
  PracticeContent,
} from "./api/readingPractice.type";
import {
  SourceFiles,
  sourceUrl,
  workflowRequest,
  type Source,
} from "./ReadingImport";
type Question = PracticeContent["questions"][number];
const fieldNames: Record<string, string> = {
  stem: "题干",
  kind: "题型",
  options: "全部选项",
  correctIndex: "选项答案",
  acceptedAnswers: "填空参考答案",
  maxWords: "最多词数",
  evidence: "证据",
  explanation: "解析",
  instructions: "作答要求",
};
export function needsAnswerCompletion(content: PracticeContent, q: Question) {
  if (!["choice", "true_false_not_given", "matching_features", "sentence_completion"].includes(q.kind)) return false;
  const e = q.evidence;
  return (
    (q.kind === "sentence_completion"
      ? !q.acceptedAnswers?.length || q.acceptedAnswers.some((answer) => !answer.trim() || (q.maxWords != null && answer.trim().split(/\s+/).length > q.maxWords)) || (q.maxWords != null && (!Number.isInteger(q.maxWords) || q.maxWords < 1))
      : !Number.isInteger(q.correctIndex) || q.correctIndex! < 0 || q.correctIndex! >= q.options.length) ||
    !q.explanation?.trim() ||
    !Number.isInteger(e?.paragraph) ||
    e.paragraph < 1 ||
    e.paragraph > content.paragraphs.length ||
    (q.kind === "true_false_not_given" && q.correctIndex === 2
      ? !e.missingInformation?.trim()
      : !e.quote?.trim() ||
        !content.paragraphs[e.paragraph - 1]?.includes(e.quote))
  );
}
function errorMessage(e: any) {
  return (
    e?.response?.data?.message || e?.message || "操作失败，输入已保留，请重试。"
  );
}
export function ReadingPracticeWorkbench({
  paper,
  onClose,
  onChange,
}: {
  paper: AdminPractice | null;
  onClose: () => void;
  onChange: (p: AdminPractice) => void;
}) {
  const [content, setContent] = useState<PracticeContent>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [dirty, setDirty] = useState(false),
    [preview, setPreview] = useState(false),
    [selected, setSelected] = useState(""),
    [checked, setChecked] = useState<string[]>([]),
    [resolutions, setResolutions] = useState<
      Record<string, { reason: string; evidence: string }>
    >({}),
    [sources, setSources] = useState<Source[]>([]),
    [feedback, setFeedback] = useState<any[]>([]),
    [chatText, setChatText] = useState(""),
    [chatAction, setChatAction] = useState("explain"),
    [chatFields, setChatFields] = useState<string[]>(["explanation"]),
    [acceptFields, setAcceptFields] = useState<Record<string, string[]>>({}),
    [correction, setCorrection] = useState({
      action: "answer",
      correctIndex: 0,
      acceptedAnswers: [] as string[],
      reason: "",
      explanation: "",
    }),
    [impact, setImpact] = useState<any>(),
    [handling, setHandling] = useState<
      Record<string, { status: string; reason: string }>
    >({});
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("edit");
  const [editingContent, setEditingContent] = useState(false);
  const [inlineQuestion, setInlineQuestion] = useState<string | null>(null);
  const autoStarted = useRef<number | null>(null);
  useEffect(() => {
    setActiveTab("review");
    setInlineQuestion(null);
    setPublishOpen(false);
    autoStarted.current = null;
    setEditingContent(false);
    setError("");
    setPreview(false);
  }, [paper?.id]);
  const publishUid = useRef(""),
    correctionUid = useRef("");
  useEffect(() => {
    if (paper) {
      setContent(paper.content ? structuredClone(paper.content) : undefined);
      setSources(paper.workflow?.sources || []);
      setChecked(
        (paper.workflow?.reviewedQuestions || []).filter((id: string) => {
          const x = paper.content?.questions.find((q) => q.id === id);
          return (
            x &&
            paper.content &&
            ["choice", "true_false_not_given", "matching_features", "sentence_completion"].includes(x.kind) &&
            !needsAnswerCompletion(paper.content, x)
          );
        }),
      );
      setSelected((s) =>
        paper.content?.questions.some((q) => q.id === s)
          ? s
          : paper.content?.questions[0]?.id || "",
      );
      setDirty(false);
      setResolutions({});
      publishUid.current = newRequestId();
    }
  }, [paper]);
  useEffect(() => {
    if (paper)
      void request(workflowRequest(paper.id, "feedback"))
        .then((r: any) => setFeedback(r.list))
        .catch(() => setFeedback([]));
  }, [paper]);
  const run = async (action: string, data?: unknown) => {
    if (!paper || busy) return;
    setBusy(true);
    setError("");
    try {
      const next = await request({
        ...workflowRequest(paper.id, action, data),
        ...(["check", "complete-answers"].includes(action) ? { config: { timeout: 300000 } } : {}),
      });
      if (next?.content || next?.status) onChange(next);
      return next;
    } catch (e) {
      setError(errorMessage(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  };
  const change = (next: PracticeContent) => {
    setContent(next);
    setDirty(true);
    setImpact(undefined);
  };
  const update = (patch: Partial<Question>) => {
    if (content)
      change({
        ...content,
        questions: content.questions.map((q) =>
          q.id === selected ? { ...q, ...patch, answerSource: "teacher" } : q,
        ),
      });
  };
  const q = content?.questions.find((q) => q.id === selected),
    w = paper?.workflow || {},
    editable = paper?.status === "draft",
    revision = w.revision || 1;
  useEffect(() => {
    setCorrection((current) => ({ ...current, correctIndex: q?.correctIndex ?? 0, acceptedAnswers: q?.acceptedAnswers || [] }));
  }, [selected, paper?.id]);
  const latestMessages: any[] = w.chats?.[selected] || [];
  const save = async () => {
    const next = await run("save-check", { revision, content });
    if (next) { setInlineQuestion(null); setEditingContent(false); setActiveTab("review"); }
  };
  const autoStatus = w.autoReview?.status;
  const preparing = ["queued", "generating"].includes(paper?.status || "") || ["pending", "processing"].includes(autoStatus);
  useEffect(() => {
    if (!paper || !preparing || busy || dirty) return;
    let alive = true;
    const timer = setInterval(() => {
      void request(getPractice(paper.id)).then((next) => { if (alive) onChange(next); }).catch(() => undefined);
    }, 3000);
    return () => { alive = false; clearInterval(timer); };
  }, [paper?.id, preparing, busy, dirty, onChange]);
  useEffect(() => {
    if (!paper || !editable || !content || dirty || busy || preparing || w.qualityRevision === revision || autoStatus === "failed" || autoStarted.current === paper.id) return;
    autoStarted.current = paper.id;
    void run("check", { revision, repair: true });
  }, [paper?.id, editable, !!content, dirty, busy, preparing, autoStatus, revision, w.qualityRevision]);
  const moveOption = (i: number, delta: number) => {
    if (!q) return;
    const options = [...q.options];
    const j = i + delta;
    [options[i], options[j]] = [options[j], options[i]];
    const correctIndex =
      q.correctIndex === i ? j : q.correctIndex === j ? i : q.correctIndex;
    update({ options, correctIndex });
  };
  const close = () => {
    if (dirty)
      Modal.confirm({
        title: "尚有未保存编辑",
        okText: "放弃并关闭",
        cancelText: "继续编辑",
        content: "关闭会丢失当前未保存内容。",
        onOk: onClose,
      });
    else onClose();
  };
  const issueOpen = (i: any) => !i.resolved && !(i.type === "ai" && resolutions[i.id]?.reason.trim() && resolutions[i.id]?.evidence.trim());
  const unresolvedIssues = (w.issues || []).filter(issueOpen);
  const unresolvedCount = unresolvedIssues.length;
  const issuesFor = (id: string) => unresolvedIssues.filter((i: any) => i.questionId === id);
  const problemQuestions = content?.questions.filter((x) => issuesFor(x.id).length || needsAnswerCompletion(content, x)) || [];
  const firstBlock = unresolvedIssues.find((i: any) => i.blocking);
  const handleIssue = (issue: any) => {
    if (issue.type === "source") { setActiveTab("materials"); return; }
    setActiveTab("review");
    setTimeout(() => {
      const target = document.getElementById(`review-issue-${issue.id}`);
      target?.querySelectorAll("details").forEach(detail => { detail.open = true; });
      target?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    }, 100);
  };
  const checkAndRepair = () => void run("check", { revision, repair: true });
  const jumpToQuestion = (id?: string) => {
    if (id) setSelected(id);
    setActiveTab("review");
    setTimeout(() => {
      const target = document.getElementById(id ? `review-question-${id}` : "review-global-issues");
      target?.querySelectorAll("details").forEach((detail) => { detail.open = true; });
      target?.scrollIntoView?.({ block: "start", behavior: "smooth" });
    }, 100);
  };
  const humanMessage = (text?: string) => text?.replace(/evidence\.paragraph/g, "引用段落") || "请核实本题内容";
  const publish = () => { setError(""); setPublishOpen(true); };
  const confirmPublish = async (recipients: {targetType:"all"|"selected";targetUserIds?:number[]}) => {
    const result = await run("publish", {
      revision, reviewed: true, confirmAll: true, recipients,
      resolutions: Object.entries(resolutions).filter(([, r]) => r.reason.trim() && r.evidence.trim()).map(([issueId, r]) => ({ issueId, ...r })),
      requestUid: publishUid.current,
    });
    if (result) setPublishOpen(false);
  };
  const editQuestion = (id: string) => {
    if (busy || preparing) return;
    setSelected(id);
    setInlineQuestion(id);
    setActiveTab("review");
    setTimeout(
      () =>
        document
          .getElementById(`review-question-${id}`)
          ?.scrollIntoView?.({ block: "center", behavior: "smooth" }),
      100,
    );
  };
  return (
    <Drawer
      width="min(1120px, 100vw)"
      rootClassName={"reading-workbench" + (!content ? " reading-workbench-processing" : "")}
      open={!!paper}
      title={!content ? "整理阅读练习" : editable ? "审核并发布练习" : paper?.title || "阅读练习"}
      onClose={close}
      footer={
        <div className="reading-workbench-footer">
          <div className="reading-workbench-footer-status"><span role="status">
            {!content ? "原稿已保存，可关闭后从练习列表继续查看。" : editable
              ? dirty
                ? "修改尚未保存，保存后需要重新核对。"
                : w.reviewedRevision === revision
                  ? "核对完成，可以发布给学生。"
                  : w.qualityRevision !== revision
                    ? preparing ? "AI 正在自动处理，请稍候。" : "检查尚未完成，请重试检查。"
                    : `共 ${content?.questions.length || 0} 题${problemQuestions.length ? `，${problemQuestions.length} 题有提示，请核实` : "，自动检查已完成，可审核后发布"}。`
              : "已发布内容仅供查看；更正答案请打开“反馈与纠错”。"}
          </span>
            {editable && firstBlock && <p><span>发布前需处理：{humanMessage(firstBlock.message)}</span><Button size="small" onClick={() => handleIssue(firstBlock)}>前往处理</Button></p>}
          </div>
          <Space wrap>
            <Button onClick={close}>关闭</Button>
            {content && <Button onClick={() => setPreview(true)}>学生视角预览</Button>}
            {editable &&
              content &&
              (dirty ? (
                <Button key="save" type="primary" onClick={save} loading={busy}>
                  保存并复查
                </Button>
              ) : (
                <Button key="publish" aria-label="确认并发布" type="primary"
                  disabled={busy || preparing || w.qualityRevision !== revision || unresolvedIssues.some((i: any) => i.blocking) || content.questions.length === 0 || content.questions.some((x) => needsAnswerCompletion(content, x))}
                  onClick={publish}>确认并发布</Button>
              ))}
            {!editable &&
              paper &&
              ["published", "withdrawn"].includes(paper.status) && (
                <Button
                  loading={busy}
                  onClick={() =>
                    void run("revise", { requestUid: newRequestId() })
                  }
                >
                  创建内容修订版
                </Button>
              )}
          </Space>
        </div>
      }
    >
      {error && <Alert type="error" showIcon message={error} />}
      {content && <Space wrap>
        <Tag>
          {
            {
              queued: "等待处理",
              generating: "AI处理中",
              draft: "待审核",
              published: "已发布",
              withdrawn: "已撤回",
              failed: "处理失败",
            }[paper?.status || "draft"]
          }
        </Tag>
        <span>
          {content?.questions.length || 0} 道题 ·{" "}
          {paper?.config.targetType === "all"
            ? "全部正常用户"
            : `${paper?.config.targetUserIds?.length || 0} 位指定用户`}
        </span>
        {dirty && <Tag color="orange">有未保存修改；保存后重新审核</Tag>}
        <details className="reading-workbench-meta">
          <summary>版本与难度</summary>内容版本 {w.version || 1} · 修改记录{" "}
          {revision} · 评分修订 {w.gradingRevision || 0} ·{" "}
          {w.sourceType
            ? "原稿材料，文章难度未标定"
            : `参考雅思难度 ${paper?.config.ieltsBand}（AI 生成，供参考）`}
        </details>
      </Space>}
      {!content ? (
        paper && <ReadingImportProgress key={paper.id} paper={paper} sources={sources} busy={busy} onRetry={() => void run("retry", {})} />
      ) : (
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          destroyOnHidden
          items={[
            {
              key: "edit",
              label: "1 阅读文章",
              children: (
                <>
                  <div className="reading-workbench-toolbar">
                    <span>
                      {editingContent
                        ? "修改后请保存，再重新核对题目。"
                        : editable
                          ? "先通读文章，接着核对每道题的答案和解析。"
                          : "已发布的文章与题目可直接查看。"}
                    </span>
                    {editable && (
                      <Button
                        onClick={() => setEditingContent(!editingContent)}
                      >
                        {editingContent ? "返回阅读" : "修改文章与题目"}
                      </Button>
                    )}
                  </div>
                  {!editingContent ? (
                    <article
                      aria-label="阅读文章"
                      className="reading-workbench-article"
                    >
                      <h1>{content.title}</h1>
                      {content.instructions && (
                        <p className="reading-workbench-instructions">
                          {content.instructions}
                        </p>
                      )}
                      {content.paragraphs.map((text, i) => (
                        <section key={i}>
                          <span className="reading-workbench-paragraph">
                            {content.paragraphLabels?.[i] || `第 ${i + 1} 段`}
                          </span>
                          <p>{text}</p>
                        </section>
                      ))}
                    </article>
                  ) : (
                    <div className="reading-workbench-editor">
                      <section>
                        <label>
                          标题
                          <Input
                            aria-label="练习标题"
                            value={content.title}
                            disabled={!editable || busy || preparing}
                            maxLength={160}
                            onChange={(e) =>
                              change({ ...content, title: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          作答要求
                          <Input.TextArea
                            value={content.instructions || ""}
                            disabled={!editable || busy || preparing}
                            onChange={(e) =>
                              change({
                                ...content,
                                instructions: e.target.value,
                              })
                            }
                          />
                        </label>
                        <h3>正文段落</h3>
                        {content.paragraphs.map((p, i) => (
                          <div key={i} style={{ marginBottom: 12 }}>
                            <Space>
                              <span>段落 {i + 1}</span>
                              <Input
                                aria-label={`原始段落标记${i + 1}`}
                                placeholder="原始段落标记"
                                value={content.paragraphLabels?.[i] || ""}
                                disabled={!editable || busy || preparing}
                                onChange={(e) => {
                                  const labels = [
                                    ...(content.paragraphLabels || []),
                                  ];
                                  labels[i] = e.target.value;
                                  change({
                                    ...content,
                                    paragraphLabels: labels,
                                  });
                                }}
                              />
                              <Button
                                disabled={!editable || busy || preparing}
                                onClick={() =>
                                  change({
                                    ...content,
                                    paragraphs: content.paragraphs.filter(
                                      (_, n) => n !== i,
                                    ),
                                    paragraphLabels: (
                                      content.paragraphLabels || []
                                    ).filter((_, n) => n !== i),
                                    questions: content.questions.map((x) => ({
                                      ...x,
                                      evidence: {
                                        ...x.evidence,
                                        paragraph:
                                          x.evidence.paragraph === i + 1
                                            ? 0
                                            : x.evidence.paragraph > i + 1
                                              ? x.evidence.paragraph - 1
                                              : x.evidence.paragraph,
                                      },
                                    })),
                                  })
                                }
                              >
                                移除段落
                              </Button>
                            </Space>
                            <Input.TextArea
                              value={p}
                              autoSize={{ minRows: 3, maxRows: 12 }}
                              disabled={!editable || busy || preparing}
                              onChange={(e) =>
                                change({
                                  ...content,
                                  paragraphs: content.paragraphs.map((v, n) =>
                                    n === i ? e.target.value : v,
                                  ),
                                })
                              }
                            />
                          </div>
                        ))}
                        <Button
                          disabled={!editable || busy || preparing}
                          onClick={() =>
                            change({
                              ...content,
                              paragraphs: [...content.paragraphs, ""],
                            })
                          }
                        >
                          添加段落
                        </Button>
                        <h3>题目</h3>
                        <Space wrap>
                          <Select
                            aria-label="选择题目"
                            style={{ minWidth: 230 }}
                            value={selected}
                            options={content.questions.map((x, i) => ({
                              value: x.id,
                              label: `${i + 1}. ${x.stem.slice(0, 40)}`,
                            }))}
                            onChange={setSelected}
                          />
                          <Button
                            disabled={!editable || busy || preparing}
                            onClick={() => {
                              const id = `q-${Date.now()}`;
                              change({
                                ...content,
                                questions: [
                                  ...content.questions,
                                  {
                                    id,
                                    kind: "choice",
                                    stem: "",
                                    options: ["", "", "", ""],
                                    correctIndex: null,
                                    explanation: "",
                                    evidence: { paragraph: 1 },
                                  },
                                ],
                              });
                              setSelected(id);
                            }}
                          >
                            添加题目
                          </Button>
                          {q && (
                            <Button
                              danger
                              disabled={!editable || busy || preparing}
                              onClick={() => {
                                change({
                                  ...content,
                                  questions: content.questions.filter(
                                    (x) => x.id !== q.id,
                                  ),
                                });
                                setSelected(
                                  content.questions.find((x) => x.id !== q.id)
                                    ?.id || "",
                                );
                              }}
                            >
                              移除本题
                            </Button>
                          )}
                        </Space>
                        {q && (
                          <>
                            <Space style={{ margin: "12px 0" }}>
                              <span>题型</span>
                              <Select
                                value={q.kind}
                                disabled={!editable || busy || preparing}
                                options={[
                                  { value: "choice", label: "单项选择" },
                                  { value: "sentence_completion", label: "句子填空" },
                                  { value: "matching_features", label: "人物 / 特征匹配" },
                                  {
                                    value: "true_false_not_given",
                                    label: "True / False / Not Given",
                                  },
                                  { value: "unsupported", label: "不支持题型" },
                                ]}
                                onChange={(kind) =>
                                  update({
                                    kind,
                                    ...(kind === "true_false_not_given"
                                      ? {
                                          options: [
                                            "True",
                                            "False",
                                            "Not Given",
                                          ],
                                          correctIndex: null,
                                          acceptedAnswers: undefined,
                                          maxWords: undefined,
                                        }
                                      : kind === "sentence_completion"
                                        ? { options: [], correctIndex: null, acceptedAnswers: [], maxWords: undefined }
                                        : { options: q.options.length ? q.options : ["", "", "", ""], correctIndex: null, acceptedAnswers: undefined, maxWords: undefined }),
                                  })
                                }
                              />
                              <InputNumber
                                aria-label="题序"
                                min={1}
                                max={content.questions.length}
                                value={
                                  content.questions.findIndex(
                                    (x) => x.id === q.id,
                                  ) + 1
                                }
                                disabled={!editable || busy || preparing}
                                onChange={(n) => {
                                  if (n) {
                                    const qs = content.questions.filter(
                                      (x) => x.id !== q.id,
                                    );
                                    qs.splice(n - 1, 0, q);
                                    change({ ...content, questions: qs });
                                  }
                                }}
                              />
                            </Space>
                            {q.originalText && (
                              <details>
                                <summary>原始题目内容</summary>
                                <pre style={{ whiteSpace: "pre-wrap" }}>
                                  {q.originalText}
                                </pre>
                              </details>
                            )}
                            <label>
                              题干
                              <Input.TextArea
                                aria-label="题干"
                                value={q.stem}
                                disabled={!editable || busy || preparing}
                                onChange={(e) =>
                                  update({ stem: e.target.value })
                                }
                              />
                            </label>
                            <label>
                              本题要求
                              <Input.TextArea
                                value={q.instructions || ""}
                                disabled={!editable || busy || preparing}
                                onChange={(e) =>
                                  update({ instructions: e.target.value })
                                }
                              />
                            </label>
                            {q.kind !== "sentence_completion" && q.kind !== "true_false_not_given" && (
                              <Button
                                disabled={!editable || q.options.length >= (q.kind === "matching_features" ? 20 : 4)}
                                onClick={() =>
                                  update({ options: [...q.options, ""] })
                                }
                              >
                                添加选项
                              </Button>
                            )}
                            {q.kind !== "sentence_completion" && q.options.map((o, i) => (
                              <div
                                key={i}
                                style={{
                                  display: "flex",
                                  gap: 8,
                                  marginTop: 8,
                                }}
                              >
                                <span>{String.fromCharCode(65 + i)}</span>
                                <Input.TextArea
                                  aria-label={`选项${String.fromCharCode(65 + i)}`}
                                  value={o}
                                  disabled={
                                    !editable ||
                                    q.kind === "true_false_not_given"
                                  }
                                  onChange={(e) =>
                                    update({
                                      options: q.options.map((x, n) =>
                                        n === i ? e.target.value : x,
                                      ),
                                    })
                                  }
                                />
                                <Button
                                  disabled={
                                    !editable ||
                                    i === 0 ||
                                    q.kind === "true_false_not_given"
                                  }
                                  onClick={() => moveOption(i, -1)}
                                >
                                  ↑
                                </Button>
                                <Button
                                  disabled={
                                    !editable ||
                                    i === q.options.length - 1 ||
                                    q.kind === "true_false_not_given"
                                  }
                                  onClick={() => moveOption(i, 1)}
                                >
                                  ↓
                                </Button>
                                <Button
                                  disabled={
                                    !editable ||
                                    q.kind === "true_false_not_given"
                                  }
                                  onClick={() =>
                                    update({
                                      options: q.options.filter(
                                        (_, n) => n !== i,
                                      ),
                                      correctIndex:
                                        q.correctIndex === i
                                          ? null
                                          : q.correctIndex !== null &&
                                              q.correctIndex > i
                                            ? q.correctIndex - 1
                                            : q.correctIndex,
                                    })
                                  }
                                >
                                  删除选项
                                </Button>
                              </div>
                            ))}
                            {q.kind === "sentence_completion" ? (
                              <>
                                <label>
                                  可接受答案（每行一个）
                                  <Input.TextArea aria-label="可接受答案" value={(q.acceptedAnswers || []).join("\n")} disabled={!editable || busy || preparing} onChange={(e) => update({ acceptedAnswers: e.target.value.split("\n") })} />
                                </label>
                                <label>
                                  最多词数（留空表示不限）
                                  <InputNumber aria-label="最多词数" min={1} precision={0} value={q.maxWords} disabled={!editable || busy || preparing} onChange={(value) => update({ maxWords: value ?? undefined })} />
                                </label>
                              </>
                            ) : <label>
                              正确答案{" "}
                              <Select
                                aria-label="正确答案"
                                allowClear
                                value={q.correctIndex ?? undefined}
                                disabled={!editable || busy || preparing}
                                style={{ width: 220, margin: 12 }}
                                options={q.options.map((o, i) => ({
                                  value: i,
                                  label: readingOptionLabel(q.kind, o.slice(0, 30), i),
                                }))}
                                onChange={(v) =>
                                  update({ correctIndex: v ?? null })
                                }
                              />
                            </label>}
                            <Tag>
                              {q.answerSource === "source"
                                ? "原材料答案"
                                : q.answerSource === "ai"
                                  ? "AI建议答案"
                                  : "老师修订答案"}
                            </Tag>
                            <label>
                              解析
                              <Input.TextArea
                                value={q.explanation}
                                disabled={!editable || busy || preparing}
                                onChange={(e) =>
                                  update({ explanation: e.target.value })
                                }
                              />
                            </label>
                            <label>
                              证据段落{" "}
                              <InputNumber
                                min={1}
                                max={content.paragraphs.length}
                                value={q.evidence.paragraph}
                                disabled={!editable || busy || preparing}
                                onChange={(n) =>
                                  update({
                                    evidence: {
                                      ...q.evidence,
                                      paragraph: n || 1,
                                    },
                                  })
                                }
                              />
                            </label>
                            <label>
                              原文引用
                              <Input.TextArea
                                value={q.evidence.quote || ""}
                                disabled={!editable || busy || preparing}
                                onChange={(e) =>
                                  update({
                                    evidence: {
                                      ...q.evidence,
                                      quote: e.target.value,
                                    },
                                  })
                                }
                              />
                            </label>
                            <label>
                              NG缺失信息
                              <Input.TextArea
                                value={q.evidence.missingInformation || ""}
                                disabled={!editable || busy || preparing}
                                onChange={(e) =>
                                  update({
                                    evidence: {
                                      ...q.evidence,
                                      missingInformation: e.target.value,
                                    },
                                  })
                                }
                              />
                            </label>
                            <small>
                              来源定位：
                              {q.sourceRef || "未提供，请对照原稿确认"}
                            </small>
                          </>
                        )}
                      </section>
                    </div>
                  )}
                </>
              ),
            },
            {
              key: "review",
              label: `2 核对题目${problemQuestions.length ? ` · ${problemQuestions.length} 题待处理` : unresolvedCount ? " · 文章待处理" : ""}`,
              children: (
                <>
                  <p className="admin-muted">
                    {editable
                      ? "审核文章、题目和答案；有问题可直接修改，确认无误后发布。"
                      : "查看已发布的题目与答案。更正答案请打开“反馈与纠错”。"}
                  </p>
                  {editable && (
                    <div className="reading-workbench-toolbar">
                      <span>自动修正可确定的出处错误、补全缺失内容并重新检查；有争议的答案仍需老师确认。</span>
                      <Button disabled={dirty || busy || preparing} loading={busy || preparing} onClick={checkAndRepair}>{autoStatus === "failed" ? "重试自动检查" : "重新检查"}</Button>
                    </div>
                  )}
                  {preparing && <Alert type="info" showIcon message="AI 正在自动整理、补全并检查，完成后即可审核，无需重复点击。" />}
                  {autoStatus === "failed" && <Alert type="error" showIcon message={w.autoReview.message || "自动检查未完成，内容已保留，请重试。"} />}
                  {w.lastCheckSummary && !dirty && <Alert type={unresolvedCount || problemQuestions.length ? "warning" : "success"} showIcon message={unresolvedCount || problemQuestions.length ? `已检查，仍有 ${problemQuestions.length} 题待处理${unresolvedIssues.some((i: any) => !i.questionId) ? "，另有文章或原稿提示" : ""}；本次已修复 ${w.lastCheckSummary.repairedQuestionIds?.length || 0} 题` : `本次已修复 ${w.lastCheckSummary.repairedQuestionIds?.length || 0} 题，检查结果已更新`} description={w.lastCheckSummary.repairs?.map((r: any, i: number) => <p key={i}>{humanMessage(r.message)}</p>)} />}
                  <p role="status">{w.qualityRevision !== revision || dirty ? "尚未完成当前内容检查" : `${content.questions.length - problemQuestions.length} 题正常、${problemQuestions.length} 题待处理`}{unresolvedIssues.some((i: any) => !i.questionId) ? "；另有文章或原稿提示待处理" : ""}</p>
                  <Space wrap aria-label="题目导航">
                    {content.questions.map((x, index) => <Button key={x.id} onClick={() => jumpToQuestion(x.id)} danger={issuesFor(x.id).length > 0 || needsAnswerCompletion(content, x)}>第 {index + 1} 题 · {issuesFor(x.id).length || needsAnswerCompletion(content, x) ? "待处理" : checked.includes(x.id) ? "已确认" : w.qualityRevision === revision && !dirty ? "可审核" : "待检查"}</Button>)}
                  </Space>
                  <div id="review-global-issues" />
                  {(w.issues || []).filter((i: any) => !i.resolved).map((i: any) => (
                    <Card
                      key={i.id}
                      id={`review-issue-${i.id}`}
                      size="small"
                      style={{ marginTop: 12 }}
                      title={`${i.questionId ? `第 ${content.questions.findIndex((q) => q.id === i.questionId) + 1} 题` : "整篇文章"} · ${i.type === "structure" ? "内容需要修改" : i.type === "source" ? "请补充原稿" : i.type === "source_text" ? "请核对原稿文字" : "请核实"}`}
                    >
                      <Alert
                        type={i.resolved ? "success" : "warning"}
                        message={humanMessage(i.message)}
                        description={
                          <>
                            {(i.actualParagraph != null || i.expectedParagraph != null || i.field === "evidence.paragraph") && <p>引用段落：当前第 {i.actualParagraph ?? content.questions.find((x) => x.id === i.questionId)?.evidence.paragraph ?? "未标注"} 段{i.expectedParagraph != null ? `，原文位于第 ${i.expectedParagraph} 段` : "，请对照原文核实"}</p>}
                            {i.evidence && <p>依据：{humanMessage(i.evidence)}</p>}
                            {i.quote && i.quote !== i.evidence && <blockquote><mark>{i.quote}</mark></blockquote>}
                            {i.suggestion && <p>建议：{humanMessage(i.suggestion)}</p>}
                            {i.type === "source" ? <><p>此问题涉及材料完整性，需要补充原稿后重新识别并检查。</p><Button size="small" onClick={() => setActiveTab("materials")}>查看并补充原稿</Button></> : i.questionId && content.questions.some((x) => x.id === i.questionId) ? <Space wrap><Button size="small" onClick={() => jumpToQuestion(i.questionId)}>定位题目与依据</Button>{editable && <Button size="small" onClick={() => editQuestion(i.questionId)}>修改此处</Button>}</Space> : <Button size="small" onClick={() => setActiveTab("edit")}>查看文章</Button>}
                          </>
                        }
                      />
                      {i.type === "source_text" && editable && <ReadingSourceIssueReview
                        key={`${i.id}-${revision}-${sources.map(s => s.id).join(",")}`}
                        sources={sources} disabled={dirty || busy || preparing}
                        onSupplement={() => setActiveTab("materials")}
                        onVerify={input => run("verify-source-issue", { revision, issueId: i.id, ...input })}
                      />}
                      {i.type === "ai" && !i.resolved && (
                        <details><summary>高级：认为这是误报</summary>
                          <Input.TextArea
                            aria-label="误报关闭理由"
                            placeholder="确认为误报的具体理由"
                            value={resolutions[i.id]?.reason || ""}
                            onChange={(e) =>
                              setResolutions({
                                ...resolutions,
                                [i.id]: {
                                  evidence: resolutions[i.id]?.evidence || "",
                                  reason: e.target.value,
                                },
                              })
                            }
                          />
                          <Input.TextArea
                            placeholder="支持关闭的原文证据"
                            value={resolutions[i.id]?.evidence || ""}
                            onChange={(e) =>
                              setResolutions({
                                ...resolutions,
                                [i.id]: {
                                  reason: resolutions[i.id]?.reason || "",
                                  evidence: e.target.value,
                                },
                              })
                            }
                          />
                        </details>
                      )}
                      {i.resolved && (
                        <p>
                          已关闭：{i.reason} · {i.resolutionEvidence}
                        </p>
                      )}
                    </Card>
                  ))}
                  <h3>
                    审核题目 <span className="reading-workbench-count">共 {content.questions.length} 题</span>
                  </h3>
                  {content.questions.map((x, i) => (
                    <Card
                      key={x.id}
                      id={`review-question-${x.id}`}
                      className="reading-workbench-question"
                      style={issuesFor(x.id).length || needsAnswerCompletion(content, x) ? { borderColor: "#faad14", scrollMarginTop: 24 } : { scrollMarginTop: 24 }}
                      title={<Space>第 {i + 1} 题{(issuesFor(x.id).length > 0 || needsAnswerCompletion(content, x)) && <Tag color="warning">待处理</Tag>}</Space>}
                      extra={
                        <Space>
                          {editable && (
                            <Button
                              size="small"
                              disabled={busy || preparing}
                              onClick={() => editQuestion(x.id)}
                            >
                              修改本题
                            </Button>
                          )}
                          <Button
                            size="small"
                            disabled={dirty || busy}
                            onClick={() => {
                              setSelected(x.id);
                              setActiveTab("chat");
                            }}
                          >
                            问 AI
                          </Button>
                        </Space>
                      }
                    >
                      {issuesFor(x.id).map((issue: any) => <Alert key={issue.id} type="warning" showIcon message={humanMessage(issue.message)} />)}
                      {needsAnswerCompletion(content, x) && !issuesFor(x.id).length && <Alert type="warning" showIcon message="答案、解析或引用依据不完整，请先使用 AI 检查并修复，或修改本题。" />}
                      <ReadingQuestionReadout question={x} />
                      {editable && inlineQuestion === x.id && (
                        <div className="reading-workbench-inline-editor" style={{ display: "grid", gap: 12, marginTop: 12 }}>
                          <label>题干<Input.TextArea aria-label="就地修改题干" value={x.stem} onChange={(e) => update({ stem: e.target.value })} /></label>
                          {x.kind === "sentence_completion" ? <label>可接受答案（每行一个）<Input.TextArea aria-label="就地修改答案" value={(x.acceptedAnswers || []).join("\n")} onChange={(e) => update({ acceptedAnswers: e.target.value.split("\n") })} /></label> : <label>正确答案<Select aria-label="就地修改正确答案" value={x.correctIndex ?? undefined} options={x.options.map((option, index) => ({ value: index, label: readingOptionLabel(x.kind, option, index) }))} onChange={(value) => update({ correctIndex: value })} /></label>}
                          <label>解析<Input.TextArea aria-label="就地修改解析" autoSize={{ minRows: 3 }} value={x.explanation} onChange={(e) => update({ explanation: e.target.value })} /></label>
                          <label>引用段落<InputNumber aria-label="就地修改引用段落" min={1} max={content.paragraphs.length} value={x.evidence.paragraph} onChange={(n) => update({ evidence: { ...x.evidence, paragraph: n || 1 } })} /></label>
                          <label>原文引用<Input.TextArea aria-label="就地修改原文引用" value={x.evidence.quote} onChange={(e) => update({ evidence: { ...x.evidence, quote: e.target.value } })} /></label>
                          {x.kind === "true_false_not_given" && x.correctIndex === 2 && <label>缺失信息<Input.TextArea aria-label="就地修改缺失信息" value={x.evidence.missingInformation} onChange={(e) => update({ evidence: { ...x.evidence, missingInformation: e.target.value } })} /></label>}
                          <Button type="primary" disabled={!dirty || busy} loading={busy} onClick={() => void save()}>保存并复查本题</Button>
                        </div>
                      )}

                    </Card>
                  ))}
                </>
              ),
            },
            {
              key: "materials",
              label: "原稿与历史",
              children: (
                <div className="reading-workbench-materials">
                  {" "}
                  <section>
                    <h3>原始材料</h3>
                    {w.importInput?.text && (
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
                          fontFamily: "inherit",
                          maxHeight: 400,
                          overflow: "auto",
                        }}
                      >
                        {w.importInput.text}
                      </pre>
                    )}
                    {w.importInput?.answerText && (
                      <details>
                        <summary>原始答案与解析</summary>
                        <pre style={{ whiteSpace: "pre-wrap" }}>
                          {w.importInput.answerText}
                        </pre>
                      </details>
                    )}
                    <SourceFiles
                      value={sources}
                      onChange={setSources}
                      disabled={!editable || busy || dirty}
                    />
                    {editable && (
                      <Button
                        disabled={
                          busy ||
                          dirty ||
                          JSON.stringify(sources) ===
                            JSON.stringify(w.sources || [])
                        }
                        onClick={() =>
                          void run("sources", {
                            revision,
                            sourceIds: sources.map((s) => s.id),
                          })
                        }
                      >
                        保存原稿
                      </Button>
                    )}
                    {editable && (
                      <Button
                        disabled={dirty || busy || !sources.length}
                        onClick={() =>
                          void run("recognize-sources", { revision })
                        }
                      >
                        重新识别原稿
                      </Button>
                    )}
                    {w.sourceCandidate && (
                      <details>
                        <summary>查看重新识别的结果（确认后才替换）</summary>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 16,
                          }}
                        >
                          <pre style={{ whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(content, null, 2)}
                          </pre>
                          <pre style={{ whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(w.sourceCandidate.content, null, 2)}
                          </pre>
                        </div>
                        <Button
                          disabled={
                            dirty ||
                            busy ||
                            w.sourceCandidate.revision !== revision
                          }
                          onClick={() =>
                            void run("accept-source", {
                              revision,
                              candidateId: w.sourceCandidate.id,
                            })
                          }
                        >
                          采用识别结果并重新核对
                        </Button>
                      </details>
                    )}
                    {sources[0] && (
                      <iframe
                        title="原稿对照"
                        src={sourceUrl(sources[0])}
                        style={{
                          width: "100%",
                          height: 600,
                          border: "1px solid #ddd",
                          marginTop: 16,
                        }}
                      />
                    )}
                    <details>
                      <summary>修订历史（保留旧原稿与内容）</summary>
                      {(w.history || []).map((h: any, i: number) => (
                        <details key={h.id || i}>
                          <summary>
                            {h.at} · {h.kind} · {h.actor}
                          </summary>
                          <pre style={{ whiteSpace: "pre-wrap" }}>
                            {JSON.stringify(h.before, null, 2)}
                          </pre>
                          {h.before?.sources?.map((s: Source) => (
                            <a
                              key={s.id}
                              href={sourceUrl(s)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {s.name}{" "}
                            </a>
                          ))}
                        </details>
                      ))}
                    </details>
                  </section>
                </div>
              ),
            },
            {
              key: "chat",
              label: "AI 帮助",
              children: (
                <div className="reading-workbench-form">
                  <Select
                    style={{ width: "100%" }}
                    value={selected}
                    options={content.questions.map((x, i) => ({
                      value: x.id,
                      label: `${i + 1}. ${x.stem}`,
                    }))}
                    onChange={setSelected}
                  />
                  {!editable && (
                    <Alert
                      type="info"
                      message="已发布题目仅生成建议。答案错误请到纠错重评处理；内容变化请创建修订版。"
                    />
                  )}
                  {latestMessages.map((m) => (
                    <Card
                      key={m.id}
                      style={{ marginTop: 12 }}
                      size="small"
                      title={`${m.role === "user" ? "老师" : "AI"} · 修订 ${m.revision}`}
                    >
                      <p style={{ whiteSpace: "pre-wrap" }}>{m.content}</p>
                      {m.requiresArticleChange && (
                        <Alert
                          type="warning"
                          message="此建议需要扩大至文章修改，不会自动应用。请创建或编辑草稿后重新审核。"
                        />
                      )}
                      {m.candidate && (
                        <>
                          <h4>候选差异（尚未应用）</h4>
                          {[
                            ...new Set<string>([
                              ...(m.fields || []),
                              ...(m.relatedFields || []),
                            ]),
                          ].map((f) => (
                            <div key={f}>
                              <strong>
                                {fieldNames[f] || f}
                                {m.relatedFields?.includes(f)
                                  ? " · 关联修改"
                                  : ""}
                              </strong>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "1fr 1fr",
                                  gap: 16,
                                }}
                              >
                                <pre style={{ whiteSpace: "pre-wrap" }}>
                                  {JSON.stringify(
                                    f.startsWith("options.")
                                      ? q?.options[Number(f.split(".")[1])]
                                      : (q as any)?.[f],
                                    null,
                                    2,
                                  )}
                                </pre>
                                <pre style={{ whiteSpace: "pre-wrap" }}>
                                  {JSON.stringify(
                                    f.startsWith("options.")
                                      ? m.candidate.options?.[
                                          Number(f.split(".")[1])
                                        ]
                                      : m.candidate[f],
                                    null,
                                    2,
                                  )}
                                </pre>
                              </div>
                            </div>
                          ))}
                          <Checkbox.Group
                            value={acceptFields[m.id] || []}
                            options={[
                              ...new Set<string>([
                                ...(m.fields || []),
                                ...(m.relatedFields || []),
                              ]),
                            ].map((f) => ({
                              value: f,
                              label: fieldNames[f] || f,
                            }))}
                            onChange={(v) =>
                              setAcceptFields({
                                ...acceptFields,
                                [m.id]: v as string[],
                              })
                            }
                          />
                          <Button
                            disabled={
                              !editable ||
                              dirty ||
                              busy ||
                              m.accepted ||
                              m.revision !== revision ||
                              !acceptFields[m.id]?.length
                            }
                            onClick={() =>
                              void run("accept", {
                                revision,
                                questionId: selected,
                                messageId: m.id,
                                fields: acceptFields[m.id],
                              })
                            }
                          >
                            {m.accepted ? "已应用" : "确认所选差异并应用"}
                          </Button>
                          <p>不接受即保留原内容；可继续追问调整建议。</p>
                        </>
                      )}
                    </Card>
                  ))}
                  <Space wrap style={{ marginTop: 16 }}>
                    <Select
                      value={chatAction}
                      options={[
                        { value: "explain", label: "仅解释 / 检查" },
                        { value: "repair", label: "提出最小修复" },
                        { value: "regenerate", label: "主动重新生成整题" },
                      ]}
                      onChange={setChatAction}
                    />
                    <Select
                      mode="multiple"
                      style={{ minWidth: 300 }}
                      value={chatFields}
                      onChange={setChatFields}
                      options={[
                        ...Object.entries(fieldNames).map(([value, label]) => ({
                          value,
                          label,
                        })),
                        ...(q?.options || []).map((_, i) => ({
                          value: `options.${i}`,
                          label: `仅${String.fromCharCode(65 + i)}选项`,
                        })),
                      ]}
                    />
                  </Space>
                  <Input.TextArea
                    rows={4}
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    maxLength={5000}
                    placeholder="例如：原文只有参加人数，为什么能比较名额？只检查此题。"
                  />
                  <Button
                    loading={busy}
                    disabled={dirty || !selected || !chatText.trim()}
                    onClick={async () => {
                      const result = await run("chat", {
                        revision,
                        questionId: selected,
                        message: chatText,
                        action: chatAction,
                        fields: chatFields,
                      });
                      if (result) setChatText("");
                    }}
                  >
                    发送并保留对话
                  </Button>
                </div>
              ),
            },
            {
              key: "feedback",
              label: `反馈与纠错 (${feedback.length})`,
              children: (
                <div className="reading-workbench-form">
                  <h3>学生反馈</h3>
                  {!feedback.length && (
                    <p className="admin-muted">暂无学生反馈</p>
                  )}
                  {content.questions.map((x) => {
                    const group = feedback.filter((f) => f.questionId === x.id);
                    return group.length ? (
                      <Card key={x.id} title={`${x.id} · ${x.stem}`}>
                        {group.map((f) => (
                          <div key={f.id} style={{ marginBottom: 16 }}>
                            <p>
                              用户 {f.userId} · {f.type} · <Tag>{f.status}</Tag>
                            </p>
                            <p>{f.message}</p>
                            <Space>
                              <Select
                                value={handling[f.id]?.status || f.status}
                                options={[
                                  "pending",
                                  "processing",
                                  "resolved",
                                  "reopened",
                                ].map((v, i) => ({
                                  value: v,
                                  label: [
                                    "待处理",
                                    "处理中",
                                    "已解决",
                                    "重新打开",
                                  ][i],
                                }))}
                                onChange={(status) =>
                                  setHandling({
                                    ...handling,
                                    [f.id]: {
                                      status,
                                      reason:
                                        handling[f.id]?.reason ||
                                        f.reason ||
                                        "",
                                    },
                                  })
                                }
                              />
                              <Input
                                placeholder="处理理由；学生提交后才显示"
                                value={handling[f.id]?.reason ?? f.reason ?? ""}
                                onChange={(e) =>
                                  setHandling({
                                    ...handling,
                                    [f.id]: {
                                      status:
                                        handling[f.id]?.status || f.status,
                                      reason: e.target.value,
                                    },
                                  })
                                }
                              />
                              <Button
                                disabled={busy}
                                onClick={async () => {
                                  const r = await run(
                                    `feedback/${f.id}`,
                                    handling[f.id] || {
                                      status: f.status,
                                      reason: f.reason,
                                    },
                                  );
                                  if (r) setFeedback(r.list);
                                }}
                              >
                                保存处理
                              </Button>
                            </Space>
                          </div>
                        ))}
                      </Card>
                    ) : null;
                  })}
                  {paper &&
                    ["published", "withdrawn"].includes(paper.status) && (
                      <>
                        {paper.status === "published" && (
                          <Button
                            disabled={busy}
                            onClick={() => setRecipientsOpen(true)}
                          >
                            追加接收人
                          </Button>
                        )}
                        <h3>老师主动纠错 / 重评全部作答</h3>
                        <Select
                          style={{ width: "100%" }}
                          value={selected}
                          options={content.questions.map((x, i) => ({
                            value: x.id,
                            label: `${i + 1}. ${x.stem}`,
                          }))}
                          onChange={(id) => {
                            setSelected(id);
                            setImpact(undefined);
                          }}
                        />
                        <p>
                          原题内容保持不变，修正仅影响当前内容版本。实质歧义请选择作废。
                        </p>
                        <Select
                          value={correction.action}
                          options={[
                            { value: "answer", label: "更正评分答案" },
                            { value: "void", label: "作废题目" },
                            { value: "restore", label: "恢复有效并重评" },
                            { value: "explanation", label: "补充解析留痕" },
                          ]}
                          onChange={(action) => {
                            setCorrection({ ...correction, action });
                            setImpact(undefined);
                          }}
                        />
                        {correction.action === "answer" && (q?.kind === "sentence_completion" ? (
                          <Input.TextArea aria-label="更正填空答案" placeholder="可接受答案（每行一个）" value={correction.acceptedAnswers.join("\n")} onChange={(e) => { setCorrection({ ...correction, acceptedAnswers: e.target.value.split("\n") }); setImpact(undefined); }} />
                        ) : <Select
                            style={{ width: 250 }}
                            value={correction.correctIndex}
                            options={q?.options.map((o, i) => ({
                              value: i,
                              label: readingOptionLabel(q.kind, o, i),
                            }))}
                            onChange={(correctIndex) => {
                              setCorrection({ ...correction, correctIndex });
                              setImpact(undefined);
                            }}
                          />
                        )}
                        <Input.TextArea
                          placeholder="处理原因（必须）"
                          value={correction.reason}
                          onChange={(e) => {
                            setCorrection({
                              ...correction,
                              reason: e.target.value,
                            });
                            setImpact(undefined);
                          }}
                        />
                        <Input.TextArea
                          placeholder="补充解析（选填；补充解析动作时必填）"
                          value={correction.explanation}
                          onChange={(e) => {
                            setCorrection({
                              ...correction,
                              explanation: e.target.value,
                            });
                            setImpact(undefined);
                          }}
                        />
                        <Button
                          disabled={!correction.reason.trim() || busy || (correction.action === "answer" && q?.kind === "sentence_completion" && !correction.acceptedAnswers.some((answer) => answer.trim()))}
                          onClick={async () => {
                            const r = await run("correct/preview", {
                              ...correction,
                              ...(q?.kind === "sentence_completion" ? { correctIndex: null, acceptedAnswers: correction.acceptedAnswers.map((answer) => answer.trim()).filter(Boolean) } : { acceptedAnswers: undefined }),
                              questionId: selected,
                            });
                            if (r) {
                              setImpact(r);
                              correctionUid.current = newRequestId();
                            }
                          }}
                        >
                          预览影响范围
                        </Button>
                        {impact && (
                          <Alert
                            type="warning"
                            message={`将重新计算 ${impact.affectedCount} 份已提交作答；未来提交采用相同评分规则。`}
                            action={
                              <Button
                                loading={busy}
                                onClick={async () => {
                                  const r = await run("correct", {
                                    ...correction,
                                    ...(q?.kind === "sentence_completion" ? { correctIndex: null, acceptedAnswers: correction.acceptedAnswers.map((answer) => answer.trim()).filter(Boolean) } : { acceptedAnswers: undefined }),
                                    questionId: selected,
                                    requestUid: correctionUid.current,
                                    gradingRevision: impact.gradingRevision,
                                  });
                                  if (r) setImpact(undefined);
                                }}
                              >
                                确认纠错并重评
                              </Button>
                            }
                          />
                        )}
                        <h4>重评执行记录</h4>
                        {!paper.regradeJobs?.length && (
                          <p className="admin-muted">暂无重评记录</p>
                        )}
                        {(paper.regradeJobs || []).map((j) => (
                          <p key={j.id}>
                            {j.status} · 已完成 {j.completed}/{j.total} · 失败{" "}
                            {j.failed} {j.error}
                            {j.status === "failed" && (
                              <Button
                                disabled={busy}
                                onClick={() => void run("correct", j.input)}
                              >
                                重试本次重评
                              </Button>
                            )}
                          </p>
                        ))}
                        <h4>评分调整历史</h4>
                        {!w.corrections?.length && (
                          <p className="admin-muted">暂无评分调整</p>
                        )}
                        {(w.corrections || []).map((c: any) => (
                          <p key={c.id}>
                            修订 {c.revision} · {c.questionId} · {c.reason}
                          </p>
                        ))}
                      </>
                    )}
                </div>
              ),
            },
          ].filter(
            (item) =>
              item.key !== "feedback" ||
              ["published", "withdrawn"].includes(paper?.status || ""),
          )}
        />
      )}
      <Modal
        width={900}
        open={preview}
        title="学生视角预览 · 提交前"
        footer={<Button onClick={() => setPreview(false)}>返回审核</Button>}
        onCancel={() => setPreview(false)}
      >
        {content && (
          <>
            <h2>{content.title}</h2>
            <p>{content.instructions}</p>
            {content.paragraphs.map((p, i) => (
              <p key={i}>
                {content.paragraphLabels?.[i] || i + 1}. {p}
              </p>
            ))}
            {content.questions.map((x, i) => (
              <section key={x.id}>
                <h3>
                  {i + 1}. {x.stem}
                </h3>
                <p>{x.instructions}</p>
                {x.kind === "sentence_completion" && <>
                  {x.maxWords && <p>最多填写 {x.maxWords} 个词</p>}
                  <Input aria-label={`第 ${i + 1} 题答案`} placeholder="填写答案" />
                </>}
                {x.kind !== "sentence_completion" && x.options.map((o, n) => (
                  <p key={n}>
                    ○ {readingOptionLabel(x.kind, o, n)}
                  </p>
                ))}
              </section>
            ))}
          </>
        )}
      </Modal>
      {paper && <PracticePublishDialog open={publishOpen} paper={paper} busy={busy} error={error} onClose={() => { if (!busy) setPublishOpen(false); }} onConfirm={confirmPublish} />}
      {paper && recipientsOpen && (
        <ReadingPracticeRecipients
          key={paper.id}
          paper={paper}
          onClose={() => setRecipientsOpen(false)}
          onAssigned={onChange}
        />
      )}
    </Drawer>
  );
}
