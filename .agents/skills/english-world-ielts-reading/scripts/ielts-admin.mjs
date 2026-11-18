#!/usr/bin/env node
/**
 * English World IELTS reading practice admin helper.
 *
 * Node 18+, no dependencies. Run from react-font/.
 * Credentials come from env or flags; this script never writes them to disk.
 */
import { parseArgs } from 'node:util';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';

const HELP = `English World 雅思阅读管理端助手

用法:
  node scripts/ielts-admin.mjs <command> [options]

命令:
  login                                  验证管理员会话
  users --search <username>              查询 active 学生（默认第 1 页 20 条）
  create --topic <text> [出题参数]        创建 AI 生成草稿
  wait <id>                              轮询直到 draft / failed / published / withdrawn
  get <id> [--json]                      读取练习；默认摘要，--json 输出完整内容
  issues <id>                            只看未解决问题与发布门槛
  check <id> [--revision N]              运行 AI 质量检查（可能递增 revision）
  save <id> --file <content.json>        保存 content；加 --save-check 立即检查
  publish <id> --target selected --user-ids 1,2 --confirm
                                         审核后发布（必须显式确认）
  assign <id> --user-ids 3,4 --confirm   给已发布练习追加接收人
  recipients <id>                        查看接收人与提交状态
  withdraw <id> --confirm                撤回已发布练习（不改动分配/作答记录）
  analytics <id>                         查看完成情况与成绩统计
  retry <id>                             重试失败的生成任务

通用选项:
  --base <url>        API 基址；默认 ENGLISH_WORLD_API_BASE 或 http://127.0.0.1:3000
  --username <name>   管理员账号；默认 ENGLISH_WORLD_ADMIN_USERNAME 或 ADMIN_USERNAME
  --password <pass>   管理员密码；默认 ENGLISH_WORLD_ADMIN_PASSWORD 或 ADMIN_PASSWORD
  --request-uid <id>  幂等键；重试必须复用，改参数必须换新
  --timeout <ms>      wait 总超时，默认 300000
  --interval <ms>     wait 轮询间隔，默认 3000
  -h, --help          显示帮助

create 参数:
  --topic <text>             必填，1–4000 字符
  --title <text>             可选，最多 160 字符
  --band <5.0–7.5>           默认 6.0，0.5 递增
  --words <200–800>          默认 400
  --questions <3–13>         默认 5
  --types <list>             默认 choice,true_false_not_given
                             可选 choice,true_false_not_given,sentence_completion
  --target <all|selected>    创建时默认 all；发布时请显式选择
  --user-ids <1,2>           selected 时必填，最多 1000 个

安全检查:
  - 只有 --confirm 才会 publish / assign / withdraw。
  - publish --target all 还必须显式加 --allow-all。
  - 脚本不会打印密码或 cookie。
`;

let currentRequestUid = null;

function usage(message) {
  const error = new Error(message);
  error.usage = true;
  throw error;
}

function env(name) {
  return process.env[name]?.trim() || undefined;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emit(data) {
  console.log(JSON.stringify(data, null, 2));
}

function required(name, value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    usage(`缺少 --${name}`);
  }
  return value;
}

function asInt(name, value, min, max, fallback) {
  const raw = value === undefined ? fallback : value;
  const number = Number(raw);
  if (!Number.isInteger(number) || number < min || number > max) {
    usage(`--${name} 必须是 ${min}–${max} 的整数`);
  }
  return number;
}

function asBand(value) {
  const band = Number(value === undefined ? 6 : value);
  if (!Number.isFinite(band) || band < 5 || band > 7.5 || !Number.isInteger(band * 2)) {
    usage('--band 必须是 5.0–7.5，且以 0.5 递增');
  }
  return band;
}

const QUESTION_KINDS = new Set([
  'choice',
  'true_false_not_given',
  'sentence_completion',
]);

