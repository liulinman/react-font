export type NotificationCategory =
  | "announcement"
  | "ielts_daily"
  | "recent_event"
  | "exam_vocabulary"
  | "custom"
  | "system";

export type NotificationPriority = "normal" | "important" | "urgent";
export type NotificationTargetType = "all" | "selected";
export type NotificationStatus = "draft" | "published" | "withdrawn";

export interface NotificationItem {
  id: number;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  sourceType: string;
  status?: NotificationStatus;
  publishedAt: string | null;
  readAt?: string | null;
  createTime?: string | null;
}

export interface AdminLoginParams {
  username: string;
  password: string;
}

export interface AdminUserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: "active" | "banned";
}

export interface AdminUserItem {
  id: number;
  username: string;
  avatar?: string | null;
  status: "active" | "banned";
  bannedAt?: string | null;
  banReason?: string | null;
  createTime?: string;
  updateTime?: string;
}

export interface AdminListResponse<T> {
  page: number;
  pageSize: number;
  total: number;
  list: T[];
}

export interface PublishNotificationParams {
  title: string;
  body: string;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  targetType?: NotificationTargetType;
  targetUserIds?: number[];
  sourceType?: string;
  metadata?: Record<string, unknown>;
}

export interface AiPreviewParams {
  category: NotificationCategory;
  prompt?: string;
}

export interface NotificationScheduleParams {
  name: string;
  enabled?: boolean;
  category: NotificationCategory;
  cadence: "once" | "daily" | "weekly";
  runAt?: string;
  hour?: number;
  minute?: number;
  weekday?: number;
  timezoneOffsetMinutes?: number;
  targetType?: NotificationTargetType;
  targetUserIds?: number[];
  templatePrompt?: string;
  aiMode?: "draft" | "auto_publish" | "off";
}

export interface NotificationScheduleItem extends NotificationScheduleParams {
  id: number;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createTime?: string | null;
  updateTime?: string | null;
}
