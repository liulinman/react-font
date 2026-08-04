import type {
  LearningSessionDetailV1,
} from "../contracts/learning-session";

export function LearningResultView({ snapshot }: { snapshot: LearningSessionDetailV1 }) {
  const result = snapshot.result;
  if (!result) {
    const correct = snapshot.submittedResults.filter(
      (attempt) => attempt.outcome === "correct",
    ).length;
    const incorrect = snapshot.submittedResults.filter(
      (attempt) => attempt.outcome === "incorrect",
    ).length;
    const skipped = snapshot.submittedResults.filter(
      (attempt) => attempt.outcome === "skipped",
    ).length;

    return (
      <section aria-label="学习结果" className="learning-result-view">
        <h1>学习结果</h1>
        <section aria-label="作答结果">
          <h2>作答结果</h2>
          <p>{snapshot.submittedResults.length} 次作答</p>
          <ul>
            <li>答对 {correct} 次</li>
            <li>答错 {incorrect} 次</li>
            <li>跳过 {skipped} 次</li>
          </ul>
        </section>
        <p role="status">
          单词完成数、提示使用和等级变化暂无统计，等待服务端汇总。
        </p>
      </section>
    );
  }

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
