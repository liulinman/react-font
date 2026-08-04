import { describe, expect, it, vi } from "vitest";
import {
  readWordLibraryView,
  writeWordLibraryView,
} from "./wordLibraryViewPreference";

describe("wordLibraryViewPreference", () => {
  it.each(["list", "card"] as const)("reads %s", (value) => {
    expect(readWordLibraryView({ getItem: () => value })).toBe(value);
  });

  it.each([null, "grid", "", "CARD"])(
    "falls back to list for %s",
    (value) => {
      expect(readWordLibraryView({ getItem: () => value })).toBe("list");
    },
  );

  it("falls back when storage throws", () => {
    expect(
      readWordLibraryView({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("list");
  });

  it("writes the validated view", () => {
    const setItem = vi.fn();

    writeWordLibraryView("card", { setItem });

    expect(setItem).toHaveBeenCalledWith(
      "english-world:word-library-view",
      "card",
    );
  });

  it("does not block view changes when writing fails", () => {
    expect(() =>
      writeWordLibraryView("list", {
        setItem: () => {
          throw new Error("blocked");
        },
      }),
    ).not.toThrow();
  });
});
