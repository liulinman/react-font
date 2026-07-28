import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Empty,
  Input,
  InputNumber,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Tabs,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  CheckCircleOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  ReloadOutlined,
  SendOutlined,
  SyncOutlined,
} from "@ant-design/icons";
import request from "@font/api";
import {
  wordIeltsCoreReview,
  wordIeltsCoreVocabularyList,
  wordIeltsCoreVocabularyRefresh,
} from "@/server/word/word";
import type {
  IeltsCoreBand,
  IeltsCoreSourceRef,
  IeltsCoreSourceType,
  IeltsCoreSourceVerification,
  IeltsCoreVocabularyItem,
  IeltsCoreVocabularyListResponse,
  IeltsCoreVocabularyRefreshResult,
  IeltsCoreReviewCandidate,
  IeltsCoreReviewResponse,
} from "@/server/word/word.type";
import { contextLabCreateTask } from "../server/learning";
import { EnglishAbsorb } from "../enum";
import { useNavigate } from "react-router-dom";

const { Text, Title } = Typography;

const DEFAULT_LEVELS = [0, 1];
const DEFAULT_COUNT = 8;
const BAND_LABELS: Record<IeltsCoreReviewCandidate["coreBand"], string> = {
  core: "核心",
  high: "高频",
  topic: "话题",
};
const SOURCE_VERIFICATION_LABELS = {
  verified: "已验证",
  ai_suggested: "AI 建议",
  format_reference: "官方格式",
};
const SOURCE_TYPE_LABELS: Record<IeltsCoreSourceType, string> = {
  "official-ielts": "IELTS 官方",
  "official-sample": "官方样题",
  journal: "学术期刊",
  magazine: "时刊杂志",
  newspaper: "公共报刊",
  "online-resource": "在线资源",
  "recent-event": "近期事件",
  "topic-cluster": "话题簇",
  "ai-analysis": "AI 分析",
};
const SOURCE_TYPE_COLORS: Record<IeltsCoreSourceType, string> = {
  "official-ielts": "volcano",
  "official-sample": "gold",
  journal: "geekblue",
  magazine: "purple",
  newspaper: "blue",
  "online-resource": "green",
  "recent-event": "lime",
  "topic-cluster": "cyan",
  "ai-analysis": "default",
};
const SOURCE_TYPE_OPTIONS = Object.entries(SOURCE_TYPE_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const VERIFICATION_OPTIONS = Object.entries(SOURCE_VERIFICATION_LABELS).map(
  ([value, label]) => ({ value, label }),
);
const COLLECT_LIMIT = 120;
const VOCABULARY_PAGE_SIZE = 10;

type VocabularyFilters = {
  search?: string;
  band?: IeltsCoreBand;
  sourceType?: IeltsCoreSourceType;
  verificationStatus?: IeltsCoreSourceVerification;
};

function getCandidateKey(candidate: IeltsCoreReviewCandidate) {
  return `${candidate.id}-${candidate.word}`;
}

function getLevelOptions() {
  return [0, 1, 2, 3].map((level) => ({
    value: level,
    label: EnglishAbsorb[level],
  }));
}

function formatCollectedAt(value?: string | null) {
  if (!value) return "暂未采集";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getVocabularyKey(item: IeltsCoreVocabularyItem) {
  return `${item.word}-${item.sourceType}-${item.lastSeenAt ?? ""}`;
}

function getVerificationColor(status: IeltsCoreSourceVerification) {
  if (status === "verified") return "green";
  if (status === "format_reference") return "blue";
  return "gold";
}

function getVerificationIcon(status: IeltsCoreSourceVerification) {
  if (status === "verified") return <CheckCircleOutlined />;
  if (status === "format_reference") return <InfoCircleOutlined />;
  return <ExperimentOutlined />;
}

function getMaterialSources(item: IeltsCoreVocabularyItem) {
  const sources = item.sourceRefs.filter(
    (source) =>
      !(
        source.sourceType === "official-ielts" &&
        source.verificationStatus === "format_reference"
      ),
  );
  return sources.length ? sources : item.sourceRefs;
}

function getUniqueVerificationStatuses(item: IeltsCoreVocabularyItem) {
  return Array.from(
    new Set(item.sourceRefs.map((source) => source.verificationStatus)),
  );
}

function formatShortDate(value?: string | null) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  });
}

