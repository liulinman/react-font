import { expect, it, vi } from "vitest";
vi.mock("@/aiListening/audio", () => ({
  playListeningAudio: vi.fn().mockResolvedValue(undefined),
  stopListeningAudio: vi.fn(),
}));
import { playListeningAudio } from "@/aiListening/audio";
import { playBritishPronunciation } from "./pronunciation";
it("uses owned word identity for contextual provider pronunciation", async () => {
  await playBritishPronunciation("record", 12);
  expect(playListeningAudio).toHaveBeenCalledWith("/speech/word", {
    body: { wordId: 12 },
    onError: undefined,
  });
});
it("supports bounded text-only words through the same service", async () => {
  await playBritishPronunciation(" wander ");
  expect(playListeningAudio).toHaveBeenCalledWith("/speech/word", {
    body: { text: "wander" },
    onError: undefined,
  });
});
it("only supplies paid retry identity on explicit retry", async () => {
  await playBritishPronunciation("record", 12, { retryUid: "explicit-retry" });
  expect(playListeningAudio).toHaveBeenLastCalledWith("/speech/word", {
    body: { wordId: 12, retryUid: "explicit-retry" },
    onError: undefined,
  });
});
