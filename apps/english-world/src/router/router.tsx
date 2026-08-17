import type { ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MobileAppShell } from "@/page/englishWorldMobile/app/MobileAppShell";
import { MobileProtectedRoute } from "@/page/englishWorldMobile/app/MobileProtectedRoute";
import { MobileRouteFallback } from "@/page/englishWorldMobile/app/MobileRouteFallback";
import { mobileRouteConfig } from "@/page/englishWorldMobile/app/mobileRouteConfig";

type DesktopPageLoader = () => Promise<{ default: ComponentType }>;

function protectedDesktopRoute(loadPage: DesktopPageLoader) {
  return async () => {
    const [{ ProtectedRoute }, { default: DesktopPage }] = await Promise.all([
      import("@font/ui"),
      loadPage(),
    ]);

    function ProtectedDesktopRoute() {
      const auth = useAuth();
      return (
        <ProtectedRoute
          auth={{
            isAuthenticated: auth.isAuthenticated,
            loading: auth.loading,
            checkAuth: auth.checkAuth,
          }}
        >
          <DesktopPage />
        </ProtectedRoute>
      );
    }

    return { Component: ProtectedDesktopRoute };
  };
}

function protectedDesktopLayoutRoute(
  activeKey: string,
  loadChild: DesktopPageLoader,
) {
  return protectedDesktopRoute(async () => {
    const [{ EnglishWorldLayout }, { default: ChildPage }] = await Promise.all([
      import("@/page/englishWorld/layout/EnglishWorldLayout"),
      loadChild(),
    ]);

    function DesktopLayoutPage() {
      return (
        <EnglishWorldLayout activeKey={activeKey}>
          <ChildPage />
        </EnglishWorldLayout>
      );
    }

    return { default: DesktopLayoutPage };
  });
}

const englishWorldRoute = protectedDesktopRoute(
  () => import("@/page/englishWorld/EnglishWorld"),
);
const settingsRoute = protectedDesktopRoute(() =>
  import("@/page/englishWorld/component/SystemSettingsPage").then(
    ({ SystemSettingsPage }) => ({ default: SystemSettingsPage }),
  ),
);
const reciteRoute = protectedDesktopRoute(() =>
  import("@/page/englishWorld/recite/RecitePage").then(({ RecitePage }) => ({
    default: RecitePage,
  })),
);
const learningSessionRoute = protectedDesktopRoute(() =>
  import("@/page/englishWorld/learning/session/MixedLearningSessionPage").then(
    ({ MixedLearningSessionPage }) => ({ default: MixedLearningSessionPage }),
  ),
);
const aiWordRoute = protectedDesktopLayoutRoute("aiWord", () =>
  import("@/page/englishWorld/component/WordAgentTab").then(
    ({ WordAgentTab }) => ({ default: WordAgentTab }),
  ),
);
const bulkImportRoute = protectedDesktopLayoutRoute("bulkImport", () =>
  import("@/page/englishWorld/bulkImport/BulkImportPage").then(
    ({ BulkImportPage }) => ({ default: BulkImportPage }),
  ),
);
const overwriteStatsRoute = protectedDesktopLayoutRoute(
  "overwriteStats",
  () =>
    import("@/page/englishWorld/overwriteStats/OverwriteStatsPage").then(
      ({ OverwriteStatsPage }) => ({ default: OverwriteStatsPage }),
    ),
);
const contextLabRoute = protectedDesktopLayoutRoute("contextLab", () =>
  import("@/page/englishWorld/contextLab/ContextLabPage").then(
    ({ ContextLabPage }) => ({ default: ContextLabPage }),
  ),
);
const ieltsCoreRoute = protectedDesktopLayoutRoute("ieltsCore", () =>
  import("@/page/englishWorld/ieltsCore/IeltsCoreReviewPage").then(
    ({ IeltsCoreReviewPage }) => ({ default: IeltsCoreReviewPage }),
  ),
);
const memoryMapRoute = protectedDesktopLayoutRoute("memoryMap", () =>
  import("@/page/englishWorld/memoryMap/MemoryMapPage").then(
    ({ MemoryMapPage }) => ({ default: MemoryMapPage }),
  ),
);

export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/login" replace /> },
  {
    path: "/login",
    lazy: async () => {
      const { default: Login } = await import("@/page/login/Login");
      return { Component: Login };
    },
  },
  { path: "/englishWorld", lazy: englishWorldRoute },
  { path: "/englishWorld/words", lazy: englishWorldRoute },
  { path: "/englishWorld/stats", lazy: englishWorldRoute },
  { path: "/englishWorld/settings", lazy: settingsRoute },
  { path: "/englishWorld/ai-word", lazy: aiWordRoute },
  { path: "/englishWorld/bulk-import", lazy: bulkImportRoute },
  { path: "/englishWorld/overwrite-stats", lazy: overwriteStatsRoute },
  { path: "/englishWorld/context-lab", lazy: contextLabRoute },
  { path: "/englishWorld/ielts-core", lazy: ieltsCoreRoute },
  { path: "/englishWorld/memory-map", lazy: memoryMapRoute },
  { path: "/englishWorld/recite", lazy: reciteRoute },
  {
    path: "/englishWorld/learn/session/:sessionId",
    lazy: learningSessionRoute,
  },
  {
    path: "/englishWorldMobile",
    element: <Navigate to="/mobile" replace />,
  },
  {
    path: "/mobile",
    element: (
      <MobileProtectedRoute>
        <MobileRouteFallback>
          <MobileAppShell />
        </MobileRouteFallback>
      </MobileProtectedRoute>
    ),
    children: mobileRouteConfig,
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
