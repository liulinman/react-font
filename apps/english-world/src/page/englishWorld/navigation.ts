export const ENGLISH_WORLD_HOME_PATH = "/englishWorld";

export const HASH_TO_NAV: Record<string, string> = {
  cockpit: "cockpit",
  list: "words",
  words: "words",
  "ai-tool": "contextLab",
  aitool: "contextLab",
  "context-lab": "contextLab",
  contextlab: "contextLab",
  "memory-map": "memoryMap",
  memorymap: "memoryMap",
  stat: "stats",
  stats: "stats",
};

export const PATH_TO_NAV: Record<string, string> = {
  "/englishworld": "cockpit",
  "/englishworld/words": "words",
  "/englishworld/stats": "stats",
};

export const LEGACY_HASH_TO_PATH: Record<string, string> = {
  list: "/englishWorld/words",
  stat: "/englishWorld/stats",
};

export const SECONDARY_NAV_KEYS = new Set([
  "cockpit",
  "stats",
  "contextLab",
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

  if (normalizedKey === "stats") {
    return "/englishWorld/stats";
  }

  if (normalizedKey === "contextLab") {
    return "/englishWorld/context-lab";
  }

  if (normalizedKey === "memoryMap") {
    return "/englishWorld/memory-map";
  }

  if (normalizedKey === "setting") {
    return "/englishWorld/settings";
  }

  return ENGLISH_WORLD_HOME_PATH;
}
