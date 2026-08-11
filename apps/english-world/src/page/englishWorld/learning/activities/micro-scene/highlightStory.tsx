import type { ReactNode } from "react";

export interface StoryTargetWord {
  wordId: number;
  word: string;
  meaning: string;
}

export function highlightStory(
  sentence: string,
  targets: StoryTargetWord[],
  onSelect: (wordId: number) => void,
): ReactNode[] {
  const usableTargets = targets
    .filter((target) => target.word.trim())
    .sort((left, right) => right.word.length - left.word.length);
  if (usableTargets.length === 0) return [sentence];

  const byWord = new Map(
    usableTargets.map((target) => [target.word.toLocaleLowerCase(), target]),
  );
  const alternatives = usableTargets.map((target) => escapeRegExp(target.word)).join("|");
  const matcher = new RegExp(
    `(^|[^A-Za-z0-9'])(${alternatives})(?=$|[^A-Za-z0-9'])`,
    "giu",
  );
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = matcher.exec(sentence)) !== null) {
    const boundary = match[1] ?? "";
    const matchedWord = match[2] ?? "";
    const wordStart = match.index + boundary.length;
    if (wordStart > cursor) nodes.push(sentence.slice(cursor, wordStart));
    const target = byWord.get(matchedWord.toLocaleLowerCase());
    if (!target) {
      nodes.push(matchedWord);
    } else {
      nodes.push(
        <button
          type="button"
          className="micro-scene-highlight"
          aria-label={`查看 ${target.word} 的词义`}
          key={`${target.wordId}-${key}`}
          onClick={() => onSelect(target.wordId)}
        >
          {matchedWord}
        </button>,
      );
      key += 1;
    }
    cursor = wordStart + matchedWord.length;
    if (matcher.lastIndex === match.index) matcher.lastIndex += 1;
  }
  if (cursor < sentence.length) nodes.push(sentence.slice(cursor));
  return nodes.length > 0 ? nodes : [sentence];
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
