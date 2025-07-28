import { message } from "antd";
import axios, { AxiosRequestConfig } from "axios";

// 定义 YTRequest 类型
export interface YTRequest {
  url: string;
  data?: any;
  config?: AxiosRequestConfig;
  method: string;
}

// 创建 axios 实例
const api = axios.create({
  baseURL:
    process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:3000" // 开发环境的地址
      : "http://47.108.140.63:3001", // 生产环境的地址
  timeout: 10000, // 请求超时
  headers: {
    "Content-Type": "application/json",
  },
});

// 添加响应拦截器
api.interceptors.response.use(
  (response) => {
    // 如果请求成功，直接返回响应数据
    return response;
  },
  (error) => {
    message.error(error.response.data.message);

    // 返回错误，可以根据需求抛出或处理
    return Promise.reject(error.response.data);
  }
);

// 封装请求执行函数
const request = async <T>(ytRequest: YTRequest): Promise<T> => {
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
