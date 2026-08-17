---
name: English World Mobile PWA
status: final
updated: 2026-08-17
sources:
  - ../../superpowers/specs/2026-07-28-english-world-mobile-usability-design.md
  - ../../superpowers/specs/2026-07-01-mobile-context-lab-sync-design.md
---

# English World Mobile PWA — Experience Spine

`DESIGN.md` is the visual identity contract; this file owns navigation, behavior, states, accessibility, and end-to-end use. The two spines win on conflict with historical specifications or working artifacts.

## Foundation

English World Mobile PWA is a dedicated iOS-oriented PWA for personal use. iPhone portrait is primary; landscape remains operable. The desktop Web UI stays unchanged. Mobile uses an independent `/mobile/*` route tree, Ant Design Mobile components, React Query server state, shared API/domain/state-machine modules, and IndexedDB for resumable local work. Shared business modules import neither desktop Ant Design nor Ant Design Mobile.

The product inherits iOS conventions for system gestures, navigation, safe areas, Dynamic Type, touch targets, selection, software keyboard, light/dark mode, and Reduce Motion. `DESIGN.md` defines the visual delta. The PWA installs from Safari, starts at `/mobile`, and updates from the deployed Web build. `/englishWorldMobile` is a compatibility redirect. No App Store wrapper, TestFlight, native push, or formal physical-device certification is in scope.

## Information Architecture

`bottom-tab-bar` exposes exactly four roots: `学习`, `词库`, `工具`, `我的`. Each preserves its navigation and scroll history. Drill-down routes use `top-navigation-bar` and browser history so edge-back, refresh, and deep links restore the correct mobile surface. No `/mobile/*` route falls back to desktop UI.

| Surface / route | Reached from | Purpose |
|---|---|---|
| Login `/login` | Unauthenticated open / expired session | Sign in, preserve intended mobile destination, report auth failure. |
| Learning home `/mobile` | PWA start / `学习` | Search-first home: find/add a word, AI completion, bulk import, recent words, daily review, learning cockpit. |
| Daily review `/mobile/review` | Learning home / IELTS core | Plan and complete one-question-at-a-time recitation; repair mistakes and view result. |
| Mixed-learning setup `/mobile/learn` | Learning home / cockpit | Choose mode/scope, preview activities, create or resume a session. |
| Mixed-learning session `/mobile/learn/session/:id` | Setup / draft | Complete registered activity types and see session result. |
| Learning cockpit `/mobile/cockpit` | Learning home | Daily coach summary, snapshot, priorities, launch points. |
| Word library `/mobile/words` | `词库` / search results | Search, filter, sort, page, pronounce, and manage the collection. |
| Word detail `/mobile/words/:id` | Word row/search/review/tools | Definitions, pronunciation, examples, tags, notes, images, source, mastery, and maintenance actions. |
| Add/edit word `/mobile/words/new`, `/mobile/words/:id/edit` | Home/library/detail | Create or edit every supported word field, image, note, and mastery value. |
| Tools hub `/mobile/tools` | `工具` | Grouped access to every specialist capability. |
| AI word query `/mobile/tools/ai-word` | Home / Tools | Query, correct, edit, and add an AI-completed word. |
| Context Lab tasks `/mobile/tools/context-lab` | Tools / home | Generate packs and manage pending, failed, or succeeded tasks. |
| Context Lab create `/mobile/tools/context-lab/new` | Task list | Build a pack from weak, random, or custom words. |
| Reader `/mobile/tools/context-lab/:taskId/read` | Succeeded task | Read, select/mark/translate/add words, retain position. |
| Answer `/mobile/tools/context-lab/:taskId/answer` | Reader | Answer in a single-column flow and submit. |
| Result `/mobile/tools/context-lab/:taskId/result/:attemptId` | Submit / attempts | Score, wrong count, weak words, explanations, next actions. |
| Attempts `/mobile/tools/context-lab/:taskId/attempts` | Task / result | Browse attempt history/detail and delete with confirmation. |
| IELTS core `/mobile/tools/ielts-core` | Tools | Review IELTS scope, progress, due items, launch review. |
| Memory map `/mobile/tools/memory-map` | Tools / word detail | Memory summary, clusters, one word's learning journey. |
| Statistics `/mobile/tools/stats` | Tools / cockpit | Summary, timeline, trends, accessible chart explanations. |
| Bulk import `/mobile/tools/bulk-import` | Home / Tools | Choose/paste source, validate, preview, resolve conflicts, import. |
| Coverage statistics `/mobile/tools/overwrite-stats` | Tools | Browse words ranked by overwrite count and open the related word; this surface is read-only. |
| Account `/mobile/me` | `我的` | Identity, sign out, notifications, settings, appearance, PWA status. |
| Notifications `/mobile/me/notifications` | Account / unread badge | Browse/mark in-app notifications read; no system-push permission flow. |
| Settings `/mobile/me/settings` | Account | System and learning preferences. |
| Appearance `/mobile/me/appearance` | Account / Settings | Light, dark, or follow system. |
| PWA status `/mobile/me/app` | Account | Install guidance, offline/cache state, version, safe update. |
| `image-viewer` | Word/import/Context Lab images | Inspect with intentional pinch zoom and pan. |

