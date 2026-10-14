import type { NotificationCategory, NotificationScheduleItem } from "./api/notification.type";

export const categoryLabels: Record<NotificationCategory, string> = {
  announcement: "普通公告", ielts_daily: "雅思每日文案", recent_event: "近期事件英语表达",
  exam_vocabulary: "近考高频词汇", custom: "手写自定义公告", system: "系统通知",
};
export const categoryOptions = Object.entries(categoryLabels)
  .filter(([value]) => value !== "system")
  .map(([value, label]) => ({ value, label }));
export const priorityLabels = { normal: "普通", important: "重要", urgent: "紧急" };
export const weekdayOptions = [1, 2, 3, 4, 5, 6, 0].map(value => ({
  value, label: ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][value],
}));
export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date) : "—";
}
export function formatSchedule(row: NotificationScheduleItem) {
  if (row.cadence === "once") return `一次 · ${formatDate(row.runAt)}`;
  const day = row.cadence === "weekly" ? weekdayOptions.find(option => option.value === (row.weekday ?? 1))?.label : "每天";
  const offset = row.timezoneOffsetMinutes ?? 480;
  const timezone = `UTC${offset >= 0 ? "+" : "−"}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
  return `${day} ${String(row.hour ?? 8).padStart(2, "0")}:${String(row.minute ?? 0).padStart(2, "0")} · ${timezone}`;
}
