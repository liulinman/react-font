import type { ReactNode } from "react";

type EnglishWorldPageHeaderProps = {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function EnglishWorldPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: EnglishWorldPageHeaderProps) {
  return (
    <header className="english-world-page-header">
      <div className="english-world-page-header-copy">
        {eyebrow ? (
          <span className="english-world-page-eyebrow">{eyebrow}</span>
        ) : null}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? (
        <div className="english-world-page-actions">{actions}</div>
      ) : null}
    </header>
  );
}
