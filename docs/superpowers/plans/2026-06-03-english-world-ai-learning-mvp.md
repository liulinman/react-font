# English World AI Learning MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first phase of English World as an AI Learning Cockpit with visible Daily Coach, Context Lab, and Memory Map capabilities.

**Architecture:** Add thin NestJS aggregation/wrapper APIs first, then add frontend feature modules that consume those contracts. Keep existing word list, review, stats, word-agent, and exercise-agent behavior available while making the cockpit the default product surface.

**Tech Stack:** React 18, Vite, TypeScript, Ant Design, Vitest, Cypress, NestJS 10, Sequelize, Jest, MySQL.

---

## Repositories

- Frontend: `/Users/liulin/Desktop/font/react-font`
- Backend: `/Users/liulin/Desktop/backend/nestjs`

The backend worktree currently has existing uncommitted changes. Workers must not revert unrelated existing edits.

## File Structure

### Backend Files

- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/daily-coach.module.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/daily-coach.controller.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/daily-coach.service.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/dto/daily-coach.dto.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/daily-coach.service.spec.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/context-lab.module.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/context-lab.controller.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/context-lab.service.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/dto/context-lab.dto.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/context-lab.service.spec.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/memory-map.module.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/memory-map.controller.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/memory-map.service.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/dto/memory-map.dto.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/memory-map.service.spec.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/app.module.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/interface/english/english.module.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/interface/english/english.service.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/interface/exercise-agent/exercise-agent.module.ts`

### Frontend Files

- Create: `apps/english-world/src/page/englishWorld/layout/EnglishWorldLayout.tsx`
- Create: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
- Create: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Create: `apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx`
- Create: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Create: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Create: `apps/english-world/src/page/englishWorld/contextLab/ContextStreamView.tsx`
- Create: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapSummary.tsx`
- Create: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapSummary.test.tsx`
- Create: `apps/english-world/src/page/englishWorld/vocabulary/VocabularyManagerPage.tsx`
- Create: `apps/english-world/src/page/englishWorld/shared/hooks/useSseStream.ts`
- Create: `apps/english-world/src/page/englishWorld/shared/hooks/useSseStream.test.ts`
- Create: `apps/english-world/src/page/englishWorld/server/learning.ts`
- Create: `apps/english-world/src/page/englishWorld/types/learning.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/coachPlanning.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/coachPlanning.test.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/memoryMapAdapters.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/memoryMapAdapters.test.ts`
- Modify: `apps/english-world/src/router/router.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishHeader.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

## Shared API Contract

Frontend and backend must agree on these shapes.

```ts
export type LearningWord = {
  id: number;
  word: string;
  meaning?: string;
  level: 0 | 1 | 2 | 3;
  accuracy?: number;
  lastPracticedAt?: string | null;
};

export type DailyCoachSummary = {
  totalWords: number;
  todayNewWords: number;
  levelDistribution: Array<{ level: 0 | 1 | 2 | 3; count: number }>;
  reciteAccuracy: number;
  weakWords: LearningWord[];
  suggestedActions: Array<{
    type: "review" | "listening" | "context" | "repair";
    title: string;
    description: string;
    wordIds: number[];
    estimatedMinutes: number;
  }>;
};

export type DailyCoachPlan = {
  tasks: Array<{
    type: "review" | "listening" | "context" | "repair";
    title: string;
    wordIds: number[];
    estimatedMinutes: number;
    reason: string;
  }>;
};

export type MemoryMapOverview = {
  levels: Array<{ level: 0 | 1 | 2 | 3; count: number }>;
  dueWords: LearningWord[];
  weakWords: LearningWord[];
  recentMistakes: Array<{
    wordId: number;
    word: string;
    meaning?: string;
    mistakeCount: number;
    cluster: "similar" | "low-mastery" | "recent-error";
  }>;
  streakLikeStats: {
    recentSessions: number;
    recentAccuracy: number;
  };
};
```

## Task 1: Backend Daily Coach Aggregation

