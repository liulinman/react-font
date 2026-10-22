import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReadingImport } from "../ReadingImport";
const send = vi.hoisted(() => vi.fn());
vi.mock("@font/api", () => ({ default: send, getApiBaseUrl: () => "/api" }));
beforeEach(() => {
  send.mockResolvedValue({});
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    }),
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("imports original material without generation settings", async () => {
  const user = userEvent.setup();
  const created = vi.fn();
  render(<><ReadingImport onCreated={created} /><button type="submit" form="reading-import-form">开始整理</button></>);
  expect(
    screen.queryByLabelText("文章主题 / 生成要求"),
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText("文章词数")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("题目数量")).not.toBeInTheDocument();
  await user.click(screen.getByText("粘贴文本"));
  await user.type(
    screen.getByLabelText("文章和题目"),
    "An original passage with one original question.",
  );
  await user.click(screen.getByRole("button", { name: "开始整理" }));
  await waitFor(() => expect(created).toHaveBeenCalledOnce());
  expect(send).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        mode: "complete_answers",
        autoProcess: true,
        config: { targetType: "all" },
      }),
    }),
  );
});
it("shows question settings only when generating questions and removes them on mode change", async () => {
  const user = userEvent.setup();
  render(<><ReadingImport onCreated={vi.fn()} /><button type="submit" form="reading-import-form">开始整理</button></>);
  await user.click(screen.getByText("更多选项"));
  await user.click(screen.getByLabelText("根据文章重新出题"));
  expect(screen.getByLabelText("题目数量")).toBeInTheDocument();
  expect(screen.queryByLabelText("文章词数")).not.toBeInTheDocument();
  await user.click(screen.getByLabelText("自动整理、补全并检查"));
  expect(screen.queryByLabelText("题目数量")).not.toBeInTheDocument();
  await user.click(screen.getByText("粘贴文本"));
  await user.type(
    screen.getByLabelText("文章和题目"),
    "Original passage",
  );
  await user.click(screen.getByRole("button", { name: "开始整理" }));
  await waitFor(() =>
    expect(send.mock.calls.some(([r]) => r.url.endsWith("/imports"))).toBe(
      true,
    ),
  );
  expect(
    send.mock.calls.find(([r]) => r.url.endsWith("/imports"))![0].data.config,
  ).toEqual({ targetType: "all" });
});
it("submits only requested question settings when generating from a passage", async () => {
  const user = userEvent.setup();
  render(<><ReadingImport onCreated={vi.fn()} /><button type="submit" form="reading-import-form">开始整理</button></>);
  await user.click(screen.getByText("更多选项"));
  await user.click(screen.getByLabelText("根据文章重新出题"));
  await user.click(screen.getByText("粘贴文本"));
  await user.type(
    screen.getByLabelText("文章和题目"),
    "Original passage to retain",
  );
  await user.click(screen.getByRole("button", { name: "开始整理" }));
  await waitFor(() =>
    expect(send.mock.calls.some(([r]) => r.url.endsWith("/imports"))).toBe(
      true,
    ),
  );
  expect(
    send.mock.calls.find(([r]) => r.url.endsWith("/imports"))![0].data.config,
  ).toEqual({
    targetType: "all",
    questionCount: 5,
    questionTypes: ["choice", "true_false_not_given"],
  });
});
