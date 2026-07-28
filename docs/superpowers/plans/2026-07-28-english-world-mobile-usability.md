# English World Mobile Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/englishWorldMobile` comfortable and reliable on phone viewports from 320px wide upward without changing desktop routes or business behavior.

**Architecture:** Keep the existing `activeView` state and mobile components, but make a persistent `antd-mobile` `TabBar` the primary destination switcher. Centralize dynamic-viewport, safe-area, touch-target, popup, card, statistics, AI-tool, and Context Lab rules in `EnglishWorldMobile.css`; add semantic class hooks where inline styles currently prevent responsive behavior. Verify the real browser layout with one focused Cypress spec and preserve component behavior with existing Vitest coverage.

**Tech Stack:** React 18, TypeScript 5.7, antd-mobile 5.37, CSS, Vitest 4, Cypress 15, Vite 6.

## Global Constraints

- Only `/englishWorldMobile` and its mobile child components are in scope; `/englishWorld/*` desktop pages must not change.
- Support phone viewports at 320x568 and 390x844 without horizontal page overflow.
- Primary navigation and icon actions must expose at least 44px touch targets.
- Use `100dvh` with a `100vh` fallback and include `env(safe-area-inset-bottom)`.
- Preserve API contracts, authentication, learning rules, AI prompts, validation, empty states, errors, and retries.
- Add no runtime dependency.
- Do not modify the unrelated dirty file `apps/web-utils/src/page/home/home.style.ts`.

---

## File Map

- Create `apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts`: authenticated browser regression for navigation, narrow word cards, statistics, and Context Lab fixed actions.
- Modify `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.test.tsx`: component-level contract for the four primary destinations and active-view switching.
- Modify `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx`: bottom navigation, page-specific header action, semantic layout classes, and popup sizing hooks.
- Modify `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`: all responsive viewport, safe-area, touch-target, card, popup, statistics, AI, and Context Lab rules.
- Modify `apps/english-world/src/page/englishWorldMobile/WordAgentTabMobile.tsx`: semantic class hooks and dynamic popup sizing only.
- Modify `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx`: semantic popup hooks and dynamic popup sizing only.

### Task 1: Persistent Mobile Navigation And Viewport Shell

**Files:**

- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.test.tsx:51`
- Create: `apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx:1-33,405-479`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css:1-28`

**Interfaces:**

- Consumes: existing `activeView: "review" | "list" | "stats" | "aiTool"` and `getMobileViewTitle(activeView)`.
- Produces: `.mobile-bottom-nav`, `.mobile-header-action`, and a single `.mobile-content` scroll region; later Cypress tasks rely on `[role="tab"]` destination labels.

- [ ] **Step 1: Add the failing component navigation contract**

Add a test that renders the page, verifies all four destinations, selects
`词库`, and confirms the title changes:

```tsx
it("switches the primary mobile destination from the persistent tab bar", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <EnglishWorldMobile />
    </MemoryRouter>,
  );

  expect(screen.getByRole("tab", { name: "今日学习" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "词库" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "统计" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "工具" })).toBeInTheDocument();

  await user.click(screen.getByRole("tab", { name: "词库" }));

  expect(screen.getByPlaceholderText("搜索单词或中文")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run from `apps/english-world`:

```bash
pnpm test --run src/page/englishWorldMobile/EnglishWorldMobile.test.tsx
```

Expected: FAIL because no elements expose the four persistent tab roles.

- [ ] **Step 3: Add the failing browser navigation and viewport test**

Create the Cypress spec with authenticated API fixtures and this first case:

```ts
const user = {
  id: 1,
  username: "mobile-tester",
  avatar: "",
  createTime: "2026-01-01 00:00:00",
  updateTime: "2026-01-01 00:00:00",
};

const mockMobileApis = () => {
  cy.intercept("POST", "/api/user/getCurrentUser", {
    code: 200,
    message: "ok",
    data: user,
  }).as("currentUser");
  cy.intercept("POST", "/api/english/filterWordList", {
    code: 200,
    message: "ok",
    data: { list: [], total: 0, totalPages: 0 },
  }).as("wordFilter");
  cy.intercept("POST", "/api/english/englishStats", {
    code: 200,
    message: "ok",
    data: {
      levelCount: 0,
      totalCount: 0,
      percentage: 0,
      dailyStats: [],
      partSpeechStatisticalClass: {},
    },
  }).as("englishStats");
  cy.intercept("POST", "**/context-lab/history", {
    code: 200,
    message: "ok",
    data: { list: [], total: 0, page: 1, pageSize: 10 },
  }).as("contextHistory");
};

