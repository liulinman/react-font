import type {
  StartReciteParams,
  SubmitAnswerParams,
  GetHistoryParams,
  GetStatsParams,
} from "./recite.type";

/**
 * 开始默写
 */
export const startRecite = (params?: StartReciteParams) => {
  return {
    url: "/recite/start",
    method: "POST",
    data: params || {},
  };
};

/**
 * 提交答案
 */
export const submitAnswer = (params: SubmitAnswerParams) => {
  return {
    url: "/recite/submit",
    method: "POST",
    data: params,
  };
};

/**
 * 获取默写历史记录
 */
export const getReciteHistory = (params: GetHistoryParams) => {
  return {
    url: "/recite/history",
    method: "POST",
    data: params,
  };
};

/**
 * 获取默写统计信息
 */
export const getReciteStats = (params?: GetStatsParams) => {
  return {
    url: "/recite/stats",
    method: "POST",
    data: params || {},
  };
};

// 导出类型（供外部使用）
export type {
  StartReciteParams,
  StartReciteResponse,
  SubmitAnswerParams,
  SubmitAnswerResponse,
  GetHistoryParams,
  GetHistoryResponse,
  GetStatsParams,
  GetStatsResponse,
} from "./recite.type";

export type {
  Question,
  AnswerItem,
  AnswerResult,
  Statistics,
  DirectionStat,
  HistoryItem,
} from "./recite.type";
