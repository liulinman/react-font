import { useCallback, useEffect, useRef, useState } from "react";
import request from "@font/api";
import { useQuery } from "@tanstack/react-query";
import {
  completeLearningSession,
  learningSessionDetail,
  pauseLearningSession,
  submitLearningAttempt,
} from "../api/learningApi";
import { learningKeys } from "../api/learningKeys";
import type { LearningAnswerDraft } from "../activities/shared/answerDraft";
import type { HintType } from "../activities/shared/answerDraft";
import type {
  LearningSessionApiErrorV1,
  LearningSessionDetailV1,
  SubmitLearningAttemptCommandV1,
  SubmitLearningAttemptResultV1,
} from "../contracts/learning-session";
import { createLearningDraftStore } from "../shared/learningDraftStorage";
import {
  createLearningSessionState,
  learningSessionReducer,
  type LearningSessionState,
} from "./learningSessionReducer";

function createUid(prefix: string) {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid
    ? `${prefix}-${randomUuid}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readErrorCode(error: unknown) {
  const candidate = error as Partial<LearningSessionApiErrorV1> & {
    code?: string | number;
  };
  return candidate?.errorCode ?? String(candidate?.code ?? "UNKNOWN_ERROR");
}

function messageForError(code: string, action: "submit" | "transition") {
  if (code === "LEARNING_ITEM_STALE" || code === "LEARNING_SESSION_UPGRADE_REQUIRED") {
    return "学习进度已更新，请刷新后继续。";
  }
  if (code === "LEARNING_ANSWER_INVALID") return "答案格式无效，请修改后重试。";
  if (code === "LEARNING_RESOURCE_UNAVAILABLE") return "当前学习资源不可用，请刷新。";
  return action === "submit" ? "提交未同步，请重试。" : "状态更新失败，请重试。";
}

export function useLearningSession(sessionId: number) {
  const [state, setState] = useState<LearningSessionState | null>(null);
  const [feedback, setFeedback] = useState<SubmitLearningAttemptResultV1>();
  const [actionError, setActionError] = useState<{ code: string; message: string }>();
  const pendingAttemptRef = useRef<
    | {
        command: SubmitLearningAttemptCommandV1;
        itemUid: string;
      }
    | undefined
  >(undefined);
  const appliedSnapshotRef = useRef("");

  const detailQuery = useQuery({
    queryKey: learningKeys.session(sessionId),
    queryFn: () =>
      request<LearningSessionDetailV1>(learningSessionDetail({ sessionId })),
    enabled: Number.isSafeInteger(sessionId) && sessionId > 0,
    retry: false,
  });

  const applySnapshot = useCallback((snapshot: LearningSessionDetailV1) => {
    const itemUid = snapshot.currentItem?.item.itemUid;
    const identity = `${snapshot.sessionVersion}:${snapshot.status}:${itemUid ?? "none"}:${snapshot.submittedResults.length}`;
    if (appliedSnapshotRef.current === identity) return;
    appliedSnapshotRef.current = identity;
    setState((current) => {
      if (!current) {
        const restoredDraft = itemUid
          ? createLearningDraftStore(snapshot.sessionId, itemUid).load() ?? undefined
          : undefined;
        return createLearningSessionState(snapshot, restoredDraft);
      }
      const itemChanged =
        itemUid !== current.snapshot.currentItem?.item.itemUid;
      const restoredDraft = itemChanged && itemUid
        ? createLearningDraftStore(snapshot.sessionId, itemUid).load() ?? undefined
        : undefined;
      return learningSessionReducer(current, {
        type: "snapshot_replaced",
        snapshot,
        ...(itemChanged ? { restoredDraft } : {}),
      });
    });
  }, []);

  useEffect(() => {
    if (detailQuery.data) applySnapshot(detailQuery.data);
  }, [applySnapshot, detailQuery.data]);

  const replaceWithRefetch = useCallback(async () => {
    const refreshed = await detailQuery.refetch();
    if (refreshed.data) applySnapshot(refreshed.data);
  }, [applySnapshot, detailQuery]);

  const changeDraft = useCallback((draft: LearningAnswerDraft) => {
    setFeedback(undefined);
    setState((current) => {
      if (!current || current.interaction?.status !== "editing") return current;
      createLearningDraftStore(current.snapshot.sessionId, current.interaction.itemUid).save(
        draft,
      );
      return learningSessionReducer(current, { type: "draft_changed", draft });
    });
  }, []);

  const revealHint = useCallback((hint: HintType) => {
    setState((current) =>
      current
        ? learningSessionReducer(current, { type: "hint_revealed", hint })
        : current,
    );
  }, []);

  const executeSubmit = useCallback(
    async (pending: {
      command: SubmitLearningAttemptCommandV1;
      itemUid: string;
    }) => {
      const { command } = pending;
      setActionError(undefined);
      let result: SubmitLearningAttemptResultV1;
      try {
        result = await request<SubmitLearningAttemptResultV1>(
          submitLearningAttempt(command),
        );
      } catch (error) {
        const code = readErrorCode(error);
        setState((current) =>
          current
            ? learningSessionReducer(current, { type: "submit_failed", errorCode: code })
            : current,
        );
        setActionError({ code, message: messageForError(code, "submit") });
        return;
      }

      setState((current) =>
        current
          ? learningSessionReducer(current, { type: "submit_succeeded", result })
          : current,
      );
      createLearningDraftStore(sessionId, pending.itemUid).clear();
      pendingAttemptRef.current = undefined;
      setFeedback(result);
      try {
        await replaceWithRefetch();
      } catch {
        setActionError({
          code: "REFRESH_FAILED",
          message: "答案已保存，请刷新学习进度。",
        });
      }
    },
    [replaceWithRefetch, sessionId],
  );

  const submit = useCallback(
    (draft: LearningAnswerDraft) => {
      const current = state;
      if (!current || current.interaction?.status !== "editing") return;
      const item = current.snapshot.currentItem;
      if (!item) return;
      const attemptUid = createUid("learning-attempt");
      const command: SubmitLearningAttemptCommandV1 = {
        sessionId,
        itemId: item.itemId,
        sessionVersion: current.snapshot.sessionVersion,
        attemptUid,
        answer: draft.kind === "output" ? { kind: "skip", reason: "dont_know" } : draft,
        hintCount: current.interaction.hints.length,
        hintTypes: [...current.interaction.hints],
      };
      createLearningDraftStore(sessionId, item.item.itemUid).save(draft);
      const pending = { command, itemUid: item.item.itemUid };
      pendingAttemptRef.current = pending;
      setState((latest) => {
        if (!latest || latest.interaction?.status !== "editing") return latest;
        const withDraft = learningSessionReducer(latest, {
          type: "draft_changed",
          draft,
        });
        return learningSessionReducer(withDraft, { type: "submit_started", attemptUid });
      });
      void executeSubmit(pending);
    },
    [executeSubmit, sessionId, state],
  );

  const retrySubmit = useCallback(() => {
    const pending = pendingAttemptRef.current;
    if (!pending || state?.interaction?.status !== "sync_failed") return;
    setState((current) =>
      current
        ? learningSessionReducer(current, {
            type: "submit_started",
            attemptUid: pending.command.attemptUid,
          })
        : current,
    );
    void executeSubmit(pending);
  }, [executeSubmit, state?.interaction?.status]);

  const editAfterFailure = useCallback(() => {
    setActionError(undefined);
    pendingAttemptRef.current = undefined;
    setState((current) => {
      if (!current || current.interaction?.status !== "sync_failed") return current;
      return learningSessionReducer(current, {
        type: "snapshot_replaced",
        snapshot: current.snapshot,
        restoredDraft: current.interaction.draft,
      });
    });
  }, []);

  const transition = useCallback(
    async (kind: "pause" | "complete") => {
      if (!state) return;
      setActionError(undefined);
      try {
        const descriptor = kind === "pause" ? pauseLearningSession : completeLearningSession;
        await request(
          descriptor({ sessionId, sessionVersion: state.snapshot.sessionVersion }),
        );
        await replaceWithRefetch();
      } catch (error) {
        const code = readErrorCode(error);
        setActionError({ code, message: messageForError(code, "transition") });
      }
    },
    [replaceWithRefetch, sessionId, state],
  );

  const refresh = useCallback(() => {
    setActionError(undefined);
    void replaceWithRefetch().catch(() => {
      setActionError({ code: "REFRESH_FAILED", message: "刷新失败，请重试。" });
    });
  }, [replaceWithRefetch]);

  return {
    state,
    feedback,
    actionError,
    loading: detailQuery.isLoading,
    loadError: detailQuery.error,
    changeDraft,
    revealHint,
    submit,
    retrySubmit,
    editAfterFailure,
    pauseToggle: () => void transition("pause"),
    complete: () => void transition("complete"),
    refresh,
  };
}
