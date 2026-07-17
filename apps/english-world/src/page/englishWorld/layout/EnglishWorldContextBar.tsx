import {
  formatEnglishWorldDate,
  getEnglishWorldSectionLabel,
} from "./englishWorldContext";

type EnglishWorldContextBarProps = {
  activeKey: string;
  now?: Date;
};

export function EnglishWorldContextBar({
  activeKey,
  now = new Date(),
}: EnglishWorldContextBarProps) {
  return (
    <header className="english-world-context-bar">
      <div className="english-world-context-path">
        <span>English World</span>
        <span aria-hidden="true">/</span>
        <strong>{getEnglishWorldSectionLabel(activeKey)}</strong>
      </div>
      <time className="english-world-context-date" dateTime={now.toISOString()}>
        {formatEnglishWorldDate(now)}
      </time>
    </header>
  );
}
