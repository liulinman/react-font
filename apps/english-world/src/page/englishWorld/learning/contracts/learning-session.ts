import type {
  ActivityEnvelopeV1,
  LearningAnswerV1,
  LearningMode,
  MasteryDimension,
} from "./activity-contract";

export interface LearningModeCapabilityV1 {
  mode: LearningMode;
  status: "enabled" | "coming_soon";
  reason?: string;
}

export interface LearningCapabilitiesV1 {
  modes: LearningModeCapabilityV1[];
}

export interface PreviewLearningSessionCommandV1 {
  wordIds: number[];
  selectedModes: LearningMode[];
}

export interface CreateLearningSessionCommandV1
  extends PreviewLearningSessionCommandV1 {
  requestUid: string;
}

export interface LearningSessionDetailCommandV1 {
  sessionId: number;
}

export interface LearningSessionCommandV1 {
  sessionId: number;
  sessionVersion: number;
}

export type LearningHintTypeV1 =
  | "show_spelling"
  | "replay_slow"
  | "show_meaning";

export type SubmitLearningAnswerV1 = LearningAnswerV1;

export interface SubmitLearningAttemptCommandV1 {
  sessionId: number;
  itemId: number;
  sessionVersion: number;
  attemptUid: string;
  answer: SubmitLearningAnswerV1;
  hintCount: number;
  hintTypes: LearningHintTypeV1[];
}

export interface LearningPlanPreviewV1 {
  wordCount: number;
  estimatedSeconds: number;
  modeCapabilities: LearningModeCapabilityV1[];
  words: Array<{
    wordId: number;
    sourceOrder: number;
    primaryMode?: LearningMode;
    eligibleModes: LearningMode[];
    audioEligibility: "eligible" | "ineligible";
    adaptationStatus: "adapted" | "unadapted";
    reason?: string;
  }>;
  blocks: Array<{
    mode: LearningMode;
    wordIds: number[];
    items: Array<{
      wordId: number;
      sourceOrder: number;
      itemType: ActivityEnvelopeV1["item"]["itemType"];
    }>;
    answerItemCount: number;
    estimatedSeconds: number;
  }>;
}

export interface LearningSessionCreateResultV1 {
  sessionId: number;
  status: "active";
  sessionVersion: 1;
  currentItemId: number;
}

export type LearningSessionStatusV1 =
  | "preparing"
  | "partial_ready"
  | "active"
  | "paused"
  | "completed"
  | "failed";

export interface LearningSessionDetailV1 {
  sessionId: number;
  status: LearningSessionStatusV1;
  sessionVersion: number;
  currentItem?: ActivityEnvelopeV1 & { itemId: number };
  submittedResults: LearningAttemptResultSummaryV1[];
  /** Present on completed snapshots when the server includes the result rollup. */
  result?: LearningSessionResultV1;
}

export interface LearningSessionResultV1 {
  completedWords: number;
  elapsedSeconds: number;
  independentCorrect: number;
  hintedCorrect: number;
  needsWork: number;
  pending: number;
  levelChanges: number;
  words: Array<{
    wordId: number;
    word: string;
    originalLevel: 0 | 1 | 2 | 3;
    systemLevel: 0 | 1 | 2 | 3;
    manualLevel: 0 | 1 | 2 | 3 | null;
    nextReviewAt: string;
    recommendedMode: LearningMode;
  }>;
}

/** The current public detail response is the V1 session snapshot. */
export type LearningSessionSnapshotV1 = LearningSessionDetailV1;

export interface LearningAttemptResultSummaryV1 {
  attemptId: number;
  itemId: number;
  status: "final";
  outcome: "correct" | "incorrect" | "skipped";
  dimensionResults: Array<{
    dimension: MasteryDimension;
    outcome: "correct" | "incorrect" | "skipped";
  }>;
  sessionVersion: number;
  nextItemId?: number;
}

export interface SubmitLearningAttemptResultV1 {
  attemptId: number;
  status: "final";
  outcome: "correct" | "incorrect" | "skipped";
  dimensionResults: Array<{
    dimension: MasteryDimension;
    outcome: "correct" | "incorrect" | "skipped";
  }>;
  feedback:
    | { kind: "meaning"; expectedLabel: string; explanation: string }
    | {
        kind: "spelling";
        expected: string;
        diff: Array<{ text: string; kind: "same" | "missing" | "extra" }>;
      };
  sessionVersion: number;
  nextItemId?: number;
}

export interface LearningSessionTransitionResultV1 {
  sessionId: number;
  status: LearningSessionStatusV1;
  sessionVersion: number;
}

export type LearningErrorCodeV1 =
  | "LEARNING_RESOURCE_UNAVAILABLE"
  | "LEARNING_ITEM_STALE"
  | "LEARNING_IDEMPOTENCY_CONFLICT"
  | "LEARNING_MASTERY_STALE"
  | "LEARNING_SESSION_UPGRADE_REQUIRED"
  | "LEARNING_MODE_UNSUPPORTED"
  | "LEARNING_NO_ELIGIBLE_WORDS"
  | "LEARNING_WORDS_REQUIRE_REVIEW"
  | "LEARNING_WORD_HAS_LEARNING_RECORDS"
  | "LEARNING_ANSWER_INVALID"
  | "LEARNING_CONTENT_INVALID";

export interface LearningSessionApiErrorV1 {
  code: number;
  message: string;
  data: null;
  errorCode: LearningErrorCodeV1;
}

export type { MasteryDimension };
