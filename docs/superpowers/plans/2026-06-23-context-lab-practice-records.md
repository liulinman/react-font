# Context Lab Practice Records Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist Context Lab practice submissions as reviewable records, show them in the UI, and support irreversible deletion of packages and attempts.

**Architecture:** The backend owns persistence and authorization: submissions create `article_exercise_attempt` rows, task history returns latest attempt summaries, and delete endpoints hard-delete owned data. The frontend keeps the existing generate/start/submit flow, adds attempt APIs, and upgrades the right panel into a practice-record surface with a right-side attempt drawer.

**Tech Stack:** NestJS, Sequelize model files in `nestjs/src/database`, Jest backend tests, React + Ant Design, Vitest frontend tests, existing `@font/api` request builders.

## Global Constraints

- Deletion is hard delete. Deleted records are not recoverable.
- All task, attempt, detail, and delete operations must be scoped by the authenticated `userId`.
- Preserve existing generate, start practice, submit, PDF download, and result review behavior.
- The existing `POST /context-lab/submit` result shape remains backward-compatible and adds `attemptId`.
- Exercise package history includes `attemptCount`, `latestAttemptId`, `latestScore`, `latestWrongCount`, and `latestAttemptTime`.
- Attempt history opens in a right-side drawer in the frontend.

---

## File Structure

Backend repo: `/Users/liulin/Desktop/font/english/nestjs`

- Create `src/database/article-exercise-attempt.ts`: Sequelize model for submitted practice attempts.
- Modify `src/database/init-models.ts`: register `articleExerciseAttempt`.
- Create `migrations/create-article-exercise-attempt.sql`: SQL table for local/manual migration.
- Modify `src/interface/exercise-agent/dto/submit-exercise.dto.ts`: add optional `elapsedSeconds`.
- Modify `src/interface/exercise-agent/dto/exercise-task.dto.ts`: add attempt history/detail/delete DTOs.
- Modify `src/interface/exercise-agent/exercise-agent.types.ts`: add attempt response types and `attemptId` to submit summary.
- Modify `src/interface/exercise-agent/exercise-agent.service.ts`: persist attempts, summarize latest attempts, expose attempt APIs and hard delete APIs.
- Modify `src/interface/context-lab/context-lab.service.ts`: delegate attempt and delete APIs.
- Modify `src/interface/context-lab/context-lab.controller.ts`: expose new endpoints.
- Modify backend specs in `src/interface/exercise-agent/exercise-agent.service.spec.ts` and `src/interface/context-lab/context-lab.service.spec.ts`.

Frontend repo: `/Users/liulin/Desktop/font/english/react-font`

- Modify `apps/english-world/src/page/englishWorld/types/learning.ts`: add attempt and delete types.
- Modify `apps/english-world/src/page/englishWorld/server/learning.ts`: add request builders.
- Modify `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`: record copy, submit elapsed time, drawer, detail, delete actions.
- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.css`: drawer/card/detail styles.
- Modify `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`: attempt history, detail, submit refresh, delete tests.

---

### Task 1: Backend Attempt Persistence

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/database/article-exercise-attempt.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/migrations/create-article-exercise-attempt.sql`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/database/init-models.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/dto/submit-exercise.dto.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.types.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.spec.ts`

**Interfaces:**
- Consumes: existing `ExerciseAgentService.submit(userId, dto)`.
- Produces:
  - `articleExerciseAttempt` model available as `this.models.articleExerciseAttempt`.
  - `SubmitExerciseDto.elapsedSeconds?: number`.
  - `ExerciseSubmitSummary.attemptId?: number`.
  - Attempt row written whenever submit succeeds or explanation fallback returns a summary.

- [ ] **Step 1: Write the failing submit persistence test**

Add this test to `src/interface/exercise-agent/exercise-agent.service.spec.ts` near the existing submit summary test:

```ts
it('persists a practice attempt when answers are submitted', async () => {
  const service = new ExerciseAgentService();
  const articleExerciseAttempt = {
    create: jest.fn().mockResolvedValue({ id: 501 }),
  };
  (service as any).models = {
    articleExercise: {
      findOne: jest.fn().mockResolvedValue({
        id: 11,
        userId: 7,
        sourceType: 'custom',
        wordsJson: JSON.stringify(['urban farming', 'resilient']),
        questionsJson: JSON.stringify([
          {
            id: 'q1',
            stem: 'What does urban farming improve?',
            options: ['Food supply', 'Space travel'],
            correctIndex: 0,
          },
        ]),
      }),
    },
    articleExerciseTask: {
      findOne: jest.fn().mockResolvedValue({ id: 21, articleExerciseId: 11 }),
    },
    articleExerciseAttempt,
  };
  jest.spyOn(service as any, 'getClient').mockReturnValue({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: JSON.stringify({ explanations: ['解析'] }) } }],
        }),
      },
    },
  });

  const result = await service.submit(7, {
    sessionId: 11,
    elapsedSeconds: 42,
    answers: [{ questionId: 'q1', selectedIndex: 0 }],
  });

  expect(result.attemptId).toBe(501);
  expect(articleExerciseAttempt.create).toHaveBeenCalledWith(
    expect.objectContaining({
      userId: 7,
      taskId: 21,
      articleExerciseId: 11,
      score: 100,
      correctCount: 1,
      wrongCount: 0,
      elapsedSeconds: 42,
      answersJson: JSON.stringify([{ questionId: 'q1', selectedIndex: 0 }]),
    }),
  );
});
```

- [ ] **Step 2: Run the failing backend test**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts
```

