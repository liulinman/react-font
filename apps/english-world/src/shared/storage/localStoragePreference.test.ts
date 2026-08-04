import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalStoragePreference } from "./localStoragePreference";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  constructor(entries: ReadonlyArray<readonly [string, string]> = []) {
    entries.forEach(([key, value]) => this.values.set(key, value));
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

const createViewPreference = () =>
  createLocalStoragePreference<"list" | "card">({
    key: "test:view",
    defaultValue: "list",
    isValid: (value): value is "list" | "card" =>
      value === "list" || value === "card",
  });

describe("createLocalStoragePreference", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each(["list", "card"] as const)("reads a valid %s value", (value) => {
    const preference = createViewPreference();

    expect(
      preference.read(new MemoryStorage([["test:view", value]])),
    ).toBe(value);
  });

  it.each([null, "grid", "", "CARD"])(
    "falls back to the default for %s",
    (value) => {
      const preference = createViewPreference();

      expect(preference.read({ getItem: () => value })).toBe("list");
    },
  );

  it("falls back to the default when storage is unavailable", () => {
    const preference = createViewPreference();
    vi.stubGlobal("window", undefined);

    expect(preference.read()).toBe("list");
  });

  it("falls back to the default when reading throws", () => {
    const preference = createViewPreference();

    expect(
      preference.read({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBe("list");
  });

  it("writes the value to the configured key", () => {
    const preference = createViewPreference();
    const storage = new MemoryStorage();

    preference.write("card", storage);

    expect(storage.getItem("test:view")).toBe("card");
  });

  it("does not block the interaction when writing throws", () => {
    const preference = createViewPreference();

    expect(() =>
      preference.write("list", {
        setItem: () => {
          throw new Error("blocked");
        },
      }),
    ).not.toThrow();
  });
});
