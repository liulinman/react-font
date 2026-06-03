# English World AI Learning MVP Design

Date: 2026-06-03

## Goal

Replan English World from a word-management and review tool into an AI learning product with a visible first-phase MVP across three pillars:

- AI Daily Coach: a guided daily learning mission.
- AI Context Lab: AI-generated contextual practice from the user's own vocabulary.
- Memory OS: a lightweight personal vocabulary memory map.

The first phase must make all three pillars visible and usable without turning the app into three disconnected feature areas.

## Product Direction

The application should open on an AI Learning Cockpit instead of a table-first word list or a single review page.

The cockpit is the product spine:

1. Daily Coach decides what the user should do today.
2. Context Lab turns today's weak words into generated reading and practice.
3. Memory OS shows how the user's weak words, similar words, and mastery path are changing.

The existing word list remains as a management surface. It should no longer be the emotional or product center of the application.

## Scope

Included in phase one:

- A new Learning Cockpit first screen for `english-world`.
- A Daily Coach summary with today's mission, recommended word counts, weak-word focus, suggested time, progress, and post-review insight.
- A Context Lab entry point that can generate practice from today's weak words, selected words, or manually entered words.
- A lightweight Memory Map summary showing mistake clusters, similar/confusing words, and mastery-path highlights.
- Navigation updates so the cockpit, review, word list, AI lab, memory map, statistics, and settings feel like one workflow.
- API contracts that let frontend and backend align before implementation.
- Focused tests for pure planning logic and data adapters where practical.

Excluded from phase one:

- A full editable knowledge graph.
- A complex spaced-repetition scheduler.
- Multi-user sharing, class mode, or course publishing.
- A separate AI platform beyond the existing word-agent and exercise-agent capabilities.
- A full mobile redesign beyond ensuring the main workflow remains reachable and readable.

## User Experience

### Learning Cockpit

The cockpit shows the user's daily state at a glance:

- Streak and current mastery summary.
- Today's mission card.
- Weak-word focus.
- AI Insight.
- Context Lab preview.
- Memory Map preview.

The primary call to action is starting today's mission. Secondary actions let the user open Context Lab, inspect Memory Map, or manage the word list.

### AI Daily Coach

Daily Coach should feel like a learning guide, not a static dashboard.

It provides:

- Today's recommended review count.
- Weak-word and low-mastery priorities.
- Suggested practice modes such as review, listening, wrong-word repair, and contextual practice.
- A short AI-style insight explaining why today's mission matters.
- A post-review recommendation after the user submits a review session.

The recommendation engine can start as deterministic rules:

- Prioritize wrong words and recently incorrect review results.
- Prioritize words with lower mastery levels.
- Prefer words not reviewed recently when the backend exposes usable timestamps.
- Keep the daily mission small enough to complete quickly.

AI text can explain the recommendation, but it should not be the source of truth for core scheduling in phase one.

### AI Context Lab

Context Lab should become the strongest AI-visible feature.

It supports three sources:

- Today's weak words from Daily Coach.
- Words selected from the word list or Memory Map.
- Manually entered words.

It generates a practice pack:

- A short reading passage.
- Multiple-choice questions.
- Key example sentences.
- Optional save actions for useful generated examples or words.

The phase-one implementation should build on the existing AI word lookup and reading exercise capabilities.

### Memory OS

Memory OS should be visible in phase one but lightweight.

It shows:

- Mistake clusters.
- Similar or confusing words.
- Mastery-path highlights.
- A route from weak words into Context Lab or today's mission.

It does not need full graph editing in phase one. The map can be a summary visualization driven by backend-derived clusters, AI-provided relationships, or frontend adapters over existing review data.

## Information Architecture

Recommended navigation:

- Cockpit: default first screen.
- Today: focused review session.
- Context Lab: AI-generated practice.
- Memory Map: vocabulary relationship summary.
- Word List: CRUD and filtering.
- Stats: historical learning analytics.
- Settings: review and system configuration.

