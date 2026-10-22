import "@testing-library/jest-dom/vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
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
      allowUnanswered: true,
      answers: [{ questionId: "q1", selectedIndex: 0 }, {questionId: "q2", unanswered: true}],
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
      allowUnanswered: true,
      answers: [{ questionId: "q1", selectedIndex: 0 }, {questionId: "q2", unanswered: true}],
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

  function selectPassage(startOffset = 0, endOffset = 13) {
    const passage = screen.getByTestId("exam-text-article");
    const nodes: Text[] = [];
    const walker = document.createTreeWalker(passage, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
    const locate = (offset: number): [Text, number] => {
      for (const node of nodes) {
        if (offset <= node.length) return [node, offset];
        offset -= node.length;
      }
      throw new Error("selection outside text");
    };
    const range = document.createRange();
    range.setStart(...locate(startOffset));
    range.setEnd(...locate(endOffset));
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent.contextMenu(passage, { clientX: 100, clientY: 180 });
    return passage;
  }
  function addNote(note: string) {
    selectPassage();
    fireEvent.click(screen.getByRole("menuitem", { name: "Notes" }));
    fireEvent.change(screen.getByRole("textbox", { name: "选文笔记" }), {
      target: { value: note },
    });
  }
  it("keeps saved notes visible beside their text, and reopens them without scrolling to the last question", () => {
    const longTask = {
      ...task,
      questions: Array.from({ length: 13 }, (_, i) => ({
        ...task.questions![0],
        id: `q${i}`,
      })),
    };
    render(
      <IeltsExamWorkspace
        task={longTask}
        userId={1}
        onSubmit={submit}
        onExit={() => {}}
      />,
    );
    start();
    addNote("重要的原文线索");
    expect(screen.getByRole("textbox", { name: "选文笔记" })).toHaveValue(
      "重要的原文线索",
    );
    expect(
      screen.getByRole("region", { name: "选文标注" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "关闭笔记" }));
    fireEvent.click(
      screen.getByRole("button", { name: "打开笔记：Urban farming" }),
    );
    expect(screen.getByRole("textbox", { name: "选文笔记" })).toHaveValue(
      "重要的原文线索",
    );
    expect(
      document.querySelector(".ielts-exam-questions .ielts-exam-notes"),
    ).not.toBeInTheDocument();
  });
  it("saves and restores annotations when randomUUID is unavailable", () => {
    const descriptor = Object.getOwnPropertyDescriptor(crypto, "randomUUID");
    Object.defineProperty(crypto, "randomUUID", {
      configurable: true,
      value: undefined,
    });
    try {
      mount();
      start();
      addNote("HTTP annotation");
      expect(screen.getByRole("status")).toHaveTextContent("笔记已保存");
      cleanup();
      mount();
      fireEvent.click(
        screen.getByRole("button", { name: "打开笔记：Urban farming" }),
      );
      expect(screen.getByRole("textbox", { name: "选文笔记" })).toHaveValue(
        "HTTP annotation",
      );
    } finally {
      if (descriptor) Object.defineProperty(crypto, "randomUUID", descriptor);
      else Reflect.deleteProperty(crypto, "randomUUID");
    }
  });
  it("keeps the annotation in memory and warns when browser storage fails", () => {
    mount();
    start();
    const storage = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota");
      });
    try {
      addNote("保留在当前页面");
      expect(screen.getByRole("alert")).toHaveTextContent("无法保存到本机");
      expect(screen.getByRole("textbox", { name: "选文笔记" })).toHaveValue(
        "保留在当前页面",
      );
      expect(screen.getByRole("status")).not.toHaveTextContent("笔记已保存");
    } finally {
      storage.mockRestore();
    }
  });
  it("separates Highlight and Notes, and keeps existing notes when highlights overlap", () => {
    mount();
    start();
    addNote("主要话题");
    fireEvent.click(screen.getByRole("button", { name: "关闭笔记" }));
    selectPassage(6, 21);
    fireEvent.click(screen.getByRole("menuitem", { name: "Highlight" }));
    const raw = JSON.parse(
      localStorage.getItem("context-lab:ielts-exam:v1:1:31")!,
    );
    expect(
      raw.annotations.some((a: { note: string }) => a.note === "主要话题"),
    ).toBe(true);
    expect(raw.annotations).toHaveLength(2);
    expect(
      screen.queryByRole("textbox", { name: "选文笔记" }),
    ).not.toBeInTheDocument();
  });
  it("clears only the selected mark and requires explicit confirmation to clear all notes", () => {
    mount();
    start();
    addNote("原文笔记");
    fireEvent.click(screen.getByRole("button", { name: "关闭笔记" }));
    selectPassage(40, 47);
    fireEvent.click(screen.getByRole("menuitem", { name: "Highlight" }));
    selectPassage();
    fireEvent.click(screen.getByRole("menuitem", { name: "Clear all" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(
      screen.getByRole("button", { name: "打开笔记：Urban farming" }),
    ).toBeInTheDocument();
    selectPassage(40, 47);
    fireEvent.click(screen.getByRole("menuitem", { name: "Clear" }));
    expect(
      JSON.parse(localStorage.getItem("context-lab:ielts-exam:v1:1:31")!)
        .annotations,
    ).toHaveLength(1);
    selectPassage();
    fireEvent.click(screen.getByRole("menuitem", { name: "Clear all" }));
    fireEvent.click(screen.getByRole("button", { name: "确认清除全部" }));
    expect(document.querySelectorAll(".ielts-exam mark")).toHaveLength(0);
  });
  it("reopens legacy notes and reuses a note when a new selection overlaps it", () => {
    const time = Date.now();
    localStorage.setItem(
      "context-lab:ielts-exam:v1:1:31",
      JSON.stringify({
        version: 1,
        content: JSON.stringify([
          task.articleExerciseId,
          task.article,
          task.questions,
        ]),
        startedAt: time,
        deadline: time + 1200000,
        endedAt: null,
        answers: {},
        review: [],
        result: null,
        annotations: [
          {
            id: "old-note",
            block: "article",
            start: 0,
            end: 13,
            text: "Urban farming",
            note: "旧版本笔记",
          },
        ],
      }),
    );
    mount();
    fireEvent.click(
      screen.getByRole("button", { name: "打开笔记：Urban farming" }),
    );
    expect(screen.getByRole("textbox", { name: "选文笔记" })).toHaveValue(
      "旧版本笔记",
    );
    fireEvent.click(screen.getByRole("button", { name: "关闭笔记" }));
    selectPassage(6, 13);
    fireEvent.click(screen.getByRole("menuitem", { name: "Notes" }));
    expect(screen.getByRole("textbox", { name: "选文笔记" })).toHaveValue(
      "旧版本笔记",
    );
    const saved = JSON.parse(
      localStorage.getItem("context-lab:ielts-exam:v1:1:31")!,
    );
    expect(saved.annotations).toHaveLength(1);
    expect(saved.annotations[0].start).toBe(0);
  });

  it("does not create an inaccessible note when a nested highlight already exists", () => {
    mount();
    start();
    addNote("原有笔记");
    fireEvent.click(screen.getByRole("button", { name: "关闭笔记" }));
    selectPassage(6, 13);
    fireEvent.click(screen.getByRole("menuitem", { name: "Highlight" }));
    selectPassage(6, 13);
    fireEvent.click(screen.getByRole("menuitem", { name: "Notes" }));
    expect(screen.getByRole("textbox", { name: "选文笔记" })).toHaveValue(
      "原有笔记",
    );
    const saved = JSON.parse(
      localStorage.getItem("context-lab:ielts-exam:v1:1:31")!,
    );
    expect(
      saved.annotations.filter((a: { kind: string }) => a.kind === "note"),
    ).toHaveLength(1);
  });

  it("offers Help and hides the paper without pausing the timer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-19T08:00:00Z"));
    mount();
    start();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByRole("dialog", { name: "Help" })).toHaveTextContent(
      "Notes",
    );
    fireEvent.click(screen.getByRole("button", { name: "关闭帮助" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide" }));
    expect(
      screen.getByRole("dialog", { name: "试卷已隐藏" }),
    ).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60000));
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByRole("timer")).toHaveTextContent("19:00");
  });
});

