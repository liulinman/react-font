# Shared Local Storage Preference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the word-library-specific Storage implementation with a reusable, type-safe local-storage preference factory while preserving the existing list/card preference and production key.

**Architecture:** Add one application-level pure factory that owns browser Storage lookup, runtime validation, default fallback, and exception handling. Keep word-library type knowledge in its existing preference module, which becomes a thin configured instance consumed by `EnglishWorld`.

**Tech Stack:** TypeScript 5.7, React 18, Vitest 4, Vite 6, pnpm 10, GitHub Actions, Docker/Nginx production deployment.

## Global Constraints

- Keep the existing `english-world:word-library-view` key unchanged.
- Keep `list` as the default and accept only `list` or `card` for the word-library preference.
- Storage absence, read failures, invalid stored values, and write failures must never break rendering or the current interaction.
- Do not add JSON serialization, version migrations, cross-tab synchronization, a React hook, backend storage, or unrelated local-storage refactors.
- Do not change the rendered UI or interaction behavior.

---

### Task 1: Reusable Local Storage Preference Factory

**Files:**
- Create: `apps/english-world/src/shared/storage/localStoragePreference.test.ts`
- Create: `apps/english-world/src/shared/storage/localStoragePreference.ts`

**Interfaces:**
- Consumes: browser `window.localStorage` when available, or an injected `Pick<Storage, "getItem">` / `Pick<Storage, "setItem">` in tests.
- Produces: `createLocalStoragePreference<T extends string>(options)` returning `{ read(storage?): T; write(value, storage?): void }`.

- [ ] **Step 1: Write the failing factory tests**