const expectNoPageOverflow = () => {
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(
      document.documentElement.clientWidth,
    );
  });
};

describe("english world mobile responsive shell", () => {
  beforeEach(mockMobileApis);

  [390, 320].forEach((width) => {
    it(`keeps primary navigation usable at ${width}px`, () => {
      cy.viewport(width, width === 320 ? 568 : 844);
      cy.visit("/englishWorldMobile");
      cy.wait("@currentUser");

      cy.get(".mobile-bottom-nav").should("be.visible");
      cy.contains('[role="tab"]', "词库").click();
      cy.get(".adm-nav-bar-title").should("have.text", "词库");
      cy.get(".mobile-bottom-nav .adm-tab-bar-item").each(($tab) => {
        const rect = $tab[0].getBoundingClientRect();
        expect(rect.height).to.be.at.least(44);
        expect(rect.width).to.be.at.least(44);
      });
      expectNoPageOverflow();
    });
  });
});
```

- [ ] **Step 4: Run the focused Cypress spec and confirm RED**

Run from `apps/english-world`:

```bash
pnpm cypress:ensure
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "pnpm exec cypress run --spec cypress/e2e/english-world-mobile-responsive.cy.ts"
```

Expected: FAIL because `.mobile-bottom-nav` does not exist.

- [ ] **Step 5: Implement the destination bar and shell variables**

Import `TabBar` plus valid existing icons and replace the top destination
buttons with a filter-only page action:

```tsx
import { TabBar } from "antd-mobile";
import {
  AppOutline,
  AppstoreOutline,
  FilterOutline,
  HistogramOutline,
  UnorderedListOutline,
} from "antd-mobile-icons";

const mobileDestinations = [
  { key: "review", title: "今日学习", icon: <AppOutline /> },
  { key: "list", title: "词库", icon: <UnorderedListOutline /> },
  { key: "stats", title: "统计", icon: <HistogramOutline /> },
  { key: "aiTool", title: "工具", icon: <AppstoreOutline /> },
] as const;
```

Render the page action and persistent navigation:

```tsx
<NavBar
  back={null}
  right={
    activeView === "list" ? (
      <Button
        aria-label="筛选单词"
        className="mobile-header-action"
        fill="none"
        onClick={() => setShowFilter(true)}
      >
        <FilterOutline />
      </Button>
    ) : null
  }
>
  {getMobileViewTitle(activeView)}
</NavBar>

<div
  className="mobile-bottom-nav"
  aria-label="主要导航"
  role="tablist"
>
  <TabBar
    activeKey={activeView}
    onChange={(key) =>
      setActiveView(key as "review" | "list" | "stats" | "aiTool")
    }
  >
    {mobileDestinations.map((item) => (
      <TabBar.Item
        key={item.key}
        aria-label={item.title}
        aria-selected={activeView === item.key}
        icon={item.icon}
        title={
          <span
            aria-selected={activeView === item.key}
            role="tab"
            tabIndex={activeView === item.key ? 0 : -1}
          >
            {item.title}
          </span>
        }
      />
    ))}
  </TabBar>
</div>
```

Add shell CSS:

```css
.english-world-mobile {
  --mobile-nav-height: 64px;
  --mobile-safe-bottom: env(safe-area-inset-bottom, 0px);
  height: 100vh;
  height: 100dvh;
  min-width: 0;
  overflow: hidden;
}

.mobile-content {
  min-width: 0;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-bottom: calc(
    var(--mobile-nav-height) + var(--mobile-safe-bottom) + 16px
  );
  -webkit-overflow-scrolling: touch;
}

.mobile-bottom-nav {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 80;
  background: rgba(255, 255, 255, 0.98);
  border-top: 1px solid #e5e7eb;
  padding-bottom: var(--mobile-safe-bottom);
}

