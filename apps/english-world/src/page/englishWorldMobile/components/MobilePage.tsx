import type { HTMLAttributes, ReactNode } from "react";

export interface MobilePageProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  children: ReactNode;
  title: string;
}

export function MobilePage({ children, className, title, ...sectionProps }: MobilePageProps) {
  return (
    <section
      {...sectionProps}
      aria-label={title}
      className={["mobile-page", className].filter(Boolean).join(" ")}
    >
      <h1 className="mobile-page__title">{title}</h1>
      {children}
    </section>
  );
}