it("starts only after the source accepts, restores text answers and groups instructions", async () => {
  let accept!: () => void;
  const onStart = vi.fn(() => new Promise<void>(resolve => { accept = resolve; }));
  const textTask = { taskId: 31, article: "Birds have claws.", questions: [
    {id: "a", stem: "Birds have ____.", options: [], kind: "sentence_completion", maxWords: 1, instructions: "ONE WORD ONLY"},
    {id: "b", stem: "They have ____.", options: [], kind: "sentence_completion", maxWords: 1, instructions: "ONE WORD ONLY"},
  ] };
  const view = render(<IeltsExamWorkspace task={textTask} userId={1} onSubmit={submit} onExit={() => {}} onStart={onStart} storageNamespace="reading" allowRestart={false} initialResult={null} />);
  start();
  expect(screen.queryByRole("timer")).not.toBeInTheDocument();
  await act(async () => accept());
  expect(screen.getAllByText("ONE WORD ONLY")).toHaveLength(1);
  fireEvent.change(screen.getByLabelText("第 1 题答案"), {target: {value: "two words"}});
  fireEvent.click(screen.getByRole("button", {name: "交卷"}));
  expect(screen.getAllByRole("alert").some(node => node.textContent?.includes("超过词数限制"))).toBe(true);
  expect(submit).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("第 1 题答案"), {target: {value: "claws"}});
  view.unmount();
  render(<IeltsExamWorkspace task={textTask} userId={1} onSubmit={submit} onExit={() => {}} storageNamespace="reading" allowRestart={false} initialResult={null} />);
  expect(screen.getByLabelText("第 1 题答案")).toHaveValue("claws");
  fireEvent.click(screen.getByRole("button", {name: "交卷"}));
  await act(async () => fireEvent.click(screen.getByRole("button", {name: "确认交卷"})));
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({answers: [{questionId: "a", answerText: "claws"}, {questionId: "b", unanswered: true}]}));
  expect(screen.queryByRole("button", {name: "再考一次"})).not.toBeInTheDocument();
});

