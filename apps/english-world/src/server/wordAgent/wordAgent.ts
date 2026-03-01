import { YTRequest } from "@font/api";

/**
 * 单词 Agent 接口（DeepSeek）
 * POST /word-agent/query
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
