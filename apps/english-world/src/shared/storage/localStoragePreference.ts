type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

interface LocalStoragePreferenceOptions<T extends string> {
  key: string;
  defaultValue: T;
  isValid: (value: string) => value is T;
}

export function createLocalStoragePreference<T extends string>({
  key,
  defaultValue,
  isValid,
}: LocalStoragePreferenceOptions<T>) {
  const resolveStorage = () => {
    try {
      return typeof window === "undefined" ? undefined : window.localStorage;
    } catch {
      return undefined;
    }
  };

  return {
    read(storage?: StorageReader): T {
      try {
        const value = (storage ?? resolveStorage())?.getItem(key);
        return value !== null && value !== undefined && isValid(value)
          ? value
          : defaultValue;
      } catch {
        return defaultValue;
      }
    },
    write(value: T, storage?: StorageWriter): void {
      try {
        (storage ?? resolveStorage())?.setItem(key, value);
      } catch {
        // Preference persistence must never block the current interaction.
      }
    },
  };
}
