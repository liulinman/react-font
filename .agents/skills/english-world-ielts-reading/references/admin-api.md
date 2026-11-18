# 管理端阅读练习 API 契约

本文件记录 `english-world-ielts-reading` 依赖的真实接口。实现可能随代码演进；执行前以 `nestjs/src/interface/reading-practice/` 和 `react-font/apps/admin/src/api/` 为准。

## 1. 基址与响应

- 后端没有全局路由前缀；控制器路径直接是 `/admin/...`。
- 本地直连：`http://127.0.0.1:3000`。
- 管理端前端默认请求 `/api`，由部署层代理；如果使用代理地址，先确认代理会去掉或保留 `/api`。
- 响应统一包成：

```json
{ "code": 200, "data": { }, "message": "success" }
```

- `code !== 200` 视为业务失败；`code=4001` 表示未登录/会话失效。
- 错误结构通常为 `{code, message, data?}`；`message` 是可直接展示的中文原因。

## 2. 登录

```http
POST /admin/login
Content-Type: application/json

{ "username": "...", "password": "..." }
```

- 成功返回 `{ "username": "..." }`，并设置 HttpOnly cookie `admin_token`（7 天）。
- 后续请求只需带 cookie；服务端不读取 Bearer token。
- 验证会话：

```http
GET /admin/me
```

返回 `{ username }`。`4001` 表示未登录或过期。

## 3. 学生查询

```http
GET /admin/users?page=1&pageSize=20&search=<username>&status=active
```

返回：

```json
{
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "list": [
    { "id": 12, "username": "student01", "avatar": "...", "status": "active", "bannedAt": null, "banReason": null, "createTime": "...", "updateTime": "..." }
  ]
}
```

- 只按 `username` 模糊搜索。
- 发布/补发只接受 `status=active`；停用用户会让整次请求失败。
- 接收人 ID 必须让用户确认，不能凭同名猜测。

## 4. 创建阅读练习

```http
POST /admin/reading-practices
Content-Type: application/json

{
  "requestUid": "reading-...",
  "config": {
    "topic": "城市自行车共享计划的实施与争议",
    "title": "可选标题，最多 160 字符",
    "wordCount": 400,
    "questionCount": 6,
    "ieltsBand": 6.5,
    "questionTypes": ["choice", "true_false_not_given"],
    "targetType": "all",
    "targetUserIds": [12, 34]
  }
}
```

`config` 真实校验（`reading-practice.contract.ts`）：

| 字段 | 规则 |
|---|---|
| `topic` | 必填，1–4000 字符 |
| `title` | 可选，最多 160 字符 |
| `wordCount` | 整数 200–800 |
| `questionCount` | 整数 3–13 |
| `ieltsBand` | 5.0–7.5，必须能被 0.5 整除 |
| `questionTypes` | 1–3 个，允许 `choice`、`true_false_not_given`、`sentence_completion`，不能重复 |
| `targetType` | `all` 或 `selected` |
| `targetUserIds` | `selected` 时必填，1–1000 个正整数 |

- `requestUid` 匹配 `^[a-zA-Z0-9:._-]{8,128}$`。
- 相同 `requestUid` + 相同参数重试返回原练习；参数不同返回 409。
- 创建成功返回草稿对象，`status` 通常是 `queued`，后台 worker 会推进到 `generating`，再进入 `draft` 或 `failed`。
- 创建接口明确拒绝 `autoPublish=true`：阅读练习必须人工审核后发布。

## 5. 查询与状态机

```http
GET /admin/reading-practices/:id
```

返回管理端完整对象，关键字段：

```json
{
  "id": 101,
  "title": "...",
  "status": "draft",
  "config": { },
  "content": {
    "title": "...",
    "paragraphs": ["..."],
    "questions": [
      {
        "id": "q1",
        "kind": "choice",
        "stem": "...",
        "options": ["...", "...", "..."],
        "correctIndex": 1,
        "explanation": "中文解析",
        "evidence": { "paragraph": 2, "quote": "原文子串" }
      }
    ]
  },
  "workflow": {
    "revision": 3,
    "qualityRevision": 3,
    "reviewedRevision": null,
    "reviewedQuestions": [],
    "issues": [],
    "autoReview": { "status": "ready" },
    "publishRequest": null
  },
  "failureSummary": null,
  "assignedCount": 0,
  "submittedCount": 0
}
```

状态：

```text
queued -> generating -> draft -> published -> withdrawn
                     \-> failed (可 retry)
```

- `failed` 可用 `POST /admin/reading-practices/:id/retry` 重试；仅失败状态可重试。
- 只有 `draft` 可以编辑、检查、审核、发布。
- 发布后不能改内容；需要改题应创建修订版或撤回后处理。

## 6. AI 质量检查

```http
POST /admin/reading-practices/:id/check

{ "revision": 3, "repair": true }
```

- `revision` 必须等于当前 `workflow.revision`，否则 409。
- `repair=true` 会让服务端尝试修正引用段号、补全缺失答案/解析/证据。
- 如果发生内容修复，`revision` 会递增，`qualityRevision` 更新为新 revision，`reviewedRevision` 清空。
- 检查成功后 `workflow.qualityRevision === workflow.revision`；失败时可能返回 400（AI 输出不完整），本次不计为通过。
- 检查可能耗时较长；客户端应使用至少 300 秒超时。
- **检查后必须重新 GET，以最新 `revision` 和 `content` 为准。**

## 7. 保存内容

```http
POST /admin/reading-practices/:id/save
或
POST /admin/reading-practices/:id/save-check

{ "revision": 3, "content": { "title": "...", "paragraphs": ["..."], "questions": [ ] } }
```

