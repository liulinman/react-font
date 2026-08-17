import type { WordList } from "@/server/word/word.type";
import {
  mobileStorage,
  type MobileStorage,
} from "../../offline/mobileStorage";

const SNAPSHOT_KEY = "recent-words.v1";
const MAX_RECENT_WORDS = 20;
const DEFAULT_RECENT_WORD_LIMIT = 5;

export interface RecentWordStore {
  record(userId: number, word: WordList): Promise<void>;
  list(userId: number, limit?: number): Promise<WordList[]>;
}

/**
 * Snapshot updates are read-modify-write, so writes for a single user must not
 * overlap. Different users retain independent queues and storage scopes.
 */
export function createRecentWordStore(storage: MobileStorage): RecentWordStore {
  const pendingWrites = new Map<number, Promise<void>>();

  return {
    async record(userId, word) {
      const previous = pendingWrites.get(userId) ?? Promise.resolve();
      const write = previous.catch(() => undefined).then(async () => {
        const current = (await storage.getSnapshot<WordList[]>(userId, SNAPSHOT_KEY)) ?? [];
        const updated = [word, ...current.filter((item) => item.id !== word.id)]
          .slice(0, MAX_RECENT_WORDS);
        await storage.putSnapshot(userId, SNAPSHOT_KEY, updated);
      });

      pendingWrites.set(userId, write);
      try {
        await write;
      } finally {
        if (pendingWrites.get(userId) === write) pendingWrites.delete(userId);
      }
    },
    async list(userId, limit = DEFAULT_RECENT_WORD_LIMIT) {
      const records = (await storage.getSnapshot<WordList[]>(userId, SNAPSHOT_KEY)) ?? [];
      return records.slice(0, Math.max(0, limit));
    },
  };
}

export const recentWordStore = createRecentWordStore(mobileStorage);
