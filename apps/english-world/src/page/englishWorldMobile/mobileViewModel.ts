import { EnglishPartSpeech } from "@/page/englishWorld/enum";
import type { DailyStat } from "@/server/word/word.type";
import type { CommonRecord } from "@font/utils";

export type SummaryStat = {
  label: string;
  value: number | string;
  color: string;
};

export type PartSpeechData = {
  value: number;
  name: string;
  color: string;
};

export type MobileView = "review" | "list" | "stats" | "aiTool" | "more";

const PART_SPEECH_COLORS: Record<number, string> = {
  1: "#1677ff",
  2: "#52c41a",
  3: "#faad14",
  4: "#9254de",
  5: "#f5222d",
  6: "#13c2c2",
  7: "#fa8c16",
  8: "#eb2f96",
  9: "#8c8c8c",
};

export const initialSummaryStats: SummaryStat[] = [
  { label: "总学习单词", value: 0, color: "#1677ff" },
  { label: "已掌握单词", value: 0, color: "#52c41a" },
  { label: "掌握率", value: 0, color: "#faad14" },
];

export function createSummaryStats(input: {
  totalCount: number;
  levelCount: number;
  percentage: number | string;
}): SummaryStat[] {
  return [
    { label: "总学习单词", value: input.totalCount, color: "#1677ff" },
    { label: "已掌握单词", value: input.levelCount, color: "#52c41a" },
    {
      label: "掌握率",
      value: Number(input.percentage).toFixed(2),
      color: "#faad14",
    },
  ];
}

export function createPartSpeechData(
  partSpeechStatisticalClass: CommonRecord,
): PartSpeechData[] {
  return Object.entries(partSpeechStatisticalClass).map(([key, value]) => {
    const partSpeechKey = Number(key);
    return {
      value: value as number,
      name: EnglishPartSpeech[partSpeechKey],
      color: PART_SPEECH_COLORS[partSpeechKey] || "#8c8c8c",
    };
  });
}

export function createDailyStatsBarOption(dailyStats: DailyStat[]) {
  return {
    tooltip: {
      trigger: "axis",
    },
    grid: {
      left: 30,
      right: 20,
      top: 20,
      bottom: 60,
    },
    xAxis: {
      type: "category",
      data: dailyStats.map((item) => item.date),
      axisTick: { show: false },
      axisLabel: {
        interval: Math.max(0, Math.floor(dailyStats.length / 7) - 1),
        color: "#666",
        fontSize: 10,
        rotate: 45,
        margin: 12,
      },
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
        barWidth: 20,
        itemStyle: {
          color: "#1677ff",
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
}

export function createPartSpeechPieOption(wordTypeData: PartSpeechData[]) {
  return {
    tooltip: {
      trigger: "item",
      formatter: "{b}: {c} ({d}%)",
    },
    legend: {
      orient: "horizontal",
      left: "center",
      top: 10,
      itemWidth: 12,
      itemHeight: 8,
      itemGap: 16,
      textStyle: {
        fontSize: 10,
      },
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["50%", "60%"],
        avoidLabelOverlap: false,
        label: {
          formatter: "{b}\n{d}%",
          color: "#595959",
          fontSize: 10,
        },
        labelLine: {
          length: 10,
          length2: 8,
        },
        itemStyle: {
          shadowBlur: 4,
          shadowColor: "rgba(0,0,0,0.1)",
          borderColor: "#fff",
          borderWidth: 1,
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
}

export function getMobileViewTitle(activeView: MobileView) {
  if (activeView === "review") {
    return "今日学习";
  }

  if (activeView === "list") {
    return "词库";
  }

  if (activeView === "stats") {
    return "学习统计";
  }

  if (activeView === "more") {
    return "更多功能";
  }

  return "学习工具";
}