The current `AI 工具` tab should be renamed or reorganized into Context Lab. AI word lookup can remain inside it as a supporting tool, but the main value should be generated contextual practice.

## Frontend Architecture

The frontend should add feature-level modules under the existing `englishWorld` area instead of scattering new logic into the current page component.

Recommended units:

- `layout/EnglishWorldLayout.tsx`: shared shell and navigation.
- `cockpit/LearningCockpitPage.tsx`: first-screen orchestration and layout.
- `dailyCoach/DailyCoachPage.tsx`: daily mission workflow.
- `dailyCoach/DailyReviewRunner.tsx`: extracted review runner from the current review page.
- `dailyCoach/CoachSummaryPanel.tsx`: daily mission and insight presentation.
- `contextLab/ContextLabPage.tsx`: generated practice workflow.
- `contextLab/WordInsightPanel.tsx`: AI word lookup and examples.
- `contextLab/ReadingExercisePanel.tsx`: AI reading and multiple-choice practice.
- `contextLab/ContextStreamView.tsx`: shared streaming output display.
- `memoryMap/MemoryMapSummary.tsx`: homepage memory summary.
- `memoryMap/VocabularySnapshot.tsx`: mastery and word-count summary.
- `memoryMap/WeakWordsPanel.tsx`: weak words and confusing words.
- `vocabulary/VocabularyManagerPage.tsx`: extracted word-list CRUD surface.
- `shared/hooks/useSseStream.ts`: shared POST SSE reader and JSON fallback handling.
- `shared/hooks/useWordMutations.ts`: shared word add/edit/delete helpers when desktop and mobile need them.
- `shared/components/WordTag.tsx`: common word chip with level/type metadata.
- `utils/coachPlanning.ts`: pure deterministic planning helpers.
- `utils/memoryMapAdapters.ts`: pure relationship and cluster adapters.

Existing word list, review, stats, and settings code should remain available. The plan should avoid a broad rewrite of the mobile page unless the selected workflow becomes unreachable on mobile.

Current frontend files to reuse:

- `apps/english-world/src/page/englishWorld/recite/RecitePage.tsx` for review session behavior.
- `apps/english-world/src/page/englishWorld/recite/reviewExperience.ts` for pure review view-model helpers.
- `apps/english-world/src/page/englishWorld/component/WordAgentTab.tsx` for AI word lookup behavior.
- `apps/english-world/src/page/englishWorld/component/ExerciseAgentTab.tsx` for generated reading and quiz behavior.
- `apps/english-world/src/page/englishWorld/component/EnglishStats.tsx` for statistics display logic.
- `apps/english-world/src/page/englishWorld/hooks/useWordList.ts` for word-list fetching.
- `apps/english-world/src/page/englishWorld/utils/wordLabels.ts` and `wordFilters.ts` for existing labels and filters.

Current frontend files to avoid expanding further:

- `EnglishWorld.tsx`, because it already mixes tab orchestration, filtering, CRUD, and modal state.
- `RecitePage.tsx`, because the review workflow is large enough to extract.
- `WordAgentTab.tsx` and `ExerciseAgentTab.tsx`, because both contain stream parsing and UI rendering.
- `EnglishWorldMobile.tsx`, because mobile currently duplicates much of the desktop business flow.

## Backend Architecture

The backend should expose a small set of product-level endpoints that aggregate existing word, review, stats, and AI capabilities.

Recommended phase-one contracts:

- `POST /daily-coach/summary`: returns total words, today's new words, level distribution, recent review accuracy, weak words, and suggested actions.
- `POST /daily-coach/plan`: accepts `targetMinutes` and `focus`, then returns mission tasks with type, title, word ids, estimated minutes, and reasons.
- `POST /context-lab/generate`: wraps or reuses the existing exercise-agent generation flow and returns session id, article, words, and questions.
- `POST /context-lab/submit`: wraps or reuses the existing exercise-agent submit flow and returns results, score, weak words, and next suggestions.
- `POST /memory-map/overview`: returns levels, due words, weak words, recent mistakes, and streak-like learning stats.
- `POST /memory-map/word-detail`: returns one word's level, review history, last practiced time, accuracy, and recommended level.
- `POST /memory-map/update-level`: updates a word's mastery level through a narrow purpose-built endpoint.