Complex edits are full-screen routes. Filters, pickers, confirmations, attempt summaries, and selection actions use `bottom-sheet`; sheets never stack. Destructive confirmations name the object and consequence.

## Voice and Tone

Microcopy is concise, calm, and specific. Brand personality lives in `DESIGN.md`.

| Situation | Use | Avoid |
|---|---|---|
| Search | `搜索单词、释义或标签` | `想学点什么？` |
| Empty recent list | `还没有最近查看的单词。先搜索或添加一个。` | `这里空空如也～` |
| Offline | `当前离线。显示最近缓存的内容。` | `网络错误` |
| AI unavailable | `AI 查词需要联网。你的输入已保留。` | `请求失败，请重试` |
| Import result | `已导入 12 个，跳过 3 个已存在的单词。` | `导入成功！` |
| Destructive action | `删除这次练习记录？删除后无法恢复。` | `确定吗？` |
| Update | `新版本已准备好。完成当前操作后即可更新。` | `发现新版本，正在刷新` |
| Review result | `本次答对 18 / 20。查看 2 个需要巩固的单词。` | Streaks, guilt, confetti, exaggerated praise. |

Errors say what failed, what remains safe, and the next action. Counts/timestamps are explicit; API codes stay out of UI. Never promise background sync when deliberate resubmission is required.

## Component Patterns

Visual specs live in `DESIGN.md.Components`; names are exact cross-spine contracts.

| Component | Behavioral rules |
|---|---|
| `mobile-app-shell` | Owns page scroll, safe areas, online/update announcements, tab history, auth/deep-link recovery. |
| `top-navigation-bar` | Root shows title/actions; drill-down shows Back. Destination navigation never sits in its action cluster. |
| `bottom-tab-bar` | `学习` / `词库` / `工具` / `我的`; announces active route; hides only during focused learning where Back remains. |
| `search-field` | Keyboard submits; Clear restores list; focus never zooms; Home results stay in mobile routes. |
| `word-row` | Tap opens detail; pronounce/overflow do not. Swipe shortcuts have equivalent menu/detail actions. |
| `word-detail-card` | Opens full-screen edit; long values wrap; image tap opens `image-viewer`. |
| `pronunciation-button` | Plays British pronunciation, blocks duplicate playback while busy, exposes failure without blocking content. |
| `primary-button` | One per decision area; busy blocks duplicates; nearby copy explains disabled state. |
| `floating-action-button` | Opens add-word route; stays above tab/safe area; hides for keyboard/sheet. |
| `bottom-sheet` | One layer; traps/returns focus; preserves choices on accidental nondestructive dismissal; safe-area actions. |
| `full-screen-form` | Locally drafts after pause, validates beside fields, protects unsaved exit, keeps input/action keyboard-safe. |
| `filter-chip` | Toggle/single-select as labeled; selected announced; wraps rather than forcing page scroll. |
| `status-banner` | Near affected scope, at most one recovery action, noncovering, restrained `aria-live`. |
| `skeleton` | Matches expected geometry; yields to data/empty/error; cached content remains during background refresh. |
| `empty-state` | Gives reason and exactly one next action when one exists. |
| `review-stage` | One activity at a time; restores answer/position; visible progress cannot crowd prompt. |
| `sticky-action-bar` | Tracks keyboard/visual viewport, reserves content padding, prevents duplicate submit and preserves work on failure. |
| `tool-row` | Whole row navigates; optional status reads with title; never executes destructive action from hub. |
| `stat-card` | Tappable only with labeled drill-down; number, period, meaning announced together. |
| `chart-panel` | Touch-explorable without page overflow; always has text summary/table alternative. |
| `context-task-card` | Pending refresh, failed retry, succeeded open; menu gives attempts/delete; async completion remains discoverable. |
| `article-reader` | Preserves position, native selection, marked highlights; never intercepts normal scroll/selection. |
| `selection-action-sheet` | `标记` / `翻译` / `加入词库`; anchored if stable, else sheet; closes on scroll/outside/route/import open. |
| `marked-word-strip` | Shows marks and `预览并导入`; removal reversible until import; existing words skip without failing batch. |
| `question-card` | Enforces question type; result locks answers and reveals correctness/explanation. |
| `result-panel` | Outcome first, repair evidence second, small set of next actions; attempt survives refresh. |
| `notification-row` | Opens related mobile route; marks read only after successful open or explicit action. |
| `badge` | Accessible unread count; clears only after server-confirmed read state. |
| `file-picker` | Announces constraints/file/progress; preserves form on permission/type/size/upload failure; retry/reselect. |
| `update-prompt` | Appears only when no dirty form, active answer/progress, upload, or mutation is at risk; Later defers. |
| `image-viewer` | Pinch zoom/pan and explicit Close; ordinary page layout remains stable. |

