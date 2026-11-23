# 知识笔记 PRD 入口

## 正式功能目录（与索引同步）

> 当前研发范围：电脑端学生端与管理端，按本功能实际角色适用。移动端仅作历史范围保留，不纳入当前设计、研发与验收；混合条款中的电脑端、业务及数据保护要求继续有效。历史“后续适配移动端”等计划不再默认启动。

### 主要功能

- [长笔记编辑与独立知识笔记](features/knowledge-notes/prd.md)（`notes/knowledge-notes`）
- [知识笔记文件夹管理](features/folders/prd.md)（`notes/folders`）
- [笔记统一阅读展示](features/readable-notes/prd.md)（`notes/readable-notes`）

- [知识笔记 MCP 与确认归档](features/mcp-notes/prd.md)（`notes/mcp-notes`，2026-10-28 用户确认）

### 跨模块关联

- [单词与知识速读复习册](../word-books/features/word-book/prd.md)（`word-books/word-book`，只维护一份正文）
- [桌面词典式词库与文档式知识笔记](../vocabulary/features/dictionary-workspace/prd.md)（`vocabulary/dictionary-workspace`，只维护一份正文）


模块 ID：`notes`。范围：长笔记、独立笔记、关联词条、文件夹和整理。

## 当前需求来源

- [长笔记编辑与独立知识笔记](features/knowledge-notes/prd.md)（需求命名空间：`notes/knowledge-notes`）。
- [知识笔记文件夹管理](features/folders/prd.md)（需求命名空间：`notes/folders`）。

- [笔记统一阅读展示](features/readable-notes/prd.md)（`notes/readable-notes`，2026-10-20 用户确认；更新纯文本阅读约定，保留原文存储）。

## 跨模块需求

- [单词与知识速读复习册](../word-books/features/word-book/prd.md)，主要归属 `word-books`；选择本模块时也需检查相关验收项。

## 覆盖边界与维护

当前状态：已有局部 PRD，模块整体需求尚未确认完整。
模块范围清单只是分类，不新增验收要求，不代表功能已完成或测试已通过。执行测试时必须盘点各来源的全部适用条款、验收标准和决策补充，缺失需求单独报告。
不同功能 PRD 相互补充；只有明确的修订声明才能覆盖旧条款，不能单纯以日期新旧替代。
当前研发仅电脑端学生端与管理端；移动端原需求仅属历史范围，不纳入当前验收；跨模块用例引用同一需求来源并在执行时去重。
新需求在本入口补充或加入 `features/<feature>/prd.md` 并登记上级 `index.json`；不得在交付或历史目录继续维护另一份正文。

- [雅思听力题型与模拟练习](../review/features/ielts-listening/prd.md)（`review/ielts-listening`，电脑端、AI原创、六题型与单部分/全套模拟；已授权研发，尚未上线）

[返回全部模块](../README.md)

- [桌面词典式词库与文档式知识笔记](../vocabulary/features/dictionary-workspace/prd.md)（2026-10-27 用户确认；仅桌面呈现修订）。
