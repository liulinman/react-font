/** Shared exam presentation contract, independent of the exercise source. */
export type ExamQuestion = {
  id: string;
  stem: string;
  options: string[];
  kind?: string;
  maxWords?: number;
  instructions?: string;
};
export type ExamTask = {
  taskId: number;
  title?: string;
  articleExerciseId?: number;
  article?: string;
  articleOmissions?: Array<{start:number;end:number}>;
  questions?: ExamQuestion[];
};
export type ExamSubmission = {
  sessionId: number;
  elapsedSeconds: number;
  allowUnanswered?: true;
  answers: Array<{questionId: string; selectedIndex?: number; answerText?: string; unanswered?: true}>;
};
export type ExamResult = {
  score: number | null;
  total?: number;
  correctCount: number;
  wrongCount: number;
  results: Array<{
    questionId: string;
    correct: boolean;
    voided?: boolean;
    correctIndex: number | null;
    userSelectedIndex?: number | null;
    acceptedAnswers?: string[];
    answerText?: string;
    explanation: string;
  }>;
};
export const isTextQuestion = (question: ExamQuestion) => question.kind === "sentence_completion";

export function examOptionLabel(question: ExamQuestion, index: number) {
  const option = question.options[index] ?? "";
  if (question.kind === "true_false_not_given") return option;
  if (question.kind === "matching_features" && /^[A-T][.)\s]/.test(option)) return option;
  return `${String.fromCharCode(65 + index)}. ${option.replace(/^[A-Z][.、)）]\s*/, "")}`;
}