Expected: FAIL because `articleExerciseAttempt.create` is not called and `attemptId` is missing.

- [ ] **Step 3: Create the Sequelize model and migration**

Create `src/database/article-exercise-attempt.ts`:

```ts
import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';

export interface articleExerciseAttemptAttributes {
  id: number;
  userId: number;
  taskId: number;
  articleExerciseId: number;
  answersJson: string;
  resultsJson: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  weakWordsJson: string;
  nextSuggestionsJson: string;
  elapsedSeconds?: number | null;
  createTime?: Date;
}

export type articleExerciseAttemptPk = 'id';
export type articleExerciseAttemptId =
  articleExerciseAttempt[articleExerciseAttemptPk];
export type articleExerciseAttemptOptionalAttributes =
  | 'id'
  | 'elapsedSeconds'
  | 'createTime';
export type articleExerciseAttemptCreationAttributes = Optional<
  articleExerciseAttemptAttributes,
  articleExerciseAttemptOptionalAttributes
>;

export class articleExerciseAttempt
  extends Model<
    articleExerciseAttemptAttributes,
    articleExerciseAttemptCreationAttributes
  >
  implements articleExerciseAttemptAttributes
{
  id!: number;
  userId!: number;
  taskId!: number;
  articleExerciseId!: number;
  answersJson!: string;
  resultsJson!: string;
  score!: number;
  correctCount!: number;
  wrongCount!: number;
  weakWordsJson!: string;
  nextSuggestionsJson!: string;
  elapsedSeconds?: number | null;
  createTime?: Date;

  static initModel(
    sequelize: Sequelize.Sequelize,
  ): typeof articleExerciseAttempt {
    return articleExerciseAttempt.init(
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        userId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'user_id',
        },
        taskId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'task_id',
        },
        articleExerciseId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: 'article_exercise_id',
        },
        answersJson: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'answers_json',
        },
        resultsJson: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'results_json',
        },
        score: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        correctCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'correct_count',
        },
        wrongCount: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: 'wrong_count',
        },
        weakWordsJson: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'weak_words_json',
        },
        nextSuggestionsJson: {
          type: DataTypes.TEXT,
          allowNull: false,
          field: 'next_suggestions_json',
        },
        elapsedSeconds: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: 'elapsed_seconds',
        },
        createTime: {
          type: DataTypes.DATE,
          allowNull: true,
          defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP'),
          field: 'create_time',
        },
      },
      {
        sequelize,
        tableName: 'article_exercise_attempt',
        timestamps: false,
        indexes: [
          { name: 'PRIMARY', unique: true, fields: [{ name: 'id' }] },
          {
            name: 'user_id_create_time',
            fields: [{ name: 'user_id' }, { name: 'create_time' }],
          },
          {
            name: 'task_id_create_time',
            fields: [{ name: 'task_id' }, { name: 'create_time' }],
          },
          {
            name: 'article_exercise_id',
            fields: [{ name: 'article_exercise_id' }],
          },
        ],
      },
    );
  }
}
```

Create `migrations/create-article-exercise-attempt.sql`:

