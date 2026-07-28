export type SharedImportSource = {
  mode: "none" | "url" | "file";
  url: string;
  name?: string;
  storageName?: string;
};

export function isValidImportSourceUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
