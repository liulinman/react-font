import type {
  ContextLabQuestionGroup,
  ContextLabTaskStatus,
} from "../types/learning";

export function isContextLabTaskActive(status: ContextLabTaskStatus) {
  return status === "pending" || status === "processing";
}

export function getContextLabStatusLabel(status: ContextLabTaskStatus) {
  const labels: Record<ContextLabTaskStatus, string> = {
    pending: "等待回调",
    processing: "处理中",
    succeeded: "生成完成",
    failed: "生成失败",
  };
  return labels[status];
}

export function getContextLabStatusTone(status: ContextLabTaskStatus) {
  const tones: Record<ContextLabTaskStatus, "default" | "processing" | "success" | "error"> = {
    pending: "default",
    processing: "processing",
    succeeded: "success",
    failed: "error",
  };
  return tones[status];
}

export function getContextLabStatusDescription(status: ContextLabTaskStatus) {
  const descriptions: Record<ContextLabTaskStatus, string> = {
    pending: "任务已创建，正在等待 AI 服务回调。",
    processing: "AI 正在整理雅思阅读、题目和练习数据。",
    succeeded: "练习包已准备好，可以开始做题。",
    failed: "生成失败，请查看原因后重新提交。",
  };
  return descriptions[status];
}

export function getContextLabErrorMessage(errorMessage?: string) {
  if (!errorMessage) return "生成失败，请重新生成。";
  const messages: Record<string, string> = {
    MICRO_OUTPUT_INVALID: "生成内容未通过格式校验，请重新生成，系统会自动纠偏重试。",
    MICRO_GENERATION_FAILED: "AI 暂时未能生成练习，请稍后重新生成。",
  };
  return messages[errorMessage] ?? errorMessage;
}

const PARTIAL_GENERATION_WARNING_CODES = new Set([
  "GENERATED_QUESTION_SHAPE_INVALID",
  "GROUP_ID_DUPLICATE",
  "GROUP_QUESTION_IDS_INVALID",
  "GROUP_QUESTIONS_NOT_CONTIGUOUS",
  "GROUP_RANGE_INVALID",
  "GROUP_RESPONSE_TYPE_MISMATCH",
  "GROUP_TFNG_LABELS_MISMATCH",
  "GROUP_WORD_LIMIT_MISMATCH",
  "LEGACY_CHOICE_INVALID",
  "QUESTION_COUNT",
  "QUESTION_ID_DUPLICATE",
  "QUESTION_ID_INVALID",
  "QUESTION_TYPE_UNSUPPORTED",
  "RESPONSE_TYPE_INVALID",
  "STEM_MISSING",
  "STANDARD_QUESTION_REPAIR_FAILED",
  "TEXT_ACCEPTED_ANSWERS_MISSING",
  "TEXT_ANSWER_NOT_IN_ARTICLE",
  "TEXT_ANSWER_WORD_LIMIT_EXCEEDED",
  "TEXT_WORD_LIMIT_INVALID",
  "TFNG_CORRECT_VALUE_INVALID",
  "TFNG_OPTIONS_INVALID",
  "CHOICE_CORRECT_INDEX_INVALID",
  "CHOICE_OPTIONS_INVALID",
]);

const GENERATION_TARGET_WARNING_CODES = new Set([
  "QUESTION_ADVANCED_REASONING_MIX",
  "QUESTION_DISTRACTOR_TRAP_WEAK",
  "QUESTION_IELTS_CORE_SKILL_MIX",
  "QUESTION_KEYWORD_SPOTTING_RISK",
  "QUESTION_QUALITY_AUDIT_MISSING",
  "QUESTION_REASONING_MIX",
  "QUESTION_TYPE_MIX",
  "QUESTION_TYPE_NOT_REQUESTED",
  "QUESTION_VOCABULARY_OVERWEIGHT",
]);

function parseGenerationWarningCode(warning: string) {
  const match = warning.match(/^(?:[A-Za-z0-9_-]+:\s*)?([A-Z][A-Z0-9_]+)$/);
  return match?.[1];
}

export function getContextLabGenerationWarningMessages(warnings?: string[]) {
  const messages = new Set<string>();

  for (const warning of warnings ?? []) {
    const code = parseGenerationWarningCode(warning);
    if (!code) continue;

    if (PARTIAL_GENERATION_WARNING_CODES.has(code)) {
      messages.add("部分题目未通过安全校验，已从练习中移除。");
    } else if (GENERATION_TARGET_WARNING_CODES.has(code)) {
      messages.add("题目组合未完全达到生成目标，已保留可安全作答的题目。");
    }
  }

  return [...messages];
}

export function formatContextLabQuestionGroupMeta(
  group: ContextLabQuestionGroup,
) {
  const range =
    group.startNumber === group.endNumber
      ? `Question ${group.startNumber}`
      : `Questions ${group.startNumber}-${group.endNumber}`;
  if (!group.wordLimit) return range;

  return `${range} | Maximum ${group.wordLimit} ${
    group.wordLimit === 1 ? "word" : "words"
  }`;
}
