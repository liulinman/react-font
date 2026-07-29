import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationProvider, useNotifications } from "./NotificationContext";

const requestMock = vi.hoisted(() => vi.fn());
const notificationOpenMock = vi.hoisted(() => vi.fn());
const logoutMock = vi.hoisted(() => vi.fn());

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
      error: vi.fn(),
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
});
