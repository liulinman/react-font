import axios, { AxiosRequestConfig } from "axios";

// 定义 YTRequest 类型
export interface YTRequest<T> {
  url: string;
  data?: any;
  config?: AxiosRequestConfig;
  method: "GET" | "POST" | "PUT" | "DELETE";
}

// 创建 axios 实例
const api = axios.create({
  baseURL: "http://47.108.140.63:3000", // 基础 URL
  timeout: 10000, // 请求超时
  headers: {
    "Content-Type": "application/json",
  },
});

// 封装请求执行函数
const request = async <T>(ytRequest: YTRequest<T>): Promise<T> => {
  const { url, data, method, config } = ytRequest;
  try {
    let response;
    switch (method) {
      case "GET":
        response = await api.get(url, { params: data, ...config });
        break;
      case "POST":
        response = await api.post(url, data, config);
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
    return response.data;
  } catch (error) {
    console.error("Request failed:", error);
    throw error;
  }
};

export default request;
