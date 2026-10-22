import { useEffect, useState } from "react";
import { Alert, Button, Input, Select, Switch, Space, Tag } from "antd";
import {
  aiFetch,
  secureKeyEntry,
  testAudio,
  type AiConfig,
  type AiUsage,
  type Provider,
} from "./api/aiServices";
export function AiServicesPanel() {
  const [configs, setConfigs] = useState<AiConfig[]>([]);
  const [usage, setUsage] = useState<AiUsage[]>([]);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [secondUrl, setSecondUrl] = useState("");
  useEffect(
    () => () => {
      if (secondUrl) URL.revokeObjectURL(secondUrl);
    },
    [secondUrl],
  );
  const [keys, setKeys] = useState<Partial<Record<Provider, string>>>({});
  const secure = secureKeyEntry();
  const load = async () => {
    const data = await aiFetch<{
      deepseek: AiConfig;
      doubao: AiConfig;
      usage: AiUsage[];
      limits?: Record<string, number>;
    }>("");
    setConfigs([data.deepseek, data.doubao]);
    setUsage(data.usage);
    setLimits(data.limits || {});
  };
  useEffect(() => {
    void load().catch((e) => setError(e.message));
    return () => setKeys({});
  }, []);
  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
    } finally {
      setBusy(false);
    }
  };
  const change = (provider: Provider, field: keyof AiConfig, value: unknown) =>
    setConfigs((list) =>
      list.map((c) => (c.provider === provider ? { ...c, [field]: value } : c)),
    );
  return (
    <div className="admin-panel">
      <h2>AI 服务管理</h2>
      <p>DeepSeek 校验词条与生成场景，豆包生成单词和场景音频。</p>
      {!secure && (
        <Alert
          type="warning"
          message="当前为不安全地址，禁止输入密钥。请使用 HTTPS，或 SSH 隧道连接 localhost 管理入口。"
        />
      )}
      {error && <Alert type="error" message={error} />}
      {notice && <Alert type="success" message={notice} />}
      <Button disabled={busy} onClick={() => void run(load)}>
        刷新配置与用量
      </Button>
      {configs.map((c) => (
        <section
          key={c.provider}
          style={{ padding: "24px 0", borderBottom: "1px solid #eee" }}
        >
          <h3>
            {c.provider === "deepseek" ? "DeepSeek" : "豆包语音"}{" "}
            <Tag>
              {{
                unconfigured: "未配置",
                disabled: "已禁用",
                untested: "待测试",
                ready: "可用",
                failed: "测试失败",
              }[c.status] || c.status}
            </Tag>
          </h3>
          <label>
            启用{" "}
            <Switch
              checked={c.enabled}
              onChange={(v) => change(c.provider, "enabled", v)}
            />
          </label>
          <p>密钥：{c.configured ? c.keyMask : "未配置"}</p>
          <Input.Password
            aria-label={`${c.provider} API Key`}
            autoComplete="new-password"
            disabled={!secure || busy}
            placeholder="留空保持已有密钥"
            value={keys[c.provider] || ""}
            onChange={(e) =>
              setKeys((k) => ({ ...k, [c.provider]: e.target.value }))
            }
          />
          {(c.provider === "deepseek"
            ? ["baseUrl", "model"]
            : ["resourceId", "speaker", "secondSpeaker"]
          ).map((field) => (
            <label key={field} style={{ display: "block", margin: "12px 0" }}>
              {
                (
                  {
                    baseUrl: "接口地址",
                    model: "模型",
                    resourceId: "资源 ID",
                    speaker: "主音色 ID",
                    secondSpeaker: "第二音色 ID（可选）",
                  } as Record<string, string>
                )[field]
              }
              {field === "speaker" || field === "secondSpeaker" ? (
                <Select
                  aria-label={field === "speaker" ? "主音色" : "第二音色"}
                  style={{ width: "100%" }}
                  value={String(c[field as keyof AiConfig] || "")}
                  options={[
                    { value: "", label: "不设置（第二音色沿用主音色）" },
                    {
                      value: "en_female_zendaya_p1_uranus_bigtts",
                      label: "Zendaya · 英文女声",
                    },
                    {
                      value: "ICL_uranus_en_male_michael_tob",
                      label: "Michael 2.0 · 英文男声",
                    },
                  ]}
                  onChange={(value) =>
                    change(c.provider, field as keyof AiConfig, value)
                  }
                />
              ) : (
                <Input
                  value={String(c[field as keyof AiConfig] || "")}
                  onChange={(e) =>
                    change(c.provider, field as keyof AiConfig, e.target.value)
                  }
                />
              )}
            </label>
          ))}
          {c.provider === "doubao" && (
            <p>
              请输入账号已授权的官方音色 ID，展示名称不能直接用作
              ID。第二音色留空时对话使用同一声音。
            </p>
          )}
          <Space wrap>
            <Button
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (keys[c.provider] && !secure)
                    throw new Error("请从安全地址保存密钥");
                  await aiFetch(`/${c.provider}`, "PUT", {
                    enabled: c.enabled,
                    baseUrl: c.baseUrl,
                    model: c.model,
                    resourceId: c.resourceId,
                    speaker: c.speaker,
                    secondSpeaker: c.secondSpeaker,
                    ...(keys[c.provider] ? { apiKey: keys[c.provider] } : {}),
                  });
                  setKeys((k) => ({ ...k, [c.provider]: "" }));
                  await load();
                })
              }
            >
              保存配置
            </Button>
            <Button
              disabled={busy || !c.configured}
              onClick={() => {
                if (
                  confirm(
                    "清除后无法生成新内容，已有缓存仍可播放。确定清除密钥？",
                  )
                )
                  void run(async () => {
                    await aiFetch(`/${c.provider}/key`, "DELETE");
                    setKeys((k) => ({ ...k, [c.provider]: "" }));
                    await load();
                  });
              }}
            >
              清除密钥
            </Button>
            <Button
              disabled={busy || !c.configured}
              onClick={() =>
                void run(async () => {
                  const r = await aiFetch<{
                    ok: boolean;
                    message: string;
                    audioId?: string;
                    secondAudioId?: string;
                  }>(`/${c.provider}/test`, "POST");
                  if (r.ok) setNotice(r.message); else setError(r.message);
                  if (r.audioId)
                    setUrl(URL.createObjectURL(await testAudio(r.audioId)));
                  if (r.secondAudioId)
                    setSecondUrl(
                      URL.createObjectURL(await testAudio(r.secondAudioId)),
                    );
                  else setSecondUrl("");
                  await load();
                })
              }
            >
              测试连接 / 生成试听（消耗用量）
            </Button>
            {c.provider === "deepseek" && (
              <Button
                disabled={busy || !secure}
                onClick={() =>
                  void run(async () => {
                    await aiFetch("/deepseek/import-environment", "POST");
                    await load();
                  })
                }
              >
                导入服务器已有 DeepSeek 密钥
              </Button>
            )}
          </Space>
          <p>
            {c.testedAt} {c.testMessage}
          </p>
        </section>
      ))}
      {url && (
        <div>
          主音色试听
          <audio aria-label="主音色试听" controls src={url} />
        </div>
      )}
      {secondUrl && (
        <div>
          第二音色试听
          <audio aria-label="第二音色试听" controls src={secondUrl} />
        </div>
      )}
      <h3>今日用量</h3>
      {usage.map((u) => (
        <p key={u.provider}>
          {u.provider}：{u.requests} 次请求 · {u.characters} 字符 ·{" "}
          {u.tokens || 0} tokens · {u.cacheHits} 次缓存 · {u.failures} 次失败
        </p>
      ))}
      {limits.requestsPerDay && <p>后端限额：每用户每分钟 {limits.requestsPerMinute} 次；每服务每日 {limits.requestsPerDay} 次、{limits.charactersPerDay} 字符；全局并发 {limits.globalConcurrency}，每用户并发 {limits.userConcurrency}。音频最多尝试 {limits.maxAudioAttempts} 次。用量为本地记录，以供应商账单为准。</p>}
    </div>
  );
}
