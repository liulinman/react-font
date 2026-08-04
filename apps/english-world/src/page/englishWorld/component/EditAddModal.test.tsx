import "@testing-library/jest-dom/vitest";
import { createElement } from "react";
import type { ModalProps } from "antd";
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

vi.mock("antd", async () => {
  const actual = await vi.importActual<typeof import("antd")>("antd");
  return {
    ...actual,
    Modal: (props: ModalProps) =>
      createElement(actual.Modal, {
        ...props,
        transitionName: "",
        maskTransitionName: "",
      }),
  };
});

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
          inputStatus: "exact",
          correctionReason: "",
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
          inputStatus: "exact",
          correctionReason: "",
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

  it("shows an inflection decision and applies it only after explicit use", async () => {
    requestMock.mockResolvedValueOnce({
      words: [
        {
          word: "run",
          inputStatus: "inflected",
          correctionReason: "这是 run 的现在分词",
          phonetic: "/rʌn/",
          meaning: "跑；运行",
          partOfSpeech: [1],
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
      target: { value: "running" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    expect(screen.getByText(/running → run/)).toBeVisible();
    expect(screen.getByLabelText("单词名")).toHaveValue("running");
    expect(screen.getByLabelText("音标")).toHaveValue("");
    expect(screen.getByLabelText("中文")).toHaveValue("");

    fireEvent.change(screen.getByLabelText("中文"), {
      target: { value: "手填含义" },
    });
    fireEvent.click(screen.getByRole("button", { name: "使用建议" }));

    expect(screen.getByLabelText("单词名")).toHaveValue("run");
    expect(screen.getByLabelText("音标")).toHaveValue("/rʌn/");
    expect(screen.getByLabelText("中文")).toHaveValue("手填含义");
    expect(screen.queryByText(/running → run/)).not.toBeInTheDocument();
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it("labels a spelling correction before the user chooses an action", async () => {
    requestMock.mockResolvedValueOnce({
      words: [
        {
          word: "receive",
          inputStatus: "misspelled",
          correctionReason: "i 和 e 的顺序错误",
          phonetic: "/rɪˈsiːv/",
          meaning: "收到",
          partOfSpeech: [1],
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
      target: { value: "recieve" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    expect(screen.getByText(/可能拼写错误/)).toHaveTextContent(
      "recieve → receive",
    );
    expect(screen.getByLabelText("单词名")).toHaveValue("recieve");
  });

  it("keeps the original word and queries it again after the input changes away and back", async () => {
    const runningResponse = {
      words: [
        {
          word: "run",
          inputStatus: "inflected",
          correctionReason: "这是 run 的现在分词",
          phonetic: "/rʌn/",
          meaning: "跑；运行",
          partOfSpeech: [1],
          examples: [],
          ieltsCase: null,
        },
      ],
    };
    requestMock
      .mockResolvedValueOnce(runningResponse)
      .mockResolvedValueOnce({
        words: [
          {
            word: "confront",
            inputStatus: "uncertain",
            correctionReason: "",
            phonetic: "/unused/",
            meaning: "不应填充",
            partOfSpeech: [1],
            examples: [],
            ieltsCase: null,
          },
        ],
      })
      .mockResolvedValueOnce(runningResponse);
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
      target: { value: "running" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    fireEvent.click(screen.getByRole("button", { name: "保留原词" }));

    expect(screen.getByLabelText("单词名")).toHaveValue("running");
    expect(screen.getByLabelText("音标")).toHaveValue("");
    expect(screen.queryByText(/running → run/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("单词名"), {
      target: { value: "confront" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    fireEvent.change(screen.getByLabelText("单词名"), {
      target: { value: "running" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    expect(requestMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText(/running → run/)).toBeVisible();
  });

  it("submits the original word while a correction decision is pending", async () => {
    const onOk = vi.fn();
    requestMock.mockResolvedValueOnce({
      words: [
        {
          word: "run",
          inputStatus: "inflected",
          correctionReason: "这是 run 的现在分词",
          phonetic: "/rʌn/",
          meaning: "跑；运行",
          partOfSpeech: [1],
          examples: [],
          ieltsCase: null,
        },
      ],
    });
    render(
      <EditAddModal
        isModalVisible
        type="add"
        onOk={onOk}
        onCancel={vi.fn()}
      />,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    fireEvent.change(screen.getByLabelText("单词名"), {
      target: { value: "running" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    expect(screen.getByText(/running → run/)).toBeVisible();

    fireEvent.click(screen.getByRole("button", { name: /确\s*认/ }));
    await waitFor(() =>
      expect(onOk).toHaveBeenCalledWith(
        expect.objectContaining({ englishWord: "running" }),
        "add",
      ),
    );
  });

  it("keeps a rejected AI lookup non-blocking", async () => {
    requestMock.mockRejectedValueOnce(new Error("AI 暂时不可用"));
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
      target: { value: "running" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    expect(await screen.findByText("AI 暂时不可用")).toBeVisible();
    expect(screen.queryByRole("button", { name: "使用建议" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("单词名")).toHaveValue("running");
    expect(screen.getByRole("button", { name: /确\s*认/ })).toBeEnabled();
  });

  it("does not query AI when the word changes in edit mode", async () => {
    render(
      <EditAddModal
        isModalVisible
        type="edit"
        currentRecord={
          {
            id: 1,
            englishWord: "confront",
            englishLevel: 0,
            englishType: 0,
          } as never
        }
        onOk={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    fireEvent.change(screen.getByLabelText("单词名"), {
      target: { value: "running" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    expect(requestMock).not.toHaveBeenCalled();
  });

  it.each([
    { input: "confront", returnedWord: "confront", expectedPhonetic: "/legacy/" },
    { input: "illustrate", returnedWord: "hello", expectedPhonetic: "" },
  ])(
    "safely handles a legacy response for $input",
    async ({ input, returnedWord, expectedPhonetic }) => {
      requestMock.mockResolvedValueOnce({
        words: [{
          word: returnedWord,
          phonetic: "/legacy/",
          meaning: "旧响应",
          partOfSpeech: [1],
          examples: [],
          ieltsCase: null,
        }],
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
        target: { value: input },
      });
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      await waitFor(() =>
        expect(screen.getByLabelText("音标")).toHaveValue(expectedPhonetic),
      );
    },
  );

  it("ignores a stale correction response after a newer lookup completes", async () => {
    type Deferred = {
      promise: Promise<unknown>;
      resolve: (value: unknown) => void;
    };
    const deferred = (): Deferred => {
      let resolve!: (value: unknown) => void;
      const promise = new Promise((resolvePromise) => {
        resolve = resolvePromise;
      });
      return { promise, resolve };
    };
    const running = deferred();
    const recieve = deferred();
    requestMock
      .mockReturnValueOnce(running.promise)
      .mockReturnValueOnce(recieve.promise);
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
      target: { value: "running" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));
    fireEvent.change(screen.getByLabelText("单词名"), {
      target: { value: "recieve" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    recieve.resolve({
      words: [{
        word: "receive",
        inputStatus: "misspelled",
        correctionReason: "i 和 e 的顺序错误",
        phonetic: "/rɪˈsiːv/",
        meaning: "收到",
        partOfSpeech: [1],
        examples: [],
        ieltsCase: null,
      }],
    });
    expect(await screen.findByText(/recieve → receive/)).toBeVisible();

    running.resolve({
      words: [{
        word: "run",
        inputStatus: "inflected",
        correctionReason: "这是 run 的现在分词",
        phonetic: "/rʌn/",
        meaning: "跑；运行",
        partOfSpeech: [1],
        examples: [],
        ieltsCase: null,
      }],
    });
    await waitFor(() => {
      expect(screen.getByText(/recieve → receive/)).toBeVisible();
      expect(screen.queryByText(/running → run/)).not.toBeInTheDocument();
    });
  });

  it("ignores an uncertain response without filling metadata", async () => {
    requestMock.mockResolvedValueOnce({
      words: [{
        word: "color",
        inputStatus: "uncertain",
        correctionReason: "",
        phonetic: "/ˈkʌlər/",
        meaning: "颜色",
        partOfSpeech: [2],
        examples: [],
        ieltsCase: null,
      }],
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
      target: { value: "colour" },
    });
    await new Promise((resolve) => window.setTimeout(resolve, 700));

    expect(screen.queryByRole("button", { name: "使用建议" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("单词名")).toHaveValue("colour");
    expect(screen.getByLabelText("音标")).toHaveValue("");
    expect(screen.getByLabelText("中文")).toHaveValue("");
    expect(screen.getByText("名词").closest(".ant-tag")).not.toHaveClass(
      "ant-tag-checkable-checked",
    );
  });
});
