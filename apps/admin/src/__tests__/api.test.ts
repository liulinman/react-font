import { describe, expect, it } from "vitest";
import {
  adminAiPreview,
  adminBanUser,
  adminCreateSchedule,
  adminDeleteUser,
  adminDeleteNotification,
  adminDeleteSchedule,
  adminListSchedules,
  adminListUsers,
  adminLogin,
  adminPublishNotification,
  adminRunScheduleNow,
  adminUnbanUser,
  adminWithdrawNotification,
} from "../api/notification";

describe("admin notification API builders", () => {
  it("builds admin auth and user management endpoints", () => {
    expect(adminLogin({ username: "admin", password: "password" })).toEqual({
      url: "/admin/login",
      method: "POST",
      data: { username: "admin", password: "password" },
      __responseType: undefined,
    });
    expect(
      adminListUsers({ page: 2, pageSize: 20, search: "li", status: "active" }),
    ).toEqual({
      url: "/admin/users",
      method: "GET",
      data: { page: 2, pageSize: 20, search: "li", status: "active" },
      __responseType: undefined,
    });
    expect(adminBanUser({ id: 7, reason: "abuse", confirmUsername: "alice" })).toEqual({
      url: "/admin/users/7/ban",
      method: "POST",
      data: { reason: "abuse", confirmUsername: "alice" },
      __responseType: undefined,
    });
    expect(adminUnbanUser({ id: 7, confirmUsername: "alice" })).toEqual({
      url: "/admin/users/7/unban",
      method: "POST",
      data: { confirmUsername: "alice" },
      __responseType: undefined,
    });
    expect(adminDeleteUser({ id: 7, confirmUsername: "alice" })).toEqual({
      url: "/admin/users/7",
      method: "DELETE",
      data: { confirmUsername: "alice" },
      __responseType: undefined,
    });
  });

  it("builds notification and schedule endpoints", () => {
    expect(adminPublishNotification({ title: "公告", body: "正文" })).toEqual({
      url: "/admin/notifications",
      method: "POST",
      data: { title: "公告", body: "正文" },
      __responseType: undefined,
    });
    expect(adminAiPreview({ category: "ielts_daily", prompt: "task 2" })).toEqual({
      url: "/admin/notifications/preview-ai",
      method: "POST",
      data: { category: "ielts_daily", prompt: "task 2" },
      __responseType: undefined,
    });
    expect(adminDeleteNotification({ id: 4 })).toEqual({
      url: "/admin/notifications/4",
      method: "DELETE",
      __responseType: undefined,
    });
    expect(adminWithdrawNotification({ id: 4 })).toEqual({
      url: "/admin/notifications/4/withdraw",
      method: "POST",
      __responseType: undefined,
    });
    expect(adminCreateSchedule({
      name: "每日雅思",
      category: "ielts_daily",
      cadence: "daily",
      hour: 8,
      minute: 0,
      aiMode: "auto_publish",
    })).toEqual({
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
    expect(adminDeleteSchedule({ id: 4 })).toEqual({
      url: "/admin/notification-schedules/4",
      method: "DELETE",
      __responseType: undefined,
    });
  });
});
