import { useEffect, useState } from "react";
import { Typography } from "antd";
import request from "@font/api";
import { MemoryMapSummary } from "./MemoryMapSummary";
import { memoryMapOverview } from "../server/learning";
import type { MemoryMapOverview } from "../types/learning";

const { Text, Title } = Typography;

const demoOverview: MemoryMapOverview = {
  levels: [
    { level: 0, count: 18 },
    { level: 1, count: 32 },
    { level: 2, count: 48 },
    { level: 3, count: 30 },
  ],
  dueWords: [
    { id: 1, word: "resilient", meaning: "有复原力的", level: 0 },
    { id: 2, word: "recover", meaning: "恢复", level: 1 },
  ],
  weakWords: [
    { id: 1, word: "resilient", meaning: "有复原力的", level: 0 },
    { id: 2, word: "recover", meaning: "恢复", level: 1 },
    { id: 3, word: "fragile", meaning: "脆弱的", level: 0 },
  ],
  recentMistakes: [
    {
      wordId: 1,
      word: "resilient",
      meaning: "有复原力的",
      mistakeCount: 2,
      cluster: "low-mastery",
    },
    {
      wordId: 3,
      word: "fragile",
      meaning: "脆弱的",
      mistakeCount: 1,
      cluster: "recent-error",
    },
  ],
  streakLikeStats: {
    recentSessions: 5,
    recentAccuracy: 68,
  },
};

export function MemoryMapPage() {
  const [overview, setOverview] = useState(demoOverview);

  useEffect(() => {
    let mounted = true;

    void request(memoryMapOverview({ days: 7 }))
      .then((data) => {
        if (mounted) setOverview(data);
      })
      .catch(() => {
        if (mounted) setOverview(demoOverview);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="learning-cockpit">
      <section className="learning-cockpit-hero">
        <div>
          <Text className="learning-cockpit-label">C. Memory OS</Text>
          <Title level={1}>记忆地图</Title>
          <p>把错词、相似词和掌握路径放在一个学习视图里，帮助你决定下一组要练什么。</p>
        </div>
      </section>
      <MemoryMapSummary overview={overview} />
    </div>
  );
}
