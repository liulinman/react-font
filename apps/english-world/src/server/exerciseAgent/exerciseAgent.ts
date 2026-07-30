import type { YTRequest } from "@font/api";

export type ContextLabResponseType =
  | "single_choice"
  | "true_false_not_given"
  | "text_completion"
  | "short_answer";

export type ContextLabTfngValue =
  | "True"
  | "False"
  | "Yes"
  | "No"
  | "Not Given";

export type ContextLabQuestionGroup = {
  groupId: string;
  title: string;
  instruction: string;
  questionIds: string[];
  startNumber: number;
  endNumber: number;
  wordLimit?: 1 | 2 | 3;
};

type ContextLabQuestionBase = {
  id: string;
  groupId?: string;
  stem: string;
  questionType?: string;
  targetWord?: string;
};

export type ContextLabQuestion =
  | (ContextLabQuestionBase & {
      responseType?: "single_choice";
      options: string[];
    })
  | (ContextLabQuestionBase & {
      responseType: "true_false_not_given";
      options: ["True", "False", "Not Given"] | ["Yes", "No", "Not Given"];
    })
  | (ContextLabQuestionBase & {
      responseType: "text_completion";
      wordLimit: 1 | 2 | 3;
    })
  | (ContextLabQuestionBase & {
      responseType: "short_answer";
      wordLimit: 1 | 2 | 3;
    });

export type ContextLabAnswerValue =
  | { selectedIndex: number }
  | { selectedValue: ContextLabTfngValue }
  | { text: string };

export type ContextLabAnswer =
  | {
      questionId: string;
      responseType: "single_choice";
      selectedIndex: number;
    }
  | {
      questionId: string;
      responseType: "true_false_not_given";
      selectedValue: ContextLabTfngValue;
    }
  | {
      questionId: string;
      responseType: "text_completion";
      text: string;
    }
  | {
      questionId: string;
      responseType: "short_answer";
      text: string;
    };

type ContextLabResultBase = {
  questionId: string;
  responseType: ContextLabResponseType;
  correct: boolean;
  status: "correct" | "incorrect" | "unanswered";
  explanation: string;
  targetWord?: string;
  reasonCode?: "word_limit_exceeded" | "answer_mismatch";
};

export type ContextLabAttemptResult =
  | (ContextLabResultBase & {
      responseType: "single_choice";
      userAnswer: { selectedIndex: number } | null;
      correctAnswer: { correctIndex: number };
    })
  | (ContextLabResultBase & {
      responseType: "true_false_not_given";
      userAnswer: { selectedValue: ContextLabTfngValue } | null;
      correctAnswer: { correctValue: ContextLabTfngValue };
    })
  | (ContextLabResultBase & {
      responseType: "text_completion" | "short_answer";
      userAnswer: { text: string } | null;
      correctAnswer: { acceptedAnswers: string[] };
    })
  | {
      questionId: string;
      correct: boolean;
      explanation?: string;
    };

/** 生成练习：题目项 */
export interface ExerciseQuestion {
  id: string;
  stem: string;
  options: string[];
  questionType?: string;
  targetWord?: string;
}

/** 生成练习响应 */
export interface ExerciseGenerateResponse {
  sessionId: number;
  article: string;
  words: string[];
  questions: ExerciseQuestion[];
}

/** 生成练习请求：按熟练度 */
export interface ExerciseGenerateProficiency {
  sourceType: "proficiency";
  proficiencyLevels: number[];
  count?: number;
  ieltsBand?: number;
}

/** 生成练习请求：随机 */
export interface ExerciseGenerateRandom {
  sourceType: "random";
  count?: number;
  ieltsBand?: number;
}

/** 生成练习请求：自定义单词 */
export interface ExerciseGenerateCustom {
  sourceType: "custom";
  words: string[];
  mode?: "standard" | "micro";
  reciteSessionId?: number;
  ieltsBand?: number;
}

export type ExerciseGenerateParams =
  | ExerciseGenerateProficiency
  | ExerciseGenerateRandom
  | ExerciseGenerateCustom;

/** 提交答案：单题 */
export interface ExerciseAnswerItem {
  questionId: string;
  selectedIndex: number;
}

/** 提交答案响应：单题结果 */
export interface ExerciseResultItem {
  questionId: string;
  correct: boolean;
  correctIndex: number;
  userSelectedIndex: number;
  explanation: string;
  targetWord?: string;
}

export interface ExerciseSubmitResponse {
  results: ExerciseResultItem[];
}

export const exerciseGenerate = (
  data: ExerciseGenerateParams
): YTRequest<ExerciseGenerateResponse> => ({
  url: "/exercise-agent/generate",
  method: "POST",
  data,
  __responseType: undefined as unknown as ExerciseGenerateResponse,
});

export const exerciseSubmit = (data: {
  sessionId: number;
  answers: ExerciseAnswerItem[];
}): YTRequest<ExerciseSubmitResponse> => ({
  url: "/exercise-agent/submit",
  method: "POST",
  data,
  __responseType: undefined as unknown as ExerciseSubmitResponse,
});
