/*
 * @Author: yifeng 2108546503@qq.com
 * @Date: 2025-03-14 13:57:29
 * @LastEditors: yifeng 2108546503@qq.com
 * @LastEditTime: 2025-03-14 14:17:35
 * @FilePath: \font\src\server\user\user.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
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

// 用户注册
export const userRegister = (data: RegisterParams) => {
  return {
    url: "/user/register",
    method: "POST",
    data,
    __responseType: {} as UserInfo,
  };
};

// 用户登录
export const userLogin = (data: LoginParams) => {
  return {
    url: "/user/login",
    method: "POST",
    data,
    __responseType: {} as LoginResponse,
  };
};

// 获取当前用户信息
export const getCurrentUser = () => {
  return {
    url: "/user/getCurrentUser",
    method: "POST",
    __responseType: {} as UserInfo,
  };
};

// 退出登录
export const userLogout = () => {
  return {
    url: "/user/logout",
    method: "POST",
    __responseType: null as null,
  };
};
