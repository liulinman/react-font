import type { RootFamilyPublicItemV1 } from "../../contracts/activity-contract";
import type { LearningAnswerDraft } from "../shared/answerDraft";

export interface RootFamilyActivityProps {
  item: RootFamilyPublicItemV1;
  draft: LearningAnswerDraft;
  submitting?: boolean;
  onDraftChange(draft: LearningAnswerDraft): void;
  onSubmit(draft: LearningAnswerDraft): void;
}

export function RootFamilyActivity({
  item,
  draft,
  submitting,
  onDraftChange,
  onSubmit,
}: RootFamilyActivityProps) {
  const selectedValue = draft.kind === "choice" ? draft.selectedValue : "";
  return (
    <section aria-label="词根词族练习" className="learning-activity root-family-activity">
      <p className="learning-root">词根：{item.root}</p>
      <fieldset disabled={submitting}>
        <legend>{item.prompt}</legend>
        {item.choices.map((choice) => (
          <label key={choice.value} className="learning-choice">
            <input
              type="radio"
              name={`root-family-${item.itemUid}`}
              value={choice.value}
              checked={selectedValue === choice.value}
              onChange={() => onDraftChange({ kind: "choice", selectedValue: choice.value })}
            />
            {choice.label}
          </label>
        ))}
      </fieldset>
      <button type="button" disabled={submitting || !selectedValue} onClick={() => onSubmit({ kind: "choice", selectedValue })}>提交答案</button>
      <button type="button" disabled={submitting} onClick={() => onSubmit({ kind: "skip", reason: "dont_know" })}>暂时不会</button>
    </section>
  );
}
