# 学生练习列表移除与恢复 Implementation Plan

> Use superpowers:executing-plans task-by-task.

**Goal:** 学生按账号持久化移除/恢复收到的练习，保留所有学习数据。
**Architecture:** assignment新增可空hidden_at；列表按active/removed筛选；本人范围幂等状态更新。前端URL保留列表模式、确认框、失败重试与末页校正；不改变访问/提交/统计权限。
**Tech Stack:** NestJS、Sequelize/MySQL、React、Vitest/Jest、Cypress。
**Spec:** docs/prd/reading/features/personal-removal/prd.md（本会话已确认）。

## Global Constraints
保留全部既有dirty；不自动提交/推送；数据库只做向后兼容nullable列；不删除或变更现有业务内容。

## Review Focus
账号隔离、重复并发操作、移除后仍可提交/查成绩、末页删除与URL前进后退、发布源合并及回滚兼容。

### Task 1: 服务端
- [x] 真实隔离MySQL/HTTP测试先观察失败，覆盖移除/恢复/幂等/越权/提交/统计。
- [x] 模型+幂等migration，列表筛选及remove/restore接口；新装SQL和测试harness同步。
- [x] 真实SQL和HTTP回归、后端构建通过。
### Task 2: 学生界面
- [x] 新增取消/确认/错误/恢复/页码校正测试，先红后绿。
- [x] 接入查询参数、移除确认、已移除/恢复、进度和错误反馈；保持学习记录。
- [x] 桌面/手机浏览器和既有阅读回归、构建通过。
### Task 3: 交付
- [x] 独立审查修复，基于最新生产源增量构建/验证。
- [x] 备份DB/源和镜像；先加nullable列，再增量后端/学生资源。失败回退镜像/源，保留兼容列。
- [x] 线上只读验证旧数据默认可见、成绩/原文摘要不变、匿名拒绝和资源SHA；不移除真实学生练习。

## 交付证据
2026-10-20已上线。21项真实SQL/HTTP、13项UI、1条真实API桌面/390px完整流程和前后端生产基线构建通过。两轮独立审查无阻塞。发布证据位于工作区docs/reading-list-removal/evidence/。24表摘要、笔记数据和管理员资源前后一致；148容器资源及公网路径校验通过。未删除真实练习/学习记录，未提交/推送。
