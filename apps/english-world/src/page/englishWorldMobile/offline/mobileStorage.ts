export type MobileDraftKind =
  | "word-form"
  | "bulk-import"
  | "review"
  | "learning"
  | "context-create"
  | "context-reader"
  | "context-answer";

export type MobileDraftRecord<T> = {
  key: string;
  userId: number;
  kind: MobileDraftKind;
  updatedAt: string;
  value: T;
};

export interface MobileStorage {
  getDraft<T>(userId: number, kind: MobileDraftKind, key: string): Promise<T | null>;
  putDraft<T>(record: MobileDraftRecord<T>): Promise<void>;
  deleteDraft(userId: number, kind: MobileDraftKind, key: string): Promise<void>;
  getSnapshot<T>(userId: number, key: string): Promise<T | null>;
  putSnapshot<T>(userId: number, key: string, value: T): Promise<void>;
  clearUser(userId: number): Promise<void>;
}

export type MobileStorageStore = "drafts" | "snapshots";
type MobileStorageKey = readonly [number, ...string[]];

export interface MobileStorageDb {
  get(store: MobileStorageStore, key: MobileStorageKey): Promise<unknown | null>;
  put(store: MobileStorageStore, record: unknown): Promise<void>;
  delete(store: MobileStorageStore, key: MobileStorageKey): Promise<void>;
  clearUser(userId: number): Promise<void>;
}

const DATABASE_NAME = "english-world-mobile";
const DATABASE_VERSION = 1;
const RECORD_VERSION = 1;

type StoredDraft = MobileDraftRecord<unknown> & { version: number };
type StoredSnapshot = {
  version: number;
  userId: number;
  kind: "snapshot";
  key: string;
  updatedAt: string;
  value: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStoredDraft(
  value: unknown,
  userId: number,
  kind: MobileDraftKind,
  key: string,
): value is StoredDraft {
  return isObject(value)
    && value.version === RECORD_VERSION
    && value.userId === userId
    && value.kind === kind
    && value.key === key
    && typeof value.updatedAt === "string"
    && "value" in value;
}

function isStoredSnapshot(
  value: unknown,
  userId: number,
  key: string,
): value is StoredSnapshot {
  return isObject(value)
    && value.version === RECORD_VERSION
    && value.userId === userId
    && value.kind === "snapshot"
    && value.key === key
    && typeof value.updatedAt === "string"
    && "value" in value;
}

function mapKey(store: MobileStorageStore, key: MobileStorageKey) {
  return `${store}:${key.map(String).join("\u0000")}`;
}

function userIdFromRecord(record: unknown): number | null {
  return isObject(record) && typeof record.userId === "number"
    ? record.userId
    : null;
}

export function createMemoryMobileDb(): MobileStorageDb {
  const records = new Map<string, unknown>();

  return {
    async get(store, key) {
      return records.get(mapKey(store, key)) ?? null;
    },
    async put(store, record) {
      if (!isObject(record) || typeof record.userId !== "number" || typeof record.key !== "string") {
        throw new Error("Mobile storage records must include a user and key");
      }
      const key = store === "drafts"
        ? [record.userId, String(record.kind), record.key] as const
        : [record.userId, record.key] as const;
      records.set(mapKey(store, key), record);
    },
    async delete(store, key) {
      records.delete(mapKey(store, key));
    },
    async clearUser(userId) {
      for (const [key, record] of records) {
        if (userIdFromRecord(record) === userId) records.delete(key);
      }
    },
  };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction aborted"));
  });
}

class IndexedDbMobileStorage implements MobileStorageDb {
  private database: Promise<IDBDatabase> | null = null;

  private open() {
    if (this.database) return this.database;
    if (typeof window === "undefined" || typeof indexedDB === "undefined") {
      return Promise.reject(new Error("IndexedDB is unavailable"));
    }

    this.database = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains("drafts")) {
          const drafts = database.createObjectStore("drafts", {
            keyPath: ["userId", "kind", "key"],
          });
          drafts.createIndex("by-user", "userId", { unique: false });
        }
        if (!database.objectStoreNames.contains("snapshots")) {
          const snapshots = database.createObjectStore("snapshots", {
            keyPath: ["userId", "key"],
          });
          snapshots.createIndex("by-user", "userId", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB"));
      request.onblocked = () => reject(new Error("IndexedDB open was blocked"));
    });
    return this.database;
  }

  async get(store: MobileStorageStore, key: MobileStorageKey) {
    const database = await this.open();
    const transaction = database.transaction(store, "readonly");
    return requestResult(transaction.objectStore(store).get([...key]));
  }

  async put(store: MobileStorageStore, record: unknown) {
    const database = await this.open();
    const transaction = database.transaction(store, "readwrite");
    transaction.objectStore(store).put(record);
    await transactionComplete(transaction);
  }

  async delete(store: MobileStorageStore, key: MobileStorageKey) {
    const database = await this.open();
    const transaction = database.transaction(store, "readwrite");
    transaction.objectStore(store).delete([...key]);
    await transactionComplete(transaction);
  }

  async clearUser(userId: number) {
    const database = await this.open();
    const transaction = database.transaction(["drafts", "snapshots"], "readwrite");
    for (const storeName of ["drafts", "snapshots"] as const) {
      const store = transaction.objectStore(storeName);
      const index = store.index("by-user");
      const request = index.openCursor(IDBKeyRange.only(userId));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
    }
    await transactionComplete(transaction);
  }
}

class MobileStorageRepository implements MobileStorage {
  private readonly memory = createMemoryMobileDb();
  private fallback = false;

  constructor(private readonly primary: MobileStorageDb) {}

  private async access<T>(operation: (database: MobileStorageDb) => Promise<T>): Promise<T> {
    if (this.fallback) return operation(this.memory);
    try {
      return await operation(this.primary);
    } catch {
      this.fallback = true;
      return operation(this.memory);
    }
  }

  async getDraft<T>(userId: number, kind: MobileDraftKind, key: string): Promise<T | null> {
    const record = await this.access((database) => database.get("drafts", [userId, kind, key]));
    return isStoredDraft(record, userId, kind, key) ? record.value as T : null;
  }

  async putDraft<T>(record: MobileDraftRecord<T>) {
    const stored: StoredDraft = { ...record, version: RECORD_VERSION };
    await this.access((database) => database.put("drafts", stored));
  }

  async deleteDraft(userId: number, kind: MobileDraftKind, key: string) {
    await this.access((database) => database.delete("drafts", [userId, kind, key]));
  }

  async getSnapshot<T>(userId: number, key: string): Promise<T | null> {
    const record = await this.access((database) => database.get("snapshots", [userId, key]));
    return isStoredSnapshot(record, userId, key) ? record.value as T : null;
  }

  async putSnapshot<T>(userId: number, key: string, value: T) {
    const stored: StoredSnapshot = {
      version: RECORD_VERSION,
      userId,
      kind: "snapshot",
      key,
      updatedAt: new Date().toISOString(),
      value,
    };
    await this.access((database) => database.put("snapshots", stored));
  }

  async clearUser(userId: number) {
    await this.access((database) => database.clearUser(userId));
  }
}

export function createMobileStorage(database: MobileStorageDb = new IndexedDbMobileStorage()): MobileStorage {
  return new MobileStorageRepository(database);
}

export const mobileStorage = createMobileStorage();
