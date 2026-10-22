import type { PracticeContent } from "./api/readingPractice.type";
export function ReadingQuestionReadout({
  question: q,
}: {
  question: PracticeContent["questions"][number];
}) {
  return (
    <div className="reading-question-readout">
      <h3>{q.stem}</h3>
      {q.instructions && <p>{q.instructions}</p>}
      {q.kind === "sentence_completion" && q.maxWords && <p>最多填写 {q.maxWords} 个词</p>}
      <ol className="reading-workbench-options">
        {q.options.map((option, index) => (
          <li
            key={index}
            className={q.correctIndex === index ? "is-correct" : ""}
          >
            {readingOptionLabel(q.kind, option, index)}
            {q.correctIndex === index && (
              <span className="reading-workbench-answer-mark">正确答案</span>
            )}
          </li>
        ))}
      </ol>
      <div className="reading-workbench-explanation">
        <strong>
          {q.kind === "sentence_completion"
            ? q.acceptedAnswers?.some((answer) => answer.trim()) ? `正确答案：${q.acceptedAnswers.join(" / ")}` : "尚未设置正确答案，请先修改本题。"
            : q.correctIndex == null
            ? "尚未设置正确答案，请先修改本题。"
            : `正确答案：${readingOptionLabel(q.kind, q.options[q.correctIndex], q.correctIndex)}`}
        </strong>
        <p>{q.explanation || "暂无解析，请核实后补充。"}</p>
        <details>
          <summary>查看原文依据 · 第 {q.evidence.paragraph} 段</summary>
          <p>
            {q.evidence.quote ||
              q.evidence.missingInformation ||
              "尚未填写原文依据，请核实。"}
          </p>
        </details>
      </div>
    </div>
  );
}

export function readingOptionLabel(kind: string, option: string, index: number) {
  return kind === "matching_features" && /^[A-T][.)\s]/.test(option)
    ? option : `${String.fromCharCode(65 + index)}. ${option}`;
}
