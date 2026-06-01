import { describe, expect, it } from "vitest";
import {
  normalizeAudioUrl,
  selectBritishAudioUrl,
} from "./pronunciation";

describe("pronunciation", () => {
  it("优先选择英式发音音频", () => {
    expect(
      selectBritishAudioUrl([
        { audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3" },
        { audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3" },
      ]),
    ).toBe("https://api.dictionaryapi.dev/media/pronunciations/en/hello-uk.mp3");
  });

  it("识别 Google 字典的 gb 音频", () => {
    expect(
      selectBritishAudioUrl([
        { audio: "//ssl.gstatic.com/dictionary/static/sounds/20200429/hello--_gb_1.mp3" },
      ]),
    ).toBe("https://ssl.gstatic.com/dictionary/static/sounds/20200429/hello--_gb_1.mp3");
  });

  it("没有英式音频时返回 null", () => {
    expect(
      selectBritishAudioUrl([
        { audio: "https://api.dictionaryapi.dev/media/pronunciations/en/hello-us.mp3" },
        { text: "/həˈləʊ/" },
      ]),
    ).toBeNull();
  });

  it("补齐协议相对 URL", () => {
    expect(normalizeAudioUrl("//example.com/audio.mp3")).toBe(
      "https://example.com/audio.mp3",
    );
  });
});
