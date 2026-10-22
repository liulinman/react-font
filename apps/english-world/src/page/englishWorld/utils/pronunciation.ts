import { playListeningAudio, stopListeningAudio } from "@/aiListening/audio";
/** Compatibility name. Voice and accent are controlled by the administrator. */
export async function playBritishPronunciation(
  word: string,
  wordId?: number,
  options: { retryUid?: string; onError?: (error: Error) => void } = {},
) {
  if (!word.trim()) return;
  await playListeningAudio("/speech/word", {
    body: {
      ...(wordId ? { wordId } : { text: word.trim() }),
      ...(options.retryUid ? { retryUid: options.retryUid } : {}),
    },
    onError: options.onError,
  });
}
export const stopPronunciation = stopListeningAudio;
