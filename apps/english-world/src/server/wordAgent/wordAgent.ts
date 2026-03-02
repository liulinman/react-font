import { YTRequest } from "@font/api";

/**
 * 单词 Agent 接口（DeepSeek）
 * - 普通查询: POST /word-agent/query
 * - 流式查询: POST /word-agent/query-stream（推荐多词时使用）
 * 请求体二选一: word（字符串，可逗号/空格分隔）或 words（字符串数组）
 */
export interface ExampleItem {
  en: string;
  zh: string;
}

export interface IeltsCase {
  source: string;
  question: string;
  questionZh?: string;
  sentence: string;
  sentenceZh?: string;
}

export interface WordAgentItem {
  word: string;
  phonetic: string;
  meaning: string;
  examples: ExampleItem[];
  ieltsCase: IeltsCase | null;
}

export interface WordAgentResponse {
  words: WordAgentItem[];
}

export const wordAgentQuery = (params: {
  word?: string;
  words?: string[];
}): YTRequest<WordAgentResponse> => {
  return {
    url: "/word-agent/query",
    method: "POST",
    data: params,
    __responseType: undefined as unknown as WordAgentResponse,
  };
};
