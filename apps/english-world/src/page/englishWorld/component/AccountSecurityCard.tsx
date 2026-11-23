import { useRef, useState } from "react";
import { Avatar, Button, Input, Modal } from "antd";
import { CameraOutlined, EditOutlined, LockOutlined } from "@ant-design/icons";
import { useMutation } from "@font/api";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { accountChangePassword } from "@/server/user/user";
import { readableError, validPassword } from "@/server/user/account-validation";
import "./AccountSecurityCard.css";
export function AccountSecurityCard() {
  const { user, logout, updateAvatar, updateDisplayName } = useAuth();
  const navigate = useNavigate();
  const { mutateAsync: changePassword } = useMutation(accountChangePassword);
  const avatarInput = useRef<HTMLInputElement>(null);
  const avatarPending = useRef(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarFeedback, setAvatarFeedback] = useState<{ error?: string; saved?: boolean }>({});
  async function changeAvatar(file: File | undefined) {
    if (!file || avatarPending.current) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setAvatarFeedback({ error: "请选择 5 MB 以内的 PNG、JPG 或 WebP 图片" });
      return;
    }
    avatarPending.current = true;
    setAvatarBusy(true);
    setAvatarFeedback({});
    try {
      await updateAvatar(file);
      setAvatarFeedback({ saved: true });
    } catch (error) {
      setAvatarFeedback({ error: readableError(error) });
    } finally {
      avatarPending.current = false;
      setAvatarBusy(false);
    }
  }
  const displayName = user?.displayName || user?.username || "";
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [nameBusy, setNameBusy] = useState(false);
  const [nameError, setNameError] = useState("");
  const [nameSaved, setNameSaved] = useState(false);
  async function saveName() {
    if (nameDraft === null || nameBusy) return;
    const name = nameDraft.trim();
    if (!name || Array.from(name).length > 32) {
      setNameError("请输入 1～32 个字符的昵称");
      return;
    }
    setNameBusy(true);
    setNameError("");
    try {
      await updateDisplayName(name);
      setNameDraft(null);
      setNameSaved(true);
    } catch (error) {
      setNameError(readableError(error));
    } finally {
      setNameBusy(false);
    }
  }
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    setError("");
    if (!validPassword(password)) {
      setError("密码应为 8～64 个字符");
      document.getElementById("security-新密码")?.focus();
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致");
      document.getElementById("security-确认新密码")?.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    try {
      await changePassword({ currentPassword: current, password });
      setCurrent("");
      setPassword("");
      setConfirm("");
      setDone(true);
      try {
        await logout();
      } finally {
        navigate("/login", { replace: true });
      }
    } catch (e) {
      if (!done) setError(readableError(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section aria-label="账号安全" className="account-security settings-card">
      {user && (
        <>
          <h2>个人资料</h2>
          <div className="account-avatar-controls">
            <Avatar src={user.avatar} size={56} aria-hidden="true">
              {Array.from(displayName)[0]?.toUpperCase()}
            </Avatar>
            <input
              ref={avatarInput}
              aria-label="更换头像"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              disabled={avatarBusy}
              onChange={(event) => {
                const file = event.currentTarget.files?.[0];
                event.currentTarget.value = "";
                void changeAvatar(file);
              }}
            />
            <div className="settings-profile-name">
              <strong>{displayName}</strong>
              <p>登录用户名 · {user.username}{user.email ? ` · ${user.email}` : ""}</p>
            </div>
            <div className="settings-actions">
              <Button icon={<CameraOutlined />} loading={avatarBusy} onClick={() => avatarInput.current?.click()}>
                更换头像
              </Button>
              <Button icon={<EditOutlined />} onClick={() => {
                setNameError("");
                setNameSaved(false);
                setNameDraft(displayName);
              }}>
                修改昵称
              </Button>
            </div>
          </div>
          {avatarFeedback.error && <p role="alert">{avatarFeedback.error}</p>}
          {avatarFeedback.saved && <p role="status">头像已更新</p>}
          {nameSaved && <p role="status">昵称已更新</p>}
          <Modal
            title="修改昵称"
            open={nameDraft !== null}
            okText="保存昵称"
            cancelText="取消"
            confirmLoading={nameBusy}
            closable={!nameBusy}
            maskClosable={!nameBusy}
            onCancel={() => { if (!nameBusy) setNameDraft(null); }}
            onOk={() => void saveName()}
          >
            <label htmlFor="settings-display-name">昵称</label>
            <Input
              id="settings-display-name"
              value={nameDraft ?? ""}
              disabled={nameBusy}
              onChange={(event) => setNameDraft(event.target.value)}
              onPressEnter={() => void saveName()}
            />
            <p className="settings-description">用于个人资料和管理端选人。登录时继续使用原用户名。</p>
            {nameError && <p role="alert">{nameError}</p>}
          </Modal>
        </>
      )}
      <div className="settings-card-row settings-password-row">
        <div>
          <h2><LockOutlined aria-hidden /> 账号安全</h2>
          <p>修改密码后，所有学习设备将退出，需要重新登录。</p>
        </div>
        {!done && !open && <Button onClick={() => setOpen(true)}>修改密码</Button>}
      </div>
      {done ? (
        <p role="status">密码已修改，所有学习设备已退出。请重新登录。</p>
      ) : open ? (
        <form onSubmit={submit}>
          {error && <p role="alert">{error}</p>}
          {[
            ["当前密码", current, setCurrent, "current-password"],
            ["新密码", password, setPassword, "new-password"],
            ["确认新密码", confirm, setConfirm, "new-password"],
          ].map(([label, value, set, auto]) => (
            <div className="account-security-field" key={label as string}>
              <label htmlFor={`security-${label}`}>{label as string}</label>
              <div className="account-security-input">
                <input
                  id={`security-${label}`}
                  type={visible[label as string] ? "text" : "password"}
                  required
                  autoComplete={auto as string}
                  value={value as string}
                  disabled={busy}
                  onChange={(e) => (set as (v: string) => void)(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={`${visible[label as string] ? "隐藏" : "显示"}${label}`}
                  onClick={() =>
                    setVisible((v) => ({
                      ...v,
                      [label as string]: !v[label as string],
                    }))
                  }
                >
                  {visible[label as string] ? "隐藏" : "显示"}
                </button>
              </div>
            </div>
          ))}
          <p>新密码 8～64 个字符，支持空格与粘贴。</p>
          <Button type="primary" htmlType="submit" disabled={busy}>
            {busy ? "正在保存…" : "保存新密码"}
          </Button>{" "}
          <Button
            htmlType="button"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              setCurrent("");
              setPassword("");
              setConfirm("");
              setError("");
              setVisible({});
            }}
          >
            取消
          </Button>
        </form>
      ) : null}
    </section>
  );
}
