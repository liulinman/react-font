import { practiceActionPath } from '@/readingPractice/api';
import { BellOutlined, CheckOutlined, DownOutlined } from "@ant-design/icons";
import { Badge, Button, Drawer, Empty, List, Tag, Typography, message } from "antd";
import { useMemo, useState } from "react";
import { useNotifications } from "./NotificationContext";
import type {
  NotificationCategory,
  NotificationItem,
  NotificationPriority,
} from "@/server/notification/notification.type";

const categoryLabels: Record<NotificationCategory, string> = {
  reading_practice: "阅读练习",
  announcement: "公告",
  ielts_daily: "雅思",
  recent_event: "事件表达",
  exam_vocabulary: "高频词",
  custom: "自定义",
  system: "系统",
};

const priorityLabels: Record<NotificationPriority, string> = {
  normal: "普通",
  important: "重要",
  urgent: "紧急",
};

const priorityColors: Record<NotificationPriority, string> = {
  normal: "blue",
  important: "gold",
  urgent: "red",
};

function formatNotificationTime(publishedAt: string) {
  const published = new Date(publishedAt);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const isSameDay = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate();
  const time = `${String(published.getHours()).padStart(2, "0")}:${String(
    published.getMinutes(),
  ).padStart(2, "0")}`;

  if (isSameDay(published, today)) return `今天 ${time}`;
  if (isSameDay(published, yesterday)) return `昨天 ${time}`;
  if (published.getFullYear() === today.getFullYear()) {
    return `${published.getMonth() + 1}月${published.getDate()}日`;
  }
  return `${published.getFullYear()}年${published.getMonth() + 1}月${published.getDate()}日`;
}

export function NotificationBell() {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const {
    items,
    unreadCount,
    loading,
    centerOpen,
    openCenter,
    closeCenter,
    markRead,
    markAllRead,
  } = useNotifications();
  const ariaLabel = useMemo(
    () => (unreadCount > 0 ? `通知，${unreadCount} 条未读` : "通知"),
    [unreadCount],
  );
  const sections = useMemo(() => {
    const now = new Date();
    const isToday = (publishedAt: string | null) => {
      if (!publishedAt) return false;
      const published = new Date(publishedAt);
      return (
        published.getFullYear() === now.getFullYear() &&
        published.getMonth() === now.getMonth() &&
        published.getDate() === now.getDate()
      );
    };

    return [
      { label: "今天", items: items.filter((item) => isToday(item.publishedAt)) },
      { label: "更早", items: items.filter((item) => !isToday(item.publishedAt)) },
    ].filter((section) => section.items.length > 0);
  }, [items]);

  const handleItemClick = async (item: NotificationItem) => {
    const expanding = expandedId !== item.id;
    setExpandedId(expanding ? item.id : null);
    if (expanding && !item.readAt) {
      try {
        await markRead(item.id);
      } catch {
        message.error("未能标记已读，请稍后重试");
      }
    }
  };

  return (
    <>
      <Badge count={unreadCount} size="small" overflowCount={99}>
        <Button
          aria-label={ariaLabel}
          className="english-world-notification-button"
          icon={<BellOutlined />}
          loading={loading}
          shape="circle"
          type="text"
          onClick={openCenter}
        />
      </Badge>
      <Drawer
        aria-label="通知中心"
        className="english-world-notification-drawer"
        title={
          <div className="english-world-notification-title">
            <span>通知</span>
            {unreadCount > 0 && <small>{unreadCount} 条未读</small>}
          </div>
        }
        open={centerOpen}
        onClose={() => {
          setExpandedId(null);
          closeCenter();
        }}
        width={440}
        extra={
          <Button
            size="small"
            type="text"
            icon={<CheckOutlined aria-hidden="true" />}
            onClick={markAllRead}
            disabled={!unreadCount}
          >
            全部已读
          </Button>
        }
      >
        {items.length ? (
          <div className="english-world-notification-sections">
            {sections.map((section) => (
              <List
                key={section.label}
                className="english-world-notification-list"
                dataSource={section.items}
                header={
                  <Typography.Text type="secondary">
                    {section.label}
                  </Typography.Text>
                }
                renderItem={(item) => (
                  <List.Item
                    className={
                      item.readAt
                        ? "english-world-notification-item"
                        : "english-world-notification-item english-world-notification-item-unread"
                    }
                  >
                    <button
                      type="button"
                      className="english-world-notification-item-button"
                      aria-expanded={expandedId === item.id}
                      onClick={() => void handleItemClick(item)}
                    >
                      <span
                        className="english-world-notification-unread-dot"
                        aria-hidden="true"
                      />
                      <span className="english-world-notification-item-content">
                        <span className="english-world-notification-item-heading">
                          <Typography.Text
                            className="english-world-notification-item-title"
                            strong={!item.readAt}
                          >
                            {item.title}
                          </Typography.Text>
                          {item.priority === "urgent" && (
                            <Tag color={priorityColors[item.priority]}>
                              {priorityLabels[item.priority]}
                            </Tag>
                          )}
                        </span>
                        <Typography.Text
                          type="secondary"
                          className="english-world-notification-item-body"
                        >
                          {item.body}
                        </Typography.Text>
                        <span className="english-world-notification-item-meta">
                          <span>
                            {categoryLabels[item.category] ?? item.category}
                          </span>
                          {item.publishedAt && (
                            <time dateTime={item.publishedAt}>
                              {formatNotificationTime(item.publishedAt)}
                            </time>
                          )}
                          <span className="english-world-notification-expand">
                            {expandedId === item.id ? "收起" : "展开"}
                            <DownOutlined aria-hidden="true" />
                          </span>
                        </span>
                      </span>
                    </button>
                    {practiceActionPath(item.action, window.location.pathname.startsWith("/mobile")) && <a className="english-world-practice-link" style={{display:"block",padding:"8px 16px",whiteSpace:"nowrap"}} href={practiceActionPath(item.action, window.location.pathname.startsWith("/mobile"))!} onClick={closeCenter}>开始练习 →</a>}
                  </List.Item>
                )}
              />
            ))}
          </div>
        ) : (
          <Empty description="暂无通知" />
        )}
      </Drawer>
    </>
  );
}
