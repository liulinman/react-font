import { describe, expect, it } from "vitest";
import {
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

});
