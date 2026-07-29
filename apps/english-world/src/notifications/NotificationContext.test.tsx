import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationProvider, useNotifications } from "./NotificationContext";

const requestMock = vi.hoisted(() => vi.fn());
const notificationOpenMock = vi.hoisted(() => vi.fn());
const notificationErrorMock = vi.hoisted(() => vi.fn());
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

function Probe() {
  const notifications = useNotifications();
  return (
    <div>
      <span data-testid="count">{notifications.unreadCount}</span>
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
    MockEventSource.instances = [];
    vi.stubGlobal("EventSource", MockEventSource);
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { assign: locationAssignMock },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
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
        message: "今日雅思表达",
        description: "mitigate = reduce risk",
        placement: "topRight",
      }),
    );
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

  it("logs out and redirects when the account is permanently deleted", async () => {
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

    await waitFor(() => expect(notificationErrorMock).toHaveBeenCalled());
    expect(notificationErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "账号已被删除",
        description: "账号永久删除后无法恢复",
        placement: "topRight",
      }),
    );
    expect(logoutMock).toHaveBeenCalled();
    expect(locationAssignMock).toHaveBeenCalledWith("/login");
  });
});
