import React, { useEffect, useState } from "react";
import {
  Button,
  DatePicker,
  Empty,
  Form,
  Image,
  Input,
  message,
  Modal,
  Pagination,
  Segmented,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import { EditAddModal } from "./component/EditAddModal";
import request, { useMutation } from "@font/api";
import { wordAdd, wordDel, wordExist, wordUpdate } from "@/server/word/word";
import { WordList } from "@/server/word/word.type";
import { useColumns } from "./useColumns";
import { EnglishHeader } from "./component/EnglishHeader";
import { FormFieldGroup } from "./component/FormFieldGroup";
import { EnglishStats } from "./component/EnglishStats";
import { LearningCockpitPage } from "./cockpit/LearningCockpitPage";
import { MemoryMapPage } from "./memoryMap/MemoryMapPage";
import { ContextLabPage } from "./contextLab/ContextLabPage";
import { WordAgentTab } from "./component/WordAgentTab";
import { contextLabDetail } from "./server/learning";
import type { ContextLabTask } from "./types/learning";
import {
  AppstoreOutlined,
  BarsOutlined,
  DeleteFilled,
  DownOutlined,
  EditFilled,
  FullscreenExitOutlined,
  FullscreenOutlined,
  PlayCircleOutlined,
  PlusOutlined,
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
import {
  getContextLabReferenceLabel,
  type ParsedContextLabReference,
  parseContextLabReference,
} from "./utils/contextLabReference";
import "./EnglishWorld.css";
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const WORD_TABLE_SCROLL_Y = 620;
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

  const handleNavClick = () => {};

  const filterFields = [
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
      key: "englishChinese",
      node: (
        <Form.Item label="中文名" name="englishChinese">
          <Input placeholder="请输入中文名" allowClear />
        </Form.Item>
      ),
    },
    {
      key: "englishWord",
      node: (
        <Form.Item label="英文名" name="englishWord">
          <Input placeholder="请输入英文名" allowClear />
        </Form.Item>
      ),
    },
    {
      key: "englishPhonetic",
      node: (
        <Form.Item label="音标" name="englishPhonetic">
          <Input placeholder="请输入音标" allowClear />
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
    await search(normalizeDesktopWordFilters(form.getFieldsValue()));
  };

  // 重置表单
  const handleReset = async () => {
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
    changePage(page, pageSize);
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

  const renderWordCard = (record: WordList, index: number) => {
    const serialNumber = (page - 1) * pageSize + index + 1;
    const typeInfo = getTypeLabel(record.englishType);
    const levelInfo = getLevelLabel(record.englishLevel);
    const partSpeechList = record.englishPartSpeech ?? [];
    const contextLabReference = parseContextLabReference(
      record.englishReference,
    );

    return (
      <article className="word-card" key={record.id}>
        <div className="word-card-head">
          <span className="word-index">#{serialNumber}</span>
          <Space size={6} wrap>
            <Tag color={typeInfo.color}>{typeInfo.label}</Tag>
            <Tag color={levelInfo.color}>{levelInfo.label}</Tag>
          </Space>
        </div>

        <div className="word-card-main">
          {record.englishImg && (
            <Image
              src={record.englishImg}
              width={58}
              height={58}
              alt={record.englishWord}
              className="word-card-image"
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
        </div>

        <p className="word-card-meaning">{record.englishChinese || "-"}</p>

        <div className="word-card-tag-row">
          {partSpeechList.length > 0 ? (
            partSpeechList.slice(0, 4).map((partSpeech) => {
              const info = getPartSpeechLabel(partSpeech);
              return (
                <Tag key={partSpeech} color={info.color}>
                  {info.label}
                </Tag>
              );
            })
          ) : (
            <span className="word-muted">暂无词性</span>
          )}
          {partSpeechList.length > 4 && (
            <Tag color="default">+{partSpeechList.length - 4}</Tag>
          )}
        </div>

        <div className="word-card-meta">
          <span>{record.englishNote ? "有笔记" : "无笔记"}</span>
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
          ) : (
            <span>{record.englishReference ? "有引用" : "无引用"}</span>
          )}
        </div>

        <div className="word-card-actions">
          <Button
            type="text"
            size="small"
            onClick={() => handleEdit(record)}
            icon={<EditFilled />}
            className="word-action-button"
          >
            编辑
          </Button>
          <Button
            type="text"
            danger
            size="small"
            onClick={() => handleDelete(record.id)}
            icon={<DeleteFilled />}
            className="word-action-button"
          >
            删除
          </Button>
        </div>
      </article>
    );
  };

  return (
    <div className="english-world-shell">
      <EnglishHeader activeKey={activeNav} onNavClick={handleNavClick} />
      <main className="english-world-main">
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
                  <strong>词库管理</strong>
                  <span>保留筛选字段、表格列和添加/编辑单词字段</span>
                </div>
                <div className="english-world-table-tools">
                  <Segmented<WordLibraryView>
                    value={libraryView}
                    onChange={setLibraryView}
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
                  <Button
                    type="primary"
                    onClick={handleAdd}
                    size="middle"
                    loading={buttonPending}
                    icon={<PlusOutlined />}
                  >
                    添加单词
                  </Button>
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
                  {wordList.length > 0 ? (
                    <div className="english-world-card-grid">
                      {wordList.map(renderWordCard)}
                    </div>
                  ) : (
                    <Empty description="暂无单词" />
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
      </main>
    </div>
  );
};

export default EnglishWorld;
