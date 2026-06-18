import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { RecitePage } from "./RecitePage";

const requestMock = vi.fn((requestConfig: unknown) => {
  const config = requestConfig as { url?: string };
  if (config.url === "/recite/start") {
    return Promise.resolve({
      questions: [
        { wordId: 2, question: "脆弱的", direction: 0 },
        { wordId: 5, question: "有复原力的", direction: 0 },
      ],
      direction: 0,
      totalCount: 2,
    });
  }
  return Promise.resolve({});
});

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { username: "tester" },
    logout: vi.fn(),
  }),
}));

vi.mock("../component/SystemSettings", () => ({
  getSystemSettings: () =>
    Promise.resolve({
      wordDictation: {
        dictationCount: 10,
        proficiencyLevels: [0, 1],
        types: [0],
        direction: 0,
      },
    }),
}));

vi.mock("../component/BritishPronunciationButton", () => ({
  BritishPronunciationButton: ({ word }: { word: string }) => (
    <button type="button">play {word}</button>
  ),
}));

describe("RecitePage plan review", () => {
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

  afterEach(() => {
    cleanup();
    requestMock.mockClear();
  });

  it("starts review with word ids from the daily plan query", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter
        initialEntries={[
          "/englishWorld/recite?source=repair&title=修复薄弱词&wordIds=2,5",
        ]}
      >
        <RecitePage />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: /开始今日复习/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: "/recite/start",
          data: expect.objectContaining({
            wordIds: [2, 5],
            wordCount: 2,
          }),
        }),
      );
    });

    expect(await screen.findByText("脆弱的")).toBeInTheDocument();
  });

  it("uses the desktop shell content area so the sidebar does not cover review content", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/englishWorld/recite"]}>
        <RecitePage />
      </MemoryRouter>,
    );

    expect(container.querySelector(".english-world-main")).toBeInTheDocument();
  });
});
