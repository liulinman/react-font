export const learningKeys = {
  capabilities: () => ["learning", "capabilities"] as const,
  preview: (inputHash: string) => ["learning", "preview", inputHash] as const,
  session: (sessionId: number) => ["learning", "session", sessionId] as const,
  mastery: (wordId: number) => ["learning", "mastery", wordId] as const,
};
