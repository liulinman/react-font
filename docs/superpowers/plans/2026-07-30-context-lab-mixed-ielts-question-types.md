# Context Lab Mixed IELTS Question Types Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Web desktop Context Lab reading exercises from an all-radio contract to authentic single-choice, True/False/Not Given, text-completion, and short-answer questions without changing micro exercises, mobile pages, or database tables.

**Architecture:** Store standard and pasted exercises in a versioned V2 JSON envelope inside the existing `questionsJson` columns, convert historical V1 arrays in memory, and keep micro exercises on their existing choice contract. Move question-envelope compatibility and deterministic grading into focused backend modules, then add Web answer helpers and an Ant Design desktop renderer.

**Tech Stack:** NestJS 10, TypeScript, Sequelize JSON text columns, class-validator, Jest, React 18, Ant Design 5, Vitest, Testing Library, Cypress, pnpm.

## Global Constraints

- The approved design is `docs/superpowers/specs/2026-07-30-context-lab-mixed-ielts-question-types-design.md`.
- Full exercises support `single_choice`, `true_false_not_given`, `text_completion`, and `short_answer`.
- `micro` exercises remain three four-option choice questions and retain their current strict validation, persistence, and learning-event behavior.
- Standard generation targets 13 questions: 3 choice, 3 TFNG, 4 completion, and 3 short answer.
- A standard or pasted exercise succeeds when it has a non-empty article and at least one valid question; score denominators use the actual saved question count.
- Correctness is computed by the backend before AI explanation generation; AI explanations cannot change correctness.
- Text grading uses NFKC, trimmed and collapsed whitespace, case-insensitive comparison, terminal punctuation removal, word-limit enforcement, and exact accepted-answer matching.
- No database schema migration and no bulk rewrite of historical JSON.
- Correct answers never appear in task, history, detail, or SSE payloads before submission.
- Web desktop must expose all four answer capabilities.
- Mobile mixed-question work is deferred; do not modify files under `englishWorldMobile` in this implementation phase.
- Matching Headings, Matching Information, and Matching Features are not newly generated in this release; historical pseudo-matching questions remain legacy choices.
- Backend repo `/Users/liulin/Desktop/font/english/nestjs` contains an unrelated untracked plan file; do not stage, edit, delete, or commit it.
- Use TDD for each task and make one focused commit per task in the repository that owns the changed files.

---

## Story Map

| Story | User value | Plan task |
|---|---|---|
| [S1](../stories/context-lab-mixed-ielts-question-types/S1-versioned-question-contract.md) | Old and new exercise packs open safely | Task 1 |
| [S2](../stories/context-lab-mixed-ielts-question-types/S2-deterministic-grading.md) | Mixed answers are submitted and scored predictably | Task 2 |
| [S3](../stories/context-lab-mixed-ielts-question-types/S3-authentic-generation.md) | AI generates usable authentic IELTS question types | Task 3 |
| [S4](../stories/context-lab-mixed-ielts-question-types/S4-history-results-pdf.md) | History, results, warnings, and PDF stay trustworthy | Task 4 |
| [S5](../stories/context-lab-mixed-ielts-question-types/S5-frontend-answer-contract.md) | The Web client has one stable answer and draft contract | Task 5 |
| [S6](../stories/context-lab-mixed-ielts-question-types/S6-desktop-mixed-practice.md) | Desktop learners can complete all four question types | Task 6 |
| [S7](../stories/context-lab-mixed-ielts-question-types/S7-mobile-mixed-practice.md) | Deferred mobile parity backlog | Task 7, do not execute |
| [S8](../stories/context-lab-mixed-ielts-question-types/S8-cross-repo-acceptance.md) | Backend and Web workflow are regression-tested | Task 8 |

## File Structure

Backend repo: `/Users/liulin/Desktop/font/english/nestjs`

- Create `src/interface/exercise-agent/exercise-question-contract.ts`: V1/V2 types, storage parsing, normalization, grouping, answer stripping, and generation validation output.
- Create `src/interface/exercise-agent/exercise-question-contract.spec.ts`: contract, compatibility, sanitization, and partial-success tests.
- Create `src/interface/exercise-agent/exercise-answer-grader.ts`: mixed-answer validation, text normalization, word counting, and deterministic scoring.
- Create `src/interface/exercise-agent/exercise-answer-grader.spec.ts`: mixed grading and edge-case tests.
- Modify `src/interface/exercise-agent/exercise-agent.types.ts`: export V2 response, result, warning, and attempt types.
- Modify `src/interface/exercise-agent/dto/submit-exercise.dto.ts`: accept the answer union while preserving old `selectedIndex` requests.
- Modify `src/interface/exercise-agent/dto/exercise-task.dto.ts`: accept V2 webhook question fields and groups.
- Modify `src/interface/exercise-agent/exercise-agent.service.ts`: generate V2, keep valid questions, repair once, submit through the grader, map history, and print mixed PDFs.
- Modify `src/interface/exercise-agent/exercise-agent.service.spec.ts`: generation, task, submission, persistence, history, and PDF regressions.
- Modify `src/interface/context-lab/context-lab.service.spec.ts`: confirm mixed submit payloads still delegate unchanged.

Frontend repo: `/Users/liulin/Desktop/font/english/react-font`

- Modify `apps/english-world/src/server/exerciseAgent/exerciseAgent.ts`: replace choice-only duplicate API types with V2-compatible unions.
- Modify `apps/english-world/src/page/englishWorld/types/learning.ts`: expose groups, warnings, mixed questions, mixed answers, results, and attempts.
- Create `apps/english-world/src/page/englishWorld/contextLab/contextLabAnswers.ts`: answer-state conversion, answered-count logic, local draft storage, and result formatting.
- Create `apps/english-world/src/page/englishWorld/contextLab/contextLabAnswers.test.ts`: pure helper tests.
- Create `apps/english-world/src/page/englishWorld/contextLab/pastedQuestionCompatibility.ts`: deterministic preflight detection for unsupported pasted Matching tasks.
- Create `apps/english-world/src/page/englishWorld/contextLab/pastedQuestionCompatibility.test.ts`: pasted-question compatibility tests.
- Create `apps/english-world/src/page/englishWorld/contextLab/ContextLabQuestionField.tsx`: desktop field renderer for the four response types.
- Modify `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`: groups, draft lifecycle, mixed submit, confirmation, warnings, and result review.
- Modify `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`: desktop mixed-flow tests.
- Modify `apps/english-world/src/page/englishWorld/EnglishWorld.css`: desktop group, field, warning, and result styles.
- Create `apps/english-world/cypress/e2e/context-lab-mixed-question-types.cy.ts`: Web desktop browser regression.

