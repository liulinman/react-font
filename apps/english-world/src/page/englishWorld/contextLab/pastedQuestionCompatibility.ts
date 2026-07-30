export type UnsupportedPastedQuestion = {
  questionNumber?: number;
  questionType:
    | "matching_headings"
    | "matching_information"
    | "matching_features";
  reason: string;
};

export function detectUnsupportedPastedQuestions(
  content: string,
): UnsupportedPastedQuestion[] {
  const lines = String(content ?? "").split(/\r?\n/);

  return lines.flatMap<UnsupportedPastedQuestion>((line) => {
    const normalized = line.toLocaleLowerCase("en");
    const questionNumber = Number(line.match(/\b(\d{1,2})\b/)?.[1]) || undefined;

    if (/matching headings|match each heading/.test(normalized)) {
      return [
        {
          questionNumber,
          questionType: "matching_headings" as const,
          reason: "第一期暂不支持 Matching Headings 批量匹配",
        },
      ];
    }
    if (/matching information|which paragraph contains/.test(normalized)) {
      return [
        {
          questionNumber,
          questionType: "matching_information" as const,
          reason: "第一期暂不支持 Matching Information 批量匹配",
        },
      ];
    }
    if (/matching features|match each statement with/.test(normalized)) {
      return [
        {
          questionNumber,
          questionType: "matching_features" as const,
          reason: "第一期暂不支持 Matching Features 批量匹配",
        },
      ];
    }
    return [];
  });
}
