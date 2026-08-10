import type {
  LearningSessionSnapshotV1,
  SubmitLearningAttemptResultV1,
} from "../contracts/learning-session";
import type {
  HintType,
  LearningAnswerDraft,
} from "../activities/shared/answerDraft";

export type FinalAttemptResultV1 = SubmitLearningAttemptResultV1 & {
  status: "final";
};

export type LearningInteractionState =
  | {
      status: "editing";
      itemUid: string;
      draft: LearningAnswerDraft;
      hints: HintType[];
    }
  | {
      status: "submitting";
      itemUid: string;
      draft: LearningAnswerDraft;
      attemptUid: string;
    }
  | {
      status: "feedback";
      itemUid: string;
      result: FinalAttemptResultV1;
    }
  | {
      status: "sync_failed";
      itemUid: string;
      draft: LearningAnswerDraft;
      attemptUid: string;
      errorCode: string;
    };

export interface LearningSessionState {
  snapshot: LearningSessionSnapshotV1;
  interaction: LearningInteractionState | null;
}

export type LearningSessionAction =
  | {
      type: "snapshot_replaced";
      snapshot: LearningSessionSnapshotV1;
      restoredDraft?: LearningAnswerDraft;
    }
  | { type: "draft_changed"; draft: LearningAnswerDraft }
  | { type: "hint_revealed"; hint: HintType }
  | { type: "submit_started"; attemptUid: string }
  | { type: "submit_succeeded"; result: FinalAttemptResultV1 }
  | { type: "submit_failed"; errorCode: string };

function defaultDraft(
  snapshot: LearningSessionSnapshotV1,
): LearningAnswerDraft | null {
  const item = snapshot.currentItem?.item;
  if (!item) return null;
  switch (item.itemType) {
    case "listening_meaning":
    case "root_family_choice":
    case "micro_scene_choice":
    case "confusion_choice":
      return { kind: "choice", selectedValue: "" };
    case "listening_spelling":
      return { kind: "spelling", text: "" };
    case "output_word":
      return { kind: "output", text: "" };
  }
}

function draftMatchesCurrentItem(
  snapshot: LearningSessionSnapshotV1,
  draft: LearningAnswerDraft,
) {
  const itemType = snapshot.currentItem?.item.itemType;
  if (draft.kind === "skip") return itemType !== undefined;
  switch (itemType) {
    case "listening_meaning":
    case "root_family_choice":
    case "micro_scene_choice":
    case "confusion_choice":
      return draft.kind === "choice";
    case "listening_spelling":
      return draft.kind === "spelling";
    case "output_word":
      return draft.kind === "output";
    default:
      return false;
  }
}

function editingInteraction(
  snapshot: LearningSessionSnapshotV1,
  restoredDraft?: LearningAnswerDraft,
): LearningInteractionState | null {
  const itemUid = snapshot.currentItem?.item.itemUid;
  const fallback = defaultDraft(snapshot);
  if (!itemUid || !fallback) return null;
  return {
    status: "editing",
    itemUid,
    draft:
      restoredDraft && draftMatchesCurrentItem(snapshot, restoredDraft)
        ? restoredDraft
        : fallback,
    hints: [],
  };
}

export function createLearningSessionState(
  snapshot: LearningSessionSnapshotV1,
  restoredDraft?: LearningAnswerDraft,
): LearningSessionState {
  return {
    snapshot,
    interaction: editingInteraction(snapshot, restoredDraft),
  };
}

export function learningSessionReducer(
  state: LearningSessionState,
  action: LearningSessionAction,
): LearningSessionState {
  switch (action.type) {
    case "snapshot_replaced": {
      const nextItemUid = action.snapshot.currentItem?.item.itemUid;
      if (
        nextItemUid &&
        nextItemUid === state.snapshot.currentItem?.item.itemUid &&
        action.restoredDraft === undefined
      ) {
        return { snapshot: action.snapshot, interaction: state.interaction };
      }
      return createLearningSessionState(action.snapshot, action.restoredDraft);
    }
    case "draft_changed":
      if (state.interaction?.status !== "editing") return state;
      return {
        ...state,
        interaction: { ...state.interaction, draft: action.draft },
      };
    case "hint_revealed":
      if (
        state.interaction?.status !== "editing" ||
        state.interaction.hints.includes(action.hint)
      ) {
        return state;
      }
      return {
        ...state,
        interaction: {
          ...state.interaction,
          hints: [...state.interaction.hints, action.hint],
        },
      };
    case "submit_started":
      if (state.interaction?.status === "sync_failed") {
        return {
          ...state,
          interaction: {
            status: "submitting",
            itemUid: state.interaction.itemUid,
            draft: state.interaction.draft,
            attemptUid: state.interaction.attemptUid,
          },
        };
      }
      if (state.interaction?.status !== "editing") return state;
      return {
        ...state,
        interaction: {
          status: "submitting",
          itemUid: state.interaction.itemUid,
          draft: state.interaction.draft,
          attemptUid: action.attemptUid,
        },
      };
    case "submit_failed":
      if (state.interaction?.status !== "submitting") return state;
      return {
        ...state,
        interaction: {
          status: "sync_failed",
          itemUid: state.interaction.itemUid,
          draft: state.interaction.draft,
          attemptUid: state.interaction.attemptUid,
          errorCode: action.errorCode,
        },
      };
    case "submit_succeeded":
      if (state.interaction?.status !== "submitting") return state;
      return {
        ...state,
        interaction: {
          status: "feedback",
          itemUid: state.interaction.itemUid,
          result: action.result,
        },
      };
  }
}
