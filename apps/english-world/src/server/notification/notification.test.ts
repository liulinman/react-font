import { describe, expect, it } from "vitest";
import {
  adminAiPreview,
  adminBanUser,
  adminCreateSchedule,
  adminListSchedules,
  adminListUsers,
  adminLogin,
  adminPublishNotification,
  adminRunScheduleNow,
  adminUnbanUser,
  notificationList,
  notificationMarkAllRead,
  notificationMarkRead,
  notificationUnreadCount,
} from "./notification";

describe("notification API builders", () => {
  it("builds user notification endpoints", () => {
    expect(notificationList({ cursor: "18", limit: 10 })).toEqual({
      url: "/notifications",
      method: "GET",
      data: { cursor: "18", limit: 10 },
      __responseType: undefined,
    });
    expect(notificationUnreadCount()).toEqual({
      url: "/notifications/unread-count",
      method: "GET",
      __responseType: undefined,
    });
    expect(notificationMarkRead({ id: 12 })).toEqual({
      url: "/notifications/12/read",
      method: "POST",
      __responseType: undefined,
    });
    expect(notificationMarkAllRead()).toEqual({
      url: "/notifications/read-all",
      method: "POST",
      __responseType: undefined,
    });
  });

  it("builds admin notification and user management endpoints", () => {
    expect(adminLogin({ username: "admin", password: "password" })).toEqual({
      url: "/admin/login",
      method: "POST",
      data: { username: "admin", password: "password" },
      __responseType: undefined,
    });
    expect(adminListUsers({ page: 2, pageSize: 20, search: "li", status: "active" })).toEqual({
      url: "/admin/users",
      method: "GET",
      data: { page: 2, pageSize: 20, search: "li", status: "active" },
      __responseType: undefined,
    });
    expect(adminBanUser({ id: 7, reason: "abuse" })).toEqual({
      url: "/admin/users/7/ban",
      method: "POST",
      data: { reason: "abuse" },
      __responseType: undefined,
    });
    expect(adminUnbanUser({ id: 7 })).toEqual({
      url: "/admin/users/7/unban",
      method: "POST",
      __responseType: undefined,
    });
    expect(
      adminPublishNotification({
        title: "公告",
        body: "正文",
        targetType: "all",
      }),
    ).toEqual({
      url: "/admin/notifications",
      method: "POST",
      data: { title: "公告", body: "正文", targetType: "all" },
      __responseType: undefined,
    });
  });

  it("builds AI preview and schedule endpoints", () => {
    expect(adminAiPreview({ category: "ielts_daily", prompt: "task 2" })).toEqual({
      url: "/admin/notifications/preview-ai",
      method: "POST",
      data: { category: "ielts_daily", prompt: "task 2" },
      __responseType: undefined,
    });
    expect(
      adminCreateSchedule({
        name: "每日雅思",
        category: "ielts_daily",
        cadence: "daily",
        hour: 8,
        minute: 0,
        aiMode: "auto_publish",
      }),
    ).toEqual({
      url: "/admin/notification-schedules",
      method: "POST",
      data: {
        name: "每日雅思",
        category: "ielts_daily",
        cadence: "daily",
        hour: 8,
        minute: 0,
        aiMode: "auto_publish",
      },
      __responseType: undefined,
    });
    expect(adminListSchedules()).toEqual({
      url: "/admin/notification-schedules",
      method: "GET",
      __responseType: undefined,
    });
    expect(adminRunScheduleNow({ id: 4 })).toEqual({
      url: "/admin/notification-schedules/4/run-now",
      method: "POST",
      __responseType: undefined,
    });
  });
});
