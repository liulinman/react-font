---
title: Freewing 品牌统一
status: in-progress
type: feature
created: 2026-10-26
baseline_commit: aeca904
context: []
---
<frozen-after-approval reason="用户已确认图稿、英文名并要求替换涉及处">
## Intent
将用户展示品牌从English World/EW统一为Freewing及批准的书翼世界地标Logo，保留学习英语、自由看世界的寓意。
## Boundaries & Constraints
始终使用branding/freewing批准稿与透明符号源。仅展示名称变化；旧路由、appId、机器协议与数据兼容。原无关untracked文件保留。现有自动交付授权适用，无需再次询问已批准设计。
</frozen-after-approval>
## Code Map
- `branding/freewing/`：批准完整稿和符号源。
- `apps/english-world/src/page/login/`、`EnglishHeader.tsx`、`EnglishWorldContextBar.tsx`、`MobileMorePage.tsx`：学生品牌。
- `apps/admin/src/AdminApp.tsx`：后台品牌。
- `apps/docs/`：文档品牌；正式需求见`docs/prd/settings/features/freewing-brand/prd.md`（相对仓库）。
- `scripts/`、`apps/english-world/scripts/generate-pwa-icons.mjs`：品牌资源与安装图标。
## Tasks & Acceptance
- [ ] 单一品牌资产与可重复派生资源；新增品牌配置与必要测试。
- [ ] 三站全部用户可见品牌替换，favicon/PWA/iOS显示名及图标源同步，保留所有机器标识。
- [ ] PRD入口索引与公开文档同步；构建、局部测试及390px真实页面检查。
- [ ] 独立审查、增量发布与线上核对，保存回滚与交接。
## Verification
学生与后台受影响Vitest、三站构建、PWA检查、真实浏览器登录/管理/文档页面及manifest/资产，既有业务不写入。不是全站PRD验收或原生安装包发布。
## Spec Change Log
