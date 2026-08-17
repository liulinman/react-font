# English World Mobile Tools and Account Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Tools and My tabs with statistics, memory map, coverage statistics, in-app notifications, learning settings, appearance, account actions, and PWA status.

**Architecture:** Reuse existing API descriptors, notification context, theme context, settings functions, chart adapters, and memory-map types. Mobile pages compose grouped lists, accessible summaries, and full-screen routes; desktop drawers/tables/charts are not reused as UI. Logout clears user-scoped mobile storage before returning to login.

**Tech Stack:** React Query, Ant Design Mobile, ECharts where useful, existing contexts/APIs, IndexedDB, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-17-english-world-mobile-pwa-full-redesign-design.md`

## Global Constraints

- Tools hub contains every specialist capability with no desktop links.
- Charts always have an equivalent textual summary.
- Statistics refresh and new planning require connectivity; cached read-only statistics remain visible.
- Notifications are in-app only; no push-permission UI.
- Logout clears user-scoped offline business data even when the server logout call fails.

---

### Task 1: Build the Tools hub and route ownership test

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/tools/MobileToolsPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/tools/MobileToolsPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: mobile capability manifest.
- Produces: `/mobile/tools` grouped navigation.

- [ ] **Step 1: Write the failing route ownership test**

~~~tsx
renderMobile(<MobileToolsPage />);
for (const label of ["AI 查词", "Context Lab", "雅思核心", "记忆地图", "学习统计", "批量导入", "覆盖统计"]) {
  expect(screen.getByRole("link", { name: new RegExp(label) })).toHaveAttribute("href", expect.stringMatching(/^\/mobile\//));
}
expect(screen.queryByText(/打开桌面版/)).not.toBeInTheDocument();
~~~

- [ ] **Step 2: Implement grouped tools**

Use iOS-style grouped rows with title, short description, status when offline, and disclosure. Keep search/AI/import entries consistent with Home. Disable only operations that require immediate network; do not disable navigation to cached read-only surfaces.

~~~ts
export const MOBILE_TOOL_ITEMS = [
  { id: "ai-word", label: "AI 查词", path: "/mobile/tools/ai-word", onlineOnly: true },
  { id: "context-lab", label: "Context Lab", path: "/mobile/tools/context-lab", onlineOnly: false },
  { id: "ielts-core", label: "雅思核心", path: "/mobile/tools/ielts-core", onlineOnly: false },
  { id: "memory-map", label: "记忆地图", path: "/mobile/tools/memory-map", onlineOnly: false },
  { id: "stats", label: "学习统计", path: "/mobile/tools/stats", onlineOnly: false },
  { id: "bulk-import", label: "批量导入", path: "/mobile/tools/bulk-import", onlineOnly: true },
  { id: "overwrite-stats", label: "覆盖统计", path: "/mobile/tools/overwrite-stats", onlineOnly: true },
] as const;
~~~

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/tools
git add apps/english-world/src/page/englishWorldMobile/features/tools apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile tools hub"
~~~

### Task 2: Add accessible mobile statistics

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/stats/MobileStatsPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/stats/statsViewModel.ts`
- Create: `apps/english-world/src/page/englishWorldMobile/features/stats/MobileStatsPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `englishStats` and existing summary/daily/part-speech adapters.
- Produces: `MobileStatsSummary` and cached snapshot key `stats:<level>`.

- [ ] **Step 1: Write failing semantic-summary tests**

~~~tsx
expect(await screen.findByRole("heading", { name: "学习统计" })).toBeVisible();
expect(screen.getByRole("region", { name: "统计文字摘要" })).toHaveTextContent("总学习单词 428");
expect(screen.getByRole("img", { name: "最近新增单词趋势" })).toHaveAttribute("aria-describedby", "mobile-stats-timeline-summary");
~~~

- [ ] **Step 2: Implement cards, chart, and text equivalents**

~~~ts
export type MobileStatsSummary = {
  totalCount: number;
  levelCount: number;
  percentageText: string;
  dailyText: string;
  partSpeechText: string;
};
~~~

Use one-column cards; charts can use `ReactECharts` but remain lazy-loaded and no wider than their container. Cache the last successful response by level. Offline shows cached timestamp and disables refresh with explicit copy.

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/stats
git add apps/english-world/src/page/englishWorldMobile/features/stats apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add accessible mobile statistics"
~~~

### Task 3: Add mobile memory map and word journey

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/memoryMap/MobileMemoryMapPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/memoryMap/MobileWordJourneyPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/memoryMap/MobileMemoryMapPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `memoryMapOverview`, `memoryMapWordDetail`, `memoryMapUpdateLevel`, memory cluster labels/adapters.
- Produces: overview and `?wordId=<id>` journey route state.

- [ ] **Step 1: Write failing cluster and next-action tests**

~~~tsx
expect(await screen.findByText("薄弱词")).toBeVisible();
expect(screen.getByText("最近错误")).toBeVisible();
await user.click(screen.getByRole("link", { name: /查看 retain 的学习轨迹/ }));
expect(await screen.findByRole("heading", { name: "retain" })).toBeVisible();
expect(screen.getByRole("link", { name: /建议下一步/ })).toHaveAttribute("href", expect.stringMatching(/^\/mobile\//));
~~~

- [ ] **Step 2: Implement grouped overview and journey route**

Render level distribution, due words, weak words, mistake clusters, recent accuracy, evidence timeline, and next action. Mastery updates require explicit selection and network; invalidate memory and word keys after success. Cache only the latest overview/detail snapshot.

~~~ts
const overviewQuery = useQuery({ queryKey: ["mobile", "memory-map", "overview", days], queryFn: () => request(memoryMapOverview({ days })), enabled: online });
const detailQuery = useQuery({ queryKey: ["mobile", "memory-map", "word", wordId], queryFn: () => request(memoryMapWordDetail({ wordId })), enabled: Number.isInteger(wordId) && wordId > 0 && online });
~~~

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/memoryMap
git add apps/english-world/src/page/englishWorldMobile/features/memoryMap apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile memory map"
~~~

### Task 4: Add read-only coverage statistics

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/coverageStats/MobileCoverageStatsPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/coverageStats/MobileCoverageStatsPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `wordOverwriteStats` and `OverwriteStatsResponse`.
- Produces: compact paged rows ranked by `englishOverwriteCount` and cached-page fallback.

- [ ] **Step 1: Write failing ranking and navigation tests**

~~~tsx
expect(await screen.findByRole("heading", { name: "覆盖统计" })).toBeVisible();
expect(screen.getByText("最高覆盖 12 次")).toBeVisible();
expect(screen.getByRole("link", { name: /查看 retain/ })).toHaveAttribute("href", "/mobile/words/7");
~~~

- [ ] **Step 2: Implement paged coverage analysis**

Use compact paged rows showing word, meaning, overwrite count, mastery, type, and part of speech. The existing POST endpoint is a read query despite its legacy name. Cache each successful page; offline shows a cached page with timestamp and disables uncached pagination. Row selection opens the mobile word detail route.

~~~ts
export const coverageStatsKeys = {
  all: ["mobile", "coverage-stats"] as const,
  page: (page: number, pageSize: number) => ["mobile", "coverage-stats", page, pageSize] as const,
};
const coverageQuery = useQuery({
  queryKey: coverageStatsKeys.page(page, pageSize),
  queryFn: () => request<OverwriteStatsResponse>(wordOverwriteStats({ page, pageSize })),
  enabled: online,
});
~~~

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/coverageStats
git add apps/english-world/src/page/englishWorldMobile/features/coverageStats apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile coverage statistics"
~~~

### Task 5: Add the mobile notification center

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/notifications/MobileNotificationsPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/notifications/MobileNotificationsPage.test.tsx`
- Modify: `apps/english-world/src/notifications/NotificationContext.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/MobileAppShell.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `useNotifications()` and `NotificationItem`.
- Extends context with mobile-safe live announcement data, without importing Ant Design notification UI into the mobile page.

- [ ] **Step 1: Write failing unread/read tests**

~~~tsx
expect(screen.getByRole("tab", { name: /我的，2 条未读/ })).toBeVisible();
renderMobile(<MobileNotificationsPage />);
await user.click(screen.getByRole("button", { name: /未读：雅思词汇已更新/ }));
expect(markRead).toHaveBeenCalledWith(7);
await user.click(screen.getByRole("button", { name: "全部已读" }));
expect(markAllRead).toHaveBeenCalled();
~~~

- [ ] **Step 2: Separate transport events from desktop toast rendering**

Add an optional `latestEvent` to context and keep desktop `notification.open` behind a desktop-surface check. Mobile uses an ARIA live region and the full notification route. Render category, priority, body, publication time, unread state, refresh, and mark actions. Cache provider items in memory only; offline may show the current session list.

~~~ts
type NotificationContextValue = {
  items: NotificationItem[];
  unreadCount: number;
  latestEvent: NotificationItem | null;
  loading: boolean;
  refresh(): Promise<void>;
  markRead(id: number): Promise<void>;
  markAllRead(): Promise<void>;
};
const isMobileSurface = window.location.pathname.startsWith("/mobile");
if (!isMobileSurface) notification.open({ message: event.data.title, description: event.data.body, placement: "topRight" });
setLatestEvent(event.data);
~~~

- [ ] **Step 3: Run desktop and mobile notification suites and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/notifications src/page/englishWorldMobile/features/notifications
git add apps/english-world/src/notifications/NotificationContext.tsx apps/english-world/src/page/englishWorldMobile/features/notifications apps/english-world/src/page/englishWorldMobile/app
git commit -m "feat: add mobile notification center"
~~~

### Task 6: Add settings and appearance routes

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/account/MobileSettingsPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/account/MobileAppearancePage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/account/MobileSettingsPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `getSystemSettings`, `saveSystemSettings`, `DEFAULT_SETTINGS`, `useTheme`.
- Produces: `/mobile/me/settings` and `/mobile/me/appearance`.

- [ ] **Step 1: Write failing complete-settings tests**

~~~tsx
expect(await screen.findByLabelText("默写数量")).toHaveValue(20);
expect(screen.getByRole("group", { name: "默写熟练程度" })).toBeVisible();
expect(screen.getByRole("group", { name: "听写方向" })).toBeVisible();
await user.click(screen.getByRole("button", { name: "保存设置" }));
expect(saveSystemSettings).toHaveBeenCalled();
~~~

- [ ] **Step 2: Implement mobile forms and theme selection**

Expose every `SystemSettings` field with mobile list/picker controls and a named reset confirmation. Preserve form values on network failure. Appearance offers light/dark/system and uses the existing theme context; accent choice remains if desktop already supports it. All changes update semantic CSS tokens.

~~~ts
async function submitSettings(values: SystemSettings) {
  const saved = await saveSystemSettings(values);
  if (!saved) throw new Error("设置保存失败。你的修改仍保留在页面中。");
}
const appearanceOptions: Array<{ label: string; value: ThemeAppearance }> = [
  { label: "浅色", value: "light" },
  { label: "深色", value: "dark" },
  { label: "跟随系统", value: "system" },
];
~~~

- [ ] **Step 3: Verify and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/page/englishWorldMobile/features/account/MobileSettingsPage.test.tsx src/theme
git add apps/english-world/src/page/englishWorldMobile/features/account apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile settings and appearance"
~~~

### Task 7: Add account and PWA status with safe logout

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/features/account/MobileAccountPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/account/MobilePwaStatusPage.tsx`
- Create: `apps/english-world/src/page/englishWorldMobile/features/account/MobileAccountPage.test.tsx`
- Modify: `apps/english-world/src/contexts/AuthContext.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx`

