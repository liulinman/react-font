import { useState, type TextareaHTMLAttributes } from "react";
import { AutoGrowTextarea } from "@/page/englishWorld/knowledgeNotes/AutoGrowTextarea";
import { NoteContent } from "./NoteContent";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "value"> & { value: string };
export function NoteEditor(props: Props) {
  const [preview, setPreview] = useState(false);
  const label = props["aria-label"] || "笔记";
  return <div className="note-editor">
    <div className="note-editor-modes" role="group" aria-label={`${label}显示方式`}>
      <button type="button" aria-pressed={!preview} aria-label={`编辑${label}`} onClick={() => setPreview(false)}>编辑</button>
      <button type="button" aria-pressed={preview} aria-label={`预览${label}`} onClick={() => setPreview(true)}>预览</button>
    </div>
    {preview ? <div className="note-editor-preview" aria-label={`${label}预览`}>
      {props.value.trim() ? <NoteContent text={props.value} /> : <p>还没有可预览的内容。</p>}
    </div> : <AutoGrowTextarea {...props} />}
  </div>;
}
