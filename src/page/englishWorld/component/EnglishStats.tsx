import { enumToOptions, useMutation } from "@/utils";
import { Card, Col, Row, Select } from "antd";
import ReactECharts from "echarts-for-react";
import { EnglishAbsorb } from "../enum";
import { englishStats } from "@/server";
import { useEffect, useState } from "react";

type DailyStat = {
  date: string;
  count: number;
};

type SummaryStat = {
  label: string;
  value: number | string;
  color: string;
};

const wordTypeData = [
  { value: 320, name: "动词", color: "#1677ff" },
  { value: 240, name: "名词", color: "#52c41a" },
  { value: 180, name: "形容词", color: "#faad14" },
  { value: 120, name: "副词", color: "#9254de" },
  { value: 90, name: "未分类", color: "#8c8c8c" },
];

export const EnglishStats = () => {
  const [selectedLevel, setSelectedLevel] = useState<EnglishAbsorb>(
    EnglishAbsorb["一般"]
  );
  const [summaryStats, setSummaryStats] = useState<SummaryStat[]>([
    { label: "总学习单词", value: 0, color: "#1677ff" },
    { label: "已掌握单词", value: 0, color: "#52c41a" },
    {
      label: "掌握率",
      value: 0,
      color: "#faad14",
    },
  ]);

  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);

  const { mutateAsync: mutateEnglishStats } = useMutation(englishStats);
  const optionBar = {
    tooltip: {
      trigger: "axis",
    },
    grid: {
      left: 30,
      right: 20,
      top: 40,
      bottom: 30,
    },
    xAxis: {
      type: "category",
      data: dailyStats.map((item) => item.date),
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      name: "新增单词",
      minInterval: 5,
    },
    series: [
      {
        data: dailyStats.map((item) => item.count),
        type: "bar",
        barWidth: 24,
        itemStyle: {
          color: "#1677ff",
          borderRadius: [6, 6, 0, 0],
        },
      },
    ],
  };

  // 初始化加载数据
  useEffect(() => {
    loadStats(EnglishAbsorb["一般"]);
  }, []);

  // 加载统计数据
  const loadStats = async (level: EnglishAbsorb) => {
    try {
      const res = await mutateEnglishStats({ level });
      if (res.code === 200) {
        const { levelCount, percentage, totalCount, dailyStats } = res.data;
        setSummaryStats([
          { label: "总学习单词", value: totalCount, color: "#1677ff" },
          { label: "已掌握单词", value: levelCount, color: "#52c41a" },
          {
            label: "掌握率",
            value: Number(percentage).toFixed(2), // 转换为百分比
            color: "#faad14",
          },
        ]);

        setDailyStats(dailyStats);
      }
    } catch (error) {
      console.error("加载统计数据失败:", error);
    }
  };

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
          color: "#595959",
        },
        labelLine: {
          length: 15,
          length2: 10,
        },
        itemStyle: {
          shadowBlur: 8,
          shadowColor: "rgba(0,0,0,0.1)",
          borderColor: "#fff",
          borderWidth: 2,
        },
        data: wordTypeData.map((item, index) => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color,
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

  return (
    <div className="mt-6">
      <Row gutter={16}>
        {summaryStats?.map((item) => (
          <Col span={8} key={item.label}>
            <Card>
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
                  style={{ color: item.color }}
                >
                  {item.label === "掌握率" ? `${item.value}%` : item.value}
                </span>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="每日新增单词">
            <ReactECharts option={optionBar} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="词性分布">
            <ReactECharts option={optionPie} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
