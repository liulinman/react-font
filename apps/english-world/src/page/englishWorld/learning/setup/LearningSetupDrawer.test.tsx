import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { LearningPlanPreviewV1 } from "../contracts/learning-session";
import { LearningSetupDrawer } from "./LearningSetupDrawer";

const { requestMock } = vi.hoisted(() => ({ requestMock: vi.fn() }));

vi.mock("@font/api", async () => {
  const actual = await vi.importActual<typeof import("@font/api")>("@font/api");
  return { ...actual, default: requestMock, request: requestMock };
});

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="当前位置">{location.pathname}</output>;
}

function adaptedPreview(wordIds: number[]): LearningPlanPreviewV1 {
  return {
    wordCount: wordIds.length,
    estimatedSeconds: wordIds.length * 35,
    modeCapabilities: [{ mode: "listening", status: "enabled" }],
    words: wordIds.map((wordId, sourceOrder) => ({
      wordId,
      sourceOrder,
      primaryMode: "listening",
      eligibleModes: ["listening"],
      audioEligibility: "eligible",
      adaptationStatus: "adapted",
    })),
    blocks: [
      {
        mode: "listening",
        wordIds,
        items: wordIds.map((wordId, sourceOrder) => ({
          wordId,
          sourceOrder,
          itemType: "listening_spelling",
        })),
        answerItemCount: wordIds.length,
        estimatedSeconds: wordIds.length * 35,
      },
    ],
  };
}

