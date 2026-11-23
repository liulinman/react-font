import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ReadingQuestionReadout } from "../ReadingQuestionReadout";
import { needsAnswerCompletion, ReadingPracticeWorkbench } from "../ReadingPracticeWorkbench";
import type { AdminPractice, PracticeContent } from "../api/readingPractice.type";
vi.mock("@font/api", () => ({ default: vi.fn().mockResolvedValue({ list: [] }), getApiBaseUrl: () => "/api" }));
afterEach(cleanup);
const content: PracticeContent = { title: "Birds", paragraphs: ["A group called theropods."], questions: [{ id: "q1", kind: "sentence_completion", stem: "A group called ........ .", options: [], correctIndex: null, acceptedAnswers: ["theropods"], maxWords: 1, instructions: "ONE WORD ONLY", explanation: "The passage names the group.", evidence: { paragraph: 1, quote: "theropods" } }] };
it("requires an accepted answer, valid word limit and passage evidence before review", () => {
  const q = content.questions[0];
  expect(needsAnswerCompletion(content, q)).toBe(false);
  for (const patch of [{ acceptedAnswers: [] }, { acceptedAnswers: [" "] }, { acceptedAnswers: ["two words"] }, { maxWords: 0 }, { maxWords: 1.5 }, { evidence: { paragraph: 1, quote: "missing" } }]) {
    expect(needsAnswerCompletion(content, { ...q, ...patch })).toBe(true);
  }
  expect(needsAnswerCompletion(content, { ...q, maxWords: undefined, acceptedAnswers: ["two words"] })).toBe(false);
});
it("shows fill answers and word instructions in teacher readout", () => {
  render(<ReadingQuestionReadout question={content.questions[0]} />);
  expect(screen.getByText("正确答案：theropods")).toBeInTheDocument();
  expect(screen.getByText("ONE WORD ONLY")).toBeInTheDocument();
  expect(screen.queryByText("尚未设置正确答案，请先修改本题。")).not.toBeInTheDocument();
});
it("offers answer editing without an option answer selector", async () => {
  Object.defineProperty(window, "matchMedia", { writable: true, value: () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }) });
  const paper = { id: 1, status: "draft", content, config: {}, workflow: { revision: 1, qualityRevision: 1 } } as AdminPractice;
  render(<ReadingPracticeWorkbench paper={paper} onClose={() => {}} onChange={() => {}} />);
  await userEvent.click(screen.getByRole("tab", { name: "1 阅读文章" }));
  await userEvent.click(screen.getByRole("button", { name: "修改文章与题目" }));
  expect(screen.getByLabelText("可接受答案")).toHaveValue("theropods");
  expect(screen.getByLabelText("最多词数")).toHaveValue("1");
  expect(screen.queryByLabelText("正确答案")).not.toBeInTheDocument();
  expect(screen.queryByText("添加选项")).not.toBeInTheDocument();
});
it("student preview has a writable answer field and hides reference answers", async () => {
  const paper = { id: 1, status: "draft", content: { ...content, paragraphs: ["The source passage."] }, config: {}, workflow: {} } as AdminPractice;
  render(<ReadingPracticeWorkbench paper={paper} onClose={() => {}} onChange={() => {}} />);
  await userEvent.click(screen.getByRole("button", { name: "学生视角预览" }));
  const preview = await screen.findByRole("dialog", { name: "学生视角预览 · 提交前" });
  const input = within(preview).getByLabelText("第 1 题答案");
  await userEvent.type(input, "my answer");
  expect(input).toHaveValue("my answer");
  expect(within(preview).queryByText("正确答案：theropods")).not.toBeInTheDocument();
});
