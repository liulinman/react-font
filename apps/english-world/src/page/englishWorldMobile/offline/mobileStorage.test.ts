import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createMemoryMobileDb,
  createMobileStorage,
  type MobileStorageDb,
} from "./mobileStorage";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function openDatabase(name: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

describe("mobile storage", () => {
  it("keeps drafts and snapshots scoped to their user", async () => {
    const storage = createMobileStorage(createMemoryMobileDb());

    await storage.putDraft({
      key: "new",
      userId: 7,
      kind: "word-form",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { word: "retain" },
    });
    await storage.putDraft({
      key: "new",
      userId: 8,
      kind: "word-form",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { word: "separate" },
    });
    await storage.putSnapshot(7, "recent-words", [{ id: 1 }]);
    await storage.putSnapshot(8, "recent-words", [{ id: 2 }]);

    await expect(storage.getDraft(7, "word-form", "new")).resolves.toEqual({
      word: "retain",
    });
    await expect(storage.getDraft(8, "word-form", "new")).resolves.toEqual({
      word: "separate",
    });
    await expect(storage.getSnapshot(7, "recent-words")).resolves.toEqual([{ id: 1 }]);
    await expect(storage.getSnapshot(8, "recent-words")).resolves.toEqual([{ id: 2 }]);
  });

  it("clears only one user's drafts and snapshots", async () => {
    const storage = createMobileStorage(createMemoryMobileDb());

    await storage.putDraft({
      key: "draft",
      userId: 7,
      kind: "learning",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { step: 2 },
    });
    await storage.putDraft({
      key: "draft",
      userId: 8,
      kind: "learning",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { step: 3 },
    });
    await storage.putSnapshot(7, "recent", { item: "remove" });
    await storage.putSnapshot(8, "recent", { item: "keep" });

    await storage.clearUser(7);

    await expect(storage.getDraft(7, "learning", "draft")).resolves.toBeNull();
    await expect(storage.getSnapshot(7, "recent")).resolves.toBeNull();
    await expect(storage.getDraft(8, "learning", "draft")).resolves.toEqual({ step: 3 });
    await expect(storage.getSnapshot(8, "recent")).resolves.toEqual({ item: "keep" });
  });

  it("deletes one draft without affecting its snapshot", async () => {
    const storage = createMobileStorage(createMemoryMobileDb());
    await storage.putDraft({
      key: "42",
      userId: 7,
      kind: "word-form",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { word: "delete" },
    });
    await storage.putSnapshot(7, "recent", { word: "retain" });

    await storage.deleteDraft(7, "word-form", "42");

    await expect(storage.getDraft(7, "word-form", "42")).resolves.toBeNull();
    await expect(storage.getSnapshot(7, "recent")).resolves.toEqual({ word: "retain" });
  });

  it("rejects records from an unknown storage version", async () => {
    const db: MobileStorageDb = {
      get: async () => ({
        version: 2,
        userId: 7,
        kind: "word-form",
        key: "new",
        updatedAt: "2026-08-17T00:00:00.000Z",
        value: { word: "unsupported" },
      }),
      put: async () => undefined,
      delete: async () => undefined,
      clearUser: async () => undefined,
    };

    await expect(
      createMobileStorage(db).getDraft(7, "word-form", "new"),
    ).resolves.toBeNull();
  });

  it("falls back to page-lifetime memory when IndexedDB is unavailable", async () => {
    vi.stubGlobal("indexedDB", undefined);
    const storage = createMobileStorage();

    await storage.putDraft({
      key: "new",
      userId: 7,
      kind: "word-form",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { word: "fallback" },
    });

    await expect(storage.getDraft(7, "word-form", "new")).resolves.toEqual({
      word: "fallback",
    });
  });

  it("falls back to page-lifetime memory after a database transaction fails", async () => {
    const unavailableDb: MobileStorageDb = {
      get: async () => null,
      put: async () => {
        throw new Error("transaction aborted");
      },
      delete: async () => {
        throw new Error("transaction aborted");
      },
      clearUser: async () => {
        throw new Error("transaction aborted");
      },
    };
    const storage = createMobileStorage(unavailableDb);

    await storage.putDraft({
      key: "new",
      userId: 7,
      kind: "word-form",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { word: "retry-locally" },
    });

    await expect(storage.getDraft(7, "word-form", "new")).resolves.toEqual({
      word: "retry-locally",
    });
  });

  it("keeps a confirmed concurrent write visible after another operation triggers fallback", async () => {
    const writeStarted = deferred();
    const releaseWrite = deferred();
    const primary: MobileStorageDb = {
      get: async () => {
        throw new Error("primary database became unavailable");
      },
      put: async () => {
        writeStarted.resolve();
        await releaseWrite.promise;
      },
      delete: async () => undefined,
      clearUser: async () => undefined,
    };
    const storage = createMobileStorage(primary);
    const write = storage.putDraft({
      key: "new",
      userId: 7,
      kind: "word-form",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { word: "confirmed" },
    });

    await writeStarted.promise;
    await storage.getDraft(7, "word-form", "new");
    releaseWrite.resolve();
    await write;

    await expect(storage.getDraft(7, "word-form", "new")).resolves.toEqual({
      word: "confirmed",
    });
  });

  it("uses the IndexedDB schema, compound keys, and user cursor clear", async () => {
    const storage = createMobileStorage();
    await storage.putDraft({
      key: "new",
      userId: 7,
      kind: "word-form",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { word: "remove" },
    });
    await storage.putDraft({
      key: "new",
      userId: 8,
      kind: "word-form",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { word: "keep" },
    });
    await storage.putSnapshot(7, "recent", { word: "remove" });
    await storage.putSnapshot(8, "recent", { word: "keep" });

    const database = await openDatabase("english-world-mobile");
    expect(database.version).toBe(1);
    const transaction = database.transaction(["drafts", "snapshots"], "readonly");
    expect(transaction.objectStore("drafts").keyPath).toEqual(["userId", "kind", "key"]);
    expect(transaction.objectStore("snapshots").keyPath).toEqual(["userId", "key"]);
    expect(transaction.objectStore("drafts").indexNames.contains("by-user")).toBe(true);
    expect(transaction.objectStore("snapshots").indexNames.contains("by-user")).toBe(true);
    database.close();

    await storage.clearUser(7);

    await expect(storage.getDraft(7, "word-form", "new")).resolves.toBeNull();
    await expect(storage.getSnapshot(7, "recent")).resolves.toBeNull();
    await expect(storage.getDraft(8, "word-form", "new")).resolves.toEqual({ word: "keep" });
    await expect(storage.getSnapshot(8, "recent")).resolves.toEqual({ word: "keep" });
  });

  it("falls back to memory when an IndexedDB write transaction aborts", async () => {
    const originalPut = IDBObjectStore.prototype.put;
    const put = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function putAndAbort(
      this: IDBObjectStore,
      value,
    ) {
      const request = originalPut.call(this, value);
      this.transaction.abort();
      return request;
    });
    const storage = createMobileStorage();

    await storage.putDraft({
      key: "new",
      userId: 12,
      kind: "word-form",
      updatedAt: "2026-08-17T00:00:00.000Z",
      value: { word: "fallback-after-abort" },
    });

    await expect(storage.getDraft(12, "word-form", "new")).resolves.toEqual({
      word: "fallback-after-abort",
    });
    put.mockRestore();
  });
});