.mobile-bottom-nav [role="tab"],
.mobile-header-action {
  min-width: 44px;
  min-height: 44px;
}
```

- [ ] **Step 6: Verify GREEN and commit**

Run:

```bash
pnpm test --run src/page/englishWorldMobile/EnglishWorldMobile.test.tsx
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "pnpm exec cypress run --spec cypress/e2e/english-world-mobile-responsive.cy.ts"
git add apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.test.tsx apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css
git commit -m "feat(english-world): add mobile destination navigation"
```

Expected: focused Vitest and Cypress navigation cases PASS.

### Task 2: Narrow Word Cards And Reachable Popups

**Files:**

- Modify: `apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx:547-745,900-1100`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css:432-610`

**Interfaces:**

- Consumes: Task 1 bottom-spacing variables and `词库` tab.
- Produces: `.word-card-actions`, `.word-list-total`, `.filter-popup`, `.filter-actions`, `.edit-modal`, and safe floating-action placement.

- [ ] **Step 1: Add a failing 320px long-content case**

Override `wordFilter` with a deliberately long record, enter the word library,
and assert card containment and 44px actions:

```ts
it("contains long word content and keeps its actions tappable at 320px", () => {
  cy.intercept("POST", "/api/english/filterWordList", {
    code: 200,
    message: "ok",
    data: {
      list: [{
        id: 101,
        englishWord: "pneumonoultramicroscopicsilicovolcanoconiosis",
        englishPhonetic: "njuːmənoʊʌltrəmaɪkrəskɒpɪksɪlɪkoʊvɒlkənoʊkoʊniˈoʊsɪs",
        englishType: 0,
        englishChinese: "一个用于验证窄屏换行行为的超长中文释义",
        englishNote: "A continuous note ".repeat(30),
        englishLevel: 1,
        englishReference: "",
        englishImg: "",
        englishPartSpeech: [1, 2, 3, 4],
      }],
      total: 1,
      totalPages: 1,
    },
  }).as("longWordFilter");

  cy.viewport(320, 568);
  cy.visit("/englishWorldMobile");
  cy.wait("@currentUser");
  cy.contains('[role="tab"]', "词库").click();
  cy.wait("@longWordFilter");

  cy.get(".word-card").then(($card) => {
    expect($card[0].scrollWidth).to.be.at.most($card[0].clientWidth);
  });
  cy.get(".word-card-actions button").each(($button) => {
    const rect = $button[0].getBoundingClientRect();
    expect(rect.width).to.be.at.least(44);
    expect(rect.height).to.be.at.least(44);
  });
  expectNoPageOverflow();
});
```

- [ ] **Step 2: Run the Cypress spec and confirm RED**

Run:

```bash
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "pnpm exec cypress run --spec cypress/e2e/english-world-mobile-responsive.cy.ts"
```

Expected: FAIL because `.word-card-actions` and 44px card controls do not exist.

- [ ] **Step 3: Add semantic hooks and responsive popup dimensions**

Replace inline card action and list-total styling:

```tsx
<div className="word-list-total">共 {total} 条</div>

<Space className="word-card-actions">
  <Button aria-label={`编辑 ${item.englishWord}`} fill="none" size="small">
    <EditSOutline />
  </Button>
  <Button
    aria-label={`删除 ${item.englishWord}`}
    className="word-card-delete"
    fill="none"
    size="small"
  >
    <DeleteOutline />
  </Button>
</Space>
```

Use dynamic viewport values in popup `bodyStyle`:

```tsx
bodyStyle={{
  width: "min(88vw, 420px)",
  height: "100dvh",
  maxWidth: "100vw",
}}
```

and:

```tsx
bodyStyle={{
  maxHeight: "calc(100dvh - 12px)",
  borderRadius: "8px 8px 0 0",
}}
```

- [ ] **Step 4: Implement card, action, popup, and FAB CSS**

