export type NotificationCategory =
  | "announcement"
  | "ielts_daily"
  | "recent_event"
  | "exam_vocabulary"
  | "custom"
  | "system";

export type NotificationPriority = "normal" | "important" | "urgent";
export type NotificationTargetType = "all" | "selected";

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  sourceType: string;
  publishedAt: string | null;
  readAt?: string | null;
  createTime?: string | null;
}

export interface NotificationListResponse {
  list: NotificationItem[];
  nextCursor: string | null;
}

export interface NotificationUnreadCountResponse {
  count: number;
}
