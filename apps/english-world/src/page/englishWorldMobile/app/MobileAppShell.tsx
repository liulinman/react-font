import { TabBar } from "antd-mobile";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
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

  return (
    <div className="mobile-app-shell">
      <main className="mobile-app-shell__content">
        <Outlet />
      </main>
      <nav aria-label="主要导航" className="mobile-app-shell__navigation">
        <div aria-label="主要导航" role="tablist">
          <TabBar
            activeKey={activeKey}
            safeArea
            onChange={(key) => {
              const destination = MOBILE_TABS.find((item) => item.key === key);
              if (destination) {
                navigate(destination.path, { state: { from: location } });
              }
            }}
          >
            {MOBILE_TABS.map((item) => (
              <TabBar.Item
                key={item.key}
                aria-label={item.label}
                title={
                  <span
                    aria-selected={activeKey === item.key}
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
