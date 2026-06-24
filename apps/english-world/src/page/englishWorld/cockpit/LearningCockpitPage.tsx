import { useEffect, useState } from "react";
import { Button, Tag, Typography } from "antd";
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

  const openContextLab = (action?: DailyCoachAction) => {
    const weakWords = coachSummary?.weakWords ?? [];
    const actionWordIds = new Set(action?.wordIds ?? []);
    const scopedWords = actionWordIds.size
      ? weakWords.filter((word) => actionWordIds.has(word.id))
      : weakWords;
    const words = scopedWords
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
          <Text className="learning-cockpit-label">Today Route</Text>
          <Title level={1}>今日学习路线</Title>
          <p>
            按路线完成一轮短复习，再把薄弱词放进语境练习。
          </p>
        </div>
        <div className="learning-cockpit-hero-actions">
          {coachUnavailable ? (
            <Tag color="orange">学习数据暂不可用</Tag>
          ) : null}
        </div>
      </section>

      {(coachUnavailable || coachSummary) && (
        <>
          {coachSummary && (
            <section
              className="learning-cockpit-status-strip learning-cockpit-status-compact"
              aria-label="今日学习状态"
            >
              <div className="learning-cockpit-status-item">
                <span>词库总量</span>
                <strong>{coachSummary.totalWords}</strong>
              </div>
              <div className="learning-cockpit-status-item">
                <span>今日新增</span>
                <strong>{coachSummary.todayNewWords}</strong>
              </div>
              <div className="learning-cockpit-status-item">
                <span>近期正确率</span>
                <strong>{coachSummary.reciteAccuracy}%</strong>
              </div>
            </section>
          )}

          <div className="learning-cockpit-grid learning-cockpit-route-board">
            <div className="learning-cockpit-main-column">
              {coachSummary ? (
                <>
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
                      用刚才处理过的薄弱词生成阅读、选择题和例句改写，把记忆推进到使用。
                    </p>
                    <div className="learning-cockpit-action-row">
                      <Button onClick={() => openContextLab()}>
                        准备练习
                      </Button>
                      <Button onClick={() => navigate("/englishWorld/words")}>
                        手选词
                      </Button>
                    </div>
                  </section>
                </>
              ) : (
                <section className="learning-cockpit-card learning-cockpit-unavailable">
                  <div className="learning-cockpit-card-heading">
                    <div>
                      <Text className="learning-cockpit-label">
                        A. Daily Coach
                      </Text>
                      <Title level={3}>今日任务暂不可用</Title>
                    </div>
                    <ExperimentOutlined className="learning-cockpit-card-icon" />
                  </div>
                  <p className="learning-cockpit-card-copy">
                    学习数据加载失败。你仍然可以打开词库、复习或手动进入语境实验室。
                  </p>
                  <div className="learning-cockpit-action-row">
                    <Button type="primary" onClick={() => openContextLab()}>
                      生成练习包
                    </Button>
                    <Button onClick={() => navigate("/englishWorld/words")}>
                      打开词库
                    </Button>
                    <Button
                      icon={<BarChartOutlined />}
                      onClick={() => navigate("/englishWorld/stats")}
                    >
                      看统计
                    </Button>
                    <Button onClick={() => navigate("/englishWorld/recite")}>
                      开始今日复习
                    </Button>
                    <Button onClick={() => window.location.reload()}>重试</Button>
                  </div>
                </section>
              )}
            </div>

            <aside className="learning-cockpit-side-column learning-cockpit-side-quiet">
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
                    <Text className="learning-cockpit-label">Tools</Text>
                    <Title level={4}>常用工具</Title>
                  </div>
                  <UnorderedListOutlined className="learning-cockpit-card-icon" />
                </div>
                <p className="learning-cockpit-card-copy">
                  需要维护数据或复盘趋势时再打开，不打断今天的学习路线。
                </p>
                <div className="learning-cockpit-action-row">
                  <Button onClick={() => navigate("/englishWorld/words")}>
                    词库工作台
                  </Button>
                  <Button
                    icon={<BarChartOutlined />}
                    onClick={() => navigate("/englishWorld/stats")}
                  >
                    学习统计
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
