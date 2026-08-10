import type { OutputPublicItemV1 } from "../../contracts/activity-contract";
import type { LearningAnswerDraft } from "../shared/answerDraft";

export interface OutputActivityProps {
  item: OutputPublicItemV1;
  draft: LearningAnswerDraft;
  submitting?: boolean;
  onDraftChange(draft: LearningAnswerDraft): void;
  onSubmit(draft: LearningAnswerDraft): void;
}

export function OutputActivity({ item, draft, submitting, onDraftChange, onSubmit }: OutputActivityProps) {
  const text = draft.kind === "output" ? draft.text : "";
  return (
    <section aria-label="主动输出练习" className="learning-activity output-activity">
      <p>{item.prompt}</p>
      <p className="learning-output-cue">首字母 {item.cue.firstLetter}，共 {item.cue.length} 个字母</p>
      <label>
        写下你的回答
        <textarea value={text} disabled={submitting} rows={5} onChange={(event) => onDraftChange({ kind: "output", text: event.target.value })} />
      </label>
      <button type="button" disabled={submitting || !text.trim()} onClick={() => onSubmit({ kind: "output", text })}>提交答案</button>
      <button type="button" disabled={submitting} onClick={() => onSubmit({ kind: "skip", reason: "dont_know" })}>暂时不会</button>
    </section>
  );
}
