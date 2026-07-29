import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BellOutlined,
  DeleteOutlined,
  HistoryOutlined,
  LogoutOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  ScheduleOutlined,
  SendOutlined,
  StopOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import type { Dayjs } from "dayjs";
import request from "@font/api";
import {
  adminAiPreview,
  adminBanUser,
  adminCreateSchedule,
  adminDeleteUser,
  adminDeleteNotification,
  adminDeleteSchedule,
  adminListNotifications,
  adminListSchedules,
  adminListUsers,
  adminLogin,
  adminLogout,
  adminMe,
  adminPublishNotification,
  adminRunScheduleNow,
  adminUnbanUser,
  adminWithdrawNotification,
} from "./api/notification";
import type {
  AdminUserItem,
  NotificationItem,
  NotificationScheduleItem,
  NotificationScheduleParams,
} from "./api/notification.type";
import { UserActionConfirmModal } from "./UserActionConfirmModal";
import type { UserAction } from "./UserActionConfirmModal";

type ScheduleFormValues = Omit<NotificationScheduleParams, "runAt"> & {
  runAt?: Dayjs;
};

type PendingUserAction = {
  action: UserAction;
  user: AdminUserItem;
};

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

function toScheduleParams(values: ScheduleFormValues): NotificationScheduleParams {
  return {
    ...values,
    runAt: values.runAt?.toISOString(),
  };
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString("zh-CN") : "-";
}

function renderNotificationStatus(status?: NotificationItem["status"]) {
  if (status === "withdrawn") return <Tag color="default">已撤回</Tag>;
  if (status === "draft") return <Tag color="blue">草稿</Tag>;
  return <Tag color="green">已发布</Tag>;
}

