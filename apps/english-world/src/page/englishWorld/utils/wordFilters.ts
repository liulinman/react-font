export type WordFilterRecord = Record<string, unknown>;

export function removeEmptyValues<T extends WordFilterRecord>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  ) as Partial<T>;
}