```css
.search-section {
  position: sticky;
  top: 0;
  z-index: 10;
}

.word-card,
.word-card-header,
.word-card-body,
.word-info {
  min-width: 0;
  max-width: 100%;
}

.word-title,
.word-phonetic,
.word-chinese,
.note-content {
  overflow-wrap: anywhere;
}

.word-card-actions {
  flex: 0 0 auto;
}

.word-card-actions .adm-button,
.mobile-pronunciation-button {
  min-width: 44px;
  min-height: 44px;
}

.fab-container {
  bottom: calc(
    var(--mobile-nav-height) + var(--mobile-safe-bottom) + 16px
  );
}

.filter-popup,
.edit-modal {
  max-height: 100dvh;
  padding-bottom: var(--mobile-safe-bottom);
}

.filter-actions {
  position: sticky;
  bottom: 0;
  background: #fff;
  padding-bottom: calc(16px + var(--mobile-safe-bottom));
}

.filter-actions .adm-button,
.edit-modal .adm-button {
  min-height: 44px;
}

@media (max-width: 360px) {
  .word-card .adm-card-header {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .word-card .adm-card-header-extra {
    margin-left: auto;
  }
}
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "pnpm exec cypress run --spec cypress/e2e/english-world-mobile-responsive.cy.ts"
git add apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css
git commit -m "fix(english-world): contain mobile word library layouts"
```

Expected: long-card and shell cases PASS at 320px and 390px.

### Task 3: Responsive Statistics And AI Tool Results

**Files:**

- Modify: `apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx:746-900`
- Modify: `apps/english-world/src/page/englishWorldMobile/WordAgentTabMobile.tsx:225-469`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`

**Interfaces:**

- Consumes: Task 1 `统计` and `工具` tabs plus Task 1 shell.
- Produces: `.mobile-stats-page`, `.mobile-stats-grid`, `.mobile-stats-card`, `.mobile-chart-card`, `.mobile-chart`, `.mobile-word-agent`, `.mobile-word-agent-result-head`, and `.mobile-word-agent-popup`.

- [ ] **Step 1: Add failing statistics layout assertions**

```ts
it("fits statistics cards and charts inside a 320px viewport", () => {
  cy.viewport(320, 568);
  cy.visit("/englishWorldMobile");
  cy.wait("@currentUser");
  cy.contains('[role="tab"]', "统计").click();
  cy.wait("@englishStats");

  cy.get(".mobile-stats-grid").should("be.visible");
  cy.get(".mobile-stats-card, .mobile-chart-card").each(($item) => {
    const rect = $item[0].getBoundingClientRect();
    expect(rect.left).to.be.at.least(0);
    expect(rect.right).to.be.at.most(320);
  });
  expectNoPageOverflow();
});
```

- [ ] **Step 2: Add a failing long AI-result layout assertion**

Mock the JSON response accepted by the stream endpoint, submit a real query,
and assert the result header and primary action stay inside the viewport:

```ts
it("stacks a long AI result action without horizontal overflow", () => {
  cy.intercept("POST", "/api/word-agent/query-stream", {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: {
      data: {
        words: [{
          word: "pneumonoultramicroscopicsilicovolcanoconiosis",
          phonetic: "njuːmənoʊʌltrəmaɪkrəskɒpɪksɪlɪkoʊvɒlkənoʊkoʊniˈoʊsɪs",
          meaning: "A deliberately long definition for mobile containment.",
          partOfSpeech: [2],
          examples: [{ en: "A long example remains readable.", zh: "长例句。" }],
          ieltsCase: null,
        }],
      },
    },
  }).as("wordAgentQuery");

  cy.viewport(320, 568);
  cy.visit("/englishWorldMobile");
  cy.wait("@currentUser");
  cy.contains('[role="tab"]', "工具").click();
  cy.get('input[placeholder*="confront"]').type("long-word");
  cy.contains("button", "查询").click();
  cy.wait("@wordAgentQuery");

  cy.get(".mobile-word-agent-result-head").then(($header) => {
    expect($header[0].scrollWidth).to.be.at.most($header[0].clientWidth);
    const headerRect = $header[0].getBoundingClientRect();
    cy.get(".mobile-word-agent-add").then(($button) => {
      const buttonRect = $button[0].getBoundingClientRect();
      expect(buttonRect.width).to.be.closeTo(headerRect.width, 1);
    });
  });
  expectNoPageOverflow();
});
```

- [ ] **Step 3: Run the Cypress spec and confirm RED**

Run:

```bash
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "pnpm exec cypress run --spec cypress/e2e/english-world-mobile-responsive.cy.ts"
```

Expected: FAIL because the statistics semantic classes do not exist.

- [ ] **Step 4: Replace statistics inline layout with semantic classes**

Use this structure while preserving chart options and loading behavior:

```tsx
<div className="mobile-stats-page">
  {statsLoading ? (
    <div className="mobile-stats-loading"><Loading /></div>
  ) : (
    <>
      <div className="mobile-stats-grid">
        {summaryStats.map((item) => (
          <Card key={item.label} className="mobile-stats-card">
            <div className="mobile-stats-label">{item.label}</div>
            <div className="mobile-stats-value" style={{ color: item.color }}>
              {item.label === "掌握率" ? `${item.value}%` : item.value}
            </div>
          </Card>
        ))}
      </div>
      <Card title="每日新增单词" className="mobile-chart-card">
        <ReactECharts className="mobile-chart" option={optionBar} />
      </Card>
      <Card title="词性分布" className="mobile-chart-card">
        <ReactECharts className="mobile-chart" option={optionPie} />
      </Card>
    </>
  )}
