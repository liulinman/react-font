import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import request, { getApiBaseUrl } from "@font/api";
import { Button, notification } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import { isNativeApp } from "@/native/runtime";
import {
  notificationList,
  notificationMarkAllRead,
  notificationMarkRead,
  notificationUnreadCount,
} from "@/server/notification/notification";
import type { NotificationItem } from "@/server/notification/notification.type";

type SseEvent =
  | { type: "notification"; data: NotificationItem }
  | { type: "notification-withdrawn"; data: { id: number } }
  | { type: "unread-count"; data: { count: number } }
  | { type: "account-banned"; data: { reason?: string } }
  | { type: "account-deleted"; data: { username: string } }
  | { type: "connected"; data: { userId: number } }
  | { type: "heartbeat"; data: { time: number } };

type NotificationContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  centerOpen: boolean;
  openCenter: () => void;
  closeCenter: () => void;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

const fallbackNotificationContext: NotificationContextValue = {
  items: [],
  unreadCount: 0,
  loading: false,
  centerOpen: false,
  openCenter: () => undefined,
  closeCenter: () => undefined,
  refresh: async () => undefined,
  markRead: async () => undefined,
  markAllRead: async () => undefined,
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  return context ?? fallbackNotificationContext;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const { isAuthenticated, logout, checkAuth } = auth;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [centerOpen, setCenterOpen] = useState(false);
  const retryTimerRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);
  const accountRevocationHandledRef = useRef(false);
  const liveNotificationBurstRef = useRef({ count: 0, lastAt: 0 });

  const refresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [listResult, unreadResult] = await Promise.all([
        request(notificationList({ limit: 20 })),
        request(notificationUnreadCount()),
      ]);
      setItems(listResult.list);
      setUnreadCount(unreadResult.count);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markRead = useCallback(async (id: number) => {
    const result = await request(notificationMarkRead({ id }));
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount(result.unreadCount);
  }, []);

  const markAllRead = useCallback(async () => {
    const result = await request(notificationMarkAllRead());
    const readAt = new Date().toISOString();
    setItems((current) => current.map((item) => ({ ...item, readAt })));
    setUnreadCount(result.unreadCount);
  }, []);

  const closeEventSource = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  const handleAccountRevocation = useCallback(
    async ({
      message,
      description,
    }: {
      message: string;
      description: string;
    }) => {
      if (accountRevocationHandledRef.current) return;
      accountRevocationHandledRef.current = true;
      closeEventSource();
      if (retryTimerRef.current) {
        window.clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      notification.error({ message, description, placement: "topRight" });
      try {
        await logout();
      } catch {
        // Redirect remains mandatory when logout cannot complete.
      } finally {
        window.location.assign("/login");
      }
    },
    [closeEventSource, logout],
  );

  const handleEvent = useCallback(
    async (event: SseEvent) => {
      if (event.type === "notification") {
        const now = Date.now();
        const burst = liveNotificationBurstRef.current;
        burst.count = now - burst.lastAt <= 10000 ? burst.count + 1 : 1;
        burst.lastAt = now;
        setItems((current) => [event.data, ...current]);
        setUnreadCount((count) => count + 1);
        notification.open({
          key: "english-world-live-notification",
          message: event.data.title,
          description:
            burst.count > 1 ? (
              <div className="english-world-live-notification-content">
                <span>{event.data.body}</span>
                <span className="english-world-live-notification-summary">
                  另有 {burst.count - 1} 条通知
                </span>
              </div>
            ) : (
              event.data.body
            ),
          placement: "topRight",
          className: `english-world-live-notification english-world-live-notification-${event.data.priority}`,
          duration:
            event.data.priority === "urgent"
              ? 0
              : event.data.priority === "important"
                ? 8
                : 4.5,
          role: event.data.priority === "urgent" ? "alert" : "status",
          actions: (
            <Button type="link" size="small" onClick={() => setCenterOpen(true)}>
              查看通知
            </Button>
          ),
        });
      } else if (event.type === "unread-count") {
        setUnreadCount(event.data.count);
      } else if (event.type === "notification-withdrawn") {
        setItems((current) =>
          current.filter((item) => item.id !== event.data.id),
        );
        void refresh();
      } else if (event.type === "account-banned") {
        await handleAccountRevocation({
          message: "账号已被封禁",
          description: event.data.reason || "请联系管理员",
        });
      } else if (event.type === "account-deleted") {
        await handleAccountRevocation({
          message: "账号已被删除",
          description: "账号永久删除后无法恢复",
        });
      }
    },
    [handleAccountRevocation, refresh],
  );

  const connect = useCallback(() => {
    if (!isAuthenticated || typeof EventSource === "undefined") return;
    closeEventSource();
    const source = new EventSource(`${getApiBaseUrl()}/notifications/events`, {
      withCredentials: true,
    });
    eventSourceRef.current = source;
    source.onmessage = (messageEvent) => {
      retryCountRef.current = 0;
      try {
        void handleEvent(JSON.parse(messageEvent.data) as SseEvent);
      } catch (error) {
        console.warn("Notification event parse failed", error);
      }
    };
    source.onerror = () => {
      closeEventSource();
      retryCountRef.current += 1;
      const delay = Math.min(30000, 1000 * 2 ** retryCountRef.current);
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = window.setTimeout(connect, delay);
    };
  }, [closeEventSource, handleEvent, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      closeEventSource();
      setItems([]);
      setUnreadCount(0);
      return;
    }
    if (isNativeApp()) {
      // Browser EventSource cannot use URLSession's cookie jar. Native polling
      // uses the same authenticated HTTP transport as the rest of the app.
      let refreshing = false;
      const refreshNative = async () => {
        if (refreshing || document.visibilityState === "hidden") return;
        refreshing = true;
        try {
          await refresh();
        } catch (error) {
          if ((error as { code?: number } | null)?.code === 4001) {
            await checkAuth();
          }
          // Transient network failures retry on the next tick.
        } finally {
          refreshing = false;
        }
      };
      void refreshNative();
      const timer = window.setInterval(() => void refreshNative(), 30000);
      document.addEventListener("visibilitychange", refreshNative);
      return () => {
        window.clearInterval(timer);
        document.removeEventListener("visibilitychange", refreshNative);
      };
    }
    void refresh();
    connect();
    return () => {
      closeEventSource();
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [checkAuth, closeEventSource, connect, isAuthenticated, refresh]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      centerOpen,
      openCenter: () => setCenterOpen(true),
      closeCenter: () => setCenterOpen(false),
      refresh,
      markRead,
      markAllRead,
    }),
    [centerOpen, items, loading, markAllRead, markRead, refresh, unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
