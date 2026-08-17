import React, { useCallback, useEffect, useRef, useState } from "react";
import { Form, Input, Button, Card, Tabs, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MobileLoginForm from "./MobileLoginForm";
import "../englishWorldMobile/styles/mobile-tokens.css";
import "./Login.css";

const { TabPane } = Tabs;
const DEFAULT_AFTER_LOGIN_PATH = "/englishWorld/recite";

const LOGIN_POINTS = [
  {
    label: "每日复习",
    detail: "用短而稳定的节奏巩固高价值词汇。",
    tone: "blue",
  },
  {
    label: "AI 语境实验室",
    detail: "把单词放进文章、问题和真实语境里。",
    tone: "teal",
  },
  {
    label: "记忆地图",
    detail: "看见每个词从陌生到熟练的学习轨迹。",
    tone: "violet",
  },
];

export type LocationState = {
  from?: {
    pathname?: string;
    search?: string;
    hash?: string;
  };
};

export function isMobileLoginSurface(state: LocationState | null): boolean {
  const from = state?.from?.pathname ?? "";
  if (from.startsWith("/mobile")) return true;

  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(display-mode: standalone)").matches;
}

export function resolveAfterLoginPath(
  state: LocationState | null,
  mobileSurface: boolean,
): string {
  const from = state?.from;
  if (from?.pathname) {
    return `${from.pathname}${from.search ?? ""}${from.hash ?? ""}`;
  }

  return mobileSurface ? "/mobile" : DEFAULT_AFTER_LOGIN_PATH;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const hasNavigatedRef = useRef(false);
  const locationState = location.state as LocationState | null;
  const mobileSurface = isMobileLoginSurface(locationState);
  const afterLoginPath = resolveAfterLoginPath(locationState, mobileSurface);

  const navigateAfterLogin = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    navigate(afterLoginPath, { replace: true });
  }, [afterLoginPath, navigate]);

  // 如果已登录，跳转到原页面或首页
  useEffect(() => {
    if (isAuthenticated) {
      navigateAfterLogin();
    }
  }, [isAuthenticated, navigateAfterLogin]);

  const authenticate = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      navigateAfterLogin();
    } finally {
      setLoading(false);
    }
  };

  // 登录表单提交
  const handleLogin = async (values: {
    username: string;
    password: string;
  }) => {
    try {
      await authenticate(values);
    } catch (error) {
      // 错误已在 AuthContext 中处理
      console.error("Login failed:", error);
    }
  };

  const handleMobileLogin = async (values: { username: string; password: string }) => {
    await authenticate(values);
  };

  // 注册表单提交
  const handleRegister = async (values: {
    username: string;
    password: string;
    confirmPassword: string;
    avatar?: string;
  }) => {
    if (values.password !== values.confirmPassword) {
      message.error("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    try {
      await register(values.username, values.password, values.avatar);
      // 注册成功后切换到登录标签页
      setActiveTab("login");
      message.success("注册成功，请登录");
    } catch (error) {
      // 错误已在 AuthContext 中处理
      console.error("Register failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileRegister = async (values: {
    username: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      await register(values.username, values.password);
    } finally {
      setLoading(false);
    }
  };

  if (mobileSurface) {
    return (
      <MobileLoginForm
        busy={loading}
        onLogin={handleMobileLogin}
        onRegister={handleMobileRegister}
      />
    );
  }

  return (
    <div className="login-container login-workspace">
      <div className="login-ambient-shape login-ambient-shape-blue" aria-hidden="true" />
      <div className="login-ambient-shape login-ambient-shape-teal" aria-hidden="true" />
      <div className="login-constellation" aria-hidden="true">
        <span className="login-constellation-dot login-constellation-dot-one" />
        <span className="login-constellation-dot login-constellation-dot-two" />
        <span className="login-constellation-dot login-constellation-dot-three" />
        <span className="login-constellation-line login-constellation-line-one" />
        <span className="login-constellation-line login-constellation-line-two" />
      </div>
      <section className="login-hero" aria-label="英语世界登录">
        <div className="login-copy">
          <div className="login-brand-lockup">
            <span className="login-brand-mark" aria-hidden="true">
              EW
            </span>
            <span>
              <strong>English World</strong>
              <small>AI vocabulary learning</small>
            </span>
          </div>
          <div className="login-kicker">PERSONAL LEARNING SPACE</div>
          <h1>把每个单词点亮成星图</h1>
          <p>
            登录后进入你的学习空间，用更轻松的节奏积累词汇，把每一次复习都变成看得见的进步。
          </p>
          <div className="login-copy-points">
            {LOGIN_POINTS.map((item) => (
              <div className="login-copy-point" key={item.label}>
                <span
                  aria-hidden="true"
                  className={`login-copy-point-icon login-copy-point-icon-${item.tone}`}
                />
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </span>
              </div>
            ))}
          </div>
        </div>

        <Card className="login-card">
          <div className="login-card-header">
            <span className="login-card-mark" />
            <div>
              <div className="login-title">欢迎回来</div>
              <div className="login-subtitle">进入你的个人词汇空间</div>
            </div>
          </div>
          <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
            <TabPane tab="登录" key="login">
              <Form
                name="login"
                className="login-form login-form-compact"
                onFinish={handleLogin}
                autoComplete="off"
                layout="vertical"
                size="large"
              >
                <Form.Item
                  name="username"
                  rules={[
                    { required: true, message: "请输入用户名" },
                    { min: 3, message: "用户名至少3个字符" },
                  ]}
                >
                  <Input
                    data-cy="login-username"
                    prefix={<UserOutlined />}
                    placeholder="用户名（至少3个字符）"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: "请输入密码" },
                    { min: 6, message: "密码至少6个字符" },
                  ]}
                >
                  <Input.Password
                    data-cy="login-password"
                    prefix={<LockOutlined />}
                    placeholder="密码（至少6个字符）"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="login-form-submit"
                    data-cy="login-submit"
                    block
                    loading={loading}
                  >
                    进入词汇星域
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane tab="注册" key="register">
              <Form
                name="register"
                className="login-form login-form-compact"
                onFinish={handleRegister}
                autoComplete="off"
                layout="vertical"
                size="large"
              >
                <Form.Item
                  name="username"
                  rules={[
                    { required: true, message: "请输入用户名" },
                    { min: 3, max: 20, message: "用户名长度为3-20个字符" },
                  ]}
                >
                  <Input
                    data-cy="register-username"
                    prefix={<UserOutlined />}
                    placeholder="用户名（3-20个字符）"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: "请输入密码" },
                    { min: 6, message: "密码至少6个字符" },
                  ]}
                >
                  <Input.Password
                    data-cy="register-password"
                    prefix={<LockOutlined />}
                    placeholder="密码（至少6个字符）"
                  />
                </Form.Item>

                <Form.Item
                  name="confirmPassword"
                  dependencies={["password"]}
                  rules={[
                    { required: true, message: "请确认密码" },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue("password") === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error("两次输入的密码不一致"));
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    data-cy="register-confirm-password"
                    prefix={<LockOutlined />}
                    placeholder="确认密码"
                  />
                </Form.Item>

                <Form.Item name="avatar">
                  <Input
                    data-cy="register-avatar"
                    placeholder="头像 URL（可选）"
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    className="login-form-submit"
                    data-cy="register-submit"
                    block
                    loading={loading}
                  >
                    创建星域账号
                  </Button>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>
          <div className="login-card-footer">
            <span className="login-card-footer-dot" aria-hidden="true" />
            <span>你的学习进度会安全地保存在这里</span>
          </div>
        </Card>
      </section>
      <div className="login-footer">English World · Learn with context</div>
    </div>
  );
};

export default Login;