```sql
CREATE TABLE IF NOT EXISTS `article_exercise_attempt` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `task_id` int NOT NULL,
  `article_exercise_id` int NOT NULL,
  `answers_json` text NOT NULL,
  `results_json` text NOT NULL,
  `score` int NOT NULL DEFAULT 0,
  `correct_count` int NOT NULL DEFAULT 0,
  `wrong_count` int NOT NULL DEFAULT 0,
  `weak_words_json` text NOT NULL,
  `next_suggestions_json` text NOT NULL,
  `elapsed_seconds` int DEFAULT NULL,
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id_create_time` (`user_id`, `create_time`),
  KEY `task_id_create_time` (`task_id`, `create_time`),
  KEY `article_exercise_id` (`article_exercise_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 4: Register the model**

Modify `src/database/init-models.ts` by importing `article-exercise-attempt`, exporting its attributes, initializing it, and returning it in the model map:

```ts
import { articleExerciseAttempt as _articleExerciseAttempt } from './article-exercise-attempt';
import type {
  articleExerciseAttemptAttributes,
  articleExerciseAttemptCreationAttributes,
} from './article-exercise-attempt';

export {
  _articleExerciseAttempt as articleExerciseAttempt,
};
export type {
  articleExerciseAttemptAttributes,
  articleExerciseAttemptCreationAttributes,
};

const articleExerciseAttempt = _articleExerciseAttempt.initModel(sequelize);

return {
  // existing models...
  articleExerciseAttempt,
};
```

- [ ] **Step 5: Add DTO and result fields**

In `src/interface/exercise-agent/dto/submit-exercise.dto.ts`, add:

```ts
@IsOptional()
@IsNumber()
@Min(0)
elapsedSeconds?: number;
```

In `src/interface/exercise-agent/exercise-agent.types.ts`, add `attemptId?: number` to `ExerciseSubmitSummary`.

- [ ] **Step 6: Persist attempts from submit**

In `ExerciseAgentService.submit`, find the owning task after validating `articleExercise`:

```ts
const task = await this.models.articleExerciseTask?.findOne?.({
  where: { articleExerciseId: session.id, userId },
});
```

After building the summary, call a helper before returning:

```ts
const summary = this.buildSubmitSummary(results, questions, session.wordsJson);
return this.persistSubmitAttempt(userId, session, task, dto, summary);
```

Add helper:

```ts
private async persistSubmitAttempt(
  userId: number,
  session: any,
  task: any,
  dto: SubmitExerciseDto,
  summary: ExerciseSubmitSummary,
): Promise<ExerciseSubmitSummary> {
  if (!this.models.articleExerciseAttempt || !task?.id) {
    return summary;
  }
  const attempt = await this.models.articleExerciseAttempt.create({
    userId,
    taskId: task.id,
    articleExerciseId: session.id,
    answersJson: JSON.stringify(dto.answers ?? []),
    resultsJson: JSON.stringify(summary.results ?? []),
    score: summary.score ?? 0,
    correctCount: summary.correctCount ?? 0,
    wrongCount: summary.wrongCount ?? 0,
    weakWordsJson: JSON.stringify(summary.weakWords ?? []),
    nextSuggestionsJson: JSON.stringify(summary.nextSuggestions ?? []),
    elapsedSeconds: Number.isFinite(dto.elapsedSeconds)
      ? Number(dto.elapsedSeconds)
      : null,
  });
  return { ...summary, attemptId: attempt.id };
}
```

- [ ] **Step 7: Run tests and commit**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts
pnpm build
```

Expected: PASS.

Commit:

```bash
git add src/database/article-exercise-attempt.ts src/database/init-models.ts migrations/create-article-exercise-attempt.sql src/interface/exercise-agent/dto/submit-exercise.dto.ts src/interface/exercise-agent/exercise-agent.types.ts src/interface/exercise-agent/exercise-agent.service.ts src/interface/exercise-agent/exercise-agent.service.spec.ts
git commit -m "feat: persist context lab practice attempts"
```

---

### Task 2: Backend Attempt History And Hard Delete APIs

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/dto/exercise-task.dto.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.types.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/context-lab/context-lab.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/context-lab/context-lab.controller.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.spec.ts`
- Test: `/Users/liulin/Desktop/font/english/nestjs/src/interface/context-lab/context-lab.service.spec.ts`

**Interfaces:**
- Consumes: `articleExerciseAttempt` model from Task 1.
- Produces:
  - `getAttemptHistory(userId, dto)`.
  - `getAttemptDetail(userId, dto)`.
  - `deleteAttempt(userId, dto)`.
  - `deleteTask(userId, dto)`.
  - Context Lab controller endpoints: `attempt-history`, `attempt-detail`, `delete-attempt`, `delete-task`.

- [ ] **Step 1: Write failing backend service tests**

Add tests to `exercise-agent.service.spec.ts`:

```ts
it('returns attempt history scoped to task owner', async () => {
  const { service } = createService(makeRow({
    status: ExerciseTaskStatus.SUCCEEDED,
    articleExerciseId: 88,
  }));
  const articleExerciseAttempt = {
    findAndCountAll: jest.fn().mockResolvedValue({
      rows: [
        {
          id: 501,
          taskId: 21,
          articleExerciseId: 88,
          score: 50,
          correctCount: 1,
          wrongCount: 1,
          weakWordsJson: JSON.stringify(['resilient']),
          nextSuggestionsJson: JSON.stringify(['复盘错题解析']),
          answersJson: JSON.stringify([{ questionId: 'q1', selectedIndex: 0 }]),
          resultsJson: JSON.stringify([{ questionId: 'q1', correct: false }]),
          elapsedSeconds: 42,
          createTime: new Date('2026-06-23T08:00:00Z'),
        },
      ],
      count: 1,
    }),
  };
  (service as any).models.articleExerciseAttempt = articleExerciseAttempt;

  const result = await (service as any).getAttemptHistory(7, {
    taskId: 21,
    page: 1,
    pageSize: 10,
  });

  expect(articleExerciseAttempt.findAndCountAll).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { userId: 7, taskId: 21 },
      order: [['createTime', 'DESC']],
    }),
  );
  expect(result.list[0]).toEqual(
    expect.objectContaining({
      attemptId: 501,
      score: 50,
      wrongCount: 1,
      weakWords: ['resilient'],
    }),
  );
});

