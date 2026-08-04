import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ListeningPublicItemV1 } from "../../contracts/activity-contract";
import { ListeningActivity } from "./ListeningActivity";

const spellingItem: ListeningPublicItemV1 = {
  itemType: "listening_spelling",
  itemUid: "spelling-7",
  wordId: 7,
  audio: {
    britishUrl: "/audio/7-uk.mp3",
    americanUrl: "/audio/7-us.mp3",
  },
  spellingCue: { firstLetter: "i", length: 7 },
};

function createHandlers() {
  return {
    onDraftChange: vi.fn(),
    onRevealHint: vi.fn(),
    onSubmit: vi.fn(),
  };
}

describe("ListeningActivity", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("reveals the public spelling cue and records the hint without exposing private answer fields", async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    const item = {
      ...spellingItem,
      correctAnswer: "inspect",
      correctValue: "inspect",
      answerContract: { spelling: "inspect" },
    } as ListeningPublicItemV1;
    const { rerender } = render(
      <ListeningActivity
        item={item}
        draft={{ kind: "spelling", text: "" }}
        {...handlers}
      />,
    );

    expect(screen.queryByText("inspect")).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent("inspect");
    await user.click(screen.getByRole("button", { name: "查看拼写提示" }));
    expect(handlers.onRevealHint).toHaveBeenCalledWith("show_spelling");
    rerender(
      <ListeningActivity
        item={item}
        draft={{ kind: "spelling", text: "" }}
        hints={["show_spelling"]}
        {...handlers}
      />,
    );
    expect(screen.getByRole("status", { name: "拼写提示" })).toHaveTextContent(
      "首字母 i，共 7 个字母",
    );
    expect(document.body).not.toHaveTextContent("inspect");

    rerender(
      <ListeningActivity
        item={{
          itemType: "listening_meaning",
          itemUid: "meaning-8",
          wordId: 8,
          audio: { britishUrl: "/audio/8-uk.mp3" },
          meaningChoices: [
            { value: "opaque-a", label: "检查" },
            { value: "opaque-b", label: "忽略" },
          ],
        }}
        draft={{ kind: "choice", selectedValue: "" }}
        {...handlers}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "忽略" }));
    expect(handlers.onDraftChange).toHaveBeenCalledWith({
      kind: "choice",
      selectedValue: "opaque-b",
    });
  });

  it("does not offer or record a spelling hint when no visible cue is available", () => {
    const handlers = createHandlers();

    render(
      <ListeningActivity
        item={{ ...spellingItem, spellingCue: undefined }}
        draft={{ kind: "spelling", text: "" }}
        {...handlers}
      />,
    );

    expect(
      screen.queryByRole("button", { name: "查看拼写提示" }),
    ).not.toBeInTheDocument();
    expect(handlers.onRevealHint).not.toHaveBeenCalled();
  });

  it("submits controlled spelling once on Enter, respects IME and submitting, and emits dont_know", async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    const { rerender } = render(
      <ListeningActivity
        item={spellingItem}
        draft={{ kind: "spelling", text: "" }}
        {...handlers}
      />,
    );
    const input = screen.getByRole("textbox", { name: "输入听到的单词" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(handlers.onSubmit).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "inspect" } });
    expect(handlers.onDraftChange).toHaveBeenLastCalledWith({
      kind: "spelling",
      text: "inspect",
    });

    rerender(
      <ListeningActivity
        item={spellingItem}
        draft={{ kind: "spelling", text: "inspect" }}
        {...handlers}
      />,
    );
    const controlledInput = screen.getByRole("textbox", {
      name: "输入听到的单词",
    });
    fireEvent.compositionStart(controlledInput);
    fireEvent.keyDown(controlledInput, { key: "Enter", isComposing: true });
    expect(handlers.onSubmit).not.toHaveBeenCalled();
    fireEvent.compositionEnd(controlledInput);
    fireEvent.keyDown(controlledInput, { key: "Enter" });
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
    expect(handlers.onSubmit).toHaveBeenLastCalledWith({
      kind: "spelling",
      text: "inspect",
    });

    rerender(
      <ListeningActivity
        item={spellingItem}
        draft={{ kind: "spelling", text: "inspect" }}
        submitting
        {...handlers}
      />,
    );
    fireEvent.keyDown(
      screen.getByRole("textbox", { name: "输入听到的单词" }),
      { key: "Enter" },
    );
    await user.click(screen.getByRole("button", { name: "提交答案" }));
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);

    rerender(
      <ListeningActivity
        item={spellingItem}
        draft={{ kind: "spelling", text: "inspect" }}
        {...handlers}
      />,
    );
    await user.click(screen.getByRole("button", { name: "暂时不会" }));
    expect(handlers.onSubmit).toHaveBeenLastCalledWith({
      kind: "skip",
      reason: "dont_know",
    });
  });

  it("offers accessible replay, slow replay, accent recovery, and skips only after all audio fails", async () => {
    const user = userEvent.setup();
    const handlers = createHandlers();
    const { container } = render(
      <ListeningActivity
        item={spellingItem}
        draft={{ kind: "spelling", text: "insp" }}
        {...handlers}
      />,
    );
    const audio = container.querySelector("audio");
    expect(audio).not.toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("英式发音已暂停");

    await user.click(screen.getByRole("button", { name: "播放英式发音" }));
    expect(audio?.playbackRate).toBe(1);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    fireEvent.play(audio as HTMLAudioElement);
    expect(screen.getByRole("status")).toHaveTextContent("正在播放英式发音");

    await user.click(screen.getByRole("button", { name: "0.8 倍慢速重播" }));
    expect(audio?.playbackRate).toBe(0.8);
    expect(handlers.onRevealHint).toHaveBeenCalledWith("replay_slow");

    await user.click(screen.getByRole("button", { name: "切换到美式发音" }));
    expect(audio).toHaveAttribute("src", "/audio/7-us.mp3");
    expect(handlers.onSubmit).not.toHaveBeenCalled();

    fireEvent.error(audio as HTMLAudioElement);
    expect(screen.getByRole("button", { name: "重试美式发音" })).toBeInTheDocument();
    expect(handlers.onSubmit).not.toHaveBeenCalled();
    expect(handlers.onDraftChange).not.toHaveBeenCalled();

    fireEvent.error(audio as HTMLAudioElement);
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);
    expect(handlers.onSubmit).toHaveBeenCalledWith({
      kind: "skip",
      reason: "audio_unavailable",
    });
    fireEvent.error(audio as HTMLAudioElement);
    expect(handlers.onSubmit).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "重试英式发音" }));
    expect(audio).toHaveAttribute("src", "/audio/7-uk.mp3");
  });

  it("does not emit audio_unavailable for a no-audio item while submitting", () => {
    const handlers = createHandlers();

    render(
      <ListeningActivity
        item={{ ...spellingItem, audio: {} }}
        draft={{ kind: "spelling", text: "insp" }}
        submitting
        {...handlers}
      />,
    );

    expect(handlers.onSubmit).not.toHaveBeenCalled();
  });

  it("does not emit audio_unavailable when the final accent fails while submitting", () => {
    const handlers = createHandlers();
    const { container, rerender } = render(
      <ListeningActivity
        item={spellingItem}
        draft={{ kind: "spelling", text: "insp" }}
        {...handlers}
      />,
    );
    const audio = container.querySelector("audio") as HTMLAudioElement;

    fireEvent.error(audio);
    expect(handlers.onSubmit).not.toHaveBeenCalled();

    rerender(
      <ListeningActivity
        item={spellingItem}
        draft={{ kind: "spelling", text: "insp" }}
        submitting
        {...handlers}
      />,
    );
    fireEvent.error(audio);

    expect(handlers.onSubmit).not.toHaveBeenCalled();
  });
});
