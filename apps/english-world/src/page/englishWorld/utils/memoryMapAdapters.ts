import type {
  LearningLevel,
  LearningWord,
  MemoryClusterType,
} from "../types/learning";

export type MemoryCluster = {
  wordId: number;
  word: string;
  meaning?: string;
  mistakeCount: number;
  cluster: MemoryClusterType;
};

export function createMemoryClusters(words: LearningWord[]): MemoryCluster[] {
  return words
    .filter((word) => word.level <= 1)
    .map((word) => ({
      wordId: word.id,
      word: word.word,
      meaning: word.meaning,
      mistakeCount: 1,
      cluster: "low-mastery",
    }));
}

export function summarizeMasteryLevels(
  words: LearningWord[],
): Array<{ level: LearningLevel; count: number }> {
  return ([0, 1, 2, 3] as const).map((level) => ({
    level,
    count: words.filter((word) => word.level === level).length,
  }));
}
