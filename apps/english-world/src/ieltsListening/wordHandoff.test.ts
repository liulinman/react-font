import { describe, it, expect } from "vitest";
import { listeningWordPrefill } from "./wordHandoff";
describe("listening word handoff", () => {
  it("preserves a chosen word and owned attempt reference for explicit addition", () => {
    expect(
      listeningWordPrefill(
        "?englishWord=reasonable&listeningAttempt=123e4567-e89b-42d3-a456-426614174000",
      ),
    ).toEqual({
      englishWord: "reasonable",
      englishReference:
        "/englishWorld/ielts-listening?attempt=123e4567-e89b-42d3-a456-426614174000",
    });
  });
  it("ignores unrelated or invalid handoff parameters", () => {
    expect(listeningWordPrefill("?englishWord=round")).toBeNull();
    expect(
      listeningWordPrefill("?englishWord=bad&listeningAttempt=javascript:foo"),
    ).toBeNull();
  });
});
