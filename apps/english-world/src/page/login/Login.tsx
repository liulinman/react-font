import React, { useState, useEffect } from "react";
import { Form, Input, Button, Card, Tabs, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import "./Login.css";

const { TabPane } = Tabs;
const DEFAULT_AFTER_LOGIN_PATH = "/englishWorld/recite";

type LocationState = {
  from?: {
    pathname?: string;
  };
};

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");

  // 如果已登录，跳转到原页面或首页
  useEffect(() => {
    if (isAuthenticated) {
      const from =
        (location.state as LocationState | null)?.from?.pathname ||
        DEFAULT_AFTER_LOGIN_PATH;
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  // 登录表单提交
  const handleLogin = async (values: {
    username: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      const from =
        (location.state as LocationState | null)?.from?.pathname ||
        DEFAULT_AFTER_LOGIN_PATH;
      navigate(from, { replace: true });
    } catch (error) {
      // 错误已在 AuthContext 中处理
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="login-container">
      <Card className="login-card" title="英语世界 · AI 单词">
        <Tabs activeKey={activeTab} onChange={setActiveTab} centered>
          <TabPane tab="登录" key="login">
            <Form
              name="login"
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
                  data-cy="login-submit"
                  block
                  loading={loading}
                >
                  登录
                </Button>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="注册" key="register">
            <Form
              name="register"
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
                <Input data-cy="register-avatar" placeholder="头像 URL（可选）" />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  data-cy="register-submit"
                  block
                  loading={loading}
                >
                  注册
                </Button>
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default Login;
