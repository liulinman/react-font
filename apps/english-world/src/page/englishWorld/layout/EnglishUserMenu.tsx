import {
  BgColorsOutlined,
  LogoutOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Dropdown, Modal } from "antd";
import type { MenuProps } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeSettingsModal } from "@/theme/ThemeSettingsModal";

export function EnglishUserMenu() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [themeSettingsOpen, setThemeSettingsOpen] = useState(false);
  const username = user?.username || "管理员";

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

  const menuItems: MenuProps["items"] = [
    {
      key: "userInfo",
      label: (
        <div className="px-2 py-1">
          <div className="text-sm font-medium text-gray-700">{username}</div>
          {user?.username && (
            <div className="text-xs text-gray-500 mt-1">
              用户名: {user.username}
            </div>
          )}
        </div>
      ),
      disabled: true,
    },
    { type: "divider" },
    {
      key: "settings",
      icon: <SettingOutlined />,
      label: "系统设置",
      onClick: () => navigate("/englishWorld/settings"),
    },
    {
      key: "theme",
      icon: <BgColorsOutlined />,
      label: "主题设置",
      onClick: () => setThemeSettingsOpen(true),
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
    <>
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomRight"
        trigger={["click"]}
      >
        <button
          type="button"
          className="english-world-user"
          aria-label={`用户菜单：${username}`}
        >
          <span className="english-world-user-avatar" aria-hidden="true">
            <UserOutlined />
          </span>
          <span className="english-world-user-name">{username}</span>
        </button>
      </Dropdown>
      {themeSettingsOpen && (
        <ThemeSettingsModal
          open
          onClose={() => setThemeSettingsOpen(false)}
        />
      )}
    </>
  );
}
