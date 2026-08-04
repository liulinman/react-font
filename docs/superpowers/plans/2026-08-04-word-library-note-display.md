# English World Word Library Note Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make desktop word notes readable in place by showing collapsible note previews in cards, expandable note rows in the table, and remembering the selected word-library view.

**Architecture:** Keep data fetching and edit orchestration in `EnglishWorld`, move note rendering into focused presentational components, and isolate local-storage validation in a pure preference utility. The table uses Ant Design's `expandable` contract, while card notes use measured two-line clamping and independent local expansion state.

**Tech Stack:** React 18, TypeScript 5.7, Ant Design 5.27, Vitest 4, Testing Library, CSS, Docker Compose/Nginx.

## Global Constraints

- Do not change the `englishNote` API field, backend endpoints, database schema, or edit request flow.
- Treat `undefined`, empty, and whitespace-only `englishNote` values as no note.
- Preserve the original note text and line breaks when displaying it.
- Do not change the existing mobile word-library note interaction.
- Card notes default to two visual lines and expand in place without an inner scrollbar.
- Table notes expand below the source row from a left-side control; multiple rows may remain open.
- Do not enable whole-row expansion because table rows contain links and other interactive controls.
- Store only `list | card` in browser local storage and fall back to `list` on invalid data or storage failure.
- No new runtime dependency.

---

## File Structure

- Create `apps/english-world/src/page/englishWorld/component/WordNoteDisplay.tsx`: shared note validity check plus card preview and expanded-row presentation.
- Create `apps/english-world/src/page/englishWorld/component/WordNoteDisplay.test.tsx`: component behavior and accessibility tests.
- Create `apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.ts`: validated, failure-safe local-storage adapter.
- Create `apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.test.ts`: preference utility tests.
- Modify `apps/english-world/src/page/englishWorld/useColumns.tsx`: remove the remote hover note column and add the near-word note indicator.
- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`: consume preference utility, render card notes, and configure expandable table rows.
- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`: cover integration, table expandable contract, edit flow, and preference restoration.
- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.css`: desktop note preview, table expansion control, expanded panel, wrapping, dark theme, and reduced-motion styles.
- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts`: lock down key note styles.

### Task 1: Persist the word-library view safely

**Files:**
- Create: `apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.test.ts`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx:115-120,417-421`

**Interfaces:**
- Produces: `export type WordLibraryView = "list" | "card"`.
- Produces: `readWordLibraryView(storage?: Pick<Storage, "getItem">): WordLibraryView`.
- Produces: `writeWordLibraryView(view: WordLibraryView, storage?: Pick<Storage, "setItem">): void`.
- Consumes: browser `window.localStorage` only when available; callers never handle storage exceptions.

- [ ] **Step 1: Write the failing utility tests**

```ts
import { describe, expect, it, vi } from "vitest";
import {
  readWordLibraryView,
  writeWordLibraryView,
} from "./wordLibraryViewPreference";

