import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

const parser = unified().use(remarkParse).use(remarkGfm);
type TextNode = { type: string; value?: string; alt?: string | null; children?: TextNode[] };
function plain(node: TextNode): string {
  if (node.type === "definition" || node.type === "footnoteDefinition") return "";
  if (node.type === "image" || node.type === "imageReference") return node.alt || "";
  if (node.type === "break") return " ";
  if (node.value !== undefined) return node.value;
  const inline = ["paragraph", "heading", "emphasis", "strong", "delete", "link", "linkReference"].includes(node.type);
  return (node.children || []).map(plain).join(inline ? "" : " ");
}
/** Derive display-only text using the same Markdown grammar as the reader. */
export function noteSummary(source: string): string {
  return plain(parser.parse(source)).replace(/\s+/g, " ").trim();
}
