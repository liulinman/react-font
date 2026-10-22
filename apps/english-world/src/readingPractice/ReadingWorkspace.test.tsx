import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { ReadingWorkspace, LegacyReadingEntry } from "./ReadingWorkspace";
vi.mock("./ReadingPracticeList", () => ({ ReadingPracticeList: () => <p>收到的练习列表</p> }));
vi.mock("@/page/englishWorld/contextLab/ContextLabPage", () => ({
  ContextLabPage: ({ readingMode }: { readingMode: string }) => <p>工作区模式：{readingMode}</p>,
}));
afterEach(cleanup);
function Location() { const location = useLocation(); return <output>{location.search}</output>; }
it("keeps exam and self practice in a single URL-backed workspace", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/englishWorld/reading-practices?mode=exam"]}><ReadingWorkspace basePath="/englishWorld/reading-practices" /><Location /></MemoryRouter>);
  expect(screen.getByRole("tab", { name: "雅思考试" })).toHaveAttribute("aria-selected", "true");
  expect(await screen.findByText("工作区模式：exam")).toBeInTheDocument();
  expect(screen.getByText(/单篇限时/)).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "自主练习" }));
  expect(screen.getByText("收到的练习列表")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("mode=practice");
  await user.click(screen.getByRole("tab", { name: "自己出题" }));
  expect(await screen.findByText("工作区模式：practice")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("source=personal");
});
it("restores personal practice from its URL", async () => {
  render(<MemoryRouter initialEntries={["/englishWorld/reading-practices?mode=practice&source=personal"]}><ReadingWorkspace basePath="/englishWorld/reading-practices" /></MemoryRouter>);
  expect(screen.getByRole("tab", { name: "自己出题" })).toHaveAttribute("aria-selected", "true");
  expect(await screen.findByText("工作区模式：practice")).toBeInTheDocument();
});

it("moves ordinary legacy entries into the shared workspace without losing source links", async () => {
  render(<MemoryRouter initialEntries={["/englishWorld/context-lab?source=word-library&taskId=12&word=apple"]}><LegacyReadingEntry /><Location /></MemoryRouter>);
  expect(await screen.findByRole("status")).toHaveTextContent("mode=practice");
  expect(screen.getByRole("status")).toHaveTextContent("source=word-library");
  expect(screen.getByRole("status")).toHaveTextContent("taskId=12");
});
it("keeps micro recovery entries in their existing flow", async () => {
  render(<MemoryRouter initialEntries={["/englishWorld/context-lab?mode=micro&source=recite-result"]}><LegacyReadingEntry /><Location /></MemoryRouter>);
  expect(await screen.findByText("工作区模式：")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("mode=micro");
});