**Files:**
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/dto/daily-coach.dto.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/daily-coach.service.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/daily-coach.controller.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/daily-coach.module.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/daily-coach/daily-coach.service.spec.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/app.module.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/interface/english/english.module.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/interface/english/english.service.ts`

- [ ] **Step 1: Add DTOs**

Create `daily-coach.dto.ts`:

```ts
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class DailyCoachSummaryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;

  @IsOptional()
  @IsInt()
  timezone?: number;
}

export class DailyCoachPlanDto {
  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(30)
  targetMinutes?: number;

  @IsOptional()
  @IsIn(['new', 'weak', 'review'])
  focus?: 'new' | 'weak' | 'review';
}
```

- [ ] **Step 2: Export EnglishService**

Modify `src/interface/english/english.module.ts` so `DailyCoachModule` can reuse existing word data:

```ts
@Module({
  imports: [UserModule],
  controllers: [EnglishController],
  providers: [EnglishService, AuthGuard],
  exports: [EnglishService],
})
export class EnglishModule {}
```

- [ ] **Step 3: Add narrow helper methods to EnglishService**

Add methods to `src/interface/english/english.service.ts` that return current user's words and level stats without exposing controller DTO coupling:

```ts
async getUserWordsForLearning(userId: number) {
  return english.findAll({
    where: { userId },
    order: [['englishCreateTime', 'DESC']],
    limit: 500,
    raw: true,
  });
}

async getUserLevelCounts(userId: number) {
  const words = await this.getUserWordsForLearning(userId);
  return [0, 1, 2, 3].map((level) => ({
    level,
    count: words.filter((word) => Number(word.englishLevel) === level).length,
  }));
}
```

Use the actual model property names from `english.service.ts`; keep the public return shape equivalent to the snippet.

- [ ] **Step 4: Write DailyCoachService test**

Create a test that verifies low-level words are selected as weak words:

```ts
it('prioritizes low mastery words for the daily coach summary', async () => {
  const service = new DailyCoachService(
    englishServiceMock as any,
    reciteServiceMock as any,
  );
  englishServiceMock.getUserWordsForLearning.mockResolvedValue([
    { id: 1, englishWord: 'fragile', englishChinese: '脆弱的', englishLevel: 0 },
    { id: 2, englishWord: 'steady', englishChinese: '稳定的', englishLevel: 3 },
  ]);
  englishServiceMock.getUserLevelCounts.mockResolvedValue([
    { level: 0, count: 1 },
    { level: 1, count: 0 },
    { level: 2, count: 0 },
    { level: 3, count: 1 },
  ]);
  reciteServiceMock.getReciteStats.mockResolvedValue({
    data: { statistics: { accuracy: 72 } },
  });

  const result = await service.getSummary(7, 1);

  expect(result.weakWords).toEqual([
    expect.objectContaining({ id: 1, word: 'fragile', level: 0 }),
  ]);
  expect(result.suggestedActions[0]).toEqual(
    expect.objectContaining({ type: 'review' }),
  );
});
```

- [ ] **Step 5: Implement service and controller**

Implement:

```ts
@Injectable()
export class DailyCoachService {
  constructor(
    private readonly englishService: EnglishService,
    private readonly reciteService: ReciteService,
  ) {}

  async getSummary(days: number, userId: number) {
    const [words, levelDistribution, stats] = await Promise.all([
      this.englishService.getUserWordsForLearning(userId),
      this.englishService.getUserLevelCounts(userId),
      this.reciteService.getReciteStats(userId, days),
    ]);
    const reciteAccuracy = Number(stats?.data?.statistics?.accuracy ?? 0);
    const weakWords = this.toWeakWords(words).slice(0, 12);
    return {
      totalWords: words.length,
      todayNewWords: this.countTodayWords(words),
      levelDistribution,
      reciteAccuracy,
      weakWords,
      suggestedActions: this.createSuggestedActions(weakWords),
    };
  }

