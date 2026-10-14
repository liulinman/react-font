import { useQuery } from "@tanstack/react-query";
import request from "@font/api";
import { useAuth } from "@/contexts/AuthContext";
import { contextLabDetail } from "@/page/englishWorld/server/learning";
import type { ContextLabTask } from "@/page/englishWorld/types/learning";
import { parseMobileContextArticle } from "../../mobileContextLab";
export const articleRoot = "/mobile/tools/context-lab";
export const articleKeys = ["mobile", "articles"] as const;
export const taskPending = (task?: ContextLabTask) =>
  task?.status === "pending" || task?.status === "processing";
export function articleTitle(task: ContextLabTask) {
  const title = parseMobileContextArticle(task.article ?? "").topic;
  return title && title.length < 120
    ? title
    : task.words?.length
      ? task.words.slice(0, 4).join(" · ")
      : `阅读练习 #${task.taskId}`;
}
export const articleStatus = (task: ContextLabTask) =>
  ({
    pending: "等待生成",
    processing: "正在生成",
    succeeded: "可以练习",
    failed: "生成失败",
  })[task.status];
export function useArticle(taskId: number) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [...articleKeys, user?.id, "detail", taskId],
    queryFn: () => request(contextLabDetail({ taskId })),
    enabled: Number.isSafeInteger(taskId) && taskId > 0,
    retry: false,
    refetchInterval: (q) => (taskPending(q.state.data) ? 5000 : false),
  });
}