Deferred mobile files are documented in Task 7 for future work and are not part of the current implementation or commit scope.

### Task 1: S1 - Versioned Question Contract and V1 Compatibility

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-question-contract.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-question-contract.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.types.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`

**Interfaces:**
- Produces:
  - `ExerciseResponseType`
  - `ExerciseQuestionGroup`
  - `ExerciseQuestionWithAnswer`
  - `ExerciseQuestionItem`
  - `ExerciseQuestionEnvelopeV2`
  - `parseStoredQuestionEnvelope(value, sourceWords)`
  - `normalizeGeneratedQuestionEnvelope(raw, sourceWords, limit)`
  - `stripQuestionEnvelopeAnswers(envelope)`
- Consumes: historical V1 arrays and new V2 envelopes stored as text in `articleExercise.questionsJson` and `articleExerciseTask.questionsJson`.

- [ ] **Step 1: Write failing V1/V2 contract tests**

Create `src/interface/exercise-agent/exercise-question-contract.spec.ts`:

```ts
import {
  normalizeGeneratedQuestionEnvelope,
  parseStoredQuestionEnvelope,
  stripQuestionEnvelopeAnswers,
} from './exercise-question-contract';

describe('exercise question contract', () => {
  it('converts a historical choice array to an in-memory V2 envelope', () => {
    const envelope = parseStoredQuestionEnvelope(
      JSON.stringify([
        {
          id: 'q1',
          stem: 'What is the main benefit?',
          options: ['Lower cost', 'Higher risk', 'No change', 'Less access'],
          correctIndex: 0,
          questionType: 'detail',
        },
      ]),
    );

    expect(envelope).toMatchObject({
      schemaVersion: 2,
      questions: [
        {
          id: 'q1',
          groupId: 'legacy-choice',
          responseType: 'single_choice',
          correctIndex: 0,
        },
      ],
    });
  });

  it('keeps authentic completion answers internally and strips them for learners', () => {
    const envelope = normalizeGeneratedQuestionEnvelope({
      schemaVersion: 2,
      groups: [
        {
          groupId: 'completion-1',
          title: 'Sentence Completion',
          instruction: 'Write NO MORE THAN TWO WORDS.',
          questionIds: ['q1'],
          startNumber: 1,
          endNumber: 1,
          wordLimit: 2,
        },
      ],
      questions: [
        {
          id: 'q1',
          groupId: 'completion-1',
          stem: 'The first trial used ____.',
          questionType: 'sentence_completion',
          responseType: 'text_completion',
          wordLimit: 2,
          acceptedAnswers: ['solar panels'],
        },
      ],
    });

    expect(envelope.questions).toHaveLength(1);
    expect(stripQuestionEnvelopeAnswers(envelope).questions[0]).not.toHaveProperty(
      'acceptedAnswers',
    );
  });

  it('keeps valid questions and reports invalid question ids', () => {
    const envelope = normalizeGeneratedQuestionEnvelope({
      schemaVersion: 2,
      groups: [],
      questions: [
        {
          id: 'q1',
          groupId: 'tfng-1',
          stem: 'The project started in 2018.',
          questionType: 'true_false_not_given',
          responseType: 'true_false_not_given',
          options: ['True', 'False', 'Not Given'],
          correctValue: 'True',
        },
        {
          id: 'q2',
          groupId: 'completion-1',
          stem: 'The project used ____.',
          questionType: 'summary_completion',
          responseType: 'text_completion',
          wordLimit: 2,
          acceptedAnswers: [],
        },
      ],
    });

    expect(envelope.questions.map((question) => question.id)).toEqual(['q1']);
    expect(envelope.generationWarnings).toContain(
      'q2: TEXT_ACCEPTED_ANSWERS_MISSING',
    );
  });
});
```

- [ ] **Step 2: Run the contract tests and verify RED**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-question-contract.spec.ts
```

Expected: FAIL because `exercise-question-contract.ts` does not exist.

- [ ] **Step 3: Implement the V2 discriminated unions**

Create `exercise-question-contract.ts` with these public contracts:

```ts
export type ExerciseResponseType =
  | 'single_choice'
  | 'true_false_not_given'
  | 'text_completion'
  | 'short_answer';

export type ExerciseQuestionParaphraseDistance =
  | 'direct'
  | 'light'
  | 'moderate'
  | 'substantial';

export interface ExerciseQuestionQualityAudit {
  skillFocus: string;
  evidenceParagraph: string;
  paraphraseDistance: ExerciseQuestionParaphraseDistance;
  distractorTrap: string;
}

export interface ExerciseQuestionGroup {
  groupId: string;
  title: string;
  instruction: string;
  questionIds: string[];
  startNumber: number;
  endNumber: number;
  wordLimit?: 1 | 2 | 3;
}

interface ExerciseQuestionBase {
  id: string;
  groupId: string;
  stem: string;
  questionType: string;
  responseType: ExerciseResponseType;
  targetWord?: string;
  qualityAudit?: ExerciseQuestionQualityAudit;
}

export type ExerciseQuestionWithAnswer =
  | (ExerciseQuestionBase & {
      responseType: 'single_choice';
      options: string[];
      correctIndex: number;
    })
  | (ExerciseQuestionBase & {
      responseType: 'true_false_not_given';
      options:
        | ['True', 'False', 'Not Given']
        | ['Yes', 'No', 'Not Given'];
      correctValue: 'True' | 'False' | 'Yes' | 'No' | 'Not Given';
    })
  | (ExerciseQuestionBase & {
      responseType: 'text_completion' | 'short_answer';
      wordLimit: 1 | 2 | 3;
      acceptedAnswers: string[];
      answerSource?: 'provided' | 'ai_inferred';
    });

export type ExerciseQuestionItem =
  | Omit<
      Extract<ExerciseQuestionWithAnswer, { responseType: 'single_choice' }>,
      'correctIndex' | 'qualityAudit'
    >
  | Omit<
      Extract<ExerciseQuestionWithAnswer, { responseType: 'true_false_not_given' }>,
      'correctValue' | 'qualityAudit'
    >
  | Omit<
      Extract<
        ExerciseQuestionWithAnswer,
        { responseType: 'text_completion' | 'short_answer' }
      >,
      'acceptedAnswers' | 'answerSource' | 'qualityAudit'
    >;

export interface ExerciseQuestionEnvelopeV2<TQuestion = ExerciseQuestionWithAnswer> {
  schemaVersion: 2;
  groups: ExerciseQuestionGroup[];
  questions: TQuestion[];
  generationWarnings?: string[];
}
```

