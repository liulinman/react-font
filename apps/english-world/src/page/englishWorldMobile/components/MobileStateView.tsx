import type { ReactNode } from "react";

export type MobileState = "loading" | "empty" | "offline" | "error";

const STATE_CONTENT: Record<MobileState, { message: string; role: "alert" | "status" }> = {
  loading: { message: "正在加载", role: "status" },
  empty: { message: "暂无内容", role: "status" },
  offline: { message: "当前离线", role: "status" },
  error: { message: "暂时无法加载", role: "alert" },
};

export interface MobileStateViewProps {
  action?: ReactNode;
  children?: ReactNode;
  message?: ReactNode;
  state: MobileState;
}

export function MobileStateView({ action, children, message, state }: MobileStateViewProps) {
  const content = STATE_CONTENT[state];

  return (
    <div
      aria-busy={state === "loading" || undefined}
      aria-live={state === "error" ? "assertive" : "polite"}
      className="mobile-state-view"
      data-state={state}
      data-testid="mobile-state-view"
      role={content.role}
    >
      <p className="mobile-state-view__message">{message ?? content.message}</p>
      {children}
      {action}
    </div>
  );
}
