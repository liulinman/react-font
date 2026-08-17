import { describe, expect, it } from "vitest";
import { MOBILE_CAPABILITIES, MOBILE_ROUTE_PATHS } from "./mobileCapabilityManifest";

describe("mobile capability manifest", () => {
  it("freezes every exact desktop-to-mobile capability pair", () => {
    expect(MOBILE_CAPABILITIES).toEqual([
      { id: "home", desktopPath: "/englishWorld", mobilePath: "/mobile" },
      { id: "review", desktopPath: "/englishWorld/recite", mobilePath: "/mobile/review" },
      { id: "learning-setup", desktopPath: "/englishWorld/words", mobilePath: "/mobile/learn" },
      { id: "learning-session", desktopPath: "/englishWorld/learn/session/:sessionId", mobilePath: "/mobile/learn/session/:sessionId" },
      { id: "cockpit", desktopPath: "/englishWorld", mobilePath: "/mobile/cockpit" },
      { id: "words", desktopPath: "/englishWorld/words", mobilePath: "/mobile/words" },
      { id: "word-detail", desktopPath: "/englishWorld/words", mobilePath: "/mobile/words/:wordId" },
      { id: "word-new", desktopPath: "/englishWorld/words", mobilePath: "/mobile/words/new" },
      { id: "word-edit", desktopPath: "/englishWorld/words", mobilePath: "/mobile/words/:wordId/edit" },
      { id: "tools", desktopPath: "/englishWorld", mobilePath: "/mobile/tools" },
      { id: "ai-word", desktopPath: "/englishWorld/ai-word", mobilePath: "/mobile/tools/ai-word" },
      { id: "context-tasks", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab" },
      { id: "context-create", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/new" },
      { id: "context-read", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/:taskId/read" },
      { id: "context-answer", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/:taskId/answer" },
      { id: "context-result", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/:taskId/result/:attemptId" },
      { id: "context-attempts", desktopPath: "/englishWorld/context-lab", mobilePath: "/mobile/tools/context-lab/:taskId/attempts" },
      { id: "ielts-core", desktopPath: "/englishWorld/ielts-core", mobilePath: "/mobile/tools/ielts-core" },
      { id: "memory-map", desktopPath: "/englishWorld/memory-map", mobilePath: "/mobile/tools/memory-map" },
      { id: "stats", desktopPath: "/englishWorld/stats", mobilePath: "/mobile/tools/stats" },
      { id: "bulk-import", desktopPath: "/englishWorld/bulk-import", mobilePath: "/mobile/tools/bulk-import" },
      { id: "overwrite-stats", desktopPath: "/englishWorld/overwrite-stats", mobilePath: "/mobile/tools/overwrite-stats" },
      { id: "account", desktopPath: "/englishWorld", mobilePath: "/mobile/me" },
      { id: "notifications", desktopPath: "/englishWorld", mobilePath: "/mobile/me/notifications" },
      { id: "settings", desktopPath: "/englishWorld/settings", mobilePath: "/mobile/me/settings" },
      { id: "appearance", desktopPath: "/englishWorld", mobilePath: "/mobile/me/appearance" },
      { id: "pwa-status", desktopPath: "/englishWorldMobile", mobilePath: "/mobile/me/app" },
    ]);
  });

  it("maps every desktop capability to a mobile-only route", () => {
    expect(MOBILE_CAPABILITIES.map((item) => item.id)).toEqual([
      "home", "review", "learning-setup", "learning-session", "cockpit",
      "words", "word-detail", "word-new", "word-edit", "tools", "ai-word",
      "context-tasks", "context-create", "context-read", "context-answer",
      "context-result", "context-attempts", "ielts-core", "memory-map", "stats",
      "bulk-import", "overwrite-stats", "account", "notifications", "settings",
      "appearance", "pwa-status",
    ]);
    expect(MOBILE_CAPABILITIES.every((item) => item.mobilePath.startsWith("/mobile"))).toBe(true);
    expect(MOBILE_CAPABILITIES.some((item) => item.mobilePath.startsWith("/englishWorld"))).toBe(false);
    expect(new Set(MOBILE_ROUTE_PATHS)).toEqual(new Set(MOBILE_CAPABILITIES.map((item) => item.mobilePath)));
  });
});
