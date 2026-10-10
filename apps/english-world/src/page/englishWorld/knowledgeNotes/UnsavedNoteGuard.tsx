import { useCallback, useEffect, useRef, type MutableRefObject } from "react";
import { useBeforeUnload, useBlocker } from "react-router-dom";
export function UnsavedNoteGuard({
  dirty,
  allowLeave,
  busy = false,
}: {
  dirty: boolean;
  busy?: boolean;
  allowLeave: MutableRefObject<boolean>;
}) {
  const blocker = useBlocker(() => dirty && !allowLeave.current);
  useBeforeUnload(
    useCallback(
      (event: BeforeUnloadEvent) => {
        if (dirty && !allowLeave.current) {
          event.preventDefault();
          event.returnValue = "";
        }
      },
      [dirty, allowLeave],
    ),
  );
  const dialogRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        blocker.reset();
      }
      if (event.key !== "Tab" || !dialog) return;
      const buttons = [
        ...dialog.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
      ];
      const first = buttons[0],
        last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog?.addEventListener("keydown", handleKey);
    return () => {
      dialog?.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [blocker]);
  if (blocker.state !== "blocked") return null;
  return (
    <div className="knowledge-dialog-backdrop">
      <section
        ref={dialogRef}
        className="knowledge-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="unsaved-note-title"
      >
        <h2 id="unsaved-note-title">有尚未保存的修改</h2>
        <p>
          {busy ? "正在保存，请等待保存结果。" : "离开后，本次修改将丢失。"}
        </p>
        <div className="knowledge-actions">
          <button autoFocus onClick={() => blocker.reset()}>
            继续编辑
          </button>
          <button disabled={busy} onClick={() => blocker.proceed()}>
            放弃修改
          </button>
        </div>
      </section>
    </div>
  );
}
