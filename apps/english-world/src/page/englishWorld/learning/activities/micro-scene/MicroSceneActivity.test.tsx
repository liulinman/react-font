import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  MicroSceneContextPublicItemV1,
  MicroSceneTransferPublicItemV1,
} from "../../contracts/activity-contract";
import { MicroSceneActivity } from "./MicroSceneActivity";

vi.mock("../../../component/BritishPronunciationButton", () => ({
  BritishPronunciationButton: ({ word }: { word: string }) => (
    <button type="button" aria-label={`播放 ${word} 的英式发音`}>
      播放
    </button>
  ),
}));

const contextItem: MicroSceneContextPublicItemV1 = {
  itemType: "micro_scene_context_choice",
  itemUid: "context-1",
  wordId: 7,
  scene: {
    sceneKey: "office-fire-alarm",
    title: "A False Alarm",
    theme: "work",
    sentences: [
      "The office alarm rang while Maya prepared a report.",
      "She tried to suppress her worry and calmly led everyone outside.",
      "A safety officer found harmless steam near the kitchen.",
      "Maya returned and finished the report with her team.",
    ],
  },
  targetWords: [{ wordId: 7, word: "suppress", meaning: "压制；抑制" }],
  showStoryInitially: true,
  clozeSentence: "She tried to ___ her worry and calmly led everyone outside.",
  prompt: "结合短文语境，选择最适合填入空格的单词。",
  choices: [
    { value: "correct", label: "suppress" },
    { value: "wrong", label: "sustain" },
  ],
};

const transferItem: MicroSceneTransferPublicItemV1 = {
  itemType: "micro_scene_transfer_output",
  itemUid: "transfer-1",
  wordId: 7,
  sceneTitle: "A False Alarm",
  theme: "work",
  meaning: "压制；抑制",
  transferSentence: "The coach asked him to ___ his anger during the match.",
  usageNote: "常用于表示控制情绪。",
  cue: { firstLetter: "s", length: 8 },
};

function handlers() {
  return {
    onDraftChange: vi.fn(),
    onRevealHint: vi.fn(),
    onSubmit: vi.fn(),
  };
}

describe("MicroSceneActivity", () => {
  afterEach(cleanup);

  it("starts with a readable story, highlighted target, meaning, and pronunciation", async () => {
    const user = userEvent.setup();
    const events = handlers();
    render(
      <MicroSceneActivity
        item={contextItem}
        draft={{ kind: "choice", selectedValue: "" }}
        hints={[]}
        {...events}
      />,
    );

    expect(screen.getByRole("heading", { name: "A False Alarm" })).toBeVisible();
    expect(screen.getByText("压制；抑制")).toBeVisible();
    expect(
      screen.getByRole("button", { name: "播放 suppress 的英式发音" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "读完了，开始回忆" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "读完了，开始回忆" }));
    expect(screen.queryByRole("heading", { name: "A False Alarm" })).not.toBeInTheDocument();
    expect(screen.getByText(contextItem.clozeSentence)).toBeVisible();
    expect(screen.getAllByRole("radio")).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "查看原文" }));
    expect(events.onRevealHint).toHaveBeenCalledWith("show_meaning");
    expect(screen.getByRole("heading", { name: "A False Alarm" })).toBeVisible();
  });

  it("starts a later target in recall instead of repeating the reading gate", () => {
    render(
      <MicroSceneActivity
        item={{ ...contextItem, itemUid: "context-2", showStoryInitially: false }}
        draft={{ kind: "choice", selectedValue: "" }}
        hints={[]}
        {...handlers()}
      />,
    );

    expect(screen.queryByRole("button", { name: "读完了，开始回忆" })).not.toBeInTheDocument();
    expect(screen.getByText(contextItem.clozeSentence)).toBeVisible();
  });

  it("submits transfer text unchanged and reveals spelling only after a hint", async () => {
    const user = userEvent.setup();
    const events = handlers();
    const { rerender } = render(
      <MicroSceneActivity
        item={transferItem}
        draft={{ kind: "output", text: "" }}
        hints={[]}
        {...events}
      />,
    );

    expect(screen.queryByText("首字母 s，共 8 个字母")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "写出目标单词" }), {
      target: { value: " suppress " },
    });
    expect(events.onDraftChange).toHaveBeenLastCalledWith({
      kind: "output",
      text: " suppress ",
    });
    await user.click(screen.getByRole("button", { name: "显示拼写提示" }));
    expect(events.onRevealHint).toHaveBeenCalledWith("show_spelling");

    rerender(
      <MicroSceneActivity
        item={transferItem}
        draft={{ kind: "output", text: " suppress " }}
        hints={["show_spelling"]}
        {...events}
      />,
    );
    expect(screen.getByText("首字母 s，共 8 个字母")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "提交答案" }));
    expect(events.onSubmit).toHaveBeenCalledWith({
      kind: "output",
      text: " suppress ",
    });
  });
});
