import { useEffect, useState } from "react";
import { Button, Statistic, Tag, Typography } from "antd";
import {
  BarChartOutlined,
  ExperimentOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { CoachSummaryPanel } from "../dailyCoach/CoachSummaryPanel";
import { MemoryMapSummary } from "../memoryMap/MemoryMapSummary";
import type { DailyCoachSummary, MemoryMapOverview } from "../types/learning";
import request from "@font/api";
import {
  dailyCoachSummary,
  memoryMapOverview,
} from "../server/learning";
import { createPlanReviewSearch } from "../recite/planReview";
import type { DailyCoachAction } from "../types/learning";

const { Text, Title } = Typography;

export function LearningCockpitPage() {
  const navigate = useNavigate();
  const [coachSummary, setCoachSummary] = useState<DailyCoachSummary | null>(
    null,
  );
  const [memoryOverview, setMemoryOverview] = useState<MemoryMapOverview | null>(
    null,
  );
  const [coachUnavailable, setCoachUnavailable] = useState(false);
  const [memoryUnavailable, setMemoryUnavailable] = useState(false);

  const openContextLab = () => {
    const words = (coachSummary?.weakWords ?? [])
      .map((word) => word.word)
      .filter(Boolean)
      .slice(0, 8);
    const suffix = words.length
      ? `?source=cockpit&words=${encodeURIComponent(words.join(","))}`
      : "";
    navigate(`/englishWorld/context-lab${suffix}`);
  };

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
        if (mounted) {
          setCoachUnavailable(true);
          setCoachSummary(null);
        }
      });

    void request(memoryMapOverview({ days: 7 }))
      .then((data) => {
        if (mounted) {
          setMemoryOverview(data);
          setMemoryUnavailable(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setMemoryOverview(null);
          setMemoryUnavailable(true);
        }
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
          {coachUnavailable ? (
            <Tag color="orange">学习数据暂不可用</Tag>
          ) : null}
        </div>
      </section>

      {coachUnavailable && (
        <section className="learning-cockpit-card learning-cockpit-unavailable">
          <Title level={3}>今日任务暂不可用</Title>
          <p>
            学习数据加载失败。你仍然可以打开词库、复习或手动进入语境实验室。
          </p>
          <Button onClick={() => window.location.reload()}>重试</Button>
        </section>
      )}

      {!coachUnavailable && coachSummary && (
        <>
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
                onOpenContextLab={openContextLab}
              />

              <section className="learning-cockpit-card learning-cockpit-context-card">
                <div className="learning-cockpit-card-heading">
                  <div>
                    <Text className="learning-cockpit-label">
                      B. Context Lab
                    </Text>
                    <Title level={3}>AI 语境实验室</Title>
                  </div>
                  <ExperimentOutlined className="learning-cockpit-card-icon" />
                </div>
                <p className="learning-cockpit-card-copy">
                  用今日薄弱词生成雅思阅读、选择题和例句改写，让单词从词表进入真实场景。
                </p>
                <div className="learning-cockpit-action-row">
                  <Button type="primary" onClick={openContextLab}>
                    生成练习包
                  </Button>
                  <Button onClick={() => navigate("/englishWorld/words")}>
                    手选词
                  </Button>
                </div>
              </section>
            </div>

            <aside className="learning-cockpit-side-column">
              {memoryUnavailable ? (
                <section className="learning-cockpit-card learning-cockpit-unavailable">
                  <Title level={4}>记忆地图暂不可用</Title>
                  <p>记忆地图数据加载失败，稍后可以重试查看。</p>
                </section>
              ) : memoryOverview ? (
                <MemoryMapSummary
                  overview={memoryOverview}
                  onOpenMemoryMap={() => navigate("/englishWorld/memory-map")}
                />
              ) : null}

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
        </>
      )}
    </div>
  );
}
