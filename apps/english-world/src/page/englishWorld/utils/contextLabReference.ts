type ContextLabReferenceSource = {
  taskId?: number | string;
  articleExerciseId?: number | string;
};

export type ParsedContextLabReference = {
  taskId: number;
  articleExerciseId?: number;
  word?: string;
  href: string;
};

const CONTEXT_LAB_PATH = "/englishWorld/context-lab";
const DUMMY_ORIGIN = "https://english-world.local";

function toPositiveInteger(value: string | null) {
  if (!value) return undefined;
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue > 0
    ? numericValue
    : undefined;
}

export function buildContextLabReference(
  source: ContextLabReferenceSource,
  word: string,
) {
  const taskId = Number(source.taskId);
  if (!Number.isInteger(taskId) || taskId <= 0) return "";

  const params = new URLSearchParams();
  params.set("taskId", String(taskId));

  const articleExerciseId = Number(source.articleExerciseId);
  if (Number.isInteger(articleExerciseId) && articleExerciseId > 0) {
    params.set("articleExerciseId", String(articleExerciseId));
  }

  const cleanWord = word.trim();
  if (cleanWord) {
    params.set("word", cleanWord);
  }

  return `${CONTEXT_LAB_PATH}?${params.toString()}`;
}

export function parseContextLabReference(reference?: string | null) {
  if (!reference) return null;

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(reference, DUMMY_ORIGIN);
  } catch {
    return null;
  }

  if (
    parsedUrl.origin !== DUMMY_ORIGIN ||
    parsedUrl.pathname !== CONTEXT_LAB_PATH
  ) {
    return null;
  }

  const taskId = toPositiveInteger(parsedUrl.searchParams.get("taskId"));
  if (!taskId) return null;

  const articleExerciseId = toPositiveInteger(
    parsedUrl.searchParams.get("articleExerciseId"),
  );
  const word = parsedUrl.searchParams.get("word")?.trim() || undefined;

  return {
    taskId,
    articleExerciseId,
    word,
    href: `${parsedUrl.pathname}${parsedUrl.search}`,
  };
}

export function getContextLabReferenceLabel(
  reference: ParsedContextLabReference | null,
) {
  if (!reference) return "";
  return `来自阅读 · 练习包 #${reference.taskId}`;
}

export function isExternalReference(reference?: string | null) {
  return Boolean(
    reference?.startsWith("http://") ||
      reference?.startsWith("https://") ||
      reference?.startsWith("/api/upload/source-file/"),
  );
}
