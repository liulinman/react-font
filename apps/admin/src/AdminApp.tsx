import { ReadingPracticePanel, practiceLabels } from './ReadingPracticePanel';
import { newRequestId } from './api/readingPractice';
import { useCallback, useEffect, useRef, useState } from "react";
import { HistoryOutlined, LogoutOutlined, PlusOutlined, ReloadOutlined, ScheduleOutlined, SendOutlined, TeamOutlined } from "@ant-design/icons";
import { Alert, Button, Drawer, Dropdown, Form, Input, Modal, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import request from "@font/api";
import {
  adminBanUser, adminDeleteUser, adminDeleteNotification, adminDeleteSchedule,
  adminListNotifications, adminListSchedules, adminListUsers, adminLogin, adminLogout, adminMe,
  adminRunScheduleNow, adminUnbanUser, adminWithdrawNotification,
} from "./api/notification";
import type { AdminUserItem, NotificationItem, NotificationScheduleItem } from "./api/notification.type";
import { UserActionConfirmModal, type UserAction } from "./UserActionConfirmModal";
import { AnnouncementComposer } from "./AnnouncementComposer";
import { ScheduleEditor } from "./ScheduleEditor";
import { categoryLabels, formatDate, formatSchedule, priorityLabels } from "./adminPresentation";

type Section = "practices" | "users" | "announcements" | "schedules" | "history";
const sections = [
  { key: "practices" as const, label: "阅读练习", icon: <ScheduleOutlined />, description: "生成一篇文章和配套题目，发布给用户独立作答。" },
  { key: "users" as const, label: "用户管理", icon: <TeamOutlined />, description: "查找用户，查看账号状态并管理访问权限。" },
  { key: "announcements" as const, label: "公告发布", icon: <SendOutlined />, description: "发布学习提醒和公告，将内容发送给合适的用户。" },
  { key: "schedules" as const, label: "定时任务", icon: <ScheduleOutlined />, description: "安排内容生成与发布，让学习提醒按时送达。" },
  { key: "history" as const, label: "历史记录", icon: <HistoryOutlined />, description: "查看已生成的通知内容，管理发布记录。" },
];
type PendingAction = { kind: "withdraw" | "deleteNotification" | "deleteSchedule" | "run"; id: number; title: string; requestUid?: string };
const actionCopy = {
  withdraw: { label: "撤回", description: "撤回后，这条公告将不再出现在用户的通知列表中。" },
  deleteNotification: { label: "删除公告", description: "公告及关联通知记录将被永久删除，无法恢复。" },
  deleteSchedule: { label: "删除任务", description: "删除后任务将停止运行，已经生成的通知不受影响。" },
  run: { label: "立即执行", description: "现在执行一次此任务；若任务设置为自动发布，将立即向用户发送通知。" },
};
function notificationStatus(status?: NotificationItem["status"]) {
  return status === "withdrawn" ? <Tag>已撤回</Tag> : status === "draft" ? <Tag color="blue">草稿</Tag> : <Tag color="green">已发布</Tag>;
}

export function AdminApp() {
  const [loginForm] = Form.useForm();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [active, setActive] = useState<Section>("users");
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [schedules, setSchedules] = useState<NotificationScheduleItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [userQuery, setUserQuery] = useState<{ page: number; pageSize: number; search?: string; status?: "active" | "banned" }>({ page: 1, pageSize: 20 });
  const [historyQuery, setHistoryQuery] = useState({ page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [error, setError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [pendingUserAction, setPendingUserAction] = useState<{ action: UserAction; user: AdminUserItem } | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [detail, setDetail] = useState<NotificationItem | null>(null);
  const [practiceId, setPracticeId] = useState<number>();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const loadVersion = useRef(0);
  const actionLock = useRef(false);
  const userActionLock = useRef(false);

  const refresh = useCallback(async () => {
    const version = ++loadVersion.current;
    setLoading(true); setError("");
    try {
      const [u, s, n] = await Promise.all([
        request(adminListUsers(userQuery)), request(adminListSchedules()), request(adminListNotifications(historyQuery)),
      ]);
      if (version !== loadVersion.current) return;
      setUsers(u.list); setUserTotal(u.total); setSchedules(s.list ?? []);
      setNotifications(n.list); setNotificationTotal(n.total);
      // A deletion can empty the final page. Return to the last existing page.
      const lastUserPage = Math.max(1, Math.ceil(u.total / userQuery.pageSize));
      const lastHistoryPage = Math.max(1, Math.ceil(n.total / historyQuery.pageSize));
      if (userQuery.page > lastUserPage) setUserQuery(query => ({ ...query, page: lastUserPage }));
      if (historyQuery.page > lastHistoryPage) setHistoryQuery(query => ({ ...query, page: lastHistoryPage }));
    } catch {
      if (version === loadVersion.current) setError("数据加载失败，当前显示的内容可能不是最新状态，请重试。");
    } finally { if (version === loadVersion.current) setLoading(false); }
  }, [userQuery, historyQuery]);
  useEffect(() => {
    let mounted = true;
    request(adminMe()).then(() => { if (mounted) setAuthed(true); })
      .catch(() => { if (mounted) setAuthed(false); })
      .finally(() => { if (mounted) setChecking(false); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    // This effect fetches server data; the immediate state change exposes its loading status.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (authed) void refresh();
    return () => { loadVersion.current += 1; };
  }, [authed, refresh]);
  const handleLogin = async (values: { username: string; password: string }) => {
    setAuthBusy(true); setLoginError("");
    try { await request(adminLogin(values)); setAuthed(true); }
    catch { setLoginError("登录失败，请检查账号和密码后重试。"); }
    finally { setAuthBusy(false); }
  };
  const handleLogout = async () => {
    setAuthBusy(true);
    try { await request(adminLogout()); setAuthed(false); setDetail(null); setActive("users"); }
    catch { message.error("退出失败，请重试"); }
    finally { setAuthBusy(false); }
  };
  const handleUserActionConfirm = async (confirmUsername: string) => {
    if (!pendingUserAction || userActionLock.current) return;
    userActionLock.current = true; setUserActionLoading(true);
    const { action, user } = pendingUserAction;
    try {
      if (action === "ban") await request(adminBanUser({ id: user.id, reason: "管理员封禁", confirmUsername }));
      else if (action === "unban") await request(adminUnbanUser({ id: user.id, confirmUsername }));
      else await request(adminDeleteUser({ id: user.id, confirmUsername }));
      message.success(action === "ban" ? "已封禁用户" : action === "unban" ? "已解封用户" : "用户已永久删除");
      setPendingUserAction(null); await refresh();
    } catch { message.error("操作失败，请重试"); }
    finally { userActionLock.current = false; setUserActionLoading(false); }
  };
  const confirmAction = async () => {
    if (!pendingAction || actionLock.current) return;
    actionLock.current = true; setActionBusy(true); setActionError("");
    try {
      const { kind, id } = pendingAction;
      if (kind === "withdraw") await request(adminWithdrawNotification({ id }));
      else if (kind === "deleteNotification") await request(adminDeleteNotification({ id }));
      else if (kind === "deleteSchedule") await request(adminDeleteSchedule({ id }));
      else await request(adminRunScheduleNow({ id, requestUid: pendingAction.requestUid }));
      message.success("操作成功"); setPendingAction(null); await refresh();
    } catch { setActionError("操作失败，请重试。"); }
    finally { actionLock.current = false; setActionBusy(false); }
  };
  const ask = (action: PendingAction) => { setActionError(""); setPendingAction({ ...action, requestUid: newRequestId() }); };
  const userColumns: ColumnsType<AdminUserItem> = [
    { title: "用户", dataIndex: "username", render: (value, row) => <div className="admin-user-cell"><span className="admin-avatar">{value.slice(0, 1).toUpperCase()}</span><span><strong>{value}</strong><small>用户 #{row.id}</small></span></div> },
    { title: "状态", dataIndex: "status", width: 100, render: status => <Tag color={status === "banned" ? "red" : "green"}>{status === "banned" ? "已封禁" : "正常"}</Tag> },
    { title: "封禁原因", dataIndex: "banReason", render: value => value || "—" },
    { title: "注册时间", dataIndex: "createTime", width: 165, render: formatDate },
    { title: "操作", width: 190, render: (_, row) => <Space size={4}>
      <Button type="link" aria-label={`${row.status === "banned" ? "解封" : "封禁"} ${row.username}`} onClick={() => setPendingUserAction({ action: row.status === "banned" ? "unban" : "ban", user: row })}>{row.status === "banned" ? "解封" : "封禁"}</Button>
      <Button type="text" danger aria-label={`永久删除 ${row.username}`} onClick={() => setPendingUserAction({ action: "delete", user: row })}>永久删除</Button>
    </Space> },
  ];
  const scheduleColumns: ColumnsType<NotificationScheduleItem> = [
    { title: "任务名称", dataIndex: "name", render: (value, row) => <div className="admin-title-cell"><strong>{value}</strong><small>{row.contentKind === "reading_practice" ? "阅读练习" : categoryLabels[row.category] ?? row.category}</small></div> },
    { title: "运行计划", width: 230, render: (_, row) => <div className="admin-title-cell"><span>{formatSchedule(row)}</span><small>{row.aiMode === "draft" ? "生成草稿待发布" : row.aiMode === "off" ? "不使用 AI" : "自动生成并发布"}</small></div> },
    { title: "状态", width: 95, render: (_, row) => <Tag color={row.enabled === false ? "default" : "green"}>{row.enabled === false ? "已停用" : "已启用"}</Tag> },
    { title: "最近生成", width: 140, render: (_, row) => row.lastRun ? <div><Button type="link" onClick={() => { setPracticeId(row.lastRun!.practiceId); setActive("practices"); }}>{practiceLabels[row.lastRun.status]}</Button>{row.lastRun.failureSummary && <small>{row.lastRun.failureSummary}</small>}</div> : "—" },
    { title: "下次运行", dataIndex: "nextRunAt", width: 165, render: formatDate },
    { title: "操作", width: 200, render: (_, row) => <Space size={0}>
      <Button type="link" onClick={() => ask({ kind: "run", id: row.id, title: row.name })}>立即执行</Button>
      <Button type="text" danger onClick={() => ask({ kind: "deleteSchedule", id: row.id, title: row.name })}>删除任务</Button>
    </Space> },
  ];
  const notificationColumns: ColumnsType<NotificationItem> = [
    { title: "通知内容", dataIndex: "title", render: (value, row) => <button className="admin-title-link" onClick={() => setDetail(row)}><strong>{value}</strong><span>{row.body}</span></button> },
    { title: "类型", dataIndex: "category", width: 145, render: (value: NotificationItem["category"]) => categoryLabels[value] ?? value },
    { title: "状态", dataIndex: "status", width: 95, render: notificationStatus },
    { title: "发布时间", dataIndex: "publishedAt", width: 165, render: formatDate },
    { title: "操作", width: 170, render: (_, row) => <Space size={0}>
      <Button type="link" onClick={() => setDetail(row)}>查看</Button>
      {(row.status === "published" || !row.status) && <Button type="text" aria-label="撤回公告" onClick={() => ask({ kind: "withdraw", id: row.id, title: row.title })}>撤回</Button>}
      <Dropdown trigger={["click"]} menu={{ items: [{ key: "delete", label: "删除公告", danger: true }], onClick: () => ask({ kind: "deleteNotification", id: row.id, title: row.title }) }}><Button type="text" aria-label={`更多操作：${row.title}`}>更多</Button></Dropdown>
    </Space> },
  ];
  if (checking) return <main className="admin-login-page"><section className="admin-login-panel"><div className="admin-brand-mark">EW</div><h1>正在进入后台</h1><p>正在检查登录状态。</p></section></main>;
  if (!authed) return <main className="admin-login-page"><section className="admin-login-panel"><div className="admin-brand-mark">EW</div><h1>后台登录</h1><p className="admin-muted">管理用户、学习公告与定时任务。</p>
    {loginError && <Alert type="error" message={loginError} showIcon />}
    <Form form={loginForm} layout="vertical" onFinish={values => void handleLogin(values)} disabled={authBusy}>
      <Form.Item label="账号" name="username" rules={[{ required: true, message: "请输入账号" }]}><Input autoComplete="username" /></Form.Item>
      <Form.Item label="密码" name="password" rules={[{ required: true, message: "请输入密码" }]}><Input.Password autoComplete="current-password" /></Form.Item>
      <Button type="primary" htmlType="submit" loading={authBusy} block>登录后台</Button>
    </Form></section></main>;
  const section = sections.find(item => item.key === active)!;
  return <main className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-brand"><span className="admin-brand-mark">EW</span><span><strong>English World</strong><small>管理控制台</small></span></div>
      <div className="admin-nav-label">工作空间</div>
      <nav aria-label="后台导航" className="admin-nav">{sections.map(item => <button key={item.key} aria-current={active === item.key ? "page" : undefined} onClick={() => setActive(item.key)}>{item.icon}<span>{item.label}</span></button>)}</nav>
      <a className="admin-site-link" href="/englishWorld/knowledge-notes" target="_blank" rel="noreferrer">打开学习网站 ↗</a>
    </aside>
    <section className="admin-workspace"><header className="admin-toolbar"><div><span className="admin-eyebrow">ENGLISH WORLD / 管理控制台</span><h1>{section.label}</h1><p>{section.description}</p></div><Space><Button icon={<ReloadOutlined />} loading={loading} onClick={() => void refresh()}>刷新</Button><Button type="text" icon={<LogoutOutlined />} loading={authBusy} onClick={() => void handleLogout()}>退出</Button></Space></header>
      {error && <Alert className="admin-load-error" type="error" message={error} showIcon action={<Button onClick={() => void refresh()}>重试</Button>} />}
      {active === "practices" && <ReadingPracticePanel initialId={practiceId} />}
      {active === "users" && <div>
        <section className="admin-panel"><div className="admin-list-toolbar"><div><h2>账号列表 <span className="admin-count">{userTotal}</span></h2><p>查看用户状态，按需管理访问权限。</p></div><div className="admin-filters">
          <Input.Search aria-label="搜索用户名" placeholder="搜索用户名" allowClear onSearch={search => setUserQuery(query => ({ ...query, search: search.trim(), page: 1 }))} />
          <Select aria-label="用户状态" placeholder="全部状态" allowClear value={userQuery.status} options={[{ value: "active", label: "正常" }, { value: "banned", label: "已封禁" }]} onChange={status => setUserQuery(query => ({ ...query, status, page: 1 }))} />
        </div></div>
        <Table rowKey="id" columns={userColumns} dataSource={users} loading={loading} scroll={{ x: 780 }} locale={{ emptyText: "没有匹配的用户" }} pagination={{ current: userQuery.page, pageSize: userQuery.pageSize, total: userTotal, showSizeChanger: true, showTotal: total => `共 ${total} 位用户`, onChange: (page, pageSize) => setUserQuery(query => ({ ...query, page, pageSize })) }} />
        </section>
      </div>}
      <div hidden={active !== "announcements"}><AnnouncementComposer onPublished={() => { setHistoryQuery(query => ({ ...query, page: 1 })); setActive("history"); }} /></div>
      {active === "schedules" && <div><section className="admin-panel"><div className="admin-list-toolbar"><div><h2>任务列表 <span className="admin-count">{schedules.length}</span></h2><p>查看运行计划，或立即执行一次任务。</p></div><Button type="primary" icon={<PlusOutlined />} onClick={() => setScheduleOpen(true)}>新建任务</Button></div>
        <Table rowKey="id" columns={scheduleColumns} dataSource={schedules} loading={loading} scroll={{ x: 900 }} locale={{ emptyText: "还没有定时任务，点击“新建任务”开始" }} pagination={schedules.length > 10 ? { pageSize: 10 } : false} />
      </section></div>}
      {active === "history" && <div><section className="admin-panel"><div className="admin-list-toolbar"><div><h2>通知记录 <span className="admin-count">{notificationTotal}</span></h2><p>点击标题查看正文。列表按创建时间倒序排列。</p></div><Button icon={<PlusOutlined />} type="primary" onClick={() => setActive("announcements")}>发布公告</Button></div>
        <Table rowKey="id" columns={notificationColumns} dataSource={notifications} loading={loading} scroll={{ x: 900 }} locale={{ emptyText: "暂无通知记录" }} pagination={{ current: historyQuery.page, pageSize: historyQuery.pageSize, total: notificationTotal, showSizeChanger: true, showTotal: total => `共 ${total} 条记录`, onChange: (page, pageSize) => setHistoryQuery({ page, pageSize }) }} />
      </section></div>}
    </section>
    <UserActionConfirmModal open={pendingUserAction !== null} action={pendingUserAction?.action ?? "ban"} user={pendingUserAction?.user} loading={userActionLoading} onCancel={() => setPendingUserAction(null)} onConfirm={handleUserActionConfirm} />
    <Modal open={pendingAction !== null} title={pendingAction ? `确认${actionCopy[pendingAction.kind].label}` : "确认操作"}
      okText={pendingAction ? `确认${actionCopy[pendingAction.kind].label}` : "确认"} cancelText="取消"
      okButtonProps={{ danger: pendingAction?.kind !== "run" }} confirmLoading={actionBusy}
      onOk={() => void confirmAction()} onCancel={() => { if (!actionBusy) setPendingAction(null); }}
      closable={!actionBusy} maskClosable={!actionBusy} keyboard={!actionBusy} cancelButtonProps={{ disabled: actionBusy }}>
      <p className="admin-confirm-title">{pendingAction?.title}</p><p>{pendingAction && actionCopy[pendingAction.kind].description}</p>
      {actionError && <Alert type="error" message={actionError} showIcon />}
    </Modal>
    <Drawer open={detail !== null} title="通知详情" width={580} onClose={() => setDetail(null)}>
      {detail && <><Space wrap>{notificationStatus(detail.status)}<Tag>{categoryLabels[detail.category]}</Tag><Tag>{priorityLabels[detail.priority]}</Tag></Space><h2 className="admin-detail-title">{detail.title}</h2><p className="admin-muted">发布时间：{formatDate(detail.publishedAt)}</p><div className="admin-notification-body">{detail.body}</div></>}
    </Drawer>
    <ScheduleEditor open={scheduleOpen} onClose={() => setScheduleOpen(false)} onCreated={() => void refresh()} />
  </main>;
}
