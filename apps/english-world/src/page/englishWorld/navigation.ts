export const ENGLISH_WORLD_HOME_PATH = "/englishWorld";

const READING_PRACTICES_PATH = "/englishWorld/reading-practices";

export const READING_NAV = {
  readingAssigned: { label: "老师发的题", search: "" },
  readingPersonal: { label: "自己出的题", search: "?mode=practice&source=personal" },
  readingExam: { label: "雅思考试", search: "?mode=exam&source=personal" },
};

export function getReadingNavKey(params: URLSearchParams): keyof typeof READING_NAV {
  if (params.get("mode") === "exam") return "readingExam";
  const source = params.get("source");
  return source !== null && source !== "assigned" ? "readingPersonal" : "readingAssigned";
}

export const HASH_TO_NAV: Record<string, string> = {
  cockpit: "cockpit",
  list: "words",
  words: "words",
  "ai-tool": "contextLab",
  aitool: "contextLab",
  "ai-word": "aiWord",
  aiword: "aiWord",
  "word-agent": "aiWord",
  wordagent: "aiWord",
  "bulk-import": "bulkImport",
  bulkimport: "bulkImport",
  "overwrite-stats": "overwriteStats",
  overwritestats: "overwriteStats",
  "context-lab": "contextLab",
  contextlab: "contextLab",
  "ielts-core": "ieltsCore",
  ieltscore: "ieltsCore",
  "memory-map": "memoryMap",
  memorymap: "memoryMap",
  stat: "stats",
  stats: "stats",
};

export const PATH_TO_NAV: Record<string, string> = {
  "/englishworld": "cockpit",
  "/englishworld/ielts-listening": "ieltsListening",
  "/englishworld/ai-listening": "aiListening",
  "/englishworld/words": "words",
  "/englishworld/bulk-import": "bulkImport",
  "/englishworld/overwrite-stats": "overwriteStats",
  "/englishworld/stats": "stats",
  "/englishworld/ai-word": "aiWord",
  "/englishworld/ielts-core": "ieltsCore",
};

export const LEGACY_HASH_TO_PATH: Record<string, string> = {
  list: "/englishWorld/words",
  stat: "/englishWorld/stats",
};

export const SECONDARY_NAV_KEYS = new Set([
  "cockpit",
  "bulkImport",
  "overwriteStats",
  "stats",
  "aiWord",
  "contextLab",
  "ieltsCore",
  "memoryMap",
  "setting",
]);

export function getHashKey(hash: string): string {
  return hash.replace(/^#\/?/, "").toLowerCase().trim();
}

export function normalizeActiveKey(key: string): string {
  if (key === "list") {
    return "words";
  }

  if (key === "stat") {
    return "stats";
  }

  return key;
}

export function getNavFromLocation(pathname: string, hash: string): string {
  const navFromPath = PATH_TO_NAV[pathname.toLowerCase()];
  if (navFromPath && navFromPath !== "cockpit") {
    return navFromPath;
  }

  const key = getHashKey(hash);
  if (key) {
    return HASH_TO_NAV[key] ?? navFromPath ?? "cockpit";
  }

  return navFromPath ?? "cockpit";
}

export function getLegacyPathFromHash(hash: string): string | undefined {
  return LEGACY_HASH_TO_PATH[getHashKey(hash)];
}

export function getPathForNav(key: string): string {
  const normalizedKey = normalizeActiveKey(key);
  if (normalizedKey === "ieltsListening") return "/englishWorld/ielts-listening";
  if (normalizedKey === "aiListening") return "/englishWorld/ai-listening";

  if (normalizedKey === "intensiveReading") return "/englishWorld/intensive-reading";
  if (normalizedKey === "readingPractices") return READING_PRACTICES_PATH;
  if (normalizedKey === "readingAssigned" || normalizedKey === "readingPersonal" || normalizedKey === "readingExam") {
    return READING_PRACTICES_PATH + READING_NAV[normalizedKey].search;
  }

  if (normalizedKey === "wordBooks") return "/englishWorld/word-books";

  if (normalizedKey === "knowledgeNotes") return "/englishWorld/knowledge-notes";

  if (normalizedKey === "recite") {
    return "/englishWorld/ai-listening";
  }

  if (normalizedKey === "words") {
    return "/englishWorld/words";
  }

  if (normalizedKey === "bulkImport") {
    return "/englishWorld/bulk-import";
  }

  if (normalizedKey === "overwriteStats") {
    return "/englishWorld/overwrite-stats";
  }

  if (normalizedKey === "stats") {
    return "/englishWorld/stats";
  }

  if (normalizedKey === "aiWord") {
    return "/englishWorld/ai-word";
  }

  if (normalizedKey === "contextLab") {
    return "/englishWorld/context-lab";
  }

  if (normalizedKey === "ieltsCore") {
    return "/englishWorld/ai-listening";
  }

  if (normalizedKey === "memoryMap") {
    return "/englishWorld/memory-map";
  }

  if (normalizedKey === "setting") {
    return "/englishWorld/settings";
  }

  return ENGLISH_WORLD_HOME_PATH;
}