  async getPlan(targetMinutes: number, focus: 'new' | 'weak' | 'review', userId: number) {
    const summary = await this.getSummary(7, userId);
    const wordIds = summary.weakWords.slice(0, 18).map((word) => word.id);
    return {
      tasks: [
        {
          type: focus === 'weak' ? 'repair' : 'review',
          title: '完成今日薄弱词复习',
          wordIds,
          estimatedMinutes: targetMinutes,
          reason: '优先处理低掌握度和近期错词，保证今天能完成一个短闭环。',
        },
      ],
    };
  }
}
```

Implement private helpers in the same service:

```ts
private toWeakWords(words: any[]) {
  return words
    .filter((word) => Number(word.englishLevel) <= 1)
    .map((word) => ({
      id: Number(word.id),
      word: word.englishWord,
      meaning: word.englishChinese,
      level: Number(word.englishLevel) as 0 | 1 | 2 | 3,
    }));
}

private countTodayWords(words: any[]) {
  const today = new Date().toDateString();
  return words.filter((word) => {
    const created = word.englishCreateTime ?? word.createTime;
    return created ? new Date(created).toDateString() === today : false;
  }).length;
}

private createSuggestedActions(weakWords: Array<{ id: number }>) {
  const wordIds = weakWords.slice(0, 18).map((word) => word.id);
  return [
    {
      type: 'review',
      title: '完成今日薄弱词复习',
      description: '先用一组短复习稳定住低掌握度单词。',
      wordIds,
      estimatedMinutes: 8,
    },
    {
      type: 'context',
      title: '把薄弱词放进语境练习',
      description: '用这些词生成短阅读和选择题，避免只背中文释义。',
      wordIds: wordIds.slice(0, 8),
      estimatedMinutes: 6,
    },
  ];
}
```

Add `POST /daily-coach/summary` and `POST /daily-coach/plan`, both guarded by `AuthGuard` and using `@CurrentUser()`.

- [ ] **Step 6: Register module**

Import `DailyCoachModule` in `src/app.module.ts`.

- [ ] **Step 7: Verify backend task**

Run:

```bash
pnpm test -- daily-coach.service.spec.ts --runInBand
pnpm exec tsc --noEmit
```

Expected: tests pass and TypeScript compiles.

## Task 2: Backend Context Lab Wrapper

**Files:**
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/dto/context-lab.dto.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/context-lab.service.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/context-lab.controller.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/context-lab.module.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/context-lab/context-lab.service.spec.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/app.module.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/interface/exercise-agent/exercise-agent.module.ts`

- [ ] **Step 1: Add DTOs**

Create DTOs mirroring the existing exercise-agent request so frontend can use product naming:

```ts
import { IsArray, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateContextLabDto {
  @IsIn(['proficiency', 'random', 'custom'])
  sourceType: 'proficiency' | 'random' | 'custom';

  @IsOptional()
  @IsArray()
  proficiencyLevels?: number[];

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(20)
  count?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  words?: string[];
}

export class SubmitContextLabDto {
  @IsInt()
  sessionId: number;

  @IsArray()
  answers: Array<{ questionId: string; selectedIndex: number }>;
}
```

- [ ] **Step 2: Write wrapper test**

Verify the service delegates to `ExerciseAgentService` and enriches score:

```ts
it('submits context lab answers and adds score metadata', async () => {
  exerciseAgentService.submit.mockResolvedValue({
    results: [
      { questionId: 'q1', correct: true, correctIndex: 0, userSelectedIndex: 0, explanation: 'ok' },
      { questionId: 'q2', correct: false, correctIndex: 1, userSelectedIndex: 2, explanation: 'review this' },
    ],
  });

  const result = await service.submit(1, {
    sessionId: 10,
    answers: [
      { questionId: 'q1', selectedIndex: 0 },
      { questionId: 'q2', selectedIndex: 2 },
    ],
  });

  expect(result.score).toBe(50);
  expect(result.nextSuggestions[0]).toContain('语境');
});
```

- [ ] **Step 3: Implement wrapper service**