export function AdminApp() {
  const [loginForm] = Form.useForm();
  const [announcementForm] = Form.useForm();
  const [scheduleForm] = Form.useForm<ScheduleFormValues>();
  const cadence = Form.useWatch("cadence", scheduleForm);
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [schedules, setSchedules] = useState<NotificationScheduleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingUserAction, setPendingUserAction] = useState<PendingUserAction | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);

  const loadAdminData = useCallback(async () => {
    const [userResult, scheduleResult, notificationResult] = await Promise.all([
      request(adminListUsers({ page: 1, pageSize: 50 })),
      request(adminListSchedules()),
      request(adminListNotifications({ page: 1, pageSize: 50 })),
    ]);
    setUsers(userResult.list);
    setSchedules(scheduleResult.list ?? []);
    setNotifications(notificationResult.list);
  }, []);

  useEffect(() => {
    let mounted = true;
    request(adminMe())
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

  const refresh = async () => {
    setLoading(true);
    try {
      await loadAdminData();
    } finally {
      setLoading(false);
    }
  };

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

  const handleLogout = async () => {
    await request(adminLogout());
    setAuthed(false);
  };

  const handleUserActionConfirm = async (confirmUsername: string) => {
    if (!pendingUserAction) return;

    const { action, user } = pendingUserAction;
    setUserActionLoading(true);
    try {
      if (action === "ban") {
        await request(adminBanUser({ id: user.id, reason: "管理员封禁", confirmUsername }));
      } else if (action === "unban") {
        await request(adminUnbanUser({ id: user.id, confirmUsername }));
      } else {
        await request(adminDeleteUser({ id: user.id, confirmUsername }));
      }
      message.success(
        action === "ban" ? "已封禁用户" : action === "unban" ? "已解封用户" : "用户已永久删除",
      );
      setPendingUserAction(null);
      await refresh();
    } catch {
      // Keep the dialog open so the administrator can review or retry the action.
    } finally {
      setUserActionLoading(false);
    }
  };

  const handlePublish = async () => {
    const values = await announcementForm.validateFields();
    await request(adminPublishNotification(values));
    message.success("公告已发送");
    announcementForm.resetFields();
    await refresh();
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
    await request(adminCreateSchedule(toScheduleParams(values)));
    message.success("定时任务已保存");
    await refresh();
  };

  const handleRunSchedule = async (id: number) => {
    await request(adminRunScheduleNow({ id }));
    message.success("任务已执行");
    await refresh();
  };

  const handleDeleteSchedule = async (id: number) => {
    await request(adminDeleteSchedule({ id }));
    message.success("定时任务已删除");
    await refresh();
  };

  const handleDeleteNotification = async (id: number) => {
    await request(adminDeleteNotification({ id }));
    message.success("公告已删除");
    await refresh();
  };

  const handleWithdrawNotification = async (id: number) => {
    await request(adminWithdrawNotification({ id }));
    message.success("公告已撤回");
    await refresh();
  };

  const userColumns: ColumnsType<AdminUserItem> = useMemo(
    () => [
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
      { title: "封禁原因", dataIndex: "banReason", render: (value) => value || "-" },
      {
        title: "操作",
        render: (_, row) => (
          <Space size={8} wrap>
            {row.status === "banned" ? (
              <Button
                aria-label={`解封 ${row.username}`}
                size="small"
                onClick={() => setPendingUserAction({ action: "unban", user: row })}
              >
                解封
              </Button>
            ) : (
              <Button
                aria-label={`封禁 ${row.username}`}
                size="small"
                danger
                onClick={() => setPendingUserAction({ action: "ban", user: row })}
              >
                封禁
              </Button>
            )}
            <Button
              aria-label={`永久删除 ${row.username}`}
              size="small"
              danger
              onClick={() => setPendingUserAction({ action: "delete", user: row })}
            >
              永久删除
            </Button>
          </Space>
        ),
      },
    ],
    [],
  );

  const scheduleColumns: ColumnsType<NotificationScheduleItem> = [
    { title: "任务", dataIndex: "name" },
    { title: "类型", dataIndex: "category" },
    { title: "频率", dataIndex: "cadence" },
    { title: "下次运行", dataIndex: "nextRunAt", render: formatDate },
    {
      title: "操作",
      render: (_, row) => (
        <Space>
          <Button
            aria-label="立即执行"
            size="small"
            icon={<PlayCircleOutlined />}
            onClick={() => void handleRunSchedule(row.id)}
          />
          <Button
            aria-label="删除任务"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => void handleDeleteSchedule(row.id)}
          />
        </Space>
      ),
    },
  ];

  const notificationColumns: ColumnsType<NotificationItem> = [
    { title: "标题", dataIndex: "title" },
    { title: "类型", dataIndex: "category" },
    {
      title: "状态",
      dataIndex: "status",
      render: renderNotificationStatus,
    },
    { title: "发布时间", dataIndex: "publishedAt", render: formatDate },
    {
      title: "操作",
      render: (_, row) => (
        <Space>
          {row.status === "published" || !row.status ? (
            <Button
              aria-label="撤回公告"
              size="small"
              icon={<StopOutlined />}
              onClick={() => void handleWithdrawNotification(row.id)}
            />
          ) : null}
          <Button
            aria-label="删除公告"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => void handleDeleteNotification(row.id)}
          />
        </Space>
      ),
    },
  ];

  if (checking) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-panel">
          <div className="admin-brand-mark">EW</div>
          <Typography.Title level={1}>正在进入后台</Typography.Title>
          <Typography.Paragraph>正在检查登录状态。</Typography.Paragraph>
        </section>
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="admin-login-page">
        <section className="admin-login-panel">
          <div className="admin-brand-mark">EW</div>
          <Typography.Title level={1}>后台登录</Typography.Title>
          <Typography.Paragraph>
            管理用户状态、发布公告，并维护 AI 定时内容。
          </Typography.Paragraph>
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
        </section>
      </main>
    );
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <span className="admin-brand-mark">EW</span>
          <span>
            <strong>English World</strong>
            <small>Admin Console</small>
          </span>
        </div>
        <div className="admin-sidebar-note">
          独立后台项目，用于通知、用户与定时内容维护。
        </div>
      </aside>
      <section className="admin-workspace">
        <header className="admin-toolbar">
          <div>
            <Typography.Title level={1}>后台管理</Typography.Title>
            <Typography.Text type="secondary">
              用户状态、公告发布、AI 定时任务与历史记录。
            </Typography.Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void refresh()}>
              刷新
            </Button>
            <Button icon={<LogoutOutlined />} onClick={() => void handleLogout()}>
              退出
            </Button>
          </Space>
        </header>

        <Tabs
          className="admin-tabs"
          items={[
            {
              key: "users",
              label: (
                <span>
                  <TeamOutlined /> 用户管理
                </span>
              ),
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
              label: (
                <span>
                  <SendOutlined /> 公告发布
                </span>
              ),
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
                  className="admin-form"
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
                        style={{ width: 190 }}
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
                    <Button icon={<RobotOutlined />} onClick={handleAiPreview}>
                      AI 帮我生成
                    </Button>
                    <Button type="primary" icon={<BellOutlined />} onClick={handlePublish}>
                      发送公告
                    </Button>
                  </Space>
                </Form>
              ),
            },
            {
              key: "schedules",
              label: (
                <span>
                  <ScheduleOutlined /> 定时任务
                </span>
              ),
              children: (
                <div className="admin-schedules">
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
                    className="admin-form"
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
                      {cadence === "once" ? (
                        <Form.Item name="runAt" label="执行时间">
                          <DatePicker showTime />
                        </Form.Item>
                      ) : null}
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
                    columns={scheduleColumns}
                  />
                </div>
              ),
            },
            {
              key: "history",
              label: (
                <span>
                  <HistoryOutlined /> 历史记录
                </span>
              ),
              children: (
                <Table
                  rowKey="id"
                  dataSource={notifications}
                  pagination={false}
                  size="small"
                  columns={notificationColumns}
                />
              ),
            },
          ]}
        />
        <UserActionConfirmModal
          key={`${pendingUserAction?.action ?? "none"}-${pendingUserAction?.user.id ?? "none"}-${pendingUserAction?.user.username ?? "none"}`}
          open={pendingUserAction !== null}
          action={pendingUserAction?.action ?? "ban"}
          user={pendingUserAction?.user}
          loading={userActionLoading}
          onCancel={() => setPendingUserAction(null)}
          onConfirm={handleUserActionConfirm}
        />
      </section>
    </main>
  );
}
