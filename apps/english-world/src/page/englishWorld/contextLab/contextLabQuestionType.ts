import type { ContextLabQuestionType } from "../types/learning";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  vocabulary: "Vocabulary",
  paraphrase: "Paraphrase",
  detail: "Detail",
  inference: "Inference",
  main_idea: "Main idea",
  writer_view: "Writer view",
  matching_information: "Matching information",
  true_false_not_given: "True / False / Not Given",
  matching_headings: "Matching headings",
  summary_completion: "Summary completion",
};

export const CONTEXT_LAB_PASTED_QUESTION_TYPE_OPTIONS: Array<{
  label: string;
  value: ContextLabQuestionType;
}> = [
  { label: "定位细节", value: "detail" },
  { label: "同义替换", value: "paraphrase" },
  { label: "推断判断", value: "inference" },
  { label: "主旨题", value: "main_idea" },
  { label: "语境词义", value: "vocabulary" },
  { label: "True / False / Not Given", value: "true_false_not_given" },
  { label: "Matching headings", value: "matching_headings" },
  { label: "Summary completion", value: "summary_completion" },
  { label: "Writer view", value: "writer_view" },
  { label: "Matching information", value: "matching_information" },
];

export function formatContextLabQuestionTypeLabel(questionType?: string) {
  const key = String(questionType ?? "").trim();
  return key ? QUESTION_TYPE_LABELS[key] || key : "";
}