Create methods:

```ts
async generate(userId: number, dto: GenerateContextLabDto, onDelta: (delta: string) => void) {
  const words = await this.exerciseAgentService.getWordsForExercise(userId, dto as any);
  return this.exerciseAgentService.generateStream(userId, dto as any, words, onDelta);
}

async submit(userId: number, dto: SubmitContextLabDto) {
  const data = await this.exerciseAgentService.submit(userId, dto as any);
  const total = data.results.length || 1;
  const correct = data.results.filter((item) => item.correct).length;
  return {
    ...data,
    score: Math.round((correct / total) * 100),
    nextSuggestions: correct === total
      ? ['这组语境练习已通过，可以进入下一组薄弱词。']
      : ['把错误题里的词加入今日修复任务，再做一轮语境练习。'],
  };
}
```

- [ ] **Step 4: Implement controller**

Expose:

- `POST /context-lab/generate` with the same SSE behavior as `exercise-agent/generate`.
- `POST /context-lab/submit` returning JSON.

Use `setupSSE(res)` and keep POST SSE because the frontend already uses `fetch`.

- [ ] **Step 5: Register module and verify**

Import `ContextLabModule` in `src/app.module.ts`.

Run:

```bash
pnpm test -- context-lab.service.spec.ts --runInBand
pnpm exec tsc --noEmit
```

Expected: tests pass and TypeScript compiles.

## Task 3: Backend Memory Map Overview

**Files:**
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/dto/memory-map.dto.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/memory-map.service.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/memory-map.controller.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/memory-map.module.ts`
- Create: `/Users/liulin/Desktop/backend/nestjs/src/interface/memory-map/memory-map.service.spec.ts`
- Modify: `/Users/liulin/Desktop/backend/nestjs/src/app.module.ts`

- [ ] **Step 1: Add DTOs**

```ts
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class MemoryMapOverviewDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  days?: number;
}

export class MemoryMapWordDetailDto {
  @IsInt()
  wordId: number;
}

export class UpdateMemoryLevelDto {
  @IsInt()
  wordId: number;

  @IsInt()
  @Min(0)
  @Max(3)
  level: 0 | 1 | 2 | 3;

  @IsOptional()
  reason?: string;
}
```

- [ ] **Step 2: Write overview adapter test**

```ts
it('groups weak words into memory map clusters', async () => {
  englishService.getUserWordsForLearning.mockResolvedValue([
    { id: 1, englishWord: 'resilient', englishChinese: '有复原力的', englishLevel: 0 },
    { id: 2, englishWord: 'recover', englishChinese: '恢复', englishLevel: 1 },
    { id: 3, englishWord: 'mastered', englishChinese: '掌握的', englishLevel: 3 },
  ]);
  englishService.getUserLevelCounts.mockResolvedValue([
    { level: 0, count: 1 },
    { level: 1, count: 1 },
    { level: 2, count: 0 },
    { level: 3, count: 1 },
  ]);

  const overview = await service.getOverview(1, 7);

  expect(overview.weakWords).toHaveLength(2);
  expect(overview.recentMistakes[0]).toEqual(
    expect.objectContaining({ cluster: 'low-mastery' }),
  );
});
```

- [ ] **Step 3: Implement overview service**

Return a lightweight summary from existing word data:

```ts
async getOverview(userId: number, days: number) {
  const [words, levels] = await Promise.all([
    this.englishService.getUserWordsForLearning(userId),
    this.englishService.getUserLevelCounts(userId),
  ]);
  const weakWords = words
    .filter((word) => Number(word.englishLevel) <= 1)
    .slice(0, 16)
    .map(this.toLearningWord);
  return {
    levels,
    dueWords: weakWords.slice(0, 8),
    weakWords,
    recentMistakes: weakWords.slice(0, 8).map((word) => ({
      wordId: word.id,
      word: word.word,
      meaning: word.meaning,
      mistakeCount: 1,
      cluster: 'low-mastery',
    })),
    streakLikeStats: {
      recentSessions: 0,
      recentAccuracy: 0,
    },
  };
}
```

- [ ] **Step 4: Implement controller and register module**

Expose:

- `POST /memory-map/overview`
- `POST /memory-map/word-detail`
- `POST /memory-map/update-level`

`update-level` should delegate to a narrow EnglishService method that updates only `englishLevel` for the current user.

- [ ] **Step 5: Verify backend task**

Run:

```bash
pnpm test -- memory-map.service.spec.ts --runInBand
pnpm exec tsc --noEmit
```

Expected: tests pass and TypeScript compiles.

## Task 4: Frontend API Contracts And Pure Adapters

**Files:**
- Create: `apps/english-world/src/page/englishWorld/types/learning.ts`
- Create: `apps/english-world/src/page/englishWorld/server/learning.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/coachPlanning.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/coachPlanning.test.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/memoryMapAdapters.ts`
- Create: `apps/english-world/src/page/englishWorld/utils/memoryMapAdapters.test.ts`

- [ ] **Step 1: Add frontend shared types**

Mirror the shared API contract in `types/learning.ts`, using frontend naming:

```ts
export type LearningWord = {
  id: number;
  word: string;
  meaning?: string;
  level: 0 | 1 | 2 | 3;
  accuracy?: number;
  lastPracticedAt?: string | null;
};

