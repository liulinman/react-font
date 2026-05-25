import { describe, expect, it } from "vitest";
import { getLevelLabel, getPartSpeechLabel, getTypeLabel } from "./wordLabels";

describe("wordLabels", () => {
  it("返回单词类型标签", () => {
    expect(getTypeLabel(0)).toEqual({ label: "单词", color: "blue" });
    expect(getTypeLabel(1)).toEqual({ label: "短语", color: "green" });
  });

  it("返回掌握程度标签", () => {
    expect(getLevelLabel(0)).toEqual({ label: "不会", color: "red" });
    expect(getLevelLabel(3)).toEqual({ label: "精通", color: "green" });
  });

  it("返回词性标签", () => {
    expect(getPartSpeechLabel(1)).toEqual({ label: "动词", color: "blue" });
    expect(getPartSpeechLabel(2)).toEqual({ label: "名词", color: "green" });
    expect(getPartSpeechLabel(3)).toEqual({ label: "形容词", color: "orange" });
    expect(getPartSpeechLabel(5)).toEqual({ label: "代词", color: "red" });
  });
});
