import { useState, type ReactNode } from "react";
import { EnglishHeader } from "../component/EnglishHeader";
import { EnglishWorldContextBar } from "./EnglishWorldContextBar";

export const SIDEBAR_COLLAPSED_STORAGE_KEY =
  "english-world-sidebar-collapsed";

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    getInitialSidebarCollapsed,
  );

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
      }`}
    >
      <EnglishHeader
        activeKey={activeKey}
        collapsed={sidebarCollapsed}
        onCollapsedChange={handleCollapsedChange}
        onNavClick={onNavClick}
      />
      <div className="english-world-workspace">
        <EnglishWorldContextBar activeKey={activeKey} />
        <main className="english-world-main">{children}</main>
      </div>
    </div>
  );
}
