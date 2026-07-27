export type DailyStat = {
  date: string;
  count: number;
};

export type StatsGranularity = "day" | "week" | "month";

export type AggregatedStat = {
  key: string;
  label: string;
  rangeLabel: string;
  count: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function dateToUtcEpoch(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function epochToDate(epoch: number) {
  return new Date(epoch).toISOString().slice(0, 10);
}

export function getDefaultStatsGranularity(items: { length: number }) {
  if (items.length <= 60) return "day" as const;
  if (items.length <= 180) return "week" as const;
  return "month" as const;
}

export function aggregateDailyStats(
  dailyStats: DailyStat[],
  granularity: StatsGranularity,
): AggregatedStat[] {
  if (granularity === "day") {
    return dailyStats.map((item) => ({
      key: item.date,
      label: item.date.slice(5),
      rangeLabel: item.date,
      count: item.count,
    }));
  }

  const buckets = new Map<string, AggregatedStat>();

  dailyStats.forEach((item) => {
    const itemEpoch = dateToUtcEpoch(item.date);
    let bucket: AggregatedStat;

    if (granularity === "month") {
      const key = item.date.slice(0, 7);
      const month = Number(key.slice(5, 7));
      bucket = {
        key,
        label: key,
        rangeLabel: `${key.slice(0, 4)} 年 ${month} 月`,
        count: 0,
      };
    } else {
      const dayOfWeek = new Date(itemEpoch).getUTCDay();
      const daysSinceMonday = (dayOfWeek + 6) % 7;
      const weekStartEpoch = itemEpoch - daysSinceMonday * DAY_MS;
      const key = epochToDate(weekStartEpoch);
      bucket = {
        key,
        label: key.slice(5),
        rangeLabel: `${key} 至 ${epochToDate(weekStartEpoch + 6 * DAY_MS)}`,
        count: 0,
      };
    }

    const existing = buckets.get(bucket.key);
    if (existing) {
      existing.count += item.count;
    } else {
      bucket.count = item.count;
      buckets.set(bucket.key, bucket);
    }
  });

  return [...buckets.values()].sort((left, right) =>
    left.key.localeCompare(right.key),
  );
}
