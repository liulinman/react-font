import { useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { changeMaterial, requestId } from "./api";
import type { Material } from "./types";
export function useReadingPersistence(
  material: Material,
  onChange: (m: Material) => void,
) {
  const current = useRef(material);
  current.current = material;
  const [status, setStatus] = useState("已保存");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);
  const pending = useRef<{
    path: string;
    data: Record<string, unknown>;
    method: string;
    requestId: string;
    expectedVersion: number;
  } | null>(null);
  const blocker = useBlocker(dirty || busy || !!error);
  useEffect(() => {
    if (
      blocker.state === "blocked" &&
      window.confirm("还有未保存的编辑，确定离开？")
    )
      blocker.proceed();
    else if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (dirty || busy || error) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty, busy, error]);
  async function perform(
    path: string,
    data: Record<string, unknown>,
    method = "POST",
    retry = false,
  ) {
    if (lock.current || (!retry && pending.current)) return null;
    lock.current = true;
    setBusy(true);
    setStatus("保存中…");
    setError("");
    const operation = retry
      ? pending.current!
      : {
          path,
          data,
          method,
          requestId: requestId(),
          expectedVersion: current.current.version,
        };
    pending.current = operation;
    try {
      const result = await changeMaterial(
        current.current.id,
        operation.path,
        {
          ...operation.data,
          expectedVersion: operation.expectedVersion,
          requestId: operation.requestId,
        },
        operation.method,
      );
      const merged = { ...current.current, ...result };
      current.current = merged;
      onChange(merged);
      pending.current = null;
      setStatus("已保存");
      return merged;
    } catch (e) {
      const message =
        (e as { message?: string })?.message || "保存失败，请重试";
      setError(message);
      setStatus("保存失败");
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    status,
    busy,
    dirty,
    error,
    setDirty,
    perform,
    retry: () =>
      pending.current ? perform("", {}, "POST", true) : Promise.resolve(null),
    discardPending: () => {
      pending.current = null;
      setError("");
      setStatus("已载入最新版本，编辑内容仍保留");
    },
  };
}