export function IeltsCoreReviewPage() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<number[]>(DEFAULT_LEVELS);
  const [count, setCount] = useState(DEFAULT_COUNT);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState("");
  const [review, setReview] = useState<IeltsCoreReviewResponse | null>(null);
  const [collectResult, setCollectResult] =
    useState<IeltsCoreVocabularyRefreshResult | null>(null);
  const [sourceSearchDraft, setSourceSearchDraft] = useState("");
  const [vocabularyPage, setVocabularyPage] = useState(1);
  const [vocabularyPageSize, setVocabularyPageSize] = useState(
    VOCABULARY_PAGE_SIZE,
  );
  const [vocabularyFilters, setVocabularyFilters] =
    useState<VocabularyFilters>({});
  const [sourceLoading, setSourceLoading] = useState(false);
  const [vocabularyList, setVocabularyList] =
    useState<IeltsCoreVocabularyListResponse | null>(null);
  const candidates = review?.candidates ?? [];
  const canGenerate = candidates.length >= 3 && !loading;
  const vocabulary = review?.vocabulary;
  const levelOptions = useMemo(() => getLevelOptions(), []);

  const loadCandidates = useCallback(async () => {
    const selectedLevels = levels.length ? levels : DEFAULT_LEVELS;
    setLoading(true);
    setError("");
    try {
      const response = await request<IeltsCoreReviewResponse>(
        wordIeltsCoreReview({
          proficiencyLevels: selectedLevels,
          count,
          useAi: true,
        }),
      );
      setReview(response);
    } catch (err) {
      const messageText =
        err instanceof Error ? err.message : "雅思核心词队列加载失败";
      setError(messageText);
      setReview(null);
    } finally {
      setLoading(false);
    }
  }, [count, levels]);

  useEffect(() => {
    void loadCandidates();
  }, [loadCandidates]);

  const loadVocabularyList = useCallback(async () => {
    setSourceLoading(true);
    try {
      const response = await request<IeltsCoreVocabularyListResponse>(
        wordIeltsCoreVocabularyList({
          page: vocabularyPage,
          pageSize: vocabularyPageSize,
          search: vocabularyFilters.search?.trim() || undefined,
          band: vocabularyFilters.band,
          sourceType: vocabularyFilters.sourceType,
          verificationStatus: vocabularyFilters.verificationStatus,
        }),
      );
      setVocabularyList(response);
    } catch {
      setVocabularyList({
        page: vocabularyPage,
        pageSize: vocabularyPageSize,
        total: 0,
        list: [],
      });
    } finally {
      setSourceLoading(false);
    }
  }, [vocabularyFilters, vocabularyPage, vocabularyPageSize]);

  useEffect(() => {
    void loadVocabularyList();
  }, [loadVocabularyList]);

  const updateVocabularyFilter = useCallback(
    (patch: Partial<VocabularyFilters>) => {
      setVocabularyPage(1);
      setVocabularyFilters((current) => ({
        ...current,
        ...patch,
      }));
    },
    [],
  );

  const handleSourceSearch = useCallback(
    (value: string) => {
      updateVocabularyFilter({ search: value.trim() || undefined });
    },
    [updateVocabularyFilter],
  );

  const handleGenerate = async () => {
    if (!canGenerate) {
      message.warning("至少需要 3 个雅思核心词才能生成练习包");
      return;
    }
    const selectedLevels = levels.length ? levels : DEFAULT_LEVELS;
    setCreating(true);
    try {
      await request(
        contextLabCreateTask({
          sourceType: "ielts-core",
          proficiencyLevels: selectedLevels,
          count,
        }),
      );
      message.success("生成任务已提交");
      navigate("/englishWorld/context-lab");
    } catch (err) {
      message.error(err instanceof Error ? err.message : "生成练习包失败");
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshVocabulary = async () => {
    setCollecting(true);
    setError("");
    try {
      const result = await request<IeltsCoreVocabularyRefreshResult>(
        wordIeltsCoreVocabularyRefresh({ limit: COLLECT_LIMIT }),
      );
      setCollectResult(result);
      message.success(result.message || "IELTS 核心词库已更新");
      setVocabularyPage(1);
      await loadCandidates();
      await loadVocabularyList();
    } catch (err) {
      message.error(err instanceof Error ? err.message : "核心词库更新失败");
    } finally {
      setCollecting(false);
    }
  };

  const vocabularyColumns = useMemo<ColumnsType<IeltsCoreVocabularyItem>>(
    () => [
      {
        title: "词条",
        key: "word",
        width: 230,
        render: (_, item) => (
          <div className="ielts-core-table-word">
            <strong>{item.word}</strong>
            {item.translation && <Text type="secondary">{item.translation}</Text>}
            <div className="ielts-core-topic-row">
              {item.topics.slice(0, 3).map((topic) => (
                <span key={topic}>{topic}</span>
              ))}
            </div>
          </div>
        ),
      },
      {
        title: "等级",
        key: "band",
        width: 140,
        render: (_, item) => (
          <div className="ielts-core-band-cell">
            <Tag color={item.band === "core" ? "blue" : "cyan"}>
              {BAND_LABELS[item.band]}
            </Tag>
            <Text type="secondary">
              {item.importanceScore ?? 0}/{item.examFrequencyScore ?? 0}
            </Text>
          </div>
        ),
      },
      {
        title: "材料来源",
        key: "sources",
        render: (_, item) => {
          const sources = getMaterialSources(item);
          return (
            <div className="ielts-core-source-summary">
              {sources.slice(0, 3).map((source) => (
                <span
                  className="ielts-core-source-chip"
                  key={`${item.word}-${source.sourceType}-${source.title}`}
                >
                  <Tag color={SOURCE_TYPE_COLORS[source.sourceType]}>
                    {SOURCE_TYPE_LABELS[source.sourceType]}
                  </Tag>
                  <Text>{source.title}</Text>
                </span>
              ))}
              {sources.length > 3 && <Tag>+{sources.length - 3}</Tag>}
            </div>
          );
        },
      },
      {
        title: "可信度",
        key: "verification",
        width: 180,
        render: (_, item) => (
          <div className="ielts-core-verification-cell">
            {getUniqueVerificationStatuses(item).map((status) => (
              <Tag
                icon={getVerificationIcon(status)}
                color={getVerificationColor(status)}
                key={status}
              >
                {SOURCE_VERIFICATION_LABELS[status]}
              </Tag>
            ))}
          </div>
        ),
      },
      {
        title: "采集",
        key: "collectedAt",
        width: 150,
        responsive: ["md"],
        render: (_, item) => (
          <div className="ielts-core-date-cell">
            <Text>{item.sourceWindow ?? "未记录窗口"}</Text>
            <Text type="secondary">{formatShortDate(item.lastSeenAt)}</Text>
          </div>
        ),
      },
    ],
    [],
  );

  const renderSourceEvidence = (item: IeltsCoreVocabularyItem) => (
    <div className="ielts-core-evidence-list">
      {item.definition && (
        <p className="ielts-core-evidence-definition">{item.definition}</p>
      )}
      {item.sourceRefs.map((source: IeltsCoreSourceRef) => (
        <div
          className="ielts-core-evidence-item"
          key={`${item.word}-${source.sourceType}-${source.title}`}
        >
          <div className="ielts-core-evidence-title">
            <Tag color={SOURCE_TYPE_COLORS[source.sourceType]}>
              {SOURCE_TYPE_LABELS[source.sourceType]}
            </Tag>
            {source.url ? (
              <a href={source.url} target="_blank" rel="noreferrer">
                <LinkOutlined />
                {source.title}
              </a>
            ) : (
              <strong>{source.title}</strong>
            )}
            <Tag
              icon={getVerificationIcon(source.verificationStatus)}
              color={getVerificationColor(source.verificationStatus)}
            >
              {SOURCE_VERIFICATION_LABELS[source.verificationStatus]}
            </Tag>
          </div>
          <div className="ielts-core-source-meta">
            {[source.publisher, source.publishedAt].filter(Boolean).join(" · ")}
          </div>
          {source.evidenceNote && <p>{source.evidenceNote}</p>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="ielts-core-page">
      <section className="learning-cockpit-hero ielts-core-hero">
        <div>
          <Title level={1}>雅思核心复习</Title>
        </div>
        <Tag className="context-lab-hero-tag" icon={<ExperimentOutlined />}>
          核心词优先
        </Tag>
      </section>

      <Tabs
        className="ielts-core-tabs"
        defaultActiveKey="review"
        items={[
          {
            key: "review",
            label: "复习生成",
            children: (
              <div className="ielts-core-grid">
                <section className="learning-cockpit-card ielts-core-controls">
                  <div className="learning-cockpit-card-heading">
                    <div>
                      <Title level={3}>选择复习范围</Title>
                      <Text type="secondary">
                        默认优先处理不会和一般，也可以把熟练/精通加入抽查。
                      </Text>
                    </div>
                  </div>
                  <div className="ielts-core-control-stack">
                    <div className="ielts-core-meta-row">
                      <span>词库 {vocabulary?.totalActive ?? 0} 个</span>
                      <span>窗口 {vocabulary?.sourceWindow ?? "未记录"}</span>
                      <span>
                        更新 {formatCollectedAt(vocabulary?.lastCollectedAt)}
                      </span>
                    </div>
                    {collectResult && (
                      <Alert
                        className="ielts-core-refresh-result"
                        type="success"
                        showIcon
                        message={collectResult.message}
                      />
                    )}
                    <label className="ielts-core-field">
                      <span>掌握程度</span>
                      <Select
                        mode="multiple"
                        value={levels}
                        options={levelOptions}
                        onChange={(value) => setLevels(value)}
                      />
                    </label>
                    <label className="ielts-core-field">
                      <span>练习词数</span>
                      <InputNumber
                        min={3}
                        max={20}
                        value={count}
                        onChange={(value) => setCount(value ?? DEFAULT_COUNT)}
                      />
                    </label>
                    <Space wrap>
                      <Button
                        icon={<SyncOutlined />}
                        loading={collecting}
                        onClick={() => void handleRefreshVocabulary()}
                      >
                        更新核心词库
                      </Button>
                      <Button
                        icon={<ReloadOutlined />}
                        loading={loading}
                        onClick={() => void loadCandidates()}
                      >
                        刷新队列
                      </Button>
                      <Button
                        type="primary"
                        icon={<SendOutlined />}
                        loading={creating}
                        disabled={!canGenerate}
                        onClick={handleGenerate}
                      >
                        生成练习包
                      </Button>
                    </Space>
                  </div>
                </section>

                <section className="learning-cockpit-card ielts-core-queue">
                  <div className="learning-cockpit-card-heading">
                    <div>
                      <Title level={3}>核心词队列</Title>
                      <Text type="secondary">
                        已命中 {review?.totalMatched ?? 0} 个核心词，当前展示{" "}
                        {candidates.length} 个。
                      </Text>
                    </div>
                  </div>

                  {error && (
                    <Alert
                      type="warning"
                      showIcon
                      message={error}
                      action={
                        <Button onClick={() => void loadCandidates()}>
                          重试
                        </Button>
                      }
                    />
                  )}

                  {loading ? (
                    <div className="ielts-core-loading">
                      <Spin />
                      <Text type="secondary">正在整理雅思核心复习队列...</Text>
                    </div>
                  ) : candidates.length > 0 ? (
                    <div className="ielts-core-candidate-list">
                      {candidates.map((candidate, index) => (
                        <article
                          className="ielts-core-candidate"
                          key={getCandidateKey(candidate)}
                        >
                          <div className="ielts-core-rank">{index + 1}</div>
                          <div className="ielts-core-candidate-main">
                            <div className="ielts-core-candidate-title">
                              <strong>{candidate.word}</strong>
                              <Tag>{EnglishAbsorb[candidate.level]}</Tag>
                              <Tag
                                color={
                                  candidate.coreBand === "core"
                                    ? "blue"
                                    : "cyan"
                                }
                              >
                                {BAND_LABELS[candidate.coreBand]}
                              </Tag>
                            </div>
                            {candidate.meaning && (
                              <Text type="secondary">{candidate.meaning}</Text>
                            )}
                            <p>{candidate.reason}</p>
                            <div className="ielts-core-topic-row">
                              {candidate.matchedTopics.map((topic) => (
                                <span key={topic}>{topic}</span>
                              ))}
                            </div>
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="当前范围内还没有命中的雅思核心词"
                    />
                  )}
                </section>
              </div>
            ),
          },
          {
            key: "sources",
            label: (
              <span>
                <DatabaseOutlined />
                词库来源
              </span>
            ),
            forceRender: true,
            children: (
              <section className="learning-cockpit-card ielts-core-source-panel">
                <div className="learning-cockpit-card-heading ielts-core-source-heading">
                  <div>
                    <Title level={3}>核心词库审计</Title>
                    <Text type="secondary">
                      {vocabularyList?.total ?? 0} 个词条，当前第{" "}
                      {vocabularyList?.page ?? vocabularyPage} 页
                    </Text>
                  </div>
                  <Space wrap className="ielts-core-source-actions">
                    <Button
                      icon={<SyncOutlined />}
                      loading={collecting}
                      onClick={() => void handleRefreshVocabulary()}
                    >
                      更新核心词库
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      loading={sourceLoading}
                      onClick={() => void loadVocabularyList()}
                    >
                      刷新来源
                    </Button>
                  </Space>
                </div>

                <div className="ielts-core-source-toolbar">
                  <Input.Search
                    allowClear
                    className="ielts-core-source-search"
                    placeholder="搜索核心词或释义"
                    value={sourceSearchDraft}
                    onChange={(event) =>
                      setSourceSearchDraft(event.target.value)
                    }
                    onSearch={handleSourceSearch}
                  />
                  <Select
                    allowClear
                    className="ielts-core-source-select"
                    placeholder="核心等级"
                    options={[
                      { value: "core", label: "核心" },
                      { value: "high", label: "高频" },
                      { value: "topic", label: "话题" },
                    ]}
                    value={vocabularyFilters.band}
                    onChange={(value) =>
                      updateVocabularyFilter({ band: value })
                    }
                  />
                  <Select
                    allowClear
                    className="ielts-core-source-select"
                    placeholder="来源类型"
                    options={SOURCE_TYPE_OPTIONS}
                    value={vocabularyFilters.sourceType}
                    onChange={(value) =>
                      updateVocabularyFilter({ sourceType: value })
                    }
                  />
                  <Select
                    allowClear
                    className="ielts-core-source-select"
                    placeholder="可信度"
                    options={VERIFICATION_OPTIONS}
                    value={vocabularyFilters.verificationStatus}
                    onChange={(value) =>
                      updateVocabularyFilter({ verificationStatus: value })
                    }
                  />
                </div>

                <Table<IeltsCoreVocabularyItem>
                  className="ielts-core-source-table"
                  columns={vocabularyColumns}
                  dataSource={vocabularyList?.list ?? []}
                  expandable={{
                    expandedRowRender: renderSourceEvidence,
                    rowExpandable: (item) => item.sourceRefs.length > 0,
                  }}
                  loading={sourceLoading}
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="还没有可查看的核心词来源"
                      />
                    ),
                  }}
                  pagination={{
                    current: vocabularyList?.page ?? vocabularyPage,
                    pageSize: vocabularyPageSize,
                    pageSizeOptions: [10, 20, 50],
                    showSizeChanger: true,
                    showTotal: (total) => `共 ${total} 个词条`,
                    total: vocabularyList?.total ?? 0,
                    onChange: (nextPage, nextPageSize) => {
                      setVocabularyPage(nextPage);
                      setVocabularyPageSize(nextPageSize);
                    },
                  }}
                  rowKey={getVocabularyKey}
                  scroll={{ x: 760 }}
                  size="middle"
                />
              </section>
            ),
          },
        ]}
      />
    </div>
  );
}
