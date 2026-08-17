import type { HTMLAttributes, ReactNode } from "react";

export interface SafeAreaActionsProps
  extends Omit<HTMLAttributes<HTMLElement>, "aria-label" | "children"> {
  children: ReactNode;
}

export function SafeAreaActions({ children, className, ...sectionProps }: SafeAreaActionsProps) {
  return (
    <section
      {...sectionProps}
      aria-label="页面操作"
      className={["mobile-safe-area-actions", className].filter(Boolean).join(" ")}
      role="region"
    >
      {children}
    </section>
  );
}
