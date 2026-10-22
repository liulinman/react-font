import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { ReadingPracticeReader } from "./ReadingPracticeReader";
const send = vi.hoisted(() => vi.fn());
vi.mock("@font/api", () => ({ default: send }));
const paper = { id: 1, title: "Garden study", paragraphs: ["Gardens help communities."], ieltsBand: null, status: "published", started: false, submitted: false, questions: [{ id: "q1", kind: "choice", stem: "What helps?", options: ["Food", "Cars", "Oil"] }] };
afterEach(() => { cleanup(); localStorage.clear(); vi.clearAllMocks(); });
function mount(userId = 7) { return render(<MemoryRouter><ReadingPracticeReader practiceId={1} basePath="/reading" userId={userId} /></MemoryRouter>); }
it("requires explicit successful server start before answer controls", async () => {
 send.mockImplementation(async (r: any) => { if (r.url.endsWith("/start")) throw new Error("offline"); return paper; });
 const user = userEvent.setup(); mount();
 expect(await screen.findByRole("button", { name: "开始考试" })).toBeEnabled();
 expect(screen.queryByRole("radio")).not.toBeInTheDocument();
 await user.click(screen.getByRole("button", { name: "开始考试" }));
 expect(await screen.findByRole("alert")).toHaveTextContent("offline");
 expect(screen.queryByRole("radio")).not.toBeInTheDocument();
});
it("keeps reading drafts isolated by user", async () => {
 send.mockImplementation(async (r: any) => r.url.endsWith("/start") ? {} : paper);
 const user = userEvent.setup(); const first = mount();
 await user.click(await screen.findByRole("button", { name: "开始考试" }));
 await user.click(screen.getByRole("radio", { name: /Food/ }));
 first.unmount(); mount(8);
 await user.click(await screen.findByRole("button", { name: "开始考试" }));
 expect(screen.getAllByRole("radio").every(r => !(r as HTMLInputElement).checked)).toBe(true);
});
it("feedback preserves answer and does not disclose grading before submission", async () => {
 send.mockImplementation(async (r: any) => r.url.endsWith("/feedback") ? r.method === "POST" ? { id: "f1", ...r.data, status: "pending" } : { list: [] } : r.url.endsWith("/start") ? {} : paper);
 const user = userEvent.setup(); mount();
 await user.click(await screen.findByRole("button", { name: "开始考试" }));
 const option = screen.getByRole("radio", { name: /Food/ }); await user.click(option);
 await user.click(screen.getByRole("button", { name: "反馈题目问题" }));
 await user.type(screen.getByRole("textbox"), "The wording is unclear");
 await user.click(screen.getByRole("button", { name: "提交反馈" }));
 await screen.findByText("待处理"); expect(option).toBeChecked();
 expect(screen.queryByText(/正确答案：/)).not.toBeInTheDocument();
});
it("does not open an unstarted withdrawn paper", async () => {
 send.mockResolvedValue({ ...paper, status: "withdrawn" }); mount();
 await screen.findByText("练习已撤回");
 expect(screen.queryByRole("button", { name: "开始考试" })).not.toBeInTheDocument();
});
