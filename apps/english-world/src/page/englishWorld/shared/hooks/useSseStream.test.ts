import { describe, expect, it } from "vitest";
import { parseSseLines } from "./useSseStream";

describe("parseSseLines", () => {
  it("parses event stream lines into payload objects", () => {
    const events = parseSseLines(
      'data: {"type":"chunk","data":"hello"}\n\ndata: {"type":"done","data":{"ok":true}}\n',
    );

    expect(events).toEqual([
      { type: "chunk", data: "hello" },
      { type: "done", data: { ok: true } },
    ]);
  });

  it("ignores malformed and non-data lines", () => {
    const events = parseSseLines(
      'event: message\ndata: {"type":"chunk","data":"valid"}\ndata: not-json\n\n',
    );

    expect(events).toEqual([{ type: "chunk", data: "valid" }]);
  });
});
