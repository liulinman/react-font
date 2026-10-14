import type { HTMLAttributes, ReactNode } from "react";

export interface MobilePageProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children: ReactNode;
  title: string;
  actions?: ReactNode;
}

export function MobilePage({ children, className, title, actions, ...sectionProps }: MobilePageProps) {
  return (
    <section
      {...sectionProps}
      aria-label={title}
      className={["mobile-page", className].filter(Boolean).join(" ")}
    >
      {actions ? <header className="mobile-page-titlebar"><h1 className="mobile-page__title">{title}</h1>{actions}</header> : <h1 className="mobile-page__title">{title}</h1>}
      {children}
    </section>
  );
}
