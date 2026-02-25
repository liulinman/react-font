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
