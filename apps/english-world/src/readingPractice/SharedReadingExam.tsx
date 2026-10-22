import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import request from "@font/api";
import { IeltsExamWorkspace } from "../page/englishWorld/contextLab/IeltsExamWorkspace";
import type { ExamResult, ExamSubmission, ExamTask } from "../page/englishWorld/contextLab/examWorkspace.types";
import { getResult, submitPractice } from "./api";
import { ReadingFeedback } from "./ReadingFeedback";
import type { PracticeResult, PublicPractice, Submission } from "./types";
import { usePracticeDraft } from "./usePracticeDraft";

export function readingExamTask(paper: PublicPractice): ExamTask {
  let cursor = paper.title.length + 2;
  const articleOmissions = [{start:0,end:cursor}];
  paper.paragraphs.forEach((paragraph,index)=>{
    const label=paper.paragraphLabels?.[index] || `Paragraph ${index+1}`;
    if(!paper.paragraphLabels?.[index] || /^Paragraph\s+\d+$/i.test(label)) articleOmissions.push({start:cursor,end:cursor+label.length+2});
    cursor+=label.length+2+paragraph.length+2;
  });
  return {
    articleOmissions,
    taskId: paper.id,
    title: paper.title,
    articleExerciseId: paper.id,
    article: [paper.title, ...paper.paragraphs.map((paragraph, index) => `${paper.paragraphLabels?.[index] || `Paragraph ${index + 1}`}\n\n${paragraph}`)].join("\n\n"),
    questions: paper.questions.map(question => ({ ...question, instructions: question.instructions || paper.instructions })),
  };
}

export function readingExamResult(result: PracticeResult): ExamResult {
  return {
    score: result.score,
    correctCount: result.correctCount,
    wrongCount: result.total - result.correctCount,
    total: result.total,
    results: result.results.map(question => ({
      questionId: question.id,
      correct: question.correct,
      voided: question.voided,
      correctIndex: question.correctIndex,
      userSelectedIndex: question.selectedIndex,
      answerText: question.answerText,
      acceptedAnswers: question.acceptedAnswers,
      explanation: [question.voided ? "本题已作废，不计入成绩。" : "", question.explanation, question.evidence && `原文第 ${question.evidence.paragraph} 段：${question.evidence.quote || question.evidence.missingInformation || ""}`].filter(Boolean).join("\n\n"),
    })),
  };
}

export function SharedReadingExam({ paper, userId, basePath, initialResult }: {
  paper: PublicPractice;
  userId: number;
  basePath: string;
  initialResult?: PracticeResult;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);
  const { draft, clear, notice } = usePracticeDraft(userId, paper.id, paper.questions);
  const [result, setResult] = useState(initialResult);
  // Keep a single idempotency key across retries, reloads, and the old answer sheet.
  const [requestUid] = useState(() => {
    try {
      const key = `reading-practice:submission:v1:${userId}:${paper.id}`;
      const stored = localStorage.getItem(key);
      if (stored && /^[-\w:.]{8,128}$/.test(stored)) return stored;
      localStorage.setItem(key, draft.requestUid);
    } catch { /* The existing draft notice covers unavailable browser storage. */ }
    return draft.requestUid;
  });
  const task = useMemo(() => readingExamTask(paper), [paper]);
  const initialAnswers = useMemo(() => initialResult ? Object.fromEntries(initialResult.results.flatMap<[string, number | string]>(q => q.kind === "sentence_completion" ? [[q.id, q.answerText || ""]] : q.selectedIndex == null ? [] : [[q.id, q.selectedIndex]])) : draft.answers, [initialResult, draft.answers]);
  const submit = async (submission: ExamSubmission): Promise<ExamResult> => {
    const answers: Submission["answers"] = paper.questions.map(question => {
      const answer = submission.answers.find(item => item.questionId === question.id);
      if (question.kind === "sentence_completion") return answer?.answerText?.trim() ? { questionId: question.id, answerText: answer.answerText.trim() } : { questionId: question.id, unanswered: true };
      return answer?.selectedIndex != null ? { questionId: question.id, selectedIndex: answer.selectedIndex } : { questionId: question.id, unanswered: true };
    });
    let authoritative: PracticeResult;
    try {
      authoritative = await request(submitPractice(paper.id, { requestUid, allowUnanswered: true, elapsedSeconds: submission.elapsedSeconds, answers }));
    } catch {
      try { authoritative = await request(getResult(paper.id)); }
      catch { throw new Error("提交未完成，答案已保留。请联网后重试；每套练习只能正式提交一次"); }
    }
    clear();
    setResult(authoritative);
    return readingExamResult(authoritative);
  };
  return createPortal(<IeltsExamWorkspace
    task={task}
    userId={userId}
    storageNamespace="reading-practice"
    allowRestart={false}
    initialResult={initialResult ? readingExamResult(initialResult) : null}
    initialAnswers={initialAnswers}
    defaultDuration={20}
    onStart={async () => { await request({ url: `/reading-practices/${paper.id}/start`, method: "POST", data: {} }); }}
    onSubmit={submit}
    onExit={() => navigate(basePath)}
    renderQuestionFooter={questionId => <ReadingFeedback practiceId={paper.id} questionId={questionId} />}
    resultDetails={<>{notice && <span role="status">{notice}</span>}{result?.originalResult && <details><summary>成绩调整说明 · 当前评分修订 {result.gradingRevision}</summary><p>原始成绩：{result.originalResult.score == null ? "无法评分" : `${result.originalResult.correctCount}/${result.originalResult.total} · ${result.originalResult.score}分`}</p>{result.adjustments?.map(item => <p key={item.id}>{item.questionId} · {item.reason}</p>)}</details>}</>}
  />, document.body);
}
