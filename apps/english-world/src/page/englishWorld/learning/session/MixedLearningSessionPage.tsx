import { Button, Spin } from "antd";
import { useParams } from "react-router-dom";
import { activityRegistry } from "./activityRegistry";
import { LearningResultView } from "./LearningResultView";
import { LearningSessionShell } from "./LearningSessionShell";
import { useLearningSession } from "./useLearningSession";
import "../learning.css";

export function MixedLearningSessionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = Number(params.sessionId);
  const learning = useLearningSession(sessionId);

  if (!Number.isSafeInteger(sessionId) || sessionId <= 0) {
    return <main className="mixed-learning-session-page" role="alert">无效的学习会话。</main>;
  }
  if (learning.loadError && !learning.state) {
    return (
      <main className="mixed-learning-session-page" role="alert">
        学习会话加载失败，请稍后重试。
      </main>
    );
  }
  if (learning.loading || !learning.state) {
    return (
      <main className="mixed-learning-session-page" aria-label="正在加载学习会话">
        <Spin />
      </main>
    );
  }
  const { snapshot, interaction } = learning.state;
  if (snapshot.status === "completed") {
    return <LearningResultView snapshot={snapshot} />;
  }

  const currentItem = snapshot.currentItem;
  const Activity = currentItem ? activityRegistry[currentItem.mode] : null;
  const busy = interaction?.status === "submitting";
  const stale =
    learning.actionError?.code === "LEARNING_ITEM_STALE" ||
    learning.actionError?.code === "LEARNING_SESSION_UPGRADE_REQUIRED" ||
    learning.actionError?.code === "REFRESH_FAILED";

  return (
    <LearningSessionShell
      snapshot={snapshot}
      busy={busy}
      errorMessage={learning.actionError?.message}
      stale={stale}
      feedback={learning.feedback}
      onPauseToggle={learning.pauseToggle}
      onRefresh={learning.refresh}
    >
      {snapshot.status === "paused" ? (
        <section aria-label="学习已暂停">
          <h1>学习已暂停</h1>
          <p>继续时会从当前题目恢复。</p>
        </section>
      ) : interaction?.status === "sync_failed" ? (
        <section aria-label="提交恢复操作" className="learning-sync-actions">
          <Button type="primary" onClick={learning.retrySubmit}>重试提交</Button>
          <Button onClick={learning.editAfterFailure}>修改答案</Button>
        </section>
      ) : Activity && currentItem && interaction &&
        (interaction.status === "editing" || interaction.status === "submitting") ? (
        <Activity
          item={currentItem.item}
          draft={interaction.draft}
          hints={interaction.status === "editing" ? interaction.hints : []}
          submitting={interaction.status === "submitting"}
          onDraftChange={learning.changeDraft}
          onRevealHint={learning.revealHint}
          onSubmit={learning.submit}
        />
      ) : !currentItem && snapshot.status === "active" ? (
        <section aria-label="所有题目已完成">
          <h1>本轮题目已完成</h1>
          <Button type="primary" onClick={learning.complete}>查看学习结果</Button>
        </section>
      ) : (
        <section role="status">正在同步下一题…</section>
      )}
    </LearningSessionShell>
  );
}
