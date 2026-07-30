import { afterEach, describe, expect, it, vi } from "vitest";
import {
  contextLabCreateTask,
  contextLabDetail,
  contextLabHistory,
  subscribeContextLabTaskEvents,
} from "../server/learning";
import {
  getContextLabErrorMessage,
  getContextLabGenerationWarningMessages,
  getContextLabStatusLabel,
  getContextLabStatusTone,
  isContextLabTaskActive,
} from "./contextLabTask";

describe("contextLabTask", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects active and terminal generation states", () => {
    expect(isContextLabTaskActive("pending")).toBe(true);
    expect(isContextLabTaskActive("processing")).toBe(true);
    expect(isContextLabTaskActive("succeeded")).toBe(false);
    expect(isContextLabTaskActive("failed")).toBe(false);
  });

  it("maps statuses to user-facing labels and tones", () => {
    expect(getContextLabStatusLabel("pending")).toBe("等待回调");
    expect(getContextLabStatusLabel("processing")).toBe("处理中");
    expect(getContextLabStatusLabel("succeeded")).toBe("生成完成");
    expect(getContextLabStatusLabel("failed")).toBe("生成失败");
    expect(getContextLabStatusTone("succeeded")).toBe("success");
  });

  it("turns micro validation codes into an actionable user message", () => {
    const message = getContextLabErrorMessage("MICRO_OUTPUT_INVALID");

    expect(message).toBe("生成内容未通过格式校验，请重新生成，系统会自动纠偏重试。");
    expect(message).not.toContain("MICRO_OUTPUT_INVALID");
    expect(getContextLabErrorMessage("AI 服务不可用")).toBe("AI 服务不可用");
  });

  it("shows a safe partial-result message when one generated question type fails", () => {
    expect(
      getContextLabGenerationWarningMessages([
        "QUESTION_TYPE_GENERATION_FAILED",
      ]),
    ).toEqual(["部分题目未通过安全校验，已从练习中移除。"]);
  });

  it("builds context lab async API request contracts", () => {
    const body = {
      sourceType: "custom" as const,
      words: ["fragile", "steady", "recover"],
    };

    expect(contextLabCreateTask(body)).toMatchObject({
      url: "/context-lab/generate-task",
      method: "POST",
      data: body,
    });
    expect(contextLabCreateTask(body).data).not.toHaveProperty(
      "questionContractVersion",
    );
    expect(
      contextLabCreateTask({
        sourceType: "ielts-core",
        proficiencyLevels: [0, 1],
        count: 8,
      }),
    ).toMatchObject({
      url: "/context-lab/generate-task",
      method: "POST",
      data: {
        sourceType: "ielts-core",
        proficiencyLevels: [0, 1],
        count: 8,
      },
    });
    expect(contextLabHistory({ page: 1, pageSize: 10 })).toMatchObject({
      url: "/context-lab/history",
      method: "POST",
      data: { page: 1, pageSize: 10 },
    });
    expect(contextLabDetail({ taskId: 12 })).toMatchObject({
      url: "/context-lab/detail",
      method: "POST",
      data: { taskId: 12 },
    });
    expect(
      contextLabDetail({
        taskId: 12,
        questionContractVersion: 2,
      } as never),
    ).toMatchObject({
      data: { taskId: 12, questionContractVersion: 2 },
    });
  });

  it("parses task updates from the context lab task event stream", async () => {
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode(
            `data: ${JSON.stringify({
              type: "task-updated",
              task: {
                id: 12,
                taskId: 12,
                status: "succeeded",
                sourceType: "custom",
                words: ["fragile", "steady", "recover"],
              },
            })}\n\n`,
          ),
        );
        controller.close();
      },
    });
    const fetchMock = vi.fn(
      async (...args: [RequestInfo | URL, RequestInit?]) => {
        void args;
        return new Response(stream);
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    const updates: unknown[] = [];
    const unsubscribe = subscribeContextLabTaskEvents((task) =>
      updates.push(task),
    );

    await vi.waitFor(() => expect(updates).toHaveLength(1));
    expect(updates[0]).toMatchObject({
      taskId: 12,
      status: "succeeded",
    });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/context-lab/task-events");

    const signal = (fetchMock.mock.calls[0][1] as RequestInit)
      .signal as AbortSignal;
    unsubscribe();
    expect(signal.aborted).toBe(true);
  });

  it("adds V2 capability to the event URL only when explicitly requested", async () => {
    const fetchMock = vi.fn(
      async (...args: [RequestInfo | URL, RequestInit?]) => {
        void args;
        return new Response("");
      },
    );
    vi.stubGlobal("fetch", fetchMock);

    subscribeContextLabTaskEvents(vi.fn(), undefined, 2 as never);

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/context-lab/task-events?questionContractVersion=2",
    );
  });
});
