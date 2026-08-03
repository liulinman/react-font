import React, { useEffect, useRef, useState } from "react";
import {
  Button,
  Checkbox,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Pagination,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { EditAddModal } from "./component/EditAddModal";
import request, { useMutation } from "@font/api";
import {
  wordAdd,
  wordDel,
  wordExist,
  wordUpdate,
  wordUpdateLevel,
} from "@/server/word/word";
import { WordList } from "@/server/word/word.type";
import { useColumns } from "./useColumns";
import { FormFieldGroup } from "./component/FormFieldGroup";
import { EnglishStats } from "./component/EnglishStats";
import { EnglishWorldPageHeader } from "./component/EnglishWorldPageHeader";
import { LearningCockpitPage } from "./cockpit/LearningCockpitPage";
import { MemoryMapPage } from "./memoryMap/MemoryMapPage";
import { ContextLabPage } from "./contextLab/ContextLabPage";
import { WordAgentTab } from "./component/WordAgentTab";
import { contextLabCreateTask, contextLabDetail } from "./server/learning";
import type { ContextLabModelProvider, ContextLabTask } from "./types/learning";
import {
  DEFAULT_CONTEXT_LAB_MODEL_PROVIDER,
  DEFAULT_IELTS_BAND,
  IELTS_BAND_MAX,
  IELTS_BAND_MIN,
  IELTS_BAND_STEP,
  normalizeIeltsBand,
} from "./contextLab/contextLabPlanning";
import {
  AppstoreOutlined,
  BarsOutlined,
  DownOutlined,
  ExperimentOutlined,
  FullscreenExitOutlined,
  FullscreenOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  NodeIndexOutlined,
  TranslationOutlined,
  UpOutlined,
} from "@ant-design/icons";
import { useLocation, useNavigate } from "react-router-dom";
import { useWordList } from "./hooks/useWordList";
import { normalizeDesktopWordFilters } from "./utils/wordFilters";
import { getLegacyPathFromHash, getNavFromLocation } from "./navigation";
import {
  getLevelLabel,
  getPartSpeechLabel,
  getTypeLabel,
} from "./utils/wordLabels";
import { BritishPronunciationButton } from "./component/BritishPronunciationButton";
import { WordLevelQuickEdit } from "./component/WordLevelQuickEdit";
import { EnglishWorldLayout } from "./layout/EnglishWorldLayout";
import {
  getContextLabReferenceLabel,
  isExternalReference,
  type ParsedContextLabReference,
  parseContextLabReference,
} from "./utils/contextLabReference";
import "./EnglishWorld.css";
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const WORD_TABLE_SCROLL_Y = 620;
const WORD_LEVEL_VALUES = [0, 1, 2, 3] as const;
type WordLibraryView = "list" | "card";

function splitContextLabArticleParagraphs(article: string) {
  return article
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function parseContextLabArticleContent(article: string) {
  const blocks = splitContextLabArticleParagraphs(article);
  if (blocks.length >= 4) {
    return {
      topic: blocks[0],
      paragraphs: blocks.slice(1),
    };
  }
  return {
    topic: undefined,
    paragraphs: blocks,
  };
}

const EnglishWorld: React.FC = () => {
  const [form] = Form.useForm();
  const [type, setType] = useState<"edit" | "add">("add");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [wordRecord, setWordRecord] = useState<WordList>();
  const [libraryView, setLibraryView] = useState<WordLibraryView>("list");
  const [cardBatchMode, setCardBatchMode] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [levelUpdatingIds, setLevelUpdatingIds] = useState<number[]>([]);
  const [batchLevelUpdating, setBatchLevelUpdating] = useState(false);
  const [batchContextModalOpen, setBatchContextModalOpen] = useState(false);
  const [batchContextCreating, setBatchContextCreating] = useState(false);
  const [batchContextIeltsBand, setBatchContextIeltsBand] = useState<
    number | null
  >(DEFAULT_IELTS_BAND);
  const [batchContextModelProvider, setBatchContextModelProvider] =
    useState<ContextLabModelProvider>(DEFAULT_CONTEXT_LAB_MODEL_PROVIDER);
  const batchContextCreateInFlightRef = useRef(false);
  const [sourcePreviewOpen, setSourcePreviewOpen] = useState(false);
  const [sourcePreviewFullscreen, setSourcePreviewFullscreen] = useState(false);
  const [sourcePreviewLoading, setSourcePreviewLoading] = useState(false);
  const [sourcePreviewReference, setSourcePreviewReference] =
    useState<ParsedContextLabReference | null>(null);
  const [sourcePreviewRecord, setSourcePreviewRecord] =
    useState<WordList | null>(null);
  const [sourcePreviewTask, setSourcePreviewTask] =
    useState<ContextLabTask | null>(null);
  const [sourcePreviewError, setSourcePreviewError] = useState("");
  const { mutateAsync: mutateWordAdd, isPending: buttonPending } =
    useMutation(wordAdd);
  const location = useLocation();
  const navigate = useNavigate();
  const activeNav = getNavFromLocation(
    location.pathname,
    location.hash || "",
  );
  const libraryWordQuery =
    new URLSearchParams(location.search).get("englishWord")?.trim() ?? "";
  const {
    wordList,
    loading,
    page,
    pageSize,
    totalNum,
    getCurrentFilters,
    search,
    reset,
    refresh,
    changePage,
    updateWordLevels,
  } = useWordList(10);

  useEffect(() => {
    if (location.pathname !== "/englishWorld") {
      return;
    }

    const legacyPath = getLegacyPathFromHash(location.hash || "");
    if (legacyPath) {
      navigate(legacyPath, { replace: true });
    }
  }, [location.hash, location.pathname, navigate]);

  useEffect(() => {
    if (activeNav !== "words" || !libraryWordQuery) {
      return;
    }

    form.resetFields();
    form.setFieldValue("englishWord", libraryWordQuery);
    void search({ englishWord: libraryWordQuery });
  }, [activeNav, form, libraryWordQuery, search]);

  const handleNavClick = () => {};

  const filterFields = [
    {
      key: "englishWord",
      node: (
        <Form.Item label="英文" name="englishWord">
          <Input placeholder="搜索单词或短语" allowClear />
        </Form.Item>
      ),
    },
    {
      key: "englishChinese",
      node: (
        <Form.Item label="中文" name="englishChinese">
          <Input placeholder="搜索中文释义" allowClear />
        </Form.Item>
      ),
    },
    {
      key: "englishType",
      node: (
        <Form.Item label="类型" name="englishType">
          <Select
            placeholder="请选择类型"
            allowClear
            options={[
              { label: "单词", value: 0 },
              { label: "短语", value: 1 },
              { label: "句子", value: 2 },
            ]}
          />
        </Form.Item>
      ),
    },
    {
      key: "time",
      node: (
        <Form.Item label="时间范围" name="time">
          <RangePicker
            allowClear
            placeholder={["开始时间", "结束时间"]}
            style={{ width: "100%" }}
          />
        </Form.Item>
      ),
    },
    {
      key: "englishPhonetic",
      node: (
        <Form.Item label="音标" name="englishPhonetic">
          <Input placeholder="搜索音标" allowClear />
        </Form.Item>
      ),
    },
    {
      key: "englishLevel",
      node: (
        <Form.Item label="掌握程度" name="englishLevel">
          <Select
            placeholder="请选择掌握程度"
            allowClear
            options={[
              { label: "不会", value: 0 },
              { label: "一般", value: 1 },
              { label: "熟练", value: 2 },
              { label: "精通", value: 3 },
            ]}
          />
        </Form.Item>
      ),
    },
  ];

  // 删除操作
  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: "确认删除",
      okText: "确认",
      cancelText: "取消",
      onOk: async () => {
        const res = await request<boolean>(wordDel({ id }));
        if (res) {
          message.success("删除成功");
          await refresh();
        } else {
          message.error("删除失败");
        }
      },
    });
  };

  // 编辑操作
  const handleEdit = (record: WordList) => {
    setWordRecord(record);
    handleType("edit");
    setIsModalVisible(true);
  };

  const closeSourcePreview = () => {
    setSourcePreviewOpen(false);
    setSourcePreviewFullscreen(false);
  };

  const handleOpenContextLabReference = async (
    reference: ParsedContextLabReference,
    record?: WordList,
  ) => {
    setSourcePreviewReference(reference);
    setSourcePreviewRecord(record ?? null);
    setSourcePreviewTask(null);
    setSourcePreviewError("");
    setSourcePreviewFullscreen(false);
    setSourcePreviewOpen(true);
    setSourcePreviewLoading(true);
    try {
      const task = await request<ContextLabTask>(
        {
          ...contextLabDetail({ taskId: reference.taskId }),
          config: { suppressErrorMessage: true },
        },
      );
      setSourcePreviewTask(task);
    } catch {
      setSourcePreviewError(
        "这个引用对应的练习包已经删除或不可访问，来源文章无法继续打开。",
      );
    } finally {
      setSourcePreviewLoading(false);
    }
  };

  const handleStartContextLabPractice = () => {
    if (!sourcePreviewReference) return;
    closeSourcePreview();
    navigate(sourcePreviewReference.href);
  };

  const handleEditSourcePreviewRecord = () => {
    if (!sourcePreviewRecord) return;
    closeSourcePreview();
    handleEdit(sourcePreviewRecord);
  };

  const { columns } = useColumns({
    handleEdit,
    handleDelete,
    handleOpenContextLabReference,
    page,
    pageSize,
  });

  // 查询数据
  const handleSearch = async () => {
    setSelectedCardIds([]);
    await search(normalizeDesktopWordFilters(form.getFieldsValue()));
  };

  // 重置表单
  const handleReset = async () => {
    setSelectedCardIds([]);
    form.resetFields();
    await reset();
  };

  // 提交编辑
  const handleModalOk = async (values: WordList, type: "edit" | "add") => {
    if (type === "edit") {
      // 开始真正的更新操作
      const res = await request<boolean>(wordUpdate(values));
      if (res) {
        message.success("更新成功");
        setIsModalVisible(false);
        await refresh();
      } else {
        message.error("更新失败");
      }
    }

    if (type === "add") {
      const { englishWord } = values;

      const res = await request<boolean>(wordExist({ englishWord }));

      if (res) {
        Modal.info({
          title: "添加失败",
          content: "单词已经存在！",
        });
        return;
      } else {
        // 开始真正的插入操作
        const res = await mutateWordAdd(values);
        if (res) {
          message.success("添加成功");
          setIsModalVisible(false);
          await search(getCurrentFilters());
        } else {
          message.error("添加失败");
        }
      }
    }
  };

  // 关闭编辑模态框
  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleAdd = () => {
    handleType("add");
    setIsModalVisible(true);
  };

  const handleType = (type: "add" | "edit") => {
    setType(type);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setSelectedCardIds([]);
    changePage(page, pageSize);
  };

  const handleLibraryViewChange = (view: WordLibraryView) => {
    setLibraryView(view);
    setCardBatchMode(false);
    setSelectedCardIds([]);
  };

  const handleToggleCardBatchMode = () => {
    setCardBatchMode((current) => !current);
    setSelectedCardIds([]);
  };

  const handleSelectCard = (id: number, checked: boolean) => {
    setSelectedCardIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((currentId) => currentId !== id),
    );
  };

  const allCurrentPageCardsSelected =
    wordList.length > 0 &&
    wordList.every((word) => selectedCardIds.includes(word.id));

  const handleSelectCurrentPage = () => {
    setSelectedCardIds(
      allCurrentPageCardsSelected ? [] : wordList.map((word) => word.id),
    );
  };

  const selectedCardRecords = wordList.filter((word) =>
    selectedCardIds.includes(word.id),
  );

  const handleOpenBatchContextLab = () => {
    if (selectedCardRecords.length > 20) {
      message.warning("每次最多选择 20 个词，请减少选择");
      return;
    }
    if (selectedCardRecords.length < 3) return;

    setBatchContextIeltsBand(DEFAULT_IELTS_BAND);
    setBatchContextModelProvider(DEFAULT_CONTEXT_LAB_MODEL_PROVIDER);
    setBatchContextModalOpen(true);
  };

  const handleCreateBatchContextLab = async () => {
    if (
      batchContextCreateInFlightRef.current ||
      selectedCardRecords.length < 3 ||
      selectedCardRecords.length > 20
    ) {
      return;
    }

    batchContextCreateInFlightRef.current = true;
    setBatchContextCreating(true);
    try {
      const task = await request<ContextLabTask>(
        contextLabCreateTask({
          sourceType: "custom",
          words: selectedCardRecords.map((record) => record.englishWord),
          ieltsBand: normalizeIeltsBand(batchContextIeltsBand),
          modelProvider: batchContextModelProvider,
        }),
      );
      setBatchContextModalOpen(false);
      setSelectedCardIds([]);
      message.success("语境练习任务已提交");
      navigate(
        `/englishWorld/context-lab?source=word-library&taskId=${task.taskId}`,
      );
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "任务提交失败");
    } finally {
      batchContextCreateInFlightRef.current = false;
      setBatchContextCreating(false);
    }
  };

  const handleQuickLevelChange = async (
    record: WordList,
    englishLevel: number,
  ) => {
    const previousLevel = record.englishLevel ?? 0;
    if (
      previousLevel === englishLevel ||
      levelUpdatingIds.includes(record.id)
    ) {
      return;
    }

    updateWordLevels([{ id: record.id, englishLevel }]);
    setLevelUpdatingIds((current) => [...current, record.id]);
    try {
      const success = await request<boolean>(
        {
          ...wordUpdateLevel({ id: record.id, englishLevel }),
          config: { suppressErrorMessage: true },
        },
      );
      if (!success) {
        throw new Error("level update failed");
      }
      await refresh();
      message.success({
        content: `${record.englishWord} 已设为${getLevelLabel(englishLevel).label}`,
        key: `word-level-${record.id}`,
        duration: 1.2,
      });
    } catch {
      updateWordLevels([{ id: record.id, englishLevel: previousLevel }]);
      message.error({
        content: "掌握程度修改失败，已恢复原状态",
        key: `word-level-${record.id}`,
      });
    } finally {
      setLevelUpdatingIds((current) =>
        current.filter((id) => id !== record.id),
      );
    }
  };

  const handleBatchLevelChange = async (englishLevel: number) => {
    const selectedRecords = wordList.filter((word) =>
      selectedCardIds.includes(word.id),
    );
    if (selectedRecords.length === 0 || batchLevelUpdating) return;

    const previousLevels = new Map(
      selectedRecords.map((word) => [word.id, word.englishLevel ?? 0]),
    );
    const targetIds = selectedRecords.map((word) => word.id);

    updateWordLevels(
      selectedRecords.map((word) => ({ id: word.id, englishLevel })),
    );
    setBatchLevelUpdating(true);
    setLevelUpdatingIds((current) =>
      Array.from(new Set([...current, ...targetIds])),
    );

    const results = await Promise.allSettled(
      selectedRecords.map(async (record) => {
        const success = await request<boolean>(
          {
            ...wordUpdateLevel({ id: record.id, englishLevel }),
            config: { suppressErrorMessage: true },
          },
        );
        if (!success) throw new Error("level update failed");
        return record.id;
      }),
    );
    const failedIds = results.flatMap((result, index) =>
      result.status === "rejected" ? [selectedRecords[index].id] : [],
    );

    if (failedIds.length > 0) {
      updateWordLevels(
        failedIds.map((id) => ({
          id,
          englishLevel: previousLevels.get(id) ?? 0,
        })),
      );
      setSelectedCardIds(failedIds);
      message.warning(
        failedIds.length === selectedRecords.length
          ? "批量修改失败，已恢复原状态"
          : `${selectedRecords.length - failedIds.length} 项修改成功，${failedIds.length} 项失败`,
      );
    } else {
      setSelectedCardIds([]);
      message.success(
        `${selectedRecords.length} 项已设为${getLevelLabel(englishLevel).label}`,
      );
    }

    await refresh();

    setLevelUpdatingIds((current) =>
      current.filter((id) => !targetIds.includes(id)),
    );
    setBatchLevelUpdating(false);
  };

  const renderSourcePreviewText = (text: string) => {
    const keyword = sourcePreviewReference?.word?.trim();
    if (!keyword) return text;

    const lowerText = text.toLocaleLowerCase();
    const lowerKeyword = keyword.toLocaleLowerCase();
    const segments: Array<{ text: string; highlight: boolean }> = [];
    let cursor = 0;
    let index = lowerText.indexOf(lowerKeyword);

    while (index >= 0) {
      if (index > cursor) {
        segments.push({ text: text.slice(cursor, index), highlight: false });
      }
      segments.push({
        text: text.slice(index, index + keyword.length),
        highlight: true,
      });
      cursor = index + keyword.length;
      index = lowerText.indexOf(lowerKeyword, cursor);
    }

    if (cursor < text.length) {
      segments.push({ text: text.slice(cursor), highlight: false });
    }

    return segments.map((segment, index) =>
      segment.highlight ? (
        <mark className="context-lab-article-highlight" key={`${segment.text}-${index}`}>
          {segment.text}
        </mark>
      ) : (
        segment.text
      ),
    );
  };

  const renderSourcePreviewArticle = () => {
    if (!sourcePreviewTask?.article) return null;
    const articleContent = parseContextLabArticleContent(sourcePreviewTask.article);

    return (
      <section aria-label="文章阅读区" className="context-lab-reading-pane">
        <div className="context-lab-article">
          <div className="context-lab-article-topic-wrap">
            <Text className="learning-cockpit-label">雅思阅读</Text>
            {articleContent.topic && (
              <>
                <Text className="context-lab-topic-label">文章主题</Text>
                <span aria-hidden="true" className="context-lab-topic-divider">
                  /
                </span>
                <h4 className="context-lab-article-topic">
                  {renderSourcePreviewText(articleContent.topic)}
                </h4>
              </>
            )}
          </div>
          {articleContent.paragraphs.map((paragraph, index) => (
            <p
              className="context-lab-article-paragraph"
              key={`${paragraph}-${index}`}
            >
              {renderSourcePreviewText(paragraph)}
            </p>
          ))}
        </div>
        <div className="learning-cockpit-word-strip">
          {sourcePreviewTask.words.map((word) => (
            <Tag key={word} color="blue">
              {word}
            </Tag>
          ))}
        </div>
      </section>
    );
  };

  const renderWordCard = (record: WordList) => {
    const typeInfo = getTypeLabel(record.englishType);
    const partSpeechList = record.englishPartSpeech ?? [];
    const partSpeechLabels = partSpeechList
      .slice(0, 4)
      .map((partSpeech) => getPartSpeechLabel(partSpeech).label);
    const classification = [typeInfo.label, ...partSpeechLabels].join(" · ");
    const cardSelected = selectedCardIds.includes(record.id);
    const contextLabReference = parseContextLabReference(
      record.englishReference,
    );

    return (
      <article
        className={`word-card${cardSelected ? " word-card-selected" : ""}`}
        key={record.id}
      >
        <div className="word-card-title-row">
          {cardBatchMode && (
            <Checkbox
              aria-label={`选择 ${record.englishWord}`}
              checked={cardSelected}
              disabled={batchLevelUpdating}
              onChange={(event) =>
                handleSelectCard(record.id, event.target.checked)
              }
            />
          )}
          <div className="word-card-copy">
            <span className="word-title-cell">
              <a
                href={`https://www.baidu.com/s?wd=${encodeURIComponent(
                  record.englishWord,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="word-link"
                onClick={(event) => event.stopPropagation()}
              >
                {record.englishWord}
              </a>
              <BritishPronunciationButton word={record.englishWord} />
            </span>
            <span className="word-phonetic">
              {record.englishPhonetic || "-"}
            </span>
          </div>
          <Dropdown
            disabled={cardBatchMode}
            menu={{
              items: [
                { key: "edit", label: "编辑" },
                { key: "query", label: "百度查询" },
                { type: "divider" },
                { key: "delete", label: "删除", danger: true },
              ],
              onClick: ({ key, domEvent }) => {
                domEvent.stopPropagation();
                if (key === "edit") {
                  handleEdit(record);
                } else if (key === "query") {
                  window.open(
                    `https://www.baidu.com/s?wd=${encodeURIComponent(
                      record.englishWord,
                    )}`,
                    "_blank",
                    "noopener,noreferrer",
                  );
                } else if (key === "delete") {
                  handleDelete(record.id);
                }
              },
            }}
            trigger={["click"]}
          >
            <Button
              aria-label={`${record.englishWord} 更多操作`}
              className="word-card-more-button"
              disabled={cardBatchMode}
              icon={<MoreOutlined />}
              type="text"
              onClick={(event) => event.stopPropagation()}
            />
          </Dropdown>
        </div>

        <div className="word-card-meaning-row">
          <p className="word-card-meaning">{record.englishChinese || "-"}</p>
          {record.englishImg && (
            <Image
              src={record.englishImg}
              width={52}
              height={52}
              alt={`${record.englishWord} 图片`}
              className="word-card-image"
            />
          )}
        </div>

        <div className="word-card-status-row">
          <WordLevelQuickEdit
            word={record.englishWord}
            value={record.englishLevel}
            loading={levelUpdatingIds.includes(record.id)}
            disabled={cardBatchMode}
            onChange={(level) => void handleQuickLevelChange(record, level)}
          />
          <span className="word-card-classification">
            {classification}
            {partSpeechList.length > 4
              ? ` · +${partSpeechList.length - 4}`
              : ""}
          </span>
        </div>

        {(record.englishNote || record.englishReference) && (
          <div className="word-card-meta">
            {record.englishNote && <span>有笔记</span>}
            {contextLabReference ? (
              <button
                type="button"
                className="word-reference-link word-reference-link-internal"
                onClick={(event) => {
                  event.stopPropagation();
                  void handleOpenContextLabReference(
                    contextLabReference,
                    record,
                  );
                }}
              >
                {getContextLabReferenceLabel(contextLabReference)}
              </button>
            ) : record.englishReference ? (
              isExternalReference(record.englishReference) ? (
                <a
                  className="word-reference-link"
                  href={record.englishReference}
                  rel="noreferrer"
                  target="_blank"
                  onClick={(event) => event.stopPropagation()}
                >
                  查看来源
                </a>
              ) : (
                <span>有引用</span>
              )
            ) : null}
          </div>
        )}
      </article>
    );
  };

  return (
    <EnglishWorldLayout activeKey={activeNav} onNavClick={handleNavClick}>
        {activeNav === "cockpit" ? (
          <LearningCockpitPage />
        ) : activeNav === "contextLab" ? (
          <ContextLabPage />
        ) : activeNav === "memoryMap" ? (
          <MemoryMapPage />
        ) : activeNav === "aiWord" ? (
          <WordAgentTab />
        ) : activeNav === "stats" ? (
          <EnglishStats />
        ) : (
          <div className="english-world-stack">
            <EnglishWorldPageHeader
              compact
              title="词库"
              actions={
                <>
                  <Button
                    aria-label="AI 查词"
                    icon={<TranslationOutlined />}
                    onClick={() => navigate("/englishWorld/ai-word")}
                  >
                    AI 查词
                  </Button>
                  <Button
                    aria-label="记忆地图"
                    icon={<NodeIndexOutlined />}
                    onClick={() => navigate("/englishWorld/memory-map")}
                  >
                    记忆地图
                  </Button>
                  <Button
                    type="primary"
                    onClick={handleAdd}
                    loading={buttonPending}
                    icon={<PlusOutlined />}
                  >
                    添加单词
                  </Button>
                </>
              }
            />
            <section className="english-world-filter-panel" aria-label="词库筛选">
              <Form
                form={form}
                className="english-world-filter-form english-world-filter-form-compact"
                layout="vertical"
                colon={false}
              >
                <FormFieldGroup
                  items={filterFields}
                  columnsPerRow={4}
                  collapsedRows={1}
                  className="english-world-filter-grid"
                  gridClassName="english-world-filter-grid-row"
                  actionsClassName="english-world-filter-action-line"
                  renderActions={({ toggle, expanded, shouldShowToggle }) => (
                    <div className="english-world-filter-actions">
                      <Button
                        type="primary"
                        onClick={handleSearch}
                        size="middle"
                      >
                        查询
                      </Button>
                      <Button
                        htmlType="reset"
                        onClick={handleReset}
                        size="middle"
                      >
                        重置
                      </Button>
                      {shouldShowToggle && (
                        <Button type="link" onClick={toggle} size="small">
                          {expanded ? (
                            <span className="gap-2">
                              <span>收起</span>
                              <UpOutlined />
                            </span>
                          ) : (
                            <span className="gap-2">
                              <span>展开</span>
                              <DownOutlined />
                            </span>
                          )}
                        </Button>
                      )}
                    </div>
                  )}
                />
              </Form>
            </section>

            <section className="english-world-table-panel">
              <div className="english-world-table-toolbar">
                <div className="english-world-table-title">
                  <strong>全部词条</strong>
                  <span>查看和维护词汇内容与学习状态</span>
                </div>
                <div className="english-world-table-tools">
                  <Segmented<WordLibraryView>
                    value={libraryView}
                    onChange={handleLibraryViewChange}
                    options={[
                      {
                        label: "列表",
                        value: "list",
                        icon: <BarsOutlined />,
                      },
                      {
                        label: "卡片",
                        value: "card",
                        icon: <AppstoreOutlined />,
                      },
                    ]}
                  />
                  {libraryView === "card" && (
                    <Button
                      type={cardBatchMode ? "primary" : "default"}
                      onClick={handleToggleCardBatchMode}
                    >
                      {cardBatchMode ? "退出批量" : "批量管理"}
                    </Button>
                  )}
                </div>
              </div>

              {libraryView === "list" ? (
                <div
                  className="english-world-table-wrap"
                  aria-label="词库列表视图"
                >
                  <Table<WordList>
                    bordered={false}
                    size="middle"
                    loading={loading}
                    columns={columns}
                    dataSource={wordList}
                    rowKey="id"
                    locale={{
                      emptyText: (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description="词库还是空的"
                        >
                          <Button type="primary" onClick={handleAdd}>
                            添加第一个单词
                          </Button>
                        </Empty>
                      ),
                    }}
                    virtual
                    scroll={{ x: 1360, y: WORD_TABLE_SCROLL_Y }}
                    pagination={{
                      current: page,
                      total: totalNum,
                      pageSizeOptions: ["10", "20", "50", "100", "200", "500"],
                      showSizeChanger: true,
                      showTotal: (total: number) => `共 ${total} 条数据`,
                      pageSize: pageSize,
                      onChange: handlePageChange,
                      showQuickJumper: true,
                    }}
                  />
                </div>
              ) : (
                <div
                  className="english-world-card-view"
                  aria-label="词库卡片视图"
                >
                  {cardBatchMode && (
                    <div className="word-card-batch-toolbar">
                      <div className="word-card-batch-summary">
                        <strong>已选 {selectedCardIds.length} 项</strong>
                        <Button
                          disabled={batchLevelUpdating || wordList.length === 0}
                          onClick={handleSelectCurrentPage}
                        >
                          {allCurrentPageCardsSelected
                            ? "取消全选"
                            : "全选当前页"}
                        </Button>
                      </div>
                      <div className="word-card-batch-actions">
                        <Tooltip
                          title={
                            selectedCardRecords.length < 3
                              ? "至少选择 3 个词"
                              : undefined
                          }
                        >
                          <span>
                            <Button
                              aria-label="生成语境题"
                              disabled={
                                selectedCardRecords.length < 3 ||
                                batchContextCreating
                              }
                              icon={<ExperimentOutlined aria-hidden="true" />}
                              type="primary"
                              onClick={handleOpenBatchContextLab}
                            >
                              生成语境题
                            </Button>
                          </span>
                        </Tooltip>
                        <span>批量设为</span>
                        {WORD_LEVEL_VALUES.map((level) => {
                          const info = getLevelLabel(level);
                          return (
                            <Button
                              aria-label={`批量设为${info.label}`}
                              disabled={selectedCardIds.length === 0}
                              key={level}
                              loading={batchLevelUpdating}
                              onClick={() => void handleBatchLevelChange(level)}
                            >
                              {info.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {wordList.length > 0 ? (
                    <div className="english-world-card-grid">
                      {wordList.map(renderWordCard)}
                    </div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="词库还是空的"
                    >
                      <Button type="primary" onClick={handleAdd}>
                        添加第一个单词
                      </Button>
                    </Empty>
                  )}
                  <Pagination
                    current={page}
                    total={totalNum}
                    pageSize={pageSize}
                    pageSizeOptions={["10", "20", "50", "100", "200", "500"]}
                    showSizeChanger
                    showQuickJumper
                    showTotal={(total: number) => `共 ${total} 条数据`}
                    onChange={handlePageChange}
                  />
                </div>
              )}
            </section>
            {/* 编辑模态框 */}
            <EditAddModal
              isModalVisible={isModalVisible}
              currentRecord={wordRecord}
              type={type}
              onOk={handleModalOk}
              onCancel={handleModalCancel}
            />
            <Modal
              cancelButtonProps={{ disabled: batchContextCreating }}
              cancelText="取消"
              closable={!batchContextCreating}
              confirmLoading={batchContextCreating}
              destroyOnHidden={false}
              maskClosable={!batchContextCreating}
              okButtonProps={{ "aria-label": "开始生成" }}
              okText="开始生成"
              open={batchContextModalOpen}
              title="生成语境练习"
              transitionName=""
              onCancel={() => setBatchContextModalOpen(false)}
              onOk={() => void handleCreateBatchContextLab()}
            >
              <Space
                className="word-batch-context-lab-modal"
                direction="vertical"
                size={16}
              >
                <div>
                  <Text strong>所选单词</Text>
                  <Text type="secondary">已选 {selectedCardRecords.length}/20</Text>
                </div>
                <div className="word-batch-context-lab-words">
                  {selectedCardRecords.map((word) => (
                    <Tag color="blue" key={word.id}>
                      {word.englishWord}
                    </Tag>
                  ))}
                </div>
                <Space direction="vertical" size={6}>
                  <Text>生成模型</Text>
                  <Segmented
                    aria-label="生成模型"
                    options={[
                      { label: "DeepSeek", value: "deepseek" },
                      { label: "GPT-5.6", value: "gpt" },
                    ]}
                    value={batchContextModelProvider}
                    onChange={(value) =>
                      setBatchContextModelProvider(
                        value as ContextLabModelProvider,
                      )
                    }
                  />
                </Space>
                <Space direction="vertical" size={6}>
                  <Text>雅思分数等级</Text>
                  <InputNumber
                    aria-label="雅思分数等级"
                    max={IELTS_BAND_MAX}
                    min={IELTS_BAND_MIN}
                    step={IELTS_BAND_STEP}
                    value={batchContextIeltsBand}
                    onBlur={() =>
                      setBatchContextIeltsBand(
                        normalizeIeltsBand(batchContextIeltsBand),
                      )
                    }
                    onChange={(value) => setBatchContextIeltsBand(value)}
                  />
                </Space>
              </Space>
            </Modal>
            <Modal
              className={`context-lab-source-modal${
                sourcePreviewFullscreen
                  ? " context-lab-source-modal-fullscreen"
                  : ""
              }`}
              destroyOnHidden={false}
              footer={[
                <Button key="close" onClick={closeSourcePreview}>
                  关闭
                </Button>,
                sourcePreviewError && sourcePreviewRecord ? (
                  <Button key="edit" onClick={handleEditSourcePreviewRecord}>
                    编辑词条
                  </Button>
                ) : (
                  <Button
                    key="practice"
                    type="primary"
                    disabled={sourcePreviewLoading || !sourcePreviewTask}
                    icon={<PlayCircleOutlined aria-hidden="true" />}
                    onClick={handleStartContextLabPractice}
                  >
                    开始练习
                  </Button>
                ),
              ]}
              open={sourcePreviewOpen}
              title={
                <div className="context-lab-source-modal-title">
                  <span>单词来源文章</span>
                  <Button
                    aria-label={
                      sourcePreviewFullscreen ? "退出满屏" : "占满屏幕"
                    }
                    icon={
                      sourcePreviewFullscreen ? (
                        <FullscreenExitOutlined />
                      ) : (
                        <FullscreenOutlined />
                      )
                    }
                    size="small"
                    type="text"
                    onClick={() =>
                      setSourcePreviewFullscreen((value) => !value)
                    }
                  >
                    {sourcePreviewFullscreen ? "退出满屏" : "占满屏幕"}
                  </Button>
                </div>
              }
              width={sourcePreviewFullscreen ? "100vw" : "min(980px, 92vw)"}
              onCancel={closeSourcePreview}
            >
              <div className="context-lab-source-preview">
                <div className="context-lab-source-preview-head">
                  <div>
                    <Text className="learning-cockpit-label">Word Source</Text>
                    <Title level={4}>
                      {sourcePreviewReference?.word
                        ? `定位：${sourcePreviewReference.word}`
                        : "来源定位"}
                    </Title>
                  </div>
                  <Text type="secondary">
                    这里只查看单词出现的原文，需要做题时再开始练习。
                  </Text>
                </div>
                {sourcePreviewLoading ? (
                  <div className="context-lab-history-empty">
                    <Spin />
                    <Text type="secondary">正在读取来源文章...</Text>
                  </div>
                ) : sourcePreviewError ? (
                  <Empty
                    description={
                      <span>
                        来源引用已失效。原练习包可能已被删除，当前单词仍可保留；如需处理，可以编辑词条清空或更新引用。
                      </span>
                    }
                  />
                ) : (
                  renderSourcePreviewArticle()
                )}
              </div>
            </Modal>
          </div>
        )}
    </EnglishWorldLayout>
  );
};

export default EnglishWorld;
