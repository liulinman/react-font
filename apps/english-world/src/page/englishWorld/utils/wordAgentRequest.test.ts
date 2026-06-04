import { describe, expect, it } from "vitest";
import { buildWordAgentRequestBody } from "./wordAgentRequest";

describe("buildWordAgentRequestBody", () => {
  it("keeps an English phrase as a single query item", () => {
    expect(buildWordAgentRequestBody("knock over")).toEqual({
      word: "knock over",
    });
  });

  it("splits multiple query items by comma or new line without splitting phrases", () => {
    expect(buildWordAgentRequestBody("knock over, vibe\nstudent debt")).toEqual({
      words: ["knock over", "vibe", "student debt"],
    });
  });

  it("ignores empty separators", () => {
    expect(buildWordAgentRequestBody(" vibe ，  ,\n recover ")).toEqual({
      words: ["vibe", "recover"],
    });
  });
});