Implement V1 conversion so `true_false_not_given` with legal legacy options becomes TFNG and all other historical rows become `single_choice`. Synthesize stable legacy groups and never mutate stored JSON.

- [ ] **Step 4: Route every storage read through the compatibility parser**

In `exercise-agent.service.ts`, replace direct `JSON.parse(session.questionsJson)` and array-only parsing with:

```ts
const envelope = parseStoredQuestionEnvelope(
  session.questionsJson,
  this.parseJsonStringArray(session.wordsJson),
);
const questions = envelope.questions;
```

Update `parseQuestionsWithoutAnswers()` to return `stripQuestionEnvelopeAnswers(envelope)` and update `mapTask()` to expose `groups`, `questions`, and `generationWarnings`.

- [ ] **Step 5: Run backend contract regressions**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-question-contract.spec.ts src/interface/exercise-agent/exercise-agent.service.spec.ts
pnpm build
```

Expected: PASS; historical choice fixtures still map and no answer keys appear in task detail.

- [ ] **Step 6: Commit the backend contract**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/exercise-agent/exercise-question-contract.ts src/interface/exercise-agent/exercise-question-contract.spec.ts src/interface/exercise-agent/exercise-agent.types.ts src/interface/exercise-agent/exercise-agent.service.ts
git commit -m "feat(context-lab): add versioned question contract"
```

### Task 2: S2 - Mixed Submit DTO and Deterministic Grading

**Files:**
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-answer-grader.ts`
- Create: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-answer-grader.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/dto/submit-exercise.dto.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.types.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/context-lab/context-lab.service.spec.ts`

**Interfaces:**
- Produces:
  - `ExerciseSubmittedAnswer`
  - `normalizeTextAnswer(value)`
  - `countAnswerWords(value)`
  - `gradeExerciseAnswers(questions, answers)`
- Consumes: `ExerciseQuestionWithAnswer[]` from Task 1.

- [ ] **Step 1: Write failing deterministic grader tests**

Create `exercise-answer-grader.spec.ts`:

```ts
import { gradeExerciseAnswers } from './exercise-answer-grader';
import type { ExerciseQuestionWithAnswer } from './exercise-question-contract';

const questions: ExerciseQuestionWithAnswer[] = [
  {
    id: 'q1',
    groupId: 'choice',
    stem: 'Choose one.',
    questionType: 'detail',
    responseType: 'single_choice',
    options: ['A', 'B', 'C', 'D'],
    correctIndex: 1,
  },
  {
    id: 'q2',
    groupId: 'tfng',
    stem: 'The claim is supported.',
    questionType: 'true_false_not_given',
    responseType: 'true_false_not_given',
    options: ['True', 'False', 'Not Given'],
    correctValue: 'Not Given',
  },
  {
    id: 'q3',
    groupId: 'completion',
    stem: 'The system uses ____.',
    questionType: 'summary_completion',
    responseType: 'text_completion',
    wordLimit: 2,
    acceptedAnswers: ['solar panels'],
  },
  {
    id: 'q4',
    groupId: 'short',
    stem: 'What powered the system?',
    questionType: 'short_answer',
    responseType: 'short_answer',
    wordLimit: 1,
    acceptedAnswers: ['electricity'],
  },
];

describe('gradeExerciseAnswers', () => {
  it('grades all four response types without AI', () => {
    const result = gradeExerciseAnswers(questions, [
      { questionId: 'q1', responseType: 'single_choice', selectedIndex: 1 },
      {
        questionId: 'q2',
        responseType: 'true_false_not_given',
        selectedValue: 'Not Given',
      },
      {
        questionId: 'q3',
        responseType: 'text_completion',
        text: '  SOLAR   PANELS. ',
      },
      {
        questionId: 'q4',
        responseType: 'short_answer',
        text: 'solar electricity',
      },
    ]);

    expect(result.map((item) => item.status)).toEqual([
      'correct',
      'correct',
      'correct',
      'incorrect',
    ]);
    expect(result[3].reasonCode).toBe('word_limit_exceeded');
  });

  it('marks omitted questions unanswered and rejects duplicate ids', () => {
    expect(gradeExerciseAnswers(questions, [])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ questionId: 'q1', status: 'unanswered' }),
      ]),
    );
    expect(() =>
      gradeExerciseAnswers(questions, [
        { questionId: 'q1', responseType: 'single_choice', selectedIndex: 1 },
        { questionId: 'q1', responseType: 'single_choice', selectedIndex: 1 },
      ]),
    ).toThrow('DUPLICATE_ANSWER:q1');
  });
});
```

- [ ] **Step 2: Verify grader tests fail**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-answer-grader.spec.ts
```

Expected: FAIL because the grader module does not exist.

- [ ] **Step 3: Implement answer normalization and grading**

Create `exercise-answer-grader.ts` around these signatures:

```ts
export type ExerciseSubmittedAnswer =
  | {
      questionId: string;
      responseType?: 'single_choice';
      selectedIndex: number;
    }
  | {
      questionId: string;
      responseType: 'true_false_not_given';
      selectedValue: 'True' | 'False' | 'Yes' | 'No' | 'Not Given';
    }
  | {
      questionId: string;
      responseType: 'text_completion' | 'short_answer';
      text: string;
    };

export function normalizeTextAnswer(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,;:!?]+$/u, '')
    .toLocaleLowerCase('en');
}

export function countAnswerWords(value: string) {
  const normalized = normalizeTextAnswer(value);
  return normalized ? normalized.split(/\s+/u).length : 0;
}

export function gradeExerciseAnswers(
  questions: ExerciseQuestionWithAnswer[],
  answers: ExerciseSubmittedAnswer[],
): ExerciseResultItem[] {
  // Build one answer per known question, validate its payload against the
  // stored responseType, and return a result for every stored question.
}
```

Return `status`, typed `userAnswer`, typed `correctAnswer`, and `reasonCode` without calling an AI client.
Define `ExerciseResultItem` in `exercise-agent.types.ts` as:

```ts
export interface ExerciseResultItem {
  questionId: string;
  responseType: ExerciseResponseType;
  correct: boolean;
  status: 'correct' | 'incorrect' | 'unanswered';
  userAnswer:
    | { selectedIndex: number }
    | { selectedValue: string }
    | { text: string }
    | null;
  correctAnswer:
    | { correctIndex: number }
    | { correctValue: string }
    | { acceptedAnswers: string[] };
  reasonCode?: 'word_limit_exceeded' | 'answer_mismatch';
  explanation: string;
  targetWord?: string;
}
```

The submit summary uses `results.length` as the denominator:

```ts
const score =
  results.length === 0
    ? 0
    : Math.round((correctCount / results.length) * 100);