it("uses the server result instead of a cached result and never offers restart", () => {
  const view = mount(); start(); view.unmount();
  render(<IeltsExamWorkspace task={task} userId={1} onSubmit={submit} onExit={() => {}} allowRestart={false} initialResult={{...result, correctCount: 2}} />);
  expect(screen.getByText(/答对 2\/2/)).toBeInTheDocument();
  expect(screen.queryByRole("button", {name: "再考一次"})).not.toBeInTheDocument();
});

it("submits over-limit text unchanged on expiry and locks it for retry", async () => {
  vi.useFakeTimers();
  const textTask = {taskId: 5, article: "Text", questions: [{id: "a", stem: "A ____", options: [], kind: "sentence_completion", maxWords: 1}]};
  submit.mockRejectedValue(new Error("Offline"));
  render(<IeltsExamWorkspace task={textTask} userId={1} onSubmit={submit} onExit={() => {}} defaultDuration={10} />);
  start();
  fireEvent.change(screen.getByLabelText("第 1 题答案"), {target: {value: "two words"}});
  await act(async () => vi.advanceTimersByTime(600000));
  expect(submit).toHaveBeenCalledWith(expect.objectContaining({answers: [{questionId: "a", answerText: "two words"}]}));
  expect(screen.getByLabelText("第 1 题答案")).toBeDisabled();
  expect(screen.getByRole("button", {name: "重试交卷"})).toBeInTheDocument();
});