export type DailyCoachSummary = {
  totalWords: number;
  todayNewWords: number;
  levelDistribution: Array<{ level: 0 | 1 | 2 | 3; count: number }>;
  reciteAccuracy: number;
  weakWords: LearningWord[];
  suggestedActions: Array<{
    type: "review" | "listening" | "context" | "repair";
    title: string;
    description: string;
    wordIds: number[];
    estimatedMinutes: number;
  }>;
};
```

- [ ] **Step 2: Add API request descriptors**

Create `server/learning.ts` with:

```ts
export const dailyCoachSummary = (data: { days?: number; timezone?: number }) => ({
  url: "/daily-coach/summary",
  method: "POST",
  data,
});

export const dailyCoachPlan = (data: { targetMinutes?: number; focus?: "new" | "weak" | "review" }) => ({
  url: "/daily-coach/plan",
  method: "POST",
  data,
});

export const contextLabSubmit = (data: { sessionId: number; answers: Array<{ questionId: string; selectedIndex: number }> }) => ({
  url: "/context-lab/submit",
  method: "POST",
  data,
});

export const memoryMapOverview = (data: { days?: number }) => ({
  url: "/memory-map/overview",
  method: "POST",
  data,
});
```

- [ ] **Step 3: Write coachPlanning test**

```ts
it("creates a useful fallback mission from weak words", () => {
  const mission = createFallbackCoachSummary({
    totalWords: 2,
    weakWords: [
      { id: 1, word: "fragile", meaning: "脆弱的", level: 0 },
      { id: 2, word: "steady", meaning: "稳定的", level: 1 },
    ],
  });

  expect(mission.suggestedActions[0]).toEqual(
    expect.objectContaining({
      type: "review",
      wordIds: [1, 2],
    }),
  );
});
```

- [ ] **Step 4: Implement pure helpers**

Implement `createFallbackCoachSummary` and `createCoachInsight` without network dependencies.

- [ ] **Step 5: Write memoryMapAdapters test**

```ts
it("turns weak words into low-mastery clusters", () => {
  const clusters = createMemoryClusters([
    { id: 1, word: "resilient", level: 0 },
    { id: 2, word: "recover", level: 2 },
  ]);

  expect(clusters).toEqual([
    expect.objectContaining({ wordId: 1, cluster: "low-mastery" }),
  ]);
});
```

- [ ] **Step 6: Verify frontend task**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/utils/coachPlanning.test.ts apps/english-world/src/page/englishWorld/utils/memoryMapAdapters.test.ts
```

Expected: both tests pass.

## Task 5: Frontend Shared SSE Hook

