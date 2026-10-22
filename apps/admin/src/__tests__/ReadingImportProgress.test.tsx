import "@testing-library/jest-dom/vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, it, expect, vi } from "vitest";
import { ReadingPracticeWorkbench } from "../ReadingPracticeWorkbench";
vi.mock("@font/api", () => ({
  default: vi.fn().mockResolvedValue({ list: [] }),
  getApiBaseUrl: () => "/api",
}));
afterEach(cleanup);
const paper: any = {
  id: 1,
  title: "导入阅读练习",
  status: "generating",
  config: { targetType: "all" },
  workflow: {
    sources: [
      {
        id: "s1",
        name: "a.png",
        mime: "image/png",
        url: "/private/a",
        pages: 1,
        size: 20,
      },
      {
        id: "s2",
        name: "b.png",
        mime: "image/png",
        url: "/private/b",
        pages: 1,
        size: 20,
      },
    ],
  },
};
it("shows original preview and clear task status without published copy or disabled upload controls", () => {
  render(
    <ReadingPracticeWorkbench
      paper={paper}
      onChange={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "正在整理阅读材料" }),
  ).toBeVisible();
  expect(screen.getByAltText("原稿预览：a.png")).toHaveAttribute(
    "src",
    "/api/private/a",
  );
  expect(screen.queryByText(/已发布内容仅供查看/)).toBeNull();
  expect(screen.queryByText(/0 道题/)).toBeNull();
  expect(screen.queryByText("上传原稿")).toBeNull();
  expect(screen.queryByText("学生视角预览")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "查看第 2 份原稿" }));
  expect(screen.getByAltText("原稿预览：b.png")).toBeVisible();
});
it("keeps original text visible and offers retry when processing fails", () => {
  render(
    <ReadingPracticeWorkbench
      paper={{
        ...paper,
        status: "failed",
        failureSummary: "识别服务暂不可用",
        workflow: {
          sources: [],
          importInput: {
            text: "Original article and questions.",
            answerText: "Answer key",
          },
        },
      }}
      onChange={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "材料整理暂未完成" }),
  ).toBeVisible();
  expect(screen.getByText("Original article and questions.")).toBeVisible();
  expect(screen.getByRole("button", { name: "重新整理" })).toBeEnabled();
  expect(screen.getByText("识别服务暂不可用")).toBeVisible();
});

it("shows a queued PDF task without claiming it has started", () => {
  render(
    <ReadingPracticeWorkbench
      paper={{
        ...paper,
        status: "queued",
        workflow: {
          sources: [
            {
              id: "pdf",
              name: "Reading.pdf",
              mime: "application/pdf",
              pages: 2,
              url: "/private/pdf",
            },
          ],
        },
      }}
      onChange={vi.fn()}
      onClose={vi.fn()}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "材料已收到，等待整理" }),
  ).toBeVisible();
  expect(screen.getByTitle("PDF原稿：Reading.pdf")).toHaveAttribute(
    "src",
    "/api/private/pdf",
  );
  expect(screen.getByText("任务等待开始")).toBeVisible();
});
