import { lazy, Suspense } from "react";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { getReadingNavKey, READING_NAV } from "@/page/englishWorld/navigation";
import { ReadingPracticeList } from "./ReadingPracticeList";
const PersonalReading = lazy(() => import("@/page/englishWorld/contextLab/ContextLabPage").then(({ ContextLabPage }) => ({ default: ContextLabPage })));

export function ReadingWorkspace({ basePath }: { basePath: string }) {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "exam" ? "exam" : "practice";
  const personal = params.get("source") !== null && params.get("source") !== "assigned";
  const desktop = !basePath.startsWith("/mobile/");
  const section = getReadingNavKey(params);
  const description = mode === "exam"
    ? "单篇限时模拟：左右分栏阅读与答题、倒计时、标记与交卷。当前材料为单篇训练，不是完整雅思套卷。"
    : personal
      ? "选择词汇或粘贴文章生成练习，可查看解析并重复练习；历史练习与作答记录保留在下方。"
      : "完成收到的文章练习，在学习记录中回顾成绩与错题。";
  const content = mode === "exam" || personal ? <Suspense fallback={<p role="status">正在加载阅读工作区…</p>}>
    <PersonalReading key={mode} readingMode={mode} />
  </Suspense> : <ReadingPracticeList basePath={basePath} embedded />;

  const select = (nextMode: "exam" | "practice", source = "assigned") => {
    const next = new URLSearchParams(params);
    next.set("mode", nextMode);
    next.set("source", source);
    next.delete("taskId");
    setParams(next);
  };
  if (desktop) return <section className="reading-workspace" aria-labelledby="reading-section-title">
    <header className="reading-workspace-heading">
      <h1 id="reading-section-title">{READING_NAV[section].label}</h1>
      <p>{description}</p>
    </header>
    {content}
  </section>;

  return <section className="reading-workspace" aria-label="阅读练习工作区">
    <header className="reading-workspace-heading">
      <h1>阅读练习</h1>
      <p>考试时专注作答，练习时按自己的节奏学习。</p>
    </header>
    <div className="reading-mode-tabs" role="tablist" aria-label="阅读模式">
      <button id="reading-exam-tab" role="tab" aria-selected={mode === "exam"} aria-controls="reading-workspace-panel" onClick={() => select("exam", "personal")}>雅思考试</button>
      <button id="reading-practice-tab" role="tab" aria-selected={mode === "practice"} aria-controls="reading-workspace-panel" onClick={() => select("practice")}>自主练习</button>
    </div>
    <div id="reading-workspace-panel" role="tabpanel" aria-labelledby={mode === "exam" ? "reading-exam-tab" : "reading-practice-tab"}>
      {mode === "practice" && <div className="reading-source-tabs" role="tablist" aria-label="练习来源">
        <button id="reading-assigned-tab" role="tab" aria-selected={!personal} aria-controls="reading-source-panel" onClick={() => select("practice")}>收到的练习</button>
        <button id="reading-personal-tab" role="tab" aria-selected={personal} aria-controls="reading-source-panel" onClick={() => select("practice", "personal")}>自己出题</button>
      </div>}
      <p className="reading-mode-description">{description}</p>
      <div id="reading-source-panel" role={mode === "practice" ? "tabpanel" : undefined} aria-labelledby={mode === "practice" ? personal ? "reading-personal-tab" : "reading-assigned-tab" : undefined}>
        {content}
      </div>
    </div>
  </section>;
}

// Preserve focused recovery/source links; ordinary legacy entries join the workspace.
export function LegacyReadingEntry() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (params.get("mode") === "micro") return <Suspense fallback={<p role="status">正在加载…</p>}><PersonalReading /></Suspense>;
  params.set("mode", "practice");
  if (!params.has("source")) params.set("source", "personal");
  return <Navigate replace to={`/englishWorld/reading-practices?${params.toString()}`} />;
}
