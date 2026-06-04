import type { ReactNode } from "react";
import { EnglishHeader } from "../component/EnglishHeader";

type EnglishWorldLayoutProps = {
  activeKey: string;
  children: ReactNode;
};

export function EnglishWorldLayout({
  activeKey,
  children,
}: EnglishWorldLayoutProps) {
  return (
    <div className="english-world-shell">
      <EnglishHeader activeKey={activeKey} />
      <main className="english-world-main">{children}</main>
    </div>
  );
}
