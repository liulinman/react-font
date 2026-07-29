export const ENGLISH_WORLD_HOME_PATH = "/englishWorld";

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

  if (normalizedKey === "recite") {
    return "/englishWorld/recite";
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
    return "/englishWorld/ielts-core";
  }

  if (normalizedKey === "memoryMap") {
    return "/englishWorld/memory-map";
  }

  if (normalizedKey === "setting") {
    return "/englishWorld/settings";
  }

  return ENGLISH_WORLD_HOME_PATH;
}