```

- [ ] **Step 4: Broaden the DTO without breaking old clients**

Change `AnswerItemDto` to optional mutually exclusive payload fields:

```ts
export enum ExerciseResponseTypeValue {
  SINGLE_CHOICE = 'single_choice',
  TRUE_FALSE_NOT_GIVEN = 'true_false_not_given',
  TEXT_COMPLETION = 'text_completion',
  SHORT_ANSWER = 'short_answer',
}

export class AnswerItemDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsEnum(ExerciseResponseTypeValue)
  responseType?: ExerciseResponseTypeValue;

  @IsOptional()
  @IsInt()
  @Min(0)
  selectedIndex?: number;

  @IsOptional()
  @IsIn(['True', 'False', 'Yes', 'No', 'Not Given'])
  selectedValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  text?: string;
}
```

Keep `responseType` optional only for historical `selectedIndex` callers. The grader must derive the authoritative type from the stored question and reject an incompatible payload with a 400 response containing the `questionId`.
Add tests for an unknown `questionId`, a TFNG answer sent as `selectedIndex`,
and a text answer sent to a choice question; each must return a specific 400
without persisting an attempt.

- [ ] **Step 5: Replace choice-only submit grading**

In `ExerciseAgentService.submit()`:

```ts
const envelope = parseStoredQuestionEnvelope(
  session.questionsJson,
  this.parseJsonStringArray(session.wordsJson),
);
const results = gradeExerciseAnswers(envelope.questions, dto.answers);
```

Build the explanation prompt from typed user/correct answers. If explanation generation fails, preserve the deterministic results and attach a local fallback explanation. Persist the original answer union and result union in the existing JSON columns.

- [ ] **Step 6: Run submit and persistence regressions**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-answer-grader.spec.ts src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/context-lab/context-lab.service.spec.ts
pnpm build
```

Expected: PASS; legacy choice submissions and micro attribution tests remain unchanged.

- [ ] **Step 7: Commit deterministic grading**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/exercise-agent/exercise-answer-grader.ts src/interface/exercise-agent/exercise-answer-grader.spec.ts src/interface/exercise-agent/dto/submit-exercise.dto.ts src/interface/exercise-agent/exercise-agent.types.ts src/interface/exercise-agent/exercise-agent.service.ts src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/context-lab/context-lab.service.spec.ts
git commit -m "feat(context-lab): grade mixed IELTS answers"
```

### Task 3: S3 - Authentic Generation and Partial Success

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-question-contract.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/dto/exercise-task.dto.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.spec.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-question-contract.spec.ts`

**Interfaces:**
- Produces:
  - Standard AI JSON with `schemaVersion`, `groups`, and mixed `questions`.
  - `validateGeneratedEnvelope(raw): { envelope; invalidQuestions; fatalReasons }`.
  - One bounded `repairInvalidStandardQuestions(...)` call.
- Consumes: V2 contract from Task 1.

- [ ] **Step 1: Replace old gate tests with authentic generation tests**

Add service tests that assert:

```ts
expect(systemPrompt).toContain('"responseType":"text_completion"');
expect(systemPrompt).toContain('"acceptedAnswers"');
expect(systemPrompt).toContain('"wordLimit"');
expect(systemPrompt).not.toContain('adapted to the current multiple-choice contract');
expect(userPrompt).toContain(
  '3 single_choice, 3 true_false_not_given, 4 text_completion, and 3 short_answer',
);
```

Add a partial-success test using 11 valid questions and 2 invalid questions:

```ts
expect(savedEnvelope.questions).toHaveLength(11);
expect(savedEnvelope.generationWarnings).toEqual(
  expect.arrayContaining([
    expect.stringContaining('q12:'),
    expect.stringContaining('q13:'),
  ]),
);
expect(taskUpdate.status).toBe('succeeded');
```

Add a zero-valid-question test:

```ts
expect(taskUpdate.status).toBe('failed');
expect(taskUpdate.errorMessage).toContain('NO_VALID_QUESTIONS');
```

- [ ] **Step 2: Verify generation tests fail**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/exercise-agent/exercise-question-contract.spec.ts
```

Expected: FAIL because prompts and validation still require choice-only fields and exact pack-wide gates.

- [ ] **Step 3: Define the standard mixed JSON prompt**

Keep `MICRO_GEN_SYSTEM` unchanged. Replace only the standard and pasted generation instructions with a schema example shaped like:

```json
{
  "schemaVersion": 2,
  "groups": [
    {
      "groupId": "completion-1",
      "title": "Summary Completion",
      "instruction": "Write NO MORE THAN TWO WORDS from the passage.",
      "questionIds": ["q7", "q8", "q9", "q10"],
      "startNumber": 7,
      "endNumber": 10,
      "wordLimit": 2
    }
  ],
  "questions": [
    {
      "id": "q7",
      "groupId": "completion-1",
      "stem": "The early system depended on ____.",
      "questionType": "summary_completion",
      "responseType": "text_completion",
      "wordLimit": 2,
      "acceptedAnswers": ["manual labour"],
      "qualityAudit": {
        "skillFocus": "summary_completion",
        "evidenceParagraph": "Paragraph 3",
        "paraphraseDistance": "moderate",
        "distractorTrap": "nearby technology term"
      }
    }
  ]
}
```

Require text answers to occur in the passage and prohibit newly generated matching types. Keep the existing IELTS band, target-word, evidence, paraphrase-distance, and distractor guidance.
For pasted `parse` mode, preserve `answerSource: "provided"` when an answer is
present in the pasted material and set `answerSource: "ai_inferred"` when the
model derives a missing answer from the passage.

- [ ] **Step 4: Convert pack-wide blocking gates into warnings**

For standard and pasted exercises:

```ts
const normalized = normalizeGeneratedQuestionEnvelope(raw, words, targetCount);
const fatalReasons = [
  !article.trim() ? 'ARTICLE_EMPTY' : '',
  normalized.questions.length === 0 ? 'NO_VALID_QUESTIONS' : '',
].filter(Boolean);
```

Keep question count, type mix, band floors, quality-audit gaps, and invalid individual questions in `generationWarnings`. Preserve the current strict fatal validation path for `micro`.

- [ ] **Step 5: Add one bounded repair pass**

Call the selected model once with:

```ts
const repairPrompt = JSON.stringify({
  article,
  requiredQuestionNumbers: invalidQuestionNumbers,
  validationReasons,
  allowedResponseTypes: [
    'single_choice',
    'true_false_not_given',
    'text_completion',
    'short_answer',
  ],
  instruction:
    'Return only replacement groups and replacement questions. Do not rewrite the article or valid questions.',
});
```

Merge repaired questions by ID, normalize again, and stop after this single attempt. Never turn a remaining invalid question into a fake choice question.

- [ ] **Step 6: Save V2 only for full standard and pasted exercises**

Store:

```ts
questionsJson: JSON.stringify({
  ...normalizedEnvelope,
  generationWarnings,
})
```

Continue storing micro questions in their current V1 array shape. Extend the webhook DTO so internal V2 callbacks can carry `groups`, `responseType`, `correctValue`, `wordLimit`, and `acceptedAnswers`.

- [ ] **Step 7: Run generation regressions**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-question-contract.spec.ts src/interface/exercise-agent/exercise-agent.service.spec.ts
pnpm build
```

