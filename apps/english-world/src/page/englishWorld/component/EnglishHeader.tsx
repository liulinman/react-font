import { brand } from "@/brand";
import {
  BookFilled,
  CloudUploadOutlined,
  UnorderedListOutlined,
  BarChartOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FireOutlined,
  LeftOutlined,
  MenuOutlined,
  ReadOutlined,
  SoundOutlined,
  RightOutlined,
} from "@ant-design/icons";
import { Drawer, Menu } from "antd";
import type { MenuProps } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getPathForNav, getReadingNavKey, normalizeActiveKey, READING_NAV } from "../navigation";

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
      { key: "intensiveReading", icon: <ReadOutlined />, label: "文章精读" },
      {
        key: "readingPractices",
        icon: <ReadOutlined />,
        label: "阅读练习",
        className: "english-world-reading-menu",
        children: Object.entries(READING_NAV).map(([key, { label }]) => ({ key, label })),
      },
      { key: "ieltsListening", icon: <SoundOutlined />, label: "雅思听力" },
      { key: "aiListening", icon: <ReadOutlined />, label: "场景听力" },
      { key: "wordBooks", icon: <BookFilled />, label: "复习手册" },
    ],
  },
  { key: "knowledgeNotes", icon: <FileTextOutlined />, label: "知识笔记", title: "知识笔记" },
  { key: "stats", icon: <BarChartOutlined />, label: "数据统计", title: "数据统计" },
  { key: "docs", icon: <FileTextOutlined />, label: <a href="/docs/">文档中心</a>, title: "文档中心" },
];

function getSelectedNavKey(activeKey: string, search: string) {
  const normalizedKey = normalizeActiveKey(activeKey);
  if (normalizedKey === "contextLab") return "readingPersonal";
  if (normalizedKey === "readingPractices") return getReadingNavKey(new URLSearchParams(search));
  if (normalizedKey === "aiWord" || normalizedKey === "memoryMap") {
    return "words";
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
  const location = useLocation();
  const selectedNavKey = getSelectedNavKey(activeKey, location.search);
  const [mobileNavLocation, setMobileNavLocation] = useState<string>();
  const mobileNavOpen = mobileNavLocation === location.key;
  const closeMobileNav = () => setMobileNavLocation(undefined);

  useEffect(() => {
    const narrowScreen = window.matchMedia?.("(max-width: 900px)");
    const handleResize = (event: MediaQueryListEvent) => {
      if (!event.matches) setMobileNavLocation(undefined);
    };
    narrowScreen?.addEventListener("change", handleResize);
    return () => narrowScreen?.removeEventListener("change", handleResize);
  }, []);

  const handleNavClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "learning" || key === "vocabulary" || key === "docs") return;
    const normalizedKey = normalizeActiveKey(key);
    navigate(getPathForNav(normalizedKey));
    onNavClick?.(normalizedKey);
  };

  const menuProps: MenuProps = {
    defaultOpenKeys: ["vocabulary", "learning", "readingPractices"],
    items: navItems,
    mode: "inline",
    selectedKeys: [selectedNavKey],
  };

  return (
    <aside
      className={`english-world-header${
        collapsed ? " english-world-header-collapsed" : ""
      }`}
    >
      <div className="english-world-header-inner">
        <button
          type="button"
          className="english-world-mobile-nav-toggle"
          aria-label="打开导航"
          aria-haspopup="dialog"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavLocation(location.key)}
        >
          <MenuOutlined aria-hidden="true" />
        </button>
        <div className="english-world-brand">
          <span className="english-world-brand-mark" aria-hidden="true"><img src={brand.symbol} alt="" /></span>
          <span className="english-world-brand-copy">
            <span className="english-world-brand-title">{brand.name}</span>
            <span className="english-world-brand-subtitle">专注词汇成长</span>
          </span>
        </div>

        <nav className="english-world-nav">
          <Menu
            {...menuProps}
            className="english-world-nav-menu"
            inlineCollapsed={collapsed}
            onClick={handleNavClick}
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
      <Drawer
        title="导航"
        aria-label="导航"
        placement="left"
        width="min(320px, 90vw)"
        open={mobileNavOpen}
        onClose={closeMobileNav}
        rootClassName="english-world-mobile-nav-drawer"
      >
        <nav aria-label="学习导航">
          <Menu
            {...menuProps}
            className="english-world-nav-menu"
            onClick={(info) => {
              closeMobileNav();
              handleNavClick(info);
            }}
          />
        </nav>
      </Drawer>
    </aside>
  );
};
