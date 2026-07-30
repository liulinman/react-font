import { Input, Radio } from "antd";
import type { ReactNode } from "react";
import type {
  ContextLabAnswer,
  ContextLabAnswerValue,
  ContextLabAttemptResult,
  ContextLabQuestion,
} from "../types/learning";

const STATUS_LABELS: Record<ContextLabAttemptResult["status"], string> = {
  correct: "正确",
  incorrect: "错误",
  unanswered: "未作答",
};

const REASON_LABELS: Record<
  NonNullable<ContextLabAttemptResult["reasonCode"]>,
  string
> = {
  word_limit_exceeded: "答案超过字数限制",
  answer_mismatch: "答案与标准答案不符",
};

function formatOption(option: string | undefined, index: number) {
  if (!Number.isInteger(index) || index < 0) return "结果不可用";
  const letter =
    index < 26
      ? String.fromCharCode("A".charCodeAt(0) + index)
      : String(index + 1);
  return option ? `${letter}. ${option}` : letter;
}

function formatChoiceExplanation(explanation: string, correctIndex: number) {
  if (correctIndex < 0) return explanation;
  const getLetter = (index: number) =>
    index < 26
      ? String.fromCharCode("A".charCodeAt(0) + index)
      : String(index + 1);
  const letter = getLetter(correctIndex);
  const toAnswerLetter = (_match: string, prefix: string, optionIndex: string) =>
    `${prefix} ${getLetter(Number(optionIndex))}`;

  return explanation
    .replace(/正确答案为\s*\d+/g, `正确答案为 ${letter}`)
    .replace(/正确答案是\s*\d+/g, `正确答案是 ${letter}`)
    .replace(/(你选(?:了)?)[\s：:]*(\d+)\b/g, toAnswerLetter);
}

function getResultAnswerLabels(
  question: ContextLabQuestion | undefined,
  result: ContextLabAttemptResult,
) {
  switch (result.responseType) {
    case "single_choice": {
      const userIndex = result.userAnswer?.selectedIndex;
      const correctIndex = result.correctAnswer.correctIndex;
      const options =
        question?.responseType === "single_choice" ? question.options : [];
      return {
        userAnswer:
          userIndex === undefined
            ? "未作答"
            : formatOption(options[userIndex], userIndex),
        correctAnswer: formatOption(options[correctIndex], correctIndex),
        explanation: formatChoiceExplanation(result.explanation, correctIndex),
      };
    }
    case "true_false_not_given":
      return {
        userAnswer: result.userAnswer?.selectedValue ?? "未作答",
        correctAnswer: result.correctAnswer.correctValue,
        explanation: result.explanation,
      };
    case "text_completion":
    case "short_answer":
      return {
        userAnswer: result.userAnswer?.text || "未作答",
        correctAnswer: result.correctAnswer.acceptedAnswers.join(" / "),
        explanation: result.explanation,
      };
  }
}

export function ContextLabQuestionResult({
  question,
  result,
}: {
  question?: ContextLabQuestion;
  result: ContextLabAttemptResult;
}) {
  const labels = getResultAnswerLabels(question, result);

  return (
    <div
      className={`context-lab-field-result context-lab-field-result-${result.status}`}
    >
      <div className="context-lab-field-result-status">
        状态：{STATUS_LABELS[result.status]}
      </div>
      <div>你的答案：{labels.userAnswer}</div>
      <div>正确答案：{labels.correctAnswer}</div>
      {result.reasonCode && (
        <div className="context-lab-field-result-reason">
          原因：{REASON_LABELS[result.reasonCode]}
        </div>
      )}
      {labels.explanation && (
        <div className="context-lab-question-explanation">
          <span className="learning-cockpit-label">解析</span>
          <p>{labels.explanation}</p>
        </div>
      )}
    </div>
  );
}

function getAnswerOnlyLabel(
  question: ContextLabQuestion | undefined,
  answer: ContextLabAnswer,
) {
  switch (answer.responseType) {
    case "single_choice": {
      const options =
        question?.responseType === "single_choice" ? question.options : [];
      return formatOption(options[answer.selectedIndex], answer.selectedIndex);
    }
    case "true_false_not_given":
      return answer.selectedValue;
    case "text_completion":
    case "short_answer":
      return answer.text || "未作答";
  }
}

export function ContextLabAnswerOnlyResult({
  answer,
  question,
}: {
  answer: ContextLabAnswer;
  question?: ContextLabQuestion;
}) {
  return (
    <div className="context-lab-field-result context-lab-field-result-unavailable">
      <div className="context-lab-field-result-status">结果不可用</div>
      <div>你的答案：{getAnswerOnlyLabel(question, answer)}</div>
    </div>
  );
}

export function ContextLabQuestionField({
  disabled,
  number,
  onChange,
  question,
  result,
  value,
}: {
  disabled: boolean;
  number: number;
  onChange: (value: ContextLabAnswerValue) => void;
  question: ContextLabQuestion;
  result?: ContextLabAttemptResult;
  value?: ContextLabAnswerValue;
}) {
  let field: ReactNode;

  switch (question.responseType) {
    case "single_choice":
      field = (
        <Radio.Group
          disabled={disabled}
          options={question.options.map((option, optionIndex) => ({
            label: formatOption(option, optionIndex),
            value: optionIndex,
          }))}
          value={value?.selectedIndex}
          onChange={(event) => onChange({ selectedIndex: event.target.value })}
        />
      );
      break;
    case "true_false_not_given":
      field = (
        <Radio.Group
          disabled={disabled}
          options={question.options.map((option) => ({
            label: option,
            value: option,
          }))}
          value={value?.selectedValue}
          onChange={(event) => onChange({ selectedValue: event.target.value })}
        />
      );
      break;
    case "text_completion":
    case "short_answer":
      field = (
        <Input
          aria-label={`第 ${number} 题答案，最多 ${question.wordLimit} 个词`}
          autoCapitalize="none"
          autoComplete="off"
          disabled={disabled}
          spellCheck={false}
          value={value?.text ?? ""}
          onChange={(event) => onChange({ text: event.target.value })}
        />
      );
      break;
  }

  return (
    <div className="context-lab-question-field">
      {field}
      {result && (
        <ContextLabQuestionResult question={question} result={result} />
      )}
    </div>
  );
}
