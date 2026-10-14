import { createPortal } from "react-dom";
import { useEffect } from "react";
import request from "@font/api";
import { useAuth } from "@/contexts/AuthContext";
import { contextLabSubmit } from "../server/learning";
import type { ContextLabTask } from "../types/learning";
import { IeltsExamWorkspace } from "./IeltsExamWorkspace";

export function ContextLabExam({
  task,
  onExit,
  onCompleted,
}: {
  task: ContextLabTask;
  onExit: () => void;
  onCompleted: () => void;
}) {
  const { user } = useAuth();
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, []);
  if (!user) return null;
  return createPortal(
    <IeltsExamWorkspace
      key={`${user.id}:${task.taskId}`}
      userId={user.id}
      task={task}
      onExit={onExit}
      onSubmit={async (params) => {
        const response = await request(contextLabSubmit(params));
        onCompleted();
        return response;
      }}
    />,
    document.body,
  );
}
