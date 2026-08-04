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
}

export type PublicLearningItemV1 = ListeningPublicItemV1;

export interface ActivityEnvelopeV1 {
  schemaVersion: 1;
  mode: LearningMode;
  phase: "understand" | "recall" | "verify";
  item: PublicLearningItemV1;
}
