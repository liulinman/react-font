import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";
import { useStudyDraft, getStudyResumePath } from "./studyStorage";
type Draft = { done: boolean };
const valid = (v: unknown): v is Draft =>
  !!v && typeof (v as Draft).done === "boolean";
beforeEach(() => localStorage.clear());
it("remembers the exact selected-word round for the correct account, clearing on completion", () => {
  const path = "/mobile/review?wordIds=2&direction=1&round=19-1-123";
  const { result } = renderHook(() =>
    useStudyDraft(7, "review:2:round:19-1-123", valid, {
      path,
      complete: (d) => d.done,
    }),
  );
  act(() => result.current.setDraft({ done: false }));
  expect(getStudyResumePath(7, "review")).toBe(path);
  expect(getStudyResumePath(8, "review")).toBeNull();
  act(() => result.current.setDraft({ done: true }));
  expect(getStudyResumePath(7, "review")).toBeNull();
});
