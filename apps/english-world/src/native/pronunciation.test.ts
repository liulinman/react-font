import { expect, it, vi } from "vitest";
const { speak } = vi.hoisted(() => ({ speak: vi.fn().mockResolvedValue({}) }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
  registerPlugin: () => ({ speak }),
}));
import { playBritishPronunciation } from "@/page/englishWorld/utils/pronunciation";
it("uses system speech directly in the installed app without a dictionary network request", async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  await playBritishPronunciation("wander");
  expect(speak).toHaveBeenCalledWith({ text: "wander" });
  expect(fetchMock).not.toHaveBeenCalled();
  vi.unstubAllGlobals();
});