**Interfaces:**
- Consumes: `useAuth`, `mobileStorage.clearUser`, `usePwaUpdate`, connectivity/install-display-mode state.
- Produces: `/mobile/me` and `/mobile/me/app`.

- [ ] **Step 1: Write failing logout cleanup test**

~~~tsx
logoutMock.mockRejectedValueOnce(new Error("offline"));
await user.click(screen.getByRole("button", { name: "退出登录" }));
await user.click(screen.getByRole("button", { name: "确认退出" }));
expect(storage.clearUser).toHaveBeenCalledWith(7);
expect(locationAssign).toHaveBeenCalledWith("/login");
~~~

- [ ] **Step 2: Add a cleanup hook without coupling AuthContext to mobile UI**

~~~ts
export type LogoutCleanup = (user: UserInfo) => Promise<void>;
export function registerLogoutCleanup(cleanup: LogoutCleanup): () => void;
~~~

Register mobile storage cleanup from the PWA provider and invoke cleanups in `logout()` finally semantics before clearing local identity. Account shows identity, notifications, settings, appearance, app status, and sign out. PWA status shows installed/browser mode, online state, cache readiness, version, update readiness, and install instructions; it never claims iOS supports `beforeinstallprompt`.

- [ ] **Step 3: Run auth/account/PWA tests and commit**

~~~bash
pnpm --filter @font/english-world exec vitest run src/contexts/AuthContext.test.tsx src/page/englishWorldMobile/features/account src/page/englishWorldMobile/pwa
git add apps/english-world/src/contexts/AuthContext.tsx apps/english-world/src/page/englishWorldMobile/features/account apps/english-world/src/page/englishWorldMobile/app/mobileRouteConfig.tsx
git commit -m "feat: add mobile account and PWA status"
~~~
