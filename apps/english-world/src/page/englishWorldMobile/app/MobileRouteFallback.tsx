import { Suspense, type ReactNode } from "react";

interface MobileRouteFallbackProps {
  children: ReactNode;
}

export function MobileRouteFallback({ children }: MobileRouteFallbackProps) {
  return (
    <Suspense
      fallback={
        <div aria-busy="true" aria-label="正在加载页面" role="status">
          正在加载页面…
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
