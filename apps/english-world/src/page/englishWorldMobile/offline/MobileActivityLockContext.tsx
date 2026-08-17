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

export type MobileActivityLockValue = {
  locked: boolean;
  lock(key: string): void;
  unlock(key: string): void;
};

export const MobileActivityLockContext =
  createContext<MobileActivityLockValue | null>(null);

export function MobileActivityLockProvider({ children }: { children: ReactNode }) {
  const locks = useRef(new Map<string, number>());
  const [locked, setLocked] = useState(false);

  const lock = useCallback((key: string) => {
    const count = locks.current.get(key) ?? 0;
    locks.current.set(key, count + 1);
    if (count === 0) setLocked(true);
  }, []);

  const unlock = useCallback((key: string) => {
    const count = locks.current.get(key) ?? 0;
    if (count <= 1) locks.current.delete(key);
    else locks.current.set(key, count - 1);
    if (locks.current.size === 0) setLocked(false);
  }, []);

  const value = useMemo<MobileActivityLockValue>(
    () => ({ locked, lock, unlock }),
    [locked, lock, unlock],
  );

  return (
    <MobileActivityLockContext.Provider value={value}>
      {children}
    </MobileActivityLockContext.Provider>
  );
}

export function useMobileActivityLockContext() {
  const value = useContext(MobileActivityLockContext);
  if (!value) {
    throw new Error("useMobileActivityLock must be used inside MobileActivityLockProvider");
  }
  return value;
}

export function useMobileActivityLock(key: string, active: boolean) {
  const { lock, unlock } = useMobileActivityLockContext();

  useEffect(() => {
    if (!active) return;
    lock(key);
    return () => unlock(key);
  }, [active, key, lock, unlock]);
}