it('hard deletes an owned attempt', async () => {
  const { service } = createService();
  const attempt = { destroy: jest.fn().mockResolvedValue(1) };
  (service as any).models.articleExerciseAttempt = {
    findOne: jest.fn().mockResolvedValue(attempt),
  };

  await expect(
    (service as any).deleteAttempt(7, { attemptId: 501 }),
  ).resolves.toEqual({ deleted: true });

  expect((service as any).models.articleExerciseAttempt.findOne)
    .toHaveBeenCalledWith({ where: { id: 501, userId: 7 } });
  expect(attempt.destroy).toHaveBeenCalled();
});

it('hard deletes an owned task with attempts and linked article exercise', async () => {
  const task = makeRow({
    status: ExerciseTaskStatus.SUCCEEDED,
    articleExerciseId: 88,
    destroy: jest.fn().mockResolvedValue(1),
  });
  const { service } = createService(task);
  (service as any).models.articleExerciseAttempt = {
    destroy: jest.fn().mockResolvedValue(2),
  };
  (service as any).models.articleExercise = {
    destroy: jest.fn().mockResolvedValue(1),
  };

  await expect((service as any).deleteTask(7, { taskId: 21 }))
    .resolves.toEqual({ deleted: true });

  expect((service as any).models.articleExerciseAttempt.destroy)
    .toHaveBeenCalledWith({ where: { userId: 7, taskId: 21 } });
  expect((service as any).models.articleExercise.destroy)
    .toHaveBeenCalledWith({ where: { id: 88, userId: 7 } });
  expect(task.destroy).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts
```

Expected: FAIL because new methods are missing.

- [ ] **Step 3: Add DTOs**

In `exercise-task.dto.ts`, add:

```ts
export class ExerciseAttemptHistoryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  taskId?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  articleExerciseId?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  pageSize?: number;
}

export class ExerciseAttemptDetailDto {
  @IsNumber()
  @Min(1)
  attemptId: number;
}

export class ExerciseAttemptDeleteDto {
  @IsNumber()
  @Min(1)
  attemptId: number;
}

export class ExerciseTaskDeleteDto {
  @IsNumber()
  @Min(1)
  taskId: number;
}
```

- [ ] **Step 4: Implement attempt mapping and APIs**

In `ExerciseAgentService`, add methods:

```ts
async getAttemptHistory(userId: number, dto: ExerciseAttemptHistoryDto = {}) {
  const page = Math.max(1, Number(dto.page ?? 1));
  const pageSize = Math.min(50, Math.max(1, Number(dto.pageSize ?? 10)));
  const where: Record<string, any> = { userId };
  if (dto.taskId) where.taskId = dto.taskId;
  if (dto.articleExerciseId) where.articleExerciseId = dto.articleExerciseId;

  const result = await this.models.articleExerciseAttempt.findAndCountAll({
    where,
    order: [['createTime', 'DESC']],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    list: result.rows.map((row: any) => this.mapAttempt(row)),
    total: result.count,
    page,
    pageSize,
  };
}

async getAttemptDetail(userId: number, dto: ExerciseAttemptDetailDto) {
  const attempt = await this.models.articleExerciseAttempt.findOne({
    where: { id: dto.attemptId, userId },
  });
  if (!attempt) {
    throw new HttpException(
      { code: 404, message: '练习记录不存在或无权限' },
      HttpStatus.NOT_FOUND,
    );
  }
  return this.mapAttempt(attempt);
}

async deleteAttempt(userId: number, dto: ExerciseAttemptDeleteDto) {
  const attempt = await this.models.articleExerciseAttempt.findOne({
    where: { id: dto.attemptId, userId },
  });
  if (!attempt) {
    throw new HttpException(
      { code: 404, message: '练习记录不存在或无权限' },
      HttpStatus.NOT_FOUND,
    );
  }
  await attempt.destroy();
  return { deleted: true };
}

async deleteTask(userId: number, dto: ExerciseTaskDeleteDto) {
  const task = await this.models.articleExerciseTask.findOne({
    where: { id: dto.taskId, userId },
  });
  if (!task) {
    throw new HttpException(
      { code: 404, message: '练习包不存在或无权限' },
      HttpStatus.NOT_FOUND,
    );
  }
  await this.models.articleExerciseAttempt.destroy({
    where: { userId, taskId: task.id },
  });
  if (task.articleExerciseId) {
    await this.models.articleExercise.destroy({
      where: { id: task.articleExerciseId, userId },
    });
  }
  await task.destroy();
  return { deleted: true };
}

private mapAttempt(row: any) {
  return {
    attemptId: row.id,
    id: row.id,
    taskId: row.taskId,
    articleExerciseId: row.articleExerciseId,
    score: Number(row.score ?? 0),
    correctCount: Number(row.correctCount ?? 0),
    wrongCount: Number(row.wrongCount ?? 0),
    weakWords: this.parseJsonArray(row.weakWordsJson),
    nextSuggestions: this.parseJsonArray(row.nextSuggestionsJson),
    answers: this.parseJsonArray(row.answersJson),
    results: this.parseJsonArray(row.resultsJson),
    elapsedSeconds: row.elapsedSeconds ?? undefined,
    createTime: row.createTime,
  };
}
```

- [ ] **Step 5: Add latest attempt summaries to task history**

In `getTaskHistory`, after fetching rows, query latest attempts for the returned task IDs. Implement a simple per-task lookup first to keep the change low risk:

```ts
const mapped = await Promise.all(
  result.rows.map(async (row: any) => {
    const task = this.mapTask(row);
    const latestAttempt = await this.models.articleExerciseAttempt?.findOne?.({
      where: { userId, taskId: row.id },
      order: [['createTime', 'DESC']],
    });
    const attemptCount = await this.models.articleExerciseAttempt?.count?.({
      where: { userId, taskId: row.id },
    });
    return {
      ...task,
      attemptCount: Number(attemptCount ?? 0),
      latestAttemptId: latestAttempt?.id,
      latestScore: latestAttempt?.score,
      latestWrongCount: latestAttempt?.wrongCount,
      latestAttemptTime: latestAttempt?.createTime,
    };
  }),
);
```

Return `list: mapped`. If `articleExerciseAttempt` is absent in old tests, use `0` and `undefined` fallback.

- [ ] **Step 6: Delegate through Context Lab**

In `ContextLabService`, add methods:

```ts
async getAttemptHistory(userId: number, dto: ExerciseAttemptHistoryDto) {
  return this.exerciseAgentService.getAttemptHistory(userId, dto);
}

async getAttemptDetail(userId: number, dto: ExerciseAttemptDetailDto) {
  return this.exerciseAgentService.getAttemptDetail(userId, dto);
}

async deleteAttempt(userId: number, dto: ExerciseAttemptDeleteDto) {
  return this.exerciseAgentService.deleteAttempt(userId, dto);
}

async deleteTask(userId: number, dto: ExerciseTaskDeleteDto) {
  return this.exerciseAgentService.deleteTask(userId, dto);
}
```

In `ContextLabController`, import the DTOs and add:

```ts
@Post('attempt-history')
@UseGuards(AuthGuard)
async attemptHistory(
  @Body() dto: ExerciseAttemptHistoryDto,
  @CurrentUser() user: any,
) {
  return this.contextLabService.getAttemptHistory(user.id, dto);
}

@Post('attempt-detail')
@UseGuards(AuthGuard)
async attemptDetail(
  @Body() dto: ExerciseAttemptDetailDto,
  @CurrentUser() user: any,
) {
  return this.contextLabService.getAttemptDetail(user.id, dto);
}

@Post('delete-attempt')
@UseGuards(AuthGuard)
async deleteAttempt(
  @Body() dto: ExerciseAttemptDeleteDto,
  @CurrentUser() user: any,
) {
  return this.contextLabService.deleteAttempt(user.id, dto);
}

@Post('delete-task')
@UseGuards(AuthGuard)
async deleteTask(
  @Body() dto: ExerciseTaskDeleteDto,
  @CurrentUser() user: any,
) {
  return this.contextLabService.deleteTask(user.id, dto);
}
```

- [ ] **Step 7: Add ContextLabService delegation tests**

Extend `context-lab.service.spec.ts` fake service with:

```ts
getAttemptHistory: jest.fn(),
getAttemptDetail: jest.fn(),
deleteAttempt: jest.fn(),
deleteTask: jest.fn(),
```

Add assertions:

```ts
await service.getAttemptHistory(1, { taskId: 12 } as any);
expect(exerciseAgentService.getAttemptHistory)
  .toHaveBeenCalledWith(1, { taskId: 12 });

await service.deleteTask(1, { taskId: 12 } as any);
expect(exerciseAgentService.deleteTask)
  .toHaveBeenCalledWith(1, { taskId: 12 });
```

- [ ] **Step 8: Run tests and commit**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand
pnpm build
```

Expected: PASS.

Commit:

```bash
git add src/interface/exercise-agent/dto/exercise-task.dto.ts src/interface/exercise-agent/exercise-agent.types.ts src/interface/exercise-agent/exercise-agent.service.ts src/interface/context-lab/context-lab.service.ts src/interface/context-lab/context-lab.controller.ts src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/context-lab/context-lab.service.spec.ts
git commit -m "feat: add context lab record deletion APIs"
```

---

### Task 3: Frontend API Types And Submit Wiring

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/types/learning.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/server/learning.ts`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Test: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`

**Interfaces:**
- Consumes backend endpoints from Task 2.
- Produces request builders:
  - `contextLabAttemptHistory`
  - `contextLabAttemptDetail`
  - `contextLabDeleteAttempt`
  - `contextLabDeleteTask`
- `contextLabSubmit` payload includes `elapsedSeconds`.

- [ ] **Step 1: Write failing frontend submit-refresh test**

Add to `ContextLabPage.test.tsx`:

```tsx
it("sends elapsed time when submitting and refreshes practice records", async () => {
  requestMock.mockImplementation((config) => {
    if (config.url === "/context-lab/history") {
      return Promise.resolve({
        list: [
          {
            id: 12,
            taskId: 12,
            status: "succeeded",
            sourceType: "custom",
            words: ["urban farming"],
            articleExerciseId: 88,
            article: "Urban Farming\n\nFood systems change.",
            questions: [
              {
                id: "q1",
                stem: "What is the passage about?",
                options: ["Urban farming", "Space travel"],
              },
            ],
            attemptCount: config.data?.page === 1 ? 1 : 0,
            latestScore: 100,
            latestWrongCount: 0,
            latestAttemptId: 501,
            latestAttemptTime: "2026-06-23T08:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    }
    if (config.url === "/context-lab/submit") {
      return Promise.resolve({
        attemptId: 501,
        results: [
          {
            questionId: "q1",
            correct: true,
            correctIndex: 0,
            userSelectedIndex: 0,
            explanation: "答对了",
          },
        ],
        score: 100,
        correctCount: 1,
        wrongCount: 0,
        weakWords: [],
        nextSuggestions: ["继续保持"],
      });
    }
    return Promise.resolve({});
  });

  const user = userEvent.setup();
  render(<ContextLabPage />);

  await user.click(await screen.findByRole("button", { name: "开始练习" }));
  await user.click(await screen.findByLabelText("A. Urban farming"));
  await user.click(screen.getByRole("button", { name: "提交练习" }));

  await waitFor(() => {
    expect(requestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "/context-lab/submit",
        data: expect.objectContaining({ elapsedSeconds: expect.any(Number) }),
      }),
    );
  });
  expect(await screen.findByText("最近得分 100")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run failing frontend test**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "elapsed time"
```

Expected: FAIL because `elapsedSeconds` and latest record copy are missing.

- [ ] **Step 3: Add frontend types**

In `types/learning.ts`, add:

```ts
export type ContextLabAttempt = {
  id: number;
  attemptId: number;
  taskId: number;
  articleExerciseId: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  weakWords: string[];
  nextSuggestions: string[];
  answers: Array<{ questionId: string; selectedIndex: number }>;
  results: ExerciseResultItem[];
  elapsedSeconds?: number | null;
  createTime?: string;
};

export type ContextLabAttemptHistoryParams = {
  taskId?: number;
  articleExerciseId?: number;
  page?: number;
  pageSize?: number;
};

export type ContextLabAttemptHistoryResponse = {
  list: ContextLabAttempt[];
  total: number;
  page: number;
  pageSize: number;
};

export type ContextLabAttemptDetailParams = {
  attemptId: number;
};

export type ContextLabDeleteAttemptParams = {
  attemptId: number;
};

export type ContextLabDeleteTaskParams = {
  taskId: number;
};

export type ContextLabDeleteResponse = {
  deleted: boolean;
};
```

Extend:

```ts
export type ContextLabSubmitParams = {
  sessionId: number;
  elapsedSeconds?: number;
  answers: Array<{ questionId: string; selectedIndex: number }>;
};

export type ContextLabSubmitResult = {
  attemptId?: number;
  // existing fields...
};

export type ContextLabTask = {
  // existing fields...
  attemptCount?: number;
  latestAttemptId?: number;
  latestScore?: number;
  latestWrongCount?: number;
  latestAttemptTime?: string;
};
```

- [ ] **Step 4: Add request builders**

In `server/learning.ts`, import the new types and add:

```ts
export const contextLabAttemptHistory = (
  data: ContextLabAttemptHistoryParams,
): YTRequest<ContextLabAttemptHistoryResponse> => ({
  url: "/context-lab/attempt-history",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabAttemptHistoryResponse,
});

export const contextLabAttemptDetail = (
  data: ContextLabAttemptDetailParams,
): YTRequest<ContextLabAttempt> => ({
  url: "/context-lab/attempt-detail",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabAttempt,
});

export const contextLabDeleteAttempt = (
  data: ContextLabDeleteAttemptParams,
): YTRequest<ContextLabDeleteResponse> => ({
  url: "/context-lab/delete-attempt",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabDeleteResponse,
});

export const contextLabDeleteTask = (
  data: ContextLabDeleteTaskParams,
): YTRequest<ContextLabDeleteResponse> => ({
  url: "/context-lab/delete-task",
  method: "POST",
  data,
  __responseType: undefined as unknown as ContextLabDeleteResponse,
});
```

- [ ] **Step 5: Include elapsed seconds and refresh history after submit**

In `ContextLabPage.tsx`, change submit payload:

```ts
const response = await request(
  contextLabSubmit({
    sessionId,
    elapsedSeconds,
    answers: currentTask.questions.map((question, index) => ({
      questionId: question.id || `q-${index}`,
      selectedIndex: answers[question.id || `q-${index}`],
    })),
  }),
);
```

After setting result state:

```ts
setSubmitSummary(response);
await loadHistory();
```

On each succeeded task card, render latest summary:

```tsx
{task.attemptCount ? (
  <p>
    练习 {task.attemptCount} 次 · 最近得分 {task.latestScore ?? 0} · 错题{" "}
    {task.latestWrongCount ?? 0}
  </p>
) : (
  <p>{task.errorMessage || "还没有提交记录，开始练习后会出现在这里。"}</p>
)}
```

- [ ] **Step 6: Run tests and commit**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx --testTimeout 30000
pnpm --filter @font/english-world build
```

Expected: PASS.

Commit:

```bash
git add apps/english-world/src/page/englishWorld/types/learning.ts apps/english-world/src/page/englishWorld/server/learning.ts apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx
git commit -m "feat: connect context lab practice record APIs"
```

---

### Task 4: Frontend Attempt Drawer And Delete Actions

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Modify: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/EnglishWorld.css`
- Test: `/Users/liulin/Desktop/font/english/react-font/apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`

**Interfaces:**
- Consumes request builders from Task 3.
- Produces:
  - "查看记录" opens a right-side drawer.
  - "删除记录" calls `/context-lab/delete-attempt`.
  - package "删除" calls `/context-lab/delete-task`.

- [ ] **Step 1: Write failing drawer and delete tests**

Add tests:

```tsx
it("opens practice record drawer and deletes an attempt after confirmation", async () => {
  requestMock.mockImplementation((config) => {
    if (config.url === "/context-lab/history") {
      return Promise.resolve({
        list: [
          {
            id: 12,
            taskId: 12,
            status: "succeeded",
            sourceType: "custom",
            words: ["vibe"],
            articleExerciseId: 88,
            article: "Topic\n\nParagraph.",
            questions: [],
            attemptCount: 1,
            latestAttemptId: 501,
            latestScore: 50,
            latestWrongCount: 1,
            latestAttemptTime: "2026-06-23T08:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    }
    if (config.url === "/context-lab/attempt-history") {
      return Promise.resolve({
        list: [
          {
            id: 501,
            attemptId: 501,
            taskId: 12,
            articleExerciseId: 88,
            score: 50,
            correctCount: 1,
            wrongCount: 1,
            weakWords: ["vibe"],
            nextSuggestions: ["复盘错题解析"],
            answers: [],
            results: [],
            elapsedSeconds: 42,
            createTime: "2026-06-23T08:00:00Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    }
    if (config.url === "/context-lab/delete-attempt") {
      return Promise.resolve({ deleted: true });
    }
    return Promise.resolve({});
  });

  const user = userEvent.setup();
  render(<ContextLabPage />);

  await user.click(await screen.findByRole("button", { name: "查看记录" }));
  expect(await screen.findByRole("dialog", { name: "练习记录" })).toBeInTheDocument();
  expect(screen.getByText("得分 50")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "删除记录" }));
  await user.click(await screen.findByRole("button", { name: "确认删除" }));

  expect(requestMock).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/context-lab/delete-attempt",
      data: { attemptId: 501 },
    }),
  );
});

it("deletes a practice package after confirmation", async () => {
  requestMock.mockImplementation((config) => {
    if (config.url === "/context-lab/history") {
      return Promise.resolve({
        list: [
          {
            id: 12,
            taskId: 12,
            status: "succeeded",
            sourceType: "custom",
            words: ["vibe"],
            articleExerciseId: 88,
            article: "Topic\n\nParagraph.",
            questions: [],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      });
    }
    if (config.url === "/context-lab/delete-task") {
      return Promise.resolve({ deleted: true });
    }
    return Promise.resolve({});
  });

  const user = userEvent.setup();
  render(<ContextLabPage />);

  await user.click(await screen.findByRole("button", { name: "删除练习包" }));
  await user.click(await screen.findByRole("button", { name: "确认删除" }));

  expect(requestMock).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/context-lab/delete-task",
      data: { taskId: 12 },
    }),
  );
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx -t "practice record|deletes a practice package" --testTimeout 30000
```

Expected: FAIL because drawer and delete buttons do not exist.

- [ ] **Step 3: Add drawer state and loaders**

In `ContextLabPage.tsx`, import `Drawer` from `antd` and request builders. Add state:

```ts
const [attemptDrawerOpen, setAttemptDrawerOpen] = useState(false);
const [attemptTask, setAttemptTask] = useState<ContextLabTask | null>(null);
const [attempts, setAttempts] = useState<ContextLabAttempt[]>([]);
const [attemptsLoading, setAttemptsLoading] = useState(false);
```

Add loader:

```ts
const loadAttempts = async (task: ContextLabTask) => {
  setAttemptTask(task);
  setAttemptDrawerOpen(true);
  setAttemptsLoading(true);
  try {
    const response = await request(
      contextLabAttemptHistory({ taskId: task.taskId, page: 1, pageSize: 20 }),
    );
    setAttempts(response.list ?? []);
  } finally {
    setAttemptsLoading(false);
  }
};
```

- [ ] **Step 4: Add hard delete handlers**

Add:

```ts
const handleDeleteAttempt = (attempt: ContextLabAttempt) => {
  Modal.confirm({
    title: "确认删除练习记录",
    content: "删除后不可恢复，本次练习记录将永久移除。",
    okText: "确认删除",
    cancelText: "取消",
    okButtonProps: { danger: true },
    onOk: async () => {
      await request(contextLabDeleteAttempt({ attemptId: attempt.attemptId }));
      message.success("练习记录已删除");
      if (attemptTask) await loadAttempts(attemptTask);
      await loadHistory();
    },
  });
};

const handleDeleteTask = (task: ContextLabTask) => {
  Modal.confirm({
    title: "确认删除练习包",
    content: "删除后不可恢复，本练习包及其所有练习记录将永久移除。",
    okText: "确认删除",
    cancelText: "取消",
    okButtonProps: { danger: true },
    onOk: async () => {
      await request(contextLabDeleteTask({ taskId: task.taskId }));
      message.success("练习包已删除");
      if (currentTask?.taskId === task.taskId) setCurrentTask(null);
      await loadHistory();
    },
  });
};
```

- [ ] **Step 5: Render record actions and drawer**

On succeeded task cards, add:

```tsx
<Button size="small" onClick={() => void loadAttempts(task)}>
  查看记录
</Button>
```

On every task card, add:

```tsx
<Button danger size="small" onClick={() => handleDeleteTask(task)}>
  删除练习包
</Button>
```

Before the existing practice modal, render:

```tsx
<Drawer
  title="练习记录"
  width={520}
  open={attemptDrawerOpen}
  onClose={() => setAttemptDrawerOpen(false)}
>
  {attemptsLoading ? (
    <Spin />
  ) : attempts.length === 0 ? (
    <Empty description="还没有提交记录，开始练习后会出现在这里。" />
  ) : (
    <div className="context-lab-attempt-list">
      {attempts.map((attempt) => (
        <section className="context-lab-attempt-item" key={attempt.attemptId}>
          <Space wrap>
            <Tag color={attempt.wrongCount > 0 ? "orange" : "green"}>
              得分 {attempt.score}
            </Tag>
            <Text>错题 {attempt.wrongCount}</Text>
            {attempt.elapsedSeconds != null && (
              <Text type="secondary">
                用时 {formatElapsedSeconds(attempt.elapsedSeconds)}
              </Text>
            )}
          </Space>
          {attempt.weakWords.length > 0 && (
            <div className="learning-cockpit-word-strip">
              {attempt.weakWords.map((word) => (
                <Tag key={word}>{word}</Tag>
              ))}
            </div>
          )}
          <Button danger size="small" onClick={() => handleDeleteAttempt(attempt)}>
            删除记录
          </Button>
        </section>
      ))}
    </div>
  )}
</Drawer>
```

- [ ] **Step 6: Add styles**

In `EnglishWorld.css`, add:

```css
.context-lab-attempt-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.context-lab-attempt-item {
  border: 1px solid #dfe7f2;
  border-radius: 8px;
  padding: 12px;
  background: #fff;
}
```

- [ ] **Step 7: Run tests and commit**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world exec vitest run src/page/englishWorld/contextLab/ContextLabPage.test.tsx --testTimeout 30000
pnpm --filter @font/english-world build
```

Expected: PASS.

Commit:

```bash
git add apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx
git commit -m "feat: add context lab practice records drawer"
```

---

### Task 5: Full QA And Documentation Update

**Files:**
- Modify if needed: `/Users/liulin/Desktop/font/english/react-font/docs/superpowers/specs/2026-06-23-context-lab-practice-records-design.md`
- Verify both repos.

**Interfaces:**
- Consumes Tasks 1-4.
- Produces final verified frontend/backend state ready for push or MR.

- [ ] **Step 1: Run backend full validation**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git diff --check
pnpm test --runInBand
pnpm build
```

Expected: `Test Suites` all passed, `Tests` all passed, build exits `0`.

- [ ] **Step 2: Run frontend full validation**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
git diff --check
pnpm --filter @font/english-world test -- --run
pnpm --filter @font/english-world build
```

Expected: all Vitest files pass, build exits `0`.

- [ ] **Step 3: Manual QA checklist**

Run the app with the user's normal local setup, then verify:

```text
1. Open /englishWorld/context-lab.
2. Generate or use an existing succeeded exercise package.
3. Start practice and submit answers.
4. Result review appears.
5. Right panel shows latest score and practice count.
6. "查看记录" opens the drawer.
7. Delete one record with confirmation; it disappears.
8. Delete one package with confirmation; it disappears.
9. Refresh the page; deleted data remains gone.
```

- [ ] **Step 4: Commit any QA-only doc corrections**

If the implementation intentionally differs from the design, update the design doc with exact final behavior and commit:

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add docs/superpowers/specs/2026-06-23-context-lab-practice-records-design.md
git commit -m "docs: align context lab records design"
```

- [ ] **Step 5: Final status report**

Report:

```text
Frontend branch: <branch>
Backend branch: <branch>
Frontend latest commit: <sha> <message>
Backend latest commit: <sha> <message>
Verification:
- Backend diff check / tests / build
- Frontend diff check / tests / build
Known warnings:
- browserslist or large chunk warnings, if present
```
