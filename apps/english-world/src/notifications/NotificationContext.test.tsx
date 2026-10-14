import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationProvider, useNotifications } from "./NotificationContext";

const native = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/native/runtime", () => ({ isNativeApp: () => native.enabled }));

const requestMock = vi.hoisted(() => vi.fn());
const notificationOpenMock = vi.hoisted(() => vi.fn());
const notificationErrorMock = vi.hoisted(() => vi.fn());
const checkAuthMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());
const locationAssignMock = vi.hoisted(() => vi.fn());

vi.mock("@font/api", () => ({
  default: requestMock,
  getApiBaseUrl: () => "/api",
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    logout: logoutMock,
    checkAuth: checkAuthMock,
  }),
}));

vi.mock("antd", async () => {
  const actual = await vi.importActual<typeof import("antd")>("antd");
  return {
    ...actual,
    notification: {
      open: notificationOpenMock,
      error: notificationErrorMock,
    },
  };
});

class MockEventSource {
  static instances: MockEventSource[] = [];
  onmessage: ((event: MessageEvent<string>) => void) | null = null;
  onerror: (() => void) | null = null;
  close = vi.fn();

  constructor(
    public url: string,
    public init?: EventSourceInit,
  ) {
    MockEventSource.instances.push(this);
  }

  emit(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent<string>);
  }
}

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function Probe() {
  const notifications = useNotifications();
  return (
    <div>
      <span data-testid="count">{notifications.unreadCount}</span>
      <span data-testid="center-state">
        {notifications.centerOpen ? "open" : "closed"}
      </span>
      {notifications.items.map((item) => (
        <span key={item.id}>{item.title}</span>
      ))}
    </div>
  );
}

