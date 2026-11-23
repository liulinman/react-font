import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@font/api";
import { useAuth } from "@/contexts/AuthContext";
import {
  accountCaptcha,
  accountEmailCode,
  accountResetPassword,
  userRegister,
} from "@/server/user/user";
import "../englishWorldMobile/styles/mobile-tokens.css";
import "./Login.css";
import { readableError, validPassword } from "@/server/user/account-validation";
export type LocationState = {
  from?: { pathname?: string; search?: string; hash?: string };
};
export function isMobileLoginSurface(state: LocationState | null): boolean {
  return (
    !!state?.from?.pathname?.startsWith("/mobile") ||
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches)
  );
}
export function resolveAfterLoginPath(
  state: LocationState | null,
  mobile: boolean,
): string {
  const fallback = mobile ? "/mobile" : "/englishWorld/ai-listening";
  const from = state?.from;
  if (!from?.pathname) return fallback;
  const path = from.pathname;
  const full = `${path}${from.search ?? ""}${from.hash ?? ""}`;
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[\\\u0000-\u0020]/.test(full) ||
    /^\/login(?:[/?#]|$)/i.test(path)
  )
    return fallback;
  try {
    const decoded = decodeURIComponent(
      new URL(path, "https://freewing.invalid").pathname,
    );
    if (
      decoded.startsWith("//") ||
      decoded.includes("\\") ||
      /^\/login(?:[/?#]|$)/i.test(decoded)
    )
      return fallback;
  } catch {
    return fallback;
  }
  return full;
}
type Mode = "login" | "register" | "forgot" | "verify" | "reset" | "success";
export default function Login() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [captchaBusy, setCaptchaBusy] = useState(false);
  const [captcha, setCaptcha] = useState<{
    captchaId: string;
    imageDataUrl: string;
  } | null>(null);
  const [challenge, setChallenge] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [purpose, setPurpose] = useState<"register" | "reset">("register");
  const epoch = useRef(0);
  const lock = useRef(false);
  const captchaEpoch = useRef(0);
  const currentCaptcha = useRef("");
  const title = useRef<HTMLHeadingElement>(null);
  const { mutateAsync: getCaptcha } = useMutation(accountCaptcha);
  const { mutateAsync: sendCode } = useMutation(accountEmailCode);
  const { mutateAsync: register } = useMutation(userRegister);
  const { mutateAsync: reset } = useMutation(accountResetPassword);
  const target = resolveAfterLoginPath(
    location.state,
    isMobileLoginSurface(location.state),
  );
  async function refresh() {
    const n = ++captchaEpoch.current;
    setCaptchaBusy(true);
    setCode("");
    try {
      const result = await getCaptcha({
        previousCaptchaId: currentCaptcha.current || undefined,
      });
      if (n === captchaEpoch.current) {
        currentCaptcha.current = result.captchaId;
        setCaptcha(result);
      }
    } catch (e) {
      if (n === captchaEpoch.current) {
        setCaptcha(null);
        setError(readableError(e));
      }
    } finally {
      if (n === captchaEpoch.current) setCaptchaBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
    return () => {
      epoch.current++;
      captchaEpoch.current++;
    };
  }, []);
  useEffect(() => {
    if (auth.isAuthenticated) navigate(target, { replace: true });
  }, [auth.isAuthenticated, navigate, target]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(
      () => setCooldown((c) => Math.max(0, c - 1)),
      1000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    title.current?.focus();
  }, [mode]);
  function change(next: Mode) {
    if (lock.current && mode === "login") return;
    epoch.current++;
    setMode(next);
    setError("");
    setNotice("");
    setPassword("");
    setConfirm("");
    setEmailCode("");
    setCode("");
    setVisible(false);
    if (["login", "register", "forgot"].includes(next)) void refresh();
  }
  async function send() {
    if (!captcha || captchaBusy) throw new Error("请先刷新图形验证码");
    const result = await sendCode({
      purpose: mode === "register" ? "register" : "reset",
      email: email.trim().toLowerCase(),
      captchaId: captcha.captchaId,
      captchaCode: code,
    });
    return result;
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current) return;
    setError("");
    setNotice("");
    if ((mode === "register" || mode === "reset") && !validPassword(password)) {
      setError("密码应为 8～64 个字符");
      document.getElementById("account-register-password")?.focus();
      return;
    }
    if ((mode === "register" || mode === "reset") && password !== confirm) {
      setError("两次输入的密码不一致");
      document.getElementById("account-register-confirm-password")?.focus();
      return;
    }
    if (
      mode === "register" &&
      !/^[\p{Script=Han}a-zA-Z0-9_]{3,20}$/u.test(username.trim())
    ) {
      setError("用户名为 3～20 位字母、数字、下划线或汉字");
      document.getElementById("account-register-username")?.focus();
      return;
    }
    lock.current = true;
    setBusy(true);
    const n = epoch.current;
    try {
      if (mode === "login") {
        if (!captcha) throw new Error("请刷新图形验证码");
        await auth.login(username.trim(), password, {
          captchaId: captcha.captchaId,
          captchaCode: code,
        });
        if (n === epoch.current) navigate(target, { replace: true });
      } else if (mode === "register" || mode === "forgot") {
        const result = await send();
        if (n !== epoch.current) return;
        setEmail(email.trim().toLowerCase());
        setPurpose(mode === "register" ? "register" : "reset");
        setChallenge(result.challengeId);
        setCooldown(result.retryAfter);
        setMode(mode === "register" ? "verify" : "reset");
        setCode("");
        setNotice("如果邮箱可用于此操作，验证码将发送至该邮箱，请查收。");
        void refresh();
      } else if (mode === "verify") {
        await register({
          username: username.trim(),
          email,
          password,
          challengeId: challenge,
          emailCode,
        });
        if (n !== epoch.current) return;
        setPassword("");
        setConfirm("");
        setMode("success");
        setNotice("注册成功，请使用新账号登录。");
      } else if (mode === "reset") {
        await reset({ email, password, challengeId: challenge, emailCode });
        if (n !== epoch.current) return;
        setPassword("");
        setConfirm("");
        setMode("success");
        setNotice("密码已重置，请重新登录。所有学习设备已退出。");
      }
    } catch (e) {
      if (n === epoch.current) {
        setError(readableError(e));
        if (["login", "register", "forgot"].includes(mode)) void refresh();
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function resend() {
    if (lock.current || cooldown > 0) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const n = epoch.current;
    try {
      if (!captcha) throw new Error("请刷新图形验证码");
      const result = await sendCode({
        purpose,
        email,
        captchaId: captcha.captchaId,
        captchaCode: code,
      });
      if (n === epoch.current) {
        setChallenge(result.challengeId);
        setCooldown(result.retryAfter);
        setNotice("如果邮箱可用于此操作，验证码将发送至该邮箱，请查收。");
        setEmailCode("");
        void refresh();
      }
    } catch (e) {
      if (n === epoch.current) {
        setError(readableError(e));
        void refresh();
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function field(
    label: string,
    value: string,
    set: (v: string) => void,
    options: {
      type?: string;
      auto?: string;
      cy?: string;
      pattern?: string;
    } = {},
  ) {
    const id = `account-${options.cy ?? label}`;
    return (
      <div className="field">
        <label htmlFor={id}>{label}</label>
        <div className={options.type === "password" ? "input-wrap" : ""}>
          <input
            id={id}
            data-cy={options.cy}
            value={value}
            onChange={(e) => set(e.target.value)}
            type={
              options.type === "password" && visible
                ? "text"
                : (options.type ?? "text")
            }
            autoComplete={options.auto}
            required
            disabled={busy}
            pattern={options.pattern}
          />
          {options.type === "password" && (
            <button
              className="eye"
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={`${visible ? "隐藏" : "显示"}${label}`}
            >
              {visible ? "隐藏" : "显示"}
            </button>
          )}
        </div>
      </div>
    );
  }
  const captchaField = (
    <div className="field">
      <label htmlFor="account-captcha">图形验证码</label>
      <div className="captcha-row">
        <input
          id="account-captcha"
          data-cy="login-captcha"
          required={["login", "register", "forgot"].includes(mode)}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          autoComplete="off"
          disabled={busy || captchaBusy}
        />
        <div className="captcha-image">
          {captcha && !captchaBusy && (
            <img src={captcha.imageDataUrl} alt="图形验证码" />
          )}
        </div>
        <button
          type="button"
          className="refresh"
          aria-label="刷新图形验证码"
          data-cy="account-captcha-refresh"
          disabled={busy || captchaBusy}
          onClick={() => void refresh()}
        >
          ↻
        </button>
      </div>
    </div>
  );
  return (
    <div
      className={`account-access ${isMobileLoginSurface(location.state) ? "account-access-mobile" : ""}`}
    >
      <header className="site-header">
        <a className="brand" href="/login">
          <img src="/brand/freewing-symbol.png" alt="" />
          <span>Freewing</span>
        </a>
        <span className="header-note">让英语学习，自由发生。</span>
      </header>
      <main className="workspace">
        <section className="form-column" aria-label="账号操作">
          {(mode === "login" || mode === "register") && (
            <nav className="switcher">
              <button
                type="button"
                className={mode === "login" ? "active" : ""}
                disabled={busy && mode === "login"}
                onClick={() => change("login")}
              >
                登录账号
              </button>
              <button
                type="button"
                className={mode === "register" ? "active" : ""}
                disabled={busy && mode === "login"}
                onClick={() => change("register")}
              >
                注册账号
              </button>
            </nav>
          )}
          {["forgot", "verify", "reset"].includes(mode) && (
            <button
              className="back"
              type="button"
              disabled={busy && mode === "login"}
              onClick={() => change(mode === "verify" ? "register" : "login")}
            >
              {mode === "verify" ? "返回修改" : "返回登录"}
            </button>
          )}
          <h1 ref={title} tabIndex={-1}>
            {
              {
                login: "欢迎回来",
                register: "创建你的账号",
                forgot: "找回密码",
                verify: "验证你的邮箱",
                reset: "重置密码",
                success: "操作成功",
              }[mode]
            }
          </h1>
          <p className="subtitle">
            {mode === "login"
              ? "接着上次，继续学。"
              : mode === "register"
                ? "先填写账号信息，再验证邮箱。"
                : mode === "forgot"
                  ? "通过注册邮箱验证身份，设置新密码。"
                  : mode === "success"
                    ? notice
                    : `验证码已发送请求至 ${email}`}
          </p>
          {error && (
            <div className="message" role="alert">
              {error}
            </div>
          )}
          {notice && mode !== "success" && (
            <div className="message notice" role="status">
              {notice}
            </div>
          )}
          {mode === "success" ? (
            <button
              className="primary"
              disabled={busy}
              onClick={() => change("login")}
            >
              返回登录
            </button>
          ) : (
            <form onSubmit={submit}>
              {(mode === "login" || mode === "register") &&
                field("用户名", username, setUsername, {
                  auto: "username",
                  cy: mode === "login" ? "login-username" : "register-username",
                })}
              {(mode === "register" || mode === "forgot") &&
                field("邮箱", email, setEmail, {
                  type: "email",
                  auto: "email",
                  cy: "register-email",
                })}
              {(mode === "verify" || mode === "reset") &&
                field("邮箱验证码", emailCode, setEmailCode, {
                  auto: "one-time-code",
                  pattern: "[0-9]{6}",
                  cy: "email-code",
                })}
              {(mode === "login" || mode === "register" || mode === "reset") &&
                field(
                  mode === "reset" ? "新密码" : "密码",
                  password,
                  setPassword,
                  {
                    type: "password",
                    auto:
                      mode === "login" ? "current-password" : "new-password",
                    cy:
                      mode === "login" ? "login-password" : "register-password",
                  },
                )}
              {(mode === "register" || mode === "reset") && (
                <>
                  {field("确认密码", confirm, setConfirm, {
                    type: "password",
                    auto: "new-password",
                    cy: "register-confirm-password",
                  })}
                  <p className="field-note">
                    8～64 个字符，支持空格与粘贴，无需特定组合。
                  </p>
                </>
              )}
              {["login", "register", "forgot"].includes(mode) && captchaField}
              {(mode === "verify" || mode === "reset") && (
                <>
                  <p className="field-note">
                    验证码 10 分钟内有效，请勿透露给他人。
                  </p>
                  {cooldown <= 0 && captchaField}
                  <div className="resend-row">
                    <span>未收到邮件？</span>
                    <button
                      className="link-button"
                      type="button"
                      disabled={busy || cooldown > 0}
                      onClick={() => void resend()}
                    >
                      {cooldown > 0 ? `${cooldown} 秒后重发` : "重新发送验证码"}
                    </button>
                  </div>
                </>
              )}
              {mode === "login" && (
                <div className="field-bottom">
                  <button
                    type="button"
                    className="link-button"
                    disabled={busy && mode === "login"}
                    onClick={() => change("forgot")}
                  >
                    忘记密码？
                  </button>
                </div>
              )}
              <button
                className="primary"
                data-cy={mode === "login" ? "login-submit" : "register-submit"}
                type="submit"
                disabled={
                  busy ||
                  (["login", "register", "forgot"].includes(mode) &&
                    (!captcha || captchaBusy))
                }
              >
                {busy
                  ? "正在处理…"
                  : {
                      login: "登录",
                      register: "发送邮箱验证码",
                      forgot: "发送验证码",
                      verify: "验证并创建账号",
                      reset: "重置密码",
                      success: "",
                    }[mode]}
              </button>
            </form>
          )}
        </section>
        <aside className="companion" aria-label="帮助与学习">
          <img
            src="/brand/freewing-logo-transparent.png"
            className="brand-art"
            alt="Freewing 品牌图案"
          />
          <div className="companion-copy">
            <h2>接着上次，继续学。</h2>
            <p>你的词库、阅读和学习记录，都属于同一个账号。</p>
          </div>
        </aside>
      </main>
      <footer className="page-footer">
        Freewing · Learn freely. Explore the world.
      </footer>
    </div>
  );
}
