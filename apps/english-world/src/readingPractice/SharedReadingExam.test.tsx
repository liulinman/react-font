import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { readingExamTask } from "./SharedReadingExam";
import { ReadingPracticeResult } from "./ReadingPracticeResult";
import { ReadingPracticeReader } from "./ReadingPracticeReader";
import type { PracticeResult, PublicPractice } from "./types";
const send = vi.hoisted(() => vi.fn());
vi.mock("@font/api", () => ({ default: send }));
const paper: PublicPractice = { id: 1, title: "Birds", paragraphs: ["Birds have claws."], paragraphLabels: ["A"], ieltsBand: null, started: true, status: "published", submitted: false, questions: [{ id: "s1", kind: "sentence_completion", stem: "Birds have .... .", options: [], maxWords: 1, instructions: "Choose ONE WORD ONLY." }, { id: "q2", kind: "choice", stem: "What flies?", options: ["Birds", "Fish"] }] };
const result: PracticeResult = { practiceId: 1, submittedAt: "2026-10-21", score: 50, correctCount: 1, total: 2, results: paper.questions.map((q, i) => ({ ...q, correct: i === 0, correctIndex: i === 0 ? null : 0, acceptedAnswers: i === 0 ? ["claws"] : undefined, answerText: i === 0 ? "claws" : undefined, explanation: "Read the passage.", evidence: { paragraph: 1, quote: "Birds have claws." } })) };
const mount = () => render(<MemoryRouter><ReadingPracticeReader practiceId={1} basePath="/reading" userId={7} /></MemoryRouter>);
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
it("starts server attempt before timer, migrates legacy blank and submits all answers only to reading endpoints", async () => {
  localStorage.setItem("reading-practice:v1:7:1", JSON.stringify({ schemaVersion: 1, requestUid: "legacy-submit-123", answers: { s1: "claws" }, savedAt: Date.now() }));
  send.mockImplementation(async (r: any) => r.url.endsWith("/submissions") ? result : r.url.endsWith("/start") ? {} : paper);
  const user = userEvent.setup(); mount();
  await user.click(await screen.findByRole("button", { name: "开始考试" }));
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ url: "/reading-practices/1/start" }));
  expect(screen.getByRole("textbox", { name: "第 1 题答案" })).toHaveValue("claws");
  await user.click(screen.getByRole("button", { name: "交卷" }));
  await user.click(screen.getByRole("button", { name: "确认交卷" }));
  await screen.findByText("考试已完成");
  const payload = send.mock.calls.find(([r]) => r.url.endsWith("/submissions"))?.[0].data;
  expect(payload).toMatchObject({ requestUid: "legacy-submit-123", allowUnanswered: true, answers: [{ questionId: "s1", answerText: "claws" }, { questionId: "q2", unanswered: true }] });
  expect(screen.queryByRole("button", { name: "再考一次" })).not.toBeInTheDocument();
  expect(send.mock.calls.every(([r]) => r.url.startsWith("/reading-practices"))).toBe(true);
});
it("restores sentence input after reload and retries with stable idempotency key", async () => {
  send.mockImplementation(async (r: any) => { if(r.url.endsWith("/result") || r.url.endsWith("/submissions")) throw new Error("offline"); return r.url.endsWith("/start") ? {} : paper; });
  const user = userEvent.setup(); const first = mount();
  await user.click(await screen.findByRole("button", { name: "开始考试" }));
  await user.type(screen.getByRole("textbox", { name: "第 1 题答案" }), "claws");
  first.unmount(); mount();
  expect(await screen.findByRole("textbox", { name: "第 1 题答案" })).toHaveValue("claws");
  await user.click(screen.getByRole("button", { name: "交卷" })); await user.click(screen.getByRole("button", { name: "确认交卷" }));
  await screen.findByText(/提交未完成/);
  await user.click(screen.getByRole("button", { name: "重试交卷" }));
  await waitFor(() => expect(send.mock.calls.filter(([r]) => r.url.endsWith("/submissions"))).toHaveLength(2));
  const payloads = send.mock.calls.filter(([r]) => r.url.endsWith("/submissions")).map(([r]) => r.data);
  expect(payloads[0]).toEqual(payloads[1]);
});
it("loads authoritative submitted result with no restart and teacher corrections", async () => {
  send.mockImplementation(async (r: any) => r.url.endsWith("/result") ? { ...result, originalResult: result, gradingRevision: 2, adjustments: [{ id: "fix", questionId: "s1", reason: "老师更正答案", revision: 2 }] } : { ...paper, submitted: true });
  mount();
  await screen.findByText("考试已完成");
  expect(screen.getByText(/老师更正答案/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "再考一次" })).not.toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: "第 1 题答案" })).toHaveValue("claws");
});
it("blocks manual over-limit text and recovers authoritative result after an ambiguous submit failure", async () => {
  send.mockImplementation(async (r: any) => { if(r.url.endsWith("/submissions")) throw new Error("response lost"); if(r.url.endsWith("/result")) return result; return r.url.endsWith("/start") ? {} : paper; });
  const user = userEvent.setup(); mount();
  await user.click(await screen.findByRole("button", { name: "开始考试" }));
  const input = screen.getByRole("textbox", { name: "第 1 题答案" });
  await user.type(input, "two words");
  await user.click(screen.getByRole("button", { name: "交卷" }));
  expect(screen.queryByRole("button", { name: "确认交卷" })).not.toBeInTheDocument();
  expect(send.mock.calls.some(([r]) => r.url.endsWith("/submissions"))).toBe(false);
  await user.clear(input); await user.type(input, "claws");
  await user.click(screen.getByRole("button", { name: "交卷" })); await user.click(screen.getByRole("button", { name: "确认交卷" }));
  await screen.findByText("考试已完成");
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ url: "/reading-practices/1/result" }));
  expect(screen.queryByRole("button", { name: "再考一次" })).not.toBeInTheDocument();
});

