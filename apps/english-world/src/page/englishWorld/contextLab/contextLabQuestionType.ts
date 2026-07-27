const QUESTION_TYPE_LABELS: Record<string, string> = {
  vocabulary: "Vocabulary",
  paraphrase: "Paraphrase",
  detail: "Detail",
  inference: "Inference",
  main_idea: "Main idea",
  true_false_not_given: "True / False / Not Given",
  matching_headings: "Matching headings",
  summary_completion: "Summary completion",
};

export function formatContextLabQuestionTypeLabel(questionType?: string) {
  const key = String(questionType ?? "").trim();
  return key ? QUESTION_TYPE_LABELS[key] || key : "";
}
