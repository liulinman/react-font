import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationProvider } from "@/notifications/NotificationContext";
import { router } from "@/router/router";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { MobileActivityLockProvider } from "@/page/englishWorldMobile/offline/MobileActivityLockContext";
import { PwaUpdateProvider } from "@/page/englishWorldMobile/pwa/PwaUpdateContext";

function App() {
  const queryClient = new QueryClient();
  return (
    <MobileActivityLockProvider>
      <PwaUpdateProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <NotificationProvider>
                <RouterProvider router={router} />
              </NotificationProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </PwaUpdateProvider>
    </MobileActivityLockProvider>
  );
}

export default App;
