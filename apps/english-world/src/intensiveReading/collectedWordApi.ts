import request from '@font/api';
import type { WordList } from '@/server/word/word.type';
export type CollectedWord = Pick<WordList, 'id' | 'englishWord' | 'englishPhonetic' | 'englishChinese' | 'englishNote' | 'englishPartSpeech'>;
export type ReadingWordLookup = {sourceWord: string; lemma: string | null; resolution: 'ai' | 'exact' | 'uncertain'; word: CollectedWord | null};
export const lookupCollectedWord = (englishWord: string, context = '') => request<ReadingWordLookup>({
  url: '/english/lookupReadingWord', method: 'POST', data: { englishWord, context },
  config: { suppressErrorMessage: true, timeout: 65000 },
});
export type ReadingWordDraft = {sourceWord: string; lemma: string; context: string; meaning: string; phonetic: string; dictionaryMeaning: string; explanation: string; partSpeech: number; previewToken: string};
export type ReadingWordExplanation = ReadingWordLookup & {draft: ReadingWordDraft | null};
export const explainReadingWord = (englishWord: string, context: string) => request<ReadingWordExplanation>({
  url: '/english/explainReadingWord', method: 'POST', data: {englishWord, context}, config: {suppressErrorMessage: true, timeout: 65000},
});
export const collectReadingWord = (previewToken: string) => request<{word: CollectedWord; created: boolean}>({
  url: '/english/collectReadingWord', method: 'POST', data: {previewToken}, config: {suppressErrorMessage: true},
});
