import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudSyncOutlined,
  ExperimentOutlined,
  HistoryOutlined,
  SyncOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";
import type {
  WordJourney,
  WordJourneyEvidence,
  WordJourneyStage,
} from "../types/learning";

const stagePresentation: Record<
  WordJourneyStage,
  { icon: ReactNode; surface: string; badge: string }
> = {
  needs_review: {
    icon: <WarningOutlined />,
    surface: "border-amber-200 bg-amber-50/70",
    badge: "bg-amber-100 text-amber-700",
  },
  repairing: {
    icon: <SyncOutlined spin />,
    surface: "border-blue-200 bg-blue-50/70",
    badge: "bg-blue-100 text-blue-700",
  },
  check_later: {
    icon: <ClockCircleOutlined />,
    surface: "border-indigo-200 bg-indigo-50/70",
    badge: "bg-indigo-100 text-indigo-700",
  },
  stabilizing: {
    icon: <CheckCircleFilled />,
    surface: "border-emerald-200 bg-emerald-50/70",
    badge: "bg-emerald-100 text-emerald-700",
  },
  unavailable: {
    icon: <CloudSyncOutlined />,
    surface: "border-slate-200 bg-slate-50",
    badge: "bg-slate-200 text-slate-600",
  },
};

type WordJourneyPanelProps = {
  journey?: WordJourney;
};

export function WordJourneyPanel({ journey }: WordJourneyPanelProps) {
  const current = journey ?? createUnavailableJourney();
  const presentation =
    stagePresentation[current.stage] ?? stagePresentation.unavailable;

  return (
    <section aria-label="词汇掌握轨迹" className="mb-7">
      <div
        className={`rounded-xl border p-5 transition-colors ${presentation.surface}`}
      >
        <div className="flex items-start justify-between gap-5">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-sm shadow-sm"
              >
                {presentation.icon}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 text-[11px] font-black tracking-wide ${presentation.badge}`}
              >
                {current.label}
              </span>
            </div>
            <p className="m-0 max-w-xl text-[13px] font-semibold leading-6 text-slate-700">
              {current.reason}
            </p>
          </div>
          <div className="shrink-0 rounded-lg border border-white/80 bg-white/75 px-3 py-2 text-right shadow-sm">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              建议时机
            </div>
            <div className="mt-0.5 text-xs font-bold text-slate-700">
              {current.suggestedTiming}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-slate-100 bg-white px-5 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center gap-2">
          <HistoryOutlined className="text-blue-500" />
          <span className="text-xs font-black tracking-wide text-slate-700">
            最近学习证据
          </span>
          <span className="ml-auto text-[11px] text-slate-500">
            只展示事实，不预测遗忘率
          </span>
        </div>

        {current.evidence.length ? (
          <ol className="m-0 list-none space-y-0 p-0">
            {current.evidence.map((item, index) => (
              <EvidenceItem
                item={item}
                isLast={index === current.evidence.length - 1}
                key={`${item.type}-${item.occurredAt}-${index}`}
              />
            ))}
          </ol>
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3 text-xs text-slate-600">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
              <ExperimentOutlined />
            </span>
            还没有可展示的学习证据，完成一次定向复习后会从这里开始记录。
          </div>
        )}
      </div>
    </section>
  );
}

function EvidenceItem({
  item,
  isLast,
}: {
  item: WordJourneyEvidence;
  isLast: boolean;
}) {
  const passed =
    item.type === "recall_correct" || item.type === "context_passed";
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!isLast ? (
        <span className="absolute left-[11px] top-6 h-[calc(100%-12px)] w-px bg-slate-200" />
      ) : null}
      <span
        aria-hidden="true"
        className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white text-[10px] ${
          passed
            ? "border-emerald-300 text-emerald-600"
            : "border-rose-200 text-rose-500"
        }`}
      >
        {passed ? <CheckCircleFilled /> : <WarningOutlined />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <strong className="text-xs text-slate-700">{item.title}</strong>
          <time
            className="shrink-0 text-[10px] font-medium text-slate-500"
            dateTime={item.occurredAt}
          >
            {formatEvidenceTime(item.occurredAt)}
          </time>
        </div>
        <p className="m-0 mt-1 text-[11px] leading-5 text-slate-600">
          {item.detail}
        </p>
      </div>
    </li>
  );
}

function formatEvidenceTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function createUnavailableJourney(): WordJourney {
  return {
    wordId: 0,
    stage: "unavailable",
    label: "证据暂不可用",
    reason: "暂时无法读取学习记录，你仍可以继续复习。",
    suggestedTiming: "稍后自动恢复",
    nextAction: {
      type: "review",
      label: "继续定向复习",
      description: "轨迹读取失败不会影响现有复习。",
    },
    evidence: [],
  };
}