Expected: PASS; standard partial packs succeed, zero-valid packs fail, and every existing micro generation and repair test remains green.

- [ ] **Step 8: Commit authentic generation**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/exercise-agent/exercise-question-contract.ts src/interface/exercise-agent/exercise-question-contract.spec.ts src/interface/exercise-agent/dto/exercise-task.dto.ts src/interface/exercise-agent/exercise-agent.service.ts src/interface/exercise-agent/exercise-agent.service.spec.ts
git commit -m "feat(context-lab): generate authentic IELTS question types"
```

### Task 4: S4 - Safe API Mapping, Attempts, and Mixed PDF

**Files:**
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.types.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.ts`
- Modify: `/Users/liulin/Desktop/font/english/nestjs/src/interface/exercise-agent/exercise-agent.service.spec.ts`

**Interfaces:**
- Produces task payload fields `groups`, `questions`, and `generationWarnings`.
- Produces `targetQuestionCount` from the saved task request so partial-pack copy never assumes 13 for pasted custom counts.
- Produces typed attempt `answers` and `results`.
- Produces mixed-question student PDFs without answer leakage.

- [ ] **Step 1: Write failing mapping and PDF tests**

Add tests that assert:

```ts
expect(mappedTask.generationWarnings).toEqual([
  'q13: TEXT_ACCEPTED_ANSWERS_MISSING',
]);
expect(mappedTask.targetQuestionCount).toBe(13);
expect(mappedTask.questions[0]).not.toHaveProperty('correctValue');
expect(mappedTask.questions[1]).not.toHaveProperty('acceptedAnswers');
expect(attempt.results[1]).toMatchObject({
  responseType: 'text_completion',
  status: 'incorrect',
  userAnswer: { text: 'wind turbine' },
  correctAnswer: { acceptedAnswers: ['solar panels'] },
});
```

For PDF text extraction, assert:

```ts
expect(pdfText).toContain('Write NO MORE THAN TWO WORDS');
expect(pdfText).toContain('The first trial used ____________________');
expect(pdfText).toContain('True / False / Not Given');
expect(pdfText).not.toContain('acceptedAnswers');
```

- [ ] **Step 2: Verify mapping and PDF tests fail**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts
```

Expected: FAIL because task mapping and PDF rendering are choice-only.

- [ ] **Step 3: Map safe envelopes and typed attempt details**

Use `stripQuestionEnvelopeAnswers()` for every learner-facing task. Parse attempt JSON into typed arrays but keep malformed historical rows isolated to that attempt:

```ts
answers: this.parseExerciseAnswers(row.answersJson),
results: this.parseExerciseResults(row.resultsJson),
```

When parsing fails, return empty arrays for that attempt and keep the history list available.

- [ ] **Step 4: Render PDF by group and response type**

Branch PDF rendering:

```ts
switch (question.responseType) {
  case 'single_choice':
    writer.question(numberedStem, letteredOptions);
    break;
  case 'true_false_not_given':
    writer.question(numberedStem, []);
    break;
  case 'text_completion':
  case 'short_answer':
    writer.question(`${numberedStem} ____________________`, []);
    break;
}
```

Print each group instruction once, include the actual question count and warning notice for partial packs, and keep the student PDF answer-free.

- [ ] **Step 5: Run backend history and PDF regressions**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-agent.service.spec.ts
pnpm build
```

Expected: PASS for V1/V2 history, attempts, ownership, deletion, and existing compact PDF tests.

- [ ] **Step 6: Commit API mapping and PDF**

```bash
cd /Users/liulin/Desktop/font/english/nestjs
git add src/interface/exercise-agent/exercise-agent.types.ts src/interface/exercise-agent/exercise-agent.service.ts src/interface/exercise-agent/exercise-agent.service.spec.ts
git commit -m "feat(context-lab): expose mixed results and PDFs"
```

### Task 5: S5 - Frontend Mixed Answer Contract and Local Drafts

**Files:**
- Modify: `apps/english-world/src/server/exerciseAgent/exerciseAgent.ts`
- Modify: `apps/english-world/src/page/englishWorld/types/learning.ts`
- Create: `apps/english-world/src/page/englishWorld/contextLab/contextLabAnswers.ts`
- Create: `apps/english-world/src/page/englishWorld/contextLab/contextLabAnswers.test.ts`
- Create: `apps/english-world/src/page/englishWorld/contextLab/pastedQuestionCompatibility.ts`
- Create: `apps/english-world/src/page/englishWorld/contextLab/pastedQuestionCompatibility.test.ts`

**Interfaces:**
- Produces:
  - `ContextLabQuestion` discriminated union.
  - `ContextLabAnswer` discriminated union.
  - `ContextLabAnswerState = Record<string, ContextLabAnswerValue>`.
  - `isQuestionAnswered(question, value)`.
  - `buildSubmitAnswers(questions, state)`.
  - `loadContextLabDraft(sessionId)` / `saveContextLabDraft(sessionId, state)` / `clearContextLabDraft(sessionId)`.
  - `detectUnsupportedPastedQuestions(content)`.
- Consumes safe V2 task payloads from Task 4 and historical V1 choice tasks.

