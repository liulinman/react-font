import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useState, type ComponentType } from "react";
import type { LearningAnswerDraft } from "../activities/shared/answerDraft";
import type {
  ConfusionPublicItemV1,
  MicroScenePublicItemV1,
  OutputPublicItemV1,
  PublicLearningItemV1,
  RootFamilyPublicItemV1,
} from "../contracts/activity-contract";
import { activityRegistry } from "./activityRegistry";

interface ActivityProps<TItem> {
  item: TItem;
  draft: LearningAnswerDraft;
  hints: readonly [];
  onDraftChange(draft: LearningAnswerDraft): void;
  onRevealHint(): void;
  onSubmit(draft: LearningAnswerDraft): void;
}

const rootItem: RootFamilyPublicItemV1 = {
  itemType: "root_family_choice",
  itemUid: "root-1",
  wordId: 1,
  root: "spect",
  prompt: "选择与词根含义最匹配的解释",
  choices: [
    { value: "see", label: "看" },
    { value: "write", label: "写" },
  ],
};

const microSceneItem: MicroScenePublicItemV1 = {
  itemType: "micro_scene_choice",
  itemUid: "scene-2",
  wordId: 2,
  scene: "The officer looked closely at the document.",
  prompt: "选择最符合场景的词义",
  choices: [
    { value: "inspect", label: "检查" },
    { value: "ignore", label: "忽略" },
  ],
};

const confusionItem: ConfusionPublicItemV1 = {
  itemType: "confusion_choice",
  itemUid: "confusion-3",
  wordId: 3,
  targetWord: "affect",
  prompt: "The weather will ___ the match.",
  contrast: "affect 是动词，effect 常作名词。",
  choices: [
    { value: "affect", label: "affect" },
    { value: "effect", label: "effect" },
  ],
};

const outputItem: OutputPublicItemV1 = {
  itemType: "output_word",
  itemUid: "output-4",
  wordId: 4,
  prompt: "用目标词完成句子。",
  cue: { firstLetter: "i", length: 7 },
};

function Renderer({ mode }: { mode: keyof typeof activityRegistry }) {
  const Activity = activityRegistry[mode] as unknown as ComponentType<ActivityProps<PublicLearningItemV1>>;
  return (
    <Activity
      item={
        ({
          root_family: rootItem,
          micro_scene: microSceneItem,
          confusion: confusionItem,
          output: outputItem,
        } as Record<string, PublicLearningItemV1>)[mode]
      }
      draft={mode === "output" ? { kind: "output", text: "" } : { kind: "choice", selectedValue: "" }}
      hints={[]}
      onDraftChange={vi.fn()}
      onRevealHint={vi.fn()}
      onSubmit={vi.fn()}
    />
  );
}

describe("activityRegistry", () => {
  afterEach(cleanup);

  it.each([
    ["root_family", "词根词族练习", "选择与词根含义最匹配的解释"],
    ["micro_scene", "微场景练习", "The officer looked closely at the document."],
    ["confusion", "易混辨析练习", "affect 是动词，effect 常作名词。"],
    ["output", "主动输出练习", "用目标词完成句子。"],
  ] as const)("renders the %s public activity instead of a placeholder", (mode, label, visibleText) => {
    render(<Renderer mode={mode} />);

    expect(screen.getByRole("region", { name: label })).toHaveTextContent(visibleText);
    expect(screen.queryByRole("status", { name: "暂不支持的学习活动" })).not.toBeInTheDocument();
  });

  it("keeps output as a controlled output answer rather than treating it as a skip", async () => {
    const user = userEvent.setup();
    const onDraftChange = vi.fn();
    const onSubmit = vi.fn();
    const Activity = activityRegistry.output as unknown as ComponentType<ActivityProps<OutputPublicItemV1>>;
    function ControlledOutput() {
      const [draft, setDraft] = useState<LearningAnswerDraft>({ kind: "output", text: "" });
      return <Activity item={outputItem} draft={draft} hints={[]} onDraftChange={(next) => { onDraftChange(next); setDraft(next); }} onRevealHint={vi.fn()} onSubmit={onSubmit} />;
    }
    render(<ControlledOutput />);

    await user.type(screen.getByRole("textbox", { name: "写下你的回答" }), "I inspect it.");
    expect(onDraftChange).toHaveBeenLastCalledWith({ kind: "output", text: "I inspect it." });
    await user.click(screen.getByRole("button", { name: "提交答案" }));
    expect(onSubmit).toHaveBeenCalledWith({ kind: "output", text: "I inspect it." });
  });
});
