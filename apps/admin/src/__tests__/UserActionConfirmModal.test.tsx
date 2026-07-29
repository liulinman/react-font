import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UserActionConfirmModal } from "../UserActionConfirmModal";
import type { AdminUserItem } from "../api/notification.type";

const alice: AdminUserItem = { id: 7, username: "alice", status: "active" };
const bob: AdminUserItem = { id: 8, username: "bob", status: "active" };

function renderModal(overrides?: Partial<React.ComponentProps<typeof UserActionConfirmModal>>) {
  const props = {
    open: true,
    action: "ban" as const,
    user: alice,
    loading: false,
    onCancel: vi.fn(),
    onConfirm: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return render(<UserActionConfirmModal {...props} />);
}

describe("UserActionConfirmModal", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const enterSecondStep = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: "继续确认" }));
    return screen.getByLabelText("输入用户名以确认");
  };

  it("resets to the first step when reopened with the same user", async () => {
    const user = userEvent.setup();
    const { rerender } = renderModal();

    await enterSecondStep(user);
    await user.type(screen.getByLabelText("输入用户名以确认"), "alice");

    rerender(<UserActionConfirmModal open={false} action="ban" user={alice} loading={false} onCancel={vi.fn()} onConfirm={vi.fn().mockResolvedValue(undefined)} />);
    rerender(<UserActionConfirmModal open action="ban" user={alice} loading={false} onCancel={vi.fn()} onConfirm={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByRole("button", { name: "继续确认" })).toBeInTheDocument();
    expect(screen.queryByLabelText("输入用户名以确认")).not.toBeInTheDocument();
  });

  it("resets confirmation state when the target user changes", async () => {
    const user = userEvent.setup();
    const { rerender } = renderModal();

    await enterSecondStep(user);
    await user.type(screen.getByLabelText("输入用户名以确认"), "alice");

    rerender(<UserActionConfirmModal open action="ban" user={bob} loading={false} onCancel={vi.fn()} onConfirm={vi.fn().mockResolvedValue(undefined)} />);

    expect(screen.getByRole("button", { name: "继续确认" })).toBeInTheDocument();
    expect(screen.queryByLabelText("输入用户名以确认")).not.toBeInTheDocument();
  });

  it("focuses the described username input after entering the second step", async () => {
    const user = userEvent.setup();
    renderModal();

    const input = await enterSecondStep(user);
    const description = document.getElementById(input.getAttribute("aria-describedby") ?? "");

    await waitFor(() => expect(input).toHaveFocus());
    expect(description).toHaveTextContent("请输入用户名 alice 以继续封禁。");
  });

  it("keeps the final action disabled for wrong-case and padded usernames", async () => {
    const user = userEvent.setup();
    renderModal();

    const input = await enterSecondStep(user);
    const finalButton = screen.getByRole("button", { name: "确认封禁" });

    await user.type(input, "Alice");
    expect(finalButton).toBeDisabled();
    await user.clear(input);
    await user.type(input, " alice ");
    expect(finalButton).toBeDisabled();
  });
});
