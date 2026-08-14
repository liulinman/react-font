import { describe, expect, it } from "vitest";
import {
  buildArticleTranslationBlocks,
  mergeArticleTranslationBlocks,
} from "./articleTranslation";

describe("article translation blocks", () => {
  it("keeps the title and paragraphs paired with their Chinese translations", () => {
    const article =
      "The Paradox of Ice\n\nGlaciers are changing quickly.\n\nCommunities must adapt.";

    expect(
      buildArticleTranslationBlocks(article, [
        "冰的悖论",
        "冰川正在迅速变化。",
        "社区必须适应。",
      ]),
    ).toEqual([
      { english: "The Paradox of Ice", chinese: "冰的悖论" },
      { english: "Glaciers are changing quickly.", chinese: "冰川正在迅速变化。" },
      { english: "Communities must adapt.", chinese: "社区必须适应。" },
    ]);
  });

  it("does not render a translation for a block when the API response is incomplete", () => {
    expect(
      buildArticleTranslationBlocks("Title\n\nBody", ["标题"]),
    ).toEqual([
      { english: "Title", chinese: "标题" },
      { english: "Body", chinese: undefined },
    ]);
  });

  it("merges translated blocks without changing the original article order", () => {
    expect(
      mergeArticleTranslationBlocks(
        ["Title", "First paragraph", "Second paragraph"],
        ["标题", "第一段", "第二段"],
      ),
    ).toEqual([
      { english: "Title", chinese: "标题" },
      { english: "First paragraph", chinese: "第一段" },
      { english: "Second paragraph", chinese: "第二段" },
    ]);
  });
});
