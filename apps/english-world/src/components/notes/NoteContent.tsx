import { memo } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import "./noteContent.css";

/** Render source without modifying it or interpreting embedded HTML. */
export const NoteContent = memo(function NoteContent({ text, className = "" }: { text: string; className?: string }) {
  return <div className={`note-content ${className}`}>
    <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={{
      a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
      img: ({ alt }) => <span className="note-image-alt">{alt || "图片"}</span>,
      table: ({ children }) => <div className="note-table-scroll" role="region" aria-label="笔记表格" tabIndex={0}><table>{children}</table></div>,
    }}>{text}</Markdown>
  </div>;
});
