import { describe, expect, it } from 'vitest';
import { examElapsedSeconds, examRemainingSeconds, newExamDraft, restoreExamDraft } from './ieltsExamState';
import type { ContextLabTask } from '../types/learning';
const task: ContextLabTask = { id: 1, taskId: 1, status: 'succeeded', sourceType: 'custom', words: [], article: 'Same word. Same word.', questions: [{ id: 'q1', stem: 'Which word?', options: ['Same', 'Other'] }] };
describe('exam draft recovery', () => {
  it('rejects corrupt or different paper drafts instead of restoring stale answers', () => {
    expect(restoreExamDraft('{broken', task).startedAt).toBeNull();
    const draft = { ...newExamDraft(task), startedAt: 1000, deadline: 61000, answers: { q1: 0 } };
    expect(restoreExamDraft(JSON.stringify(draft), { ...task, article: 'A changed article' }).answers).toEqual({});
  });
  it('rejects invalid timestamps and filters invalid option indexes', () => {
    const draft = { ...newExamDraft(task), startedAt: 1000, deadline: 61000, answers: { q1: 99, missing: 0 } };
    expect(restoreExamDraft(JSON.stringify(draft), task).answers).toEqual({});
    expect(restoreExamDraft(JSON.stringify({ ...draft, deadline: 0 }), task).startedAt).toBeNull();
  });
  it('caps elapsed time at the deadline and keeps manual submission time fixed', () => {
    const draft = { ...newExamDraft(task), startedAt: 1000, deadline: 61000 };
    expect(examElapsedSeconds(draft, 121000)).toBe(60);
    expect(examRemainingSeconds(draft, 121000)).toBe(0);
    expect(examElapsedSeconds({ ...draft, endedAt: 16000 }, 121000)).toBe(15);
  });
  it('keeps an annotation tied to the selected occurrence and rejects invalid ranges', () => {
    const draft = { ...newExamDraft(task), annotations: [
      { id: 'a', block: 'article', start: 11, end: 15, text: 'Same', note: 'Second occurrence' },
      { id: 'b', block: 'article', start: -1, end: 4, text: 'Same', note: '' },
    ] };
    expect(restoreExamDraft(JSON.stringify(draft), task).annotations).toEqual([draft.annotations[0]]);
  });
});
