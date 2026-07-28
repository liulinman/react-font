import { useEffect, useRef, useState } from "react";
import { Button, Empty, Progress, Tag, Typography } from "antd";
import {
  ArrowRightOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  FieldTimeOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import request from "@font/api";
import {
  memoryMapOverview,
  memoryMapWordDetail,
} from "../server/learning";
import { BritishPronunciationButton } from "../component/BritishPronunciationButton";
import type { LearningWord, MemoryMapOverview } from "../types/learning";
import { getMemoryClusterLabel } from "./memoryClusterLabels";
import { WordJourneyPanel } from "./WordJourneyPanel";

const { Text, Title } = Typography;

type MemoryExample = {
  sentence: string;
  translation: string;
};

const naturalExamplesByWord: Record<string, MemoryExample[]> = {
  attorney: [
    {
      sentence: "The attorney reviewed the contract before we signed it.",
      translation: "签合同前，律师先审阅了这份合同。",
    },
    {
      sentence: "She called her attorney before answering any questions.",
      translation: "回答任何问题前，她先给律师打了电话。",
    },
  ],
  anthropic: [
    {
      sentence:
        "The researchers studied how anthropic activity changed the river.",
      translation: "研究人员研究了人类活动如何改变这条河流。",
    },
    {
      sentence: "The report focused on anthropic effects on the local climate.",
      translation: "这份报告关注人类活动对当地气候的影响。",
    },
  ],
  chore: [
    {
      sentence: "Doing laundry is my least favorite chore on weekends.",
      translation: "洗衣服是我周末最不喜欢做的家务。",
    },
    {
      sentence:
        "Taking out the trash is a simple chore, but I always forget it.",
      translation: "倒垃圾是件简单的家务，但我总是忘记。",
    },
  ],
  debt: [
    {
      sentence: "He worked extra hours to pay off his student debt.",
      translation: "他加班工作来还清学生贷款。",
    },
    {
      sentence: "The company reduced its debt after a strong sales year.",
      translation: "销售表现强劲的一年后，公司减少了债务。",
    },
  ],
  explode: [
    {
      sentence: "The crowd seemed ready to explode with excitement.",
      translation: "人群兴奋得像要爆发一样。",
    },
    {
      sentence: "The number of messages exploded after the announcement.",
      translation: "公告发布后，消息数量激增。",
    },
  ],
  flush: [
    {
      sentence: "Please flush the glass with clean water before using it.",
      translation: "使用前，请用清水冲洗这个杯子。",
    },
    {
      sentence: "A quick flush cleared the dust from the pipe.",
      translation: "快速冲洗一下就把管道里的灰尘清掉了。",
    },
  ],
  fragile: [
    {
      sentence: "The box says the glasses inside are fragile.",
      translation: "盒子上写着里面的玻璃杯易碎。",
    },
    {
      sentence: "Their agreement was fragile and needed careful handling.",
      translation: "他们的协议很脆弱，需要谨慎处理。",
    },
  ],
  "knock over": [
    {
      sentence: "Be careful not to knock over the coffee on your desk.",
      translation: "小心别把桌上的咖啡碰倒。",
    },
    {
      sentence: "The strong wind knocked over several signs outside the store.",
      translation: "强风把店外的几个牌子吹倒了。",
    },
  ],
  negative: [
    {
      sentence: "Try not to let one negative comment ruin your day.",
      translation: "别让一句负面评价毁掉你一整天的心情。",
    },
    {
      sentence: "The test result was negative, so she felt relieved.",
      translation: "检测结果为阴性，所以她松了一口气。",
    },
  ],
  phrase: [
    {
      sentence: "I wrote down the phrase so I could use it later.",
      translation: "我把这个短语记下来，方便以后使用。",
    },
    {
      sentence: "That phrase sounds natural in everyday conversation.",
      translation: "那个短语在日常对话里听起来很自然。",
    },
  ],
  recession: [
    {
      sentence: "Many companies slowed hiring during the recession.",
      translation: "经济衰退期间，许多公司放慢了招聘速度。",
    },
    {
      sentence: "Families became more careful with money during the recession.",
      translation: "经济衰退期间，许多家庭花钱更谨慎了。",
    },
  ],
  recover: [
    {
      sentence: "She took a few days off to recover from the flu.",
      translation: "她休息了几天来从流感中恢复过来。",
    },
    {
      sentence: "The team recovered quickly after losing the first game.",
      translation: "输掉第一场后，团队很快恢复了状态。",
    },
  ],
  resilient: [
    {
      sentence: "She stayed resilient even after the project failed.",
      translation: "即使项目失败了，她依然保持韧性。",
    },
    {
      sentence: "A resilient system can keep working when one part fails.",
      translation: "有韧性的系统在某个部分失败时仍能继续运行。",
    },
  ],
  telepathic: [
    {
      sentence: "The twins joked that their timing felt almost telepathic.",
      translation: "这对双胞胎开玩笑说，他们的默契几乎像心灵感应。",
    },
    {
      sentence: "He guessed what I wanted with almost telepathic accuracy.",
      translation: "他几乎像有心灵感应一样准确猜到了我想要什么。",
    },
  ],
  vehicle: [
    {
      sentence: "The delivery vehicle stopped outside our building.",
      translation: "送货车辆停在了我们楼外。",
    },
    {
      sentence: "The app became a vehicle for sharing local news.",
      translation: "这个应用成了分享本地新闻的媒介。",
    },
  ],
  vibe: [
    {
      sentence:
        "The small cafe had a relaxed vibe, so we stayed there for hours.",
      translation: "这家小咖啡馆氛围很放松，所以我们在那里待了好几个小时。",
    },
    {
      sentence: "The meeting had a strange vibe after everyone went quiet.",
      translation: "大家都安静下来后，会议的气氛变得有点奇怪。",
    },
  ],
};

function getPrimaryMeaning(meaning?: string) {
  return (
    meaning
      ?.split(/[;；,，、]/)
      .map((item) => item.trim())
      .find(Boolean) || "这个意思"
  );
}

function generateMemoryExample(
  word: LearningWord,
  exampleIndex: number,
): MemoryExample {
  const knownExamples = naturalExamplesByWord[word.word.trim().toLowerCase()];
  if (knownExamples?.length)
    return knownExamples[exampleIndex % knownExamples.length];

  const meaning = getPrimaryMeaning(word.meaning);

  return {
    sentence: `I heard the word "${word.word}" in a conversation and wrote it down.`,
    translation: `我在一次对话中听到 "${word.word}" 这个词，就把它记了下来。它可以表示：${meaning}。`,
  };
}

const demoOverview: MemoryMapOverview = {
  levels: [
    { level: 0, count: 18 },
    { level: 1, count: 32 },
    { level: 2, count: 48 },
    { level: 3, count: 30 },
  ],
  dueWords: [
    {
      id: 1,
      word: "resilient",
      meaning: "有复原力的",
      phonetic: "/rɪˈzɪliənt/",
      level: 0,
    },
    {
      id: 2,
      word: "recover",
      meaning: "恢复",
      phonetic: "/rɪˈkʌvə/",
      level: 1,
    },
  ],
  weakWords: [
    {
      id: 1,
      word: "resilient",
      meaning: "有复原力的",
      phonetic: "/rɪˈzɪliənt/",
      level: 0,
    },
    {
      id: 2,
      word: "recover",
      meaning: "恢复",
      phonetic: "/rɪˈkʌvə/",
      level: 1,
    },
    {
      id: 3,
      word: "fragile",
      meaning: "脆弱的",
      phonetic: "/ˈfrædʒaɪl/",
      level: 0,
    },
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
  const navigate = useNavigate();
  const detailRequestId = useRef(0);
  const [overview, setOverview] = useState(demoOverview);
  const [selectedWord, setSelectedWord] = useState<LearningWord | null>(
    demoOverview.weakWords[0] ?? null,
  );
  const [memoryExample, setMemoryExample] = useState<MemoryExample | null>(
    null,
  );
  const [exampleCounts, setExampleCounts] = useState<Record<number, number>>(
    {},
  );
  const [showTranslation, setShowTranslation] = useState(false);

  useEffect(() => {
    let mounted = true;

    void request(memoryMapOverview({ days: 7 }))
      .then((data) => {
        if (!mounted) return;
        setOverview(data);
        setSelectedWord(
          (current) =>
            data.weakWords.find((word) => word.id === current?.id) ??
            data.weakWords[0] ??
            null,
        );
      })
      .catch(() => {
        if (!mounted) return;
        setOverview(demoOverview);
        setSelectedWord(
          (current) => current ?? demoOverview.weakWords[0] ?? null,
        );
      });

    return () => {
      mounted = false;
    };
  }, []);

  const total = overview.levels.reduce((sum, item) => sum + item.count, 0);
  const mastered = overview.levels
    .filter((item) => item.level >= 2)
    .reduce((sum, item) => sum + item.count, 0);
  const masteryPercent = total ? Math.round((mastered / total) * 100) : 0;

  const handleSelectWord = async (word: LearningWord) => {
    const requestId = ++detailRequestId.current;
    setSelectedWord(word);
    setMemoryExample(null);
    setShowTranslation(false);
    try {
      const detail = await request(memoryMapWordDetail({ wordId: word.id }));
      if (requestId === detailRequestId.current) setSelectedWord(detail);
    } catch {
      if (requestId === detailRequestId.current) setSelectedWord(word);
    }
  };

  const handleGenerateExample = () => {
    if (!selectedWord) return;

    const currentCount = exampleCounts[selectedWord.id] ?? 0;
    setMemoryExample(generateMemoryExample(selectedWord, currentCount));
    setExampleCounts((current) => ({
      ...current,
      [selectedWord.id]: currentCount + 1,
    }));
    setShowTranslation(false);
  };

  const handleJourneyAction = () => {
    if (!selectedWord) return;
    const action = selectedWord.journey?.nextAction;
    if (action?.type === "context") {
      const params = new URLSearchParams({
        source: "cockpit",
        words: selectedWord.word,
      });
      navigate(`/englishWorld/context-lab?${params.toString()}`);
      return;
    }
    if (action?.type !== "wait") {
      const params = new URLSearchParams({
        source: "repair",
        title: `复查 ${selectedWord.word}`,
        wordIds: String(selectedWord.id),
      });
      navigate(`/englishWorld/recite?${params.toString()}`);
    }
  };

  return (
    <div className="memory-map-page text-slate-700">
      <section className="memory-map-title">
        <div>
          <Title level={4} className="!mt-1 !mb-1 !font-black">
            记忆地图
          </Title>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "低掌握词",
            value: overview.weakWords.length,
            color: "text-rose-600",
          },
          {
            label: "待处理",
            value: overview.dueWords.length,
            color: "text-amber-600",
          },
          {
            label: "近期正确率",
            value: `${overview.streakLikeStats.recentAccuracy}%`,
            color: "text-indigo-600",
          },
          {
            label: "掌握路径",
            value: `${masteryPercent}%`,
            color: "text-emerald-600",
            progress: true,
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="bg-white p-5 rounded-lg shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
          >
            <Text className="text-slate-400 text-[11px] mb-2 font-bold uppercase">
              {stat.label}
            </Text>
            <div className="flex items-end justify-between">
              <strong
                className={`text-2xl font-black leading-none ${stat.color}`}
              >
                {stat.value}
              </strong>
              {stat.progress && (
                <div className="w-16">
                  <Progress
                    percent={masteryPercent}
                    size="small"
                    showInfo={true}
                    strokeColor="#10b981"
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* 左侧：弱词队列 */}
        <section className="lg:col-span-3 bg-white rounded-lg shadow-sm overflow-hidden h-[650px] flex flex-col border-none">
          <div className="p-4 border-b border-slate-50 bg-white">
            <Title level={5} className="!m-0 !font-bold">
              弱词队列
            </Title>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/30">
            {overview.weakWords.length ? (
              overview.weakWords.map((word) => (
                <div
                  key={word.id}
                  className={`group relative p-3 rounded-md cursor-pointer transition-all duration-200 border-l-4 ${
                    selectedWord?.id === word.id
                      ? "bg-white border-blue-500 shadow-sm"
                      : "bg-transparent border-transparent hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <button
                    aria-label={`查看 ${word.word} 的掌握轨迹`}
                    aria-pressed={selectedWord?.id === word.id}
                    className="absolute inset-0 cursor-pointer appearance-none rounded-md border-0 bg-transparent p-0 outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
                    onClick={() => void handleSelectWord(word)}
                    type="button"
                  />
                  <div className="pointer-events-none relative z-10 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <strong
                        className={`text-[13px] ${selectedWord?.id === word.id ? "text-blue-600 font-bold" : "text-slate-600"}`}
                      >
                        {word.word}
                      </strong>
                      <Tag
                        className={`!m-0 !rounded-full !border-0 px-2 text-[10px] font-bold ${getJourneyBadgeClass(
                          word.journey?.stage,
                        )}`}
                      >
                        {word.journey?.label ?? "证据加载中"}
                      </Tag>
                    </div>
                    <div className="flex items-center gap-2">
                      {word.phonetic ? (
                        <Text className="text-[11px] text-slate-400 font-mono italic">
                          {word.phonetic}
                        </Text>
                      ) : null}
                      <div className="pointer-events-auto opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <BritishPronunciationButton word={word.word} />
                      </div>
                    </div>
                    <Text className="text-[11px] text-slate-400 truncate">
                      {word.meaning ?? "暂无释义"}
                    </Text>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                description="暂无低掌握词"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </section>

        {/* 中间：详情面板 */}
        <section
          aria-label="当前词详情"
          className="lg:col-span-6 bg-white rounded-lg shadow-md border-t-4 border-t-blue-500 p-8 min-h-[500px]"
        >
          <div className="mb-6">
            <Title level={5} className="!m-0 !font-bold">
              当前词详情
            </Title>
          </div>

          {selectedWord ? (
            <>
              <div className="flex items-start justify-between mb-8">
                <div>
                  <div className="flex items-center gap-3">
                    <Title
                      level={2}
                      className="!m-0 !text-2xl font-black tracking-tighter text-slate-800"
                    >
                      {selectedWord.word}
                    </Title>
                    <BritishPronunciationButton
                      word={selectedWord.word.trim()}
                      size="middle"
                    />
                  </div>
                  {selectedWord.phonetic ? (
                    <Text className="text-base text-slate-400 font-mono mt-1 block">
                      {selectedWord.phonetic}
                    </Text>
                  ) : null}
                </div>
                <Tag
                  color={selectedWord.level <= 1 ? "volcano" : "green"}
                  className="!rounded-full px-3 py-0.5 text-[10px] font-bold border-none"
                >
                  词库等级 Lv {selectedWord.level}
                </Tag>
              </div>

              <p className="text-sm text-slate-500 leading-relaxed mb-8 bg-slate-50 p-5 rounded-md italic border-l-2 border-slate-200">
                “{" "}
                {selectedWord.meaning ??
                  "这个词还没有中文释义，可以先送入语境实验室补练。"}
              </p>

              <div className="flex flex-wrap gap-2 mb-10">
                {overview.recentMistakes
                  .filter((item) => item.wordId === selectedWord.id)
                  .map((item) => (
                    <Tag
                      key={`${item.wordId}-${item.cluster}`}
                      color="volcano"
                      className="!rounded-full text-[10px] font-medium"
                    >
                      🚨 {getMemoryClusterLabel(item.cluster)} · {item.mistakeCount}{" "}
                      次错误
                    </Tag>
                  ))}
              </div>

              <WordJourneyPanel journey={selectedWord.journey} />

              <section
                aria-label="AI 例句练习"
                className="bg-slate-50/50 rounded-lg p-5 border border-slate-100"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <Text className="text-slate-400 font-black text-[9px] uppercase tracking-widest opacity-70">
                      AI Sentence Lab
                    </Text>
                    <Title level={5} className="!m-0">
                      AI 例句练习
                    </Title>
                  </div>
                  <Button
                    aria-label="AI 生成例句"
                    icon={<BulbOutlined className="text-blue-500" />}
                    onClick={handleGenerateExample}
                    className="!rounded-full !text-xs font-bold"
                    size="small"
                  >
                    换一个
                  </Button>
                </div>
                {memoryExample ? (
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 bg-white p-4 rounded-md shadow-sm">
                      <p className="text-md text-slate-700 font-medium flex-1 m-0 leading-snug">
                        {memoryExample.sentence}
                      </p>
                      <BritishPronunciationButton
                        ariaLabel="播放例句发音"
                        word={memoryExample.sentence}
                      />
                    </div>
                    {showTranslation ? (
                      <p className="text-sm text-slate-500 animate-in fade-in slide-in-from-top-2 duration-300">
                        {memoryExample.translation}
                      </p>
                    ) : (
                      <Button
                        aria-label="查看翻译"
                        type="link"
                        icon={<EyeOutlined className="text-[12px]" />}
                        onClick={() => setShowTranslation(true)}
                        className="!text-[11px] !p-0 !h-auto !text-slate-400 hover:!text-blue-500"
                      >
                        查看翻译
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Text className="text-slate-300 italic text-[11px]">
                      点击按钮生成基于 AI 的记忆辅助句
                    </Text>
                  </div>
                )}
              </section>
            </>
          ) : (
            <Empty
              description="先从左侧选择一个词"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </section>

        {/* 右侧：动作栏 */}
        <section className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-lg shadow-sm p-6 border-none">
            <div className="mb-4">
              <Title level={5} className="!m-0 !font-bold">
                行动中心
              </Title>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
                <div className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-blue-500">
                  推荐下一步
                </div>
                <strong className="block text-[13px] text-slate-800">
                  {selectedWord?.journey?.nextAction?.label ?? "继续定向复习"}
                </strong>
                <p className="mb-3 mt-1 text-[10px] leading-5 text-slate-500">
                  {selectedWord?.journey?.nextAction?.description ??
                    "轨迹暂不可用，仍可继续现有复习。"}
                </p>
                {selectedWord?.journey?.nextAction?.type === "wait" ? (
                  <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-white/80 px-3 py-2 text-[11px] font-bold text-emerald-700">
                    <CheckCircleOutlined aria-hidden="true" />
                    暂时无需安排新任务
                  </div>
                ) : (
                  <Button
                    block
                    className="!h-10 !rounded-lg !border-0 !bg-blue-600 text-xs font-bold shadow-[0_8px_18px_rgba(37,99,235,0.22)]"
                    icon={
                      selectedWord?.journey?.nextAction?.type === "context" ? (
                        <ExperimentOutlined aria-hidden="true" />
                      ) : (
                        <FieldTimeOutlined aria-hidden="true" />
                      )
                    }
                    type="primary"
                    onClick={handleJourneyAction}
                  >
                    {selectedWord?.journey?.nextAction?.label ?? "继续定向复习"}
                  </Button>
                )}
              </div>

              {selectedWord &&
              (selectedWord.journey?.nextAction?.type === "context" ||
                selectedWord.journey?.nextAction?.type === "wait") ? (
                <Button
                  className="h-10 !rounded-md !border-slate-100 bg-slate-50/50 text-xs font-bold text-slate-600"
                  icon={<FieldTimeOutlined aria-hidden="true" />}
                  onClick={() => {
                    if (!selectedWord) return;
                    const params = new URLSearchParams({
                      source: "repair",
                      title: `复查 ${selectedWord.word}`,
                      wordIds: String(selectedWord.id),
                    });
                    navigate(`/englishWorld/recite?${params.toString()}`);
                  }}
                >
                  仍要复习这个词
                </Button>
              ) : null}
              <Button
                className="h-10 !rounded-md !text-slate-400 !border-dashed flex items-center justify-start gap-3 text-[11px] font-medium"
                icon={<ArrowRightOutlined />}
                onClick={() => navigate("/englishWorld/words")}
              >
                返回单词列表
              </Button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function getJourneyBadgeClass(
  stage?: NonNullable<LearningWord["journey"]>["stage"],
) {
  switch (stage) {
    case "needs_review":
      return "bg-amber-100 text-amber-700";
    case "repairing":
      return "bg-blue-100 text-blue-700";
    case "check_later":
      return "bg-indigo-100 text-indigo-700";
    case "stabilizing":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-500";
  }
}
