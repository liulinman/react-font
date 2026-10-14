import { registerPlugin } from "@capacitor/core";
const speech = registerPlugin<{
  speak(options: { text: string }): Promise<void>;
}>("EnglishWorldSpeech");
export const speakNativeEnglish = (text: string) => speech.speak({ text });