## State Patterns

### Global contract

| State | Treatment |
|---|---|
| Cold load | Geometry-matched `skeleton`; auth before protected content; preserve intended deep link. |
| Cached/stale | Show cached read-only data with `可能不是最新`; background refresh does not blank it. |
| Empty | `empty-state` with reason and one valid next action. |
| Request failure | Keep cached data and all input; local `status-banner` with retry. |
| Offline | Shell/recent reads work; drafts and answers persist. AI, fresh stats, new tasks, uploads, submissions require connection. |
| Reconnected | Announce and offer resume/submit. Never auto-replay delete, overwrite-existing import, or another destructive confirmation. |
| Permission/file failure | Name denied permission or invalid type/size/upload beside `file-picker`; preserve form. |
| Focus/keyboard | Visible focus, 16px+ editable type, active field/action above visual keyboard. |
| Mutation | Disable initiating action, show busy, prevent duplicates, warn before abandoning risky work. |
| Session expired | Preserve local draft, Login, then return to intended `/mobile/*` route. |
| Update ready | Defer during dirty/active work; offer update now/later at safe pause; never force refresh. |
| Logout | Confirm unsent work; then clear that user's IndexedDB business data and authenticated cache. |

| Surface group | Required states and recovery |
|---|---|
| Home/cockpit | Loading; no recent/due work; cached/offline snapshot; section error/retry; quick actions remain. |
| Review/mixed learning | Plan loading/empty; restored session; unanswered/answered/correct/incorrect; retained submit failure; result/repair; invalid session. |
| Word library/detail | Load/background refresh; no words/no matches/filter active; pronunciation, edit, delete, upload failure; missing word; cached detail. |
| AI word query | Idle/pending/result/correction/no result; offline with query retained; request/import failure with editable result retained. |
| Context tasks/create | No packs; pending/failed/succeeded/stale; retained generation parameters; task deleted elsewhere; explicit retry/refresh. |
| Reader/answer/result/attempts | Detail failure; selection/marks; unanswered; draft restore; retained submit/import failure; inserted/skipped; no/missing/deleted attempt. |
| IELTS/Memory/Statistics | Loading/no data/partial data/cached stale/refresh failure; text alternative if chart fails. |
| Bulk import | Empty/parsing/invalid/preview/duplicate/conflict/importing/partial result/failure with source+choices retained. |
| Overwrite stats | Empty/validation/preview/confirmation/processing/success/failure with preview retained; offline blocks execute. |
| Notifications | Loading/empty/unread/read/stale/offline/unavailable link; failed mark-read stays unread. |
| Settings/appearance/PWA | Loading/saved/failure with selection retained/system theme/install states/cache unavailable/update states. |
| Login/account | Session check/invalid credentials/network failure/redirect recovery/logout confirmation/confirmed local clear. |

