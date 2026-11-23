import { useEffect, useState } from "react";
import { Alert, Button, Tag } from "antd";
import { getApiBaseUrl } from "@font/api";

type Case = {
  id: string;
  title: string;
  status: string;
  requirementIds: string[];
  steps: string[];
  expectedResults: string[];
  bindings: { suite: string; title: string }[];
};
type Run = {
  overallStatus?: string;
  executionIssues?: string[];
  cases?: Case[];
  id: string;
  createdAt: string;
  status: string;
  freshness: string;
  prdSha256: string | null;
  specVersion: string;
  rerunOf: string | null;
  codeVersions: { repository: string; commit: string; dirty: boolean }[];
  cloudUrls: string[];
  rows: {
    id: string;
    text: string;
    status: string;
    reason: string;
    caseIds: string[];
  }[];
  tests: {
    suite: string;
    title: string;
    state: string;
    evidence: string;
    error: string;
  }[];
  analysis: { category: string; conclusion: string; nextStep: string }[];
  images: { name: string; path: string }[];
};
type Feature = {
  id: string;
  moduleId: string;
  title: string;
  prd: { path: string; route: string; sha256: string };
  specs: {
    path: string;
    sha256: string;
    content: string;
    stale: boolean;
    links: {
      requirement: string;
      scenario: string;
      manualRequired: boolean;
      caseIds: string[];
    }[];
  }[];
  cases: Case[];
  runs: Run[];
};
type Pipeline = {
  schemaVersion: number;
  modules: { id: string; name: string }[];
  features: Feature[];
};
const labels: Record<string, string> = {
  passed: "通过",
  failed: "失败",
  pending: "未执行 / 待验证",
  blocked: "环境阻塞",
  skipped: "跳过",
  missing: "归档缺失",
  incomplete: "验收不完整",
  ready: "已绑定",
  draft: "候选 / 未覆盖",
  unknown: "未知",
  partial: "部分覆盖",
  uncovered: "未覆盖",
  not_run: "未执行",
  mock: "模拟数据",
  real: "真实环境",
  mixed: "混合证据",
};
function Status({ value }: { value: string }) {
  return (
    <Tag
      color={
        value === "passed" ? "green" : value === "failed" ? "red" : undefined
      }
    >
      {labels[value] || value || "未知"}
    </Tag>
  );
}
const stages = [
  ["prd", "PRD 需求"],
  ["spec", "Spec 正文"],
  ["cases", "测试用例"],
  ["results", "测试结果"],
] as const;
const validCloud = (url: string) => {
  try {
    const u = new URL(url);
    return (
      u.protocol === "https:" &&
      u.hostname === "cloud.cypress.io" &&
      !u.username &&
      !u.password
    );
  } catch {
    return false;
  }
};
export function DeliveryPipelinePanel() {
  const [data, setData] = useState<Pipeline | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0);
  const [module, setModule] = useState(""),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState(""),
    [stage, setStage] = useState("prd"),
    [runId, setRunId] = useState("");
  const base = getApiBaseUrl().replace(/\/$/, "") + "/admin/prd/";
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setData(null);
    fetch(base + "pipeline.json", {
      credentials: "include",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (response.status === 401)
          throw new Error("管理员登录已失效，请重新登录后查看交付产线。");
        if (!response.ok) throw new Error("产线资料加载失败，请重试。");
        const next = await response.json();
        if (next.code === 4001)
          throw new Error("管理员登录已失效，请重新登录后查看交付产线。");
        if (
          next.schemaVersion !== 1 ||
          !Array.isArray(next.features) ||
          !Array.isArray(next.modules)
        )
          throw new Error("产线资料格式不兼容，请重新归档。");
        if (!controller.signal.aborted) setData(next);
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            /^管理员登录|^产线资料/.test(e.message)
              ? e.message
              : "产线资料加载失败，请重试。",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [base, version]);
  if (loading)
    return (
      <div role="status" className="pipeline-empty">
        正在加载交付产线…
      </div>
    );
  if (error)
    return (
      <Alert
        type="warning"
        showIcon
        message={error}
        action={
          <Button aria-label="重试" onClick={() => setVersion((v) => v + 1)}>
            重试
          </Button>
        }
      />
    );
  if (!data) return null;
  const features = data.features.filter(
    (f) =>
      (!module || f.moduleId === module) &&
      (!search ||
        `${f.title} ${f.id}`.toLowerCase().includes(search.toLowerCase())),
  );
  const feature = features.find((f) => f.id === selected) || features[0];
  const run = feature?.runs.find((r) => r.id === runId) || feature?.runs[0];
  return (
    <section className="delivery-pipeline" aria-label="只读交付产线">
      <aside className="pipeline-sidebar">
        <label htmlFor="pipeline-module">模块</label>
        <select
          id="pipeline-module"
          value={module}
          onChange={(e) => setModule(e.target.value)}
        >
          <option value="">全部模块</option>
          {data.modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <label htmlFor="pipeline-search">查找功能</label>
        <input
          id="pipeline-search"
          name="featureSearch"
          autoComplete="off"
          type="search"
          placeholder="功能名称或编号…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="pipeline-feature-list">
          {features.length ? (
            features.map((f) => (
              <button
                type="button"
                key={f.id}
                aria-pressed={f.id === feature?.id}
                onClick={() => {
                  setSelected(f.id);
                  setRunId("");
                }}
              >
                <strong>{f.title}</strong>
                <span>
                  {f.specs.length ? "有规格" : "缺规格"} · {f.cases.length} 用例
                  · {f.runs.length} 次运行
                </span>
              </button>
            ))
          ) : (
            <p role="status">没有匹配的功能</p>
          )}
        </div>
      </aside>
      {feature && (
        <div className="pipeline-detail">
          <div className="pipeline-heading">
            <div>
              <h2>{feature.title}</h2>
              <p>{feature.id} · 只读追溯</p>
            </div>
            <Button onClick={() => setVersion((v) => v + 1)}>刷新资料</Button>
          </div>
          <div className="pipeline-stages" role="tablist" aria-label="交付阶段">
            {stages.map(([id, title]) => (
              <button
                type="button"
                role="tab"
                id={"pipeline-tab-" + id}
                aria-controls="pipeline-stage-content"
                aria-selected={stage === id}
                tabIndex={stage === id ? 0 : -1}
                key={id}
                onKeyDown={(e) => {
                  const i = stages.findIndex((s) => s[0] === id);
                  const next =
                    e.key === "ArrowRight"
                      ? stages[(i + 1) % stages.length]
                      : e.key === "ArrowLeft"
                        ? stages[(i + stages.length - 1) % stages.length]
                        : e.key === "Home"
                          ? stages[0]
                          : e.key === "End"
                            ? stages[stages.length - 1]
                            : null;
                  if (next) {
                    e.preventDefault();
                    setStage(next[0]);
                    document.getElementById("pipeline-tab-" + next[0])?.focus();
                  }
                }}
                onClick={() => setStage(id)}
              >
                {title}
              </button>
            ))}
          </div>
          <div
            id="pipeline-stage-content"
            role="tabpanel"
            aria-labelledby={"pipeline-tab-" + stage}
            tabIndex={0}
          >
            {stage === "prd" && (
              <>
                <p className="pipeline-source">
                  来源：{feature.prd.path} · SHA256{" "}
                  {feature.prd.sha256.slice(0, 12)}
                </p>
                <iframe
                  className="admin-prd-frame"
                  title="功能 PRD 正文"
                  src={base + feature.prd.route}
                />
              </>
            )}
            {stage === "spec" &&
              (feature.specs.length ? (
                feature.specs.map((s) => (
                  <section key={s.path}>
                    <p className="pipeline-source">
                      {s.path} · SHA256 {s.sha256.slice(0, 12)}
                    </p>
                    {s.stale && (
                      <Alert
                        type="warning"
                        message="规格来源已变化，请复核与当前需求的一致性。"
                      />
                    )}
                    <pre className="pipeline-document">{s.content}</pre>
                    {s.links.length > 0 && (
                      <details>
                        <summary>需求与规格映射</summary>
                        {s.links.map((l, i) => (
                          <p key={i}>
                            {l.requirement} → {l.scenario} ·{" "}
                            {l.caseIds.join("、") || "未绑定用例"}
                            {l.manualRequired ? " · 含人工待验项" : ""}
                          </p>
                        ))}
                      </details>
                    )}
                  </section>
                ))
              ) : (
                <p className="pipeline-empty">尚未归档 Spec 正文</p>
              ))}
            {stage === "cases" &&
              (feature.cases.length ? (
                <>
                  <p>
                    候选或缺少执行绑定的用例不代表已覆盖。共{" "}
                    {feature.cases.length} 条。
                  </p>
                  {feature.cases.map((c) => (
                    <details className="pipeline-case" key={c.id}>
                      <summary>
                        <Status value={c.status} />
                        {c.title}
                      </summary>
                      <p>{c.id}</p>
                      <p>关联需求：{c.requirementIds.join("、") || "未登记"}</p>
                      <h3>操作步骤</h3>
                      <ol>
                        {c.steps.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ol>
                      <h3>预期结果</h3>
                      <ul>
                        {c.expectedResults.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                      <p>
                        执行绑定：
                        {c.bindings
                          .map((b) => b.suite + " / " + b.title)
                          .join("；") || "未绑定"}
                      </p>
                    </details>
                  ))}
                </>
              ) : (
                <p className="pipeline-empty">尚未登记测试用例</p>
              ))}
            {stage === "results" &&
              (run ? (
                <>
                  <label htmlFor="pipeline-run">历史运行</label>
                  <select
                    id="pipeline-run"
                    value={run.id}
                    onChange={(e) => setRunId(e.target.value)}
                  >
                    {feature.runs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleString("zh-CN")
                          : ""}{" "}
                        · {r.id} · {labels[r.status] || r.status}
                      </option>
                    ))}
                  </select>
                  <div className="pipeline-run-info">
                    <span>本功能条款</span>
                    <Status value={run.status} />
                    {run.overallStatus && (
                      <>
                        <span>整次运行</span>
                        <Status value={run.overallStatus} />
                      </>
                    )}
                    <span>{run.id}</span>
                  </div>
                  {run.freshness !== "current" && (
                    <Alert
                      type="warning"
                      showIcon
                      message={
                        run.freshness === "stale"
                          ? "需求已更新，本次历史结果不能作为当前版本验收。"
                          : run.freshness === "missing"
                            ? "本次运行结果尚未归档，无法读取。"
                            : "本次运行缺少需求版本摘要，无法核对当前版本。"
                      }
                    />
                  )}
                  <p className="pipeline-source">
                    受测 PRD：{run.prdSha256?.slice(0, 12) || "未登记"} · Spec
                    版本：未冻结，无法核对
                  </p>
                  {run.executionIssues?.length ? (
                    <Alert
                      type="warning"
                      message="整次运行存在环境或执行错误"
                      description={run.executionIssues.join("；")}
                    />
                  ) : null}
                  {run.codeVersions.map((v) => (
                    <p className="pipeline-source" key={v.repository}>
                      {v.repository}：{v.commit || "未登记"}
                      {v.dirty
                        ? " · 含未提交改动，commit不能代表完整受测源"
                        : ""}
                    </p>
                  ))}
                  {run.rerunOf && <p>重跑自：{run.rerunOf}</p>}
                  <div className="pipeline-links">
                    {run.cloudUrls.filter(validCloud).map((url) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        查看 Cloud 运行记录
                      </a>
                    ))}
                  </div>
                  {run.rows.length > 0 && (
                    <div className="pipeline-table-scroll">
                      <table className="pipeline-table">
                        <thead>
                          <tr>
                            <th>需求条款</th>
                            <th>当次原始结果</th>
                            <th>原因 / 追踪用例</th>
                          </tr>
                        </thead>
                        <tbody>
                          {run.rows.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <strong>{row.id}</strong>
                                <p>{row.text}</p>
                              </td>
                              <td>
                                <Status value={row.status} />
                              </td>
                              <td>
                                {row.reason}
                                <p>{row.caseIds.join("、") || "未绑定用例"}</p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {run.cases?.length ? (
                    <details className="pipeline-case">
                      <summary>当次冻结用例（{run.cases.length}）</summary>
                      {run.cases.map((c) => (
                        <section key={c.id}>
                          <h3>
                            {c.id} · {c.title}
                          </h3>
                          <Status value={c.status} />
                          <ol>
                            {c.steps.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ol>
                          <ul>
                            {c.expectedResults.map((s, i) => (
                              <li key={i}>{s}</li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </details>
                  ) : null}
                  {run.tests.length > 0 && (
                    <details className="pipeline-case">
                      <summary>
                        执行明细与证据等级（{run.tests.length}）
                      </summary>
                      {run.tests.map((t, i) => (
                        <div key={i}>
                          <p>
                            <Status value={t.state} />
                            <Status value={t.evidence} />
                            {t.title}
                          </p>
                          {t.error && (
                            <pre className="pipeline-document">{t.error}</pre>
                          )}
                        </div>
                      ))}
                      <p>模拟或混合证据的执行通过，不等于真实业务验收通过。</p>
                    </details>
                  )}
                  {run.analysis.length > 0 ? (
                    <section>
                      <h3>整次运行分析报告</h3>
                      <p>
                        以下分析包含本次运行的其他功能，以逐条需求结果定位本功能。
                      </p>
                      {run.analysis.map((a, i) => (
                        <p key={i}>
                          <strong>{a.category}</strong> · {a.conclusion}
                          <br />
                          {a.nextStep}
                        </p>
                      ))}
                    </section>
                  ) : (
                    <p>尚无分析报告</p>
                  )}
                  {run.images.length > 0 ? (
                    <section>
                      <h3>本次运行截图</h3>
                      <div className="pipeline-images">
                        {run.images
                          .filter((img) =>
                            /^pipeline-evidence\/[a-f0-9]{64}\.(png|webp)$/.test(
                              img.path,
                            ),
                          )
                          .map((img, i) => (
                            <figure key={i}>
                              <a
                                href={base + img.path}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <img
                                  loading="lazy"
                                  src={base + img.path}
                                  alt={img.name}
                                />
                              </a>
                              <figcaption>{img.name}</figcaption>
                            </figure>
                          ))}
                      </div>
                    </section>
                  ) : (
                    <p>尚无已归档截图</p>
                  )}
                </>
              ) : (
                <p className="pipeline-empty">尚无自动化测试运行</p>
              ))}
          </div>
        </div>
      )}
    </section>
  );
}
