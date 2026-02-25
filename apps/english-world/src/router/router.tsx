import { createBrowserRouter } from "react-router-dom";
import EnglishWorld from "@/page/englishWorld/EnglishWorld";
import { SystemSettingsPage } from "@/page/englishWorld/component/SystemSettingsPage";
import { RecitePage } from "@/page/englishWorld/recite/RecitePage";
import EnglishWorldMobile from "@/page/englishWorldMobile/EnglishWorldMobile";
import Login from "@/page/login/Login";
import { ProtectedRoute } from "@font/ui";
import { useAuth } from "@/contexts/AuthContext";

function ProtectedWrapper({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  return (
    <ProtectedRoute
      auth={{
        isAuthenticated: auth.isAuthenticated,
        loading: auth.loading,
        checkAuth: auth.checkAuth,
      }}
    >
      {children as React.ReactElement}
    </ProtectedRoute>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/englishWorld",
    element: (
      <ProtectedWrapper>
        <EnglishWorld />
      </ProtectedWrapper>
    ),
  },
  {
    path: "/englishWorld/settings",
    element: (
      <ProtectedWrapper>
        <SystemSettingsPage />
      </ProtectedWrapper>
    ),
  },
  {
    path: "/englishWorld/recite",
    element: (
      <ProtectedWrapper>
        <RecitePage />
      </ProtectedWrapper>
    ),
  },
  {
    path: "/englishWorldMobile",
    element: (
      <ProtectedWrapper>
        <EnglishWorldMobile />
      </ProtectedWrapper>
    ),
  },
]);
