import { useEffect, useRef, useState } from "react";
import { Alert, Button, Input, Space, Table, Tag } from "antd";
import { getApiBaseUrl } from "@font/api";
type Material = {
  id: string;
  title: string;
  source: string;
  status: string;
  visibility: string;
  completedParts: number;
  requestedParts: number[];
  error?: string;
};
async function api<T>(path: string, body?: unknown): Promise<T> {
  const r = await fetch(`${getApiBaseUrl()}/admin/ielts-listening${path}`, {
    credentials: "include",
    method: body === undefined ? "GET" : "POST",
    headers:
      body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json();
  if (!r.ok || d.code !== 200) throw new Error(d.message || "请求失败，请重试");
  return d.data;
}
export function IeltsListeningPanel() {
  const importRequest = useRef<string | null>(null);
  const [items, setItems] = useState<Material[]>([]),
    [input, setInput] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [revisionOf, setRevisionOf] = useState<string | null>(null);
  const refresh = async () => setItems(await api<Material[]>("/materials"));
  useEffect(() => {
    void api<Material[]>("/materials").then(items=>setItems(items)).catch(e=>setError(e.message));
  }, []);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "操作失败");
      await refresh().catch(() => {});
    } finally {
      setBusy(false);
    }
  };
  const prepare = async (m: Material) => {
    let current = m;
    const retryUid = m.status === "failed" ? crypto.randomUUID() : undefined;
    while (current.status !== "ready")
      current = await api<Material>(`/materials/${m.id}/prepare`, { retryUid });
  };
  return (
    <section>
      <h2>雅思听力材料</h2>
      <p>
        个人生成材料不会自动公开。管理员可复核后发布或停用；历史作答保留原版本。
      </p>
      {error && <Alert type="error" showIcon message={error} />}
      <Space style={{ marginBottom: 16 }}>
        <Button loading={busy} onClick={() => run(refresh)}>
          刷新材料
        </Button>
      </Space>
      <Table
        rowKey="id"
        dataSource={items}
        pagination={{ pageSize: 8 }}
        columns={[
          {
            title: "材料",
            dataIndex: "title",
            render: (v: string, m: Material) => (
              <>
                <strong>{v}</strong>
                <p>
                  {m.source} · {m.completedParts}/{m.requestedParts.length} 部分
                </p>
                {m.error && <p>{m.error}</p>}
              </>
            ),
          },
          {
            title: "状态",
            render: (_: unknown, m: Material) => (
              <Tag>
                {m.status === "ready"
                  ? m.visibility === "public"
                    ? "已发布"
                    : "待发布"
                  : m.status}
              </Tag>
            ),
          },
          {
            title: "操作",
            render: (_: unknown, m: Material) => (
              <Space>
                {m.status === "ready" && m.visibility === "public" && (
                  <Button disabled={busy} onClick={() => run(async () => {
                    const source = await api<{ title: string; sections: unknown[] }>(`/materials/${m.id}/edit`);
                    setInput(JSON.stringify(source, null, 2));
                    setRevisionOf(m.id);
                    importRequest.current = null;
                  })}>创建修订</Button>
                )}
                {m.status !== "ready" ? (
                  <Button disabled={busy} onClick={() => run(() => prepare(m))}>
                    准备并配音
                  </Button>
                ) : (
                  <Button
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        api(`/materials/${m.id}/publish`, {
                          published: m.visibility !== "public",
                        }),
                      )
                    }
                  >
                    {m.visibility === "public" ? "停用" : "发布"}
                  </Button>
                )}
              </Space>
            ),
          },
        ]}
      />
      <h3>{revisionOf ? "修订已发布材料" : "导入原创材料"}</h3>
      {revisionOf && <p role="status">保存将创建新版本草稿，不覆盖原材料或历史作答。新版本仍需准备并配音、复核发布。</p>}
      {revisionOf && <Button disabled={busy} onClick={() => {
        setRevisionOf(null); setInput(""); setError(""); importRequest.current = null;
      }}>取消修订</Button>}
      <p>
        粘贴包含 title、sections 的材料包。每部分10个题位；需要
        transcript、题干、评分键和答案证据，地图题另需结构化图示。启用腾讯语音后，Part 1 和 Part 3 的导入材料需提供与原文一致的双人 turns 才使用腾讯配音；缺少双人台词时沿用豆包。合成会消耗用量。仅导入有权使用的原创内容。
      </p>
      <label htmlFor="ielts-import-json">材料包 JSON</label>
      <Input.TextArea
        id="ielts-import-json"
        rows={9}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          importRequest.current = null;
        }}
        maxLength={100000}
      />
      <Button
        type="primary"
        style={{ marginTop: 12 }}
        loading={busy}
        disabled={!input.trim()}
        onClick={() =>
          run(async () => {
            let parsed: unknown;
            try {
              parsed = JSON.parse(input);
            } catch {
              throw new Error("JSON 格式无效，请检查后重试");
            }
            importRequest.current ||= crypto.randomUUID();
            await api(revisionOf ? `/materials/${revisionOf}/revisions` : "/materials", {
              ...(parsed as object),
              requestId: importRequest.current,
            });
            importRequest.current = null;
            setInput("");
            setRevisionOf(null);
          })
        }
      >
        {revisionOf ? "校验并创建新版本" : "校验并导入"}
      </Button>
    </section>
  );
}
