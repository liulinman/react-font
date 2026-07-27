import { useCallback, useEffect, useMemo, useState } from "react";
import { Empty, Table, Tag, Typography, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { FireOutlined, RiseOutlined } from "@ant-design/icons";
import request from "@font/api";
import { wordOverwriteStats } from "@/server/word/word";
import type {
  OverwriteStatsResponse,
  WordList,
} from "@/server/word/word.type";
import {
  getLevelLabel,
  getPartSpeechLabel,
  getTypeLabel,
} from "../utils/wordLabels";

const { Text, Title } = Typography;
const DEFAULT_PAGE_SIZE = 10;

function getStatsRowKey(item: WordList) {
  return `${item.id}-${item.englishWord}`;
}

export function OverwriteStatsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<OverwriteStatsResponse>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
    list: [],
  });

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const response = await request<OverwriteStatsResponse>(
        wordOverwriteStats({ page, pageSize }),
      );
      setStats(response);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : "覆盖统计加载失败");
      setStats({
        page,
        pageSize,
        total: 0,
        totalPages: 0,
        list: [],
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const topWord = stats.list[0];
  const columns = useMemo<ColumnsType<WordList>>(
    () => [
      {
        title: "词条",
        key: "word",
        width: 240,
        render: (_, item) => (
          <div className="overwrite-stats-word">
            <strong>{item.englishWord}</strong>
            {item.englishPhonetic && (
              <Text type="secondary">{item.englishPhonetic}</Text>
            )}
          </div>
        ),
      },
      {
        title: "释义",
        dataIndex: "englishChinese",
        key: "englishChinese",
        render: (value) => value || <Text type="secondary">待补充</Text>,
      },
      {
        title: "覆盖次数",
        key: "overwrite",
        width: 140,
        render: (_, item) => (
          <Tag color="blue" icon={<RiseOutlined />}>
            覆盖 {item.englishOverwriteCount ?? 0} 次
          </Tag>
        ),
      },
      {
        title: "分类",
        key: "classify",
        width: 180,
        render: (_, item) => {
          const type = getTypeLabel(item.englishType);
          const level = getLevelLabel(item.englishLevel);
          return (
            <div className="overwrite-stats-tags">
              <Tag color={type.color}>{type.label}</Tag>
              <Tag color={level.color}>{level.label}</Tag>
            </div>
          );
        },
      },
      {
        title: "词性",
        key: "partSpeech",
        width: 190,
        render: (_, item) => (
          <div className="overwrite-stats-tags">
            {(item.englishPartSpeech?.length ? item.englishPartSpeech : [9]).map(
              (value) => {
                const label = getPartSpeechLabel(value);
                return (
                  <Tag color={label.color} key={`${item.id}-${value}`}>
                    {label.label}
                  </Tag>
                );
              },
            )}
          </div>
        ),
      },
    ],
    [],
  );

  return (
    <div className="overwrite-stats-page">
      <section className="learning-cockpit-hero overwrite-stats-hero">
        <Tag className="context-lab-hero-tag" icon={<FireOutlined />}>
          高频覆盖
        </Tag>
        <Title level={1}>覆盖统计</Title>
        <Text>
          批量导入中反复出现并被覆盖的词，会在这里按次数排序，适合作为核心记忆候选。
        </Text>
      </section>

      <section className="learning-cockpit-card overwrite-stats-panel">
        <div className="learning-cockpit-card-heading">
          <div>
            <Text className="learning-cockpit-label">MEMORY PRIORITY</Text>
            <Title level={3}>核心记忆优先级</Title>
          </div>
          {topWord && (
            <Tag color="blue" icon={<RiseOutlined />}>
              最高覆盖 {topWord.englishOverwriteCount ?? 0} 次
            </Tag>
          )}
        </div>

        <Table
          className="overwrite-stats-table"
          rowKey={getStatsRowKey}
          loading={loading}
          columns={columns}
          dataSource={stats.list}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="还没有被覆盖过的词"
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize,
            total: stats.total,
            showSizeChanger: true,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage);
              setPageSize(nextPageSize);
            },
          }}
          scroll={{ x: 860 }}
        />
      </section>
    </div>
  );
}
