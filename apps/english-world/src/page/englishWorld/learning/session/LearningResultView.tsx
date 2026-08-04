import type {
  LearningSessionDetailV1,
} from "../contracts/learning-session";
import type { LearningMode } from "../contracts/activity-contract";

const MODE_LABELS: Record<LearningMode, string> = {
  root_family: "词根词族",
  micro_scene: "微场景",
  confusion: "易混辨析",
  listening: "听音记忆",
  output: "主动输出",
};

function formatElapsed(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes > 0
    ? `${minutes} 分 ${remainingSeconds} 秒`
    : `${remainingSeconds} 秒`;
}

function formatReviewAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "时间待同步";
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Shanghai",
    hour12: false,
  }).format(date);
}

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
      <p>用时 {formatElapsed(result.elapsedSeconds)}</p>
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
              <div className="learning-result-word-detail">
                <span>
                  掌握度 {word.originalLevel} → {word.systemLevel}
                  {word.manualLevel === null
                    ? ""
                    : `（用户调整为 ${word.manualLevel}）`}
                </span>
                <span>
                  下次复习{" "}
                  <time dateTime={word.nextReviewAt}>
                    {formatReviewAt(word.nextReviewAt)}
                  </time>
                </span>
                <span>推荐方式：{MODE_LABELS[word.recommendedMode]}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
