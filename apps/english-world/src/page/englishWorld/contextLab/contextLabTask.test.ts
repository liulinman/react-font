import { describe, expect, it } from "vitest";
import {
  contextLabCreateTask,
  contextLabDetail,
  contextLabHistory,
} from "../server/learning";
import {
  getContextLabStatusLabel,
  getContextLabStatusTone,
  isContextLabTaskActive,
} from "./contextLabTask";

describe("contextLabTask", () => {
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
  });
});
