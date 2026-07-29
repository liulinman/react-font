import { useCallback, useEffect, useState } from "react";
import {
  Button,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import request from "@font/api";
import { EnglishWorldLayout } from "../layout/EnglishWorldLayout";
import { EnglishWorldPageHeader } from "../component/EnglishWorldPageHeader";
import {
  adminAiPreview,
  adminBanUser,
  adminCreateSchedule,
  adminListNotifications,
  adminListSchedules,
  adminListUsers,
  adminLogin,
  adminPublishNotification,
  adminUnbanUser,
} from "@/server/notification/notification";
import type {
  AdminUserItem,
  NotificationItem,
  NotificationScheduleItem,
  NotificationScheduleParams,
} from "@/server/notification/notification.type";

const categoryOptions = [
  { label: "雅思每日文案", value: "ielts_daily" },
  { label: "近期事件英语表达", value: "recent_event" },
  { label: "近考高频词汇", value: "exam_vocabulary" },
  { label: "手写自定义公告", value: "custom" },
];

const aiModeOptions = [
  { label: "生成草稿待发布", value: "draft" },
  { label: "自动生成并发布", value: "auto_publish" },
  { label: "不使用 AI", value: "off" },
];

export function AdminPage() {
  const [loginForm] = Form.useForm();
  const [announcementForm] = Form.useForm();
  const [scheduleForm] = Form.useForm<NotificationScheduleParams>();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [schedules, setSchedules] = useState<NotificationScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);

  const loadAdminData = useCallback(async () => {
    const [userResult, scheduleResult, notificationResult] = await Promise.all([
      request(adminListUsers({ page: 1, pageSize: 20 })),
      request(adminListSchedules()),
      request(adminListNotifications({ page: 1, pageSize: 20 })),
    ]);
    setUsers(userResult.list);
    setSchedules(scheduleResult.list ?? []);
    setNotifications(notificationResult.list);
  }, []);

  useEffect(() => {
    let mounted = true;
    request({ url: "/admin/me", method: "GET" })
      .then(async () => {
        if (!mounted) return;
        setAuthed(true);
        await loadAdminData();
      })
      .catch(() => {
        if (mounted) setAuthed(false);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => {
      mounted = false;
    };
  }, [loadAdminData]);

  const handleLogin = async () => {
    const values = await loginForm.validateFields();
    setLoading(true);
    try {
      await request(adminLogin(values));
      setAuthed(true);
      await loadAdminData();
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId: number) => {
    await request(adminBanUser({ id: userId, reason: "管理员封禁" }));
    message.success("已封禁用户");
    await loadAdminData();
  };

  const handleUnban = async (userId: number) => {
    await request(adminUnbanUser({ id: userId }));
    message.success("已解封用户");
    await loadAdminData();
  };

  const handlePublish = async () => {
    const values = await announcementForm.validateFields();
    await request(adminPublishNotification(values));
    message.success("公告已发送");
    announcementForm.resetFields();
    await loadAdminData();
  };

  const handleAiPreview = async () => {
    const values = await announcementForm.validateFields(["category", "body"]);
    const preview = await request(
      adminAiPreview({
        category: values.category,
        prompt: values.body,
      }),
    );
    announcementForm.setFieldsValue({
      title: preview.title,
      body: preview.body,
      priority: preview.priority,
      sourceType: preview.sourceType,
    });
  };

  const handleCreateSchedule = async () => {
    const values = await scheduleForm.validateFields();
    await request(adminCreateSchedule(values));
    message.success("定时任务已保存");
    await loadAdminData();
  };

  const userColumns: ColumnsType<AdminUserItem> = [
    { title: "用户", dataIndex: "username" },
    {
      title: "状态",
      dataIndex: "status",
      render: (status: AdminUserItem["status"]) => (
        <Tag color={status === "banned" ? "red" : "green"}>
          {status === "banned" ? "已封禁" : "正常"}
        </Tag>
      ),
    },
    { title: "封禁原因", dataIndex: "banReason" },
    {
      title: "操作",
      render: (_, row) =>
        row.status === "banned" ? (
          <Button
            aria-label="解封"
            size="small"
            onClick={() => void handleUnban(row.id)}
          >
            解封
          </Button>
        ) : (
          <Button
            aria-label="封禁"
            size="small"
            danger
            onClick={() => void handleBan(row.id)}
          >
            封禁
          </Button>
        ),
    },
  ];

  if (!authed && !checking) {
    return (
      <EnglishWorldLayout activeKey="admin">
        <div className="english-world-admin-page">
          <EnglishWorldPageHeader compact title="后台登录" />
          <div className="english-world-admin-login">
            <Form form={loginForm} layout="vertical">
              <Form.Item
                label="账号"
                name="username"
                rules={[{ required: true, message: "请输入账号" }]}
              >
                <Input autoComplete="username" />
              </Form.Item>
              <Form.Item
                label="密码"
                name="password"
                rules={[{ required: true, message: "请输入密码" }]}
              >
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Button type="primary" loading={loading} onClick={handleLogin}>
                登录后台
              </Button>
            </Form>
          </div>
        </div>
      </EnglishWorldLayout>
    );
  }

  return (
    <EnglishWorldLayout activeKey="admin">
      <div className="english-world-admin-page">
        <EnglishWorldPageHeader
          compact
          title="后台管理"
          description="管理用户状态、发布公告，并维护 AI 定时内容。"
        />
        <Tabs
          className="english-world-admin-tabs"
          items={[
            {
              key: "users",
              label: "用户管理",
              children: (
                <Table
                  rowKey="id"
                  columns={userColumns}
                  dataSource={users}
                  pagination={false}
                  size="middle"
                />
              ),
            },
            {
              key: "announcements",
              label: "公告发布",
              children: (
                <Form
                  form={announcementForm}
                  layout="vertical"
                  initialValues={{
                    category: "announcement",
                    priority: "normal",
                    targetType: "all",
                    sourceType: "manual",
                  }}
                  className="english-world-admin-form"
                >
                  <Form.Item name="title" label="标题" rules={[{ required: true }]}>
                    <Input maxLength={160} />
                  </Form.Item>
                  <Form.Item name="body" label="正文" rules={[{ required: true }]}>
                    <Input.TextArea rows={5} />
                  </Form.Item>
                  <Space wrap>
                    <Form.Item name="category" label="类型">
                      <Select
                        style={{ width: 180 }}
                        options={[
                          { label: "普通公告", value: "announcement" },
                          ...categoryOptions,
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="priority" label="优先级">
                      <Select
                        style={{ width: 140 }}
                        options={[
                          { label: "普通", value: "normal" },
                          { label: "重要", value: "important" },
                          { label: "紧急", value: "urgent" },
                        ]}
                      />
                    </Form.Item>
                    <Form.Item name="targetType" label="发送范围">
                      <Select
                        style={{ width: 140 }}
                        options={[
                          { label: "全部用户", value: "all" },
                          { label: "指定用户", value: "selected" },
                        ]}
                      />
                    </Form.Item>
                  </Space>
                  <Space>
                    <Button onClick={handleAiPreview}>AI 帮我生成</Button>
                    <Button type="primary" onClick={handlePublish}>
                      发送公告
                    </Button>
                  </Space>
                </Form>
              ),
            },
            {
              key: "schedules",
              label: "定时任务",
              children: (
                <div className="english-world-admin-schedules">
                  <Form
                    form={scheduleForm}
                    layout="vertical"
                    initialValues={{
                      name: "每日雅思表达",
                      category: "ielts_daily",
                      cadence: "daily",
                      hour: 8,
                      minute: 0,
                      timezoneOffsetMinutes: 480,
                      aiMode: "auto_publish",
                      targetType: "all",
                    }}
                    className="english-world-admin-form"
                  >
                    <Form.Item name="name" label="任务名称" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="category" label="内容预设">
                      <Radio.Group options={categoryOptions} />
                    </Form.Item>
                    <Form.Item name="aiMode" label="AI 模式">
                      <Radio.Group options={aiModeOptions} />
                    </Form.Item>
                    <Space wrap>
                      <Form.Item name="cadence" label="频率">
                        <Select
                          style={{ width: 130 }}
                          options={[
                            { label: "一次", value: "once" },
                            { label: "每天", value: "daily" },
                            { label: "每周", value: "weekly" },
                          ]}
                        />
                      </Form.Item>
                      <Form.Item name="hour" label="小时">
                        <InputNumber min={0} max={23} />
                      </Form.Item>
                      <Form.Item name="minute" label="分钟">
                        <InputNumber min={0} max={59} />
                      </Form.Item>
                    </Space>
                    <Form.Item name="templatePrompt" label="主题/提示词">
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Button type="primary" onClick={handleCreateSchedule}>
                      保存定时任务
                    </Button>
                  </Form>
                  <Table
                    rowKey={(row) => String(row.id)}
                    dataSource={schedules}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: "任务", dataIndex: "name" },
                      { title: "类型", dataIndex: "category" },
                      { title: "下次运行", dataIndex: "nextRunAt" },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: "history",
              label: "历史记录",
              children: (
                <Table
                  rowKey="id"
                  dataSource={notifications}
                  pagination={false}
                  size="small"
                  columns={[
                    { title: "标题", dataIndex: "title" },
                    { title: "类型", dataIndex: "category" },
                    { title: "发布时间", dataIndex: "publishedAt" },
                  ]}
                />
              ),
            },
          ]}
        />
      </div>
    </EnglishWorldLayout>
  );
}