function asTypes(value) {
  const raw = value === undefined ? 'choice,true_false_not_given' : String(value);
  const types = [...new Set(raw.split(',').map((item) => item.trim()).filter(Boolean))];
  if (!types.length || types.length > 3) usage('--types 需要 1–3 个题型');
  for (const kind of types) {
    if (!QUESTION_KINDS.has(kind)) {
      usage(`不支持的题型 ${kind}；可用: ${[...QUESTION_KINDS].join(', ')}`);
    }
  }
  return types.sort();
}

function asTarget(value, fallback) {
  const target = value === undefined ? fallback : String(value);
  if (target !== 'all' && target !== 'selected') usage('--target 必须是 all 或 selected');
  return target;
}

function asUserIds(value) {
  const text = required('user-ids', value);
  const ids = [...new Set(
    String(text)
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item > 0),
  )].sort((a, b) => a - b);
  if (!ids.length || ids.length > 1000) usage('--user-ids 需要 1–1000 个正整数');
  return ids;
}

function asId(value, label = '练习 ID') {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) usage(`${label}无效`);
  return id;
}

function asRequestUid(value, prefix) {
  const id = value === undefined
    ? `${prefix}-${Date.now()}-${randomBytes(4).toString('hex')}`
    : String(value);
  if (!/^[a-zA-Z0-9:._-]{8,128}$/.test(id)) usage('--request-uid 格式无效');
  return id;
}

function summarizePractice(practice) {
  const workflow = practice.workflow || {};
  const questions = practice.content?.questions || [];
  const issues = workflow.issues || [];
  const unresolved = issues.filter((issue) => !issue.resolved);
  return {
    id: practice.id,
    title: practice.title,
    status: practice.status,
    config: practice.config,
    publishedAt: practice.publishedAt,
    assignedCount: practice.assignedCount,
    submittedCount: practice.submittedCount,
    workflow: {
      revision: workflow.revision,
      qualityRevision: workflow.qualityRevision,
      reviewedRevision: workflow.reviewedRevision,
      reviewedQuestions: (workflow.reviewedQuestions || []).length,
      totalQuestions: questions.length,
      autoReview: workflow.autoReview,
      unresolvedIssues: unresolved.length,
      blockingIssues: unresolved.filter((issue) => issue.blocking).length,
      structuralIssues: unresolved.filter((issue) => issue.type === 'structure').length,
    },
    failureSummary: practice.failureSummary || null,
  };
}

function issueSummary(practice) {
  const workflow = practice.workflow || {};
  const questions = practice.content?.questions || [];
  const issues = workflow.issues || [];
  const unresolved = issues.filter((issue) => !issue.resolved);
  const blocking = unresolved.filter((issue) => issue.blocking);
  const structural = unresolved.filter((issue) => issue.type === 'structure');
  const missingFields = questions
    .filter((q) => {
      if (!q?.explanation?.trim() || !q?.evidence) return true;
      if (q.kind === 'true_false_not_given' && q.correctIndex === 2) {
        return !q.evidence.missingInformation?.trim();
      }
      return !q.evidence.quote?.trim();
    })
    .map((q) => q.id);
  const readyToPublish =
    practice.status === 'draft' &&
    workflow.qualityRevision === workflow.revision &&
    questions.length > 0 &&
    structural.length === 0 &&
    blocking.length === 0;
  return {
    id: practice.id,
    status: practice.status,
    revision: workflow.revision,
    qualityRevision: workflow.qualityRevision,
    reviewedRevision: workflow.reviewedRevision,
    reviewedQuestions: (workflow.reviewedQuestions || []).length,
    totalQuestions: questions.length,
    qualityCurrent: workflow.qualityRevision === workflow.revision,
    readyToPublish,
    unresolvedIssues: unresolved.map((issue) => ({
      id: issue.id,
      type: issue.type,
      questionId: issue.questionId,
      blocking: issue.blocking,
      message: issue.message,
    })),
    questionsMissingAnswerFields: missingFields,
    lastCheckSummary: workflow.lastCheckSummary || null,
    autoReview: workflow.autoReview || null,
  };
}

