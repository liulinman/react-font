import type { YTRequest } from "@font/api";

/** 生成练习：题目项 */
export interface ExerciseQuestion {
  id: string;
  stem: string;
  options: string[];
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
}

/** 生成练习请求：随机 */
export interface ExerciseGenerateRandom {
  sourceType: "random";
  count?: number;
}

/** 生成练习请求：自定义单词 */
export interface ExerciseGenerateCustom {
  sourceType: "custom";
  words: string[];
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
