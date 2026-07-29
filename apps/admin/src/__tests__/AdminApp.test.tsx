import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApp } from "../AdminApp";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@font/api", () => ({ default: requestMock }));

describe("AdminApp", () => {
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
    requestMock.mockImplementation((request: { url: string }) => {
      if (request.url === "/admin/me") return Promise.reject(new Error("401"));
      if (request.url === "/admin/login") return Promise.resolve({ username: "admin" });
      if (request.url === "/admin/users") {
        return Promise.resolve({
          page: 1,
          pageSize: 50,
          total: 1,
          list: [{ id: 7, username: "alice", status: "active" }],
        });
      }
      if (request.url === "/admin/notification-schedules") {
        return Promise.resolve({ list: [], total: 0 });
      }
      if (request.url === "/admin/notifications") {
        return Promise.resolve({
          page: 1,
          pageSize: 50,
          total: 2,
          list: [
            {
              id: 12,
              title: "可撤回公告",
              body: "正文",
              category: "announcement",
              priority: "normal",
              sourceType: "manual",
              status: "published",
              publishedAt: "2026-07-29T08:00:00.000Z",
            },
            {
              id: 13,
              title: "已撤回公告",
              body: "正文",
              category: "announcement",
              priority: "normal",
              sourceType: "manual",
              status: "withdrawn",
              publishedAt: "2026-07-29T07:00:00.000Z",
            },
          ],
        });
      }
      if (request.url === "/admin/users/7/ban") {
        return Promise.resolve({ id: 7, status: "banned" });
      }
      if (request.url === "/admin/notifications/12/withdraw") {
        return Promise.resolve({ id: 12, status: "withdrawn" });
      }
      return Promise.resolve({});
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("logs into the standalone admin console and exposes notification controls", async () => {
    const user = userEvent.setup();
    render(<AdminApp />);

    expect(await screen.findByRole("heading", { name: "后台登录" })).toBeInTheDocument();

    await user.type(screen.getByLabelText("账号"), "admin");
    await user.type(screen.getByLabelText("密码"), "password");
    await user.click(screen.getByRole("button", { name: "登录后台" }));

    expect(await screen.findByRole("tab", { name: /用户管理/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /公告发布/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /定时任务/ })).toBeInTheDocument();
    expect(await screen.findByText("alice")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /封\s*禁/ }));
    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/admin/users/7/ban",
          data: { reason: "管理员封禁" },
        }),
      ),
    );

    await user.click(screen.getByRole("tab", { name: /定时任务/ }));
    expect(screen.getByText("雅思每日文案")).toBeInTheDocument();
    expect(screen.getByText("近期事件英语表达")).toBeInTheDocument();
    expect(screen.getByText("近考高频词汇")).toBeInTheDocument();
    expect(screen.getByText("手写自定义公告")).toBeInTheDocument();
    expect(screen.getByText("生成草稿待发布")).toBeInTheDocument();
    expect(screen.getByText("自动生成并发布")).toBeInTheDocument();
  });

  it("withdraws a published announcement from history", async () => {
    const user = userEvent.setup();
    render(<AdminApp />);

    await user.type(await screen.findByLabelText("账号"), "admin");
    await user.type(screen.getByLabelText("密码"), "password");
    await user.click(screen.getByRole("button", { name: "登录后台" }));

    await user.click(await screen.findByRole("tab", { name: /历史记录/ }));
    expect(await screen.findByText("可撤回公告")).toBeInTheDocument();
    expect(screen.getByText("已撤回公告")).toBeInTheDocument();
    expect(screen.getByText("已撤回")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "撤回公告" }));

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/admin/notifications/12/withdraw",
          method: "POST",
        }),
      ),
    );
  });
});
