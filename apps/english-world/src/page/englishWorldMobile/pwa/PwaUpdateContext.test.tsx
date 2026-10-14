import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MobileActivityLockContext,
  type MobileActivityLockValue,
} from "../offline/MobileActivityLockContext";
import {
  PwaUpdatePrompt,
  PwaUpdateProvider,
  PwaUpdateStatusSurface,
  usePwaUpdate,
  type PwaRegistrationAdapter,
  type PwaRegistrationCallbacks,
} from "./PwaUpdateContext";

const native = vi.hoisted(() => ({ enabled: false }));
vi.mock("@/native/runtime", () => ({ isNativeApp: () => native.enabled }));

function createRegistration() {
  let callbacks: PwaRegistrationCallbacks | undefined;
  const activate = vi.fn();
  const adapter: PwaRegistrationAdapter = {
    register(nextCallbacks) {
      callbacks = nextCallbacks;
      return activate;
    },
  };

  return {
    activate,
    adapter,
    updateAvailable() {
      callbacks?.onNeedRefresh();
    },
    offlineReady() {
      callbacks?.onOfflineReady();
    },
  };
}

function StatusProbe() {
  const { status } = usePwaUpdate();
  return <output>{status}</output>;
}

function Harness({
  activityLocked,
  registration,
  showStatus = false,
}: {
  activityLocked: boolean;
  registration: PwaRegistrationAdapter;
  showStatus?: boolean;
}) {
  const activityLock: MobileActivityLockValue = {
    locked: activityLocked,
    lock: () => undefined,
    unlock: () => undefined,
  };

  return (
    <MobileActivityLockContext.Provider value={activityLock}>
      <PwaUpdateProvider registration={registration}>
        <PwaUpdatePrompt />
        {showStatus ? <PwaUpdateStatusSurface /> : null}
      </PwaUpdateProvider>
    </MobileActivityLockContext.Provider>
  );
}

describe("PwaUpdateProvider", () => {
  afterEach(() => { cleanup(); native.enabled = false; });

  it("does not register a service worker inside the native app", () => {
    native.enabled = true;
    const register = vi.fn();
    render(<Harness activityLocked={false} registration={{ register }} showStatus />);
    expect(register).not.toHaveBeenCalled();
    expect(screen.getByText("通过 Xcode 安装新版本")).toBeVisible();
    expect(screen.queryByText("当前已是最新版本")).not.toBeInTheDocument();
  });

  it("defers a ready update while activity is locked and still waits for a click after unlock", async () => {
    const user = userEvent.setup();
    const registration = createRegistration();
    const view = render(
      <Harness activityLocked registration={registration.adapter} />,
    );

    act(() => registration.updateAvailable());

    expect(screen.getByText("新版本已准备好")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "立即更新" })).toBeDisabled();
    expect(screen.getByText("学习活动进行中，完成后可更新")).toBeInTheDocument();
    expect(registration.activate).not.toHaveBeenCalled();

    view.rerender(
      <Harness activityLocked={false} registration={registration.adapter} />,
    );

    expect(screen.getByRole("button", { name: "立即更新" })).toBeEnabled();
    expect(registration.activate).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "立即更新" }));

    expect(registration.activate).toHaveBeenCalledOnce();
    expect(registration.activate).toHaveBeenCalledWith(true);
  });

  it("fails loudly when the shell prompt is rendered without its provider", () => {
    expect(() => renderToString(<PwaUpdatePrompt />)).toThrow(
      "usePwaUpdate must be used inside PwaUpdateProvider",
    );
  });

  it("dismisses only the shell prompt while the application page keeps the ready update", async () => {
    const user = userEvent.setup();
    const registration = createRegistration();
    render(
      <Harness
        activityLocked={false}
        registration={registration.adapter}
        showStatus
      />,
    );

    act(() => registration.updateAvailable());
    const prompt = screen.getByRole("status");
    await user.click(within(prompt).getByRole("button", { name: "稍后" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    const applicationSurface = screen
      .getByRole("heading", { name: "应用更新" })
      .closest("section")!;
    expect(within(applicationSurface).getByText("新版本已准备好")).toBeVisible();
    await user.click(
      within(applicationSurface).getByRole("button", { name: "立即更新" }),
    );
    expect(registration.activate).toHaveBeenCalledOnce();
    expect(registration.activate).toHaveBeenCalledWith(true);
  });

  it("shows the shell prompt again for the next refresh-ready event", async () => {
    const user = userEvent.setup();
    const registration = createRegistration();
    render(<Harness activityLocked={false} registration={registration.adapter} />);

    act(() => registration.updateAvailable());
    await user.click(
      within(screen.getByRole("status")).getByRole("button", { name: "稍后" }),
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => registration.updateAvailable());
    expect(screen.getByRole("status")).toBeVisible();
    expect(registration.activate).not.toHaveBeenCalled();
  });

  it("reports when the application becomes available offline", () => {
    const registration = createRegistration();
    render(
      <MobileActivityLockContext.Provider
        value={{ locked: false, lock: () => undefined, unlock: () => undefined }}
      >
        <PwaUpdateProvider registration={registration.adapter}>
          <StatusProbe />
        </PwaUpdateProvider>
      </MobileActivityLockContext.Provider>,
    );

    act(() => registration.offlineReady());

    expect(screen.getByText("offline-ready")).toBeInTheDocument();
    expect(registration.activate).not.toHaveBeenCalled();
  });

  it("exposes the current install status on the application page", () => {
    const registration = createRegistration();
    render(
      <MobileActivityLockContext.Provider
        value={{ locked: false, lock: () => undefined, unlock: () => undefined }}
      >
        <PwaUpdateProvider registration={registration.adapter}>
          <PwaUpdateStatusSurface />
        </PwaUpdateProvider>
      </MobileActivityLockContext.Provider>,
    );

    expect(screen.getByRole("heading", { name: "应用更新" })).toBeInTheDocument();
    expect(screen.getByText("当前已是最新版本")).toBeInTheDocument();

    act(() => registration.offlineReady());

    expect(screen.getByText("应用已可离线使用")).toBeInTheDocument();
  });
});