- `content` 至少包含 `title`、`paragraphs`、`questions`；可带 `instructions`。
- 保存会递增 `revision`，清空 `qualityRevision` / `reviewedRevision`，重置 AI 问题状态。
- `save-check` 保存后立即运行 `check`；但检查失败时内容仍可能已保存。
- 修改文章或题目后必须重新检查、重新逐题审核。

### 答案键纠错

如果只改答案且练习已发布，存在 `POST /:id/correct/preview` 与 `POST /:id/correct`，会触发已提交答卷重评。该流程参数较多，默认不要使用；本 skill 只在草稿阶段通过 `save` 修改。需要改已发布答案时，先向用户说明会影响成绩并走管理端界面。

## 8. 审核与发布

```http
POST /admin/reading-practices/:id/publish

{
  "revision": 4,
  "reviewed": true,
  "confirmAll": true,
  "requestUid": "reading-publish-...",
  "recipients": {
    "targetType": "selected",
    "targetUserIds": [12, 34]
  },
  "resolutions": [
    {
      "issueId": "ai-...",
      "reason": "误报原因",
      "evidence": "原文证据"
    }
  ]
}
```

控制器要求 `reviewed === true`。发布事务内还会校验：

1. `revision` 是当前 revision。
2. `qualityRevision === revision`。
3. 没有 `type=structure` 的问题。
4. 没有未解决的 `blocking` 问题。
5. 全部题目已审核：`reviewedRevision === revision` 且 `reviewedQuestions` 覆盖所有题。`confirmAll=true` 会在满足 2–4 时一次性标记全部题目已审核。
6. `recipients` 解析后，至少有一个 active 用户；`selected` 时所有 ID 必须存在且 active，否则整次失败。
7. 练习状态是 `draft`。

`resolutions` 只能关闭 `type=ai` 的问题，且必须同时给 `reason` 和 `evidence`；结构问题不能关闭。

发布成功：

- 练习 `status=published`，写入 `publishedAt`。
- 创建一条 `category=reading_practice` 的通知，标题为练习标题，正文包含题数和 band。
- 为每个接收人创建 `reading_practice_assignment`，投递状态初始为 `pending`，由 worker 投递。
- 相同 `requestUid` + 相同 revision + 相同 recipients 重放返回原结果；改接收范围或 revision 会 409。

接收范围语义：

- `selected`：只发给列出的 active 学生。
- `all`：发给发布时全部 active 学生；之后新注册的学生不会自动获得。
- 发布时配置写入 `configJson`；`targetType=all` 会删除 `targetUserIds`。

## 9. 发布后接口

### 接收人

```http
GET /admin/reading-practices/:id/recipients
```

返回：

```json
{
  "total": 2,
  "list": [
    { "assignmentId": 1, "userId": 12, "username": "student01", "status": "active", "submitted": false }
  ]
}
```

`submitted` 只表示该学生是否已提交，不等于通知已读/已送达。

### 追加接收人

```http
POST /admin/reading-practices/:id/assign

{ "userIds": [56, 78], "requestUid": "reading-assign-..." }
```

- 仅 `published` 可补发。
- 1–1000 个正整数；重复 ID 自动去重排序。
- 只追加 active 用户；包含无效/停用用户时整次失败。
- 已接收用户会被跳过；返回实际 `addedCount` / `skippedCount`。
- 相同 `requestUid` 重放返回原结果；选择变化要换新 `requestUid`。

### 撤回

```http
POST /admin/reading-practices/:id/withdraw
```

- 仅 `published` 可撤回；重复撤回幂等。
- 把练习状态改为 `withdrawn`；**不会删除已创建的分配、通知、作答或成绩**。不要向用户宣称「已从所有学生端彻底删除」。

### 完成情况与成绩

```http
GET /admin/reading-practices/:id/analytics
GET /admin/reading-practices/:id/analytics/users/:userId
```

返回完成人数、提交人数、分数分布等。具体字段以实际响应为准，不要自行推断缺失统计。

## 10. 错误处理

| 状态/码 | 含义 | 处理 |
|---|---|---|
| HTTP 401 / `code=4001` | 未登录或会话过期 | 重新 `login`，检查账号密码；不要循环重试 |
| HTTP 400 | 参数或内容校验失败 | 读 `message`，修正参数；不要原样重试 |
| HTTP 404 | 练习不存在 | 核对 ID 和 API 基址 |
| HTTP 409 | revision / requestUid / 状态冲突 | 重新 GET 当前状态；确认意图后决定复用还是换新 `requestUid` |
| HTTP 500 | 服务端/供应商异常 | 保留 `requestUid`，先 GET 确认是否已生效，再决定是否重试 |
| 网络超时 | 结果未知 | 绝不重复创建；先 GET 查询；发布类请求复用原 `requestUid` |

## 11. 幂等与 revision 规则

- `requestUid` 是业务幂等键，不是随机装饰。重试必须复用；改变参数必须换新。
- 编辑/检查/修复可能递增 `workflow.revision`。任何写操作前都重新读取 revision。
- 发布前检查 `qualityRevision === revision`；不相等说明当前内容还没通过质量检查。
- `reviewedRevision` 是审核通过的 revision；内容一变就失效。
- `confirmAll=true` 不能代替逐题阅读；它只是服务端记录「本次审核覆盖全部题目」的方式。

## 12. 安全

- 管理员 cookie 等同于后台会话，禁止输出到终端、日志或提交。
- 不要在生产环境创建测试练习、给真实学生发测试内容或批量试跑。
- 不要把学生列表、成绩或通知内容写入公开文档。
- 只通过管理端 API 操作；不要直连数据库改状态或绕过审核。
