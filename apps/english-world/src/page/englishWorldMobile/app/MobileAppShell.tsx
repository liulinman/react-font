import { TabBar } from "antd-mobile";
import { useRef, type KeyboardEvent } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { PwaUpdatePrompt } from "../pwa/PwaUpdateContext";
import "../styles/mobile-tokens.css";
import "../styles/mobile-shell.css";

export const MOBILE_TABS = [
  { key: "learn", label: "学习", path: "/mobile" },
  { key: "words", label: "词库", path: "/mobile/words" },
  { key: "tools", label: "工具", path: "/mobile/tools" },
  { key: "me", label: "我的", path: "/mobile/me" },
] as const;

type MobileTabKey = (typeof MOBILE_TABS)[number]["key"];

function resolveMobileTab(pathname: string): MobileTabKey {
  if (pathname.startsWith("/mobile/words")) return "words";
  if (pathname.startsWith("/mobile/tools")) return "tools";
  if (pathname.startsWith("/mobile/me")) return "me";
  return "learn";
}

export function MobileAppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const activeKey = resolveMobileTab(location.pathname);
  const tabRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const navigateToTab = (
    index: number,
    moveFocus = false,
    preserveClickNavigation = false,
  ) => {
    const destination = MOBILE_TABS[index];
    if (preserveClickNavigation || location.pathname !== destination.path) {
      navigate(destination.path, { state: { from: location } });
    }
    if (moveFocus) {
      tabRefs.current[index]?.focus();
    }
  };

  const handleTabKeyDown = (
    event: KeyboardEvent<HTMLSpanElement>,
    index: number,
  ) => {
    let destinationIndex: number | null = null;

    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      destinationIndex = index;
    } else if (event.key === "ArrowLeft") {
      destinationIndex = (index - 1 + MOBILE_TABS.length) % MOBILE_TABS.length;
    } else if (event.key === "ArrowRight") {
      destinationIndex = (index + 1) % MOBILE_TABS.length;
    } else if (event.key === "Home") {
      destinationIndex = 0;
    } else if (event.key === "End") {
      destinationIndex = MOBILE_TABS.length - 1;
    }

    if (destinationIndex === null) return;
    event.preventDefault();
    event.stopPropagation();
    navigateToTab(destinationIndex, true);
  };

  return (
    <div className="mobile-app-shell">
      <main className="mobile-app-shell__content">
        <PwaUpdatePrompt />
        <Outlet />
      </main>
      <nav aria-label="主要导航" className="mobile-app-shell__navigation">
        <div aria-label="主要导航" aria-orientation="horizontal" role="tablist">
          <TabBar
            activeKey={activeKey}
            safeArea
            onChange={(key) => {
              const destinationIndex = MOBILE_TABS.findIndex((item) => item.key === key);
              if (destinationIndex >= 0) {
                navigateToTab(destinationIndex, false, true);
              }
            }}
          >
            {MOBILE_TABS.map((item, index) => (
              <TabBar.Item
                key={item.key}
                aria-label={item.label}
                title={
                  <span
                    aria-selected={activeKey === item.key}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    role="tab"
                    tabIndex={activeKey === item.key ? 0 : -1}
                  >
                    {item.label}
                  </span>
                }
              />
            ))}
          </TabBar>
        </div>
      </nav>
    </div>
  );
}
