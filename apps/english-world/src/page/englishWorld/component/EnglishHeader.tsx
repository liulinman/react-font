import {
  BookFilled,
  UnorderedListOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  RobotOutlined,
  DashboardOutlined,
  NodeIndexOutlined,
  TranslationOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Modal } from "antd";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getPathForNav, normalizeActiveKey } from "../navigation";

const navGroups = [
  {
    title: "主流程",
    items: [
      { key: "cockpit", icon: <DashboardOutlined />, label: "今日任务" },
      { key: "words", icon: <UnorderedListOutlined />, label: "词库" },
      { key: "aiWord", icon: <TranslationOutlined />, label: "AI 单词查询" },
      { key: "contextLab", icon: <RobotOutlined />, label: "语境实验室" },
    ],
  },
  {
    title: "学习",
    items: [
      { key: "recite", icon: <BookFilled />, label: "今日复习" },
      { key: "memoryMap", icon: <NodeIndexOutlined />, label: "记忆地图" },
      { key: "stats", icon: <BarChartOutlined />, label: "学习统计" },
    ],
  },
  {
    title: "配置",
    items: [
      { key: "setting", icon: <SettingOutlined />, label: "系统设置" },
    ],
  },
];

type EnglishHeaderProps = {
  activeKey?: string;
  onNavClick?: (key: string) => void;
};

export const EnglishHeader = ({
  activeKey = "cockpit",
  onNavClick,
}: EnglishHeaderProps) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const normalizedActiveKey = normalizeActiveKey(activeKey);

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

  const handleNavClick = (key: string) => {
    navigate(getPathForNav(key));
    onNavClick?.(normalizeActiveKey(key));
  };

  return (
    <aside className="english-world-header">
      <div className="english-world-header-inner">
        {/* Logo */}
        <div className="english-world-brand">
          <span className="english-world-brand-mark">
            EW
          </span>
          <span className="english-world-brand-copy">
            <span className="english-world-brand-title">English World</span>
            <span className="english-world-brand-subtitle">字段保留版</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="english-world-nav">
          {navGroups.map((group) => (
            <div className="english-world-nav-group" key={group.title}>
              <div className="english-world-nav-title">{group.title}</div>
              {group.items.map(({ key, icon, label }) => (
                <Button
                  key={key}
                  type={key === normalizedActiveKey ? "primary" : "text"}
                  icon={icon}
                  className="english-world-nav-button"
                  onClick={() => handleNavClick(key)}
                >
                  {label}
                </Button>
              ))}
            </div>
          ))}
        </nav>

        {/* User Info */}
        <Dropdown menu={{ items: userMenuItems }} placement="topLeft">
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
    </aside>
  );
};
