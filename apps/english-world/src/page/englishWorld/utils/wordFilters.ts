import { convertToFormat } from "@font/utils";

export type WordFilterRecord = Record<string, unknown>;

export type DesktopWordFilterValues = WordFilterRecord & {
  time?: [unknown, unknown] | null;
};

export type MobileWordFilterValues = {
  englishType?: number;
  englishLevel?: number;
  englishChinese?: string;
};

export function removeEmptyValues<T extends WordFilterRecord>(values: T) {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => {
      return value !== undefined && value !== null && value !== "";
    }),
  ) as Partial<T>;
}

export function normalizeDesktopWordFilters(values: DesktopWordFilterValues) {
  const { time, ...rest } = values;
  const normalized: WordFilterRecord = { ...rest };

  if (Array.isArray(time) && time[0] && time[1]) {
    normalized.startTime = convertToFormat(time[0] as string, "start");
    normalized.endTime = convertToFormat(time[1] as string, "end");
  }

  return removeEmptyValues(normalized);
}

export function normalizeMobileWordFilters(
  values: MobileWordFilterValues,
  searchKeyword: string,
) {
  return removeEmptyValues({
    ...values,
    englishWord: searchKeyword.trim() || undefined,
  });
}