it("preserves article paragraphs, passage labels and original global instructions", () => {
  const task = readingExamTask({ ...paper, instructions: "Choose ONE WORD ONLY from the passage.", paragraphs: ["First paragraph.", "Second paragraph."], paragraphLabels: ["A", "B"] });
  expect(task.title).toBe("Birds");
  expect(task.article).toBe("Birds\n\nA\n\nFirst paragraph.\n\nB\n\nSecond paragraph.");
  expect(task.article).not.toContain("\\n");
  expect(task.questions?.[0].instructions).toBe("Choose ONE WORD ONLY.");
  expect(task.questions?.[1].instructions).toBe("Choose ONE WORD ONLY from the passage.");
});

it("locks background scrolling while mounted and restores the previous overflow", async () => {
  send.mockResolvedValue(paper);
  document.body.style.overflow = "auto";
  const view = mount();
  await screen.findByRole("button", { name: "开始考试" });
  expect(document.body.style.overflow).toBe("hidden");
  view.unmount();
  expect(document.body.style.overflow).toBe("auto");
  document.body.style.overflow = "";
});
it("hides the previous user's paper while the next account loads", async () => {
  send.mockResolvedValueOnce(paper).mockImplementation(() => new Promise(() => {}));
  const view = mount();
  await screen.findByRole("button", { name: "开始考试" });
  view.rerender(<MemoryRouter><ReadingPracticeReader practiceId={1} basePath="/reading" userId={8} /></MemoryRouter>);
  expect(screen.queryByRole("dialog", { name: "雅思机考模式" })).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("正在加载练习");
});

it("clears previous result and refetches when the result page changes account", async () => {
  send.mockImplementation(async (r: any) => r.url.endsWith("/result") ? result : paper);
  const view = render(<MemoryRouter><ReadingPracticeResult practiceId={1} basePath="/reading" userId={7} /></MemoryRouter>);
  await screen.findByText("考试已完成");
  send.mockImplementation(() => new Promise(() => {}));
  view.rerender(<MemoryRouter><ReadingPracticeResult practiceId={1} basePath="/reading" userId={8} /></MemoryRouter>);
  expect(screen.queryByRole("dialog", { name: "雅思机考模式" })).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("正在读取结果");
  expect(send.mock.calls.filter(([r]) => r.url.endsWith("/result"))).toHaveLength(2);
});
