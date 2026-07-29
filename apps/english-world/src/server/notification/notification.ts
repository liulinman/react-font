import type {
  NotificationListResponse,
  NotificationUnreadCountResponse,
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
