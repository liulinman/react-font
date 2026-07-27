export function stripGeneratedMarkdownEmphasis(text: string) {
  return String(text ?? "")
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1");
}