## Interaction Primitives

- Tap is primary; every target is at least 44×44pt.
- Preserve native vertical scroll, meaningful list pull-to-refresh, text selection, and iOS edge-back.
- No essential action depends on hover, right-click, swipe, or long-press. Swipe actions have menu/detail equivalents.
- Selected-text actions dismiss on scroll but never clear marked words.
- Pinch zoom/pan works in `image-viewer` and remains available for long-form content; focus/tap/double-tap never causes layout zoom.
- Complex entry is `full-screen-form`; lightweight choice/confirmation is `bottom-sheet`; modal depth never exceeds one.
- Learning uses sequential stages, not swipe carousels. Browser history tracks meaningful pages, not answer taps.
- Destructive actions require named confirmation and never auto-replay after reconnect.
- Under Reduce Motion remove pulses, springs, transforms; retain immediate state changes.
- Banned: desktop sidebars/tables/split panes, hover-only actions, nested reading cards, forced refresh, horizontal carousels, streak pressure, system-push prompts.

## Accessibility Floor

- WCAG 2.2 AA; visual contrast/focus tokens live in `DESIGN.md` and apply in light/dark.
- Targets are 44pt+; editable controls use `{typography.input}` or larger.
- VoiceOver gets page title on navigation, role/state, selected filter/tab, progress, unread count, upload state, answer correctness, chart summary, meaningful async completion.
- Reading/focus order match; sheets trap focus and return it; Escape closes the topmost dismissible layer.
- Dynamic Type wraps labels/controls and expands rows; essential content/actions never truncate.
- Correctness, task status, unread, mastery, and trends never rely on color alone.
- `chart-panel` supplies text/table alternative; images have useful alt text or are explicitly decorative.
- `article-reader` preserves selection and browser zoom; `image-viewer` has labeled Close and does not trap VoiceOver.
- Reduce Motion, light/dark/system, increased contrast are respected. Audio never autoplays.
- Errors associate to controls; failed submit focuses summary/first invalid field without clearing data.

## Inspiration & Anti-patterns

- **iOS:** tab/drill-down navigation, grouped lists, full-screen forms, action sheets, semantic colors, safe areas, system type/gestures.
- **Existing mobile work:** single scroll ownership, dynamic viewport, stable safe-area offsets, long-word containment, touch-first selection fallback.
- **Rejected desktop patterns:** sidebars, dense tables, generator/history and reader/question split panes, right-click-only actions, desktop modals.
- **Rejected visual direction:** starfields, decorative gradients, glass layers, and study-competing motion.
- **Rejected for personal v1:** native push, forced mutation replay, native wrapper. In-app notifications remain complete.

## Responsive & Platform

| Context | Behavior |
|---|---|
| 320–374px portrait | `{spacing.compact-gutter}` allowed; actions stack, chips wrap, summaries collapse to one column when needed; no horizontal overflow. |
| 375–430px portrait | `{spacing.page-gutter}`; four equal tabs; word actions inline when possible and wrap below when not. |
| Landscape/wider mobile | Keep mobile vocabulary; wider reading measure/paired summaries allowed, never desktop sidebar/table/split Context Lab. |
| Installed PWA | `viewport-fit=cover`, dynamic viewport, safe areas, `/mobile` start, standalone status bar, deferred SW updates. |
| Safari | Same routes/capabilities; browser chrome never covers fixed actions; install guidance only in PWA status. |
| Keyboard visible | Visual/dynamic viewport; focused field and `sticky-action-bar` stay reachable; final content unobscured. |
| Offline | Shell/recent reads open; IndexedDB restores forms, review answers, Context progress; server tools show honest resume states. |
| Theme | Paired semantic tokens; theme change never resets route/form state. |

Automated contracts cover 320, 375, 390, 393, 430px and landscape: no overflow, 16px editable text, 44pt targets, safe areas, keyboard-safe actions, deep links, and WebKit E2E.

