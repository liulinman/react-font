import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { EditAddModal } from "./EditAddModal";

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock("@font/api", () => ({
  default: requestMock,
}));

vi.mock("@/server", () => ({
  uploadFile: vi.fn((data: FormData) => ({
    url: "/upload/file",
    method: "POST",
    data,
  })),
}));

describe("EditAddModal AI completion", () => {
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
    requestMock.mockResolvedValue({
      words: [
        {
          word: "confront",
          phonetic: "/kənˈfrʌnt/",
          meaning: "面对；对抗",
          partOfSpeech: [1],
          examples: [],
          ieltsCase: null,
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
    requestMock.mockReset();
  });

  it("auto-fills empty add-word fields from AI after the word input settles", async () => {
    render(
      <EditAddModal
        isModalVisible
        type="add"
        onOk={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    fireEvent.change(screen.getByLabelText("单词名"), {
      target: { value: "confront" },
    });

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    expect(requestMock).toHaveBeenCalledWith({
      url: "/word-agent/query",
      method: "POST",
      data: { word: "confront" },
      __responseType: undefined,
    });

    await waitFor(() => {
      expect(screen.getByLabelText("音标")).toHaveValue("/kənˈfrʌnt/");
      expect(screen.getByLabelText("中文")).toHaveValue("面对；对抗");
    });
    expect(screen.getByText("动词").closest(".ant-tag")).toHaveClass(
      "ant-tag-checkable-checked",
    );
  });

  it("does not query AI for consonant-only gibberish", async () => {
    render(
      <EditAddModal
        isModalVisible
        type="add"
        onOk={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    fireEvent.change(screen.getByLabelText("单词名"), {
      target: { value: "dfjdfj" },
    });

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    expect(requestMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("音标")).toHaveValue("");
    expect(screen.getByLabelText("中文")).toHaveValue("");
  });

  it("ignores AI completion when the returned word does not match the input", async () => {
    requestMock.mockResolvedValueOnce({
      words: [
        {
          word: "hello",
          phonetic: "/həˈləʊ/",
          meaning: "你好，喂",
          partOfSpeech: [8],
          examples: [],
          ieltsCase: null,
        },
      ],
    });
    render(
      <EditAddModal
        isModalVisible
        type="add"
        onOk={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    fireEvent.change(screen.getByLabelText("单词名"), {
      target: { value: "illustrate" },
    });

    await new Promise((resolve) => window.setTimeout(resolve, 700));

    expect(requestMock).toHaveBeenCalledWith({
      url: "/word-agent/query",
      method: "POST",
      data: { word: "illustrate" },
      __responseType: undefined,
    });
    expect(screen.getByLabelText("单词名")).toHaveValue("illustrate");
    expect(screen.getByLabelText("音标")).toHaveValue("");
    expect(screen.getByLabelText("中文")).toHaveValue("");
    expect(screen.getByText("感叹词").closest(".ant-tag")).not.toHaveClass(
      "ant-tag-checkable-checked",
    );
  });
});