it("shows kind-specific option labels and the same correct-answer label", async () => {
  const mixed = {taskId: 6, article: "Passage", questions: [
    {id: "a", stem: "Match", options: ["A Alice", "B. Bob"], kind: "matching_features"},
    {id: "b", stem: "Is it true?", options: ["True", "False", "Not Given"], kind: "true_false_not_given"},
  ]};
  submit.mockResolvedValue({...result, results: [{questionId:"a", correct:true, correctIndex:0, userSelectedIndex:0, explanation:""}, {questionId:"b", correct:true, correctIndex:0,userSelectedIndex:0,explanation:""}]});
  render(<IeltsExamWorkspace task={mixed} userId={1} onSubmit={submit} onExit={() => {}} />);
  start();
  fireEvent.click(screen.getByRole("radio", {name:"A Alice"}));
  fireEvent.click(screen.getByRole("radio", {name:"True"}));
  expect(screen.queryByRole("radio", {name:"A. A Alice"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"交卷"}));
  await act(async () => fireEvent.click(screen.getByRole("button", {name:"确认交卷"})));
  expect(screen.getByText("正确答案：A Alice")).toBeInTheDocument();
  expect(screen.getByText("正确答案：True")).toBeInTheDocument();
});

it("replaces stale-tab answers with exactly the answers in the authoritative result", async () => {
  const mixed = {taskId: 7, article: "Passage", questions: [
    {id:"a", stem:"A ____",options:[],kind:"sentence_completion"},
    {id:"b", stem:"Choose",options:["First","Second"]},
    {id:"c", stem:"Blank ____",options:[],kind:"sentence_completion"},
  ]};
  submit.mockResolvedValue({...result, correctCount:2, results:[
    {questionId:"a",answerText:"server",acceptedAnswers:["server"],correct:true,correctIndex:null,explanation:""},
    {questionId:"b",userSelectedIndex:1,correctIndex:1,correct:true,explanation:""},
    {questionId:"c",correctIndex:null,correct:false,explanation:""},
  ]});
  render(<IeltsExamWorkspace task={mixed} userId={1} onSubmit={submit} onExit={() => {}} />);
  start();
  fireEvent.change(screen.getByLabelText("第 1 题答案"), {target:{value:"stale"}});
  fireEvent.click(screen.getByRole("radio", {name:"A. First"}));
  fireEvent.change(screen.getByLabelText("第 3 题答案"), {target:{value:"stale blank"}});
  fireEvent.click(screen.getByRole("button", {name:"交卷"}));
  await act(async () => fireEvent.click(screen.getByRole("button", {name:"确认交卷"})));
  expect(screen.getByLabelText("第 1 题答案")).toHaveValue("server");
  expect(screen.getByRole("radio", {name:"B. Second"})).toBeChecked();
  expect(screen.getByLabelText("第 3 题答案")).toHaveValue("");
  expect(screen.getByText("未作答")).toBeInTheDocument();
  expect(screen.getByText(/答对 2\/3/)).toBeInTheDocument();
});

it("switches the mobile pane when a question number is selected", () => {
  mount(); start();
  expect(document.querySelector(".ielts-exam-panes")).toHaveAttribute("data-mobile-pane", "passage");
  fireEvent.click(screen.getByRole("button", {name:"第 2 题，未答"}));
  expect(screen.getByText("作答题目")).toHaveAttribute("aria-pressed", "true");
  expect(document.querySelector(".ielts-exam-panes")).toHaveAttribute("data-mobile-pane", "questions");
  fireEvent.click(screen.getAllByText("阅读文章").find(element => element.tagName === "BUTTON")!);
  expect(document.querySelector(".ielts-exam-panes")).toHaveAttribute("data-mobile-pane", "passage");
});