async function loadJsonFile(path) {
  let text;
  try {
    text = await readFile(path, 'utf8');
  } catch (error) {
    usage(`无法读取 --file ${path}: ${error.message}`);
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    usage(`--file 不是有效 JSON: ${error.message}`);
  }
}

class ApiError extends Error {
  constructor(message, { code, status, data } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

function createClient({ base, username, password }) {
  let cookie = null;

  async function api(method, path, body, { timeoutMs = 60000 } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(`${base}${path}`, {
        method,
        headers: {
          accept: 'application/json',
          ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
          ...(cookie ? { cookie } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new ApiError(`请求超时（${timeoutMs}ms）: ${method} ${path}`);
      }
      throw new ApiError(`无法连接 ${base}: ${error.message}`);
    } finally {
      clearTimeout(timer);
    }

    const setCookies = typeof response.headers.getSetCookie === 'function'
      ? response.headers.getSetCookie()
      : (response.headers.get('set-cookie') ? [response.headers.get('set-cookie')] : []);
    for (const item of setCookies) {
      const match = /(?:^|,\s*)admin_token=([^;]+)/.exec(item);
      if (match) cookie = `admin_token=${match[1]}`;
    }

    const text = await response.text();
    let payload;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      throw new ApiError(
        `响应不是 JSON（HTTP ${response.status}）: ${text.slice(0, 300)}`,
        { status: response.status },
      );
    }

    if (payload && typeof payload === 'object' && 'code' in payload) {
      if (payload.code !== 200) {
        throw new ApiError(payload.message || `业务失败 code=${payload.code}`, {
          code: payload.code,
          status: response.status,
          data: payload.data,
        });
      }
      return payload.data;
    }

    if (!response.ok) {
      throw new ApiError(`HTTP ${response.status}`, {
        status: response.status,
        data: payload,
      });
    }
    return payload;
  }

  async function login() {
    await api('POST', '/admin/login', { username, password });
    return api('GET', '/admin/me');
  }

  return { api, login };
}

function readOptions(values) {
  return {
    base: (values.base || env('ENGLISH_WORLD_API_BASE') || 'http://127.0.0.1:3000')
      .replace(/\/+$/, ''),
    username: values.username || env('ENGLISH_WORLD_ADMIN_USERNAME') || env('ADMIN_USERNAME'),
    password: values.password || env('ENGLISH_WORLD_ADMIN_PASSWORD') || env('ADMIN_PASSWORD'),
  };
}

async function main() {
  let parsed;
  try {
    parsed = parseArgs({
      allowPositionals: true,
      options: {
        base: { type: 'string' },
        username: { type: 'string' },
        password: { type: 'string' },
        json: { type: 'boolean', default: false },
        confirm: { type: 'boolean', default: false },
        'allow-all': { type: 'boolean', default: false },
        topic: { type: 'string' },
        title: { type: 'string' },
        band: { type: 'string' },
        words: { type: 'string' },
        questions: { type: 'string' },
        types: { type: 'string' },
        target: { type: 'string' },
        'user-ids': { type: 'string' },
        'request-uid': { type: 'string' },
        revision: { type: 'string' },
        search: { type: 'string' },
        page: { type: 'string' },
        'page-size': { type: 'string' },
        timeout: { type: 'string' },
        interval: { type: 'string' },
        file: { type: 'string' },
        'save-check': { type: 'boolean', default: false },
        resolutions: { type: 'string' },
        help: { type: 'boolean', short: 'h', default: false },
      },
    });
  } catch (error) {
    throw new Error(`${error.message}\n\n${HELP}`);
  }

  const { values, positionals } = parsed;
  const command = positionals[0];

  if (values.help || !command || command === 'help') {
    console.log(HELP);
    return;
  }

  const options = readOptions(values);
  if (!options.username || !options.password) {
    usage('缺少管理员凭据：设置 ENGLISH_WORLD_ADMIN_USERNAME / ENGLISH_WORLD_ADMIN_PASSWORD，或使用 --username/--password');
  }
  const client = createClient(options);

  switch (command) {
    case 'login': {
      const me = await client.login();
      emit({ ok: true, base: options.base, username: me.username });
      return;
    }

    case 'users': {
      await client.login();
      const params = new URLSearchParams({
        page: String(asInt('page', values.page, 1, 100000, 1)),
        pageSize: String(asInt('page-size', values['page-size'], 1, 100, 20)),
        status: 'active',
        ...(values.search ? { search: String(values.search).trim() } : {}),
      });
      const data = await client.api('GET', `/admin/users?${params}`);
      emit(data);
      return;
    }

    case 'create': {
      await client.login();
      const topic = String(required('topic', values.topic)).trim();
      if (topic.length > 4000) usage('--topic 最多 4000 字符');
      const title = values.title ? String(values.title).trim() : undefined;
      if (title && title.length > 160) usage('--title 最多 160 字符');
      const targetType = asTarget(values.target, values['user-ids'] ? 'selected' : 'all');
      if (targetType === 'all' && values['user-ids']) {
        usage('--target all 与 --user-ids 不能同时使用');
      }
      const config = {
        topic,
        ...(title ? { title } : {}),
        wordCount: asInt('words', values.words, 200, 800, 400),
        questionCount: asInt('questions', values.questions, 3, 13, 5),
        ieltsBand: asBand(values.band),
        questionTypes: asTypes(values.types),
        targetType,
        ...(targetType === 'selected' ? { targetUserIds: asUserIds(values['user-ids']) } : {}),
      };
      currentRequestUid = asRequestUid(values['request-uid'], 'reading');
      const practice = await client.api('POST', '/admin/reading-practices', {
        requestUid: currentRequestUid,
        config,
      });
      emit({ ok: true, requestUid: currentRequestUid, ...summarizePractice(practice) });
      return;
    }

    case 'wait': {
      const id = asId(positionals[1]);
      const timeoutMs = asInt('timeout', values.timeout, 1000, 3600000, 300000);
      const intervalMs = asInt('interval', values.interval, 500, 60000, 3000);
      await client.login();
      const deadline = Date.now() + timeoutMs;
      let practice;
      for (;;) {
        practice = await client.api('GET', `/admin/reading-practices/${id}`);
        if (['draft', 'failed', 'published', 'withdrawn'].includes(practice.status)) break;
        if (Date.now() >= deadline) {
          emit({ ok: false, timeout: true, ...summarizePractice(practice) });
          process.exitCode = 2;
          return;
        }
        await sleep(intervalMs);
      }
      emit({ ok: practice.status !== 'failed', ...summarizePractice(practice) });
      if (practice.status === 'failed') process.exitCode = 2;
      return;
    }

    case 'get': {
      await client.login();
      const id = asId(positionals[1]);
      const practice = await client.api('GET', `/admin/reading-practices/${id}`);
      emit(values.json ? practice : summarizePractice(practice));
      return;
    }

    case 'issues': {
      await client.login();
      const id = asId(positionals[1]);
      const practice = await client.api('GET', `/admin/reading-practices/${id}`);
      emit(issueSummary(practice));
      return;
    }

    case 'check': {
      await client.login();
      const id = asId(positionals[1]);
      const practice = await client.api('GET', `/admin/reading-practices/${id}`);
      if (practice.status !== 'draft') {
        throw new ApiError(`只有 draft 可以检查，当前状态 ${practice.status}`);
      }
      const revision = values.revision === undefined
        ? practice.workflow?.revision
        : asId(values.revision, 'revision');
      if (revision !== practice.workflow?.revision) {
        throw new ApiError(`revision 已变化：当前 ${practice.workflow?.revision}，传入 ${revision}；请重新读取`);
      }
      const checked = await client.api(
        'POST',
        `/admin/reading-practices/${id}/check`,
        { revision, repair: true },
        { timeoutMs: 300000 },
      );
      emit({
        ok: true,
        ...summarizePractice(checked),
        lastCheckSummary: checked.workflow?.lastCheckSummary || null,
        issues: issueSummary(checked).unresolvedIssues,
      });
      return;
    }

    case 'save': {
      await client.login();
      const id = asId(positionals[1]);
      const file = required('file', values.file);
      const parsedFile = await loadJsonFile(file);
      const content = parsedFile?.content && !parsedFile?.questions
        ? parsedFile.content
        : parsedFile;
      if (!content || !Array.isArray(content.paragraphs) || !Array.isArray(content.questions)) {
        usage('--file 必须包含 paragraphs 和 questions（可以是完整 practice 的 content 字段）');
      }
      const practice = await client.api('GET', `/admin/reading-practices/${id}`);
      if (practice.status !== 'draft') {
        throw new ApiError(`只有 draft 可以保存，当前状态 ${practice.status}`);
      }
      const revision = values.revision === undefined
        ? practice.workflow?.revision
        : asId(values.revision, 'revision');
      if (revision !== practice.workflow?.revision) {
        throw new ApiError(`revision 已变化：当前 ${practice.workflow?.revision}，传入 ${revision}；请重新读取`);
      }
      const action = values['save-check'] ? 'save-check' : 'save';
      const saved = await client.api(
        'POST',
        `/admin/reading-practices/${id}/${action}`,
        { revision, content },
        { timeoutMs: values['save-check'] ? 300000 : 60000 },
      );
      emit({ ok: true, ...summarizePractice(saved) });
      return;
    }

    case 'publish': {
      if (!values.confirm) {
        usage('发布是外部可见动作：确认接收人后加 --confirm 再执行');
      }
      await client.login();
      const id = asId(positionals[1]);
      const practice = await client.api('GET', `/admin/reading-practices/${id}`);
      if (practice.status === 'published') {
        let recipients = null;
        try {
          recipients = await client.api('GET', `/admin/reading-practices/${id}/recipients`);
        } catch {
          // The practice is already published; recipient verification can be retried separately.
        }
        emit({
          ok: true,
          alreadyPublished: true,
          note: '练习已发布；如需新增接收人请使用 assign，不要重复发布',
          ...summarizePractice(practice),
          recipients,
        });
        return;
      }
      if (practice.status !== 'draft') {
        throw new ApiError(`只有 draft 可以发布，当前状态 ${practice.status}`);
      }
      const revision = practice.workflow?.revision;
      if (practice.workflow?.qualityRevision !== revision) {
        throw new ApiError('当前修订尚未通过 AI 质量检查，请先运行 check');
      }

      const issues = issueSummary(practice);
      if (issues.questionsMissingAnswerFields.length) {
        throw new ApiError(
          `以下题目缺少答案、解析或证据：${issues.questionsMissingAnswerFields.join(', ')}`,
        );
      }
      if (issues.unresolvedIssues.some((issue) => issue.type === 'structure')) {
        throw new ApiError(
          `存在不可关闭的结构问题：${issues.unresolvedIssues
            .filter((issue) => issue.type === 'structure')
            .map((issue) => issue.message)
            .join('；')}`,
        );
      }

      let resolutions;
      if (values.resolutions) {
        resolutions = await loadJsonFile(values.resolutions);
        if (!Array.isArray(resolutions) || !resolutions.length) {
          usage('--resolutions 需要非空 JSON 数组');
        }
        for (const item of resolutions) {
          if (
            !item ||
            typeof item.issueId !== 'string' ||
            !item.issueId.trim() ||
            typeof item.reason !== 'string' ||
            !item.reason.trim() ||
            typeof item.evidence !== 'string' ||
            !item.evidence.trim()
          ) {
            usage('每条 resolution 需要 issueId、reason、evidence');
          }
        }
      }
      const unresolvedBlocking = issues.unresolvedIssues.filter((issue) => issue.blocking);
      if (unresolvedBlocking.length && !resolutions) {
        throw new ApiError(
          `存在未解决阻断问题，需先修复或提供 --resolutions 误报证据：${unresolvedBlocking
            .map((issue) => issue.message)
            .join('；')}`,
        );
      }

      const targetType = asTarget(values.target, values['user-ids'] ? 'selected' : undefined);
      if (targetType === 'all' && values['user-ids']) {
        usage('--target all 与 --user-ids 不能同时使用');
      }
      const recipients = {
        targetType,
        ...(targetType === 'selected'
          ? { targetUserIds: asUserIds(values['user-ids']) }
          : {}),
      };
      if (targetType === 'all' && !values['allow-all']) {
        usage('发给全部学生需要显式加 --allow-all；默认请使用 --target selected');
      }

      currentRequestUid = asRequestUid(values['request-uid'], 'reading-publish');
      const published = await client.api(
        'POST',
        `/admin/reading-practices/${id}/publish`,
        {
          revision,
          reviewed: true,
          confirmAll: true,
          recipients,
          requestUid: currentRequestUid,
          ...(resolutions ? { resolutions } : {}),
        },
        { timeoutMs: 120000 },
      );
      let recipientResult = null;
      try {
        recipientResult = await client.api('GET', `/admin/reading-practices/${id}/recipients`);
      } catch {
        // The publish itself succeeded; recipients can be checked separately.
      }
      emit({
        ok: true,
        requestUid: currentRequestUid,
        ...summarizePractice(published),
        recipients: recipientResult,
      });
      return;
    }

    case 'assign': {
      if (!values.confirm) usage('补发会影响学生：加 --confirm 再执行');
      await client.login();
      const id = asId(positionals[1]);
      const userIds = asUserIds(values['user-ids']);
      currentRequestUid = asRequestUid(values['request-uid'], 'reading-assign');
      const result = await client.api('POST', `/admin/reading-practices/${id}/assign`, {
        userIds,
        requestUid: currentRequestUid,
      });
      emit({ ok: true, requestUid: currentRequestUid, result });
      return;
    }

    case 'recipients': {
      await client.login();
      const id = asId(positionals[1]);
      emit(await client.api('GET', `/admin/reading-practices/${id}/recipients`));
      return;
    }

    case 'withdraw': {
      if (!values.confirm) usage('撤回会改变练习状态：加 --confirm 再执行');
      await client.login();
      const id = asId(positionals[1]);
      const result = await client.api('POST', `/admin/reading-practices/${id}/withdraw`);
      emit({ ok: true, ...summarizePractice(result) });
      return;
    }

    case 'analytics': {
      await client.login();
      const id = asId(positionals[1]);
      emit(await client.api('GET', `/admin/reading-practices/${id}/analytics`));
      return;
    }

    case 'retry': {
      await client.login();
      const id = asId(positionals[1]);
      const result = await client.api('POST', `/admin/reading-practices/${id}/retry`);
      emit({ ok: true, ...summarizePractice(result) });
      return;
    }

    default:
      usage(`未知命令 ${command}`);
  }
}

try {
  await main();
} catch (error) {
  const payload = {
    ok: false,
    error: {
      message: error.message,
      ...(error.code !== undefined ? { code: error.code } : {}),
      ...(error.status !== undefined ? { status: error.status } : {}),
      ...(error.data !== undefined ? { data: error.data } : {}),
    },
    ...(currentRequestUid ? { requestUid: currentRequestUid } : {}),
  };
  console.error(JSON.stringify(payload, null, 2));
  if (error.usage) console.error(`\n${HELP}`);
  process.exit(1);
}
