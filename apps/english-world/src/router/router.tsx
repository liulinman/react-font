import { stopListeningAudio } from '@/aiListening/audio';
import type { ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { MobileAppShell } from "@/page/englishWorldMobile/app/MobileAppShell";
import { MobileProtectedRoute } from "@/page/englishWorldMobile/app/MobileProtectedRoute";
import { MobileRouteFallback } from "@/page/englishWorldMobile/app/MobileRouteFallback";
import { mobileRouteConfig } from "@/page/englishWorldMobile/app/mobileRouteConfig";
import { isNativeApp } from "@/native/runtime";

function AppEntry() {
  return <Navigate to={isNativeApp() ? "/mobile" : "/login"} replace />;
}

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
  import("@/readingPractice/ReadingWorkspace").then(
    ({ LegacyReadingEntry }) => ({ default: LegacyReadingEntry }),
  ),
);
const memoryMapRoute = protectedDesktopLayoutRoute("memoryMap", () =>
  import("@/page/englishWorld/memoryMap/MemoryMapPage").then(
    ({ MemoryMapPage }) => ({ default: MemoryMapPage }),
  ),
);

const wordBooksRoute = protectedDesktopLayoutRoute("wordBooks", () => import("@/page/englishWorld/wordBook/WordBookPage"));
const wordBookReaderRoute = protectedDesktopRoute(() => import("@/page/englishWorld/wordBook/BookReaderPage"));

const knowledgeNotesRoute = protectedDesktopLayoutRoute("knowledgeNotes", () =>
  import("@/page/englishWorld/knowledgeNotes/KnowledgeNotesPage").then(({ KnowledgeNotesPage }) => ({ default: KnowledgeNotesPage })),
);

const studentClassroomRoute = protectedDesktopLayoutRoute("readingPractices", () => import("@/readingPractice/StudentClassrooms"));
const readingPracticeRoute = protectedDesktopLayoutRoute("readingPractices", () => import("@/readingPractice/ReadingPracticePage"));

const intensiveReadingRoute = protectedDesktopLayoutRoute("intensiveReading", () => import("@/intensiveReading/IntensiveReadingPage"));

const ieltsListeningRoute = protectedDesktopLayoutRoute("ieltsListening", () => import("@/ieltsListening/IeltsListeningPage"));

const aiListeningRoute = protectedDesktopLayoutRoute("aiListening", () => import("@/aiListening/AiListeningPage"));

export const router = createBrowserRouter([
  ...["/englishWorld/classrooms", "/englishWorld/classrooms/join/:code", "/englishWorld/classrooms/:classroomId"].map(path => ({ path, lazy: studentClassroomRoute })),
  { path: "/englishWorld/ielts-listening", lazy: ieltsListeningRoute },
  { path: "/englishWorld/ai-listening", lazy: aiListeningRoute },
  { path: "/", element: <AppEntry /> },
  {
    path: "/login",
    lazy: async () => {
      const { default: Login } = await import("@/page/login/Login");
      return { Component: Login };
    },
  },
  ...["/englishWorld/reading-practices", "/englishWorld/reading-practices/:id", "/englishWorld/reading-practices/:id/result"].map(path => ({ path, lazy: readingPracticeRoute })),
  ...["/englishWorld/intensive-reading", "/englishWorld/intensive-reading/:id", "/englishWorld/intensive-reading/:id/review"].map(path => ({path, lazy: intensiveReadingRoute})),
  { path: "/englishWorld", lazy: englishWorldRoute },
  { path: "/englishWorld/words", lazy: englishWorldRoute },
  {
    path: "/englishWorld/browser-reading/connect",
    lazy: async () => ({
      Component: (await import("@/page/englishWorld/BrowserReadingConnect")).BrowserReadingConnect,
    }),
  },
  { path: "/englishWorld/word-books", lazy: wordBooksRoute },
  { path: "/englishWorld/word-books/:id", lazy: wordBookReaderRoute },
  { path: "/englishWorld/knowledge-notes/*", lazy: knowledgeNotesRoute },
  { path: "/englishWorld/stats", lazy: englishWorldRoute },
  { path: "/englishWorld/settings", lazy: settingsRoute },
  { path: "/englishWorld/ai-word", lazy: aiWordRoute },
  { path: "/englishWorld/bulk-import", lazy: bulkImportRoute },
  { path: "/englishWorld/overwrite-stats", lazy: overwriteStatsRoute },
  { path: "/englishWorld/context-lab", lazy: contextLabRoute },
  { path: "/englishWorld/ielts-core", element: <Navigate to="/englishWorld/ai-listening" replace /> },
  { path: "/englishWorld/memory-map", lazy: memoryMapRoute },
  { path: "/englishWorld/recite", element: <Navigate to="/englishWorld/ai-listening" replace /> },
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
  { path: "*", element: <AppEntry /> },
]);

let audioLocation = router.state.location.key;
router.subscribe(state => { if (state.location.key !== audioLocation) { audioLocation = state.location.key; stopListeningAudio(); } });
