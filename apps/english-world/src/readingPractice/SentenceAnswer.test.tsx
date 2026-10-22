import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { SentenceAnswer, hasReadingAnswer, exceedsWordLimit } from "./SentenceAnswer";
import { usePracticeDraft } from "./usePracticeDraft";
afterEach(() => { cleanup(); localStorage.clear(); });
it("places a writable field in the printed blank and shows the word restriction", () => {
 const change = vi.fn();
 render(<SentenceAnswer stem="A group called ........ ." number={1} value="two words" maxWords={1} onChange={change} />);
 const input = screen.getByRole("textbox", {name:"第 1 题答案"});
 expect(input.parentElement?.textContent).toBe("A group called  .");
 expect(input).toHaveAttribute("aria-invalid", "true");
 expect(screen.getByRole("alert")).toHaveTextContent("超过词数限制");
 fireEvent.change(input, {target: {value:"theropods"}});
 expect(change).toHaveBeenCalledWith("theropods");
 expect(hasReadingAnswer("  ")).toBe(false);
 expect(hasReadingAnswer(0)).toBe(true);
 expect(exceedsWordLimit("  meat-eating  ",1)).toBe(false);
});
it("restores and updates a saved text answer", () => {
 const questions = [{id:"blank",kind:"sentence_completion" as const,stem:"called ___",options:[]}];
 localStorage.setItem("reading-practice:v1:7:1",JSON.stringify({schemaVersion:1,requestUid:"submission-123",savedAt:Date.now(),answers:{blank:"theropods"}}));
 function Draft(){const {draft,choose}=usePracticeDraft(7,1,questions);return <input aria-label="draft" value={draft.answers.blank ?? ""} onChange={e=>choose("blank",e.target.value)} />;}
 render(<Draft/>);
 expect(screen.getByLabelText("draft")).toHaveValue("theropods");
 fireEvent.change(screen.getByLabelText("draft"),{target:{value:"collarbones"}});
 expect(JSON.parse(localStorage.getItem("reading-practice:v1:7:1")!).answers.blank).toBe("collarbones");
});
