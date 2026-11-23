export interface UserInfo {
  id: number;
  username: string;
  displayName?: string | null;
  avatar?: string | null;
  email?: string;
  createTime: string;
  updateTime: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  email: string;
  challengeId: string;
  emailCode: string;
}

export interface CaptchaAnswer {
  captchaId: string;
  captchaCode: string;
}

export interface LoginParams {
  username: string;
  password: string;
  captchaId?: string;
  captchaCode?: string;
}

export interface LoginResponse {
  user: UserInfo;
}

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
}
