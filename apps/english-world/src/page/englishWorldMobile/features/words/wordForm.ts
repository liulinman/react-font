import type { WordList } from "@/server/word/word.type";

/**
 * The full editable word shape on mobile. Every supported `WordList` field
 * stays editable except the server-assigned `id`. Optionals stay optional
 * while typing; the payload builders normalize blanks and defaults at submit.
 */
export type MobileWordFormValues = Omit<WordList, "id">;

/**
 * Build the `wordAdd` request body from raw form values. The word is trimmed,
 * part of speech defaults to an empty array, and type/level fall back to
 * sensible defaults when unset (a space in the word implies a phrase).
 */
export function toWordAddPayload(values: MobileWordFormValues): Omit<WordList, "id"> {
  const englishWord = values.englishWord.trim();
  return {
    ...values,
    englishWord,
    englishType: values.englishType ?? (englishWord.includes(" ") ? 1 : 0),
    englishLevel: values.englishLevel ?? 0,
    englishPartSpeech: values.englishPartSpeech ?? [],
  };
}

/**
 * Build the `wordUpdate` request body. Editing preserves the existing id and
 * reuses the same normalization as add so a saved word never loses its
 * canonical word/type/level/part-of-speech shape.
 */
export function toWordUpdatePayload(values: MobileWordFormValues, id: number): WordList {
  return { ...toWordAddPayload(values), id };
}

/** Draft key for a new (unsaved) word. */
export const WORD_FORM_NEW_DRAFT_KEY = "word-form:new";

/** Draft key for an existing word being edited. */
export function wordFormEditDraftKey(id: number) {
  return `word-form:${id}`;
}

export type MobileWordFormDraft = {
  values: MobileWordFormValues;
};

/** True when the word field has non-whitespace content worth keeping as a draft. */
export function isWordFormDraftWorthSaving(values: MobileWordFormValues) {
  return values.englishWord.trim().length > 0;
}