describe("wordLibraryViewPreference", () => {
  it.each(["list", "card"] as const)("reads %s", (value) => {
    expect(readWordLibraryView({ getItem: () => value })).toBe(value);
  });

  it.each([null, "grid", "", "CARD"])(
    "falls back to list for %s",
    (value) => {
      expect(readWordLibraryView({ getItem: () => value })).toBe("list");
    },
  );

  it("falls back when storage throws", () => {
    expect(
      readWordLibraryView({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("list");
  });

  it("writes the validated view and swallows storage failures", () => {
    const setItem = vi.fn();
    writeWordLibraryView("card", { setItem });
    expect(setItem).toHaveBeenCalledWith("english-world:word-library-view", "card");

    expect(() =>
      writeWordLibraryView("list", {
        setItem: () => {
          throw new Error("blocked");
        },
      }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 2: Run the utility tests and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/utils/wordLibraryViewPreference.test.ts`

Expected: FAIL because `wordLibraryViewPreference.ts` does not exist.

- [ ] **Step 3: Implement the minimal preference adapter**

```ts
export type WordLibraryView = "list" | "card";

const WORD_LIBRARY_VIEW_KEY = "english-world:word-library-view";

function defaultReadStorage(): Pick<Storage, "getItem"> | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function defaultWriteStorage(): Pick<Storage, "setItem"> | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function readWordLibraryView(
  storage = defaultReadStorage(),
): WordLibraryView {
  try {
    const value = storage?.getItem(WORD_LIBRARY_VIEW_KEY);
    return value === "card" || value === "list" ? value : "list";
  } catch {
    return "list";
  }
}

export function writeWordLibraryView(
  view: WordLibraryView,
  storage = defaultWriteStorage(),
) {
  try {
    storage?.setItem(WORD_LIBRARY_VIEW_KEY, view);
  } catch {
    // Preference persistence must never block the current interaction.
  }
}
```

- [ ] **Step 4: Run the utility tests and verify GREEN**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/utils/wordLibraryViewPreference.test.ts`

Expected: PASS.

- [ ] **Step 5: Integrate the preference into `EnglishWorld`**

Replace the local view type and constant state initialization with:

```ts
import {
  readWordLibraryView,
  writeWordLibraryView,
  type WordLibraryView,
} from "./utils/wordLibraryViewPreference";

const [libraryView, setLibraryView] = useState<WordLibraryView>(
  readWordLibraryView,
);

const handleLibraryViewChange = (view: WordLibraryView) => {
  setLibraryView(view);
  writeWordLibraryView(view);
  setCardBatchMode(false);
  setSelectedCardIds([]);
};
```

- [ ] **Step 6: Extend the existing view-switch integration test**

After clicking “卡片”, assert:

```ts
expect(window.localStorage.getItem("english-world:word-library-view")).toBe(
  "card",
);
```

Add a separate test that seeds the storage key with `card`, renders the route, and expects `词库卡片视图` to be present without first clicking the segment.

- [ ] **Step 7: Run focused integration tests**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/EnglishWorld.test.tsx -t "word library between list and card views|restores the saved card view"`

Expected: PASS.

- [ ] **Step 8: Commit Task 1**

```bash
git add apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.ts apps/english-world/src/page/englishWorld/utils/wordLibraryViewPreference.test.ts apps/english-world/src/page/englishWorld/EnglishWorld.tsx apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx
git commit -m "feat(english-world): remember word library view"
```

### Task 2: Build focused desktop note display components

**Files:**
- Create: `apps/english-world/src/page/englishWorld/component/WordNoteDisplay.tsx`
- Create: `apps/english-world/src/page/englishWorld/component/WordNoteDisplay.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts`

**Interfaces:**
- Produces: `hasDisplayNote(note?: string | null): boolean`.
- Produces: `WordCardNote({ word, note }: { word: string; note?: string | null }): JSX.Element | null`.
- Produces: `WordExpandedNote({ record, onEdit }: { record: WordList; onEdit(record: WordList): void }): JSX.Element | null`.
- Consumes: `WordList` from `@/server/word/word.type` and existing Ant Design `Button`.

- [ ] **Step 1: Write failing component tests**

```tsx
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasDisplayNote,
  WordCardNote,
  WordExpandedNote,
} from "./WordNoteDisplay";

afterEach(cleanup);

describe("WordNoteDisplay", () => {
  it.each([undefined, null, "", "   \n  "])(
    "treats %s as no note",
    (note) => expect(hasDisplayNote(note)).toBe(false),
  );

  it("preserves short note text without an expand control", () => {
    render(<WordCardNote word="insect" note={"原始词形：insects"} />);
    expect(screen.getByText("原始词形：insects")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /展开 insect 的笔记/ })).toBeNull();
  });

  it("expands and collapses an overflowing card note", () => {
    const scrollHeight = vi
      .spyOn(HTMLElement.prototype, "scrollHeight", "get")
      .mockReturnValue(72);
    const clientHeight = vi
      .spyOn(HTMLElement.prototype, "clientHeight", "get")
      .mockReturnValue(40);

    render(<WordCardNote word="preserve" note={"long note ".repeat(30)} />);
    const expand = screen.getByRole("button", {
      name: "展开 preserve 的笔记",
    });
    expect(expand).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(expand);
    expect(
      screen.getByRole("button", { name: "收起 preserve 的笔记" }),
    ).toHaveAttribute("aria-expanded", "true");

    scrollHeight.mockRestore();
    clientHeight.mockRestore();
  });

  it("renders the full expanded-row note and delegates editing", () => {
    const record = {
      id: 7,
      englishWord: "preserve",
      englishType: 0,
      englishLevel: 1,
      englishNote: "first line\nsecond line",
    };
    const onEdit = vi.fn();
    const { container } = render(
      <WordExpandedNote record={record} onEdit={onEdit} />,
    );
    expect(container.querySelector(".word-note-expanded-text")).toHaveTextContent(
      "first line second line",
    );
    fireEvent.click(screen.getByRole("button", { name: "编辑 preserve 的笔记" }));
    expect(onEdit).toHaveBeenCalledWith(record);
  });
});
```

- [ ] **Step 2: Run the component tests and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/component/WordNoteDisplay.test.tsx`

Expected: FAIL because `WordNoteDisplay.tsx` does not exist.

- [ ] **Step 3: Implement note validation and the card component**

Implement `WordCardNote` with:

```tsx
const [expanded, setExpanded] = useState(false);
const [overflowing, setOverflowing] = useState(false);
const contentRef = useRef<HTMLParagraphElement>(null);

useLayoutEffect(() => {
  if (expanded) return;
  const node = contentRef.current;
  if (!node) return;
  const measure = () => setOverflowing(node.scrollHeight > node.clientHeight + 1);
  measure();
  if (typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }
  const observer = new ResizeObserver(measure);
  observer.observe(node);
  return () => observer.disconnect();
}, [expanded, note]);
```

Render a `.word-card-note` region containing the label “我的笔记”, a `<p>` with `.word-card-note-text` and conditional `.word-card-note-text-expanded`, plus a native button only when `overflowing || expanded`. Set `aria-expanded`, use the exact accessible labels from the tests, and stop button click propagation.

- [ ] **Step 4: Implement the expanded-row component**

Render `.word-note-expanded-panel` with:

```tsx
<div className="word-note-expanded-head">
  <strong>{record.englishWord} · 我的笔记</strong>
  <Button
    aria-label={`编辑 ${record.englishWord} 的笔记`}
    size="small"
    type="link"
    onClick={(event) => {
      event.stopPropagation();
      onEdit(record);
    }}
  >
    编辑笔记
  </Button>
</div>
<p className="word-note-expanded-text">{record.englishNote}</p>
```

Return `null` when `hasDisplayNote(record.englishNote)` is false.

- [ ] **Step 5: Add the desktop note styles**

Add focused rules to `EnglishWorld.css`:

```css
.word-card-note {
  padding: 10px 11px;
  border-left: 3px solid color-mix(in srgb, var(--ew-accent) 62%, white);
  border-radius: 7px;
  background: color-mix(in srgb, var(--ew-accent) 4%, var(--ew-surface));
}

.word-card-note-text {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--ew-text-secondary);
  line-height: 1.6;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.word-card-note-text-expanded {
  display: block;
  overflow: visible;
  -webkit-line-clamp: unset;
}

.word-note-expanded-text {
  margin: 0;
  color: var(--ew-text-secondary);
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}
```

Also style the label, toggle, expanded panel/head, dark theme through existing variables, and disable any new transition in the existing `prefers-reduced-motion` block.

- [ ] **Step 6: Add visual contract assertions**

Extend `EnglishWorld.visual.test.ts` to assert that the stylesheet includes:

```ts
expect(styles).toMatch(
  /\.word-card-note-text\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*pre-wrap;[^}]*-webkit-line-clamp:\s*2;/s,
);
expect(styles).toMatch(
  /\.word-note-expanded-text\s*\{[^}]*overflow-wrap:\s*anywhere;[^}]*white-space:\s*pre-wrap;/s,
);
```

- [ ] **Step 7: Run component and visual tests**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/component/WordNoteDisplay.test.tsx src/page/englishWorld/EnglishWorld.visual.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

```bash
git add apps/english-world/src/page/englishWorld/component/WordNoteDisplay.tsx apps/english-world/src/page/englishWorld/component/WordNoteDisplay.test.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css apps/english-world/src/page/englishWorld/EnglishWorld.visual.test.ts
git commit -m "feat(english-world): add inline note displays"
```

### Task 3: Integrate card notes and expandable table rows

**Files:**
- Modify: `apps/english-world/src/page/englishWorld/useColumns.tsx:1-20,40-70,225-250`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx:1-55,338-345,690-835,977-1015`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes: `hasDisplayNote`, `WordCardNote`, and `WordExpandedNote` from Task 2.
- Produces: `TableProps<WordList>["expandable"]` with `rowExpandable`, `expandedRowRender`, `expandRowByClick: false`, and an accessible left-side `expandIcon`.
- Preserves: all existing `useColumns` props and non-note columns.

- [ ] **Step 1: Write failing integration tests for the table contract**

Add a test that retrieves the latest mocked Table props and asserts:

```tsx
const tableProps = tablePropsMock.mock.calls.at(-1)?.[0] as {
  columns?: Array<{ dataIndex?: string; render?: (...args: never[]) => React.ReactNode }>;
  expandable?: {
    rowExpandable?: (record: Record<string, unknown>) => boolean;
    expandedRowRender?: (record: Record<string, unknown>) => React.ReactNode;
    expandRowByClick?: boolean;
  };
};

expect(tableProps.columns?.some((column) => column.dataIndex === "englishNote")).toBe(false);
expect(tableProps.expandable?.expandRowByClick).toBe(false);
expect(
  tableProps.expandable?.rowExpandable?.({ englishNote: "first\nsecond" }),
).toBe(true);
expect(tableProps.expandable?.rowExpandable?.({ englishNote: "  " })).toBe(false);
```

Render `expandedRowRender` with a complete `WordList` record and assert the full note and “编辑笔记” button appear.

- [ ] **Step 2: Write failing integration tests for cards and word indicators**

Mock a response containing one note-bearing word, switch to cards, and assert “我的笔记” plus the note are visible rather than the old “有笔记” footer. Inspect the word column renderer in list mode and assert it renders a `.word-note-indicator` for a valid note but not for whitespace.

- [ ] **Step 3: Run the new integration tests and verify RED**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/EnglishWorld.test.tsx -t "exposes notes|renders notes inline"`

Expected: FAIL because the table lacks `expandable`, the old note column still exists, and cards do not render `WordCardNote`.

- [ ] **Step 4: Update `useColumns`**

Remove `Popover` and the `englishNote` column. Change the word renderer signature to receive the record and add:

```tsx
{hasDisplayNote(record.englishNote) && (
  <span className="word-note-indicator">有笔记</span>
)}
```

Keep the existing link, pronunciation button, and all non-note columns unchanged.

- [ ] **Step 5: Render card notes**

After `.word-card-status-row`, render:

```tsx
<WordCardNote word={record.englishWord} note={record.englishNote} />
```

Change `.word-card-meta` to render only when `record.englishReference` exists, and remove the old note status `<span>有笔记</span>`.

- [ ] **Step 6: Configure expandable table notes**

Pass this contract to `<Table>`:

```tsx
expandable={{
  columnWidth: 48,
  expandRowByClick: false,
  rowExpandable: (record) => hasDisplayNote(record.englishNote),
  expandedRowRender: (record) => (
    <WordExpandedNote record={record} onEdit={handleEdit} />
  ),
  expandIcon: ({ expanded, onExpand, record }) =>
    hasDisplayNote(record.englishNote) ? (
      <button
        aria-expanded={expanded}
        aria-label={`${expanded ? "收起" : "展开"} ${record.englishWord} 的笔记`}
        className="word-note-expand-button"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onExpand(record, event);
        }}
      >
        <RightOutlined aria-hidden="true" rotate={expanded ? 90 : 0} />
      </button>
    ) : null,
}}
```

Import `RightOutlined` with the existing Ant icons and preserve `virtual`, pagination, and scroll settings.

- [ ] **Step 7: Style the left-side indicator and expand control**

Add `.word-note-indicator` and `.word-note-expand-button` rules with a 32px minimum interactive size, visible focus outline, accent color, and reduced-motion fallback. Ensure the indicator fits under long words without increasing the dedicated column width.

- [ ] **Step 8: Run focused integration tests and fix only observed failures**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/EnglishWorld.test.tsx`

Expected: PASS, including existing reference, quick mastery, batch, and routing tests.

- [ ] **Step 9: Run the complete focused feature suite**

Run: `pnpm --filter @font/english-world test --run src/page/englishWorld/utils/wordLibraryViewPreference.test.ts src/page/englishWorld/component/WordNoteDisplay.test.tsx src/page/englishWorld/EnglishWorld.test.tsx src/page/englishWorld/EnglishWorld.visual.test.ts`

Expected: PASS.

- [ ] **Step 10: Commit Task 3**

```bash
git add apps/english-world/src/page/englishWorld/useColumns.tsx apps/english-world/src/page/englishWorld/EnglishWorld.tsx apps/english-world/src/page/englishWorld/EnglishWorld.test.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css
git commit -m "feat(english-world): expand notes in the word library"
```

### Task 4: Full verification and deployment

**Files:**
- Verify only; no expected source changes.
- Deployment manifest: `../deploy/docker-compose.yml`.

**Interfaces:**
- Consumes: completed frontend build from Tasks 1-3.
- Produces: refreshed `english-world-frontend:latest` container served on local port 80 with the existing backend, MySQL, and Redis dependencies.

- [ ] **Step 1: Run the complete English World unit suite**

Run: `pnpm --filter @font/english-world test --run`

Expected: all suites pass with zero failed tests.

- [ ] **Step 2: Run lint and production build**

Run: `pnpm --filter @font/english-world lint`

Expected: exit 0.

Run: `pnpm --filter @font/english-world build`

Expected: TypeScript and Vite production build exit 0 and create `apps/english-world/dist`.

- [ ] **Step 3: Inspect the final diff and repository state**

Run: `git status --short && git diff --check && git log -5 --oneline`

Expected: no uncommitted feature files, no whitespace errors, and the design, plan, preference, display, and integration commits are present.

- [ ] **Step 4: Confirm Docker is available without exposing secret contents**

Run: `test -f ../deploy/secrets/mysql.env && test -f ../deploy/secrets/backend.env && docker info --format '{{.ServerVersion}}'`

Expected: both secret files exist and the Docker daemon returns a version. If the desktop daemon is stopped, launch Docker Desktop, wait for `docker info` to succeed, and rerun this check.

- [ ] **Step 5: Build and deploy the existing full stack**

Run: `docker compose -f ../deploy/docker-compose.yml up -d --build frontend`

Expected: the frontend image rebuilds from the current workspace; `frontend` and its declared dependencies start without Compose errors.

- [ ] **Step 6: Verify container health and HTTP delivery**

Run: `docker compose -f ../deploy/docker-compose.yml ps`

Expected: `english-world-frontend`, `english-world-backend`, `english-world-mysql`, and `english-world-redis` are running; MySQL and Redis are healthy.

Run: `curl --fail --silent --show-error --head http://127.0.0.1/englishWorld/words`

Expected: HTTP 200.

Run: `curl --fail --silent --show-error http://127.0.0.1/api/health`

Expected: backend health response if the existing health route is enabled. If that route is not defined, verify an existing read-only API route through the browser instead of adding a new endpoint.

- [ ] **Step 7: Perform a browser smoke check**

Open `http://127.0.0.1/englishWorld/words` and verify:

- A note-bearing card shows its note without hover and expands/collapses in place.
- A note-bearing table row has a left-side expand button and shows the full note underneath.
- Multiple table notes can remain open.
- “编辑笔记” opens the existing edit dialog for the correct word.
- Reloading preserves the chosen list/card view.
- No-note rows, word links, pronunciation, mastery editing, references, card batch mode, and mobile routing remain usable.

- [ ] **Step 8: Record deployment evidence**

Capture the deployed container status, HTTP status, final commit IDs, and any environment-only warning in the final handoff. Do not commit generated `dist`, Docker layers, credentials, or `.superpowers` browser artifacts.
