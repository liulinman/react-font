import { message } from "antd";
import axios, { AxiosRequestConfig } from "axios";
import {
  useQuery,
  useMutation as _useMutation,
  UseQueryOptions,
  UseMutationOptions,
  QueryKey,
} from "@tanstack/react-query";

// 定义 YTRequest 类型，支持泛型
export interface YTRequest<T = unknown> {
  url: string;
  data?: unknown;
  config?: AxiosRequestConfig;
  method: string;
  // 内部使用，用于类型推导
  __responseType?: T;
}

const API_BASE = process.env.NODE_ENV === "development" ? "/api" : "http://47.108.140.63:3001";

/** 供 fetch 等非 axios 请求使用（如 SSE 流式接口） */
export const getApiBaseUrl = () => API_BASE;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

/** 相同错误文案在短时间只提示一次，避免「未登录」等重复弹窗 */
const DEDUP_SEC = 2;
let lastErrorMsg: string | null = null;
let lastErrorTime = 0;
function showErrorOnce(msg: string) {
  const now = Date.now();
  if (msg && msg === lastErrorMsg && now - lastErrorTime < DEDUP_SEC * 1000) return;
  lastErrorMsg = msg;
  lastErrorTime = now;
  message.error(msg || "请求失败");
}

// 添加响应拦截器
api.interceptors.response.use(
  (response) => {
    // 如果请求成功，检查业务状态码
    const { code, message: msg, data } = response.data;
    if (code === 200) {
      // 业务成功，返回 data 部分
      return { ...response, data: data !== undefined ? data : response.data };
    } else {
      // 业务失败，抛出错误
      showErrorOnce(msg || "请求失败");
      return Promise.reject({
        code,
        message: msg,
        data: null,
      });
    }
  },
  (error) => {
    console.log(error);

    // 处理 CORS 错误
    if (error.code === "ERR_NETWORK" || error.message?.includes("CORS") || !error.response) {
      // CORS 错误或网络错误，不显示错误消息（可能是后端未启动或 CORS 未配置）
      console.warn("CORS or Network Error:", error.message);
      return Promise.reject({
        code: "CORS_ERROR",
        message: "跨域请求失败，请检查后端 CORS 配置",
        data: null,
      });
    }

    const errorData = error.response?.data;
    const msg = errorData?.message ?? error.message;
    if (msg) showErrorOnce(typeof msg === "string" ? msg : String(msg));

    // 返回错误，可以根据需求抛出或处理
    return Promise.reject(errorData || error);
  },
);

// 封装请求执行函数（保留以保持向后兼容）
export const request = async <T>(ytRequest: YTRequest<T>): Promise<T> => {
  const { url, data, method, config } = ytRequest;
  try {
    let response;
    switch (method) {
      case "GET":
        response = await api.get(url, { params: data, ...config });
        break;
      case "POST":
        if (data instanceof FormData) {
          response = await api.post(url, data, {
            headers: { "Content-Type": "multipart/form-data" },
            ...config,
          });
        } else {
          response = await api.post(url, data, config);
        }
        break;
      case "PUT":
        response = await api.put(url, data, config);
        break;
      case "DELETE":
        response = await api.delete(url, { data, ...config });
        break;
      default:
        throw new Error("Unsupported method");
    }
    // response.data 已经在拦截器中处理过了，直接返回
    return response.data;
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
};

// 类型工具：从函数返回类型中提取 YTRequest 的泛型类型
type ExtractResponseType<T> = T extends YTRequest<infer R> ? R : never;

/**
 * 类型工具：创建简化的 mutation 返回类型
 * 使 mutateAsync 显示为简洁的函数类型而不是 UseMutateAsyncFunction
 */
type MutationResult<TResponse, TVariables> = Omit<
  ReturnType<typeof _useMutation<TResponse, Error, TVariables>>,
  "mutateAsync"
> & {
  mutateAsync: TVariables extends void
    ? () => Promise<TResponse>
    : (data: TVariables) => Promise<TResponse>;
};

// 使用 react-query 封装的请求函数
const fetchRequest = async <T>(ytRequest: YTRequest<T>): Promise<T> => {
  return request<T>(ytRequest);
};

// 使用 useQuery 封装的 GET 请求 Hook
export const useRequestQuery = <
  TRequest extends YTRequest<TResponse>,
  TResponse = ExtractResponseType<TRequest>,
>(
  ytRequest: TRequest | (() => TRequest),
  options?: Omit<UseQueryOptions<TResponse, Error, TResponse, QueryKey>, "queryKey" | "queryFn">,
) => {
  const requestConfig = typeof ytRequest === "function" ? ytRequest() : ytRequest;

  return useQuery<TResponse, Error>({
    queryKey: [requestConfig.url, requestConfig.data],
    queryFn: () => fetchRequest<TResponse>(requestConfig),
    ...options,
  });
};

// 使用 useMutation 封装的请求 Hook（支持 GET/POST/PUT/DELETE）
// 支持直接传入函数，类型自动推导
// 支持有参数和无参数的函数
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useMutation<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  TRequestFn extends (...args: any[]) => YTRequest<any>,
>(
  requestFn: TRequestFn,
  options?: UseMutationOptions<
    ReturnType<TRequestFn> extends YTRequest<infer R> ? R : never,
    Error,
    Parameters<TRequestFn>["length"] extends 0 ? void : Parameters<TRequestFn>[0]
  >,
) {
  type TResponse = ReturnType<TRequestFn> extends YTRequest<infer R> ? R : never;
  type TVariables = Parameters<TRequestFn>["length"] extends 0 ? void : Parameters<TRequestFn>[0];

  const mutationResult = _useMutation<TResponse, Error, TVariables>({
    mutationFn: async (data?: TVariables) => {
      // 判断函数是否需要参数
      if (requestFn.length === 0) {
        // 无参数函数
        const requestConfig = (requestFn as () => YTRequest<TResponse>)();
        return fetchRequest<TResponse>(requestConfig);
      } else {
        // 有参数函数
        const requestConfig = (requestFn as (data: unknown) => YTRequest<TResponse>)(data);
        return fetchRequest<TResponse>(requestConfig);
      }
    },
    ...options,
  });

  // 返回简化后的类型，使 mutateAsync 显示为简洁的函数类型
  return {
    ...mutationResult,
    mutateAsync: mutationResult.mutateAsync,
  } as MutationResult<TResponse, TVariables>;
}

// 别名导出，保持兼容性
export const useRequestMutation = useMutation;
