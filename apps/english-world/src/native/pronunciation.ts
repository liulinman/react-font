import { playListeningAudio } from "@/aiListening/audio";
export const speakNativeEnglish = (text: string) =>
  playListeningAudio("/speech/word", { body: { text } });
