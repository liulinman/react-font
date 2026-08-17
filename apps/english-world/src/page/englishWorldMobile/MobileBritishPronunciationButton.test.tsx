import "antd-mobile/es/global";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MobileBritishPronunciationButton } from "./MobileBritishPronunciationButton";
import { playBritishPronunciation } from "@/page/englishWorld/utils/pronunciation";

vi.mock("@/page/englishWorld/utils/pronunciation", () => ({
  playBritishPronunciation: vi.fn(),
}));

describe("MobileBritishPronunciationButton", () => {
  it("uses an explicit contextual accessible label when a row supplies one", () => {
    render(<MobileBritishPronunciationButton ariaLabel="播放 retain 的英式发音" word="retain" />);

    expect(screen.getByRole("button", { name: "播放 retain 的英式发音" })).toBeTruthy();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("点击后播放传入单词的英式发音", async () => {
    vi.mocked(playBritishPronunciation).mockResolvedValue(undefined);

    render(<MobileBritishPronunciationButton word="hello" />);

    await userEvent.click(screen.getByRole("button", { name: "播放英式发音" }));

    expect(playBritishPronunciation).toHaveBeenCalledWith("hello");
  });

  it("没有可播放单词时不触发发音", async () => {
    render(<MobileBritishPronunciationButton word=" " />);

    await userEvent.click(screen.getByRole("button", { name: "播放英式发音" }));

    expect(playBritishPronunciation).not.toHaveBeenCalled();
  });
});
