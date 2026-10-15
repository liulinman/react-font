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
      <ol className="reading-workbench-options">
        {q.options.map((option, index) => (
          <li
            key={index}
            className={q.correctIndex === index ? "is-correct" : ""}
          >
            <b>{String.fromCharCode(65 + index)}.</b> {option}
            {q.correctIndex === index && (
              <span className="reading-workbench-answer-mark">正确答案</span>
            )}
          </li>
        ))}
      </ol>
      <div className="reading-workbench-explanation">
        <strong>
          {q.correctIndex == null
            ? "尚未设置正确答案，请先修改本题。"
            : `正确答案：${String.fromCharCode(65 + q.correctIndex)}. ${q.options[q.correctIndex]}`}
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