describe("NotificationProvider", () => {
  beforeEach(() => {
    requestMock.mockImplementation((request: { url: string }) => {
      if (request.url === "/notifications") {
        return Promise.resolve({ list: [], nextCursor: null });
      }
      if (request.url === "/notifications/unread-count") {
        return Promise.resolve({ count: 0 });
      }
      return Promise.resolve({});
    });
    logoutMock.mockResolvedValue(undefined);
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: locationAssignMock },
    });
  });

  afterEach(() => {
    cleanup();
    native.enabled = false;
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("polls native notifications without opening a cross-site EventSource and stops after unmount", async () => {
    native.enabled = true;
    vi.useFakeTimers();
    const view = render(<NotificationProvider><Probe /></NotificationProvider>);
    await act(async () => { await Promise.resolve(); });
    expect(MockEventSource.instances).toHaveLength(0);
    requestMock.mockClear();
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(requestMock).toHaveBeenCalledWith(expect.objectContaining({ url: "/notifications/unread-count" }));
    view.unmount();
    requestMock.mockClear();
    await vi.advanceTimersByTimeAsync(30000);
    expect(requestMock).not.toHaveBeenCalled();
  });

  it("rechecks native authentication when the session expires, but preserves auth on network errors", async () => {
    native.enabled = true;
    requestMock.mockRejectedValue({ code: 4001 });
    const view = render(<NotificationProvider><Probe /></NotificationProvider>);
    await waitFor(() => expect(checkAuthMock).toHaveBeenCalledOnce());
    view.unmount();
    checkAuthMock.mockClear();
    requestMock.mockRejectedValue({ code: 'CORS_ERROR' });
    render(<NotificationProvider><Probe /></NotificationProvider>);
    await act(async () => { await Promise.resolve(); });
    expect(checkAuthMock).not.toHaveBeenCalled();
  });

  it("connects to SSE and shows a top-right toast for incoming notifications", async () => {
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    expect(MockEventSource.instances[0].url).toBe("/api/notifications/events");
    expect(MockEventSource.instances[0].init).toEqual({
      withCredentials: true,
    });

    MockEventSource.instances[0].emit({
      type: "notification",
      data: {
        id: 12,
        title: "今日雅思表达",
        body: "mitigate = reduce risk",
        category: "ielts_daily",
        priority: "normal",
        sourceType: "manual",
        publishedAt: "2026-07-29T08:00:00.000Z",
      },
    });

    expect(await screen.findByText("今日雅思表达")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(notificationOpenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        key: "english-world-live-notification",
        message: "今日雅思表达",
        description: "mitigate = reduce risk",
        placement: "topRight",
        duration: 4.5,
        role: "status",
      }),
    );
  });

  it("keeps urgent live notifications visible with alert semantics", async () => {
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    MockEventSource.instances[0].emit({
      type: "notification",
      data: {
        id: 13,
        title: "系统维护",
        body: "请立即保存学习进度",
        category: "system",
        priority: "urgent",
        sourceType: "manual",
        publishedAt: "2026-07-29T08:00:00.000Z",
      },
    });

    expect(await screen.findByText("系统维护")).toBeInTheDocument();
    expect(notificationOpenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 0,
        role: "alert",
      }),
    );
  });

  it("gives important live notifications more reading time without making them persistent", async () => {
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    MockEventSource.instances[0].emit({
      type: "notification",
      data: {
        id: 14,
        title: "学习计划调整",
        body: "今日复习任务已更新",
        category: "announcement",
        priority: "important",
        sourceType: "manual",
        publishedAt: "2026-07-29T08:00:00.000Z",
      },
    });

    expect(await screen.findByText("学习计划调整")).toBeInTheDocument();
    expect(notificationOpenMock).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: 8,
        role: "status",
      }),
    );
  });

  it("opens the notification center from the live notification action", async () => {
    const user = userEvent.setup();
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    MockEventSource.instances[0].emit({
      type: "notification",
      data: {
        id: 15,
        title: "新的复习任务",
        body: "有 12 个单词进入今日复习",
        category: "exam_vocabulary",
        priority: "normal",
        sourceType: "manual",
        publishedAt: "2026-07-29T08:00:00.000Z",
      },
    });

    await screen.findByText("新的复习任务");
    const toastOptions = notificationOpenMock.mock.calls[0][0];
    render(toastOptions.actions);
    await user.click(screen.getByRole("button", { name: "查看通知" }));

    expect(screen.getByTestId("center-state")).toHaveTextContent("open");
  });

  it("summarizes additional notifications instead of stacking live toasts", async () => {
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    const source = MockEventSource.instances[0];
    source.emit({
      type: "notification",
      data: {
        id: 16,
        title: "第一条消息",
        body: "第一条正文",
        category: "custom",
        priority: "normal",
        sourceType: "manual",
        publishedAt: "2026-07-29T08:00:00.000Z",
      },
    });
    source.emit({
      type: "notification",
      data: {
        id: 17,
        title: "第二条消息",
        body: "第二条正文",
        category: "custom",
        priority: "normal",
        sourceType: "manual",
        publishedAt: "2026-07-29T08:01:00.000Z",
      },
    });

    await screen.findByText("第二条消息");
    const latestToastOptions = notificationOpenMock.mock.calls[1][0];
    render(latestToastOptions.description);

    expect(screen.getByText("另有 1 条通知")).toBeInTheDocument();
  });

  it("removes withdrawn notifications from the visible list", async () => {
    let withdrawn = false;
    requestMock.mockImplementation((request: { url: string }) => {
      if (request.url === "/notifications") {
        return Promise.resolve({
          list: withdrawn
            ? []
            : [
                {
                  id: 12,
                  title: "临时公告",
                  body: "正文",
                  category: "announcement",
                  priority: "normal",
                  sourceType: "manual",
                  publishedAt: "2026-07-29T08:00:00.000Z",
                  readAt: null,
                },
              ],
          nextCursor: null,
        });
      }
      if (request.url === "/notifications/unread-count") {
        return Promise.resolve({ count: withdrawn ? 0 : 1 });
      }
      return Promise.resolve({});
    });

    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    expect(await screen.findByText("临时公告")).toBeInTheDocument();
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    withdrawn = true;
    MockEventSource.instances[0].emit({
      type: "notification-withdrawn",
      data: { id: 12 },
    });

    await waitFor(() =>
      expect(screen.queryByText("临时公告")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("closes the stream and handles repeated account revocation events once", async () => {
    const logoutDeferred = createDeferred<void>();
    logoutMock.mockReturnValue(logoutDeferred.promise);
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));

    MockEventSource.instances[0].emit({
      type: "account-deleted",
      data: { username: "alice" },
    });

    expect(MockEventSource.instances[0].close).toHaveBeenCalledTimes(1);
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(
      MockEventSource.instances[0].close.mock.invocationCallOrder[0],
    ).toBeLessThan(logoutMock.mock.invocationCallOrder[0]);
    await waitFor(() => expect(notificationErrorMock).toHaveBeenCalled());
    expect(notificationErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "账号已被删除",
        description: "账号永久删除后无法恢复",
        placement: "topRight",
      }),
    );
    expect(locationAssignMock).not.toHaveBeenCalled();

    MockEventSource.instances[0].emit({
      type: "account-deleted",
      data: { username: "alice" },
    });
    MockEventSource.instances[0].emit({
      type: "account-banned",
      data: { reason: "重复终态事件" },
    });

    expect(notificationErrorMock).toHaveBeenCalledTimes(1);
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(MockEventSource.instances[0].close).toHaveBeenCalledTimes(1);
    expect(locationAssignMock).not.toHaveBeenCalled();

    logoutDeferred.resolve();
    await waitFor(() =>
      expect(locationAssignMock).toHaveBeenCalledTimes(1),
    );
    expect(locationAssignMock).toHaveBeenCalledWith("/login");
  });

  it("keeps the banned account revocation flow and redirects after logout", async () => {
    const logoutDeferred = createDeferred<void>();
    logoutMock.mockReturnValue(logoutDeferred.promise);
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    MockEventSource.instances[0].emit({
      type: "account-banned",
      data: { reason: "违规操作" },
    });

    expect(MockEventSource.instances[0].close).toHaveBeenCalledTimes(1);
    expect(notificationErrorMock).toHaveBeenCalledWith({
      message: "账号已被封禁",
      description: "违规操作",
      placement: "topRight",
    });
    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(locationAssignMock).not.toHaveBeenCalled();

    logoutDeferred.resolve();
    await waitFor(() =>
      expect(locationAssignMock).toHaveBeenCalledTimes(1),
    );
    expect(locationAssignMock).toHaveBeenCalledWith("/login");
  });

  it("redirects even when logout rejects", async () => {
    const logoutDeferred = createDeferred<void>();
    logoutMock.mockReturnValue(logoutDeferred.promise);
    render(
      <NotificationProvider>
        <Probe />
      </NotificationProvider>,
    );

    await waitFor(() => expect(MockEventSource.instances).toHaveLength(1));
    MockEventSource.instances[0].emit({
      type: "account-deleted",
      data: { username: "alice" },
    });

    expect(locationAssignMock).not.toHaveBeenCalled();
    logoutDeferred.reject(new Error("logout failed"));

    await waitFor(() =>
      expect(locationAssignMock).toHaveBeenCalledTimes(1),
    );
    expect(locationAssignMock).toHaveBeenCalledWith("/login");
  });
});
