import { enumToOptions } from "@font/utils";
import { useMutation } from "@font/api";
import {
  Button,
  Card,
  Col,
  Empty,
  Row,
  Segmented,
  Select,
  Spin,
  theme,
} from "antd";
import ReactECharts from "echarts-for-react";
import { EnglishAbsorb, EnglishPartSpeech } from "../enum";
import { englishStats } from "@/server";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EnglishWorldPageHeader } from "./EnglishWorldPageHeader";
import {
  aggregateDailyStats,
  getDefaultStatsGranularity,
  type DailyStat,
  type StatsGranularity,
} from "./statsTimeline";

type SummaryStat = {
  label: string;
  value: number | string;
  tone: "primary" | "success" | "warning";
};

type PartSpeechData = {
  value: number;
  name: string;
};

export const EnglishStats = () => {
  const navigate = useNavigate();
  const { token } = theme.useToken();
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<EnglishAbsorb>(
    EnglishAbsorb["一般"]
  );
  const [summaryStats, setSummaryStats] = useState<SummaryStat[]>([
    { label: "总学习单词", value: 0, tone: "primary" },
    { label: "已掌握单词", value: 0, tone: "success" },
    {
      label: "掌握率",
      value: 0,
      tone: "warning",
    },
  ]);

  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [statsGranularity, setStatsGranularity] =
    useState<StatsGranularity>("day");
  const [wordTypeData, setWordTypeData] = useState<PartSpeechData[]>([]);

  const { mutateAsync: mutateEnglishStats } = useMutation(englishStats);
  const summaryColors = {
    primary: token.colorPrimary,
    success: token.colorSuccess,
    warning: token.colorWarning,
  };
  const chartPalette = [
    token.colorPrimary,
    token.colorSuccess,
    token.colorWarning,
    token.colorError,
    token.colorInfo,
    token.colorTextSecondary,
  ];
  const aggregatedStats = useMemo(
    () => aggregateDailyStats(dailyStats, statsGranularity),
    [dailyStats, statsGranularity],
  );
  const showTimelineZoom = aggregatedStats.length > 14;
  const zoomStart = showTimelineZoom
    ? ((aggregatedStats.length - 14) / aggregatedStats.length) * 100
    : 0;

  const optionBar = {
    tooltip: {
      trigger: "axis",
      formatter: (
        params: Array<{ dataIndex: number; marker?: string }>,
      ) => {
        const point = aggregatedStats[params[0]?.dataIndex];
        if (!point) return "";
        return `${point.rangeLabel}<br/>${params[0]?.marker ?? ""}新增单词&nbsp;&nbsp;<strong>${point.count}</strong>`;
      },
    },
    grid: {
      left: 42,
      right: 16,
      top: 28,
      bottom: showTimelineZoom ? 68 : 38,
    },
    dataZoom: showTimelineZoom
      ? [
          {
            type: "slider",
            show: true,
            xAxisIndex: [0],
            start: zoomStart,
            end: 100,
            bottom: 8,
            height: 18,
            showDetail: false,
            borderColor: token.colorBorderSecondary,
            backgroundColor: token.colorFillTertiary,
            fillerColor: token.colorPrimaryBg,
            handleSize: "80%",
            handleStyle: {
              color: token.colorPrimary,
              borderColor: token.colorPrimary,
            },
            moveHandleStyle: {
              color: token.colorPrimary,
            },
          },
          {
            type: "inside",
            xAxisIndex: [0],
            start: zoomStart,
            end: 100,
          },
        ]
      : [],
    xAxis: {
      type: "category",
      data: aggregatedStats.map((item) => item.label),
      axisTick: { show: false },
      axisLine: {
        lineStyle: { color: token.colorBorderSecondary },
      },
      axisLabel: {
        interval: "auto",
        hideOverlap: true,
        margin: 12,
        color: token.colorTextSecondary,
        fontSize: 11,
      },
    },
    yAxis: {
      type: "value",
      name: "新增单词",
      minInterval: 1,
      nameTextStyle: {
        color: token.colorTextSecondary,
        align: "left",
      },
      axisLabel: {
        color: token.colorTextSecondary,
      },
      splitLine: {
        lineStyle: { color: token.colorBorderSecondary, opacity: 0.58 },
      },
    },
    series: [
      {
        data: aggregatedStats.map((item) => item.count),
        type: "bar",
        barMaxWidth: 24,
        itemStyle: {
          color: token.colorPrimary,
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };

  // 加载统计数据
  const loadStats = useCallback(
    async (level: EnglishAbsorb) => {
      setLoading(true);
      try {
        const res = await mutateEnglishStats({ level });
        const {
          levelCount,
          percentage,
          totalCount,
          dailyStats,
          partSpeechStatisticalClass,
        } = res;

        setSummaryStats([
          { label: "总学习单词", value: totalCount, tone: "primary" },
          { label: "已掌握单词", value: levelCount, tone: "success" },
          {
            label: "掌握率",
            value: Number(percentage).toFixed(2),
            tone: "warning",
          },
        ]);

        setDailyStats(dailyStats);
        setStatsGranularity(getDefaultStatsGranularity(dailyStats));

        // 处理词性统计数据
        const partSpeechData: PartSpeechData[] = Object.entries(
          partSpeechStatisticalClass,
        ).map(([key, value]) => {
          const partSpeechKey = Number(key);
          return {
            value: value as number,
            name: EnglishPartSpeech[partSpeechKey],
          };
        });

        setWordTypeData(partSpeechData);
      } catch (error) {
        console.error("加载统计数据失败:", error);
      } finally {
        setLoading(false);
      }
    },
    [mutateEnglishStats],
  );

  // 初始化加载数据
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadStats(EnglishAbsorb["一般"]);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadStats]);

  const optionPie = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "vertical",
      left: 10,
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["60%", "50%"],
        avoidLabelOverlap: false,
        label: {
          formatter: "{b}\n{d}%",
          color: token.colorTextSecondary,
        },
        labelLine: {
          length: 15,
          length2: 10,
        },
        itemStyle: {
          shadowBlur: 8,
          shadowColor: token.colorFillSecondary,
          borderColor: token.colorBgContainer,
          borderWidth: 2,
        },
        data: wordTypeData.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: chartPalette[index % chartPalette.length],
            opacity: 0.6 + index * 0.08,
          },
        })),
      },
    ],
  };

  const handleChange = async (value?: EnglishAbsorb) => {
    if (value) {
      setSelectedLevel(value);
      await loadStats(value);
    }
  };

  const totalWords = Number(summaryStats[0]?.value ?? 0);

  return (
    <div className="english-stats-page">
      <EnglishWorldPageHeader
        eyebrow="学习反馈"
        title="学习数据"
        description="看清词库积累、掌握进度和近期学习节奏。"
      />

      {loading ? (
        <div className="english-world-state-panel" aria-label="正在加载学习数据">
          <Spin size="large" />
          <span>正在整理学习数据...</span>
        </div>
      ) : totalWords === 0 ? (
        <div className="english-world-state-panel english-world-empty-panel">
          <Empty
            description={
              <div className="english-world-empty-copy">
                <strong>还没有学习数据</strong>
                <span>先往词库添加单词，学习趋势会从这里开始积累。</span>
              </div>
            }
          >
            <Button
              type="primary"
              onClick={() => navigate("/englishWorld/words")}
            >
              去词库添加
            </Button>
          </Empty>
        </div>
      ) : (
        <div className="english-stats-content">
          <Row gutter={16}>
            {summaryStats?.map((item) => (
              <Col xs={24} md={8} key={item.label}>
                <Card className="english-stats-summary-card">
                  <div className="flex flex-col gap-2">
                    <div>
                      <span className="text-gray-500">{item.label}</span>{" "}
                      {item.label === "已掌握单词" ? (
                        <Select
                          size="small"
                          style={{ width: "80px" }}
                          options={enumToOptions(EnglishAbsorb, [
                            EnglishAbsorb["不会"],
                          ])}
                          value={selectedLevel}
                          onChange={handleChange}
                          allowClear
                        />
                      ) : null}
                    </div>
                    <span
                      className="text-2xl font-semibold"
                      style={{ color: summaryColors[item.tone] }}
                    >
                      {item.label === "掌握率"
                        ? `${item.value}%`
                        : item.value}
                    </span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col xs={24} lg={12}>
              <Card
                className="english-stats-chart-card english-stats-timeline-card"
                title="新增单词趋势"
                extra={
                  <Segmented<StatsGranularity>
                    className="english-stats-chart-range"
                    aria-label="统计时间粒度"
                    size="small"
                    options={[
                      { label: "日", value: "day" },
                      { label: "周", value: "week" },
                      { label: "月", value: "month" },
                    ]}
                    value={statsGranularity}
                    onChange={setStatsGranularity}
                  />
                }
              >
                <ReactECharts option={optionBar} style={{ height: 320 }} />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card className="english-stats-chart-card" title="词性分布">
                <ReactECharts option={optionPie} style={{ height: 320 }} />
              </Card>
            </Col>
          </Row>
        </div>
      )}
    </div>
  );
};
