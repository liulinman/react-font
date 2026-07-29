import { describe, expect, it } from "vitest";
import {
  getLegacyPathFromHash,
  getNavFromLocation,
  getPathForNav,
  normalizeActiveKey,
} from "./navigation";

describe("english world navigation helpers", () => {
  it("keeps legacy hash keys mapped to current nav keys and paths", () => {
    expect(normalizeActiveKey("list")).toBe("words");
    expect(normalizeActiveKey("stat")).toBe("stats");
    expect(getLegacyPathFromHash("#list")).toBe("/englishWorld/words");
    expect(getLegacyPathFromHash("#/stat")).toBe("/englishWorld/stats");
  });

  it("resolves active nav from paths before legacy hashes", () => {
    expect(getNavFromLocation("/englishWorld/words", "")).toBe("words");
    expect(getNavFromLocation("/englishWorld/stats", "")).toBe("stats");
    expect(getNavFromLocation("/englishWorld/bulk-import", "")).toBe(
      "bulkImport",
    );
    expect(getNavFromLocation("/englishWorld/overwrite-stats", "")).toBe(
      "overwriteStats",
    );
    expect(getNavFromLocation("/englishWorld/ielts-core", "")).toBe(
      "ieltsCore",
    );
    expect(getNavFromLocation("/englishWorld/admin", "")).toBe("admin");
    expect(getNavFromLocation("/englishWorld", "#memory-map")).toBe(
      "memoryMap",
    );
  });

  it("returns real routes for nav keys", () => {
    expect(getPathForNav("list")).toBe("/englishWorld/words");
    expect(getPathForNav("stat")).toBe("/englishWorld/stats");
    expect(getPathForNav("bulkImport")).toBe("/englishWorld/bulk-import");
    expect(getPathForNav("overwriteStats")).toBe(
      "/englishWorld/overwrite-stats",
    );
    expect(getPathForNav("contextLab")).toBe("/englishWorld/context-lab");
    expect(getPathForNav("ieltsCore")).toBe("/englishWorld/ielts-core");
    expect(getPathForNav("admin")).toBe("/englishWorld/admin");
    expect(getPathForNav("unknown")).toBe("/englishWorld");
  });
});
