import React, { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";

export interface ProtectedRouteAuth {
  isAuthenticated: boolean;
  loading: boolean;
  checkAuth: () => void;
}

interface ProtectedRouteProps {
  children: React.ReactElement;
  auth: ProtectedRouteAuth;
}

/**
 * 需要由各 app 传入 auth 状态（通常来自 AuthContext 的 useAuth()）
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, auth }) => {
  const { isAuthenticated, loading, checkAuth } = auth;
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      checkAuth();
    }
  }, [location.pathname, loading, isAuthenticated, checkAuth]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
