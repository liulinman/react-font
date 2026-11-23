import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import Login, { resolveAfterLoginPath } from "./Login";
const mocks = vi.hoisted(() => ({ login: vi.fn(), api: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ login: mocks.login, isAuthenticated: false }),
}));
vi.mock("@font/api", () => ({
  useMutation: (descriptor: (data: unknown) => unknown) => ({
    mutateAsync: (data: unknown) => mocks.api(descriptor(data)),
  }),
}));
beforeEach(() => {
  mocks.login.mockReset();
  mocks.api.mockReset();
  mocks.api.mockImplementation(async ({ url }: { url: string }) =>
    url === "/user/captcha"
      ? {
          captchaId: "challenge",
          imageDataUrl: "data:image/png;base64,AA",
          expiresIn: 120,
        }
      : { challengeId: "email-challenge", retryAfter: 60 },
  );
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it("rejects external, backslash and login-loop return routes", () => {
  for (const pathname of [
    "https://evil.test",
    "//evil.test",
    "/\\evil.test",
    "/login",
    "/login/",
    "/safe/../login",
  ])
    expect(resolveAfterLoginPath({ from: { pathname } }, false)).toBe(
      "/englishWorld/ai-listening",
    );
});
it("shows the approved full logo and sends a real captcha with login; failed login refreshes it", async () => {
  mocks.login.mockRejectedValue({ message: "用户名或密码错误" });
  const { container } = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  expect(screen.getByAltText("Freewing 品牌图案")).toHaveAttribute(
    "src",
    "/brand/freewing-logo-transparent.png",
  );
  await screen.findByAltText("图形验证码");
  fireEvent.change(screen.getByLabelText("用户名"), {
    target: { value: "learner" },
  });
  fireEvent.change(screen.getByLabelText("密码"), {
    target: { value: "password1" },
  });
  fireEvent.change(screen.getByLabelText("图形验证码"), {
    target: { value: "ABCDE" },
  });
  fireEvent.submit(container.querySelector("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "用户名或密码错误",
  );
  expect(mocks.login).toHaveBeenCalledWith("learner", "password1", {
    captchaId: "challenge",
    captchaCode: "ABCDE",
  });
  await waitFor(() =>
    expect(
      mocks.api.mock.calls.filter(([d]) => d.url === "/user/captcha"),
    ).toHaveLength(2),
  );
});
it("registers only after email verification and clears passwords when returning to edit", async () => {
  const { container } = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "注册账号" }));
  await screen.findByAltText("图形验证码");
  for (const [label, value] of [
    ["用户名", "learner"],
    ["邮箱", "ME@Test.com"],
    ["密码", "password1"],
    ["确认密码", "password1"],
    ["图形验证码", "ABCDE"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.submit(container.querySelector("form")!);
  expect(await screen.findByLabelText("邮箱验证码")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /60 秒/ })).toBeDisabled();
  expect(mocks.api.mock.calls.some(([d]) => d.url === "/user/register")).toBe(
    false,
  );
  fireEvent.click(screen.getByRole("button", { name: "返回修改" }));
  expect(screen.getByLabelText("用户名")).toHaveValue("learner");
  expect(screen.getByLabelText("邮箱")).toHaveValue("me@test.com");
  expect(screen.getByLabelText("密码")).toHaveValue("");
});
it("shows unavailable email service without falsely advancing and allows retry", async () => {
  mocks.api.mockImplementation(async ({ url }: { url: string }) => {
    if (url === "/user/email-code")
      throw { message: "邮件服务暂不可用，请稍后重试" };
    return { captchaId: "challenge", imageDataUrl: "data:image/png;base64,AA" };
  });
  const { container } = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "忘记密码？" }));
  await screen.findByAltText("图形验证码");
  fireEvent.change(screen.getByLabelText("邮箱"), {
    target: { value: "a@test.com" },
  });
  fireEvent.change(screen.getByLabelText("图形验证码"), {
    target: { value: "ABCDE" },
  });
  fireEvent.submit(container.querySelector("form")!);
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "邮件服务暂不可用",
  );
  expect(screen.getByLabelText("邮箱")).toHaveValue("a@test.com");
  expect(screen.queryByLabelText("邮箱验证码")).not.toBeInTheDocument();
});
it("does not let a late email response overwrite a new screen", async () => {
  let resolve: (v: unknown) => void = () => {};
  mocks.api.mockImplementation(({ url }: { url: string }) =>
    url === "/user/email-code"
      ? new Promise((r) => {
          resolve = r;
        })
      : Promise.resolve({
          captchaId: "challenge",
          imageDataUrl: "data:image/png;base64,AA",
        }),
  );
  const { container } = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "忘记密码？" }));
  await screen.findByAltText("图形验证码");
  fireEvent.change(screen.getByLabelText("邮箱"), {
    target: { value: "a@test.com" },
  });
  fireEvent.change(screen.getByLabelText("图形验证码"), {
    target: { value: "ABCDE" },
  });
  fireEvent.submit(container.querySelector("form")!);
  fireEvent.click(screen.getByRole("button", { name: "返回登录" }));
  resolve({ challengeId: "late", retryAfter: 60 });
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "欢迎回来" }),
    ).toBeInTheDocument(),
  );
  expect(screen.queryByLabelText("邮箱验证码")).not.toBeInTheDocument();
});
it("resets with the email proof and returns to login without authenticating", async () => {
  const { container } = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "忘记密码？" }));
  await screen.findByAltText("图形验证码");
  fireEvent.change(screen.getByLabelText("邮箱"), {
    target: { value: "A@Test.com" },
  });
  fireEvent.change(screen.getByLabelText("图形验证码"), {
    target: { value: "ABCDE" },
  });
  fireEvent.submit(container.querySelector("form")!);
  await screen.findByLabelText("邮箱验证码");
  for (const [label, value] of [
    ["邮箱验证码", "123456"],
    ["新密码", "🌍".repeat(8)],
    ["确认密码", "🌍".repeat(8)],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.submit(container.querySelector("form")!);
  expect(
    await screen.findByRole("heading", { name: "操作成功" }),
  ).toBeInTheDocument();
  expect(mocks.api).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/user/reset-password",
      data: {
        email: "a@test.com",
        password: "🌍".repeat(8),
        challengeId: "email-challenge",
        emailCode: "123456",
      },
    }),
  );
  expect(mocks.login).not.toHaveBeenCalled();
});
it("consumes registration email proof without automatically signing in", async () => {
  const { container } = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "注册账号" }));
  await screen.findByAltText("图形验证码");
  for (const [label, value] of [
    ["用户名", "learner"],
    ["邮箱", "a@test.com"],
    ["密码", "password1"],
    ["确认密码", "password1"],
    ["图形验证码", "ABCDE"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.submit(container.querySelector("form")!);
  await screen.findByLabelText("邮箱验证码");
  fireEvent.change(screen.getByLabelText("邮箱验证码"), {
    target: { value: "123456" },
  });
  fireEvent.submit(container.querySelector("form")!);
  expect(
    await screen.findByRole("heading", { name: "操作成功" }),
  ).toBeInTheDocument();
  expect(mocks.api).toHaveBeenCalledWith(
    expect.objectContaining({
      url: "/user/register",
      data: {
        username: "learner",
        email: "a@test.com",
        password: "password1",
        challengeId: "email-challenge",
        emailCode: "123456",
      },
    }),
  );
  expect(mocks.login).not.toHaveBeenCalled();
});

it("allows final email proof submission after the 60-second resend cooldown without an unused captcha", async () => {
  vi.useFakeTimers();
  const { container } = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "忘记密码？" }));
  await act(async () => {});
  fireEvent.change(screen.getByLabelText("邮箱"), {
    target: { value: "a@test.com" },
  });
  fireEvent.change(screen.getByLabelText("图形验证码"), {
    target: { value: "ABCDE" },
  });
  await act(async () => {
    fireEvent.submit(container.querySelector("form")!);
  });
  for (let n = 0; n < 60; n++)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
  for (const [label, value] of [
    ["邮箱验证码", "123456"],
    ["新密码", "password1"],
    ["确认密码", "password1"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  expect(container.querySelector("form")!.checkValidity()).toBe(true);
  await act(async () => {
    fireEvent.submit(container.querySelector("form")!);
  });
  expect(screen.getByRole("heading", { name: "操作成功" })).toBeInTheDocument();
});
it("prevents switching account task while a delayed login is pending", async () => {
  let resolve: (v: unknown) => void = () => {};
  mocks.login.mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const { container } = render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
  await screen.findByAltText("图形验证码");
  for (const [label, value] of [
    ["用户名", "learner"],
    ["密码", "password1"],
    ["图形验证码", "ABCDE"],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.submit(container.querySelector("form")!);
  expect(screen.getByRole("button", { name: "注册账号" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "忘记密码？" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "注册账号" }));
  expect(screen.getByRole("heading", { name: "欢迎回来" })).toBeInTheDocument();
  await act(async () => {
    resolve({ id: 1 });
  });
});
