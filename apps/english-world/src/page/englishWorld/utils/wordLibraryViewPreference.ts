import { createLocalStoragePreference } from "../../../shared/storage/localStoragePreference";

export type WordLibraryView = "list" | "card";

export const wordLibraryViewPreference =
  createLocalStoragePreference<WordLibraryView>({
    key: "english-world:word-library-view",
    defaultValue: "list",
    isValid: (value): value is WordLibraryView =>
      value === "list" || value === "card",
  });