## Key Flows

### Flow 1 — Search and maintain a word (小林, reading on iPhone)

1. 小林 opens `/mobile`; search is first.
2. He searches and sees matching `word-row` results; pronunciation works in place.
3. He opens Word detail and reviews all fields, image, and mastery.
4. He edits note/mastery in `full-screen-form` and saves.
5. **Climax:** refreshed detail shows his values and the word leads Recent words.

Failure: save/offline failure retains the IndexedDB draft and offers retry; Back warns; no desktop route opens.

### Flow 2 — Add a word with AI assistance (小林, after meeting an unfamiliar word)

1. 小林 opens quick add or AI word query.
2. AI returns pronunciation, meanings, examples, tags, and correction suggestions in editable preview.
3. He corrects fields, plays pronunciation, and adds it.
4. **Climax:** the new mobile Word detail shows his final values, not an opaque AI payload.

Failure: offline/AI failure retains query and permits manual add; a duplicate routes to the existing word.

### Flow 3 — Daily review and repair (小林, commuting one-handed)

1. He starts Daily review from Home or IELTS core.
2. A plan loads/restores; `review-stage` presents one question.
3. He answers through the keyboard-safe `sticky-action-bar`; errors receive focused correction.
4. **Climax:** result gives exact score/weak words and opens a mobile detail or repair action.

Failure: final submission offline retains answer/position and offers one explicit resubmit without duplication.

### Flow 4 — Mixed-learning session (小林, beginning a longer study block)

1. From Home/cockpit he selects mode/scope and previews activities.
2. Sequential activity stages persist progress; he leaves and later resumes the same stage.
3. **Climax:** final result summarizes activities and routes to words needing follow-up.

Failure: invalid/unavailable session explains the issue and routes to setup while preserving compatible draft data.

### Flow 5 — Complete Context Lab (小林, studying weak words in context)

1. He creates a pack from weak/random/custom words; task shows Pending then Succeeded.
2. He reads, selects text, marks/translates/adds, and sees `marked-word-strip`.
3. He previews, AI-completes, edits, and imports missing words with inserted/skipped counts.
4. He answers questions and submits.
5. **Climax:** result shows score, wrong count, weak words, explanations; the attempt survives refresh.

Failure: generation retry keeps parameters; unstable selection uses sheet fallback; submit/import failure retains answers, marks, preview; delete never auto-replays.

### Flow 6 — Bulk import with conflicts (小林, moving an existing list)

1. He pastes/selects source; validation produces valid, skipped, duplicate, conflict rows.
2. He resolves conflicts one by one and explicitly confirms import.
3. **Climax:** result reports inserted/skipped/failed and opens filtered Word library.

Failure: permission/type/parse/network failure preserves source and decisions, names the stage, and requires explicit retry.

### Flow 7 — Inspect progress and choose next study (小林, planning the day)

1. Cockpit shows coach summary/snapshot; Statistics explains timeline/trends.
2. Memory map shows clusters/word journey; IELTS core shows progress/due items.
3. **Climax:** he launches review or Word detail from evidence, turning analytics into action.

Failure: offline keeps cached figures labeled stale, text summaries readable, and waits for explicit refresh.

### Flow 8 — Inspect coverage frequency (小林, finding repeatedly replaced words)

1. He opens Coverage statistics and sees words sorted by `englishOverwriteCount`.
2. He pages through compact rows and compares mastery, type, part of speech, and overwrite count.
3. **Climax:** he opens a repeatedly replaced word and chooses the appropriate review or maintenance action.

Failure: offline shows the latest cached page labeled stale; an uncached page requires network and keeps the current filters/page selection.

### Flow 9 — Notifications, settings, appearance, and PWA update (小林, finishing study)

1. Account shows unread `badge`; Notifications opens related mobile routes and marks read after success.
2. He changes a setting and selects Follow system.
3. PWA status shows install/cache/version. Update waits while a form is dirty.
4. At a safe pause he updates.
5. **Climax:** PWA returns to the safe mobile destination with no lost draft/progress.

Failure: failed mark-read/save retains state; expired session returns through Login; confirmed sign-out clears user-scoped offline business data.
