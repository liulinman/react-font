import { Link } from "react-router-dom";
import type { WordList } from "@/server/word/word.type";
import { getLevelLabel, getPartSpeechLabel } from "@/page/englishWorld/utils/wordLabels";
import { MobileBritishPronunciationButton } from "../../MobileBritishPronunciationButton";

type WordMenuItem = {
  danger?: boolean;
  key: string;
  label: string;
  onClick?: () => void;
};

type MobileWordRowProps = {
  href: string;
  disabled?: boolean;
  menuItems?: WordMenuItem[];
  onSelect?: (checked: boolean) => void;
  selected?: boolean;
  selectionMode?: boolean;
  word: WordList;
};

export function MobileWordRow({
  href,
  disabled = false,
  menuItems = [],
  onSelect,
  selected = false,
  selectionMode = false,
  word,
}: MobileWordRowProps) {
  const mastery = getLevelLabel(word.englishLevel);

  const content = <>
    <span aria-label={`掌握程度：${mastery.label}`} className={`mobile-word-row__mastery mobile-word-row__mastery--${word.englishLevel ?? 0}`} />
        <span className="mobile-word-row__content">
          <strong lang="en">{word.englishWord}</strong>
          {word.englishPhonetic && <small className="word-row-phonetic">{word.englishPhonetic}</small>}
          <span className="word-row-meaning">{word.englishChinese || "暂无释义"}</span>
          <span className="word-row-labels"><small className={`word-level-pill word-level-pill--${word.englishLevel??0}`}>{mastery.label}</small>{word.englishPartSpeech?.slice(0,2).map(n=><small key={n}>{getPartSpeechLabel(n).label}</small>)}</span>
        </span>
  </>;

  return (
    <article className="mobile-word-row" data-selection-mode={selectionMode ? "true" : "false"}>
      {selectionMode ? (
        <label className="mobile-word-row__selection">
          <input aria-label={`选择 ${word.englishWord}`} checked={selected} disabled={disabled}
            onChange={event => onSelect?.(event.target.checked)} type="checkbox" />
          <span className="mobile-word-row__link">{content}</span>
        </label>
      ) : <Link aria-label={word.englishWord} className="mobile-word-row__link" to={href}>{content}</Link>}

      <MobileBritishPronunciationButton ariaLabel={`播放 ${word.englishWord} 的英式发音`} word={word.englishWord} />
      {!selectionMode && menuItems.length > 0 && (
        <details className="mobile-word-row__menu">
          <summary aria-label={`${word.englishWord} 更多操作`}><span aria-hidden="true">···</span></summary>
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
