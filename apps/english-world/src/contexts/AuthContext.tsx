import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useMutation } from "@font/api";
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

  const { mutateAsync: checkCurrentUser } = useMutation(getCurrentUser, {
    onSuccess: (userData: UserInfo) => {
      setUser(userData);
      setLoading(false);
    },
    onError: (error: ApiError) => {
      if (error?.code === 4001) {
        setUser(null);
      } else if (error?.code === "CORS_ERROR") {
        console.warn("CORS 配置错误，请检查后端配置");
        setUser(null);
      } else {
        setUser(null);
      }
      setLoading(false);
    },
  });

  const { mutateAsync: loginMutation } = useMutation(userLogin, {
    onSuccess: (result: LoginResponse) => {
      setUser(result.user);
      message.success("登录成功");
    },
    onError: (error: ApiError) => {
      // 错误文案已由 axios 响应拦截器统一展示，此处不再重复 message.error
      throw error;
    },
  });

  const { mutateAsync: registerMutation } = useMutation(userRegister, {
    onSuccess: () => {
      message.success("注册成功");
    },
    onError: (error: ApiError) => {
      // 错误文案已由 axios 响应拦截器统一展示，此处不再重复
      throw error;
    },
  });

  const { mutateAsync: logoutMutation } = useMutation(userLogout, {
    onSuccess: () => {
      setUser(null);
    },
    onError: (error: ApiError) => {
      // 错误文案已由 axios 响应拦截器统一展示，此处不再重复
      throw error;
    },
  });

  const checkAuth = useCallback(async () => {
    try {
      await checkCurrentUser();
    } catch (error) {
      console.error("Check auth failed:", error);
    }
  }, [checkCurrentUser]);

  const login = async (
    username: string,
    password: string
  ): Promise<UserInfo> => {
    const result = await loginMutation({ username, password });
    return result.user;
  };

  const register = async (
    username: string,
    password: string,
    avatar?: string
  ): Promise<UserInfo> => {
    const result = await registerMutation({ username, password, avatar });
    return result;
  };

  const logout = async (): Promise<void> => {
    await logoutMutation();
  };

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

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};
