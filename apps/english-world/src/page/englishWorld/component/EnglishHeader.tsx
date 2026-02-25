import {
  BookFilled,
  UnorderedListOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Modal } from "antd";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
  {
    key: "list",
    icon: <UnorderedListOutlined />,
    label: "单词列表",
  },
  {
    key: "recite",
    icon: <BookFilled />,
    label: "单词默写",
  },
  {
    key: "stat",
    icon: <BarChartOutlined />,
    label: "学习统计",
  },
  {
    key: "setting",
    icon: <SettingOutlined />,
    label: "系统设置",
  },
];

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
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md">
      <div className="flex items-center justify-between px-10 py-4 w-full max-w-[1500px] mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-2 text-blue-600 font-semibold text-lg">
          <BookFilled className="text-2xl" />
          <span className="text-gray-800">单词管理系统</span>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-3">
          {navItems.map(({ key, icon, label }) => (
            <Button
              key={key}
              type={key === activeKey ? "primary" : "text"}
              icon={icon}
              className={`flex items-center gap-1 transition-all duration-200 ${
                key === activeKey
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-gray-600"
              }`}
              onClick={() => {
                if (key === "recite") {
                  navigate("/englishWorld/recite");
                } else {
                  onNavClick?.(key);
                }
              }}
            >
              {label}
            </Button>
          ))}
        </nav>

        {/* User Info */}
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <div className="flex items-center gap-2 text-gray-700 cursor-pointer hover:text-blue-600 transition-colors">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full">
              <UserOutlined />
            </div>
            <span>{user?.username || "管理员"}</span>
          </div>
        </Dropdown>
      </div>
    </header>
  );
};
