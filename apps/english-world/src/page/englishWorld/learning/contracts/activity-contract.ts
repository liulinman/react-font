export type LearningMode =
  | "root_family"
  | "micro_scene"
  | "confusion"
  | "listening"
  | "output";

export type MasteryDimension =
  | "meaning_recognition"
  | "active_recall"
  | "spelling"
  | "listening"
  | "context"
  | "output";

export type LearningAnswerV1 =
  | { kind: "choice"; selectedValue: string }
  | { kind: "spelling"; text: string }
  | { kind: "output"; text: string }
  | { kind: "skip"; reason: "dont_know" | "audio_unavailable" };

export interface ListeningPublicItemV1 {
  itemType: "listening_meaning" | "listening_spelling";
  itemUid: string;
  wordId: number;
  audio: { britishUrl?: string; americanUrl?: string };
  meaningChoices?: Array<{ value: string; label: string }>;
  spellingCue?: { firstLetter: string; length: number };
}

export interface RootFamilyPublicItemV1 {
  itemType: "root_family_choice";
  itemUid: string;
  wordId: number;
  root: string;
  prompt: string;
  choices: Array<{ value: string; label: string }>;
}

export interface MicroScenePublicItemV1 {
  itemType: "micro_scene_choice";
  itemUid: string;
  wordId: number;
  scene: string;
  prompt: string;
  choices: Array<{ value: string; label: string }>;
}

export interface ConfusionPublicItemV1 {
  itemType: "confusion_choice";
  itemUid: string;
  wordId: number;
  targetWord: string;
  prompt: string;
  contrast: string;
  choices: Array<{ value: string; label: string }>;
}

export interface OutputPublicItemV1 {
  itemType: "output_word";
  itemUid: string;
  wordId: number;
  prompt: string;
  cue: { firstLetter: string; length: number };
}

export type PublicLearningItemV1 =
  | ListeningPublicItemV1
  | RootFamilyPublicItemV1
  | MicroScenePublicItemV1
  | ConfusionPublicItemV1
  | OutputPublicItemV1;

interface ActivityEnvelopeBaseV1<TMode extends LearningMode, TItem extends PublicLearningItemV1> {
  schemaVersion: 1;
  mode: TMode;
  phase: "understand" | "recall" | "verify";
  item: TItem;
}

export type ActivityEnvelopeV1 =
  | ActivityEnvelopeBaseV1<"root_family", RootFamilyPublicItemV1>
  | ActivityEnvelopeBaseV1<"micro_scene", MicroScenePublicItemV1>
  | ActivityEnvelopeBaseV1<"confusion", ConfusionPublicItemV1>
  | ActivityEnvelopeBaseV1<"listening", ListeningPublicItemV1>
  | ActivityEnvelopeBaseV1<"output", OutputPublicItemV1>;
