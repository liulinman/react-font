import { expect, it, vi } from "vitest";
vi.mock("@/aiListening/audio", () => ({
  playListeningAudio: vi.fn().mockResolvedValue(undefined),
}));
import { playListeningAudio } from "@/aiListening/audio";
import { speakNativeEnglish } from "./pronunciation";
it("native uses the same provider audio instead of system speech", async () => {
  await speakNativeEnglish("wander");
  expect(playListeningAudio).toHaveBeenCalledWith("/speech/word", {
    body: { text: "wander" },
  });
});