- [ ] **Step 1: Write failing answer and draft helper tests**

Create `contextLabAnswers.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import {
  buildSubmitAnswers,
  clearContextLabDraft,
  countAnsweredQuestions,
  loadContextLabDraft,
  saveContextLabDraft,
} from './contextLabAnswers';

describe('contextLabAnswers', () => {
  it('builds the mixed submit union and omits blank text', () => {
    const questions = [
      {
        id: 'q1',
        groupId: 'choice',
        stem: 'Choose one.',
        questionType: 'detail',
        responseType: 'single_choice' as const,
        options: ['A', 'B'],
      },
      {
        id: 'q2',
        groupId: 'completion',
        stem: 'Complete it.',
        questionType: 'summary_completion',
        responseType: 'text_completion' as const,
        wordLimit: 2 as const,
      },
    ];

    const state = {
      q1: { selectedIndex: 1 },
      q2: { text: ' solar panels ' },
    };

    expect(buildSubmitAnswers(questions, state)).toEqual([
      { questionId: 'q1', responseType: 'single_choice', selectedIndex: 1 },
      {
        questionId: 'q2',
        responseType: 'text_completion',
        text: ' solar panels ',
      },
    ]);
    expect(countAnsweredQuestions(questions, state)).toBe(2);
  });

  it('stores drafts by session and clears only the submitted session', () => {
    const storage = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    });

    saveContextLabDraft(88, { q1: { selectedValue: 'True' } });
    expect(loadContextLabDraft(88)).toEqual({
      q1: { selectedValue: 'True' },
    });
    clearContextLabDraft(88);
    expect(loadContextLabDraft(88)).toEqual({});
  });
});
```

- [ ] **Step 2: Verify helper tests fail**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/contextLabAnswers.test.ts
```

Expected: FAIL because the helper module does not exist.

- [ ] **Step 3: Replace choice-only frontend types**

Define:

```ts
export type ContextLabAnswerValue =
  | { selectedIndex: number }
  | { selectedValue: 'True' | 'False' | 'Yes' | 'No' | 'Not Given' }
  | { text: string };

export type ContextLabAnswer =
  | { questionId: string; responseType: 'single_choice'; selectedIndex: number }
  | {
      questionId: string;
      responseType: 'true_false_not_given';
      selectedValue: 'True' | 'False' | 'Yes' | 'No' | 'Not Given';
    }
  | {
      questionId: string;
      responseType: 'text_completion' | 'short_answer';
      text: string;
    };
```

Mirror the safe question union and result union from the backend. Treat a question with missing `responseType` and an `options` array as a legacy `single_choice`.

- [ ] **Step 4: Implement pure answer and draft helpers**

Use the storage key:

```ts
const getDraftKey = (sessionId: number) =>
  `context-lab:draft:v2:${sessionId}`;
```

Validate parsed draft values before returning them. A choice is answered when its index is an integer, TFNG when its value belongs to the question options, and text when `text.trim()` is non-empty.

- [ ] **Step 5: Add pasted-question compatibility preflight**

Create `pastedQuestionCompatibility.ts`:

```ts
export type UnsupportedPastedQuestion = {
  questionNumber?: number;
  questionType:
    | 'matching_headings'
    | 'matching_information'
    | 'matching_features';
  reason: string;
};

export function detectUnsupportedPastedQuestions(
  content: string,
): UnsupportedPastedQuestion[] {
  const lines = String(content ?? '').split(/\r?\n/);
  return lines.flatMap((line) => {
    const normalized = line.toLocaleLowerCase('en');
    const questionNumber = Number(line.match(/\b(\d{1,2})\b/)?.[1]) || undefined;
    if (/matching headings|match each heading/.test(normalized)) {
      return [{
        questionNumber,
        questionType: 'matching_headings' as const,
        reason: '第一期暂不支持 Matching Headings 批量匹配',
      }];
    }
    if (/matching information|which paragraph contains/.test(normalized)) {
      return [{
        questionNumber,
        questionType: 'matching_information' as const,
        reason: '第一期暂不支持 Matching Information 批量匹配',
      }];
    }
    if (/matching features|match each statement with/.test(normalized)) {
      return [{
        questionNumber,
        questionType: 'matching_features' as const,
        reason: '第一期暂不支持 Matching Features 批量匹配',
      }];
    }
    return [];
  });
}
```

Test explicit headings, information, and features instructions, question-number extraction, and a normal TFNG/summary paste that returns an empty list.

- [ ] **Step 6: Run frontend helper tests and type build**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/contextLabAnswers.test.ts src/page/englishWorld/contextLab/pastedQuestionCompatibility.test.ts
pnpm --filter @font/english-world build
```

Expected: PASS with no duplicate choice-only API type errors.

- [ ] **Step 7: Commit the frontend contract**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/server/exerciseAgent/exerciseAgent.ts apps/english-world/src/page/englishWorld/types/learning.ts apps/english-world/src/page/englishWorld/contextLab/contextLabAnswers.ts apps/english-world/src/page/englishWorld/contextLab/contextLabAnswers.test.ts apps/english-world/src/page/englishWorld/contextLab/pastedQuestionCompatibility.ts apps/english-world/src/page/englishWorld/contextLab/pastedQuestionCompatibility.test.ts
git commit -m "feat(context-lab): add mixed answer state"
```

### Task 6: S6 - Desktop Mixed Question Experience

**Files:**
- Create: `apps/english-world/src/page/englishWorld/contextLab/ContextLabQuestionField.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx`
- Modify: `apps/english-world/src/page/englishWorld/EnglishWorld.css`

**Interfaces:**
- Consumes `ContextLabQuestion`, `ContextLabAnswerValue`, and typed result data from Task 5.
- Produces `onChange(value: ContextLabAnswerValue)` and a shared result display contract.

- [ ] **Step 1: Write failing desktop interaction tests**

Add a succeeded mixed task fixture and assert:

```ts
expect(screen.getByRole('radio', { name: 'True' })).toBeInTheDocument();
expect(screen.queryByText('A. True')).not.toBeInTheDocument();
expect(
  screen.getByRole('textbox', { name: '第 3 题答案，最多 2 个词' }),
).toBeInTheDocument();
expect(screen.getByText('Write NO MORE THAN TWO WORDS.')).toBeInTheDocument();
```

Answer only three of four questions, click submit, confirm the modal, and assert the request:

```ts
expect(requestMock).toHaveBeenCalledWith(
  expect.objectContaining({
    url: '/context-lab/submit',
    data: expect.objectContaining({
      answers: [
        {
          questionId: 'q1',
          responseType: 'single_choice',
          selectedIndex: 1,
        },
        {
          questionId: 'q2',
          responseType: 'true_false_not_given',
          selectedValue: 'False',
        },
        {
          questionId: 'q3',
          responseType: 'text_completion',
          text: 'solar panels',
        },
      ],
    }),
  }),
);
```

Also test draft restoration and draft clearing after a successful submit.

- [ ] **Step 2: Verify desktop tests fail**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/ContextLabPage.test.tsx
```

