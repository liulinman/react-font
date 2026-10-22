import { NoteContent } from "@/components/notes/NoteContent";
import type { BookGroup, BookWord } from "./api";
const speech: Record<number, string> = {
  1: "v.",
  2: "n.",
  3: "adj.",
  4: "adv.",
  5: "pron.",
  6: "prep.",
  7: "conj.",
  8: "int.",
};
export function BookContent({
  title,
  groups,
  words,
  activeId,
  sectionNumbers,
  onRead,
  print = false,
}: {
  title: string;
  groups: BookGroup[];
  words: BookWord[];
  activeId?: string;
  sectionNumbers?: Record<string, number>;
  onRead?: (groupId: string, wordId?: number) => void;
  print?: boolean;
}) {
  const byId = new Map(words.map((w) => [w.id, w]));
  return (
    <article
      className={print ? "book-content book-print-content" : "book-content"}
    >
      {print && (
        <header className="book-print-heading">
          <strong>{title}</strong>
          <span>词汇与知识速览 · {words.length} 词</span>
        </header>
      )}
      <div className="book-sections">
        {groups
          .filter((g) => g.wordIds.length)
          .map((group, index) => (
            <section
              className="book-section"
              id={`${print ? "print-" : ""}group-${group.id}`}
              key={group.id}
              aria-label={group.title}
              onClick={() => onRead?.(group.id)}
            >
              <header className="book-section-heading">
                <span>
                  {String(sectionNumbers?.[group.id] ?? index + 1).padStart(
                    2,
                    "0",
                  )}
                </span>
                <h2>{group.title}</h2>
                <small>{group.wordIds.length} 词</small>
              </header>
              <div className="book-entries">
                {group.wordIds.map((id) => {
                  const word = byId.get(id);
                  if (!word) return null;
                  return (
                    <div
                      className="book-entry"
                      id={`${print ? "print-" : ""}word-${id}`}
                      key={id}
                      tabIndex={print ? undefined : 0}
                      onFocus={() => onRead?.(group.id, id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRead?.(group.id, id);
                      }}
                      data-active={activeId === group.id || undefined}
                    >
                      <div className="book-word-line">
                        <h3>{word.englishWord}</h3>
                        {word.englishPhonetic && (
                          <span className="book-phonetic">
                            {word.englishPhonetic}
                          </span>
                        )}
                        <span>
                          {word.englishPartSpeech
                            ?.map((v) => speech[v])
                            .filter(Boolean)
                            .join(" / ")}
                        </span>
                        <strong className="book-meaning">
                          {word.englishChinese || "暂无释义"}
                        </strong>
                      </div>
                      {!!word.keyPoints?.length && (
                        <ul className="book-key-points">
                          {word.keyPoints.map((point, i) => (
                            <li key={i}><NoteContent text={point} /></li>
                          ))}
                        </ul>
                      )}
                      {!print &&
                        (word.englishNote || word.englishReference) && (
                          <details className="book-source">
                            <summary>查看原笔记与来源</summary>
                            {word.englishNote && <NoteContent text={word.englishNote} />}
                            {word.englishReference && (
                              <p>来源：{word.englishReference}</p>
                            )}
                          </details>
                        )}
                    </div>
                  );
                })}
              </div>
              {!!group.notes?.length && (
                <aside className="book-group-notes">
                  {group.notes.map((note, i) => (
                    <div key={i}>
                      <strong>知识提示：</strong>
                      <NoteContent text={note.text} />
                      {!print && (
                        <small>
                          （依据：
                          {note.sourceWordIds
                            .map((id) => byId.get(id)?.englishWord)
                            .filter(Boolean)
                            .join("、")}
                          ）
                        </small>
                      )}
                    </div>
                  ))}
                </aside>
              )}
            </section>
          ))}
      </div>
      {print && (
        <footer className="book-print-footer">
          {title} · 内容保存于制作时
        </footer>
      )}
    </article>
  );
}
