import type {
  AdminListResponse,
  AdminLoginParams,
  AdminUserItem,
  AdminUserListParams,
  AiPreviewParams,
  NotificationItem,
  NotificationScheduleItem,
  NotificationScheduleParams,
  PublishNotificationParams,
} from "./notification.type";

export const adminLogin = (data: AdminLoginParams) => ({
  url: "/admin/login",
  method: "POST",
  data,
  __responseType: undefined as unknown as { username: string },
});

export const adminMe = () => ({
  url: "/admin/me",
  method: "GET",
  config: { suppressErrorMessage: true },
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

export const adminDeleteNotification = ({ id }: { id: number }) => ({
  url: `/admin/notifications/${id}`,
  method: "DELETE",
  __responseType: undefined as unknown as { id: number; deleted: boolean },
});

export const adminWithdrawNotification = ({ id }: { id: number }) => ({
  url: `/admin/notifications/${id}/withdraw`,
  method: "POST",
  __responseType: undefined as unknown as { id: number; status: "withdrawn" },
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

export const adminDeleteSchedule = ({ id }: { id: number }) => ({
  url: `/admin/notification-schedules/${id}`,
  method: "DELETE",
  __responseType: undefined as unknown as { id: number; deleted: boolean },
});

export const adminRunScheduleNow = ({ id }: { id: number }) => ({
  url: `/admin/notification-schedules/${id}/run-now`,
  method: "POST",
  __responseType: undefined as unknown as { id: number; status: string },
});
