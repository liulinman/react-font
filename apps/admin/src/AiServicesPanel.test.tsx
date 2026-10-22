import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
vi.mock("./api/aiServices", () => ({
  aiFetch: vi.fn(),
  secureKeyEntry: vi.fn().mockReturnValue(true),
  testAudio: vi.fn(),
}));
import { aiFetch, secureKeyEntry } from "./api/aiServices";
import { AiServicesPanel } from "./AiServicesPanel";
const data = {
  deepseek: {
    provider: "deepseek",
    enabled: true,
    configured: true,
    keyMask: "***mask",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-flash",
    status: "ready",
  },
  doubao: {
    provider: "doubao",
    enabled: true,
    configured: true,
    keyMask: "***voice",
    resourceId: "seed-tts-2.0",
    speaker: "en_female_zendaya_p1_uranus_bigtts",
    secondSpeaker: "",
    status: "ready",
  },
  usage: [],
};
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("never fills password with mask; saving blank keeps existing secret", async () => {
  vi.mocked(aiFetch).mockResolvedValue(data);
  render(<AiServicesPanel />);
  const input = (await screen.findByLabelText(
    "deepseek API Key",
  )) as HTMLInputElement;
  expect(input.value).toBe("");
  await userEvent.click(screen.getAllByRole("button", { name: "保存配置" })[0]);
  await waitFor(() =>
    expect(aiFetch).toHaveBeenCalledWith(
      "/deepseek",
      "PUT",
      expect.objectContaining({ enabled: true }),
    ),
  );
  const call = vi
    .mocked(aiFetch)
    .mock.calls.find(([, method]) => method === "PUT");
  expect(call?.[2]).not.toHaveProperty("apiKey");
});
it("clears password after saving and never returns it on refresh", async () => {
  vi.mocked(aiFetch).mockResolvedValue(data);
  vi.mocked(secureKeyEntry).mockReturnValue(true);
  render(<AiServicesPanel />);
  const input = (await screen.findByLabelText(
    "deepseek API Key",
  )) as HTMLInputElement;
  await userEvent.type(input, "test-only-not-real");
  await userEvent.click(screen.getAllByRole("button", { name: "保存配置" })[0]);
  await waitFor(() => expect(input.value).toBe(""));
  expect(aiFetch).toHaveBeenCalledWith(
    "/deepseek",
    "PUT",
    expect.objectContaining({ apiKey: "test-only-not-real" }),
  );
});
it("blocks secret entry on public HTTP", async () => {
  vi.mocked(aiFetch).mockResolvedValue(data);
  vi.mocked(secureKeyEntry).mockReturnValue(false);
  render(<AiServicesPanel />);
  expect(
    ((await screen.findByLabelText("deepseek API Key")) as HTMLInputElement)
      .disabled,
  ).toBe(true);
  expect(screen.getByText(/当前为不安全地址/)).toBeTruthy();
});
it("loads separate audio controls for both tested voices", async () => {
  vi.mocked(secureKeyEntry).mockReturnValue(true);
  vi.mocked(aiFetch).mockImplementation(async (path) =>
    path.endsWith("/test")
      ? { ok: true, message: "两声可用", audioId: "one", secondAudioId: "two" }
      : data,
  );
  const { testAudio } = await import("./api/aiServices");
  vi.mocked(testAudio).mockResolvedValue(new Blob(["sound"]));
  const create = vi
    .fn()
    .mockReturnValueOnce("blob:one")
    .mockReturnValueOnce("blob:two");
  vi.stubGlobal(
    "URL",
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: vi.fn() }),
  );
  render(<AiServicesPanel />);
  await screen.findByLabelText("doubao API Key");
  await userEvent.click(screen.getAllByRole("button", { name: /测试连接/ })[1]);
  await waitFor(() => expect(testAudio).toHaveBeenCalledWith("two"));
  expect(screen.getByLabelText("主音色试听")).toBeTruthy();
  expect(screen.getByLabelText("第二音色试听")).toBeTruthy();
  vi.unstubAllGlobals();
});
