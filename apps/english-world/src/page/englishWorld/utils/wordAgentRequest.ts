export type WordAgentRequestBody = {
  word?: string;
  words?: string[];
};

export function buildWordAgentRequestBody(inputText: string): WordAgentRequestBody {
  const trimmed = inputText.trim();
  if (!trimmed) return {};

  const parts = trimmed
    .split(/[\n\r,，;；]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (parts.length <= 1) return { word: trimmed };
  return { words: parts };
}
