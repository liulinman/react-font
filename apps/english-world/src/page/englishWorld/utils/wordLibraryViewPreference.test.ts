import { describe, expect, it } from "vitest";
import { wordLibraryViewPreference } from "./wordLibraryViewPreference";

describe("wordLibraryViewPreference", () => {
  it.each(["list", "card"] as const)("reads %s", (value) => {
    expect(wordLibraryViewPreference.read({ getItem: () => value })).toBe(
      value,
    );
  });

  it.each([null, "grid", "", "CARD"])(
    "falls back to list for %s",
    (value) => {
      expect(
        wordLibraryViewPreference.read({ getItem: () => value }),
      ).toBe("list");
    },
  );

  it("falls back when storage throws", () => {
    expect(
      wordLibraryViewPreference.read({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("list");
  });

  it("writes the validated view", () => {
    const values = new Map<string, string>();

    wordLibraryViewPreference.write("card", {
      setItem: (key, value) => values.set(key, value),
    });

    expect(values.get("english-world:word-library-view")).toBe("card");
  });

  it("does not block view changes when writing fails", () => {
    expect(() =>
      wordLibraryViewPreference.write("list", {
        setItem: () => {
          throw new Error("blocked");
        },
      }),
    ).not.toThrow();
  });
});
