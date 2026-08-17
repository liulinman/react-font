/// <reference types="vite-plugin-pwa/client" />

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { registerSW } from "virtual:pwa-register";
import { useMobileActivityLockContext } from "../offline/MobileActivityLockContext";

export type PwaRegistrationCallbacks = {
  onNeedRefresh(): void;
  onOfflineReady(): void;
};

export type PwaUpdateAction = (reloadPage?: boolean) => void | Promise<void>;

export type PwaRegistrationAdapter = {
  register(callbacks: PwaRegistrationCallbacks): PwaUpdateAction;
};

const browserRegistration: PwaRegistrationAdapter = {
  register(callbacks) {
    return registerSW({ immediate: true, ...callbacks });
  },
};

export type PwaUpdateValue = {
  status: "idle" | "ready" | "offline-ready";
  locked: boolean;
  refreshRequestId: number;
  applyUpdate(): void;
};

const PwaUpdateContext = createContext<PwaUpdateValue | null>(null);

export function PwaUpdateProvider({ children, registration = browserRegistration }: {
  children: ReactNode;
  registration?: PwaRegistrationAdapter;
}) {
  const { locked } = useMobileActivityLockContext();
  const [status, setStatus] = useState<PwaUpdateValue["status"]>("idle");
  const [refreshRequestId, setRefreshRequestId] = useState(0);
  const updateAction = useRef<PwaUpdateAction | null>(null);

  useEffect(() => {
    if (!registration) return;
    updateAction.current = registration.register({
      onNeedRefresh: () => {
        setStatus("ready");
        setRefreshRequestId((current) => current + 1);
      },
      onOfflineReady: () => setStatus("offline-ready"),
    });
  }, [registration]);

  const applyUpdate = useCallback(() => {
    if (status === "ready" && !locked) {
      void updateAction.current?.(true);
    }
  }, [locked, status]);

  const value = useMemo<PwaUpdateValue>(
    () => ({ status, locked, refreshRequestId, applyUpdate }),
    [applyUpdate, locked, refreshRequestId, status],
  );

  return (
    <PwaUpdateContext.Provider value={value}>
      {children}
    </PwaUpdateContext.Provider>
  );
}

export function usePwaUpdate() {
  const value = useContext(PwaUpdateContext);
  if (!value) {
    throw new Error("usePwaUpdate must be used inside PwaUpdateProvider");
  }
  return value;
}

export function PwaUpdatePrompt() {
  const { applyUpdate, locked, refreshRequestId, status } = usePwaUpdate();
  const [dismissedRequestId, setDismissedRequestId] = useState<number | null>(null);

  if (status !== "ready" || dismissedRequestId === refreshRequestId) return null;

  return (
    <aside aria-live="polite" className="mobile-state-view" role="status">
      <strong>新版本已准备好</strong>
      {locked ? <p>学习活动进行中，完成后可更新</p> : null}
      <button
        onClick={() => setDismissedRequestId(refreshRequestId)}
        type="button"
      >
        稍后
      </button>
      <button disabled={locked} onClick={applyUpdate} type="button">
        立即更新
      </button>
    </aside>
  );
}

export function PwaUpdateStatusSurface() {
  const { applyUpdate, locked, status } = usePwaUpdate();
  const message = status === "ready"
    ? "新版本已准备好"
    : status === "offline-ready"
      ? "应用已可离线使用"
      : "当前已是最新版本";

  return (
    <section aria-labelledby="pwa-update-title" className="mobile-state-view">
      <h2 id="pwa-update-title">应用更新</h2>
      <p>{message}</p>
      {status === "ready" ? (
        <>
          {locked ? <p>学习活动进行中，完成后可更新</p> : null}
          <button disabled={locked} onClick={applyUpdate} type="button">
            立即更新
          </button>
        </>
      ) : null}
    </section>
  );
}
