import { describe, expect, it } from "vitest";
import {
  buildMicroGenerateParams,
  isInvalidMicroContextEntry,
  parseMicroContextEntry,
} from "./microContext";

describe("microContext", () => {
  it("parses a valid recite-result micro entry", () => {
    expect(
      parseMicroContextEntry(
        "?mode=micro&source=recite-result&reciteSessionId=91&words=fragile,resilient",
      ),
    ).toEqual({
      mode: "micro",
      source: "recite-result",
      reciteSessionId: 91,
      words: ["fragile", "resilient"],
    });
  });

  it("rejects incomplete, duplicate, or oversized micro entries", () => {
    expect(parseMicroContextEntry("?mode=micro&words=")).toBeNull();
    expect(
      parseMicroContextEntry(
        "?mode=micro&source=recite-result&reciteSessionId=91&words=a,b,c,d",
      ),
    ).toBeNull();
    expect(
      parseMicroContextEntry(
        "?mode=micro&source=recite-result&reciteSessionId=91&words=a,A",
      ),
    ).toBeNull();
  });

  it("distinguishes an invalid micro link from standard context lab", () => {
    expect(isInvalidMicroContextEntry("?mode=micro&words=")).toBe(true);
    expect(isInvalidMicroContextEntry("?source=cockpit&words=fragile")).toBe(false);
  });

  it("builds the exact verified custom task request", () => {
    expect(buildMicroGenerateParams(91, ["fragile", "resilient"])).toEqual({
      sourceType: "custom",
      mode: "micro",
      reciteSessionId: 91,
      words: ["fragile", "resilient"],
    });
  });

  it("adds a stable request uid when supplied", () => {
    expect(buildMicroGenerateParams(91, ["fragile"], "request-1")).toEqual({
      sourceType: "custom",
      mode: "micro",
      reciteSessionId: 91,
      words: ["fragile"],
      requestUid: "request-1",
    });
  });
});
