import type {
  LearningSessionDetailV1,
  LearningSessionResultV1,
} from "../contracts/learning-session";

function fallbackResult(snapshot: LearningSessionDetailV1): LearningSessionResultV1 {
  const independentCorrect = snapshot.submittedResults.filter(
    (attempt) => attempt.outcome === "correct",
  ).length;
  const needsWork = snapshot.submittedResults.filter(
    (attempt) => attempt.outcome !== "correct",
  ).length;
  return {
    completedWords: snapshot.submittedResults.length,
    elapsedSeconds: 0,
    independentCorrect,
    hintedCorrect: 0,
    needsWork,
    pending: 0,
    levelChanges: 0,
    words: [],
  };
}
export function LearningResultView({ snapshot }: { snapshot: LearningSessionDetailV1 }) {
  const result = snapshot.result ?? fallbackResult(snapshot);
  return (
    <section aria-label="学习结果" className="learning-result-view">
      <h1>学习结果</h1>
      <p>已完成 {result.completedWords} 个词</p>
      <div className="learning-result-metrics">
        <article>
          <strong>{result.independentCorrect}</strong>
          <span>独立答对</span>
        </article>
        <article>
          <strong>{result.hintedCorrect}</strong>
          <span>提示后答对</span>
        </article>
        <article>
          <strong>{result.needsWork}</strong>
          <span>仍需加强</span>
        </article>
        <article>
          <strong>{result.pending}</strong>
          <span>待处理</span>
        </article>
      </div>
      <p>等级变化 {result.levelChanges} 个词</p>
      {result.words.length > 0 ? (
        <ul className="learning-result-words">
          {result.words.map((word) => (
            <li key={word.wordId}>
              <strong>{word.word}</strong>
              <span>
                {word.originalLevel} → {word.systemLevel}
                {word.manualLevel === null ? "" : `（手动等级 ${word.manualLevel}）`}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
