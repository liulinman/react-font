import { describe, expect, it } from "vitest";
import { getLevelLabel, getPartSpeechLabel, getTypeLabel } from "./wordLabels";

describe("wordLabels", () => {
  it("返回单词类型标签", () => {
    expect(getTypeLabel(1)).toEqual({ label: "短语", color: "success" });
  });

  it("返回掌握程度标签", () => {
    expect(getLevelLabel(3)).toEqual({ label: "精通", color: "success" });
  });

  it("返回词性标签", () => {
    expect(getPartSpeechLabel(2)).toEqual({ label: "名词", color: "success" });
  });
});
