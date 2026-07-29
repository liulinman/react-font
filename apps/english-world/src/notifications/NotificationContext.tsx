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
import { notification } from "antd";
import { useAuth } from "@/contexts/AuthContext";
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
  const { isAuthenticated, logout } = auth;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const retryTimerRef = useRef<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryCountRef = useRef(0);

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

  const handleEvent = useCallback(
    async (event: SseEvent) => {
      if (event.type === "notification") {
        setItems((current) => [event.data, ...current]);
        setUnreadCount((count) => count + 1);
        notification.open({
          message: event.data.title,
          description: event.data.body,
          placement: "topRight",
        });
      } else if (event.type === "unread-count") {
        setUnreadCount(event.data.count);
      } else if (event.type === "notification-withdrawn") {
        setItems((current) =>
          current.filter((item) => item.id !== event.data.id),
        );
        void refresh();
      } else if (event.type === "account-banned") {
        notification.error({
          message: "账号已被封禁",
          description: event.data.reason || "请联系管理员",
          placement: "topRight",
        });
        await logout();
        window.location.assign("/login");
      } else if (event.type === "account-deleted") {
        notification.error({
          message: "账号已被删除",
          description: "账号永久删除后无法恢复",
          placement: "topRight",
        });
        await logout();
        window.location.assign("/login");
      }
    },
    [logout, refresh],
  );

  const closeEventSource = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

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
    void refresh();
    connect();
    return () => {
      closeEventSource();
      if (retryTimerRef.current) window.clearTimeout(retryTimerRef.current);
    };
  }, [closeEventSource, connect, isAuthenticated, refresh]);

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      refresh,
      markRead,
      markAllRead,
    }),
    [items, loading, markAllRead, markRead, refresh, unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}
