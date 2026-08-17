import { describe, expect, it } from "vitest";
import { MOBILE_CAPABILITIES, MOBILE_ROUTE_PATHS } from "./mobileCapabilityManifest";

describe("mobile capability manifest", () => {
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
