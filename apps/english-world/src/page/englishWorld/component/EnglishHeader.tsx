import {
  BookFilled,
  UnorderedListOutlined,
  BarChartOutlined,
  DashboardOutlined,
  LeftOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Button } from "antd";
import { useNavigate } from "react-router-dom";
import { getPathForNav, normalizeActiveKey } from "../navigation";

const primaryNavItems = [
  { key: "cockpit", icon: <DashboardOutlined />, label: "今天" },
  { key: "words", icon: <UnorderedListOutlined />, label: "词库" },
  { key: "recite", icon: <BookFilled />, label: "学习" },
  { key: "stats", icon: <BarChartOutlined />, label: "数据" },
];

function getPrimaryActiveKey(activeKey: string) {
  const normalizedKey = normalizeActiveKey(activeKey);
  if (normalizedKey === "aiWord" || normalizedKey === "memoryMap") {
    return "words";
  }
  if (normalizedKey === "contextLab") {
    return "recite";
  }
  return normalizedKey;
}

type EnglishHeaderProps = {
  activeKey?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavClick?: (key: string) => void;
};

export const EnglishHeader = ({
  activeKey = "cockpit",
  collapsed = false,
  onCollapsedChange,
  onNavClick,
}: EnglishHeaderProps) => {
  const navigate = useNavigate();
  const normalizedActiveKey = getPrimaryActiveKey(activeKey);

  const handleNavClick = (key: string) => {
    navigate(getPathForNav(key));
    onNavClick?.(normalizeActiveKey(key));
  };

  return (
    <aside
      className={`english-world-header${
        collapsed ? " english-world-header-collapsed" : ""
      }`}
    >
      <div className="english-world-header-inner">
        {/* Logo */}
        <div className="english-world-brand">
          <span className="english-world-brand-mark">
            EW
          </span>
          <span className="english-world-brand-copy">
            <span className="english-world-brand-title">English World</span>
            <span className="english-world-brand-subtitle">专注词汇成长</span>
          </span>
        </div>

        {/* Navigation */}
        <nav className="english-world-nav">
          <div className="english-world-nav-group">
            {primaryNavItems.map(({ key, icon, label }) => (
              <Button
                key={key}
                type={key === normalizedActiveKey ? "primary" : "text"}
                icon={icon}
                className="english-world-nav-button"
                title={label}
                onClick={() => handleNavClick(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </nav>

      </div>
      <button
        type="button"
        className="english-world-sidebar-toggle"
        aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
        title={collapsed ? "展开侧栏" : "收起侧栏"}
        onClick={() => onCollapsedChange?.(!collapsed)}
      >
        {collapsed ? <RightOutlined /> : <LeftOutlined />}
      </button>
    </aside>
  );
};
