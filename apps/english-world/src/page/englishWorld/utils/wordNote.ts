export function hasDisplayNote(note?: string | null) {
  return typeof note === "string" && note.trim().length > 0;
}
