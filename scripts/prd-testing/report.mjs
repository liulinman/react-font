import { writeFile, readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assess, inside, redact } from './model.mjs';

export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export async function renderReport(dir, run, plan, results, errors = []) {
  const result = assess(plan, results, errors);
  const title = { passed: '通过', failed: '不通过', incomplete: '验收未完成' }[result.status];
  const json = { ...run, ...result, results, analysisStatus: 'pending' };
  try {
    const analysis = JSON.parse(await readFile(resolve(dir, 'analysis.json'), 'utf8'));
    if (analysis.runId !== run.id || !Array.isArray(analysis.findings)) throw new Error('分析 runId 或格式不匹配');
    for (const f of analysis.findings) {
      if (!['product', 'test', 'environment', 'unknown'].includes(f.category) || !f.conclusion || !f.nextStep || !f.evidence?.length) throw new Error('分析项缺少分类、结论、下一步或证据');
      for (const path of f.evidence) await access(inside(dir, path));
    }
    if (result.failures.length + errors.length > 0 && analysis.findings.length === 0) throw new Error('失败运行不能用空分析完成');
    json.analysisStatus = 'completed'; json.analysis = analysis;
  } catch (error) { if (error.code !== 'ENOENT') json.analysisError = error.message; }
  await writeFile(resolve(dir, 'result.json'), redact(JSON.stringify(json, null, 2)) + '\n');
  const row = r => `<tr><td>${escape(r.id)}</td><td>${escape({ passed: '通过', failed: '不通过', pending: '未执行/未覆盖' }[r.status])}</td><td>${escape(r.text)}</td><td>${escape(r.reason)} ${r.evidence.map(e => `<a href="${escape(e.artifact)}">${escape(e.suite)}（${escape(e.level)}）</a>`).join(' ')}</td></tr>`;
  const analysisHtml = json.analysis ? json.analysis.findings.map(f => `<li><b>${escape(f.category)}</b>：${escape(f.conclusion)}<br>下一步：${escape(f.nextStep)}<br>${f.evidence.map(e => `<a href="${escape(e)}">${escape(e)}</a>`).join(' ')}</li>`).join('') || '<li>没有失败；需求覆盖缺口见下方。</li>' : '<li>待 Codex 分析。命令执行结果不会自动冒充 AI 根因分析。</li>';
  const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>PRD 测试 ${escape(run.id)}</title><style>body{font:15px/1.6 system-ui,sans-serif;margin:32px;color:#1f2937;background:#f8fafc}main{max-width:1300px;margin:auto}section{background:white;padding:20px;border:1px solid #dbe2ea;border-radius:12px;margin:18px 0}table{width:100%;border-collapse:collapse}td,th{text-align:left;padding:10px;border-bottom:1px solid #ddd;vertical-align:top;overflow-wrap:anywhere}td:first-child{min-width:190px}a{color:#175cc4}pre{white-space:pre-wrap;overflow-wrap:anywhere}.badge{font-size:26px;font-weight:700}</style><main><h1>PRD 模块验收</h1><p class="badge">${title}</p><p>${escape(run.id)} · ${escape(plan.modules.map(m => m.name).join('、'))}</p><p>需求：通过 ${result.counts.passed} / 失败 ${result.counts.failed} / 待验证 ${result.counts.pending}；浏览器测试：通过 ${result.tests.passed} / 失败 ${result.tests.failed} / 跳过 ${result.tests.skipped}</p><p>Cloud：${escape(run.cloudStatus)} ${results.filter(r => r.runUrl).map(r => `<a href="${escape(r.runUrl)}">${escape(r.suite)} 云端记录</a>`).join(' ')} · AI 分析：${json.analysisStatus === 'completed' ? '已完成' : '待分析'}</p><section><h2>范围与执行缺口</h2><ul>${[...result.gaps, ...errors].map(g => `<li>${escape(g)}</li>`).join('')}</ul><p>模拟接口测试仅证明页面交互；未覆盖、过期、跳过和环境阻塞不计入通过。</p><a href="plan.json">冻结计划与需求快照</a> · <a href="result.json">机器结果</a> · <a href="analysis.md">AI 分析</a></section><section><h2>失败与分析</h2><ul>${analysisHtml}</ul>${result.failures.map(f => `<p><b>${escape(f.suite)} / ${escape(f.title)}</b></p><pre>${escape(f.error)}</pre><a href="${escape(f.artifact)}">执行证据</a>`).join('')}</section><section><h2>验收要求</h2><table><thead><tr><th>需求 ID</th><th>结果</th><th>需求原文</th><th>证据 / 原因</th></tr></thead><tbody>${[...result.rows].sort((a,b) => ({ failed:0,pending:1,passed:2 }[a.status]-{ failed:0,pending:1,passed:2 }[b.status])).map(row).join('')}</tbody></table></section><section><h2>补充回归结果</h2>${results.map(r => `<details><summary>${escape(r.suite)}（${escape(r.evidence)}，${r.tests?.length ?? 0} 条）</summary><a href="${escape(r.artifact)}">原始结果</a><ul>${(r.tests ?? []).map(t => `<li>${escape(t.state)}：${escape(t.title)}</li>`).join('')}</ul></details>`).join('')}</section></main></html>`;
  const attachments = results.flatMap(r => (r.screenshots ?? []).map(path => `<li><a href="${escape(path.split('/').map(encodeURIComponent).join('/'))}">${escape(r.suite)} / ${escape(path)}</a></li>`));
  const artifactSection = `<section><h2>截图与环境证据</h2><ul>${attachments.join('')}</ul><p>服务日志：backend.log、frontend.log、admin.log；浏览器批次日志：cypress-batch.log（历史串行运行保留 cypress-&lt;suite&gt;.log）；本次后端接口结果（若已生成）：backend-integration.json。</p></section>`;
  const caseSection = `<section><h2>本次 Case 计划</h2>${plan.cases.map(c => `<details><summary>${escape(c.id)} · ${escape(c.status)} · ${escape(c.title)}</summary><p>需求：${escape(c.requirementIds.join('、'))}</p><p>前置：${escape((c.preconditions ?? []).join('；'))}</p><ol>${(c.steps ?? []).map(s => `<li>${escape(s)}</li>`).join('')}</ol><p>预期：${escape((c.expectedResults ?? []).join('；'))}</p><p>清理：${escape(c.cleanup)}</p></details>`).join('')}</section>`;
  await writeFile(resolve(dir, 'report.html'), redact(html.replace('</main>', `${artifactSection}${caseSection}</main>`)));
  return json;
}
export async function writeAnalysisPack(dir, run, plan, results, errors) {
  const result = assess(plan, results, errors);
  const pack = { runId: run.id, failures: result.failures, errors, coverage: result.counts, gaps: result.gaps, instructions: '由 Codex 对照 plan.json 的原始 PRD、执行证据与相关代码分析。分类 product/test/environment/unknown，证据不足时保留假设；不要修改本轮执行结果。写 analysis.json 与 analysis.md，再执行 --finalize <run-directory>。', example: { runId: run.id, findings: [{ category: 'unknown', conclusion: '实际调查后填写；不是自动结论', nextStep: '下一步验证', evidence: ['execution/<suite>.json'] }] } };
  await writeFile(resolve(dir, 'analysis-input.json'), redact(JSON.stringify(pack, null, 2)) + '\n');
  await writeFile(resolve(dir, 'analysis.md'), '# 待 Codex 分析\n\n请读取 analysis-input.json、plan.json 和 execution/ 下证据，对照相关代码完成分析。缺少运行证据时不得宣称根因已确定。\n');
}
