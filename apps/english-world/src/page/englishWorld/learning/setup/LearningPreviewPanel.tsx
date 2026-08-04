import type { LearningPlanPreviewV1 } from "../contracts/learning-session";

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  if (minutes === 0) return `预计 ${remainingSeconds} 秒`;
  if (remainingSeconds === 0) return `预计 ${minutes} 分钟`;
  return `预计 ${minutes} 分 ${remainingSeconds} 秒`;
}

export interface LearningPreviewPanelProps {
  preview?: LearningPlanPreviewV1;
  loading: boolean;
  error?: string;
  excludedWordIds: number[];
  onExcludeWord(wordId: number): void;
}

export function LearningPreviewPanel({
  preview,
  loading,
  error,
  excludedWordIds,
  onExcludeWord,
}: LearningPreviewPanelProps) {
  if (loading) return <p role="status">正在生成权威预览…</p>;
  if (error) return <p role="alert">{error}</p>;
  if (!preview) return <p>请选择至少一种可用模式。</p>;

  const unadaptedWords = preview.words.filter(
    (word) => word.adaptationStatus === "unadapted",
  );

  return (
    <section aria-label="学习计划预览" className="learning-preview-panel">
      <strong>{formatDuration(preview.estimatedSeconds)}</strong>
      <span>，共 {preview.wordCount} 个词</span>
      {unadaptedWords.length > 0 ? (
        <div className="learning-preview-warning" role="alert">
          <p>以下词条暂不能适配。请逐项排除后重新预览：</p>
          {unadaptedWords.map((word) => (
            <label key={word.wordId}>
              <input
                aria-label={`排除词条 ${word.wordId}`}
                type="checkbox"
                checked={excludedWordIds.includes(word.wordId)}
                onChange={() => onExcludeWord(word.wordId)}
              />
              <span>{`排除词条 ${word.wordId}`}</span>
              <span>{`词条 #${word.wordId}：${word.reason ?? "当前模式不可用"}`}</span>
            </label>
          ))}
        </div>
      ) : (
        <p className="learning-preview-ready">✓ 全部词条已通过预览</p>
      )}
    </section>
  );
}
