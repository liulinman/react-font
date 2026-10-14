import { useEffect, useRef, type ReactNode } from "react";
import { buildArticleTranslationBlocks } from "@/page/englishWorld/contextLab/articleTranslation";
export function ArticlePassage({
  article,
  translations,
  position,
  onPosition,
}: {
  article: string;
  translations: string[];
  position: number;
  onPosition: (n: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current && Math.abs(ref.current.scrollTop - position) > 1)
      ref.current.scrollTop = position;
  }, [position]);
  return (
    <div
      ref={ref}
      className="article-passage"
      role="region"
      aria-label="可滚动的文章原文"
      tabIndex={0}
      onScroll={(e) => onPosition(e.currentTarget.scrollTop)}
    >
      {buildArticleTranslationBlocks(article, translations).map((b, i) => (
        <div className="article-paragraph" key={i}>
          <span className="article-paragraph-number" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <p lang="en">{b.english.replace(/\*\*/g, "")}</p>
            {b.chinese && <p className="article-translation">{b.chinese}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
export function ArticleReadingDialog({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => {
      if (typeof dialog.close === "function") dialog.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="article-reading-dialog"
      aria-label="文章原文"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <strong>文章原文</strong>
        <button onClick={onClose}>返回答题</button>
      </header>
      {children}
    </dialog>
  );
}
