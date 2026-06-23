# Context Lab Practice Records Design

Date: 2026-06-23

## Problem

Context Lab currently shows generated exercise tasks, not actual practice records.
After a learner starts a generated exercise and submits answers, the result review is returned to the UI, but the submission itself is not persisted as a browsable practice record. This makes it hard to review past attempts, compare progress, or clean up old practice data.

The current delete gap is also product-visible: generated tasks can accumulate in the task list, but there is no user-facing way to remove a generated package or a submitted attempt.

## Goals

- Persist every Context Lab answer submission as a practice attempt.
- Let users view attempt history for each generated exercise package.
- Let users delete generated packages and individual attempts.
- Use hard delete, not soft delete. Deleted records are not recoverable.
- Keep all access scoped by the current authenticated user.
- Preserve the existing generate, start practice, submit, PDF download, and result review flow.

## Non-Goals

- No analytics dashboard in this slice.
- No cross-device conflict recovery for deleted records.
- No attempt sharing, export, or restore bin.
- No redesign of the generated article workspace beyond entry points for records.

## Product Model

Context Lab will have two explicit concepts:

1. **Exercise Package**
   A generated article and questions set. It can be pending, processing, succeeded, or failed.

2. **Practice Attempt**
   A single submitted answer run against an exercise package. One package can have multiple attempts.

The current right-side package list remains under the existing "生成任务" section, but each package card now includes practice-record summary data. Each package card shows:

- Generated words summary.
- Generation status.
- Practice count.
- Latest score and wrong count when attempts exist.
- Actions: start practice, view records, download PDF, delete package.

Viewing records opens a right-side drawer that lists attempts newest first. Each attempt row shows:

- Score.
- Correct and wrong counts.
- Submitted time.
- Weak words.
- Actions: view detail, delete attempt.

The detail view shows the original question result review: selected answer, correct answer, explanation, score, weak words, and next suggestions.

## Delete Behavior

Deletion is hard delete.

Deleting an individual attempt permanently removes that attempt row.

Deleting an exercise package permanently removes:

- All attempts for the package.
- The generated task row.
- The linked generated exercise row when it is owned by the current user.

The UI must show a confirmation modal before deletion with clear irreversible language:

- Attempt deletion: "删除后不可恢复，本次练习记录将永久移除。"
- Package deletion: "删除后不可恢复，本练习包及其所有练习记录将永久移除。"

The backend must verify ownership before deleting. A user can only delete their own package or attempt. Repeated deletion or deleting another user's data returns a clear not-found/permission-safe error.

## Backend Design

Add a new table:

```sql
article_exercise_attempt
```

Fields:

- `id`
- `user_id`
- `task_id`
- `article_exercise_id`
- `answers_json`
- `results_json`
- `score`
- `correct_count`
- `wrong_count`
- `weak_words_json`
- `next_suggestions_json`
- `elapsed_seconds`
- `create_time`

Indexes:

- `(user_id, create_time)`
- `(task_id, create_time)`
- `(article_exercise_id)`

The existing `submit` flow should:

1. Validate the exercise belongs to the current user.
2. Grade answers and produce the existing submit summary.
3. Persist an attempt row.
4. Return the same result review shape plus `attemptId`.

New or extended Context Lab endpoints:

- `POST /context-lab/attempt-history`
  Lists attempts for a `taskId` or `articleExerciseId`, scoped to current user.

- `POST /context-lab/attempt-detail`
  Returns one attempt detail, scoped to current user.

- `POST /context-lab/delete-attempt`
  Hard deletes one attempt, scoped to current user.

- `POST /context-lab/delete-task`
  Hard deletes a generated package, all attempts under it, and the linked generated exercise row when owned by the current user.

The existing `POST /context-lab/history` response should include package-level attempt summary fields so the frontend can render cards without calling attempt history for every package:

- `attemptCount`
- `latestAttemptId`
- `latestScore`
- `latestWrongCount`
- `latestAttemptTime`

## Frontend Design

Update Context Lab data types:

- `ContextLabAttempt`
- `ContextLabAttemptHistoryParams`
- `ContextLabAttemptHistoryResponse`
- delete request/response types.

Update `server/learning.ts` with request builders for the new endpoints.

Update `ContextLabPage`:

- Keep the existing "生成任务" section shell, but enrich each task card with practice-record summary data.
- Show package-level latest attempt summary on each package card.
- Add "查看记录" action for succeeded packages.
- Add "删除练习包" and "删除记录" actions for packages and attempts.
- Add a right-side drawer for attempt history.
- Refresh package history after submit, attempt delete, and package delete.
- Store `attemptId` from submit result in state when available.

Failure and empty states:

- No packages: "还没有生成记录。先提交一组词。"
- Package has no attempts: "还没有提交记录，开始练习后会出现在这里。"
- Deleted package disappears from the list.
- Deleted attempt disappears from the record drawer.

## QA Plan

Backend unit tests:

- Submit creates an attempt row with score, wrong count, answers, results, weak words, and suggestions.
- Attempt history is scoped by `userId`.
- Attempt detail is scoped by `userId`.
- Delete attempt removes only the owned attempt.
- Delete task removes the owned task and its attempts.
- Deleting another user's task or attempt fails safely.

Frontend tests:

- Context Lab displays latest attempt summary on a package card.
- Submitting answers refreshes records and keeps showing result review.
- User can open the attempt history drawer.
- User can delete an attempt after confirmation.
- User can delete a package after confirmation.
- Empty and failed package states remain usable.

Integration/E2E target:

- Generate or seed one succeeded Context Lab package.
- Start practice, submit answers, see attempt record.
- Open record detail.
- Delete attempt, verify it disappears.
- Delete package, verify package disappears.

## Implementation Decisions

- Hard delete is confirmed for this slice.
- Attempt elapsed time should be sent from the frontend when available. If not available, backend stores `0` or `null`.
- If an old package has no attempts, it remains startable and downloadable.
