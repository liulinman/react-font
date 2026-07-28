import type { ReactNode } from "react";

type EnglishWorldPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  compact?: boolean;
};

export function EnglishWorldPageHeader({
  eyebrow,
  title,
  description,
  actions,
  compact = false,
}: EnglishWorldPageHeaderProps) {
  return (
    <header
      className={`english-world-page-header${
        compact ? " english-world-page-header-compact" : ""
      }`}
    >
      <div className="english-world-page-header-copy">
        {eyebrow ? (
          <span className="english-world-page-eyebrow">{eyebrow}</span>
        ) : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? (
        <div className="english-world-page-actions">{actions}</div>
      ) : null}
    </header>
  );
}