Expected: FAIL because the page always renders `Radio.Group`, blocks incomplete submission, and has no V2 draft.

- [ ] **Step 3: Implement the desktop field renderer**

Create `ContextLabQuestionField.tsx` with this branch:

```tsx
switch (question.responseType) {
  case 'single_choice':
    return <Radio.Group options={letteredOptions} value={selectedIndex} />;
  case 'true_false_not_given':
    return <Radio.Group options={semanticOptions} value={selectedValue} />;
  case 'text_completion':
  case 'short_answer':
    return (
      <Input
        aria-label={`第 ${number} 题答案，最多 ${question.wordLimit} 个词`}
        autoCapitalize="none"
        autoComplete="off"
        spellCheck={false}
        value={text}
      />
    );
}
```

The component receives `disabled`, `result`, and `onChange`; it shows user answer, correct answer, status text, word-limit errors, and explanation after submit. Do not express correctness by color alone.

- [ ] **Step 4: Group questions and add draft lifecycle**

In `ContextLabPage.tsx`:

```ts
const sessionId = currentTask.articleExerciseId ?? currentTask.taskId;
const [answers, setAnswers] = useState<ContextLabAnswerState>({});

useEffect(() => {
  setAnswers(loadContextLabDraft(sessionId));
}, [sessionId]);

useEffect(() => {
  saveContextLabDraft(sessionId, answers);
}, [answers, sessionId]);
```

Render each group instruction once. Show `本套可练习 11/13 题` when warnings exist. Replace the current unanswered hard stop with an Ant Design confirmation modal; submit answered items only and let the backend mark omitted questions unanswered.
Use `currentTask.targetQuestionCount` rather than hard-coding 13. Clear the
session draft after successful submit and after that exercise pack is deleted.

- [ ] **Step 5: Update pasted-question controls**

Keep `auto`, `generate`, and `parse`. Limit newly selectable types to the supported first-release types. Before creating a `parse` or `auto` task, call `detectUnsupportedPastedQuestions(pastedContent)` and display each detected question number and reason. The backend prompt must also reject unsupported Matching output so a missed client preflight can never silently convert it.

- [ ] **Step 6: Add restrained desktop styles**

Add stable field dimensions, group separators, inline status text, and warning copy. Keep existing two-pane scrolling and card radius at 8px or less. Ensure text fields can display three-word answers without resizing the question list.

- [ ] **Step 7: Run desktop tests and build**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/contextLabAnswers.test.ts src/page/englishWorld/contextLab/ContextLabPage.test.tsx
pnpm --filter @font/english-world build
```

Expected: PASS for mixed rendering, submit confirmation, history review, legacy choice practice, draft restoration, and micro practice.

- [ ] **Step 8: Commit desktop mixed questions**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorld/contextLab/ContextLabQuestionField.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.tsx apps/english-world/src/page/englishWorld/contextLab/ContextLabPage.test.tsx apps/english-world/src/page/englishWorld/EnglishWorld.css
git commit -m "feat(context-lab): render mixed questions on desktop"
```

### Task 7: S7 - Mobile Mixed Question Experience (Deferred)

**Status:** Deferred by product scope. Do not execute this task, modify the files below, or include mobile tests in the current delivery. Retain this section only as future backlog context.

**Files:**
- Create: `apps/english-world/src/page/englishWorldMobile/MobileContextLabQuestionField.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/mobileContextLab.ts`
- Modify: `apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx`
- Modify: `apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css`

**Interfaces:**
- Consumes the answer helpers and task types from Task 5.
- Produces the same `ContextLabAnswerValue` changes as the desktop renderer.

- [ ] **Step 1: Write failing mobile mixed-flow tests**

Use a four-question fixture and assert:

```ts
expect(screen.getByRole('region', { name: '题目作答区' })).toBeInTheDocument();
expect(screen.queryByText('选择题')).not.toBeInTheDocument();
expect(screen.getByRole('radio', { name: 'Not Given' })).toBeInTheDocument();
expect(
  screen.getByRole('textbox', { name: '第 3 题答案，最多 2 个词' }),
).toHaveAttribute('spellcheck', 'false');
```

Submit an incomplete attempt through `Dialog.confirm`, then assert the mixed answer payload and result review.

- [ ] **Step 2: Verify mobile tests fail**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
```

Expected: FAIL because the mobile page exposes a choice-only region and numeric answer state.

- [ ] **Step 3: Implement the mobile field renderer**

Use Ant Design Mobile controls:

```tsx
if (
  question.responseType === 'text_completion' ||
  question.responseType === 'short_answer'
) {
  return (
    <Input
      aria-label={`第 ${number} 题答案，最多 ${question.wordLimit} 个词`}
      autoCapitalize="none"
      autoComplete="off"
      clearable
      disabled={disabled}
      spellCheck={false}
      value={text}
    />
  );
}
```

Use semantic radio labels for TFNG, lettered options only for `single_choice`, and a plain result block for user answer, correct answer, reason, and explanation.

- [ ] **Step 4: Replace mobile numeric state and choice-only copy**

Change:

```ts
const [answers, setAnswers] = useState<ContextLabAnswerState>({});
```

Use shared answered-count, submit, draft, and clear helpers. Rename `aria-label="选择题作答区"` to `aria-label="题目作答区"` and heading `选择题` to `题目`.
Clear the active session draft after successful submit and after deleting that exercise pack.

- [ ] **Step 5: Protect keyboard and fixed-submit layout**

Set mobile text inputs to at least 16px, keep controls at least 44px high, reserve bottom space for the fixed submit bar, and ensure the focused input and inline word-limit message are not hidden by the software keyboard.

- [ ] **Step 6: Run mobile tests and build**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorldMobile/mobileContextLab.test.ts src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx
pnpm --filter @font/english-world build
```

Expected: PASS for mobile generation, SSE refresh, mixed submit, attempts, vocabulary marking, and legacy tasks.

