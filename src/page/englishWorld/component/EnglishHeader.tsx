import {
  BookFilled,
  UnorderedListOutlined,
  BarChartOutlined,
  SettingOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button } from "antd";

const navItems = [
  {
    key: "list",
    icon: <UnorderedListOutlined />,
    label: "单词列表",
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
              onClick={() => onNavClick?.(key)}
            >
              {label}
            </Button>
          ))}
        </nav>

        {/* User Info */}
        <div className="flex items-center gap-2 text-gray-700">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 flex items-center justify-center rounded-full">
            <UserOutlined />
          </div>
          <span>管理员</span>
        </div>
      </div>
    </header>
  );
};
