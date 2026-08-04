import type { LearningAnswerDraft } from "../activities/shared/answerDraft";

const DRAFT_SCHEMA_VERSION = 1;
const DRAFT_KEY_PREFIX = "english-world.learning-draft.v1";
const MAX_ITEM_UID_LENGTH = 256;
const MAX_SELECTED_VALUE_LENGTH = 512;
const MAX_SPELLING_LENGTH = 256;
const MAX_OUTPUT_LENGTH = 4_000;

interface LearningDraftEnvelopeV1 {
  schemaVersion: 1;
  sessionId: number;
  itemUid: string;
  draft: LearningAnswerDraft;
}

export interface LearningDraftStore {
  readonly key: string;
  load(): LearningAnswerDraft | null;
  save(draft: LearningAnswerDraft): void;
  clear(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sanitizeDraft(value: unknown): LearningAnswerDraft | null {
  if (!isRecord(value) || typeof value.kind !== "string") return null;
  switch (value.kind) {
    case "choice":
      return typeof value.selectedValue === "string" &&
        value.selectedValue.length <= MAX_SELECTED_VALUE_LENGTH
        ? { kind: "choice", selectedValue: value.selectedValue }
        : null;
    case "spelling":
      return typeof value.text === "string" &&
        value.text.length <= MAX_SPELLING_LENGTH
        ? { kind: "spelling", text: value.text }
        : null;
    case "output":
      return typeof value.text === "string" && value.text.length <= MAX_OUTPUT_LENGTH
        ? { kind: "output", text: value.text }
        : null;
    case "skip":
      return value.reason === "dont_know" || value.reason === "audio_unavailable"
        ? { kind: "skip", reason: value.reason }
        : null;
    default:
      return null;
  }
}

function defaultStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createLearningDraftStore(
  sessionId: number,
  itemUid: string,
  storage: Storage | null = defaultStorage(),
): LearningDraftStore {
  const key = `${DRAFT_KEY_PREFIX}.${sessionId}.${itemUid}`;

  return {
    key,
    load() {
      try {
        const raw = storage?.getItem(key);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (
          !isRecord(parsed) ||
          parsed.schemaVersion !== DRAFT_SCHEMA_VERSION ||
          parsed.sessionId !== sessionId ||
          parsed.itemUid !== itemUid ||
          itemUid.length === 0 ||
          itemUid.length > MAX_ITEM_UID_LENGTH
        ) {
          return null;
        }
        return sanitizeDraft(parsed.draft);
      } catch {
        return null;
      }
    },
    save(draft) {
      const safeDraft = sanitizeDraft(draft);
      if (
        !safeDraft ||
        !Number.isSafeInteger(sessionId) ||
        sessionId <= 0 ||
        itemUid.length === 0 ||
        itemUid.length > MAX_ITEM_UID_LENGTH
      ) {
        return;
      }
      const envelope: LearningDraftEnvelopeV1 = {
        schemaVersion: DRAFT_SCHEMA_VERSION,
        sessionId,
        itemUid,
        draft: safeDraft,
      };
      try {
        storage?.setItem(key, JSON.stringify(envelope));
      } catch {
        // Draft persistence is best effort and must never block learning.
      }
    },
    clear() {
      try {
        storage?.removeItem(key);
      } catch {
        // Draft cleanup is best effort when storage is unavailable.
      }
    },
  };
}
