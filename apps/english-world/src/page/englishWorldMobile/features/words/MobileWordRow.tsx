import { Link } from "react-router-dom";
import type { WordList } from "@/server/word/word.type";
import { getLevelLabel } from "@/page/englishWorld/utils/wordLabels";
import { MobileBritishPronunciationButton } from "../../MobileBritishPronunciationButton";

type WordMenuItem = {
  danger?: boolean;
  key: string;
  label: string;
  onClick?: () => void;
};

type MobileWordRowProps = {
  href: string;
  menuItems?: WordMenuItem[];
  onSelect?: (checked: boolean) => void;
  selected?: boolean;
  selectionMode?: boolean;
  word: WordList;
};

export function MobileWordRow({
  href,
  menuItems = [],
  onSelect,
  selected = false,
  selectionMode = false,
  word,
}: MobileWordRowProps) {
  const mastery = getLevelLabel(word.englishLevel);

  return (
    <article className="mobile-word-row">
      {selectionMode && (
        <label className="mobile-word-row__selection">
          <input
            aria-label={`选择 ${word.englishWord}`}
            checked={selected}
            onChange={(event) => onSelect?.(event.target.checked)}
            type="checkbox"
          />
          选择
        </label>
      )}
      <Link aria-label={word.englishWord} className="mobile-word-row__link" to={href}>
        <span aria-label={`掌握程度：${mastery.label}`} className={`mobile-word-row__mastery mobile-word-row__mastery--${word.englishLevel ?? 0}`} />
        <span className="mobile-word-row__content">
          <strong>{word.englishWord}</strong>
          <small>{[word.englishPhonetic, word.englishChinese].filter(Boolean).join(" · ") || "暂无释义"}</small>
          <small>{mastery.label}</small>
        </span>
        <span aria-hidden="true">›</span>
      </Link>
      <MobileBritishPronunciationButton ariaLabel={`播放 ${word.englishWord} 的英式发音`} word={word.englishWord} />
      {menuItems.length > 0 && (
        <details className="mobile-word-row__menu">
          <summary aria-label={`${word.englishWord} 更多操作`}>更多</summary>
          <div role="menu">
            {menuItems.map((item) => (
              <button className={item.danger ? "is-danger" : undefined} key={item.key} onClick={item.onClick} role="menuitem" type="button">
                {item.label}
              </button>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}
