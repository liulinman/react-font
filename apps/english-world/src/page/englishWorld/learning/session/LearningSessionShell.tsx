import type { ReactNode } from "react";
import { Button } from "antd";
import type {
  LearningSessionDetailV1,
  SubmitLearningAttemptResultV1,
} from "../contracts/learning-session";

export interface LearningSessionShellProps {
  snapshot: LearningSessionDetailV1;
  busy: boolean;
  errorMessage?: string;
  stale: boolean;
  feedback?: SubmitLearningAttemptResultV1;
  children: ReactNode;
  onPauseToggle(): void;
  onRefresh(): void;
}
export function LearningSessionShell({
  snapshot,
  busy,
  errorMessage,
  stale,
  feedback,
  children,
  onPauseToggle,
  onRefresh,
}: LearningSessionShellProps) {
  const paused = snapshot.status === "paused";
  return (
    <main className="mixed-learning-session-page">
      <header className="learning-session-header">
        <div>
          <span>混合记忆</span>
          <strong>会话 #{snapshot.sessionId}</strong>
        </div>
        {snapshot.status === "active" || paused ? (
          <Button disabled={busy} onClick={onPauseToggle}>
            {paused ? "继续学习" : "暂停学习"}
          </Button>
        ) : null}
      </header>

      {errorMessage ? (
        <div role="alert" className="learning-session-error">
          <span>⚠ {errorMessage}</span>
          {stale ? (
            <Button onClick={onRefresh}>刷新学习进度</Button>
          ) : null}
        </div>
      ) : null}
      {feedback ? (
        <p
          className={`learning-session-feedback learning-session-feedback-${feedback.outcome}`}
          role="status"
        >
          {feedback.outcome === "correct"
            ? "✓ 回答正确"
            : feedback.outcome === "incorrect"
              ? "✕ 回答错误"
              : "↷ 本题已跳过"}
        </p>
      ) : null}
      {children}
    </main>
  );
}