</div>
```

Keep the existing level picker trigger inside `.mobile-stats-label`.

- [ ] **Step 5: Add AI-tool class hooks and popup constraints**

Replace the root and result header inline layout with:

```tsx
<div className="mobile-word-agent">
  <Card className="mobile-word-agent-query">...</Card>
  <div className="mobile-word-agent-results">
    <Card className="mobile-word-agent-result">
      <div className="mobile-word-agent-result-head">
        <div className="mobile-word-agent-result-title">...</div>
        <Button className="mobile-word-agent-add">加入单词本</Button>
      </div>
    </Card>
  </div>
</div>
```

Set the add popup body:

```tsx
className="mobile-word-agent-popup"
bodyStyle={{
  borderRadius: "8px 8px 0 0",
  maxHeight: "calc(100dvh - 12px)",
  overflowY: "auto",
}}
```

- [ ] **Step 6: Add statistics and AI responsive CSS**

```css
.mobile-stats-page,
.mobile-word-agent {
  min-width: 0;
  padding: 16px;
}

.mobile-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.mobile-stats-card,
.mobile-chart-card,
.mobile-word-agent-result {
  min-width: 0;
  border-radius: 8px;
}

.mobile-chart {
  width: 100%;
  height: 240px;
}

.mobile-word-agent-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.mobile-word-agent-result-title {
  min-width: 0;
  overflow-wrap: anywhere;
}

.mobile-word-agent-add {
  min-height: 44px;
}

.mobile-word-agent-popup {
  max-height: calc(100dvh - 12px);
  padding-bottom: var(--mobile-safe-bottom);
}

@media (max-width: 360px) {
  .mobile-word-agent-result-head {
    flex-direction: column;
  }

  .mobile-word-agent-add {
    width: 100%;
  }

  .mobile-chart {
    height: 210px;
  }
}
```

- [ ] **Step 7: Verify GREEN and commit**

Run:

```bash
pnpm test --run src/page/englishWorldMobile/EnglishWorldMobile.test.tsx
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "pnpm exec cypress run --spec cypress/e2e/english-world-mobile-responsive.cy.ts"
git add apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.tsx apps/english-world/src/page/englishWorldMobile/WordAgentTabMobile.tsx apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css
git commit -m "fix(english-world): adapt mobile stats and tools"
```

Expected: statistics layout, navigation, and word-card cases PASS.

### Task 4: Context Lab Safe-Area Actions And Final Verification

**Files:**

- Modify: `apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts`
- Modify: `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx:415-655,773-844`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css:614-870`

**Interfaces:**

- Consumes: Task 1 `--mobile-nav-height` and `--mobile-safe-bottom`.
- Produces: practice content that scrolls above `.mobile-context-submit-bar`, and `.mobile-context-popup` sheets constrained to the dynamic viewport.

- [ ] **Step 1: Add a failing mobile practice-action containment case**

Give the context history fixture a long succeeded task, then assert that the
submit bar sits above the bottom navigation and the final question can scroll
into view:

