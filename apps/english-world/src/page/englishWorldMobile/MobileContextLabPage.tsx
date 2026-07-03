import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Dialog,
  Empty,
  Input,
  Picker,
  Popup,
  Radio,
  Space,
  Tag,
  TextArea,
  Toast,
} from "antd-mobile";
import type { PickerActions } from "antd-mobile/es/components/picker";
import request from "@font/api";
import {
  contextLabAttemptDetail,
  contextLabAttemptHistory,
  contextLabCreateTask,
  contextLabDeleteAttempt,
  contextLabDeleteTask,
  contextLabDetail,
  contextLabHistory,
  contextLabSubmit,
  subscribeContextLabTaskEvents,
} from "@/page/englishWorld/server/learning";
import type {
  ContextLabAttempt,
  ContextLabGenerateParams,
  ContextLabSubmitResult,
  ContextLabTask,
} from "@/page/englishWorld/types/learning";
import { wordImportMissing } from "@/server/word/word";
import { wordAgentQuery } from "@/server/wordAgent/wordAgent";
import {
  buildMobileMarkedWord,
  cleanMobileSelectedText,
  findMobileQuestionResult,
  getMobileQuestionKey,
  mergeMobileImportPreview,
  parseMobileContextArticle,
  toMobileImportPayload,
  type MobileMarkedWord,
} from "./mobileContextLab";

type SourceMode = "weak" | "random" | "custom";

function getSourceLabel(sourceType: ContextLabTask["sourceType"]) {
  const labels: Record<ContextLabTask["sourceType"], string> = {
    proficiency: "薄弱词",
    random: "随机词",
    custom: "手输词",
  };
  return labels[sourceType] ?? "练习包";
}

function getStatusLabel(status: ContextLabTask["status"]) {
  const labels: Record<ContextLabTask["status"], string> = {
    pending: "等待生成",
    processing: "生成中",
    succeeded: "可练习",
    failed: "生成失败",
  };
  return labels[status] ?? status;
}

function buildGenerateParams(
  sourceMode: SourceMode,
  count: number,
  customWords: string,
): ContextLabGenerateParams {
  if (sourceMode === "random") return { sourceType: "random", count };
  if (sourceMode === "custom") {
    return {
      sourceType: "custom",
      words: customWords
        .split(/[\s,，]+/)
        .map((word) => word.trim())
        .filter(Boolean),
    };
  }
  return {
    sourceType: "proficiency",
    proficiencyLevels: [0, 1],
    count,
  };
}