If existing backend modules already expose equivalent endpoints, phase one should prefer thin aggregation over duplicating data logic.

Current backend capabilities to reuse:

- `english` word table and English controller/service for word CRUD and statistics.
- `englishStats` for new-word, level, and part-of-speech statistics.
- `recite_session` and `recite_history` for review session outcomes and word-level mistakes.
- `recite/stats` for review accuracy and direction statistics.
- `exercise-agent/generate` and `exercise-agent/submit` for generated reading and questions.
- `word-agent/query` and `word-agent/query-stream` for AI word explanation, phonetic data, examples, and cases.

Backend gaps for phase one:

- There is no Daily Coach aggregation API.
- Review submit records history but does not automatically update `english_level`.
- `article_exercise` stores generated content but not submitted answers, score, or result history.
- AI service keys are currently at risk of being hardcoded in implementation files and should move to environment configuration before broader use.
- The database migration shape should be checked because the SQL and Sequelize model may disagree on `english_partSpeech`.

## Data Flow

1. User opens English World.
2. Frontend calls cockpit data.
3. Backend aggregates word statistics, recent review history, weak-word candidates, and memory-map summary.
4. User starts today's mission.
5. Existing review flow records answers and returns result statistics.
6. Frontend shows post-review insight and offers to send weak words into Context Lab.
7. Context Lab generates a practice pack from selected words.
8. Memory Map summarizes weak or confusing relationships and links back into review or Context Lab.

## Error Handling

The cockpit must degrade gracefully:

- If Daily Coach data fails, show a retryable mission card and preserve navigation to word list and review.
- If AI generation fails, keep the selected words and show a retry action.
- If Memory Map data fails, show a compact empty state rather than hiding the section.
- If streaming generation is unavailable, fall back to non-streaming JSON generation when supported.

Global request error handling should not duplicate local user-facing messages.

## Testing And Verification

Frontend verification should include:

- Unit tests for deterministic coach planning helpers.
- Unit tests for memory-map adapters.
- Component or integration tests for cockpit empty/loading/success states where the current test stack supports them.
- Existing build and lint commands.

Backend verification should include:

- Unit tests for daily mission selection rules.
- API tests for cockpit, context-lab generation, and memory-map response shape.
- Existing module tests for word, review, and exercise-agent modules.

Manual smoke checks:

- Open English World and see the cockpit by default.
- Start today's mission from the cockpit.
- Complete a review and see a next-step insight.
- Generate a Context Lab practice pack from weak words.
- Open Memory Map and send a cluster into Context Lab.
- Confirm word list management still works.

## Risks

- A/B/C can become visually impressive but behaviorally disconnected if the cockpit is not treated as the spine.
- Context Lab can become expensive or slow if every page load triggers AI generation. Generation must be user-initiated.
- Memory Map can expand into a full graph product. Phase one should keep it summary-driven.
- Current frontend code has large components and mixed styling patterns. New code should be modular, but broad unrelated refactors should wait.
- Backend data may not yet contain all relationship signals. The first version can combine existing review data with generated relationship summaries.

## Agent Coordination

Two read-only agents collected codebase-specific details:

- Frontend agent confirmed that the main risk is continuing to expand large components. The implementation plan should first introduce a layout and feature directory structure, then extract review and stream behavior into shared hooks or smaller components.
- Backend agent confirmed that phase one can reuse existing word, recite, word-agent, and exercise-agent capabilities. The implementation plan should add aggregation/wrapper APIs before introducing heavier persistence.

The main thread owns the final API contracts, task ordering, integration review, and verification.
