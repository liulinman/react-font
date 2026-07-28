import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OverwriteStatsPage } from "./OverwriteStatsPage";

const requestMock = vi.fn();

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
}));

describe("OverwriteStatsPage", () => {
  beforeEach(() => {
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
    requestMock.mockReset();
  });

  it("loads overwritten words ordered by encounter frequency", async () => {
    requestMock.mockResolvedValue({
      page: 1,
      pageSize: 10,
      total: 2,
      totalPages: 1,
      list: [
        {
          id: 7,
          englishWord: "preserve",
          englishChinese: "保存；保护",
          englishPhonetic: "/prɪˈzɜːv/",
          englishLevel: 0,
          englishType: 0,
          englishPartSpeech: [1, 2],
          englishOverwriteCount: 3,
        },
        {
          id: 8,
          englishWord: "mitigate",
          englishChinese: "缓解",
          englishLevel: 1,
          englishType: 0,
          englishPartSpeech: [1],
          englishOverwriteCount: 1,
        },
      ],
    });

    render(<OverwriteStatsPage />);

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/overwriteStats",
        method: "POST",
        data: { page: 1, pageSize: 10 },
        __responseType: undefined,
      });
    });

    expect(await screen.findByText("preserve")).toBeInTheDocument();
    expect(screen.getByText("覆盖 3 次")).toBeInTheDocument();
    expect(screen.getByText("高频覆盖词")).toBeInTheDocument();
    expect(screen.getByText("mitigate")).toBeInTheDocument();
  });
});
