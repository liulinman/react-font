import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";

const markReadMock = vi.hoisted(() => vi.fn());
const markAllReadMock = vi.hoisted(() => vi.fn());

vi.mock("./NotificationContext", () => ({
  useNotifications: () => ({
    unreadCount: 2,
    loading: false,
    items: [
      {
        id: 12,
        title: "今日雅思表达",
        body: "mitigate = reduce risk",
        category: "ielts_daily",
        priority: "important",
        sourceType: "manual",
        publishedAt: "2026-07-29T08:00:00.000Z",
        readAt: null,
      },
      {
        id: 11,
        title: "维护公告",
        body: "今晚维护",
        category: "announcement",
        priority: "normal",
        sourceType: "manual",
        publishedAt: "2026-07-28T08:00:00.000Z",
        readAt: "2026-07-28T09:00:00.000Z",
      },
    ],
    markRead: markReadMock,
    markAllRead: markAllReadMock,
  }),
}));

describe("NotificationBell", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("opens an inbox drawer and marks notifications read", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: "通知，2 条未读" }));

    expect(screen.getByRole("dialog", { name: "通知中心" })).toBeInTheDocument();
    expect(screen.getByText("今日雅思表达")).toBeInTheDocument();
    expect(screen.getByText("mitigate = reduce risk")).toBeInTheDocument();
    expect(screen.getByText("重要")).toBeInTheDocument();

    await user.click(screen.getByText("今日雅思表达"));
    expect(markReadMock).toHaveBeenCalledWith(12);

    await user.click(screen.getByRole("button", { name: "全部已读" }));
    expect(markAllReadMock).toHaveBeenCalledTimes(1);
  });
});
