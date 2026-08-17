import "@testing-library/jest-dom/vitest";
import "antd-mobile/es/global";
import type { ReactNode } from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { RouterProvider, useLocation, useParams } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileActivityLockProvider } from "@/page/englishWorldMobile/offline/MobileActivityLockContext";
import {
  PwaUpdateProvider,
  type PwaRegistrationAdapter,
} from "@/page/englishWorldMobile/pwa/PwaUpdateContext";
import { router } from "./router";

const registration: PwaRegistrationAdapter = {
  register: () => () => undefined,
};

function renderRouter() {
  return render(
    <MobileActivityLockProvider>
      <PwaUpdateProvider registration={registration}>
        <RouterProvider router={router} />
      </PwaUpdateProvider>
    </MobileActivityLockProvider>,
  );
}

const authState = {
  isAuthenticated: true,
  loading: false,
  checkAuth: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/page/englishWorldMobile/EnglishWorldMobile", () => ({
  default: () => <div>legacy mobile page</div>,
}));

vi.mock("@/page/login/Login", () => ({
  default: function MockLogin() {
    const location = useLocation();
    const from = (location.state as { from?: { pathname?: string } } | null)?.from;

    return <output data-testid="login-location">{`${location.pathname}|${from?.pathname ?? ""}`}</output>;
  },
}));

vi.mock("@/page/englishWorld/EnglishWorld", () => ({
  default: function MockEnglishWorld() {
    const location = useLocation();
    return <div>{`english-world-page:${location.pathname}`}</div>;
  },
}));

vi.mock("@/page/englishWorld/component/SystemSettingsPage", () => ({
  SystemSettingsPage: () => <div>settings-page</div>,
}));

vi.mock("@/page/englishWorld/recite/RecitePage", () => ({
  RecitePage: () => <div>recite-page</div>,
}));

vi.mock("@/page/englishWorld/learning/session/MixedLearningSessionPage", () => ({
  MixedLearningSessionPage: () => {
    const { sessionId } = useParams();
    return <div>{`session-${sessionId}`}</div>;
  },
}));

vi.mock("@/page/englishWorld/layout/EnglishWorldLayout", () => ({
  EnglishWorldLayout: ({
    activeKey,
    children,
  }: {
    activeKey: string;
    children: ReactNode;
  }) => (
    <section data-active-key={activeKey} data-testid="desktop-layout">
      {children}
    </section>
  ),
}));

vi.mock("@/page/englishWorld/component/WordAgentTab", () => ({
  WordAgentTab: () => <div>ai-word-page</div>,
}));

vi.mock("@/page/englishWorld/bulkImport/BulkImportPage", () => ({
  BulkImportPage: () => <div>bulk-import-page</div>,
}));

vi.mock("@/page/englishWorld/overwriteStats/OverwriteStatsPage", () => ({
  OverwriteStatsPage: () => <div>overwrite-stats-page</div>,
}));

vi.mock("@/page/englishWorld/contextLab/ContextLabPage", () => ({
  ContextLabPage: () => <div>context-lab-page</div>,
}));

vi.mock("@/page/englishWorld/ieltsCore/IeltsCoreReviewPage", () => ({
  IeltsCoreReviewPage: () => <div>ielts-core-page</div>,
}));

vi.mock("@/page/englishWorld/memoryMap/MemoryMapPage", () => ({
  MemoryMapPage: () => <div>memory-map-page</div>,
}));

describe("application router mobile branch", () => {
  afterEach(() => {
    cleanup();
    authState.isAuthenticated = true;
    authState.loading = false;
  });

  it("replaces the legacy mobile entry with the lazy four-tab application", async () => {
    renderRouter();

    await router.navigate("/englishWorldMobile");

    expect(await screen.findByRole("tab", { name: "学习" })).toBeInTheDocument();
    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.queryByText("legacy mobile page")).not.toBeInTheDocument();
  });

  it("hands an unauthenticated mobile deep link to login without the desktop spinner", async () => {
    authState.isAuthenticated = false;
    renderRouter();

    await router.navigate("/mobile/words");

    await waitFor(() => {
      expect(screen.getByTestId("login-location")).toHaveTextContent(
        "/login|/mobile/words",
      );
    });
    expect(document.querySelector(".ant-spin")).not.toBeInTheDocument();
  });
});

describe("application router desktop branch", () => {
  afterEach(() => {
    cleanup();
    authState.isAuthenticated = true;
    authState.loading = false;
    authState.checkAuth.mockClear();
  });

  it("preserves plain desktop pages and the learning-session parameter", async () => {
    renderRouter();

    for (const [path, content] of [
      ["/englishWorld", "english-world-page:/englishWorld"],
      ["/englishWorld/words", "english-world-page:/englishWorld/words"],
      ["/englishWorld/stats", "english-world-page:/englishWorld/stats"],
      ["/englishWorld/settings", "settings-page"],
      ["/englishWorld/recite", "recite-page"],
      ["/englishWorld/learn/session/42", "session-42"],
    ]) {
      await router.navigate(path);
      expect(await screen.findByText(content)).toBeInTheDocument();
    }
  });

  it("preserves every desktop layout active key and child page", async () => {
    renderRouter();

    for (const [path, activeKey, content] of [
      ["/englishWorld/ai-word", "aiWord", "ai-word-page"],
      ["/englishWorld/bulk-import", "bulkImport", "bulk-import-page"],
      ["/englishWorld/overwrite-stats", "overwriteStats", "overwrite-stats-page"],
      ["/englishWorld/context-lab", "contextLab", "context-lab-page"],
      ["/englishWorld/ielts-core", "ieltsCore", "ielts-core-page"],
      ["/englishWorld/memory-map", "memoryMap", "memory-map-page"],
    ]) {
      await router.navigate(path);
      await waitFor(() => {
        expect(screen.getByTestId("desktop-layout")).toHaveAttribute(
          "data-active-key",
          activeKey,
        );
        expect(screen.getByText(content)).toBeInTheDocument();
      });
    }
  });

  it("preserves the desktop auth redirect and source location", async () => {
    authState.isAuthenticated = false;
    renderRouter();

    await router.navigate("/englishWorld/settings");

    await waitFor(() => {
      expect(screen.getByTestId("login-location")).toHaveTextContent(
        "/login|/englishWorld/settings",
      );
    });
    expect(authState.checkAuth).toHaveBeenCalled();
  });
});
