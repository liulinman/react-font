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
    render(
      <MobileBritishPronunciationButton
        ariaLabel="播放 retain 的单词发音"
        word="retain"
      />,
    );

    expect(
      screen.getByRole("button", { name: "播放 retain 的单词发音" }),
    ).toBeTruthy();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("点击后播放传入单词的单词发音", async () => {
    vi.mocked(playBritishPronunciation).mockResolvedValue(undefined);

    render(<MobileBritishPronunciationButton word="hello" />);

    await userEvent.click(screen.getByRole("button", { name: "播放单词发音" }));

    expect(playBritishPronunciation).toHaveBeenCalledWith(
      "hello",
      undefined,
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it("没有可播放单词时不触发发音", async () => {
    render(<MobileBritishPronunciationButton word=" " />);

    await userEvent.click(screen.getByRole("button", { name: "播放单词发音" }));

    expect(playBritishPronunciation).not.toHaveBeenCalled();
  });
});
it("offers explicit paid retry only after pronunciation failure", async () => {
  vi.mocked(playBritishPronunciation)
    .mockRejectedValueOnce(new Error("unavailable"))
    .mockResolvedValue(undefined);
  render(<MobileBritishPronunciationButton word="record" wordId={12} />);
  await userEvent.click(screen.getByRole("button", { name: "播放单词发音" }));
  await userEvent.click(
    await screen.findByRole("button", { name: "重试发音" }),
  );
  expect(playBritishPronunciation).toHaveBeenNthCalledWith(
    1,
    "record",
    12,
    expect.not.objectContaining({ retryUid: expect.any(String) }),
  );
  expect(playBritishPronunciation).toHaveBeenNthCalledWith(
    2,
    "record",
    12,
    expect.objectContaining({ retryUid: expect.any(String) }),
  );
  cleanup();
});
