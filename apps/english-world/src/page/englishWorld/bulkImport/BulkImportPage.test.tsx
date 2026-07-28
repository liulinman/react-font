import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BulkImportPage } from "./BulkImportPage";

const requestMock = vi.fn();

vi.mock("@font/api", () => ({
  default: (requestConfig: unknown) => requestMock(requestConfig),
}));

describe("BulkImportPage", () => {
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

  it("previews AI enriched words in a dialog, allows edits, then imports", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config) => {
      if (config.url === "/english/bulkImportWords/preview") {
        return Promise.resolve({
          receivedTextLength: 18,
          extracted: 2,
          aiEnhanced: true,
          items: [
            {
              englishWord: "mitigate",
              englishPhonetic: "/ˈmɪtɪɡeɪt/",
              englishChinese: "减轻，缓解",
              englishType: 0,
              englishLevel: 0,
              englishPartSpeech: [1],
              englishNote: "常见于风险或影响搭配",
            },
            {
              englishWord: "resilient",
              englishChinese: "有复原力的",
              englishType: 0,
              englishLevel: 0,
              englishPartSpeech: [3],
            },
          ],
        });
      }

      if (config.url === "/english/importMissingWords") {
        return Promise.resolve({
          received: 2,
          normalized: 2,
          inserted: 1,
          skippedExisting: 1,
          skippedDuplicate: 0,
          insertedWords: ["mitigate"],
          skippedWords: ["resilient"],
          updated: 0,
          updatedWords: [],
        });
      }

      if (config.url === "/english/importMissingWords/preview") {
        return Promise.resolve({
          received: 2,
          normalized: 2,
          importable: 2,
          skippedExisting: 0,
          skippedDuplicate: 0,
          existingWords: [],
          duplicateWords: [],
        });
      }

      return Promise.reject(new Error("unexpected request"));
    });

    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText("支持换行、逗号、序号、英文 + 中文释义混合粘贴"),
      "mitigate\nresilient",
    );
    await user.click(screen.getByRole("button", { name: /解析预览/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/bulkImportWords/preview",
        method: "POST",
        data: {
          rawText: "mitigate\nresilient",
          defaultLevel: 0,
          maxItems: 120,
          useAi: true,
        },
        __responseType: undefined,
      });
    });
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    const meaningInput = screen.getByLabelText("mitigate 中文释义");
    await user.clear(meaningInput);
    await user.type(meaningInput, "降低风险");

    await user.click(screen.getByRole("button", { name: /确认导入/ }));

    await waitFor(() => {
      expect(requestMock).toHaveBeenCalledWith({
        url: "/english/importMissingWords",
        method: "POST",
        data: {
          overwriteExisting: false,
          words: [
            expect.objectContaining({
              englishWord: "mitigate",
              englishChinese: "降低风险",
            }),
            expect.objectContaining({
              englishWord: "resilient",
            }),
          ],
        },
        __responseType: undefined,
      });
    });
    expect(await screen.findByText("mitigate")).toBeInTheDocument();
    expect(screen.getByText("降低风险")).toBeInTheDocument();
    expect(screen.getByText("已导入")).toBeInTheDocument();
    expect(screen.getAllByText("已存在").length).toBeGreaterThan(0);
  });

  it("lets users choose to overwrite existing words without clearing protected fields", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config) => {
      if (config.url === "/english/bulkImportWords/preview") {
        return Promise.resolve({
          receivedTextLength: 8,
          extracted: 1,
          aiEnhanced: true,
          items: [
            {
              englishWord: "preserve",
              englishPhonetic: "/prɪˈzɜːv/",
              englishChinese: "保存；保护；维护；腌制",
              englishType: 0,
              englishLevel: 0,
              englishPartSpeech: [1, 2],
              englishNote: "保护或保存某物，如食物腌制",
            },
          ],
        });
      }

      if (config.url === "/english/importMissingWords") {
        return Promise.resolve({
          received: 1,
          normalized: 1,
          inserted: 0,
          skippedExisting: 0,
          skippedDuplicate: 0,
          insertedWords: [],
          skippedWords: [],
          updated: 1,
          updatedWords: ["preserve"],
        });
      }

      return Promise.reject(new Error("unexpected request"));
    });

    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText("支持换行、逗号、序号、英文 + 中文释义混合粘贴"),
      "preserve",
    );
    await user.click(screen.getByRole("button", { name: /解析预览/ }));
    await screen.findByRole("dialog");

    await user.click(screen.getByRole("switch", { name: /覆盖已存在词条/ }));
    await user.click(screen.getByRole("button", { name: /确认导入/ }));

    await waitFor(() => {
      const importCall = requestMock.mock.calls.find(
        ([config]) => config.url === "/english/importMissingWords",
      );
      expect(importCall?.[0]).toMatchObject({
        url: "/english/importMissingWords",
        method: "POST",
        data: {
          overwriteExisting: true,
          words: [
            expect.objectContaining({
              englishWord: "preserve",
            }),
          ],
        },
        __responseType: undefined,
      });
      expect(importCall?.[0].data.words[0]).not.toHaveProperty("englishImg");
    });
    expect(await screen.findByText("已覆盖")).toBeInTheDocument();
  });

  it("asks before skipping existing or repeated words when overwrite is off", async () => {
    const user = userEvent.setup();
    requestMock.mockImplementation((config) => {
      if (config.url === "/english/bulkImportWords/preview") {
        return Promise.resolve({
          receivedTextLength: 27,
          extracted: 3,
          aiEnhanced: false,
          items: [
            { englishWord: "mitigate" },
            { englishWord: "resilient" },
            { englishWord: "Mitigate" },
          ],
        });
      }

      if (config.url === "/english/importMissingWords/preview") {
        return Promise.resolve({
          received: 3,
          normalized: 2,
          importable: 1,
          skippedExisting: 1,
          skippedDuplicate: 1,
          existingWords: ["resilient"],
          duplicateWords: ["mitigate"],
        });
      }

      if (config.url === "/english/importMissingWords") {
        return Promise.resolve({
          received: 3,
          normalized: 2,
          inserted: 1,
          skippedExisting: 1,
          skippedDuplicate: 1,
          insertedWords: ["mitigate"],
          skippedWords: ["resilient"],
          updated: 0,
          updatedWords: [],
        });
      }

      return Promise.reject(new Error("unexpected request"));
    });

    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText("支持换行、逗号、序号、英文 + 中文释义混合粘贴"),
      "mitigate\nresilient\nMitigate",
    );
    await user.click(screen.getByRole("button", { name: /解析预览/ }));
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: /确认导入/ }));

    expect(
      await screen.findByText("发现已有或重复词条，是否继续？"),
    ).toBeInTheDocument();
    expect(screen.getByText(/词库中已存在 1 个/)).toBeInTheDocument();
    expect(screen.getByText(/本次输入重复 1 个/)).toBeInTheDocument();
    expect(screen.getByText(/继续后将新增 1 个词条/)).toBeInTheDocument();
    expect(screen.getByText("resilient")).toBeInTheDocument();
    expect(screen.getByText("mitigate")).toBeInTheDocument();
    expect(
      requestMock.mock.calls.some(
        ([config]) => config.url === "/english/importMissingWords",
      ),
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: "继续导入" }));

    await waitFor(() => {
      expect(
        requestMock.mock.calls.some(
          ([config]) => config.url === "/english/importMissingWords",
        ),
      ).toBe(true);
    });
  });

  it("renders AI preview values inside editable fields before confirmation", async () => {
    requestMock.mockResolvedValue({
      receivedTextLength: 18,
      extracted: 2,
      aiEnhanced: true,
      received: 2,
      normalized: 2,
      inserted: 1,
      skippedExisting: 1,
      skippedDuplicate: 0,
      insertedWords: ["mitigate"],
      skippedWords: ["resilient"],
      message: "已导入 1 个词条，跳过 1 个已有/重复词",
      items: [
        {
          englishWord: "mitigate",
          englishPhonetic: "/ˈmɪtɪɡeɪt/",
          englishChinese: "减轻，缓解",
          englishType: 0,
          englishLevel: 0,
          englishPartSpeech: [1],
          englishNote: "常见于风险或影响搭配",
          status: "inserted",
        },
        {
          englishWord: "resilient",
          englishChinese: "有复原力的",
          englishType: 0,
          englishLevel: 0,
          englishPartSpeech: [3],
          status: "existing",
        },
      ],
    });
    const user = userEvent.setup();
    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText("支持换行、逗号、序号、英文 + 中文释义混合粘贴"),
      "mitigate\nresilient",
    );
    await user.click(screen.getByRole("button", { name: /解析预览/ }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByDisplayValue("减轻，缓解")).toBeInTheDocument();
    expect(screen.getByText("AI 已补全")).toBeInTheDocument();
  });

  it("explains when AI fallback preview has no translated fields", async () => {
    requestMock.mockResolvedValue({
      receivedTextLength: 5,
      extracted: 1,
      aiEnhanced: false,
      aiFallbackReason: "empty_ai_response",
      items: [
        {
          englishWord: "foggy",
          englishType: 0,
          englishLevel: 0,
          englishPartSpeech: [9],
          englishNote: "批量导入词条，待复习时补充语境",
        },
      ],
    });
    const user = userEvent.setup();
    render(<BulkImportPage />);

    await user.type(
      screen.getByPlaceholderText("支持换行、逗号、序号、英文 + 中文释义混合粘贴"),
      "foggy",
    );
    await user.click(screen.getByRole("button", { name: /解析预览/ }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("AI 补全未完成")).toBeInTheDocument();
    expect(
      screen.getByText(/AI 返回内容为空，已先用基础字段预览/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("foggy 中文释义")).toHaveValue("");
  });
});
