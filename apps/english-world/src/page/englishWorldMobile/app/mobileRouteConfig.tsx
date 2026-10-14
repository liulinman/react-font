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

function MobileFoundationSurface({
  title,
  pending,
}: {
  title: string;
  pending: boolean;
}) {
  return (
    <section aria-labelledby="mobile-route-title">
      <h1 id="mobile-route-title">{title}</h1>
      <p>
        {pending ? "此功能将在后续交付中提供。" : "移动学习空间正在准备中。"}
      </p>
    </section>
  );
}

function MobilePwaStatusPage() {
  return (
    <section aria-labelledby="mobile-route-title" className="mobile-page">
      <h1 className="mobile-page__title" id="mobile-route-title">
        应用
      </h1>
      <PwaUpdateStatusSurface />
    </section>
  );
}

function lazyFoundationSurface(title: string, pending: boolean) {
  return async () => ({
    Component: (() => (
      <MobileFoundationSurface pending={pending} title={title} />
    )) as ComponentType,
  });
}

async function lazyMobileHomePage() {
  const { MobileHomePage } = await import("../features/home/MobileHomePage");
  return { Component: MobileHomePage };
}

async function lazyMobileWordLibraryPage() {
  const { MobileWordLibraryPage } = await import(
    "../features/words/MobileWordLibraryPage"
  );
  return { Component: MobileWordLibraryPage };
}

async function lazyMobileWordDetailPage() {
  const { MobileWordDetailPage } = await import(
    "../features/words/MobileWordDetailPage"
  );
  return { Component: MobileWordDetailPage };
}

async function lazyMobileWordFormPage() {
  const { MobileWordFormPage } = await import(
    "../features/words/MobileWordFormPage"
  );
  return { Component: MobileWordFormPage };
}

const orderedMobilePaths = [
  ...MOBILE_ROUTE_PATHS.filter((path) => !path.includes(":")),
  ...MOBILE_ROUTE_PATHS.filter((path) => path.includes(":")),
];

export const mobileRouteConfig: RouteObject[] = orderedMobilePaths.map(
  (mobilePath) => {
    const title = TAB_ROOTS[mobilePath] ?? "移动功能";
    const pending = !Object.prototype.hasOwnProperty.call(
      TAB_ROOTS,
      mobilePath,
    );
    const studyRoutes: Record<
      string,
      () => Promise<{ Component: ComponentType }>
    > = {
      "/mobile/tools/context-lab": async () => ({ Component: (await import("../features/reading/MobileArticleLibrary")).MobileArticleLibrary }),
      "/mobile/tools/context-lab/new": async () => ({ Component: (await import("../features/reading/MobileArticleCreate")).MobileArticleCreate }),
      "/mobile/tools/context-lab/:taskId/read": async () => ({ Component: (await import("../features/reading/MobileArticleReader")).MobileArticleReader }),
      "/mobile/tools/context-lab/:taskId/answer": async () => ({ Component: (await import("../features/reading/MobileArticleReader")).MobileArticleReader }),
      "/mobile/tools/context-lab/:taskId/attempts": async () => ({ Component: (await import("../features/reading/MobileArticleHistory")).MobileArticleHistory }),
      "/mobile/tools/context-lab/:taskId/result/:attemptId": async () => ({ Component: (await import("../features/reading/MobileArticleHistory")).MobileArticleResult }),
      "/mobile/learn": async () => ({
        Component: (await import("../features/study/MobileLearnPage"))
          .MobileLearnPage,
      }),
      "/mobile/review": async () => ({
        Component: (await import("../features/study/MobileReviewPage"))
          .MobileReviewPage,
      }),
      "/mobile/cockpit": async () => ({
        Component: (await import("../features/study/MobileProgressPage"))
          .MobileProgressPage,
      }),
      "/mobile/tools/stats": async () => ({
        Component: (await import("../features/study/MobileProgressPage"))
          .MobileProgressPage,
      }),
      "/mobile/tools/knowledge-notes/*": async () => ({ Component: (await import("../../englishWorld/knowledgeNotes/KnowledgeNotesPage")).KnowledgeNotesPage }),
      "/mobile/tools": async () => ({
        Component: (await import("../features/study/MobileToolsPage"))
          .MobileToolsPage,
      }),
    };
    const lazy =
      (mobilePath.startsWith("/mobile/reading-practices") ? async () => ({ Component: (await import("@/readingPractice/ReadingPracticePage")).default }) : undefined) ??
      (mobilePath === "/mobile/me/notifications" ? async () => ({ Component: (await import("@/readingPractice/MobileNotificationsPage")).MobileNotificationsPage }) : undefined) ??
      studyRoutes[mobilePath] ??
      (mobilePath === "/mobile"
        ? lazyMobileHomePage
        : mobilePath === "/mobile/words"
          ? lazyMobileWordLibraryPage
          : mobilePath === "/mobile/words/:wordId"
            ? lazyMobileWordDetailPage
            : mobilePath === "/mobile/words/new"
              ? lazyMobileWordFormPage
              : mobilePath === "/mobile/words/:wordId/edit"
                ? lazyMobileWordFormPage
                : mobilePath === "/mobile/me/app"
                  ? async () => ({ Component: MobilePwaStatusPage })
                  : mobilePath === "/mobile/me"
                    ? async () => ({
                        Component: (await import("@/native/MobileAccountPage"))
                          .MobileAccountPage,
                      })
                    : lazyFoundationSurface(title, pending));

    if (mobilePath === "/mobile") {
      return { index: true, lazy };
    }

    return {
      path: mobilePath.replace("/mobile/", ""),
      lazy,
    };
  },
);
