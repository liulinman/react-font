import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IeltsExamWorkspace } from "./IeltsExamWorkspace";
import type { ContextLabTask, ContextLabSubmitResult } from "../types/learning";

const task: ContextLabTask = {
  id: 31,
  taskId: 31,
  articleExerciseId: 9,
  status: "succeeded",
  sourceType: "custom",
  words: [],
  article:
    "Urban farming supports local communities.\n\nGardens provide fresh food.",
  questions: [
    {
      id: "q1",
      stem: "What do gardens provide?",
      options: ["Fresh food", "Cars"],
    },
    { id: "q2", stem: "Who benefits?", options: ["Communities", "Nobody"] },
  ],
};
const result: ContextLabSubmitResult = {
  score: 50,
  correctCount: 1,
  wrongCount: 1,
  weakWords: [],
  nextSuggestions: [],
  results: [
    {
      questionId: "q1",
      correct: true,
      correctIndex: 0,
      userSelectedIndex: 0,
      explanation: "Food is mentioned.",
    },
  ],
};
const submit = vi.fn();
function mount(userId = 1) {
  return render(
    <IeltsExamWorkspace
      task={task}
      userId={userId}
      onSubmit={submit}
      onExit={() => {}}
    />,
  );
}
function start() {
  fireEvent.click(screen.getByRole("button", { name: "开始考试" }));
}
beforeEach(() => {
  localStorage.clear();
  submit.mockReset().mockResolvedValue(result);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("IELTS exam workspace", () => {
  it("restores answers and review flags for the same user but isolates other users", () => {
    const view = mount();
    start();
    fireEvent.click(screen.getByRole("radio", { name: "A. Fresh food" }));
    fireEvent.click(screen.getAllByRole("checkbox", { name: "待检查" })[0]);
    view.unmount();
    mount();
    expect(screen.getByRole("radio", { name: "A. Fresh food" })).toBeChecked();
    expect(
      screen.getAllByRole("checkbox", { name: "待检查" })[0],
    ).toBeChecked();
    expect(
      screen.getByRole("button", { name: "第 1 题，已答，待检查" }),
    ).toBeInTheDocument();
    cleanup();
    mount(2);
    expect(
      screen.getByRole("button", { name: "开始考试" }),
    ).toBeInTheDocument();
  });
  it("confirms blanks and submits only real answers, then locks completed work", async () => {
    mount();
    start();
    fireEvent.click(screen.getByRole("radio", { name: "A. Fresh food" }));
    fireEvent.click(screen.getByRole("button", { name: "交卷" }));
    expect(screen.getByRole("dialog", { name: "交卷检查" })).toHaveTextContent(
      "1 道题未作答",
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "确认交卷" }));
    });
    expect(submit).toHaveBeenCalledWith({
      sessionId: 9,
      elapsedSeconds: 0,
      answers: [{ questionId: "q1", selectedIndex: 0 }],
    });
    expect(screen.getByRole("radio", { name: "A. Fresh food" })).toBeDisabled();
    expect(screen.getByText("考试已完成")).toBeInTheDocument();
    cleanup();
    mount();
    expect(screen.getByText("考试已完成")).toBeInTheDocument();
    expect(submit).toHaveBeenCalledTimes(1);
  });
  it("uses the deadline across unmount, locks at expiry and preserves answers when submission fails", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T00:00:00Z"));
    submit.mockRejectedValueOnce(new Error("网络不可用"));
    const view = mount();
    start();
    fireEvent.click(screen.getByRole("radio", { name: "A. Fresh food" }));
    view.unmount();
    vi.setSystemTime(new Date("2026-10-14T00:21:00Z"));
    await act(async () => {
      mount();
    });
    expect(screen.getByRole("radio", { name: "A. Fresh food" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent("网络不可用");
    expect(submit).toHaveBeenCalledTimes(1);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "重试交卷" }));
    });
    expect(submit).toHaveBeenLastCalledWith({
      sessionId: 9,
      elapsedSeconds: 1200,
      answers: [{ questionId: "q1", selectedIndex: 0 }],
    });
    expect(screen.getByText("考试已完成")).toBeInTheDocument();
  });
  it("starts a new attempt only after confirmation and preserves the completed result on cancel", async () => {
    mount();
    start();
    fireEvent.click(screen.getByRole("button", { name: "交卷" }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "确认交卷" }));
    });
    fireEvent.click(screen.getByRole("button", { name: "再考一次" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.getByText("考试已完成")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "再考一次" }));
    fireEvent.click(screen.getByRole("button", { name: "确认重新开始" }));
    expect(
      screen.getByRole("button", { name: "开始考试" }),
    ).toBeInTheDocument();
  });

  it("highlights only the selected occurrence and saves its note", () => {
    mount();
    start();
    const passage = screen.getByTestId("exam-text-article");
    const range = document.createRange();
    range.setStart(passage.firstChild!, 0);
    range.setEnd(passage.firstChild!, 13);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent.mouseUp(passage);
    fireEvent.change(screen.getByRole("textbox", { name: "选文笔记" }), {
      target: { value: "主要话题" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存高亮与笔记" }));
    expect(within(passage).getByText("Urban farming").tagName).toBe("MARK");
    cleanup();
    mount();
    expect(screen.getByRole("textbox", { name: "笔记 1" })).toHaveValue(
      "主要话题",
    );
    fireEvent.click(screen.getByRole("button", { name: "删除标注 1" }));
    expect(
      screen.queryByRole("textbox", { name: "笔记 1" }),
    ).not.toBeInTheDocument();
  });
});
