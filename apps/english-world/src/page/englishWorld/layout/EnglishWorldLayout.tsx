import "../EnglishWorld.css";
import { LeftOutlined } from "@ant-design/icons";
import { useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { EnglishHeader } from "../component/EnglishHeader";
import { EnglishWorldContextBar } from "./EnglishWorldContextBar";

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "english-world-sidebar-collapsed";

function getInitialSidebarCollapsed() {
  try {
    return (
      window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "true"
    );
  } catch {
    return false;
  }
}

type EnglishWorldLayoutProps = {
  activeKey: string;
  children: ReactNode;
  onNavClick?: (key: string) => void;
};

export function EnglishWorldLayout({
  activeKey,
  children,
  onNavClick,
}: EnglishWorldLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    getInitialSidebarCollapsed,
  );
  const [navigationPath, setNavigationPath] = useState<string>();
  const readingDetail =
    /^\/englishWorld\/reading-practices\/\d+(?:\/result)?\/?$/.test(
      location.pathname,
    );
  const intensiveDetail = /^\/englishWorld\/intensive-reading\/[^/]+(?:\/review)?\/?$/.test(location.pathname);
  const readingFocus = (readingDetail || intensiveDetail) && navigationPath !== location.pathname;
  const openedFromMobile =
    new URLSearchParams(location.search).get("source") === "mobile";

  const handleCollapsedChange = (collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
    try {
      window.localStorage.setItem(
        SIDEBAR_COLLAPSED_STORAGE_KEY,
        String(collapsed),
      );
    } catch {
      // Keep the in-memory preference when local storage is unavailable.
    }
  };

  return (
    <div
      className={`english-world-shell${
        sidebarCollapsed ? " english-world-shell-collapsed" : ""
      }${readingFocus ? " english-world-reading-focus" : ""}${intensiveDetail ? " english-world-intensive" : ""}`}
    >
      {!readingFocus && (
        <EnglishHeader
          activeKey={activeKey}
          collapsed={sidebarCollapsed}
          onCollapsedChange={handleCollapsedChange}
          onNavClick={onNavClick}
        />
      )}
      <div className="english-world-workspace">
        {!readingFocus && <EnglishWorldContextBar activeKey={activeKey} />}
        {(readingDetail || intensiveDetail) && (
          <button
            className="reading-navigation-toggle"
            onClick={() =>
              setNavigationPath(readingFocus ? location.pathname : undefined)
            }
          >
            {readingFocus ? "显示导航" : "专注阅读"}
          </button>
        )}
        <main className="english-world-main">{children}</main>
      </div>
      {openedFromMobile ? (
        <button
          type="button"
          className="english-world-mobile-return"
          onClick={() => navigate("/englishWorldMobile?view=more")}
        >
          <LeftOutlined aria-hidden="true" />
          返回移动版
        </button>
      ) : null}
    </div>
  );
}
