import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useMutation } from "@/utils/axios/axios";
import {
  getCurrentUser,
  userLogin,
  userLogout,
  userRegister,
} from "@/server/user/user";
import type { UserInfo, LoginResponse } from "@/server/user/user.type";
import { message } from "antd";

interface ApiError {
  code?: number | string;
  message?: string;
  data?: unknown;
}

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<UserInfo>;
  register: (
    username: string,
    password: string,
    avatar?: string
  ) => Promise<UserInfo>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 获取当前用户信息
  const { mutateAsync: checkCurrentUser } = useMutation(getCurrentUser, {
    onSuccess: (userData: UserInfo) => {
      setUser(userData);
      setLoading(false);
    },
    onError: (error: ApiError) => {
      if (error?.code === 4001) {
        // 未登录或 Token 无效
        setUser(null);
      } else if (error?.code === "CORS_ERROR") {
        // CORS 错误，不阻止应用运行，只记录警告
        console.warn("CORS 配置错误，请检查后端配置");
        setUser(null);
      } else {
        // 其他错误
        setUser(null);
      }
      setLoading(false);
    },
  });

  // 登录
  const { mutateAsync: loginMutation } = useMutation(userLogin, {
    onSuccess: (result: LoginResponse) => {
      setUser(result.user);
      message.success("登录成功");
    },
    onError: (error: ApiError) => {
      message.error(error?.message || "登录失败");
      throw error;
    },
  });

  // 注册
  const { mutateAsync: registerMutation } = useMutation(userRegister, {
    onSuccess: () => {
      message.success("注册成功");
    },
    onError: (error: ApiError) => {
      message.error(error?.message || "注册失败");
      throw error;
    },
  });

  // 退出登录
  const { mutateAsync: logoutMutation } = useMutation(userLogout, {
    onSuccess: () => {
      setUser(null);
    },
    onError: (error: ApiError) => {
      message.error(error?.message || "退出登录失败");
      throw error;
    },
  });

  // 检查登录状态
  const checkAuth = useCallback(async () => {
    try {
      await checkCurrentUser();
    } catch (error) {
      // 错误已在 onError 中处理
      console.error("Check auth failed:", error);
    }
  }, [checkCurrentUser]);

  // 登录
  const login = async (
    username: string,
    password: string
  ): Promise<UserInfo> => {
    const result = await loginMutation({ username, password });
    return result.user;
  };

  // 注册
  const register = async (
    username: string,
    password: string,
    avatar?: string
  ): Promise<UserInfo> => {
    const result = await registerMutation({ username, password, avatar });
    return result;
  };

  // 退出登录
  const logout = async (): Promise<void> => {
    await logoutMutation();
  };

  // 初始化时检查登录状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
