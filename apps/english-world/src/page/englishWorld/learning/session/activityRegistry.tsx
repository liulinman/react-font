import type { ReactNode } from "react";
import { ConfusionActivity } from "../activities/confusion/ConfusionActivity";
import { ListeningActivity } from "../activities/listening/ListeningActivity";
import { MicroSceneActivity } from "../activities/micro-scene/MicroSceneActivity";
import { OutputActivity } from "../activities/output/OutputActivity";
import { RootFamilyActivity } from "../activities/root-family/RootFamilyActivity";
import type { HintType, LearningAnswerDraft } from "../activities/shared/answerDraft";
import type { LearningMode, PublicLearningItemV1 } from "../contracts/activity-contract";

export interface SharedActivityProps {
  item: PublicLearningItemV1;
  draft: LearningAnswerDraft;
  submitting?: boolean;
  hints?: readonly HintType[];
  onDraftChange(draft: LearningAnswerDraft): void;
  onRevealHint(hint: HintType): void;
  onSubmit(draft: LearningAnswerDraft): void;
}

export type ActivityRenderer = (props: SharedActivityProps) => ReactNode;

function InvalidActivity() {
  return <section aria-label="学习活动数据无效" role="alert">学习活动数据无效，请刷新后继续。</section>;
}

export const activityRegistry: Record<LearningMode, ActivityRenderer> = {
  listening: (props) => props.item.itemType === "listening_meaning" || props.item.itemType === "listening_spelling"
    ? <ListeningActivity {...props} item={props.item} />
    : <InvalidActivity />,
  root_family: (props) => props.item.itemType === "root_family_choice"
    ? <RootFamilyActivity {...props} item={props.item} />
    : <InvalidActivity />,
  micro_scene: (props) => props.item.itemType === "micro_scene_choice" ||
    props.item.itemType === "micro_scene_context_choice" ||
    props.item.itemType === "micro_scene_transfer_output"
    ? <MicroSceneActivity {...props} item={props.item} />
    : <InvalidActivity />,
  confusion: (props) => props.item.itemType === "confusion_choice"
    ? <ConfusionActivity {...props} item={props.item} />
    : <InvalidActivity />,
  output: (props) => props.item.itemType === "output_word"
    ? <OutputActivity {...props} item={props.item} />
    : <InvalidActivity />,
};
