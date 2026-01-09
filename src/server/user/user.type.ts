// 用户信息类型定义
export interface UserInfo {
  id: number;
  username: string;
  avatar?: string;
  createTime: string;
  updateTime: string;
}

// 注册请求参数
export interface RegisterParams {
  username: string;
  password: string;
  avatar?: string;
}

// 登录请求参数
export interface LoginParams {
  username: string;
  password: string;
}

// 登录响应数据
export interface LoginResponse {
  user: UserInfo;
}

// API 响应格式
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
}

