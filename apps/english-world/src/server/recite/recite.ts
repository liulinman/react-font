import type {
  StartReciteParams,
  SubmitAnswerParams,
  GetHistoryParams,
  GetStatsParams,
  GetReciteSessionResultParams,
} from "./recite.type";

export const startRecite = (params?: StartReciteParams) => {
  return {
    url: "/recite/start",
    method: "POST",
    data: params || {},
  };
};

export const submitAnswer = (params: SubmitAnswerParams) => {
  return {
    url: "/recite/submit",
    method: "POST",
    data: params,
  };
};

export const getReciteHistory = (params: GetHistoryParams) => {
  return {
    url: "/recite/history",
    method: "POST",
    data: params,
  };
};

export const getReciteStats = (params?: GetStatsParams) => {
  return {
    url: "/recite/stats",
    method: "POST",
    data: params || {},
  };
};

export const getReciteSessionResult = (
  params: GetReciteSessionResultParams,
) => ({
  url: "/recite/session-result",
  method: "POST",
  data: params,
});

export type {
  StartReciteParams,
  StartReciteResponse,
  SubmitAnswerParams,
  SubmitAnswerResponse,
  GetHistoryParams,
  GetHistoryResponse,
  GetStatsParams,
  GetStatsResponse,
  GetReciteSessionResultParams,
} from "./recite.type";

export type {
  Question,
  AnswerItem,
  AnswerResult,
  Statistics,
  DirectionStat,
  HistoryItem,
  ReciteSession,
  HistoryWordItem,
} from "./recite.type";
