import { useEffect, useRef, useState } from "react";
import { Alert, Button, Checkbox, Empty, Form, Input, InputNumber, Modal, Tag, Typography } from "antd";
import { CopyOutlined, PlusOutlined, ReloadOutlined, ApiOutlined } from "@ant-design/icons";
import { getApiBaseUrl } from "@font/api";
import "./McpAccessCard.css";

const scopeOptions = [
  { label: "查询单词", value: "words:read" },
  { label: "新增单词", value: "words:create" },
  { label: "覆盖更新", value: "words:update" },
  { label: "删除单词", value: "words:delete" },
  { label: "查询笔记", value: "notes:read" },
  { label: "新增笔记", value: "notes:create" },
  { label: "修改笔记", value: "notes:update" },
  { label: "创建文件夹", value: "notes:folders:create" },
];
type Token = { id: string; name: string; scopes: string[]; createdAt: string; expiresAt: string; revokedAt?: string | null; lastUsedAt?: string | null };
type Audit = { id: string; action: string; outcome?: string; createdAt: string; tokenName?: string; tokenId?: string | null };
const actionLabels: Record<string, string> = {
  "token:create": "创建授权", "token:revoke": "撤销授权", "token.create": "创建授权", "token.revoke": "撤销授权",
  query_words: "查询单词", get_word: "查看单词", create_word: "新增单词",
  preview_update_word: "预览覆盖", confirm_update_word: "确认覆盖",
  preview_delete_word: "预览删除", confirm_delete_word: "确认删除",
  query_notes: "查询笔记", get_note: "查看笔记", list_note_folders: "查看笔记文件夹", create_note: "新增笔记",
  preview_update_note: "预览修改笔记", confirm_update_note: "确认修改笔记",
  preview_create_note_folder: "预览创建文件夹", confirm_create_note_folder: "确认创建文件夹",
};
const outcomeLabels: Record<string, string> = { success: "成功", forbidden: "权限不足", conflict: "内容冲突", expired: "已过期", not_found: "不存在", error: "失败", failure: "失败", operation_failed: "失败", invalid_confirmation: "确认无效", revoked: "已撤销" };
type Info = { endpoint: string; transport: string; auth: string };
export async function mcpAccessFetch<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}/mcp-access${path}`, {
    method: body === undefined ? "GET" : "POST", credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json().catch(() => null);
  // Never reflect server text: an upstream error must not expose a credential.
  if (!response.ok || (result?.code !== undefined && result.code !== 200)) throw new Error(response.status === 401 ? "登录已失效，请重新登录。" : "操作失败，请检查连接后重试。");
  return result?.code === 200 ? result.data : result;
}
const date = (value?: string | null) => value ? new Date(value).toLocaleString("zh-CN", { hour12: false }) : "尚未使用";
const active = (token: Token) => !token.revokedAt && new Date(token.expiresAt).getTime() > Date.now();

export function McpAccessCard() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);
  const [info, setInfo] = useState<Info>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<{ target: string; failed: boolean; text: string }>();
  const copyAttempt = useRef(0);
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState("");
  const [revoking, setRevoking] = useState<Token>();
  const [form] = Form.useForm();
  const load = async () => {
    setLoading(true); setError("");
    try {
      const [list, log, connection] = await Promise.all([
        mcpAccessFetch<{ items: Token[] }>("/tokens"), mcpAccessFetch<{ items: Audit[] }>("/audit"), mcpAccessFetch<Info>("/info"),
      ]);
      setTokens(list.items); setAudit(log.items); setInfo(connection);
    } catch { setError("授权信息加载失败，请刷新重试。"); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  const copy = async (value: string, target: string) => {
    const attempt = ++copyAttempt.current;
    setCopyFeedback(undefined);
    try {
      await navigator.clipboard.writeText(value);
      if (attempt === copyAttempt.current) setCopyFeedback({ target, failed: false, text: "已复制" });
    } catch {
      if (attempt === copyAttempt.current) setCopyFeedback({ target, failed: true, text: "复制失败，请选中文本手动复制。" });
    }
  };
  const copyStatus = (target: string) => <span className={`mcp-access-copy-feedback${copyFeedback?.target === target && copyFeedback.failed ? " is-error" : ""}`} role="status" aria-live="polite">{copyFeedback?.target === target ? copyFeedback.text : ""}</span>;
  const closeSecret = () => { ++copyAttempt.current; setCopyFeedback(undefined); setSecret(""); };
  const create = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setBusy(true); setError("");
    try {
      const result = await mcpAccessFetch<{ token: string; item: Token }>("/tokens", values);
      setCreating(false); form.resetFields(); setSecret(result.token);
      await load();
    } catch { setError("创建失败。请刷新授权列表确认结果后再重试，避免重复创建。"); }
    finally { setBusy(false); }
  };
  const revoke = async () => {
    if (!revoking) return;
    setBusy(true); setError("");
    try { await mcpAccessFetch(`/tokens/${encodeURIComponent(revoking.id)}/revoke`, {}); setRevoking(undefined); await load(); setNotice("授权已撤销"); }
    catch { setError("撤销失败，请刷新列表确认授权状态后重试。"); }
    finally { setBusy(false); }
  };
  const config = info ? JSON.stringify({ mcpServers: { englishWorld: { type: "http", url: info.endpoint, headers: { Authorization: "Bearer <填入创建时保存的密钥>" } } } }, null, 2) : "";
  return <section className="mcp-access-card" aria-labelledby="mcp-access-title">
    <div className="mcp-access-heading"><div><h2 id="mcp-access-title"><ApiOutlined /> MCP 授权管理</h2><p>让支持 MCP 的 AI 客户端管理你的词库和知识笔记，每个授权独立控制权限。</p></div><div className="mcp-access-actions"><Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button><Button type="primary" icon={<PlusOutlined />} onClick={() => { setError(""); setCreating(true); }}>创建授权</Button></div></div>
    {error && <Alert type="error" showIcon message={error} />}
    {notice && <Alert type="success" showIcon message={notice} closable afterClose={() => setNotice("")} />}
    {info && <div className="mcp-access-connection"><span className="mcp-access-label">连接地址 · Streamable HTTP · Bearer</span><div><code>{info.endpoint}</code><span className="mcp-access-copy-action"><Button icon={<CopyOutlined />} onClick={() => void copy(info.endpoint, "endpoint")}>复制地址</Button>{copyStatus("endpoint")}</span></div><details><summary>查看客户端配置示例</summary><p>适用于支持手动 Bearer 密钥的客户端；具体配置字段以客户端说明为准。</p><pre>{config}</pre><div className="mcp-access-copy-action"><Button onClick={() => void copy(config, "config")}>复制配置模板</Button>{copyStatus("config")}</div></details></div>}
    <div aria-busy={loading} className="mcp-access-list">
      {!loading && !tokens.length && <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="还没有授权。先创建一个只读授权，即可连接 AI 客户端。" />}
      {tokens.map(token => <article className="mcp-access-token" key={token.id}><div className="mcp-access-token-main"><div className="mcp-access-token-title"><strong>{token.name}</strong><Tag color={active(token) ? "green" : "default"}>{token.revokedAt ? "已撤销" : active(token) ? "有效" : "已过期"}</Tag></div><div className="mcp-access-scopes">{token.scopes.map(scope => <Tag key={scope}>{scopeOptions.find(option => option.value === scope)?.label || scope}</Tag>)}</div><div className="mcp-access-meta"><span>创建 {date(token.createdAt)}</span><span>到期 {date(token.expiresAt)}</span><span>最近使用 {date(token.lastUsedAt)}</span></div></div><Button danger disabled={!active(token)} onClick={() => setRevoking(token)}>撤销授权</Button></article>)}
    </div>
    <details className="mcp-access-audit"><summary>最近访问记录{audit.length ? ` · ${audit.length} 条` : ""}</summary><p>仅展示操作摘要，不记录密钥、笔记或单词正文。</p>{!audit.length ? <p>暂无访问记录</p> : <div className="mcp-access-audit-list">{audit.map(row => <div key={row.id}><span>{row.tokenName || "MCP 客户端"}{row.tokenId && <code className="mcp-access-token-id" title={row.tokenId}> #{row.tokenId.slice(0, 8)}</code>} · {actionLabels[row.action] || "MCP 操作"}</span><span>{outcomeLabels[row.outcome || ""] || "未完成"} · {date(row.createdAt)}</span></div>)}</div>}</details>
    <Modal title="创建 MCP 授权" open={creating} onCancel={() => !busy && setCreating(false)} onOk={() => void create()} confirmLoading={busy} okText="创建授权" cancelText="取消" destroyOnHidden maskClosable={!busy}>
      {error && <Alert type="error" showIcon message={error} />}
      <Form form={form} layout="vertical" initialValues={{ scopes: ["words:read"], expiresInDays: 30 }} className="mcp-access-create">
        <Form.Item name="name" label="授权名称" rules={[{ required: true, whitespace: true, message: "为这个客户端起个名字" }, { max: 60, message: "最多 60 个字符" }]}><Input placeholder="例如：我的 AI 助手" maxLength={60} /></Form.Item>
        <Form.Item name="scopes" label="允许操作" rules={[{ type: "array", min: 1, required: true, message: "至少选择一项权限" }]}><Checkbox.Group options={scopeOptions} /></Form.Item>
        <p className="mcp-access-help">默认仅查询单词。笔记权限单独选择；已有合适文件夹直接归类，新建文件夹和修改笔记须先展示预览并征得你确认。单词更新、删除也需预览确认。</p>
        <Form.Item name="expiresInDays" label="有效天数" rules={[{ required: true, type: "number", min: 1, max: 365, message: "请输入 1～365 天" }]}><InputNumber min={1} max={365} precision={0} /></Form.Item>
      </Form>
    </Modal>
    {!!secret && <Modal title="保存你的授权密钥" open={!!secret} onCancel={closeSecret} footer={<Button type="primary" onClick={closeSecret}>我已保存，关闭</Button>} destroyOnHidden maskClosable={false}>
      <Alert type="warning" showIcon message="密钥仅在本次显示，关闭后无法再次查看。请妥善保存，不要分享给他人。" />
      <Input.TextArea aria-label="新授权密钥" value={secret} readOnly autoSize={{ minRows: 3 }} className="mcp-access-secret" />
      <div className="mcp-access-copy-action"><Button icon={<CopyOutlined />} onClick={() => void copy(secret, "secret")}>复制密钥</Button>{copyStatus("secret")}</div><Typography.Paragraph type="secondary">将它填写到客户端的 Bearer Token 中。遗失后请撤销旧授权，再创建新授权。</Typography.Paragraph>
    </Modal>}
    <Modal title="撤销这个授权？" open={!!revoking} onCancel={() => !busy && setRevoking(undefined)} onOk={() => void revoke()} confirmLoading={busy} okButtonProps={{ danger: true }} okText="确认撤销" cancelText="取消">{error && <Alert type="error" showIcon message={error} />}<p>撤销「{revoking?.name}」后，该客户端将无法继续访问你的词库和知识笔记。已有内容不会被删除。</p></Modal>
  </section>;
}