Create `localStoragePreference.test.ts` with this test-only Storage helper and specify the behaviors below with literal expectations:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalStoragePreference } from "./localStoragePreference";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  constructor(entries: ReadonlyArray<readonly [string, string]> = []) {
    entries.forEach(([key, value]) => this.values.set(key, value));
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const preference = createLocalStoragePreference<"list" | "card">({
  key: "test:view",
  defaultValue: "list",
  isValid: (value): value is "list" | "card" =>
    value === "list" || value === "card",
});

expect(preference.read(new MemoryStorage([["test:view", "card"]]))).toBe(
  "card",
);
expect(preference.read(new MemoryStorage([["test:view", "grid"]]))).toBe(
  "list",
);
expect(preference.read(new MemoryStorage())).toBe("list");
expect(
  preference.read({
    getItem: () => {
      throw new Error("blocked");
    },
  }),
).toBe("list");

const originalWindow = globalThis.window;
vi.stubGlobal("window", undefined);
expect(preference.read()).toBe("list");
vi.stubGlobal("window", originalWindow);

const storage = new MemoryStorage();
preference.write("card", storage);
expect(storage.getItem("test:view")).toBe("card");

expect(() =>
  preference.write("list", {
    setItem: () => {
      throw new Error("blocked");
    },
  }),
).not.toThrow();
```

Use `afterEach(() => vi.unstubAllGlobals())` so a failed test cannot leak the temporary missing-window environment into another test.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter @font/english-world exec vitest run src/shared/storage/localStoragePreference.test.ts
```

Expected: FAIL because `./localStoragePreference` does not exist.

- [ ] **Step 3: Implement the minimal factory**

Create `localStoragePreference.ts` with these public types and implementation shape:

```ts
type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

interface LocalStoragePreferenceOptions<T extends string> {
  key: string;
  defaultValue: T;
  isValid: (value: string) => value is T;
}

export function createLocalStoragePreference<T extends string>({
  key,
  defaultValue,
  isValid,
}: LocalStoragePreferenceOptions<T>) {
  const resolveStorage = () => {
    try {
      return typeof window === "undefined" ? undefined : window.localStorage;
    } catch {
      return undefined;
    }
  };

  return {
    read(storage?: StorageReader): T {
      try {
        const value = (storage ?? resolveStorage())?.getItem(key);
        return value !== null && value !== undefined && isValid(value)
          ? value
          : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    write(value: T, storage?: StorageWriter): void {
      try {
        (storage ?? resolveStorage())?.setItem(key, value);
      } catch {
        // Preference persistence must never block the current interaction.
      }
    },
  };
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
pnpm --filter @font/english-world exec vitest run src/shared/storage/localStoragePreference.test.ts
```

Expected: the new test file passes with no warnings.

- [ ] **Step 5: Commit the factory**

```bash
git add apps/english-world/src/shared/storage/localStoragePreference.ts apps/english-world/src/shared/storage/localStoragePreference.test.ts
git commit -m "feat(english-world): add local storage preference factory"
```

---

### Task 2: Migrate the Word Library Preference

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.test.ts`
- Modify: `apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.ts`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Verify: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`

**Interfaces:**
- Consumes: `createLocalStoragePreference<WordLibraryView>()` from Task 1.
- Produces: `wordLibraryViewPreference` with `read()` / `write()` and the existing `WordLibraryView` union type.

- [ ] **Step 1: Change the word-library unit test to the desired configured API**

Replace imports and calls to the specialized functions with the configured instance. For writes, assert the resulting value in an in-memory map rather than asserting a mock call:

```ts
import { wordLibraryViewPreference } from "./wordLibraryViewPreference";

expect(wordLibraryViewPreference.read({ getItem: () => "card" })).toBe(
  "card",
);
const values = new Map<string, string>();
wordLibraryViewPreference.write("card", {
  setItem: (key, value) => values.set(key, value),
});
expect(values.get("english-world:word-library-view")).toBe("card");
```

Keep coverage for valid values, invalid/missing values, read exceptions, the exact production key, and write exceptions.

- [ ] **Step 2: Run the word-library preference test and verify RED**

Run:

```bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/utils/wordLibraryViewPreference.test.ts
```

Expected: FAIL because `wordLibraryViewPreference` is not exported yet.

- [ ] **Step 3: Convert the specialized module into a thin factory configuration**

Keep the type and declare the runtime guard next to it:

```ts
import { createLocalStoragePreference } from "../../../shared/storage/localStoragePreference";

export type WordLibraryView = "list" | "card";

export const wordLibraryViewPreference =
  createLocalStoragePreference<WordLibraryView>({
    key: "english-world:word-library-view",
    defaultValue: "list",
    isValid: (value): value is WordLibraryView =>
      value === "list" || value === "card",
  });
```

Remove the duplicated Storage lookup, validation fallback, and exception handling from this module.

- [ ] **Step 4: Switch `EnglishWorld` to the configured instance**

Import `wordLibraryViewPreference`, initialize with `wordLibraryViewPreference.read`, and persist with `wordLibraryViewPreference.write(view)`. Keep the existing batch-mode and selection resets untouched.

- [ ] **Step 5: Run focused preference and component tests and verify GREEN**

Run:

```bash
pnpm --filter @font/english-world exec vitest run \
  src/shared/storage/localStoragePreference.test.ts \
  src/page/englishWorld/utils/wordLibraryViewPreference.test.ts \
  src/page/englishWorld/EnglishWorld.test.tsx \
  --no-file-parallelism
```

Expected: all focused tests pass, including saving `card` to the unchanged key and restoring it on remount.

- [ ] **Step 6: Commit the migration**

```bash
git add apps/english-world/src/page/englishWorld/EnglishWorld.tsx apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.ts apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.test.ts
git commit -m "refactor(english-world): share local storage preferences"
```

---

### Task 3: Full Verification And Production Deployment

**Files:**
- Verify: `.github/workflows/deploy.yml`
- Verify: `Dockerfile`
- No planned production-code changes; only fix failures caused by Tasks 1–2.

**Interfaces:**
- Consumes: the verified commits from Tasks 1–2 and the existing push-triggered `Verify and deploy frontend` workflow.
- Produces: `origin/yifeng/docker-compose` at local `HEAD` and a refreshed production frontend at `http://124.223.157.129/`.

- [ ] **Step 1: Run changed-file lint**

```bash
pnpm --filter @font/english-world exec eslint \
  src/shared/storage/localStoragePreference.ts \
  src/shared/storage/localStoragePreference.test.ts \
  src/page/englishWorld/utils/wordLibraryViewPreference.ts \
  src/page/englishWorld/utils/wordLibraryViewPreference.test.ts \
  src/page/englishWorld/EnglishWorld.tsx
```

Expected: exit 0 with no lint errors.

- [ ] **Step 2: Run the complete English World test suite**

```bash
pnpm --filter @font/english-world exec vitest run --no-file-parallelism
```

Expected: all test files and tests pass with zero failures.

- [ ] **Step 3: Build the production frontend**

```bash
pnpm --filter @font/english-world build
```

Expected: TypeScript and Vite complete with exit 0.

- [ ] **Step 4: Verify repository state and capture the current production asset**

```bash
git diff --check origin/yifeng/docker-compose...HEAD
git status --short
curl -fsSL --max-time 20 'http://124.223.157.129/?_codex_probe=before-deploy'
```

Expected: no whitespace errors, a clean worktree, and production HTML containing the current `/assets/index-*.js` URL.

- [ ] **Step 5: Push the deployment branch**

```bash
git push origin yifeng/docker-compose
git ls-remote origin refs/heads/yifeng/docker-compose
```

Expected: the remote branch SHA equals local `HEAD`; the push triggers `.github/workflows/deploy.yml`.

- [ ] **Step 6: Wait for the production asset to change**

Poll the cache-busted production HTML at intervals no longer than 30 seconds for up to 15 minutes. Stop when the `/assets/index-*.js` URL differs from the pre-deployment URL, or report the deployment as failed/timed out if it never changes.

- [ ] **Step 7: Verify deployed behavior assets and route health**

Fetch the new JavaScript asset and verify it contains the unchanged key `english-world:word-library-view`. Fetch `/`, `/englishWorld/words`, and `/api/` with cache busting; expect the frontend routes to return HTML successfully and the API proxy to respond without an Nginx gateway error.

- [ ] **Step 8: Record final evidence**

Report the final commit SHA, remote SHA, focused/full test totals, build result, old/new production asset URLs, HTTP checks, and any deployment limitation encountered.
