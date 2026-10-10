import { Button } from "antd";
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { WordList } from "@/server/word/word.type";
import { hasDisplayNote } from "../utils/wordNote";

type WordCardNoteProps = {
  word: string;
  wordId?: number;
  note?: string | null;
};

type WordExpandedNoteProps = {
  record: WordList;
  onEdit: (record: WordList) => void;
};

export function WordCardNote({ word, note, wordId }: WordCardNoteProps) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLParagraphElement>(null);
  const noteId = useId();

  useLayoutEffect(() => {
    if (expanded) return;

    const node = contentRef.current;
    if (!node) return;

    const measure = () => {
      setOverflowing(node.scrollHeight > node.clientHeight + 1);
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }

    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [expanded, note]);

  if (!hasDisplayNote(note)) return null;

  const toggleLabel = `${expanded ? "收起" : "展开"} ${word} 的笔记`;

  return (
    <div className="word-card-note">
      <div className="word-card-note-head">
        <span>我的笔记</span>
        {(overflowing || expanded) && (
          <button
            aria-controls={noteId}
            aria-expanded={expanded}
            aria-label={toggleLabel}
            className="word-card-note-toggle"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((current) => !current);
            }}
          >
            {expanded ? "收起" : "展开"}
          </button>
        )}
      </div>
      <p
        className={`word-card-note-text${
          expanded ? " word-card-note-text-expanded" : ""
        }`}
        id={noteId}
        ref={contentRef}
      >
        {note}
      </p>
      {wordId && <WordKnowledgeLinks wordId={wordId} hasNote />}
    </div>
  );
}

export function WordExpandedNote({
  record,
  onEdit,
}: WordExpandedNoteProps) {
  if (!hasDisplayNote(record.englishNote)) return null;

  return (
    <div className="word-note-expanded-panel">
      <div className="word-note-expanded-head">
        <strong>{record.englishWord} · 我的笔记</strong>
        <Button
          aria-label={`编辑 ${record.englishWord} 的笔记`}
          size="small"
          type="link"
          onClick={(event) => {
            event.stopPropagation();
            onEdit(record);
          }}
        >
          编辑笔记
        </Button>
      </div>
      <p className="word-note-expanded-text">{record.englishNote}</p>
      <WordKnowledgeLinks wordId={record.id} hasNote />
    </div>
  );
}

export function WordKnowledgeLinks({wordId,hasNote,mobile=false}:{wordId:number;hasNote?:boolean;mobile?:boolean}) {
  const base=mobile ? "/mobile/tools/knowledge-notes" : "/englishWorld/knowledge-notes";
  return <div className="word-knowledge-links" style={{display:"flex",gap:16,flexWrap:"wrap",marginTop:12}} onClick={event=>event.stopPropagation()}>
    {hasNote && <a href={`${base}/new?copyWord=${wordId}`}>复制为知识笔记</a>}
    <a href={`${base}?wordId=${wordId}`}>关联知识笔记</a>
  </div>;
}