function renderDrawer(wordIds = [7, 9]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/englishWorld/words"]}>
        <LearningSetupDrawer
          open
          scope={{
            kind: "selection",
            wordIds,
            count: wordIds.length,
            masteryFilterLabel: "已选词条（不限掌握程度）",
          }}
          onClose={vi.fn()}
        />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("LearningSetupDrawer", () => {
  beforeAll(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  beforeEach(() => {
    requestMock.mockReset();
    requestMock.mockImplementation(async (descriptor: { url: string; data?: unknown }) => {
      if (descriptor.url === "/learning-session/capabilities") {
        return {
          modes: [
            { mode: "root_family", status: "coming_soon", reason: "词根词族即将开放" },
            { mode: "micro_scene", status: "coming_soon", reason: "微场景即将开放" },
            { mode: "confusion", status: "coming_soon", reason: "易混辨析即将开放" },
            { mode: "listening", status: "enabled" },
            { mode: "output", status: "coming_soon", reason: "主动输出即将开放" },
          ],
        };
      }
      if (descriptor.url === "/learning-session/preview") {
        return adaptedPreview((descriptor.data as { wordIds: number[] }).wordIds);
      }
      if (descriptor.url === "/learning-session/create") {
        return { sessionId: 31, status: "active", sessionVersion: 1, currentItemId: 101 };
      }
      throw new Error(`unexpected request: ${descriptor.url}`);
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the exact scope, five capabilities and an enabled default listening plan", async () => {
    const user = userEvent.setup();
    renderDrawer();

    expect(screen.getByRole("dialog", { name: "开始混合记忆" })).toBeVisible();
    expect(screen.getByText("本次 2 个词")).toBeInTheDocument();
    expect(screen.getByText("已选词条（不限掌握程度）")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "听音记忆" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "词根词族" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "微场景" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "易混辨析" })).toBeDisabled();
    expect(screen.getByRole("checkbox", { name: "主动输出" })).toBeDisabled();
    expect(await screen.findByText("预计 1 分 10 秒")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "开始混合记忆" }));
    await waitFor(() => {
      expect(screen.getByLabelText("当前位置")).toHaveTextContent(
        "/englishWorld/learn/session/31",
      );
    });

    const createCall = requestMock.mock.calls.find(
      ([descriptor]) => descriptor.url === "/learning-session/create",
    )?.[0] as { data: { wordIds: number[]; selectedModes: string[]; requestUid: string } };
    expect(createCall.data.wordIds).toEqual([7, 9]);
    expect(createCall.data.selectedModes).toEqual(["listening"]);
    expect(createCall.data.requestUid).toEqual(expect.any(String));
  });

  it("keeps create disabled until each unadapted word is explicitly excluded and re-previewed", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation(async (descriptor: { url: string; data?: unknown }) => {
      if (descriptor.url === "/learning-session/capabilities") {
        return { modes: [{ mode: "listening", status: "enabled" }] };
      }
      if (descriptor.url === "/learning-session/preview") {
        const wordIds = (descriptor.data as { wordIds: number[] }).wordIds;
        if (wordIds.includes(9)) {
          return {
            ...adaptedPreview(wordIds),
            words: adaptedPreview(wordIds).words.map((word) =>
              word.wordId === 9
                ? {
                    ...word,
                    primaryMode: undefined,
                    eligibleModes: [],
                    adaptationStatus: "unadapted" as const,
                    audioEligibility: "ineligible" as const,
                    reason: "缺少可用音频",
                  }
                : word,
            ),
          };
        }
        return adaptedPreview(wordIds);
      }
      throw new Error(`unexpected request: ${descriptor.url}`);
    });
    renderDrawer();

    const createButton = screen.getByRole("button", { name: "开始混合记忆" });
    expect(await screen.findByText("词条 #9：缺少可用音频")).toBeInTheDocument();
    expect(createButton).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "排除词条 9" }));
    await waitFor(() => expect(createButton).toBeEnabled());
    const previewCalls = requestMock.mock.calls.filter(
      ([descriptor]) => descriptor.url === "/learning-session/preview",
    );
    expect(previewCalls.at(-1)?.[0].data).toEqual({
      wordIds: [7],
      selectedModes: ["listening"],
    });
  });

  it("reuses the create request UID for a retry of the unchanged payload", async () => {
    const user = userEvent.setup();
    let createAttempts = 0;
    requestMock.mockImplementation(async (descriptor: { url: string; data?: unknown }) => {
      if (descriptor.url === "/learning-session/capabilities") {
        return { modes: [{ mode: "listening", status: "enabled" }] };
      }
      if (descriptor.url === "/learning-session/preview") {
        return adaptedPreview((descriptor.data as { wordIds: number[] }).wordIds);
      }
      if (descriptor.url === "/learning-session/create") {
        createAttempts += 1;
        if (createAttempts === 1) throw { code: "CORS_ERROR", message: "offline" };
        return { sessionId: 31, status: "active", sessionVersion: 1, currentItemId: 101 };
      }
      throw new Error(`unexpected request: ${descriptor.url}`);
    });
    renderDrawer([7]);
    const button = await screen.findByRole("button", { name: "开始混合记忆" });
    await waitFor(() => expect(button).toBeEnabled());

    await user.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("创建失败，请重试");
    await user.click(button);

    const createCalls = requestMock.mock.calls.filter(
      ([descriptor]) => descriptor.url === "/learning-session/create",
    );
    expect(createCalls).toHaveLength(2);
    expect(createCalls[0][0].data.requestUid).toBe(createCalls[1][0].data.requestUid);
    expect(createCalls[0][0].data).toEqual(createCalls[1][0].data);
  });

  it("blocks a scope over twenty words without previewing or creating it", async () => {
    const user = userEvent.setup();
    renderDrawer(Array.from({ length: 21 }, (_, index) => index + 1));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "一次最多 20 个单词",
    );
    const createButton = screen.getByRole("button", { name: "开始混合记忆" });
    expect(createButton).toBeDisabled();
    await user.click(createButton);

    await waitFor(() => {
      expect(
        requestMock.mock.calls.some(
          ([descriptor]) => descriptor.url === "/learning-session/capabilities",
        ),
      ).toBe(true);
    });
    expect(
      requestMock.mock.calls.some(
        ([descriptor]) => descriptor.url === "/learning-session/preview",
      ),
    ).toBe(false);
    expect(
      requestMock.mock.calls.some(
        ([descriptor]) => descriptor.url === "/learning-session/create",
      ),
    ).toBe(false);
  });
});
