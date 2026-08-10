import type { ConfusionPublicItemV1 } from "../../contracts/activity-contract";
import type { LearningAnswerDraft } from "../shared/answerDraft";

export interface ConfusionActivityProps {
  item: ConfusionPublicItemV1;
  draft: LearningAnswerDraft;
  submitting?: boolean;
  onDraftChange(draft: LearningAnswerDraft): void;
  onSubmit(draft: LearningAnswerDraft): void;
}

export function ConfusionActivity({ item, draft, submitting, onDraftChange, onSubmit }: ConfusionActivityProps) {
  const selectedValue = draft.kind === "choice" ? draft.selectedValue : "";
  return (
    <section aria-label="易混辨析练习" className="learning-activity confusion-activity">
      <p className="learning-target-word">{item.targetWord}</p>
      <p>{item.contrast}</p>
      <fieldset disabled={submitting}>
        <legend>{item.prompt}</legend>
        {item.choices.map((choice) => (
          <label key={choice.value} className="learning-choice">
            <input type="radio" name={`confusion-${item.itemUid}`} value={choice.value} checked={selectedValue === choice.value} onChange={() => onDraftChange({ kind: "choice", selectedValue: choice.value })} />
            {choice.label}
          </label>
        ))}
      </fieldset>
      <button type="button" disabled={submitting || !selectedValue} onClick={() => onSubmit({ kind: "choice", selectedValue })}>提交答案</button>
      <button type="button" disabled={submitting} onClick={() => onSubmit({ kind: "skip", reason: "dont_know" })}>暂时不会</button>
    </section>
  );
}
