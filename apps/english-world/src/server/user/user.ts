import type {
  RegisterParams,
  LoginParams,
  UserInfo,
  LoginResponse,
} from "./user.type";

export const userFindList = () => {
  return {
    url: "/user/getUsers",
    method: "GET",
  };
};

export const userAdd = (data: Record<string, unknown>) => {
  return {
    url: "/user/createUser",
    method: "POST",
    data,
  };
};

export const userRegister = (data: RegisterParams) => {
  return {
    url: "/user/register",
    method: "POST",
    data,
    __responseType: {} as UserInfo,
  };
};

export const userLogin = (data: LoginParams) => {
  return {
    url: "/user/login",
    method: "POST",
    data,
    __responseType: {} as LoginResponse,
  };
};

export const getCurrentUser = () => {
  return {
    url: "/user/getCurrentUser",
    method: "POST",
    __responseType: {} as UserInfo,
  };
};

export const userLogout = () => {
  return {
    url: "/user/logout",
    method: "POST",
    __responseType: null as null,
  };
};

export const accountCaptcha = (data: { previousCaptchaId?: string }) => ({
  url: "/user/captcha",
  method: "POST",
  data,
  __responseType: {} as {
    captchaId: string;
    imageDataUrl: string;
    expiresIn: number;
  },
});
export const accountEmailCode = (data: {
  purpose: "register" | "reset";
  email: string;
  captchaId: string;
  captchaCode: string;
}) => ({
  url: "/user/email-code",
  method: "POST",
  data,
  __responseType: {} as {
    challengeId: string;
    retryAfter: number;
    expiresIn: number;
  },
});
export const accountResetPassword = (data: {
  email: string;
  password: string;
  challengeId: string;
  emailCode: string;
}) => ({
  url: "/user/reset-password",
  method: "POST",
  data,
  __responseType: null as null,
});
export const accountChangePassword = (data: {
  currentPassword: string;
  password: string;
}) => ({
  url: "/user/change-password",
  method: "POST",
  data,
  __responseType: null as null,
});

export const accountUpdateDisplayName = (displayName: string) => ({
  url: "/user/display-name",
  method: "POST",
  data: { displayName },
  __responseType: {} as { id: number; displayName: string },
});

export const accountUpdateAvatar = (file: File) => {
  const data = new FormData();
  data.append("file", file);
  return {
    url: "/user/avatar",
    method: "POST",
    data,
    __responseType: {} as { id: number; avatar: string },
  };
};
