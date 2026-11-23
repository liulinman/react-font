import "@testing-library/jest-dom/vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext";
vi.mock("@font/api", async () => {
  const { useMemo } = await import("react");
  return {
    useMutation: (
      descriptor: (data?: unknown) => { url: string },
      options: { onSuccess?: (result: unknown) => void },
    ) =>
      useMemo(
        () => ({
          mutateAsync: async (data?: unknown) => {
            const { url } = descriptor(data);
            if (url === "/user/logout") throw new Error("offline");
            const result =
              url === "/user/login"
                ? { user: { id: 1, username: "learner" } }
                : null;
            options.onSuccess?.(result);
            return result;
          },
        }),
        [],
      ),
  };
});
afterEach(cleanup);
it("clears local authentication even if logout transport fails after server password revocation", async () => {
  const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
  await waitFor(() => expect(result.current.loading).toBe(false));
  await act(() =>
    result.current.login("learner", "password1", {
      captchaId: "id",
      captchaCode: "code",
    }),
  );
  expect(result.current.isAuthenticated).toBe(true);
  await act(async () => {
    await expect(result.current.logout()).rejects.toThrow("offline");
  });
  expect(result.current.isAuthenticated).toBe(false);
});
