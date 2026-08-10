import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Drawer } from "antd";
import request from "@font/api";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  createLearningSession,
  learningCapabilities,
  previewLearningSession,
} from "../api/learningApi";
import { learningKeys } from "../api/learningKeys";
import type {
  LearningCapabilitiesV1,
  LearningPlanPreviewV1,
  LearningSessionApiErrorV1,
  LearningSessionCreateResultV1,
} from "../contracts/learning-session";
import type { LearningMode } from "../contracts/activity-contract";
import { LearningModePicker, MODE_ORDER } from "./LearningModePicker";
import { LearningPreviewPanel } from "./LearningPreviewPanel";
import "../learning.css";

export interface LearningWordScope {
  kind: "selection" | "current_filter";
  wordIds: number[];
  count: number;
  masteryFilterLabel: string;
}

export interface LearningSetupDrawerProps {
  open: boolean;
  scope: LearningWordScope;
  onClose(): void;
}

export const MAX_LEARNING_WORDS = 20;

function createUid(prefix: string) {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  return randomUuid
    ? `${prefix}-${randomUuid}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function errorCode(error: unknown) {
  const candidate = error as Partial<LearningSessionApiErrorV1> & {
    code?: string | number;
  };
  return candidate?.errorCode ?? String(candidate?.code ?? "UNKNOWN_ERROR");
}

function previewErrorMessage(error: unknown) {
  switch (errorCode(error)) {
    case "LEARNING_RESOURCE_UNAVAILABLE":
      return "部分词条已不可用，请返回词库刷新后重试。";
    case "LEARNING_MODE_UNSUPPORTED":
      return "所选模式暂不可用，请重新选择。";
    default:
      return "预览失败，请重试。";
  }
}

export function LearningSetupDrawer({
  open,
  scope,
  onClose,
}: LearningSetupDrawerProps) {
  const navigate = useNavigate();
  const [selectedModes, setSelectedModes] = useState<LearningMode[]>([]);
  const [excludedWordIds, setExcludedWordIds] = useState<number[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const createIdentityRef = useRef<
    { payloadKey: string; requestUid: string } | undefined
  >(undefined);
  const scopeKey = `${scope.kind}:${scope.wordIds.join(",")}`;

  useEffect(() => {
    if (!open) return;
    setSelectedModes([]);
    setExcludedWordIds([]);
    setCreateError("");
    createIdentityRef.current = undefined;
  }, [open, scopeKey]);

  const requestedWordIds = useMemo(
    () => scope.wordIds.filter((wordId) => !excludedWordIds.includes(wordId)),
    [excludedWordIds, scope.wordIds],
  );
  const scopeTooLarge =
    scope.count > MAX_LEARNING_WORDS ||
    requestedWordIds.length > MAX_LEARNING_WORDS;
  const inputHash = `${requestedWordIds.join(",")}:${selectedModes.join(",")}`;

  const capabilitiesQuery = useQuery({
    queryKey: learningKeys.capabilities(),
    queryFn: () => request<LearningCapabilitiesV1>(learningCapabilities()),
    enabled: open,
    staleTime: 60_000,
  });
  const enabledModes = new Set(
    capabilitiesQuery.data?.modes
      .filter((capability) => capability.status === "enabled")
      .map((capability) => capability.mode) ?? [],
  );

  useEffect(() => {
    if (!open || !capabilitiesQuery.isSuccess) return;
    setSelectedModes((current) => {
      const available = MODE_ORDER.filter((mode) => enabledModes.has(mode));
      if (current.length > 0) return current.filter((mode) => enabledModes.has(mode));
      const recommended = MODE_ORDER.filter(
        (mode) => (mode === "micro_scene" || mode === "listening") && enabledModes.has(mode),
      );
      return recommended.length > 0 ? recommended : available.slice(0, 1);
    });
  }, [capabilitiesQuery.data, capabilitiesQuery.isSuccess, open]);

  const previewQuery = useQuery({
    queryKey: learningKeys.preview(inputHash),
    queryFn: () =>
      request<LearningPlanPreviewV1>(
        previewLearningSession({ wordIds: requestedWordIds, selectedModes }),
      ),
    enabled:
      open &&
      capabilitiesQuery.isSuccess &&
      !scopeTooLarge &&
      requestedWordIds.length > 0 &&
      selectedModes.length > 0 &&
      selectedModes.every((mode) => enabledModes.has(mode)),
    retry: false,
  });

  const preview = previewQuery.data;
  const hasUnadaptedWords = Boolean(
    preview?.words.some((word) => word.adaptationStatus === "unadapted"),
  );
  const selectionIsEnabled =
    selectedModes.length > 0 && selectedModes.every((mode) => enabledModes.has(mode));
  const canCreate =
    requestedWordIds.length > 0 &&
    !scopeTooLarge &&
    preview?.wordCount === requestedWordIds.length &&
    !hasUnadaptedWords &&
    selectionIsEnabled &&
    !previewQuery.isFetching &&
    !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    const payloadKey = JSON.stringify({ wordIds: requestedWordIds, selectedModes });
    if (createIdentityRef.current?.payloadKey !== payloadKey) {
      createIdentityRef.current = {
        payloadKey,
        requestUid: createUid("learning-session"),
      };
    }
    setCreating(true);
    setCreateError("");
    try {
      const result = await request<LearningSessionCreateResultV1>(
        createLearningSession({
          wordIds: requestedWordIds,
          selectedModes,
          requestUid: createIdentityRef.current.requestUid,
        }),
      );
      navigate(`/englishWorld/learn/session/${result.sessionId}`);
    } catch (error) {
      const code = errorCode(error);
      setCreateError(
        code === "LEARNING_IDEMPOTENCY_CONFLICT"
          ? "创建请求已变化，请关闭后重新选择词条。"
          : code === "LEARNING_RESOURCE_UNAVAILABLE"
            ? "词条状态已变化，请返回词库刷新后重试。"
            : "创建失败，请重试。",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <Drawer
      aria-label="开始混合记忆"
      className="learning-setup-drawer"
      destroyOnHidden
      open={open}
      placement="right"
      title="开始混合记忆"
      width={560}
      onClose={onClose}
    >
      <div className="learning-setup-content">
        <section aria-label="学习范围" className="learning-setup-scope">
          <strong>本次 {scope.count} 个词</strong>
          <span>{scope.masteryFilterLabel}</span>
          <span>
            {scope.kind === "selection" ? "范围：手动选择" : "范围：当前筛选结果"}
          </span>
          {excludedWordIds.length > 0 ? (
            <>
              <span>
                已排除 {excludedWordIds.length} 个，本轮学习 {requestedWordIds.length} 个
              </span>
              <Button
                aria-label="恢复全部词条"
                size="small"
                type="link"
                onClick={() => {
                  setExcludedWordIds([]);
                  setCreateError("");
                }}
              >
                恢复全部词条
              </Button>
            </>
          ) : null}
        </section>

        {scopeTooLarge ? (
          <p role="alert">一次最多 20 个单词，请缩小选择或筛选范围。</p>
        ) : null}

        <LearningModePicker
          capabilities={capabilitiesQuery.data?.modes ?? []}
          selectedModes={selectedModes}
          onChange={(modes) => {
            setSelectedModes(modes);
            setCreateError("");
          }}
        />

        <LearningPreviewPanel
          preview={preview}
          loading={previewQuery.isFetching}
          error={previewQuery.error ? previewErrorMessage(previewQuery.error) : undefined}
          excludedWordIds={excludedWordIds}
          onExcludeWord={(wordId) => {
            setExcludedWordIds((current) =>
              current.includes(wordId) ? current : [...current, wordId],
            );
            setCreateError("");
          }}
        />

        {createError ? <p role="alert">{createError}</p> : null}
        <div className="learning-setup-actions">
          <Button onClick={onClose}>取消</Button>
          <Button
            aria-label="开始混合记忆"
            disabled={!canCreate}
            loading={creating}
            type="primary"
            onClick={() => void handleCreate()}
          >
            开始混合记忆
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
