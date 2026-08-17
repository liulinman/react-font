import { describe, expect, it } from "vitest";
import type { WordList } from "@/server/word/word.type";
import {
  createMemoryMobileDb,
  createMobileStorage,
} from "../../offline/mobileStorage";
import { createRecentWordStore } from "./recentWordStore";

const retain: WordList = { id: 1, englishWord: "retain", englishChinese: "保留" };
const vivid: WordList = { id: 2, englishWord: "vivid", englishChinese: "生动的" };

describe("recentWordStore", () => {
  it("keeps recent words user-scoped, deduplicated, newest-first, and limited to five by default", async () => {
    const store = createRecentWordStore(createMobileStorage(createMemoryMobileDb()));

    await store.record(7, retain);
    await store.record(7, vivid);
    await store.record(7, retain);
    await store.record(8, vivid);

    await expect(store.list(7)).resolves.toEqual([retain, vivid]);
    await expect(store.list(8)).resolves.toEqual([vivid]);
  });

  it("retains at most twenty words", async () => {
    const store = createRecentWordStore(createMobileStorage(createMemoryMobileDb()));

    for (let id = 1; id <= 21; id += 1) {
      await store.record(7, { id, englishWord: `word-${id}` });
    }

    await expect(store.list(7, 30)).resolves.toEqual(
      Array.from({ length: 20 }, (_, index) => ({
        id: 21 - index,
        englishWord: `word-${21 - index}`,
      })),
    );
  });

  it("serializes same-user writes so concurrent views do not lose a recent word", async () => {
    const store = createRecentWordStore(createMobileStorage(createMemoryMobileDb()));

    await Promise.all([store.record(7, retain), store.record(7, vivid)]);

    await expect(store.list(7)).resolves.toEqual([vivid, retain]);
  });
});
