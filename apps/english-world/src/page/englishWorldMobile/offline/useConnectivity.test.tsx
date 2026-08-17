import "@testing-library/jest-dom/vitest";
import { StrictMode } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MobileActivityLockProvider,
  type MobileActivityLockValue,
  useMobileActivityLock,
  useMobileActivityLockContext,
} from "./MobileActivityLockContext";
import { useConnectivity } from "./useConnectivity";

let online = true;

function ConnectivityProbe() {
  const connected = useConnectivity();
  return <output>{connected ? "online" : "offline"}</output>;
}

function LockProbe({ lockKey, active }: { lockKey: string; active: boolean }) {
  useMobileActivityLock(lockKey, active);
  return null;
}

function LockStatus() {
  // The provider exposes the status through this small consumer rather than a mock.
  const { locked } = useMobileActivityLockContext();
  return <output>{locked ? "locked" : "unlocked"}</output>;
}

function ContextValueProbe({
  marker,
  record,
}: {
  marker: string;
  record: (value: MobileActivityLockValue) => void;
}) {
  const value = useMobileActivityLockContext();
  record(value);
  return <output>{`${marker}:${value.locked ? "locked" : "unlocked"}`}</output>;
}

describe("useConnectivity", () => {
  beforeEach(() => {
    online = true;
    Object.defineProperty(window.navigator, "onLine", {
      configurable: true,
      get: () => online,
    });
  });

  afterEach(cleanup);

  it("uses navigator.onLine initially and updates only on browser connectivity events", () => {
    render(<ConnectivityProbe />);
    expect(screen.getByText("online")).toBeInTheDocument();

    online = false;
    fireEvent(window, new Event("offline"));
    expect(screen.getByText("offline")).toBeInTheDocument();

    fireEvent(window, new Event("requestfailed"));
    expect(screen.getByText("offline")).toBeInTheDocument();

    online = true;
    fireEvent(window, new Event("online"));
    expect(screen.getByText("online")).toBeInTheDocument();
  });
});

describe("MobileActivityLockProvider", () => {
  afterEach(cleanup);

  it("stays locked while any active key remains and unlocks on the final unmount", () => {
    const view = render(
      <MobileActivityLockProvider>
        <LockProbe lockKey="word-form:new" active />
        <LockProbe lockKey="learning:42" active />
        <LockStatus />
      </MobileActivityLockProvider>,
    );

    expect(screen.getByText("locked")).toBeInTheDocument();

    view.rerender(
      <MobileActivityLockProvider>
        <LockProbe lockKey="word-form:new" active={false} />
        <LockProbe lockKey="learning:42" active />
        <LockStatus />
      </MobileActivityLockProvider>,
    );
    expect(screen.getByText("locked")).toBeInTheDocument();

    view.rerender(
      <MobileActivityLockProvider>
        <LockStatus />
      </MobileActivityLockProvider>,
    );
    expect(screen.getByText("unlocked")).toBeInTheDocument();
  });

  it("keeps a shared key locked until every owner releases it", () => {
    const view = render(
      <MobileActivityLockProvider>
        <LockProbe lockKey="learning:42" active />
        <LockProbe lockKey="learning:42" active />
        <LockStatus />
      </MobileActivityLockProvider>,
    );

    view.rerender(
      <MobileActivityLockProvider>
        <LockProbe lockKey="learning:42" active={false} />
        <LockProbe lockKey="learning:42" active />
        <LockStatus />
      </MobileActivityLockProvider>,
    );

    expect(screen.getByText("locked")).toBeInTheDocument();

    view.rerender(
      <MobileActivityLockProvider>
        <LockProbe lockKey="learning:42" active={false} />
        <LockProbe lockKey="learning:42" active={false} />
        <LockStatus />
      </MobileActivityLockProvider>,
    );

    expect(screen.getByText("unlocked")).toBeInTheDocument();
  });

  it("remains locked through React StrictMode effect replay", () => {
    render(
      <StrictMode>
        <MobileActivityLockProvider>
          <LockProbe lockKey="learning:strict" active />
          <LockStatus />
        </MobileActivityLockProvider>
      </StrictMode>,
    );

    expect(screen.getByText("locked")).toBeInTheDocument();
  });

  it("keeps the context value reference stable while lock state is unchanged", () => {
    const values: MobileActivityLockValue[] = [];
    const record = (value: MobileActivityLockValue) => values.push(value);
    const view = render(
      <MobileActivityLockProvider>
        <LockProbe lockKey="learning:stable" active />
        <ContextValueProbe marker="first" record={record} />
      </MobileActivityLockProvider>,
    );
    const lockedValue = values.at(-1);

    view.rerender(
      <MobileActivityLockProvider>
        <LockProbe lockKey="learning:stable" active />
        <ContextValueProbe marker="second" record={record} />
      </MobileActivityLockProvider>,
    );

    expect(screen.getByText("second:locked")).toBeInTheDocument();
    expect(values.at(-1)).toBe(lockedValue);
  });
});