- [ ] **Step 7: Commit mobile mixed questions**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/src/page/englishWorldMobile/MobileContextLabQuestionField.tsx apps/english-world/src/page/englishWorldMobile/mobileContextLab.ts apps/english-world/src/page/englishWorldMobile/MobileContextLabPage.tsx apps/english-world/src/page/englishWorldMobile/ExerciseAgentTabMobile.test.tsx apps/english-world/src/page/englishWorldMobile/EnglishWorldMobile.css
git commit -m "feat(context-lab): render mixed questions on mobile"
```

### Task 8: S8 - Cross-Repository Regression and Browser Acceptance

**Files:**
- Create: `apps/english-world/cypress/e2e/context-lab-mixed-question-types.cy.ts`
- Modify only files exposed by failures from active Tasks 1-6.

**Interfaces:**
- Consumes the deployed API contract from Tasks 1-4 and Web UI behavior from Tasks 5-6.
- Produces a repeatable Web desktop acceptance test.

- [ ] **Step 1: Add a mixed-question Cypress fixture**

Intercept task history/detail and submit. Return a safe task with all four response types and a result payload containing correct, incorrect, unanswered, and `word_limit_exceeded` outcomes.

```ts
cy.intercept('POST', '**/context-lab/submit', (request) => {
  expect(request.body.answers).to.deep.equal([
    { questionId: 'q1', responseType: 'single_choice', selectedIndex: 1 },
    {
      questionId: 'q2',
      responseType: 'true_false_not_given',
      selectedValue: 'False',
    },
    {
      questionId: 'q3',
      responseType: 'text_completion',
      text: 'solar panels',
    },
  ]);
  request.reply({ code: 200, message: 'ok', data: mixedSubmitResult });
}).as('mixedSubmit');
```

- [ ] **Step 2: Assert Web desktop viewport behavior**

Test:

```ts
[
  { route: '/englishWorld/context-lab', width: 1280, height: 720 },
  { route: '/englishWorld/context-lab', width: 1440, height: 900 },
  { route: '/englishWorld/context-lab', width: 1920, height: 1080 },
].forEach(({ route, width, height }) => {
  cy.viewport(width, height);
  cy.visit(route);
  cy.document().then((document) => {
    expect(document.documentElement.scrollWidth).to.be.at.most(
      document.documentElement.clientWidth,
    );
  });
});
```

Assert that TFNG has no A/B/C prefix, text fields retain values after reopening the same task, warning text does not block practice, and successful submit clears the draft.

- [ ] **Step 3: Run all focused backend checks**

Run:

```bash
cd /Users/liulin/Desktop/font/english/nestjs
pnpm test --runInBand src/interface/exercise-agent/exercise-question-contract.spec.ts src/interface/exercise-agent/exercise-answer-grader.spec.ts src/interface/exercise-agent/exercise-agent.service.spec.ts src/interface/context-lab/context-lab.service.spec.ts
pnpm build
```

Expected: PASS.

- [ ] **Step 4: Run all focused frontend checks**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world test -- --run src/page/englishWorld/contextLab/contextLabAnswers.test.ts src/page/englishWorld/contextLab/ContextLabPage.test.tsx
pnpm --filter @font/english-world build
```

Expected: PASS.

- [ ] **Step 5: Run browser acceptance**

Run:

```bash
cd /Users/liulin/Desktop/font/english/react-font
pnpm --filter @font/english-world cypress:ensure
cd apps/english-world
pnpm exec start-server-and-test "vite --host 127.0.0.1 --port 5175 --strictPort" http://127.0.0.1:5175 "cypress run --spec cypress/e2e/context-lab-mixed-question-types.cy.ts"
```

Expected: PASS at all three Web desktop viewports with no whole-page horizontal overflow or hidden submit controls.

- [ ] **Step 6: Manually verify a real local generation**

Start backend and frontend on free local ports, generate one Band 7 standard pack, and verify:

- The task succeeds when at least one valid question exists.
- A fully valid pack contains all four response types.
- Correct answers are absent from pre-submit network responses.
- Submission correctness is unchanged when explanation generation is unavailable.
- A historical V1 choice pack still opens and submits.
- A micro pack still generates three four-option questions.

- [ ] **Step 7: Commit the browser regression**

```bash
cd /Users/liulin/Desktop/font/english/react-font
git add apps/english-world/cypress/e2e/context-lab-mixed-question-types.cy.ts
git commit -m "test(context-lab): cover mixed IELTS question flow"
```

## Story Acceptance Summary

### S1: Old and New Packs Open Safely

- Given a historical V1 choice pack, when it is opened, then it renders and submits without a database rewrite.
- Given a V2 pack, when task detail or history is requested, then groups and safe questions are returned without correct answers.
- Given malformed data in one historical attempt, when history loads, then other attempts remain available.

### S2: Mixed Answers Are Scored Predictably

- All four answer payloads are validated against the stored question type.
- Blank omitted questions are marked `unanswered`.
- Text normalization and word-limit behavior are reproducible in unit tests.
- AI explanation failure cannot change correctness or prevent attempt persistence.

### S3: Authentic IELTS Questions Are Generated

- Standard full generation targets the approved 3/3/4/3 mix.
- Text answers are passage-derived and newly generated matching questions are excluded.
- One repair attempt targets invalid questions only.
- A non-empty article with at least one valid question succeeds with warnings; zero valid questions fails.
- Micro generation behavior does not change.

### S4: Results and Printouts Stay Trustworthy

- Task payloads never leak answers before submission.
- Attempt history displays typed user and correct answers.
- PDF instructions and answer spaces match each response type.
- Partial packs display and score against their actual question count.

### S5: One Stable Web Client Contract

- Web desktop uses one answer union and one answered-count rule.
- Local drafts are scoped by session and validated during restore.
- Successful submission or task deletion clears only the relevant draft.

### S6: Desktop Mixed Practice

- TFNG uses semantic labels without A/B/C.
- Completion and short answer use accessible single-line fields with limits.
- Incomplete submission requires confirmation but remains allowed.
- Results include user answer, correct answer, status, reason, and explanation.

### S7: Mobile Mixed Practice

- Deferred; no mobile files are modified in the current phase.

### S8: Regression Confidence

- Focused Jest and Vitest suites pass.
- Backend and frontend builds pass.
- Cypress covers the Web desktop mixed workflow at 1280x720, 1440x900, and 1920x1080.
- Existing V1, micro, history, deletion, vocabulary marking, SSE, and PDF behaviors remain green.
