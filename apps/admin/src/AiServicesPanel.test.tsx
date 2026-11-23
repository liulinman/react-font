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
it("saves DeepSeek limits independently and preserves Doubao configuration", async () => {
  const flat={requestsPerMinute:10,requestsPerDay:100,charactersPerDay:300000,globalConcurrency:4,providerConcurrency:4,userConcurrency:2,maxAudioAttempts:3,maxSceneAttempts:3};
  let current={...data,limits:flat,limitsSource:"inherited",providerLimits:{deepseek:{requestsPerMinute:10,requestsPerDay:100,charactersPerDay:300000,providerConcurrency:4,userConcurrency:2,maxSceneAttempts:3},doubao:{requestsPerMinute:10,requestsPerDay:100,charactersPerDay:300000,providerConcurrency:4,userConcurrency:2,maxAudioAttempts:3}}};
  vi.mocked(aiFetch).mockImplementation(async(path,method,body)=>{if(path==='/limits/deepseek'&&method==='PUT')current={...current,limitsSource:'saved',providerLimits:{...current.providerLimits,deepseek:body as typeof current.providerLimits.deepseek}};return current;});
  vi.mocked(secureKeyEntry).mockReturnValue(true);render(<AiServicesPanel/>);
  const field=await screen.findByRole('spinbutton',{name:'DeepSeek 每用户每服务每日字符'});
  await userEvent.clear(field);await userEvent.type(field,'0');
  await userEvent.click(screen.getByRole('button',{name:'保存DeepSeek限制'}));
  await waitFor(()=>expect(aiFetch).toHaveBeenCalledWith('/limits/deepseek','PUT',expect.objectContaining({charactersPerDay:0})));
  expect((screen.getByRole('spinbutton',{name:'豆包语音 每用户每服务每日字符'}) as HTMLInputElement).value).toBe('300000');
  const payload=vi.mocked(aiFetch).mock.calls.find(([path])=>path==='/limits/deepseek')?.[2];
  expect(payload).not.toHaveProperty('maxAudioAttempts');expect(payload).not.toHaveProperty('globalConcurrency');
});
it('saves both Tencent credentials without displaying saved secret values', async () => {
  vi.mocked(aiFetch).mockResolvedValue(data);
  render(<AiServicesPanel />);
  const id=await screen.findByLabelText('腾讯 SecretId');
  const key=screen.getByLabelText('腾讯 SecretKey');
  await userEvent.type(id,'example-id');
  await userEvent.type(key,'example-key');
  await userEvent.click(screen.getByRole('button',{name:'保存腾讯密钥'}));
  await waitFor(() => expect(aiFetch).toHaveBeenCalledWith('/tencent','PUT',{enabled:false,apiKey:JSON.stringify({secretId:'example-id',secretKey:'example-key'})}));
  await waitFor(() => expect((id as HTMLInputElement).value).toBe(''));
  expect((key as HTMLInputElement).value).toBe('');
});
