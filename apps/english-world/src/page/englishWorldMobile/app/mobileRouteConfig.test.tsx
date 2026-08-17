import { matchRoutes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MOBILE_CAPABILITIES } from "../testing/mobileCapabilityManifest";
import { mobileRouteConfig } from "./mobileRouteConfig";

const mobileRouteTree = [{ path: "/mobile", children: mobileRouteConfig }];

const concreteMobilePaths: Record<(typeof MOBILE_CAPABILITIES)[number]["id"], string> = {
  home: "/mobile",
  review: "/mobile/review",
  "learning-setup": "/mobile/learn",
  "learning-session": "/mobile/learn/session/session-42",
  cockpit: "/mobile/cockpit",
  words: "/mobile/words",
  "word-detail": "/mobile/words/word-42",
  "word-new": "/mobile/words/new",
  "word-edit": "/mobile/words/word-42/edit",
  tools: "/mobile/tools",
  "ai-word": "/mobile/tools/ai-word",
  "context-tasks": "/mobile/tools/context-lab",
  "context-create": "/mobile/tools/context-lab/new",
  "context-read": "/mobile/tools/context-lab/task-42/read",
  "context-answer": "/mobile/tools/context-lab/task-42/answer",
  "context-result": "/mobile/tools/context-lab/task-42/result/attempt-42",
  "context-attempts": "/mobile/tools/context-lab/task-42/attempts",
  "ielts-core": "/mobile/tools/ielts-core",
  "memory-map": "/mobile/tools/memory-map",
  stats: "/mobile/tools/stats",
  "bulk-import": "/mobile/tools/bulk-import",
  "overwrite-stats": "/mobile/tools/overwrite-stats",
  account: "/mobile/me",
  notifications: "/mobile/me/notifications",
  settings: "/mobile/me/settings",
  appearance: "/mobile/me/appearance",
  "pwa-status": "/mobile/me/app",
};

describe("mobileRouteConfig", () => {
  it("matches every manifest capability at its concrete mobile path", () => {
    for (const capability of MOBILE_CAPABILITIES) {
      const matches = matchRoutes(mobileRouteTree, concreteMobilePaths[capability.id]);

      expect(matches?.at(-1)?.route).toBeDefined();
    }
  });

  it("resolves /mobile/words/new as the static creation route, not a word detail", () => {
    const matches = matchRoutes(mobileRouteTree, "/mobile/words/new");

    expect(matches?.at(-1)?.route.path).toBe("words/new");
  });

  it("keeps every mobile leaf lazy without a desktop element fallback", async () => {
    expect(mobileRouteConfig).toHaveLength(MOBILE_CAPABILITIES.length);

    for (const route of mobileRouteConfig) {
      expect(route.element).toBeUndefined();
      expect(route.lazy).toBeTypeOf("function");

      const lazyRoute = await route.lazy!();
      expect(lazyRoute.Component).toBeTypeOf("function");
    }
  });
});
