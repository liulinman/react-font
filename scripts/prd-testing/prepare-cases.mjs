// Creates missing drafts only. Codex must inspect the source and refine them before certification.
import { readFile, mkdir, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceBundleHash, featureSources, extractRequirements } from './model.mjs';
const root = fileURLToPath(new URL('../..', import.meta.url));
const registry = JSON.parse(await readFile(resolve(root, 'docs/prd/index.json'), 'utf8'));
const recipes = {
  'weak-word-repair': ['完成一轮包含错词的复习，记录会话 ID、去重错词与用户时区。', '从复习结果进入微语境，生成并作答，记录目标词与结果归因。', '刷新/恢复当前回合，再推进到下一自然日检查复查来源；比较原始记录。'],
  'word-journey': ['建立无记录、首次错误、同日修复、次日验证及再次出错的词汇样本。', '打开 Memory Map 队列和详情，检查阶段、证据时间线与主要动作。', '对照复习/语境原始记录检查阶段可逆与用户隔离。'],
  'knowledge-notes': ['登录主账号，准备长中英混合笔记及可关联词条；另备第二用户。', '通过桌面/手机的笔记或词条入口执行目标创建、编辑、复制、搜索或删除操作。', '按本条预期检查字段、错误反馈、重复提交或并发版本，刷新并用真实 API 复核记录与词条状态。'],
  'folders': ['登录主用户，准备根/子目录及含正文、分类、关联词条的笔记；另备第二账号与旧编辑版本。', '通过文件夹树和笔记列表执行本条目标操作，并覆盖无效名称、层级、无权限或并发分支。', '刷新检查目录数量、路径、笔记归属与原始正文，失败操作核实数据库无部分写入。'],
  'add-recipients': ['管理员准备已发布练习，A 已完成作答；另备未接收用户 B/C、停用用户与第二管理员。', '从列表或原补发入口打开追加接收人，执行本条选择、搜索、确认、重试或并发操作。', '核实新增/跳过人数、名单、分配 ID、原成绩和通知投递记录；用新旧学生分别读取练习。'],
  'analytics': ['管理员准备同一版本练习及已完成、作答中、未开始学生；准备可评分、零分、作废及异常提交。', '打开完成情况，按本条执行筛选、排序、分页、详情或评分修订后刷新。', '用原始分配、提交和当前有效题手算预期，核对概览、学生明细、逐题分析与权限拒绝。'],
  'word-book': ['准备用户自有词条、长笔记、知识笔记和部分无记录/跨用户样本。', '按本条要求选择范围，创建并打开复习册，检查内容分组、整理与管理或打印操作。', '对照源词/知识数据检查无遗漏、无虚构内容及权限；刷新恢复，检查打印与双端布局。'],
};
let created = 0;
for (const f of registry.features) {
  const path = resolve(root, `docs/testing/cases/${f.primaryModule}/${f.id}.json`);
  try { await access(path); continue; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const source = `docs/prd/${f.prd}`;
  const content = await readFile(resolve(root, source), 'utf8');
  const cases = extractRequirements(content, `${f.primaryModule}/${f.id}`).map(r => ({
    id: `${r.id}/CASE-01`, title: r.text.split('\n')[0], status: 'draft', requirementIds: [r.id],
    preconditions: ['一次性 MySQL/NestJS 测试环境；仅使用本次创建的数据，禁止连接生产。'],
    steps: recipes[f.id], expectedResults: [r.text], cleanup: '由隔离环境 runner 清理；同一 spec 内记录并清理创建的数据。',
    bindings: [], reviewNote: '初始需求候选；Codex 必须核对整份 PRD、字段表和决策补充，细化数据与操作，补充边界场景后标为 ready。',
  }));
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, JSON.stringify({ schemaVersion: 1, source, sourceHash: sourceBundleHash(await featureSources(root, f.prd)), cases }, null, 2) + '\n'); created += cases.length;
}
console.log(`新建 ${created} 条 PRD Case 候选；已有 Case 未覆盖写入。候选不计为已自动化。`);
const lines = ['# PRD 测试 Case 索引', '', 'JSON 是 Case 的维护来源。draft 是待 AI 细化的需求候选，ready 表示已细化并登记执行绑定；两者均不等于本次测试通过，通过结果只看运行报告。', '', '| 模块 / 功能 | Case 文件 | 候选 | ready |', '|---|---|---|---|'];
for (const f of registry.features) {
  const path = `${f.primaryModule}/${f.id}.json`;
  const doc = JSON.parse(await readFile(resolve(root, 'docs/testing/cases', path), 'utf8'));
  lines.push(`| ${f.primaryModule} / ${f.title} | [${f.id}](${path}) | ${doc.cases.filter(c => c.status === 'draft').length} | ${doc.cases.filter(c => c.status === 'ready').length} |`);
}
lines.push('', '每次运行的 HTML 报告包含 Case 步骤与需求对应关系；未登记脚本的候选明确标为未覆盖。', '执行 `node scripts/prd-testing/prepare-cases.mjs` 可刷新本索引，不覆盖已有 Case。', '');
await writeFile(resolve(root, 'docs/testing/cases/README.md'), lines.join('\n'));
