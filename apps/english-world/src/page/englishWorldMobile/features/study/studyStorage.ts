import { useState } from "react";

export function selectedWordIds(search: string): number[] {
  return [
    ...new Set(
      (new URLSearchParams(search).get("wordIds") ?? "")
        .split(",")
        .map(Number)
        .filter((id) => Number.isSafeInteger(id) && id > 0),
    ),
  ];
}

// Only non-sensitive learning drafts. Storage failure must never stop study.
export function useStudyDraft<T>(
  userId: number,
  kind: string,
  valid: (value: unknown) => value is T,
  resume?: { path: string; complete(value: T): boolean },
) {
  const key = `english-world:study:v1:${userId}:${kind}`;
  const [draft, setDraft] = useState<T | null>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      return valid(value) ? value : null;
    } catch {
      return null;
    }
  });
  const [storageError, setStorageError] = useState(false);
  const persistDraft = (next: T | null) => {
    // Write synchronously, even if the request finishes after navigating away.
    try {
      if (next) localStorage.setItem(key, JSON.stringify(next));
      else localStorage.removeItem(key);
      if (resume) {
        const resumeKey = `english-world:study:v1:${userId}:resume:${kind.split(":")[0]}`;
        if (next && !resume.complete(next))
          localStorage.setItem(resumeKey, resume.path);
        else if (localStorage.getItem(resumeKey) === resume.path)
          localStorage.removeItem(resumeKey);
      }
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    setDraft(next);
  };
  const reloadDraft = () => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      if (valid(value)) setDraft(value);
    } catch {
      setStorageError(true);
    }
  };
  return { draft, setDraft: persistDraft, storageError, reloadDraft };
}
export function getStudyResumePath(
  userId: number,
  kind: "cards" | "review",
): string | null {
  try {
    const path = localStorage.getItem(
      `english-world:study:v1:${userId}:resume:${kind}`,
    );
    const prefix = kind === "cards" ? "/mobile/learn" : "/mobile/review";
    return path && (path === prefix || path.startsWith(`${prefix}?`))
      ? path
      : null;
  } catch {
    return null;
  }
}
