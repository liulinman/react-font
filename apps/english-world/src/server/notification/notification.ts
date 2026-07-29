import type {
  AdminListResponse,
  AdminLoginParams,
  AdminUserItem,
  AdminUserListParams,
  AiPreviewParams,
  NotificationItem,
  NotificationListResponse,
  NotificationScheduleParams,
  NotificationScheduleItem,
  NotificationUnreadCountResponse,
  PublishNotificationParams,
} from "./notification.type";

export const notificationList = (data?: { cursor?: string; limit?: number }) => ({
  url: "/notifications",
  method: "GET",
  data,
  __responseType: undefined as unknown as NotificationListResponse,
});

export const notificationUnreadCount = () => ({
  url: "/notifications/unread-count",
  method: "GET",
  __responseType: undefined as unknown as NotificationUnreadCountResponse,
});

export const notificationMarkRead = ({ id }: { id: number }) => ({
  url: `/notifications/${id}/read`,
  method: "POST",
  __responseType: undefined as unknown as { unreadCount: number },
});

export const notificationMarkAllRead = () => ({
  url: "/notifications/read-all",
  method: "POST",
  __responseType: undefined as unknown as { unreadCount: number },
});

export const adminLogin = (data: AdminLoginParams) => ({
  url: "/admin/login",
  method: "POST",
  data,
  __responseType: undefined as unknown as { username: string },
});

export const adminMe = () => ({
  url: "/admin/me",
  method: "GET",
  __responseType: undefined as unknown as { username: string },
});

export const adminLogout = () => ({
  url: "/admin/logout",
  method: "POST",
  __responseType: undefined as unknown as null,
});

export const adminListUsers = (data: AdminUserListParams) => ({
  url: "/admin/users",
  method: "GET",
  data,
  __responseType: undefined as unknown as AdminListResponse<AdminUserItem>,
});

export const adminBanUser = ({
  id,
  reason,
}: {
  id: number;
  reason?: string;
}) => ({
  url: `/admin/users/${id}/ban`,
  method: "POST",
  data: { reason },
  __responseType: undefined as unknown as {
    id: number;
    status: "banned";
    banReason: string;
  },
});

export const adminUnbanUser = ({ id }: { id: number }) => ({
  url: `/admin/users/${id}/unban`,
  method: "POST",
  __responseType: undefined as unknown as { id: number; status: "active" },
});

export const adminPublishNotification = (data: PublishNotificationParams) => ({
  url: "/admin/notifications",
  method: "POST",
  data,
  __responseType: undefined as unknown as NotificationItem,
});

export const adminAiPreview = (data: AiPreviewParams) => ({
  url: "/admin/notifications/preview-ai",
  method: "POST",
  data,
  __responseType: undefined as unknown as PublishNotificationParams,
});

export const adminListNotifications = (data?: {
  page?: number;
  pageSize?: number;
}) => ({
  url: "/admin/notifications",
  method: "GET",
  data,
  __responseType: undefined as unknown as AdminListResponse<NotificationItem>,
});

export const adminCreateSchedule = (data: NotificationScheduleParams) => ({
  url: "/admin/notification-schedules",
  method: "POST",
  data,
  __responseType: undefined as unknown as NotificationScheduleItem,
});

export const adminListSchedules = () => ({
  url: "/admin/notification-schedules",
  method: "GET",
  __responseType: undefined as unknown as {
    list: NotificationScheduleItem[];
    total: number;
  },
});

export const adminRunScheduleNow = ({ id }: { id: number }) => ({
  url: `/admin/notification-schedules/${id}/run-now`,
  method: "POST",
  __responseType: undefined as unknown as { id: number; status: string },
});
