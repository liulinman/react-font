export type WordLibraryView = "list" | "card";

const WORD_LIBRARY_VIEW_KEY = "english-world:word-library-view";

function defaultReadStorage(): Pick<Storage, "getItem"> | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function defaultWriteStorage(): Pick<Storage, "setItem"> | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

export function readWordLibraryView(
  storage = defaultReadStorage(),
): WordLibraryView {
  try {
    const value = storage?.getItem(WORD_LIBRARY_VIEW_KEY);
    return value === "card" || value === "list" ? value : "list";
  } catch {
    return "list";
  }
}

export function writeWordLibraryView(
  view: WordLibraryView,
  storage = defaultWriteStorage(),
) {
  try {
    storage?.setItem(WORD_LIBRARY_VIEW_KEY, view);
  } catch {
    // Preference persistence must never block the current interaction.
  }
}
