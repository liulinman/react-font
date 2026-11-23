import "@testing-library/jest-dom/vitest";
import {
  render,
  act,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const request = vi.hoisted(() => vi.fn());
const audioRequest=vi.hoisted(()=>vi.fn());
vi.mock("@/aiListening/api", () => ({
  listeningFetch: request,
  audioFetch: audioRequest,
  requestUid: () => crypto.randomUUID(),
}));
import IeltsListeningPage from "./IeltsListeningPage";
import type {Attempt} from "./types";
const initial = ():Attempt => ({
  id: "attempt-1",
  revision: 0,
  material: {
    id: "material-1",
    title: "Booking",
    status: "ready",
    source: "AI原创模拟",
    requestedParts: [1],
    completedParts: 1,
    sections: [
      {
        part: 1,
        title: "Booking",
        audioCount: 1,
        groups: [
          {
            kind: "completion",
            title: "Booking form",
            instruction: "ONE WORD ONLY",
            questions: [{ id: 1, prompt: "Day", before: "Day:" }],
          },
        ],
      },
    ],
  },
  mode: "training",
  status: "ready",
  answers: {},
  flags: [],
  played: 0,
  interrupted: false,
  assists: { replays: 0, slow: false },
  result: null,
});
describe("IELTS attempt recovery", () => {
  let state: Attempt, submissionFailure: boolean, savingFailure: boolean, reflectionFailure: boolean;
  beforeEach(() => {
    sessionStorage.clear();
    state = initial();
    audioRequest.mockReset().mockResolvedValue(new Blob(["audio"],{type:"audio/mpeg"}));
    submissionFailure = false;
    savingFailure = false;
    reflectionFailure = false;
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
    URL.createObjectURL = vi.fn(() => "blob:fixture");
    URL.revokeObjectURL = vi.fn();
    request.mockImplementation(async (path: string, body?: {event:string;answers:Record<string,string>;flags:number[];questionId:number;cause:string}) => {
      if (path.endsWith("/attempts/attempt-1")) {
        if (!body) return structuredClone(state);
        if (body.event === "reflect") {
          if (reflectionFailure) throw new Error("复盘网络失败");
          state.reflections = {...state.reflections, [body.questionId]: body.cause};
        } else if (body.event === "submit") {
          if (submissionFailure) throw new Error("网络中断");
          state.result = {
            score: 1,
            total: 1,
            items: [
              {
                id: 1,
                answer: body.answers[1],
                accepted: ["Monday"],
                correct: true,
                reason: "正确",
                evidence: "On Monday.",
                explanation: "录音明确说明预约在星期一。",
              },
            ],
            sections: [{ part: 1, title: "Booking", transcript: "On Monday." }],
          };
          state.status = "submitted";
        } else if (body.event === "start") state.status = "playing";
        else if (body.event === "save") {
          if (savingFailure) throw new Error("保存失败");
          state.answers = body.answers;
          state.flags = body.flags;
        } else if (body.event === "interrupt") state.interrupted = true;
        state.revision++;
        return structuredClone(state);
      }
      if(path.endsWith("/attempts"))return [{id:state.id,title:"Booking",mode:"training",status:"ready",interrupted:false,createdAt:0}];
      return [];
    });
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });
  const mount = () =>
    render(
      <MemoryRouter
        initialEntries={["/englishWorld/ielts-listening?attempt=attempt-1"]}
      >
        <IeltsListeningPage />
      </MemoryRouter>,
    );
  it("hides the previous result while navigating back to the material library", async () => {
    state.status = "submitted";
    state.result = {score: 0, total: 1, items: [], sections: [{part: 1, title: "Booking", transcript: "SECRET OLD TRANSCRIPT"}]};
    mount();
    await screen.findByText("本次结果 0 / 1");
    fireEvent.click(screen.getByRole("button", {name: "返回材料与记录"}));
    expect(screen.queryByText("本次结果 0 / 1")).not.toBeInTheDocument();
  });
  it("keeps transcript and replay in separate post-submit panels", async () => {
    state.status = "submitted";
    state.result = {score: 0, total: 1, items: [], sections: [{part: 1, title: "Booking", transcript: "SECRET OLD TRANSCRIPT"}]};
    mount();
    await screen.findByText("本次结果 0 / 1");
    expect(screen.queryByText("SECRET OLD TRANSCRIPT")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "回听第1段"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "原文"}));
    expect(screen.getByText("SECRET OLD TRANSCRIPT")).toBeInTheDocument();
    expect(screen.queryByRole("button", {name: "回听第1段"})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", {name: "回听"}));
    expect(screen.queryByText("SECRET OLD TRANSCRIPT")).not.toBeInTheDocument();
    expect(screen.getByRole("button", {name: "回听第1段"})).toBeInTheDocument();
  });
  it("keeps the playing status steady while advancing between audio segments", async () => {
    state.material.sections[0].audioCount = 2;
    const view = mount();
    const start = await screen.findByRole("button", {name: "开始听力"});
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
    await screen.findByText("音频正在播放");
    const media = view.container.querySelector("audio")!;
    fireEvent.ended(media);
    fireEvent.pause(media);
    expect(screen.getByText("音频正在播放")).toBeInTheDocument();
    expect(screen.queryByText("连接下一段…")).not.toBeInTheDocument();
    await waitFor(() => expect(request.mock.calls.some(([, body]) => body?.event === "segment-ended")).toBe(true));
  });
  it("does not restart the next segment after a pause during a pending transition", async () => {
    state.material.sections[0].audioCount = 2;
    const handler = request.getMockImplementation()!;
    let resolveTransition: ((value: Attempt) => void) | undefined;
    request.mockImplementation((path, body) => body?.event === "segment-ended"
      ? new Promise(resolve => {resolveTransition = resolve;}) : handler(path, body));
    const view = mount();
    const start = await screen.findByRole("button", {name: "开始听力"});
    await waitFor(() => expect(start).toBeEnabled());
    fireEvent.click(start);
    await screen.findByText("音频正在播放");
    const media = view.container.querySelector("audio")!;
    fireEvent.ended(media);
    await waitFor(() => expect(resolveTransition).toBeDefined());
    const playsBeforePause = vi.mocked(HTMLMediaElement.prototype.play).mock.calls.length;
    fireEvent.click(screen.getByRole("button", {name: "暂停"}));
    await act(async () => { resolveTransition!(structuredClone(state)); });
    expect(vi.mocked(HTMLMediaElement.prototype.play)).toHaveBeenCalledTimes(playsBeforePause);
    expect(screen.queryByText("音频正在播放")).not.toBeInTheDocument();
  });
  it("freezes and retains a failed submit across refresh, then permits retry", async () => {
    mount();
    const startButton = await screen.findByRole("button", { name: "开始听力" });
    await waitFor(() => expect(startButton).toBeEnabled());
    fireEvent.click(startButton);
    await waitFor(() =>
      expect(screen.getByLabelText("第1题 Day")).not.toBeDisabled(),
    );
    fireEvent.change(screen.getByLabelText("第1题 Day"), {
      target: { value: "Monday" },
    });
    fireEvent.click(screen.getByRole("button", { name: "检查并交卷" }));
    submissionFailure = true;
    fireEvent.click(screen.getByRole("button", { name: "确认交卷" }));
    await screen.findByText("网络中断");
    expect(screen.getByRole("alert").closest(".ielts-listening")).toBeNull();
    expect(screen.getByRole("alert").parentElement).toHaveClass("ielts-feedback");
    const stored = JSON.parse(
      sessionStorage.getItem("freewing:ielts:attempt-1")!,
    );
    expect(stored.answers["1"]).toBe("Monday");
    expect(stored.frozen).toBe(true);
    expect(screen.getByLabelText("第1题 Day")).toBeDisabled();
    cleanup();
    submissionFailure = false;
    mount();
    await waitFor(() =>
      expect(screen.getByLabelText("第1题 Day")).toHaveValue("Monday"),
    );
    fireEvent.click(screen.getByRole("button", { name: "检查并交卷" }));
    fireEvent.click(screen.getByRole("button", { name: "确认交卷" }));
    await screen.findByText("本次结果 1 / 1");
    expect(sessionStorage.getItem("freewing:ielts:attempt-1")).toBeNull();
  });
  it("freezes the latest unsaved input at deadline and retries that snapshot after refresh", async () => {
    state.mode = "simulation";
    state.status = "checking";
    state.deadline = Date.now() + 1800;
    savingFailure = true;
    submissionFailure = true;
    mount();
    const input = await screen.findByLabelText("第1题 Day");
    fireEvent.change(input, { target: { value: "Monday" } });
    await screen.findByText("保存失败");
    await screen.findByText("网络中断", {}, {timeout: 4000});
    expect(input).toBeDisabled();
    expect(JSON.parse(sessionStorage.getItem("freewing:ielts:attempt-1")!).answers).toEqual({"1":"Monday"});
    cleanup();
    submissionFailure = false;
    savingFailure = false;
    mount();
    await screen.findByText("本次结果 1 / 1", {}, {timeout: 4000});
    expect(state.result?.items[0].answer).toBe("Monday");
    expect(state.interrupted).toBe(true);
    expect(screen.getByText(/不计严格一次听成绩/)).toBeInTheDocument();
  });
  it("waits for freshly downloaded audio when reopening the same record",async()=>{
    let finish:((blob:Blob)=>void)|undefined;
    audioRequest.mockReset().mockResolvedValueOnce(new Blob(["first"],{type:"audio/mpeg"})).mockImplementationOnce(()=>new Promise<Blob>(resolve=>{finish=resolve;}));
    mount();await waitFor(()=>expect(screen.getByRole("button",{name:"开始听力"})).toBeEnabled());
    fireEvent.click(screen.getByRole("button",{name:"返回材料与记录"}));
    fireEvent.click(await screen.findByRole("button",{name:"继续作答"}));
    await waitFor(()=>expect(audioRequest).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button",{name:"开始听力"})).toBeDisabled();
    finish?.(new Blob(["second"],{type:"audio/mpeg"}));
    await waitFor(()=>expect(screen.getByRole("button",{name:"开始听力"})).toBeEnabled());
  });
  it("saves only self-selected reflections, preserves scores and reports retryable failures", async () => {
    state.status = "submitted";
    state.result = {score: 0, total: 1, items: [{id: 1, answer: "", correct: false, reason: "未作答", accepted: ["Monday"], evidence: "On Monday.", explanation: "录音明确说明预约在星期一。"}], sections: []};
    const original = structuredClone(state.result);
    mount();
    expect(await screen.findByText("中文解释：录音明确说明预约在星期一。")).toBeInTheDocument();
    const reflection = screen.getByLabelText("第1题 自选错因");
    expect(reflection).toHaveValue("");
    fireEvent.change(reflection, {target: {value: "词不认识"}});
    await screen.findByText("第1题错因已保存");
    expect(screen.getByText("第1题错因已保存").closest(".ielts-listening")).toBeNull();
    expect(state.reflections).toEqual({"1":"词不认识"});
    expect(state.result).toEqual(original);
    cleanup(); mount();
    await waitFor(() => expect(screen.getByLabelText("第1题 自选错因")).toHaveValue("词不认识"));
    reflectionFailure = true;
    fireEvent.change(screen.getByLabelText("第1题 自选错因"), {target: {value: "跟丢"}});
    await screen.findByText("复盘网络失败");
    expect(screen.getByText("第1题错因尚未保存，请重新选择重试")).toBeInTheDocument();
    expect(state.reflections).toEqual({"1":"词不认识"});
    reflectionFailure = false;
    fireEvent.change(screen.getByLabelText("第1题 自选错因"), {target: {value: ""}});
    await screen.findByText("第1题错因已保存");
    expect(state.reflections?.["1"]).toBe("");
    expect(state.result).toEqual(original);
  });
  it("explicitly marks an unavailable transcript instead of displaying an empty review", async () => {
    state.result = {score: 0, total: 1, items: [], sections: [{part: 1, title: "Booking", transcript: ""}]};
    state.status = "submitted";
    mount();
    fireEvent.click(await screen.findByRole("button", {name: "原文"}));
    expect(await screen.findByText("本部分原文暂不可用，请使用整段回听。" )).toBeInTheDocument();
  });
  it("starts with optional blank topic and Part 1 mixed training, creates without a fabricated topic and exposes extra filters on demand", async () => {
    const material = initial().material;
    request.mockImplementation(async (path: string, body?: unknown) => path.endsWith("/materials") ? body ? material : [] : []);
    render(<MemoryRouter initialEntries={["/englishWorld/ielts-listening"]}><IeltsListeningPage /></MemoryRouter>);
    await screen.findByText("暂无材料，生成一份原创材料开始练习。");
    expect(screen.getByLabelText("主题（选填）")).toHaveValue("");
    expect(screen.getByRole("button", {name: "Part 1 生活对话 · 10题"})).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("题型")).toHaveValue("mixed");
    expect(screen.getByLabelText("作答模式")).toHaveValue("training");
    const filters = screen.getByText("更多筛选").closest("details")!;
    expect(filters).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("更多筛选"));
    expect(filters).toHaveAttribute("open");
    const create = screen.getByRole("button", {name: "生成原创材料"});
    expect(create).toBeEnabled(); fireEvent.click(create);
    await waitFor(() => expect(request.mock.calls.some(([path, body]) => path.endsWith("/materials") && body?.parts === "single" && body?.part === 1 && body?.kind === "mixed" && !Object.prototype.hasOwnProperty.call(body, "topic"))).toBe(true));
  });
  it("sends a deliberate optional topic and switches the full-paper selection accessibly", async () => {
    request.mockImplementation(async (path: string, body?: unknown) => path.endsWith("/materials") ? body ? initial().material : [] : []);
    render(<MemoryRouter initialEntries={["/englishWorld/ielts-listening"]}><IeltsListeningPage /></MemoryRouter>);
    await screen.findByText("暂无材料，生成一份原创材料开始练习。");
    fireEvent.click(screen.getByRole("button", {name: "四部分 完整模拟 · 40题"}));
    expect(screen.getByRole("button", {name: "四部分 完整模拟 · 40题"})).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(screen.getByLabelText("主题（选填）"), {target:{value:"  校园参观  "}});
    fireEvent.click(screen.getByRole("button", {name: "生成原创材料"}));
    await waitFor(() => expect(request.mock.calls.some(([path, body]) => path.endsWith("/materials") && body?.parts === "full" && body?.topic === "校园参观")).toBe(true));
  });
  it("filters topics independently of titles and uses explicit server completion without guessing unknown history", async () => {
    const a = {...initial().material, id: "one", title: "Northern tour", topic: "harbour survey", completed: true};
    const b = {...initial().material, id: "two", title: "Southern tour", topic: "library visit", completed: false};
    const unknown = {...initial().material, id: "three", title: "Unknown history"};
    request.mockImplementation(async (path: string) => path.endsWith("/materials") ? [a,b,unknown] : []);
    render(<MemoryRouter initialEntries={["/englishWorld/ielts-listening"]}><IeltsListeningPage /></MemoryRouter>);
    await screen.findByText("Northern tour");
    fireEvent.change(screen.getByLabelText("搜索材料或主题"), {target: {value: "harbour"}});
    expect(screen.getByText("Northern tour")).toBeInTheDocument();
    expect(screen.queryByText("Southern tour")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("搜索材料或主题"), {target: {value: ""}});
    fireEvent.change(screen.getByLabelText("完成状态"), {target: {value: "uncompleted"}});
    expect(screen.getByText("Southern tour")).toBeInTheDocument();
    expect(screen.queryByText("Northern tour")).not.toBeInTheDocument();
    expect(screen.queryByText("Unknown history")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("完成状态"), {target: {value: "completed"}});
    expect(screen.getByText("Northern tour")).toBeInTheDocument();
    expect(screen.queryByText("Southern tour")).not.toBeInTheDocument();
  });
  it("shows preparation after refresh and lets the owner delete only after confirmation", async () => {
    const pending = {...initial().material, status: "preparing", owner: true, canPrepare: true, canResume: false, completedParts: 0};
    request.mockImplementation(async (path: string) => path.endsWith("/materials") ? [pending] : []);
    render(<MemoryRouter><IeltsListeningPage /></MemoryRouter>);
    await screen.findByText("正在准备，页面会自动更新");
    expect(screen.getByRole("button", {name:"删除"})).toBeDisabled();
    cleanup();
    const ready = {...pending, status: "ready", completedParts: 1};
    request.mockImplementation(async (path: string) => path.endsWith("/materials") ? [ready] : []);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<MemoryRouter><IeltsListeningPage /></MemoryRouter>);
    await screen.findByText("Booking");
    fireEvent.click(screen.getByRole("button", {name:"删除"}));
    await waitFor(() => expect(request).toHaveBeenCalledWith("/ielts-listening/materials/material-1/delete", {}));
  });
  it("does not expose transcript or standards until a persisted result exists", async () => {
    mount();
    await screen.findByText("Booking form");
    expect(screen.queryByText("On Monday.")).not.toBeInTheDocument();
    expect(screen.queryByText("标准答案")).not.toBeInTheDocument();
  });
});
