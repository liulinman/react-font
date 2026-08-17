import { matchRoutes, type RouteObject } from "react-router-dom";
import { describe, expect, it } from "vitest";
import {
  MOBILE_CAPABILITIES,
  type MobileCapabilityId,
} from "../testing/mobileCapabilityManifest";
import { mobileRouteConfig } from "./mobileRouteConfig";

const mobileRouteTree: RouteObject[] = [{ path: "/mobile", children: mobileRouteConfig }];

type RouteContract = {
  url: string;
  path?: string;
  index?: true;
  params?: Record<string, string>;
};

const routeContracts: Record<MobileCapabilityId, RouteContract> = {
  home: { url: "/mobile", index: true },
  review: { url: "/mobile/review", path: "review" },
  "learning-setup": { url: "/mobile/learn", path: "learn" },
  "learning-session": {
    url: "/mobile/learn/session/session-42",
    path: "learn/session/:sessionId",
    params: { sessionId: "session-42" },
  },
  cockpit: { url: "/mobile/cockpit", path: "cockpit" },
  words: { url: "/mobile/words", path: "words" },
  "word-detail": {
    url: "/mobile/words/word-42",
    path: "words/:wordId",
    params: { wordId: "word-42" },
  },
  "word-new": { url: "/mobile/words/new", path: "words/new" },
  "word-edit": {
    url: "/mobile/words/word-42/edit",
    path: "words/:wordId/edit",
    params: { wordId: "word-42" },
  },
  tools: { url: "/mobile/tools", path: "tools" },
  "ai-word": { url: "/mobile/tools/ai-word", path: "tools/ai-word" },
  "context-tasks": { url: "/mobile/tools/context-lab", path: "tools/context-lab" },
  "context-create": {
    url: "/mobile/tools/context-lab/new",
    path: "tools/context-lab/new",
  },
  "context-read": {
    url: "/mobile/tools/context-lab/task-42/read",
    path: "tools/context-lab/:taskId/read",
    params: { taskId: "task-42" },
  },
  "context-answer": {
    url: "/mobile/tools/context-lab/task-42/answer",
    path: "tools/context-lab/:taskId/answer",
    params: { taskId: "task-42" },
  },
  "context-result": {
    url: "/mobile/tools/context-lab/task-42/result/attempt-42",
    path: "tools/context-lab/:taskId/result/:attemptId",
    params: { taskId: "task-42", attemptId: "attempt-42" },
  },
  "context-attempts": {
    url: "/mobile/tools/context-lab/task-42/attempts",
    path: "tools/context-lab/:taskId/attempts",
    params: { taskId: "task-42" },
  },
  "ielts-core": { url: "/mobile/tools/ielts-core", path: "tools/ielts-core" },
  "memory-map": { url: "/mobile/tools/memory-map", path: "tools/memory-map" },
  stats: { url: "/mobile/tools/stats", path: "tools/stats" },
  "bulk-import": { url: "/mobile/tools/bulk-import", path: "tools/bulk-import" },
  "overwrite-stats": {
    url: "/mobile/tools/overwrite-stats",
    path: "tools/overwrite-stats",
  },
  account: { url: "/mobile/me", path: "me" },
  notifications: { url: "/mobile/me/notifications", path: "me/notifications" },
  settings: { url: "/mobile/me/settings", path: "me/settings" },
  appearance: { url: "/mobile/me/appearance", path: "me/appearance" },
  "pwa-status": { url: "/mobile/me/app", path: "me/app" },
};

describe("mobileRouteConfig", () => {
  it("matches every capability to its exact route identity and dynamic parameters", () => {
    for (const capability of MOBILE_CAPABILITIES) {
      const contract = routeContracts[capability.id];
      const match = matchRoutes(mobileRouteTree, contract.url)?.at(-1);

      expect(match?.route.path).toBe(contract.path);
      expect(match?.route.index).toBe(contract.index);
      expect(match?.params).toEqual(contract.params ?? {});
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
