import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { LeftOutline } from "antd-mobile-icons";
export function StudyChrome({
  title,
  children,
  eyebrow = "YOUR DAILY PRACTICE",
}: {
  title: string;
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <section className="mobile-page study-page">
      <header className="study-heading">
        <Link to="/mobile" aria-label="返回学习首页">
          <LeftOutline />
        </Link>
        <span>{eyebrow}</span>
      </header>
      <h1 className="mobile-page__title">{title}</h1>
      {children}
    </section>
  );
}
export function StudyError({ message }: { message: string }) {
  return message ? (
    <p className="study-error" role="alert">
      {message}
    </p>
  ) : null;
}
export function StudyProgress({
  current,
  total,
}: {
  current: number;
  total: number;
}) {
  return (
    <div className="study-progress">
      <div>
        <span>一点一点，记得更牢</span>
        <strong>
          {Math.min(current, total)} / {total}
        </strong>
      </div>
      <progress
        aria-label="学习进度"
        value={current}
        max={Math.max(total, 1)}
      />
    </div>
  );
}