export function MobileContextLabPage() {
  const [sourceMode, setSourceMode] = useState<SourceMode>("weak");
  const [count, setCount] = useState(8);
  const [customWords, setCustomWords] = useState("");
  const [history, setHistory] = useState<ContextLabTask[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [currentTask, setCurrentTask] = useState<ContextLabTask | null>(null);
  const [openingTaskId, setOpeningTaskId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitSummary, setSubmitSummary] =
    useState<ContextLabSubmitResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [markedWords, setMarkedWords] = useState<MobileMarkedWord[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewWords, setPreviewWords] = useState<MobileMarkedWord[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [attemptDrawerOpen, setAttemptDrawerOpen] = useState(false);
  const [attempts, setAttempts] = useState<ContextLabAttempt[]>([]);
  const [attemptDetails, setAttemptDetails] = useState<
    Record<number, ContextLabAttempt>
  >({});
  const [attemptLoading, setAttemptLoading] = useState(false);
  const sourcePickerRef = React.useRef<PickerActions>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await request(contextLabHistory({ page: 1, pageSize: 20 }));
      setHistory(response.list ?? []);
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "读取练习包失败",
      });
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    return subscribeContextLabTaskEvents((task) => {
      setHistory((prev) => {
        const exists = prev.some((item) => item.taskId === task.taskId);
        if (!exists) return [task, ...prev].slice(0, 20);
        return prev.map((item) =>
          item.taskId === task.taskId ? { ...item, ...task } : item,
        );
      });
      setCurrentTask((prev) =>
        prev?.taskId === task.taskId ? { ...prev, ...task } : prev,
      );
    });
  }, []);

  useEffect(() => {
    if (!currentTask) return;
    window.requestAnimationFrame(() => {
      document.querySelector(".mobile-content")?.scrollTo({ top: 0 });
    });
  }, [currentTask?.taskId]);

  const handleGenerate = async () => {
    const params = buildGenerateParams(sourceMode, count, customWords);
    if (params.sourceType === "custom" && params.words.length < 3) {
      Toast.show({ icon: "fail", content: "自定义单词至少需要 3 个" });
      return;
    }

    setCreating(true);
    try {
      const task = await request(contextLabCreateTask(params));
      setHistory((prev) => [
        task,
        ...prev.filter((item) => item.taskId !== task.taskId),
      ]);
      Toast.show({ icon: "success", content: "练习包已提交" });
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "生成练习包失败",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenTask = async (task: ContextLabTask) => {
    if (task.status !== "succeeded") return;
    setOpeningTaskId(task.taskId);
    try {
      const detail = await request(contextLabDetail({ taskId: task.taskId }));
      setCurrentTask(detail);
      setAnswers({});
      setSubmitSummary(null);
      setMarkedWords([]);
      setPreviewWords([]);
      setPreviewOpen(false);
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "打开练习包失败",
      });
    } finally {
      setOpeningTaskId(null);
    }
  };

  const handleReadingContextMenu = (event: React.MouseEvent<HTMLElement>) => {
    const text = cleanMobileSelectedText(
      window.getSelection()?.toString() ?? "",
    );
    if (!text) return;
    event.preventDefault();
    setSelectedText(text);
    setSelectionOpen(true);
  };

  const handleMarkSelected = () => {
    const text = cleanMobileSelectedText(selectedText);
    if (!text) return;
    const item = buildMobileMarkedWord(text, currentTask);
    setMarkedWords((prev) =>
      prev.some((word) => word.key === item.key) ? prev : [...prev, item],
    );
    setSelectionOpen(false);
    window.getSelection()?.removeAllRanges();
  };

  const handleOpenImportPreview = async () => {
    if (markedWords.length === 0) {
      Toast.show({ icon: "fail", content: "还没有标记生词" });
      return;
    }

    setPreviewWords(markedWords);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const response = await request(
        wordAgentQuery({ words: markedWords.map((item) => item.englishWord) }),
      );
      setPreviewWords((prev) =>
        mergeMobileImportPreview(
          prev.length ? prev : markedWords,
          response.words ?? [],
        ),
      );
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "AI 补全失败",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleUpdatePreviewWord = (
    key: string,
    patch: Partial<MobileMarkedWord>,
  ) => {
    setPreviewWords((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  };

  const handleConfirmImport = async () => {
    setImporting(true);
    try {
      const response = await request(
        wordImportMissing({
          words: previewWords.map(toMobileImportPayload),
        }),
      );
      const skipped = response.skippedExisting + response.skippedDuplicate;
      Toast.show({
        icon: "success",
        content:
          response.inserted > 0
            ? `已导入 ${response.inserted} 个，跳过 ${skipped} 个`
            : "标记词都已在词库",
      });
      setPreviewOpen(false);
      setPreviewWords([]);
      setMarkedWords([]);
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "导入失败",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleOpenAttempts = async (task: ContextLabTask) => {
    setAttemptDrawerOpen(true);
    setAttemptLoading(true);
    try {
      const response = await request(
        contextLabAttemptHistory({ taskId: task.taskId }),
      );
      setAttempts(response.list ?? []);
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "读取记录失败",
      });
    } finally {
      setAttemptLoading(false);
    }
  };

  const handleOpenAttemptDetail = async (attempt: ContextLabAttempt) => {
    if (attemptDetails[attempt.attemptId]) return;
    try {
      const detail = await request(
        contextLabAttemptDetail({ attemptId: attempt.attemptId }),
      );
      setAttemptDetails((prev) => ({
        ...prev,
        [attempt.attemptId]: detail,
      }));
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "读取详情失败",
      });
    }
  };

  const handleDeleteAttempt = async (attempt: ContextLabAttempt) => {
    try {
      await request(contextLabDeleteAttempt({ attemptId: attempt.attemptId }));
      setAttempts((prev) =>
        prev.filter((item) => item.attemptId !== attempt.attemptId),
      );
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "删除记录失败",
      });
    }
  };

  const handleSubmit = async () => {
    if (!currentTask?.questions?.length) {
      Toast.show({ icon: "fail", content: "练习包还不能提交" });
      return;
    }

    const unanswered = currentTask.questions.filter((question, index) => {
      const key = getMobileQuestionKey(question, index);
      return answers[key] == null;
    });
    if (unanswered.length > 0) {
      Toast.show({
        icon: "fail",
        content: `还有 ${unanswered.length} 题未作答`,
      });
      return;
    }

    setSubmitting(true);
    try {
      const response = await request(
        contextLabSubmit({
          sessionId: currentTask.articleExerciseId ?? currentTask.taskId,
          answers: currentTask.questions.map((question, index) => {
            const key = getMobileQuestionKey(question, index);
            return {
              questionId: question.id || key,
              selectedIndex: answers[key],
            };
          }),
        }),
      );
      setSubmitSummary(response);
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "提交失败",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTask = (task: ContextLabTask) => {
    Dialog.confirm({
      content: "删除后练习包和记录会从列表移除。",
      confirmText: "删除",
      cancelText: "取消",
      onConfirm: async () => {
        await request(contextLabDeleteTask({ taskId: task.taskId }));
        setHistory((prev) =>
          prev.filter((item) => item.taskId !== task.taskId),
        );
      },
    });
  };

  const currentArticle = useMemo(
    () => parseMobileContextArticle(currentTask?.article ?? ""),
    [currentTask?.article],
  );
  const answeredQuestionCount = useMemo(() => {
    if (!currentTask?.questions?.length) return 0;
    return currentTask.questions.filter((question, index) => {
      const key = getMobileQuestionKey(question, index);
      return answers[key] != null;
    }).length;
  }, [answers, currentTask?.questions]);

  if (currentTask) {
    const questionCount = currentTask.questions?.length ?? 0;

    return (
      <div className="mobile-context-lab mobile-context-lab--practice">
        <div className="mobile-context-lab-toolbar">
          <Button fill="none" size="small" onClick={() => setCurrentTask(null)}>
            返回
          </Button>
          <div>
            <span>阅读练习</span>
            <strong>
              {answeredQuestionCount}/{questionCount || 0}
            </strong>
          </div>
          <Tag color="primary">{currentTask.words.length} 词</Tag>
        </div>
        <article aria-label="阅读材料" className="mobile-context-reading">
          <div
            className="mobile-context-section-heading"
            onContextMenu={handleReadingContextMenu}
          >
            <span>Reading</span>
            <h3>{currentArticle.topic || "阅读材料"}</h3>
          </div>
          <div
            className="mobile-context-reading-body"
            onContextMenu={handleReadingContextMenu}
          >
            {currentArticle.paragraphs.map((paragraph, index) => (
              <p key={`${paragraph}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </article>
        {markedWords.length > 0 && (
          <section aria-label="已标记生词" className="mobile-context-marked">
            <div>
              <strong>已标记 {markedWords.length} 个生词</strong>
              <Button
                size="small"
                color="primary"
                onClick={handleOpenImportPreview}
              >
                预览并导入
              </Button>
            </div>
            <div className="mobile-context-word-strip">
              {markedWords.map((item) => (
                <Tag key={item.key}>{item.englishWord}</Tag>
              ))}
            </div>
          </section>
        )}
        {currentTask.questions?.length ? (
          <section
            aria-label="选择题作答区"
            className="mobile-context-questions"
          >
            <div className="mobile-context-section-heading">
              <span>Questions</span>
              <h3>选择题</h3>
            </div>
            {currentTask.questions.map((question, index) => {
              const key = getMobileQuestionKey(question, index);
              const result = findMobileQuestionResult(
                submitSummary?.results ?? null,
                key,
              );

              return (
                <Card key={key} className="mobile-context-question-card">
                  <div className="mobile-context-question-title">
                    <span>第 {index + 1} 题</span>
                    {result && (
                      <Tag color={result.correct ? "success" : "danger"}>
                        {result.correct ? "正确" : "需要复盘"}
                      </Tag>
                    )}
                  </div>
                  <p>{question.stem}</p>
                  <Radio.Group
                    value={answers[key]}
                    disabled={submitSummary != null}
                    onChange={(value) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [key]: Number(value),
                      }))
                    }
                  >
                    {question.options.map((option, optionIndex) => (
                      <Radio
                        className="mobile-context-option"
                        key={`${key}-${optionIndex}`}
                        value={optionIndex}
                      >
                        <span>
                          {String.fromCharCode(65 + optionIndex)}. {option}
                        </span>
                        {result?.correctIndex === optionIndex &&
                          !result.correct && <em>正确答案</em>}
                      </Radio>
                    ))}
                  </Radio.Group>
                  {result?.explanation && (
                    <div className="mobile-context-explanation">
                      {result.explanation}
                    </div>
                  )}
                </Card>
              );
            })}
          </section>
        ) : null}
        {submitSummary && (
          <section aria-label="结果复盘" className="mobile-context-result">
            <div>
              <span>得分</span>
              <strong>{submitSummary.score ?? 0}</strong>
            </div>
            <Tag color={(submitSummary.wrongCount ?? 0) > 0 ? "warning" : "success"}>
              错题 {submitSummary.wrongCount ?? 0}
            </Tag>
            {submitSummary.weakWords.length > 0 && (
              <div className="mobile-context-word-strip">
                {submitSummary.weakWords.map((word) => (
                  <Tag key={word} color="danger">
                    {word}
                  </Tag>
                ))}
              </div>
            )}
            {submitSummary.nextSuggestions.length > 0 && (
              <ul>
                {submitSummary.nextSuggestions.map((suggestion) => (
                  <li key={suggestion}>{suggestion}</li>
                ))}
              </ul>
            )}
          </section>
        )}
        {!submitSummary && currentTask.questions?.length ? (
          <div className="mobile-context-submit-bar">
            <div>
              <strong>完成阅读后提交</strong>
              <span>
                已答 {answeredQuestionCount}/{questionCount}
              </span>
            </div>
            <Button
              color="primary"
              loading={submitting}
              onClick={handleSubmit}
              shape="rounded"
            >
              提交练习
            </Button>
          </div>
        ) : null}
        <Popup
          bodyStyle={{ borderRadius: "8px 8px 0 0" }}
          onMaskClick={() => setSelectionOpen(false)}
          visible={selectionOpen}
        >
          <div className="mobile-context-selection-sheet">
            <strong>{selectedText}</strong>
            <Button block color="primary" onClick={handleMarkSelected}>
              标记生词
            </Button>
          </div>
        </Popup>
        <Popup
          bodyStyle={{
            borderRadius: "8px 8px 0 0",
            maxHeight: "80vh",
            overflow: "auto",
          }}
          onMaskClick={() => setPreviewOpen(false)}
          visible={previewOpen}
        >
          <section
            aria-label="导入预览"
            className="mobile-context-preview"
            role="dialog"
          >
            <div className="mobile-context-section-heading">
              <span>Import</span>
              <h3>导入预览</h3>
            </div>
            <p>
              {previewLoading
                ? "AI 正在补全释义..."
                : "确认后只导入词库中不存在的词。"}
            </p>
            {previewWords.map((item, index) => (
              <Card key={item.key} className="mobile-context-preview-item">
                <Input
                  aria-label={`第 ${index + 1} 个词单词`}
                  value={item.englishWord}
                  onChange={(value) =>
                    handleUpdatePreviewWord(item.key, { englishWord: value })
                  }
                />
                <Input
                  aria-label={`第 ${index + 1} 个词音标`}
                  value={item.englishPhonetic ?? ""}
                  onChange={(value) =>
                    handleUpdatePreviewWord(item.key, {
                      englishPhonetic: value,
                    })
                  }
                />
                <TextArea
                  aria-label={`第 ${index + 1} 个词释义`}
                  value={item.englishChinese ?? ""}
                  onChange={(value) =>
                    handleUpdatePreviewWord(item.key, {
                      englishChinese: value,
                    })
                  }
                />
              </Card>
            ))}
            <Button
              block
              color="primary"
              loading={importing}
              onClick={handleConfirmImport}
            >
              确认导入
            </Button>
          </section>
        </Popup>
      </div>
    );
  }

  return (
    <div className="mobile-context-lab">
      <Card className="mobile-context-hero">
        <div className="mobile-context-eyebrow">Context Lab</div>
        <h2>移动语境练习</h2>
        <p>生成、继续和复盘阅读练习包，手机上也能完成完整阅读闭环。</p>
      </Card>

      <Card className="mobile-context-generator">
        <div className="mobile-context-section-heading">
          <span>Create</span>
          <h3>生成练习包</h3>
        </div>
        <div
          className="mobile-context-field"
          onClick={() => sourcePickerRef.current?.open()}
        >
          <span>选词方式</span>
          <strong>
            {sourceMode === "weak"
              ? "今日薄弱词"
              : sourceMode === "random"
                ? "随机词"
                : "手输词"}
          </strong>
          <Picker
            ref={sourcePickerRef as React.RefObject<PickerActions>}
            columns={[
              [
                { label: "今日薄弱词", value: "weak" },
                { label: "随机词", value: "random" },
                { label: "手输词", value: "custom" },
              ],
            ]}
            value={[sourceMode]}
            onConfirm={(value) => setSourceMode(value[0] as SourceMode)}
          />
        </div>
        {sourceMode === "custom" ? (
          <TextArea
            placeholder="输入至少 3 个单词，用逗号或空格分隔"
            rows={3}
            value={customWords}
            onChange={setCustomWords}
          />
        ) : (
          <Input
            type="number"
            min={3}
            max={20}
            value={String(count)}
            onChange={(value) =>
              setCount(Math.min(20, Math.max(3, Number(value || 8))))
            }
          />
        )}
        <Button block color="primary" loading={creating} onClick={handleGenerate}>
          生成练习包
        </Button>
      </Card>

      <section aria-label="练习包列表" className="mobile-context-history">
        <div className="mobile-context-history-head">
          <h3>练习包</h3>
          <Button size="small" loading={historyLoading} onClick={loadHistory}>
            刷新
          </Button>
        </div>
        {history.length === 0 && !historyLoading ? (
          <Empty description="还没有练习包" />
        ) : (
          <div className="mobile-context-history-list">
            {history.map((task) => (
              <Card key={task.taskId} className="mobile-context-task-card">
                <div className="mobile-context-task-kicker">
                  <Tag>{getStatusLabel(task.status)}</Tag>
                  <span>{getSourceLabel(task.sourceType)}</span>
                </div>
                <h4>{task.words.slice(0, 5).join(" / ")}</h4>
                <div className="mobile-context-task-meta">
                  <span>{task.words.length} 个词</span>
                  {task.latestScore != null && (
                    <span>得分 {task.latestScore}</span>
                  )}
                  {task.latestWrongCount != null && (
                    <span>错题 {task.latestWrongCount}</span>
                  )}
                </div>
                <Space wrap>
                  {task.status === "succeeded" && (
                    <Button
                      color="primary"
                      size="small"
                      loading={openingTaskId === task.taskId}
                      onClick={() => void handleOpenTask(task)}
                    >
                      开始练习
                    </Button>
                  )}
                  {task.status === "succeeded" && (
                    <Button size="small" onClick={() => void handleOpenAttempts(task)}>
                      记录
                    </Button>
                  )}
                  <Button size="small" onClick={() => handleDeleteTask(task)}>
                    删除
                  </Button>
                </Space>
              </Card>
            ))}
          </div>
        )}
      </section>
      <Popup
        bodyStyle={{
          borderRadius: "8px 8px 0 0",
          maxHeight: "80vh",
          overflow: "auto",
        }}
        onMaskClick={() => setAttemptDrawerOpen(false)}
        visible={attemptDrawerOpen}
      >
        <section
          aria-label="练习记录"
          className="mobile-context-attempts"
          role="dialog"
        >
          <div className="mobile-context-section-heading">
            <span>Attempts</span>
            <h3>练习记录</h3>
          </div>
          {attemptLoading ? (
            <p>正在读取记录...</p>
          ) : attempts.length === 0 ? (
            <Empty description="还没有提交记录" />
          ) : (
            attempts.map((attempt) => {
              const detail = attemptDetails[attempt.attemptId];
              return (
                <Card
                  key={attempt.attemptId}
                  className="mobile-context-attempt-card"
                >
                  <div className="mobile-context-task-meta">
                    <span>得分 {attempt.score}</span>
                    <span>错题 {attempt.wrongCount}</span>
                  </div>
                  {attempt.weakWords.length > 0 && (
                    <div className="mobile-context-word-strip">
                      {attempt.weakWords.map((word) => (
                        <Tag key={word} color="danger">
                          {word}
                        </Tag>
                      ))}
                    </div>
                  )}
                  <Space>
                    <Button
                      size="small"
                      onClick={() => void handleOpenAttemptDetail(attempt)}
                    >
                      查看详情
                    </Button>
                    <Button
                      size="small"
                      onClick={() => void handleDeleteAttempt(attempt)}
                    >
                      删除
                    </Button>
                  </Space>
                  {detail?.results?.length > 0 && (
                    <div className="mobile-context-attempt-detail">
                      {detail.results.map((result) => (
                        <p key={result.questionId}>
                          {result.explanation || result.questionId}
                        </p>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </section>
      </Popup>
    </div>
  );
}
