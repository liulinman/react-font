import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApp } from "../AdminApp";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("@font/api", () => ({ default: requestMock }));

describe("AdminApp", () => {
  let userStatus: "active" | "banned";
  let failedActionUrl: string | undefined;

  beforeEach(() => {
    userStatus = "active";
    failedActionUrl = undefined;
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
          list: [{ id: 7, username: "alice", status: userStatus }],
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
        if (failedActionUrl === request.url) return Promise.reject(new Error("request failed"));
        userStatus = "banned";
        return Promise.resolve({ id: 7, status: "banned" });
      }
      if (request.url === "/admin/users/7/unban") {
        if (failedActionUrl === request.url) return Promise.reject(new Error("request failed"));
        userStatus = "active";
        return Promise.resolve({ id: 7, status: "active" });
      }
      if (request.url === "/admin/users/7") {
        if (failedActionUrl === request.url) return Promise.reject(new Error("request failed"));
        return Promise.resolve({ id: 7, username: "alice", deleted: true });
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

  const login = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.type(await screen.findByLabelText("账号"), "admin");
    await user.type(screen.getByLabelText("密码"), "password");
    await user.click(screen.getByRole("button", { name: "登录后台" }));
    await screen.findByRole("tab", { name: /用户管理/ });
    await screen.findByText("alice");
  };

  const completeSecondConfirmation = async (
    user: ReturnType<typeof userEvent.setup>,
    finalButtonName: string,
  ) => {
    await user.click(screen.getByRole("button", { name: "继续确认" }));
    const finalButton = screen.getByRole("button", { name: finalButtonName });
    expect(finalButton).toBeDisabled();
    await user.type(screen.getByLabelText("输入用户名以确认"), "alic");
    expect(finalButton).toBeDisabled();
    await user.type(screen.getByLabelText("输入用户名以确认"), "e");
    expect(finalButton).toBeEnabled();
    await user.click(finalButton);
  };

  it("logs into the standalone admin console and exposes notification controls", async () => {
    const user = userEvent.setup();
    render(<AdminApp />);

    expect(await screen.findByRole("heading", { name: "后台登录" })).toBeInTheDocument();

    await login(user);

    expect(screen.getByRole("tab", { name: /公告发布/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /定时任务/ })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /定时任务/ }));
    expect(screen.getByText("雅思每日文案")).toBeInTheDocument();
    expect(screen.getByText("近期事件英语表达")).toBeInTheDocument();
    expect(screen.getByText("近考高频词汇")).toBeInTheDocument();
    expect(screen.getByText("手写自定义公告")).toBeInTheDocument();
    expect(screen.getByText("生成草稿待发布")).toBeInTheDocument();
    expect(screen.getByText("自动生成并发布")).toBeInTheDocument();
  });

  it("waits for an exact second confirmation before banning a user", async () => {
    const user = userEvent.setup();
    render(<AdminApp />);
    await login(user);

    await user.click(screen.getByRole("button", { name: "封禁 alice" }));
    expect(requestMock.mock.calls.some(([request]) => request.url === "/admin/users/7/ban")).toBe(
      false,
    );

    await completeSecondConfirmation(user, "确认封禁");

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/admin/users/7/ban",
          method: "POST",
          data: { reason: "管理员封禁", confirmUsername: "alice" },
        }),
      ),
    );
  });

  it("sends the exact username when unbanning a user", async () => {
    userStatus = "banned";
    const user = userEvent.setup();
    render(<AdminApp />);
    await login(user);

    await user.click(screen.getByRole("button", { name: "解封 alice" }));
    await completeSecondConfirmation(user, "确认解封");

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/admin/users/7/unban",
          method: "POST",
          data: { confirmUsername: "alice" },
        }),
      ),
    );
  });

  it("warns about deleted user records and sends the exact username when deleting", async () => {
    const user = userEvent.setup();
    render(<AdminApp />);
    await login(user);

    await user.click(screen.getByRole("button", { name: "永久删除 alice" }));
    expect(screen.getByText(/单词、背词、练习和通知记录/)).toBeInTheDocument();
    expect(requestMock.mock.calls.some(([request]) => request.url === "/admin/users/7")).toBe(false);

    await completeSecondConfirmation(user, "确认永久删除");

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/admin/users/7",
          method: "DELETE",
          data: { confirmUsername: "alice" },
        }),
      ),
    );
  });

  it("does not send a user action when the first deletion confirmation is cancelled", async () => {
    const user = userEvent.setup();
    render(<AdminApp />);
    await login(user);

    await user.click(screen.getByRole("button", { name: "永久删除 alice" }));
    await user.click(screen.getByRole("button", { name: /取\s*消/ }));

    expect(requestMock.mock.calls.some(([request]) => request.url.startsWith("/admin/users/7"))).toBe(
      false,
    );
  });

  it("keeps the confirmation modal open when a user action request fails", async () => {
    failedActionUrl = "/admin/users/7/ban";
    const user = userEvent.setup();
    render(<AdminApp />);
    await login(user);

    await user.click(screen.getByRole("button", { name: "封禁 alice" }));
    await completeSecondConfirmation(user, "确认封禁");

    await waitFor(() =>
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: "/admin/users/7/ban" }),
      ),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("withdraws a published announcement from history", async () => {
    const user = userEvent.setup();
    render(<AdminApp />);

    await login(user);

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
