import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";

const markReadMock = vi.hoisted(() => vi.fn());
const markAllReadMock = vi.hoisted(() => vi.fn());
const openCenterMock = vi.hoisted(() => vi.fn());
const closeCenterMock = vi.hoisted(() => vi.fn());

const today = new Date();
today.setHours(8, 0, 0, 0);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);

vi.mock("./NotificationContext", () => ({
  useNotifications: () => ({
    unreadCount: 2,
    loading: false,
    centerOpen: true,
    openCenter: openCenterMock,
    closeCenter: closeCenterMock,
    items: [
      {
        id: 12,
        title: "今日雅思表达",
        body: "mitigate = reduce risk",
        category: "ielts_daily",
        priority: "important",
        sourceType: "manual",
        publishedAt: today.toISOString(),
        readAt: null,
      },
      {
        id: 11,
        title: "维护公告",
        body: "今晚维护",
        category: "announcement",
        priority: "urgent",
        sourceType: "manual",
        publishedAt: yesterday.toISOString(),
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
    expect(screen.getByText("紧急")).toBeInTheDocument();

    await user.click(screen.getByText("今日雅思表达"));
    expect(markReadMock).toHaveBeenCalledWith(12);

    await user.click(screen.getByRole("button", { name: "全部已读" }));
    expect(markAllReadMock).toHaveBeenCalledTimes(1);
  });

  it("groups notifications into today and earlier sections", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: "通知，2 条未读" }));

    expect(screen.getByText("今天")).toBeInTheDocument();
    expect(screen.getByText("更早")).toBeInTheDocument();
  });

  it("only labels urgent priority so routine notices stay quiet", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: "通知，2 条未读" }));

    expect(screen.queryByText("重要")).not.toBeInTheDocument();
    expect(screen.queryByText("普通")).not.toBeInTheDocument();
    expect(screen.getByText("紧急")).toBeInTheDocument();
  });

  it("uses concise relative dates instead of raw locale timestamps", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: "通知，2 条未读" }));

    expect(screen.getByText("今天 08:00")).toBeInTheDocument();
    expect(screen.getByText("昨天 08:00")).toBeInTheDocument();
  });

  it("opens the shared notification center from the bell", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);

    await user.click(screen.getByRole("button", { name: "通知，2 条未读" }));

    expect(openCenterMock).toHaveBeenCalledTimes(1);
  });

  it("exposes each notification as a keyboard-operable button", () => {
    render(<NotificationBell />);

    expect(
      screen.getByRole("button", { name: /今日雅思表达/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /维护公告/ }),
    ).toBeInTheDocument();
  });

  it("expands and collapses a notification with the keyboard", async () => {
    const user = userEvent.setup();
    render(<NotificationBell />);
    const notice = screen.getByRole("button", { name: /今日雅思表达/ });
    expect(notice).toHaveAttribute("aria-expanded", "false");
    notice.focus();
    await user.keyboard("{Enter}");
    expect(notice).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("收起")).toBeVisible();
    await user.keyboard(" ");
    expect(notice).toHaveAttribute("aria-expanded", "false");
  });
});
