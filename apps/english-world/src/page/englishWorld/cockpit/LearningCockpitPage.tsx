import { useEffect, useState } from "react";
import { Button, Statistic, Tag, Typography } from "antd";
import {
  BarChartOutlined,
  ExperimentOutlined,
  FieldTimeOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { CoachSummaryPanel } from "../dailyCoach/CoachSummaryPanel";
import { MemoryMapSummary } from "../memoryMap/MemoryMapSummary";
import { createFallbackCoachSummary } from "../utils/coachPlanning";
import type { MemoryMapOverview } from "../types/learning";
import request from "@font/api";
import {
  dailyCoachSummary,
  memoryMapOverview,
} from "../server/learning";
import { createPlanReviewSearch } from "../recite/planReview";
import type { DailyCoachAction } from "../types/learning";

const { Text, Title } = Typography;

const demoCoachSummary = createFallbackCoachSummary({
  totalWords: 128,
  todayNewWords: 6,
  reciteAccuracy: 68,
  weakWords: [
    { id: 1, word: "resilient", meaning: "有复原力的", level: 0 },
    { id: 2, word: "recover", meaning: "恢复", level: 1 },
    { id: 3, word: "fragile", meaning: "脆弱的", level: 0 },
    { id: 4, word: "steady", meaning: "稳定的", level: 1 },
  ],
});

const demoMemoryOverview: MemoryMapOverview = {
  levels: [
    { level: 0, count: 18 },
    { level: 1, count: 32 },
    { level: 2, count: 48 },
    { level: 3, count: 30 },
  ],
  dueWords: demoCoachSummary.weakWords.slice(0, 2),
  weakWords: demoCoachSummary.weakWords,
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

export function LearningCockpitPage() {
  const navigate = useNavigate();
  const [coachSummary, setCoachSummary] = useState(demoCoachSummary);
  const [memoryOverview, setMemoryOverview] = useState(demoMemoryOverview);
  const openReview = (action?: DailyCoachAction) => {
    if (!action?.wordIds?.length) {
      navigate("/englishWorld/recite");
      return;
    }

    navigate(`/englishWorld/recite?${createPlanReviewSearch(action)}`);
  };

  useEffect(() => {
    let mounted = true;

    void request(dailyCoachSummary({ days: 7, timezone: 8 }))
      .then((data) => {
        if (mounted) setCoachSummary(data);
      })
      .catch(() => {
        if (mounted) setCoachSummary(demoCoachSummary);
      });

    void request(memoryMapOverview({ days: 7 }))
      .then((data) => {
        if (mounted) setMemoryOverview(data);
      })
      .catch(() => {
        if (mounted) setMemoryOverview(demoMemoryOverview);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="learning-cockpit">
      <section className="learning-cockpit-hero">
        <div>
          <Text className="learning-cockpit-label">English World</Text>
          <Title level={1}>AI Learning Cockpit</Title>
          <p>
            每天先完成一组短任务，再把薄弱词送进语境练习，最后沉淀到你的个人记忆地图。
          </p>
        </div>
        <div className="learning-cockpit-hero-actions">
          <Tag icon={<FieldTimeOutlined />} color="blue">
            Day 8 streak
          </Tag>
          <Tag color="green">Mastery 63%</Tag>
        </div>
      </section>

      <section className="learning-cockpit-stats">
        <Statistic title="词库总量" value={coachSummary.totalWords} />
        <Statistic title="今日新增" value={coachSummary.todayNewWords} />
        <Statistic
          title="近期正确率"
          value={coachSummary.reciteAccuracy}
          suffix="%"
        />
      </section>

      <div className="learning-cockpit-grid">
        <div className="learning-cockpit-main-column">
          <CoachSummaryPanel
            summary={coachSummary}
            onStartReview={openReview}
            onOpenContextLab={() => navigate("/englishWorld/context-lab")}
          />

          <section className="learning-cockpit-card learning-cockpit-context-card">
            <div className="learning-cockpit-card-heading">
              <div>
                <Text className="learning-cockpit-label">B. Context Lab</Text>
                <Title level={3}>AI 语境实验室</Title>
              </div>
              <ExperimentOutlined className="learning-cockpit-card-icon" />
            </div>
            <p className="learning-cockpit-card-copy">
              用今日薄弱词生成短阅读、选择题和例句改写，让单词从词表进入真实场景。
            </p>
            <div className="learning-cockpit-action-row">
              <Button type="primary" onClick={() => navigate("/englishWorld/context-lab")}>
                生成练习包
              </Button>
              <Button onClick={() => navigate("/englishWorld/words")}>
                手选词
              </Button>
            </div>
          </section>
        </div>

        <aside className="learning-cockpit-side-column">
          <MemoryMapSummary
            overview={memoryOverview}
            onOpenMemoryMap={() => navigate("/englishWorld/memory-map")}
          />

          <section className="learning-cockpit-card">
            <div className="learning-cockpit-card-heading">
              <div>
                <Text className="learning-cockpit-label">Library</Text>
                <Title level={4}>词库工作台</Title>
              </div>
              <UnorderedListOutlined className="learning-cockpit-card-icon" />
            </div>
            <p className="learning-cockpit-card-copy">
              表格仍保留为维护入口，负责新增、筛选、编辑和批量检查。
            </p>
            <div className="learning-cockpit-action-row">
              <Button onClick={() => navigate("/englishWorld/words")}>
                打开词库
              </Button>
              <Button
                icon={<BarChartOutlined />}
                onClick={() => navigate("/englishWorld/stats")}
              >
                看统计
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
