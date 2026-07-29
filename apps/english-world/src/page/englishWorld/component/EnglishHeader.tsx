import {
  BookFilled,
  CloudUploadOutlined,
  ControlOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  FireOutlined,
  LeftOutlined,
  ReadOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Menu } from "antd";
import type { MenuProps } from "antd";
import { useNavigate } from "react-router-dom";
import { getPathForNav, normalizeActiveKey } from "../navigation";

const navItems: MenuProps["items"] = [
  { key: "cockpit", icon: <DashboardOutlined />, label: "今天", title: "今天" },
  {
    key: "vocabulary",
    icon: <UnorderedListOutlined />,
    label: <span title="词库">词库</span>,
    title: "词库",
    children: [
      { key: "words", icon: <UnorderedListOutlined />, label: "词库列表" },
      { key: "bulkImport", icon: <CloudUploadOutlined />, label: "批量导入" },
      { key: "overwriteStats", icon: <FireOutlined />, label: "覆盖统计" },
    ],
  },
  {
    key: "learning",
    icon: <BookFilled />,
    label: <span title="学习">学习</span>,
    title: "学习",
    children: [
      { key: "recite", icon: <ReadOutlined />, label: "今日复习" },
      { key: "contextLab", icon: <FileTextOutlined />, label: "语境实验室" },
      {
        key: "ieltsCore",
        icon: <ExperimentOutlined />,
        label: (
          <span className="english-world-nav-child-label">
            <span>雅思核心复习</span>
            <span className="english-world-nav-child-note">IELTS</span>
          </span>
        ),
      },
    ],
  },
  { key: "stats", icon: <BarChartOutlined />, label: "数据", title: "数据" },
  { key: "admin", icon: <ControlOutlined />, label: "后台", title: "后台" },
];

function getPrimaryActiveKey(activeKey: string) {
  const normalizedKey = normalizeActiveKey(activeKey);
  if (
    normalizedKey === "aiWord" ||
    normalizedKey === "memoryMap" ||
    normalizedKey === "bulkImport" ||
    normalizedKey === "overwriteStats"
  ) {
    return "words";
  }
  if (normalizedKey === "contextLab" || normalizedKey === "ieltsCore") {
    return "recite";
  }
  return normalizedKey;
}

function getSelectedNavKey(activeKey: string) {
  const normalizedKey = normalizeActiveKey(activeKey);
  if (normalizedKey === "aiWord" || normalizedKey === "memoryMap") {
    return "words";
  }
  return normalizedKey;
}

function getDefaultOpenKeys(activeKey: string, collapsed: boolean) {
  if (collapsed) return [];
  const normalizedKey = normalizeActiveKey(activeKey);
  if (
    normalizedKey === "words" ||
    normalizedKey === "bulkImport" ||
    normalizedKey === "overwriteStats" ||
    normalizedKey === "aiWord" ||
    normalizedKey === "memoryMap" ||
    normalizedKey === "recite" ||
    normalizedKey === "contextLab" ||
    normalizedKey === "ieltsCore"
  ) {
    return ["vocabulary", "learning"];
  }
  return ["vocabulary", "learning"];
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
  const selectedNavKey = getSelectedNavKey(activeKey);
  const primaryActiveKey = getPrimaryActiveKey(activeKey);

  const handleNavClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "learning" || key === "vocabulary") return;
    const normalizedKey = normalizeActiveKey(key);
    navigate(getPathForNav(normalizedKey));
    onNavClick?.(normalizedKey);
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

        <nav className="english-world-nav">
          <Menu
            className="english-world-nav-menu"
            defaultOpenKeys={getDefaultOpenKeys(primaryActiveKey, collapsed)}
            inlineCollapsed={collapsed}
            items={navItems}
            mode="inline"
            onClick={handleNavClick}
            selectedKeys={[selectedNavKey]}
          />
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
