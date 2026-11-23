import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { EnglishHeader } from "@/page/englishWorld/component/EnglishHeader";
import { ReadingWorkspace, LegacyReadingEntry } from "./ReadingWorkspace";
vi.mock("./ReadingPracticeList", () => ({ ReadingPracticeList: () => <p>收到的练习列表</p> }));
vi.mock("@/page/englishWorld/contextLab/ContextLabPage", () => ({
  ContextLabPage: ({ readingMode }: { readingMode: string }) => <p>工作区模式：{readingMode}</p>,
}));
afterEach(cleanup);
function Location() { const location = useLocation(); return <output>{location.search}</output>; }
function DesktopReading() {
  return <><EnglishHeader activeKey="readingPractices" /><ReadingWorkspace basePath="/englishWorld/reading-practices" /><Location /></>;
}
it("switches between the three parallel sidebar entries", async () => {
  const user = userEvent.setup();
  render(<MemoryRouter initialEntries={["/englishWorld/reading-practices"]}><DesktopReading /></MemoryRouter>);
  const assigned = screen.getByRole("menuitem", { name: "老师发的题" });
  const personal = screen.getByRole("menuitem", { name: "自己出的题" });
  const exam = screen.getByRole("menuitem", { name: "雅思考试" });
  expect(assigned.parentElement).toBe(personal.parentElement);
  expect(exam.parentElement).toBe(personal.parentElement);
  expect(assigned).toHaveClass("ant-menu-item-selected");
  expect(screen.getByText("收到的练习列表")).toBeInTheDocument();
  expect(screen.queryByRole("tab", { name: "自主练习" })).not.toBeInTheDocument();
  await user.click(personal);
  expect(await screen.findByText("工作区模式：practice")).toBeInTheDocument();
  expect(personal).toHaveClass("ant-menu-item-selected");
  expect(screen.getByRole("status")).toHaveTextContent("source=personal");
  await user.click(exam);
  expect(await screen.findByText("工作区模式：exam")).toBeInTheDocument();
  expect(exam).toHaveClass("ant-menu-item-selected");
  await user.click(assigned);
  expect(screen.getByText("收到的练习列表")).toBeInTheDocument();
});
it("restores personal practice and its selected sidebar item from an existing source link", async () => {
  render(<MemoryRouter initialEntries={["/englishWorld/reading-practices?mode=practice&source=word-library&taskId=12"]}><DesktopReading /></MemoryRouter>);
  expect(screen.getByRole("menuitem", { name: "自己出的题" })).toHaveClass("ant-menu-item-selected");
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
