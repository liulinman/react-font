import { examOptionLabel, isTextQuestion, type ExamResult, type ExamTask } from "./examWorkspace.types";

export type ExamAnnotation = {
  kind?: "highlight" | "note";
  id: string;
  block: string;
  start: number;
  end: number;
  text: string;
  note: string;
};
export type ExamDraft = {
  version: 1;
  content: string;
  startedAt: number | null;
  deadline: number | null;
  endedAt: number | null;
  answers: Record<string, number | string>;
  review: string[];
  annotations: ExamAnnotation[];
  result: ExamResult | null;
};
export const examQuestionId = (task: ExamTask, index: number) =>
  task.questions?.[index]?.id || `q-${index}`;
export const examStorageKey = (userId: number, taskId: number, namespace = "context-lab") =>
  `${namespace}:ielts-exam:v1:${userId}:${taskId}`;
export function newExamDraft(task: ExamTask): ExamDraft {
  return {
    version: 1,
    content: JSON.stringify([
      task.articleExerciseId,
      task.article,
      task.questions,
    ]),
    startedAt: null,
    deadline: null,
    endedAt: null,
    answers: {},
    review: [],
    annotations: [],
    result: null,
  };
}
export function restoreExamDraft(
  raw: string | null,
  task: ExamTask,
): ExamDraft {
  const fresh = newExamDraft(task);
  if (!raw) return fresh;
  try {
    const value = JSON.parse(raw) as ExamDraft;
    if (
      value.version !== 1 ||
      value.content !== fresh.content ||
      !value.answers ||
      !Array.isArray(value.review) ||
      !Array.isArray(value.annotations)
    )
      return fresh;
    if (
      value.startedAt !== null &&
      (!Number.isFinite(value.startedAt) ||
        !Number.isFinite(value.deadline) ||
        value.deadline! <= value.startedAt)
    )
      return fresh;
    if (value.startedAt === null && value.deadline !== null) return fresh;
    if (
      value.endedAt !== null &&
      (!Number.isFinite(value.endedAt) ||
        value.startedAt === null ||
        value.endedAt < value.startedAt ||
        value.endedAt > value.deadline!)
    )
      return fresh;
    const answers: Record<string, number | string> = {};
    const ids = (task.questions ?? []).map((q, i) => {
      const id = examQuestionId(task, i);
      const answer = value.answers[id];
      if (isTextQuestion(q) ? typeof answer === "string" : typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < q.options.length)
        answers[id] = answer;
      return id;
    });
    const annotations = value.annotations.filter((a) => {
      if (
        !a ||
        typeof a.id !== "string" ||
        typeof a.text !== "string" ||
        typeof a.note !== "string"
      )
        return false;
      const optionBlocks = task.questions?.flatMap((question, index) =>
        question.options.map((_, optionIndex) => ({
          id: `${ids[index]}:option:${optionIndex}`,
          text: examOptionLabel(question, optionIndex),
        })),
      );
      const block = a.block === "article"
        ? task.article
        : task.questions?.[ids.indexOf(a.block)]?.stem
          ?? optionBlocks?.find(option => option.id === a.block)?.text;
      return (
        typeof block === "string" &&
        Number.isInteger(a.start) &&
        Number.isInteger(a.end) &&
        a.start >= 0 &&
        a.end > a.start &&
        block.slice(a.start, a.end) === a.text
      );
    });
    const result =
      value.result &&
      Array.isArray(value.result.results) &&
      Number.isFinite(value.result.correctCount) &&
      value.endedAt !== null
        ? value.result
        : null;
    return {
      ...value,
      answers,
      review: value.review.filter((id) => ids.includes(id)),
      annotations,
      result,
    };
  } catch {
    return fresh;
  }
}
export function examRemainingSeconds(draft: ExamDraft, now: number) {
  return draft.deadline === null
    ? 1200
    : Math.max(0, Math.ceil((draft.deadline - (draft.endedAt ?? now)) / 1000));
}
export function examElapsedSeconds(draft: ExamDraft, now: number) {
  if (draft.startedAt === null || draft.deadline === null) return 0;
  return Math.max(
    0,
    Math.floor(
      (Math.min(draft.endedAt ?? now, draft.deadline) - draft.startedAt) / 1000,
    ),
  );
}
