import { BellOutlined } from "@ant-design/icons";
import { Badge, Button, Drawer, Empty, List, Space, Tag, Typography } from "antd";
import { useMemo, useState } from "react";
import { useNotifications } from "./NotificationContext";
import type {
  NotificationCategory,
  NotificationItem,
  NotificationPriority,
} from "@/server/notification/notification.type";

const categoryLabels: Record<NotificationCategory, string> = {
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

export function NotificationBell() {
  const { items, unreadCount, loading, markRead, markAllRead } =
    useNotifications();
  const [open, setOpen] = useState(false);
  const ariaLabel = useMemo(
    () => (unreadCount > 0 ? `通知，${unreadCount} 条未读` : "通知"),
    [unreadCount],
  );

  const handleItemClick = async (item: NotificationItem) => {
    if (!item.readAt) {
      await markRead(item.id);
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
          onClick={() => setOpen(true)}
        />
      </Badge>
      <Drawer
        aria-label="通知中心"
        title="通知中心"
        open={open}
        onClose={() => setOpen(false)}
        width={380}
        extra={
          <Button size="small" onClick={markAllRead} disabled={!unreadCount}>
            全部已读
          </Button>
        }
      >
        {items.length ? (
          <List
            className="english-world-notification-list"
            dataSource={items}
            renderItem={(item) => (
              <List.Item
                className={
                  item.readAt
                    ? "english-world-notification-item"
                    : "english-world-notification-item english-world-notification-item-unread"
                }
                onClick={() => void handleItemClick(item)}
              >
                <List.Item.Meta
                  title={
                    <Space size={6} wrap>
                      <Typography.Text strong={!item.readAt}>
                        {item.title}
                      </Typography.Text>
                      <Tag>{categoryLabels[item.category] ?? item.category}</Tag>
                      <Tag color={priorityColors[item.priority]}>
                        {priorityLabels[item.priority]}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4}>
                      <Typography.Text type="secondary">
                        {item.body}
                      </Typography.Text>
                      {item.publishedAt && (
                        <Typography.Text type="secondary" className="text-xs">
                          {new Date(item.publishedAt).toLocaleString()}
                        </Typography.Text>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="暂无通知" />
        )}
      </Drawer>
    </>
  );
}
