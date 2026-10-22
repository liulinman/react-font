# AI服务管理与场景听力 Implementation Plan

> For agentic workers: use subagent-driven-development sequentially, one implementation task at a time.

**Goal:** 管理DeepSeek/豆包凭据，并提供先看词后听场景填空的完整流程。
**Architecture:** 独立NestJS模块负责加密配置、供应商、内容门禁、持久音频与学习会话；admin与学生React复用现有登录；基于最新生产源做增量发布。
**Tech Stack:** NestJS、Sequelize/MySQL、React、Ant Design、Vitest/Jest/Cypress。
**Spec:** docs/prd/review/features/ai-listening/prd.md；接口 nestjs/docs/ai-listening/backend-contract.md。

## Global Constraints

密钥不入源码和日志；仅HTTPS或安全localhost入口管理；答案首次提交前仅在后端；不删原有模块；正式AI与替身结果分开。

## Review Focus

权限越界、Key生命周期与日志；词义/版本漂移；AI结构错误与上游超时；播放失败误计错；幂等/缓存与限额。

## Task 1 后端
- [ ] 先写权限、配置加密、内容投影、供应商失败与提交幂等测试并确认失败。
- [ ] 新增 ai-services 模块、迁移、官方适配器与请求契约。
- [ ] 完成会话校验、复习、生成、音频、提交、历史接口。
- [ ] 测试通过并类型构建。

## Task 2 界面
- [ ] 先写管理端保存/掩码/错误和学生先看后听/答案隐藏测试。
- [ ] 新增AI服务管理分区，两家配置及真实测试试听。
- [ ] 统一单词播放器；新增桌面/移动场景听力入口和恢复。
- [ ] 类型、组件测试、构建通过。

## Task 3 验收审核
- [ ] 冻结全部18条P0、细化Case和suite绑定。
- [ ] 隔离MySQL与真实HTTP鉴权/持久化测试、Cloud浏览器。
- [ ] 真实供应商短句和完整场景调用、音频与桌面移动验证。
- [ ] 独立代码审核与修复重测，归档未执行项，生成HTML/PDF一致报告。

## Task 4 发布
- [ ] 最新生产源与镜像备份；合并本次增量并构建。
- [ ] 加密主密钥受保护注入、兼容迁移、回滚脚本。
- [ ] 通过发布门禁后切换镜像；健康/权限/静态与原业务验证。
- [ ] 更新交付与vault，不记录秘密。
