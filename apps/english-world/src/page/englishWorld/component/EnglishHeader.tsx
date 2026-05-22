import {
  BookFilled,
  UnorderedListOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Modal } from "antd";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  { key: "list", icon: <UnorderedListOutlined />, label: "单词列表" },
  { key: "recite", icon: <BookFilled />, label: "单词默写" },
  { key: "aiTool", icon: <RobotOutlined />, label: "AI 工具" },
  { key: "stat", icon: <BarChartOutlined />, label: "学习统计" },
  { key: "setting", icon: <SettingOutlined />, label: "系统设置" },
];

function getHashForNav(key: string): string {
  return key === "aiTool" ? "ai-tool" : key;
}

type EnglishHeaderProps = {
  activeKey?: string;
  onNavClick?: (key: string) => void;
};

export const EnglishHeader = ({
  activeKey = "list",
  onNavClick,
}: EnglishHeaderProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Modal.confirm({
      title: "确认退出",
      content: "确定要退出登录吗？",
      okText: "确定",
      cancelText: "取消",
      onOk: async () => {
        try {
          await logout();
          navigate("/login", { replace: true });
        } catch (error) {
          console.error("退出登录失败:", error);
        }
      },
    });
  };

  const userMenuItems: MenuProps["items"] = [
    {
      key: "userInfo",
      label: (
        <div className="px-2 py-1">
          <div className="text-sm font-medium text-gray-700">
            {user?.username || "管理员"}
          </div>
          {user?.username && (
            <div className="text-xs text-gray-500 mt-1">
              用户名: {user.username}
            </div>
          )}
        </div>
      ),
      disabled: true,
    },
    {
      type: "divider",
    },
    {
      key: "logout",
      label: (
        <div className="flex items-center gap-2">
          <LogoutOutlined />
          <span>退出登录</span>
        </div>
      ),
      onClick: handleLogout,
      danger: true,
    },
  ];

  return (
    <header className="english-world-header">
      <div className="english-world-header-inner">
        {/* Logo */}
        <div className="english-world-brand">
          <span className="english-world-brand-mark">
            <BookFilled />
          </span>
          <span className="english-world-brand-title">
            English World · AI 单词
          </span>
        </div>

        {/* Navigation */}
        <nav className="english-world-nav">
          {navItems.map(({ key, icon, label }) => (
            <Button
              key={key}
              type={key === activeKey ? "primary" : "text"}
              icon={icon}
              className="english-world-nav-button"
              onClick={() => {
                if (key === "recite") {
                  navigate("/englishWorld/recite");
                } else if (key === "setting") {
                  navigate("/englishWorld/settings");
                } else if (key === "list" || key === "aiTool" || key === "stat") {
                  navigate({ pathname: "/englishWorld", hash: getHashForNav(key) });
                }
                onNavClick?.(key);
              }}
            >
              {label}
            </Button>
          ))}
        </nav>

        {/* User Info */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="english-world-user">
            <div className="english-world-user-avatar">
              <UserOutlined />
            </div>
            <span className="english-world-user-name">
              {user?.username || "管理员"}
            </span>
          </div>
        </Dropdown>
      </div>
    </header>
  );
};
