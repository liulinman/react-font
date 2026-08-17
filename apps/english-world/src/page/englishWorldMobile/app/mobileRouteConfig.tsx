import type { ComponentType } from "react";
import type { RouteObject } from "react-router-dom";
import { MOBILE_ROUTE_PATHS } from "../testing/mobileCapabilityManifest";
import { PwaUpdateStatusSurface } from "../pwa/PwaUpdateContext";

const TAB_ROOTS: Record<string, string> = {
  "/mobile": "学习",
  "/mobile/words": "词库",
  "/mobile/tools": "工具",
  "/mobile/me": "我的",
};

function MobileFoundationSurface({ title, pending }: { title: string; pending: boolean }) {
  return (
    <section aria-labelledby="mobile-route-title">
      <h1 id="mobile-route-title">{title}</h1>
      <p>{pending ? "此功能将在后续交付中提供。" : "移动学习空间正在准备中。"}</p>
    </section>
  );
}

function MobilePwaStatusPage() {
  return (
    <section aria-labelledby="mobile-route-title" className="mobile-page">
      <h1 className="mobile-page__title" id="mobile-route-title">应用</h1>
      <PwaUpdateStatusSurface />
    </section>
  );
}

function lazyFoundationSurface(title: string, pending: boolean) {
  return async () => ({
    Component: (() => <MobileFoundationSurface pending={pending} title={title} />) as ComponentType,
  });
}

const orderedMobilePaths = [
  ...MOBILE_ROUTE_PATHS.filter((path) => !path.includes(":")),
  ...MOBILE_ROUTE_PATHS.filter((path) => path.includes(":")),
];

export const mobileRouteConfig: RouteObject[] = orderedMobilePaths.map((mobilePath) => {
  const title = TAB_ROOTS[mobilePath] ?? "移动功能";
  const pending = !Object.prototype.hasOwnProperty.call(
    TAB_ROOTS,
    mobilePath,
  );
  const lazy = mobilePath === "/mobile/me/app"
    ? async () => ({ Component: MobilePwaStatusPage })
    : lazyFoundationSurface(title, pending);

  if (mobilePath === "/mobile") {
    return { index: true, lazy };
  }

  return {
    path: mobilePath.replace("/mobile/", ""),
    lazy,
  };
});
