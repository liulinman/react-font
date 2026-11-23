import { StrictMode } from "react";
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ReadingPracticeRecipients } from "../ReadingPracticeRecipients";
const send = vi.hoisted(() => vi.fn());
vi.mock("@font/api", () => ({ default: send }));
const paper: any = {
  id: 7,
  title: "Published reading",
  status: "published",
  workflow: { version: 2 },
};
const existing = {
  assignmentId: 1,
  userId: 1,
  username: "Alice",
  status: "active",
  submitted: true,
};
beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: () => ({
      matches: false,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
    }),
  });
  send.mockImplementation(async (r: any) =>
    r.url.endsWith("/recipients")
      ? { list: [existing], total: 1 }
      : {
          list: [
            { id: 1, username: "Alice" },
            { id: 2, username: "Bob" },
            { id: 3, username: "Carol" },
          ],
          total: 3,
        },
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
async function selectBob() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox"));
  await user.click(await screen.findByText("Bob", { selector: ".ant-select-item-option-content span" }));
  await user.keyboard("{Escape}");
  return user;
}
it("shows actual recipients and prevents selecting existing users", async () => {
  render(
    <ReadingPracticeRecipients
      paper={paper}
      onClose={vi.fn()}
      onAssigned={vi.fn()}
    />,
  );
  expect(await screen.findByText("已提交")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "确认追加 0 人" })).toBeDisabled();
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox"));
  const alice = await screen.findByText("已接收");
  expect(alice.closest(".ant-select-item-option")).toHaveClass(
    "ant-select-item-option-disabled",
  );
  await user.click(alice);
  expect(screen.getByRole("button", { name: "确认追加 0 人" })).toBeDisabled();
});
it("preserves the request UID after ambiguous failure and distinguishes successful assignment from failed refresh", async () => {
  const assigned = vi.fn();
  let reads = 0,
    posts = 0;
  const uids: string[] = [];
  send.mockImplementation(async (r: any) => {
    if (r.url.endsWith("/recipients")) {
      if (++reads > 1) throw new Error("refresh offline");
      return { list: [existing], total: 1 };
    }
    if (r.url.endsWith("/assign")) {
      uids.push(r.data.requestUid);
      if (++posts === 1) throw { code: "NETWORK_ERROR" };
      return { ...paper, assignmentResult: { addedCount: 1, skippedCount: 0 } };
    }
    return { list: [{ id: 2, username: "Bob" }], total: 1 };
  });
  render(
    <ReadingPracticeRecipients
      paper={paper}
      onClose={vi.fn()}
      onAssigned={assigned}
    />,
  );
  await screen.findByText("已提交");
  const user = await selectBob();
  await user.click(screen.getByRole("button", { name: "确认追加 1 人" }));
  await screen.findByText(/追加未确认/);
  await user.click(
    await screen.findByRole("button", { name: "确认追加 1 人" }),
  );
  await screen.findByText("追加已成功，但名单刷新失败，请重试刷新。");
  expect(uids).toHaveLength(2);
  expect(uids[0]).toBe(uids[1]);
  expect(assigned).toHaveBeenCalledTimes(1);
  expect(screen.getByRole("button", { name: "确认追加 0 人" })).toBeDisabled();
});
it("blocks submitting and closing during the pending request", async () => {
  let finish: (v: any) => void = () => {};
  const close = vi.fn();
  const original = send.getMockImplementation()!;
  send.mockImplementation((r: any) =>
    r.url.endsWith("/assign")
      ? new Promise((resolve) => {
          finish = resolve;
        })
      : original(r),
  );
  render(
    <ReadingPracticeRecipients
      paper={paper}
      onClose={close}
      onAssigned={vi.fn()}
    />,
  );
  await screen.findByText("已提交");
  const user = await selectBob();
  await user.dblClick(screen.getByRole("button", { name: "确认追加 1 人" }));
  expect(
    send.mock.calls.filter(([r]) => r.url.endsWith("/assign")),
  ).toHaveLength(1);
  expect(screen.getByRole("button", { name: /关\s*闭/ })).toBeDisabled();
  expect(screen.getByRole("combobox")).toBeDisabled();
  finish({ ...paper, assignmentResult: { addedCount: 1, skippedCount: 0 } });
  await waitFor(() =>
    expect(screen.getByRole("button", { name: /关\s*闭/ })).toBeEnabled(),
  );
  expect(close).not.toHaveBeenCalled();
});
it("keeps submission disabled until the failed recipient list is retried", async () => {
  let reads = 0;
  const original = send.getMockImplementation()!;
  send.mockImplementation((r: any) =>
    r.url.endsWith("/recipients") && ++reads === 1
      ? Promise.reject(new Error("offline"))
      : original(r),
  );
  render(
    <ReadingPracticeRecipients
      paper={paper}
      onClose={vi.fn()}
      onAssigned={vi.fn()}
    />,
  );
  await screen.findByText("接收名单加载失败，请重试。");
  expect(screen.getByRole("combobox")).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "重试刷新" }));
  await screen.findByText("已提交");
  expect(screen.getByRole("combobox")).toBeEnabled();
});
it("retains selected users across searches and reports concurrent skips", async () => {
  let payload: any;
  send.mockImplementation(async (r: any) => {
    if (r.url.endsWith("/recipients")) return { list: [existing], total: 1 };
    if (r.url.endsWith("/assign")) {
      payload = r.data;
      return { ...paper, assignmentResult: { addedCount: 1, skippedCount: 1 } };
    }
    return { list: r.data?.search === "Carol" ? [{ id: 3, username: "Carol" }] : [{ id: 2, username: "Bob" }], total: 1 };
  });
  render(<ReadingPracticeRecipients paper={paper} onClose={vi.fn()} onAssigned={vi.fn()} />);
  await screen.findByText("已提交");
  const user = await selectBob();
  await user.type(screen.getByRole("combobox"), "Carol");
  await user.click(await screen.findByText("Carol", { selector: ".ant-select-item-option-content span" }));
  await user.keyboard("{Escape}");
  expect(screen.getAllByText("Bob").some(node => node.closest(".ant-select-selection-item"))).toBe(true);
  await user.click(screen.getByRole("button", { name: "确认追加 2 人" }));
  await screen.findByText("已追加 1 人，跳过已接收 1 人。通知将由系统投递。");
  expect(payload.userIds).toEqual([2, 3]);
});
it("ignores an older recipient response after StrictMode starts a newer load", async () => {
  const pending: ((value: any) => void)[] = [];
  send.mockImplementation((r: any) => r.url.endsWith("/recipients")
    ? new Promise(resolve => pending.push(resolve))
    : Promise.resolve({ list: [], total: 0 }));
  render(<StrictMode><ReadingPracticeRecipients paper={paper} onClose={vi.fn()} onAssigned={vi.fn()} /></StrictMode>);
  await waitFor(() => expect(pending).toHaveLength(2));
  await act(async () => pending[1]({ list: [{ ...existing, userId: 2, username: "Newest recipient" }], total: 1 }));
  expect(await screen.findByText("Newest recipient (#2)")).toBeInTheDocument();
  await act(async () => pending[0]({ list: [existing], total: 1 }));
  expect(screen.getByText("Newest recipient (#2)")).toBeInTheDocument();
  expect(screen.queryByText("Alice (#1)")).not.toBeInTheDocument();
  expect(screen.getByRole("combobox")).toBeEnabled();
});
it("removes newly received selections when refreshing the current recipients", async () => {
  let reads = 0;
  send.mockImplementation(async (r: any) => r.url.endsWith("/recipients")
    ? { list: ++reads === 1 ? [existing] : [existing, { ...existing, userId: 2, username: "Bob" }], total: reads === 1 ? 1 : 2 }
    : { list: [{ id: 2, username: "Bob" }], total: 1 });
  render(<ReadingPracticeRecipients paper={paper} onClose={vi.fn()} onAssigned={vi.fn()} />);
  await screen.findByText("已提交");
  const user = await selectBob();
  expect(screen.getByRole("button", { name: "确认追加 1 人" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "刷新接收名单" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "确认追加 0 人" })).toBeDisabled());
  expect(send.mock.calls.filter(([r]) => r.url.endsWith("/assign"))).toHaveLength(0);
});
it("shows the API wrapper's flat server rejection while preserving selection", async () => {
  const original = send.getMockImplementation()!;
  send.mockImplementation((r: any) => r.url.endsWith("/assign")
    ? Promise.reject({ message: "仅已发布练习可以补发", statusCode: 409 })
    : original(r));
  render(<ReadingPracticeRecipients paper={paper} onClose={vi.fn()} onAssigned={vi.fn()} />);
  await screen.findByText("已提交");
  const user = await selectBob();
  await user.click(screen.getByRole("button", { name: "确认追加 1 人" }));
  expect(await screen.findByText("仅已发布练习可以补发")).toBeInTheDocument();
  expect(screen.queryByText(/追加未确认/)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "确认追加 1 人" })).toBeInTheDocument();
});