**Files:**
- Create: `apps/english-world/src/page/englishWorld/shared/hooks/useSseStream.ts`
- Create: `apps/english-world/src/page/englishWorld/shared/hooks/useSseStream.test.ts`
- Modify later consumers in Task 7.

- [ ] **Step 1: Extract parser test**

Write a pure parser inside the hook file or a small exported helper:

```ts
it("parses event stream lines into payload objects", () => {
  const events = parseSseLines('data: {"type":"chunk","data":"hello"}\\n\\ndata: {"type":"done","data":{"ok":true}}\\n');

  expect(events).toEqual([
    { type: "chunk", data: "hello" },
    { type: "done", data: { ok: true } },
  ]);
});
```

- [ ] **Step 2: Implement `parseSseLines`**

Support `data: ...` lines, ignore malformed lines, and return typed payloads.

- [ ] **Step 3: Implement `useSseStream`**

Expose:

```ts
type StreamHandlers<TDone> = {
  onChunk?: (text: string) => void;
  onDone?: (data: TDone) => void;
  onError?: (message: string) => void;
};

export function useSseStream<TDone>() {
  return {
    loading,
    start,
    abort,
  };
}
```

`start` should POST JSON with `fetch`, read `res.body.getReader()`, call handlers for `chunk`, `done`, and `error`, and abort the previous request before starting a new one.

- [ ] **Step 4: Verify SSE task**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/shared/hooks/useSseStream.test.ts
```

Expected: parser test passes. Hook behavior can be covered with integration tests later.

## Task 6: Frontend Layout And Cockpit

**Files:**
- Create: `apps/english-world/src/page/englishWorld/layout/EnglishWorldLayout.tsx`
- Create: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.tsx`
- Create: `apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx`
- Create: `apps/english-world/src/page/englishWorld/dailyCoach/CoachSummaryPanel.tsx`
- Create: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapSummary.tsx`
- Modify: `apps/english-world/src/router/router.tsx`
- Modify: `apps/english-world/src/page/englishWorld/component/EnglishHeader.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

- [ ] **Step 1: Test cockpit first screen**

```tsx
it("renders the AI learning cockpit with all three MVP pillars", () => {
  render(<LearningCockpitPage />);

  expect(screen.getByText("AI Learning Cockpit")).toBeInTheDocument();
  expect(screen.getByText("今日 AI 任务")).toBeInTheDocument();
  expect(screen.getByText("AI 语境实验室")).toBeInTheDocument();
  expect(screen.getByText("记忆地图")).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement layout**

`EnglishWorldLayout` should render `EnglishHeader` and a content region. Use it in routes so each feature does not duplicate the header.

- [ ] **Step 3: Implement cockpit static shell**

Create a polished but restrained operational layout:

- Top summary row: streak-like stat, total words, recent accuracy.
- Main card: Daily Coach mission.
- Secondary card: Context Lab preview.
- Right column: Memory Map summary and AI Insight.

Use Ant Design cards, buttons, progress, tags, and existing CSS. Avoid inline gradient-heavy styling.

- [ ] **Step 4: Wire navigation**

Update `EnglishHeader` nav keys:

- `cockpit`: `/englishWorld`
- `recite`: `/englishWorld/recite`
- `contextLab`: `/englishWorld/context-lab`
- `memoryMap`: `/englishWorld/memory-map`
- `list`: `/englishWorld/vocabulary`
- `stat`: `/englishWorld/stat`
- `setting`: `/englishWorld/settings`

During transition, `/englishWorld#list` may redirect or render the vocabulary page.

