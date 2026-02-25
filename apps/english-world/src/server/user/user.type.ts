export interface UserInfo {
  id: number;
  username: string;
  avatar?: string;
  createTime: string;
  updateTime: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  avatar?: string;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: UserInfo;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}