```ts
it("keeps Context Lab practice actions above the mobile navigation", () => {
  cy.intercept("POST", "**/context-lab/history", {
    code: 200,
    message: "ok",
    data: {
      list: [{
        id: 37,
        taskId: 37,
        status: "succeeded",
        sourceType: "custom",
        words: ["responsive", "practice", "mobile"],
        articleExerciseId: 37,
        article: Array.from(
          { length: 8 },
          (_, index) => `Paragraph ${index + 1}. Mobile reading content.`,
        ).join("\n\n"),
        questions: Array.from({ length: 8 }, (_, index) => ({
          id: `q-${index + 1}`,
          stem: `Question ${index + 1}`,
          options: ["First", "Second", "Third"],
        })),
      }],
      total: 1,
      page: 1,
      pageSize: 10,
    },
  }).as("mobileContextHistory");

  cy.viewport(390, 844);
  cy.visit("/englishWorldMobile");
  cy.wait("@currentUser");
  cy.contains('[role="tab"]', "工具").click();
  cy.contains('[role="tab"]', "Context Lab").click();
  cy.wait("@mobileContextHistory");
  cy.contains("button", "开始练习").click();

  cy.get(".mobile-context-submit-bar").then(($submit) => {
    const submitRect = $submit[0].getBoundingClientRect();
    cy.get(".mobile-bottom-nav").then(($nav) => {
      const navRect = $nav[0].getBoundingClientRect();
      expect(submitRect.bottom).to.be.at.most(navRect.top);
    });
  });
  cy.get(".mobile-content").scrollTo("bottom");
  cy.get(".mobile-context-question-card").last().should("be.visible");
  expectNoPageOverflow();
});
```

- [ ] **Step 2: Run the Cypress spec and confirm RED**

Run:

```bash
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "pnpm exec cypress run --spec cypress/e2e/english-world-mobile-responsive.cy.ts"
```

Expected: FAIL because the submit bar currently uses an independent bottom
offset and practice padding does not reserve both fixed bars.

- [ ] **Step 3: Constrain Context Lab popups and fixed actions**

Add `className="mobile-context-popup"` to mark/import/attempt popups and replace
`80vh` with:

```tsx
bodyStyle={{
  borderRadius: "8px 8px 0 0",
  maxHeight: "calc(100dvh - 12px)",
  overflowY: "auto",
}}
```

Use shared CSS:

```css
.mobile-context-lab--practice {
  min-height: calc(100dvh - 45px);
  padding-bottom: calc(
    112px + var(--mobile-nav-height) + var(--mobile-safe-bottom)
  );
}

.mobile-context-submit-bar {
  bottom: calc(var(--mobile-nav-height) + var(--mobile-safe-bottom));
  padding-bottom: 12px;
}

.mobile-context-submit-bar .adm-button,
.mobile-context-popup .adm-button {
  min-height: 44px;
}

.mobile-context-popup {
  max-height: calc(100dvh - 12px);
  padding-bottom: var(--mobile-safe-bottom);
}
```

- [ ] **Step 4: Run all focused tests**

Run:

```bash
pnpm test --run src/page/englishWorldMobile/EnglishWorldMobile.test.tsx src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx src/page/englishWorldMobile/MobileBritishPronunciationButton.test.tsx src/page/englishWorldMobile/mobileContextLab.test.ts src/page/englishWorldMobile/mobileViewModel.test.ts
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "pnpm exec cypress run --spec cypress/e2e/english-world-mobile-responsive.cy.ts"
```

Expected: all focused Vitest files and all mobile Cypress cases PASS.

- [ ] **Step 5: Build and inspect real screenshots**

Run:

```bash
pnpm build
```

Start Vite on an available local port, inspect `/englishWorldMobile` at
320x568 and 390x844, and save screenshots for the study home, word library,
statistics, AI tools, and Context Lab practice. Confirm:

```text
- no text or control overlap
- no horizontal scrollbar
- bottom navigation remains visible
- fixed actions remain above the navigation
- long words and notes wrap inside cards
- popup actions remain reachable
```

- [ ] **Step 6: Commit the final task**

```bash
git add apps/english-world/cypress/e2e/english-world-mobile-responsive.cy.ts apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css
git commit -m "fix(english-world): keep mobile practice actions reachable"
```

- [ ] **Step 7: Fresh final verification**

Run:

```bash
git diff --check HEAD~4..HEAD
pnpm test --run src/page/englishWorldMobile
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "pnpm exec cypress run --spec cypress/e2e/english-world-mobile-responsive.cy.ts"
pnpm build
git status --short
```

Expected:

```text
Vitest: PASS
Cypress mobile responsive spec: PASS
TypeScript and Vite build: PASS
git diff --check: no output
git status: only the pre-existing apps/web-utils/src/page/home/home.style.ts change remains
```
