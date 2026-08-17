import { useRef, useState } from "react";
import { Button, Input, Toast } from "antd-mobile";

type Credentials = {
  username: string;
  password: string;
};

type MobileLoginFormProps = {
  busy: boolean;
  onLogin: (values: Credentials) => Promise<void>;
  onRegister: (values: Credentials) => Promise<void>;
};

type FieldErrors = Partial<Record<"username" | "password" | "confirmPassword", string>>;

function validateCredentials(values: Credentials): FieldErrors {
  const errors: FieldErrors = {};

  if (!values.username.trim()) errors.username = "请输入用户名";
  else if (values.username.trim().length < 3) errors.username = "用户名至少3个字符";

  if (!values.password) errors.password = "请输入密码";
  else if (values.password.length < 6) errors.password = "密码至少6个字符";

  return errors;
}

export default function MobileLoginForm({
  busy,
  onLogin,
  onRegister,
}: MobileLoginFormProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const isBusy = busy || isSubmitting;

  const submitLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || busy) return;

    const nextErrors = validateCredentials({ username, password });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onLogin({ username: username.trim(), password });
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "登录失败，请稍后重试",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const submitRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current || busy) return;

    const nextErrors = validateCredentials({ username, password });
    if (!confirmPassword) nextErrors.confirmPassword = "请确认密码";
    else if (password !== confirmPassword) {
      nextErrors.confirmPassword = "两次输入的密码不一致";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      await onRegister({ username: username.trim(), password });
      setMode("login");
      setPassword("");
      setConfirmPassword("");
      setErrors({});
      Toast.show({ icon: "success", content: "注册成功，请登录" });
    } catch (error) {
      Toast.show({
        icon: "fail",
        content: error instanceof Error ? error.message : "注册失败，请稍后重试",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const updateField = (
    field: "username" | "password" | "confirmPassword",
    value: string,
  ) => {
    if (field === "username") setUsername(value);
    if (field === "password") setPassword(value);
    if (field === "confirmPassword") setConfirmPassword(value);
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const registerMode = mode === "register";

  return (
    <main aria-label="English World 移动端登录" className="mobile-login">
      <section className="mobile-login__surface" aria-labelledby="mobile-login-title">
        <div className="mobile-login__brand" aria-hidden="true">EW</div>
        <p className="mobile-login__eyebrow">English World</p>
        <h1 id="mobile-login-title">{registerMode ? "创建账号" : "欢迎回来"}</h1>
        <p className="mobile-login__description">
          {registerMode ? "用一个账号开始你的词汇学习。" : "登录后继续你的学习进度。"}
        </p>

        <div className="mobile-login__switch" aria-label="登录方式">
          <Button
            aria-pressed={!registerMode}
            className="mobile-login__switch-button"
            fill={!registerMode ? "solid" : "none"}
            onClick={() => {
              setMode("login");
              setErrors({});
            }}
          >
            登录账号
          </Button>
          <Button
            aria-pressed={registerMode}
            className="mobile-login__switch-button"
            fill={registerMode ? "solid" : "none"}
            onClick={() => {
              setMode("register");
              setErrors({});
            }}
          >
            注册账号
          </Button>
        </div>

        <form onSubmit={registerMode ? submitRegister : submitLogin} noValidate>
          <div className="mobile-login__field">
            <label htmlFor="mobile-login-username">用户名</label>
            <Input
              aria-describedby={errors.username ? "mobile-login-username-error" : undefined}
              aria-invalid={Boolean(errors.username)}
              id="mobile-login-username"
              disabled={isBusy}
              onChange={(value) => updateField("username", value)}
              placeholder="至少 3 个字符"
              value={username}
            />
            {errors.username && <span id="mobile-login-username-error" role="alert">{errors.username}</span>}
          </div>

          <div className="mobile-login__field">
            <label htmlFor="mobile-login-password">密码</label>
            <Input
              aria-describedby={errors.password ? "mobile-login-password-error" : undefined}
              aria-invalid={Boolean(errors.password)}
              id="mobile-login-password"
              disabled={isBusy}
              onChange={(value) => updateField("password", value)}
              placeholder="至少 6 个字符"
              type="password"
              value={password}
            />
            {errors.password && <span id="mobile-login-password-error" role="alert">{errors.password}</span>}
          </div>

          {registerMode && (
            <div className="mobile-login__field">
              <label htmlFor="mobile-login-confirm-password">确认密码</label>
              <Input
                aria-describedby={errors.confirmPassword ? "mobile-login-confirm-password-error" : undefined}
                aria-invalid={Boolean(errors.confirmPassword)}
                id="mobile-login-confirm-password"
                disabled={isBusy}
                onChange={(value) => updateField("confirmPassword", value)}
                placeholder="再次输入密码"
                type="password"
                value={confirmPassword}
              />
              {errors.confirmPassword && <span id="mobile-login-confirm-password-error" role="alert">{errors.confirmPassword}</span>}
            </div>
          )}

          <Button
            block
            className="mobile-login__submit"
            color="primary"
            disabled={isBusy}
            loading={isBusy}
            type="submit"
          >
            {registerMode ? "注册" : "登录"}
          </Button>
        </form>
      </section>
    </main>
  );
}