- [ ] **Step 5: Verify cockpit task**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/cockpit/LearningCockpitPage.test.tsx
pnpm --filter @font/english-world build
```

Expected: test passes and build succeeds.

## Task 7: Frontend Context Lab Page

**Files:**
- Create: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Create: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Create: `apps/english-world/src/page/englishWorld/contextLab/ContextStreamView.tsx`
- Modify: `apps/english-world/src/router/router.tsx`

- [ ] **Step 1: Test source mode switching**

```tsx
it("lets the user choose weak words, random words, or custom words", async () => {
  render(<ContextLabPage />);

  expect(screen.getByText("今日薄弱词")).toBeInTheDocument();
  expect(screen.getByText("随机词")).toBeInTheDocument();
  expect(screen.getByText("手输词")).toBeInTheDocument();
});
```

- [ ] **Step 2: Implement page**

Use three source modes:

- `proficiency`: default levels `[0, 1]`.
- `random`: count input.
- `custom`: textarea split by spaces, commas, and Chinese commas.

Call `useSseStream` with `/context-lab/generate`.

- [ ] **Step 3: Render generated practice pack**

Show article, selected words, questions, answer controls, and submit action. Submit to `contextLabSubmit`.

- [ ] **Step 4: Verify context lab task**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx
pnpm --filter @font/english-world build
```

Expected: test passes and build succeeds.

## Task 8: Frontend Memory Map And Vocabulary Route

**Files:**
- Create: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapSummary.tsx`
- Create: `apps/english-world/src/page/englishWorld/memoryMap/MemoryMapSummary.test.tsx`
- Create: `apps/english-world/src/page/englishWorld/vocabulary/VocabularyManagerPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.tsx`
- Modify: `apps/english-world/src/router/router.tsx`

- [ ] **Step 1: Test MemoryMapSummary**

```tsx
it("shows weak words and memory clusters", () => {
  render(
    <MemoryMapSummary
      overview={{
        levels: [{ level: 0, count: 2 }],
        dueWords: [],
        weakWords: [{ id: 1, word: "fragile", level: 0 }],
        recentMistakes: [{ wordId: 1, word: "fragile", mistakeCount: 2, cluster: "low-mastery" }],
        streakLikeStats: { recentSessions: 3, recentAccuracy: 66 },
      }}
    />,
  );

  expect(screen.getByText("fragile")).toBeInTheDocument();
  expect(screen.getByText("low-mastery")).toBeInTheDocument();
});
```

- [ ] **Step 2: Extract vocabulary manager**

Move the existing list/filter/table branch from `EnglishWorld.tsx` into `VocabularyManagerPage.tsx`. Keep its behavior unchanged.

- [ ] **Step 3: Make `EnglishWorld.tsx` a compatibility wrapper**

If hash is `#list`, render `VocabularyManagerPage`. If hash is `#ai-tool`, navigate to `/englishWorld/context-lab`. Otherwise route users to the cockpit.

- [ ] **Step 4: Verify memory/vocabulary task**

Run:

```bash
pnpm --filter @font/english-world exec vitest run apps/english-world/src/page/englishWorld/memoryMap/MemoryMapSummary.test.tsx
pnpm --filter @font/english-world build
```

Expected: test passes and build succeeds.

## Task 9: Integration And Browser Verification

**Files:**
- Modify as needed in frontend and backend after integration review.

- [ ] **Step 1: Run backend verification**

In `/Users/liulin/Desktop/backend/nestjs`:

```bash
pnpm test -- --runInBand
pnpm exec tsc --noEmit
```

Expected: all backend tests pass and TypeScript compiles.

- [ ] **Step 2: Run frontend verification**

In `/Users/liulin/Desktop/font/react-font`:

```bash
pnpm --filter @font/english-world exec vitest run
pnpm --filter @font/english-world build
```

Expected: all frontend tests pass and build succeeds.

- [ ] **Step 3: Start local services**

Start backend and frontend using the project's normal commands. Use existing ports and env files; do not print secrets.

- [ ] **Step 4: Verify in browser**

Use Browser to inspect:

- `/englishWorld` shows AI Learning Cockpit.
- Header navigation reaches Today, Context Lab, Memory Map, Word List, Stats, Settings.
- Context Lab can show generation states without layout shifts.
- Memory Map shows empty or populated summary without breaking the page.

- [ ] **Step 5: Final review**

Review diffs across both repositories, confirm no unrelated user changes were reverted, and summarize remaining risks.
