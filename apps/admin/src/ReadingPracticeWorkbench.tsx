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
import { newRequestId } from "./api/readingPractice";
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
  correctIndex: "答案",
  evidence: "证据",
  explanation: "解析",
  instructions: "作答要求",
};
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
      reason: "",
      explanation: "",
    }),
    [impact, setImpact] = useState<any>(),
    [handling, setHandling] = useState<
      Record<string, { status: string; reason: string }>
    >({});
  const [recipientsOpen, setRecipientsOpen] = useState(false);
  const publishUid = useRef(""),
    correctionUid = useRef("");
  useEffect(() => {
    if (paper) {
      setContent(paper.content ? structuredClone(paper.content) : undefined);
      setSources(paper.workflow?.sources || []);
      setChecked(paper.workflow?.reviewedQuestions || []);
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
      const next = await request(workflowRequest(paper.id, action, data));
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
  const latestMessages: any[] = w.chats?.[selected] || [];
  const save = () => void run("save", { revision, content });
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
  return (
    <Drawer
      width="min(1440px, 98vw)"
      open={!!paper}
      title={`${paper?.title || "阅读练习"} · v${w.version || 1} · 修订 ${revision}`}
      onClose={close}
      footer={
        <Space wrap>
          <Button onClick={close}>关闭</Button>
          <Button onClick={() => setPreview(true)} disabled={!content}>
            学生视角预览
          </Button>
          {editable ? (
            <>
              <Button
                type="primary"
                onClick={save}
                loading={busy}
                disabled={!dirty}
              >
                保存修改
              </Button>
              <Button
                disabled={dirty || busy || w.reviewedRevision !== revision}
                onClick={() =>
                  Modal.confirm({
                    title: "发布已审核版本",
                    okText: "确认发布此版本",
                    cancelText: "取消",
                    content: `版本 ${w.version || 1} · ${content?.questions.length || 0} 题 · ${paper?.config.targetType === "all" ? "发布时全部正常用户" : `${paper?.config.targetUserIds?.length || 0} 位指定用户`}。每人可提交一次。`,
                    onOk: () =>
                      run("publish", {
                        revision,
                        reviewed: true,
                        requestUid: publishUid.current,
                      }),
                  })
                }
              >
                确认发布
              </Button>
            </>
          ) : paper && ["published", "withdrawn"].includes(paper.status) ? (
            <Button
              loading={busy}
              onClick={() => void run("revise", { requestUid: newRequestId() })}
            >
              创建内容修订版
            </Button>
          ) : null}
        </Space>
      }
    >
      {error && <Alert type="error" showIcon message={error} />}
      <Space wrap>
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
        <Tag>评分修订 {w.gradingRevision || 0}</Tag>
        {dirty && <Tag color="orange">有未保存修改；保存后重新审核</Tag>}
        <span>生成配置难度 {paper?.config.ieltsBand}，未经正式校准</span>
      </Space>
      {!content ? (
        <>
          <Alert
            type={paper?.status === "failed" ? "error" : "info"}
            message={
              paper?.status === "failed"
                ? paper.failureSummary || "处理失败，原稿已保留，可重试。"
                : "任务处理中，关闭后可从列表查看状态，原稿会保留。"
            }
          />
          {paper?.status === "failed" && (
            <Button loading={busy} onClick={() => void run("retry", {})}>
              重试此任务
            </Button>
          )}
          <SourceFiles value={sources} onChange={() => undefined} disabled />
          {w.importInput && (
            <details>
              <summary>已保存的输入材料</summary>
              <pre style={{ whiteSpace: "pre-wrap" }}>{w.importInput.text}</pre>
              <pre style={{ whiteSpace: "pre-wrap" }}>
                {w.importInput.answerText}
              </pre>
            </details>
          )}
        </>
      ) : (
        <Tabs
          items={[
            {
              key: "edit",
              label: "原稿对照与编辑",
              children: (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "minmax(250px, 1fr) minmax(350px, 1.4fr)",
                    gap: 24,
                  }}
                >
                  <section>
                    <h3>原始材料</h3>
                    {w.importInput?.text && (
                      <pre
                        style={{
                          whiteSpace: "pre-wrap",
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
                        保存原稿顺序 / 替换
                      </Button>
                    )}
                    {editable && (
                      <Button
                        disabled={dirty || busy}
                        onClick={() =>
                          void run("recognize-sources", { revision })
                        }
                      >
                        重新识别为候选
                      </Button>
                    )}
                    {w.sourceCandidate && (
                      <details>
                        <summary>
                          重新识别候选与当前内容对照（不自动覆盖）
                        </summary>
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
                          确认采用候选并重新审核
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
                  <section>
                    <label>
                      标题
                      <Input
                        aria-label="练习标题"
                        value={content.title}
                        disabled={!editable}
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
                        disabled={!editable}
                        onChange={(e) =>
                          change({ ...content, instructions: e.target.value })
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
                            disabled={!editable}
                            onChange={(e) => {
                              const labels = [
                                ...(content.paragraphLabels || []),
                              ];
                              labels[i] = e.target.value;
                              change({ ...content, paragraphLabels: labels });
                            }}
                          />
                          <Button
                            disabled={!editable}
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
                          disabled={!editable}
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
                      disabled={!editable}
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
                        disabled={!editable}
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
                          disabled={!editable}
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
                          <span>稳定身份 {q.id}</span>
                          <Select
                            value={q.kind}
                            disabled={!editable}
                            options={[
                              { value: "choice", label: "单项选择" },
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
                                      options: ["True", "False", "Not Given"],
                                      correctIndex: null,
                                    }
                                  : {}),
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
                            disabled={!editable}
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
                            disabled={!editable}
                            onChange={(e) => update({ stem: e.target.value })}
                          />
                        </label>
                        <label>
                          本题要求
                          <Input.TextArea
                            value={q.instructions || ""}
                            disabled={!editable}
                            onChange={(e) =>
                              update({ instructions: e.target.value })
                            }
                          />
                        </label>
                        {q.kind !== "true_false_not_given" && (
                          <Button
                            disabled={!editable || q.options.length >= 4}
                            onClick={() =>
                              update({ options: [...q.options, ""] })
                            }
                          >
                            添加选项
                          </Button>
                        )}
                        {q.options.map((o, i) => (
                          <div
                            key={i}
                            style={{ display: "flex", gap: 8, marginTop: 8 }}
                          >
                            <span>{String.fromCharCode(65 + i)}</span>
                            <Input.TextArea
                              aria-label={`选项${String.fromCharCode(65 + i)}`}
                              value={o}
                              disabled={
                                !editable || q.kind === "true_false_not_given"
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
                                !editable || q.kind === "true_false_not_given"
                              }
                              onClick={() =>
                                update({
                                  options: q.options.filter((_, n) => n !== i),
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
                        <label>
                          正确答案{" "}
                          <Select
                            aria-label="正确答案"
                            allowClear
                            value={q.correctIndex ?? undefined}
                            disabled={!editable}
                            style={{ width: 220, margin: 12 }}
                            options={q.options.map((o, i) => ({
                              value: i,
                              label: `${String.fromCharCode(65 + i)}. ${o.slice(0, 30)}`,
                            }))}
                            onChange={(v) =>
                              update({ correctIndex: v ?? null })
                            }
                          />
                        </label>
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
                            disabled={!editable}
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
                            disabled={!editable}
                            onChange={(n) =>
                              update({
                                evidence: { ...q.evidence, paragraph: n || 1 },
                              })
                            }
                          />
                        </label>
                        <label>
                          原文引用
                          <Input.TextArea
                            value={q.evidence.quote || ""}
                            disabled={!editable}
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
                            disabled={!editable}
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
                          来源定位：{q.sourceRef || "未提供，请对照原稿确认"}
                        </small>
                      </>
                    )}
                  </section>
                </div>
              ),
            },
            {
              key: "review",
              label: `质量审核 (${(w.issues || []).filter((i: any) => !i.resolved).length})`,
              children: (
                <>
                  <p>
                    先保存编辑，再检查当前修订。结构错误必须修正；语义误报需逐项提供理由和证据。
                  </p>
                  <Button
                    disabled={!editable || dirty || busy}
                    loading={busy}
                    onClick={() => void run("check", { revision })}
                  >
                    AI检查当前修订
                  </Button>
                  {(w.issues || []).map((i: any) => (
                    <Card
                      key={i.id}
                      size="small"
                      style={{ marginTop: 12 }}
                      title={`${i.questionId || "整篇"} · ${i.type === "structure" ? "结构阻断" : i.type === "source" ? "缺少关键原稿，请补齐后重新识别" : "质量问题"}`}
                    >
                      <Alert
                        type={i.resolved ? "success" : "warning"}
                        message={i.message}
                        description={
                          <>
                            <p>依据：{i.evidence}</p>
                            <p>建议：{i.suggestion}</p>
                          </>
                        }
                      />
                      {i.type === "ai" && !i.resolved && (
                        <>
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
                        </>
                      )}
                      {i.resolved && (
                        <p>
                          已关闭：{i.reason} · {i.resolutionEvidence}
                        </p>
                      )}
                    </Card>
                  ))}
                  <h3>逐题确认</h3>
                  {content.questions.map((x, i) => (
                    <p key={x.id}>
                      <Checkbox
                        disabled={!editable || dirty}
                        checked={checked.includes(x.id)}
                        onChange={(e) =>
                          setChecked(
                            e.target.checked
                              ? [...checked, x.id]
                              : checked.filter((id) => id !== x.id),
                          )
                        }
                      >
                        {i + 1}. {x.stem} — 已核对唯一答案、原文依据与解析
                      </Checkbox>
                    </p>
                  ))}
                  <Button
                    type="primary"
                    disabled={
                      !editable ||
                      dirty ||
                      busy ||
                      checked.length !== content.questions.length ||
                      w.qualityRevision !== revision
                    }
                    onClick={() =>
                      void run("review", {
                        revision,
                        questionIds: checked,
                        resolutions: Object.entries(resolutions)
                          .filter(([, r]) => r.reason && r.evidence)
                          .map(([issueId, r]) => ({ issueId, ...r })),
                      })
                    }
                  >
                    保存逐题审核确认
                  </Button>
                  {editable && w.reviewedRevision === revision && (
                    <Alert
                      type="success"
                      message="当前修订审核通过，可以发布。"
                    />
                  )}
                </>
              ),
            },
            {
              key: "chat",
              label: "单题AI对话",
              children: (
                <>
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
                </>
              ),
            },
            {
              key: "feedback",
              label: `反馈与纠错 (${feedback.length})`,
              children: (
                <>
                  <h3>学生反馈（按题目聚合）</h3>
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
                        {paper.status === "published" && <Button disabled={busy} onClick={() => setRecipientsOpen(true)}>追加接收人</Button>}
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
                        {correction.action === "answer" && (
                          <Select
                            style={{ width: 250 }}
                            value={correction.correctIndex}
                            options={q?.options.map((o, i) => ({
                              value: i,
                              label: `${String.fromCharCode(65 + i)}. ${o}`,
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
                          disabled={!correction.reason.trim() || busy}
                          onClick={async () => {
                            const r = await run("correct/preview", {
                              ...correction,
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
                        {(w.corrections || []).map((c: any) => (
                          <p key={c.id}>
                            修订 {c.revision} · {c.questionId} · {c.reason}
                          </p>
                        ))}
                      </>
                    )}
                </>
              ),
            },
          ]}
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
                {x.options.map((o, n) => (
                  <p key={n}>
                    ○ {String.fromCharCode(65 + n)}. {o}
                  </p>
                ))}
              </section>
            ))}
          </>
        )}
      </Modal>
      {paper && recipientsOpen && <ReadingPracticeRecipients key={paper.id} paper={paper} onClose={() => setRecipientsOpen(false)} onAssigned={onChange} />}
    </Drawer>
  );
}
