# English World 个人 iPhone App 接入设计

状态：用户于 2026-10-08 明确要求自主推进、只看结果。按此授权直接实现并验证，不再等待逐项审批。

## 目标与已确认约束

将现有 English World 做成实际安装在个人 iPhone 上的 iOS App。使用普通 Apple 账号和本机 Xcode，不上架。前端资源随安装包交付，后端继续使用现有服务器。免费 Personal Team 描述文件有效期为 7 天，到期需要重新构建安装。

## 当前证据（2026-10-08）

- 本机 Xcode 26.1，Node 22.23.2，满足 Capacitor 8 的基础版本要求。
- 用户提供的页面 http://124.223.157.129/englishWorld/recite 返回 200。
- GET http://124.223.157.129/api/notifications/unread-count 返回 JSON 401、业务码 4001，确认 API 路径可达；未尝试登录或更改服务器数据。
- 同 IP 的 HTTPS 请求在 10 秒后超时；不能据此排除服务器配置了其他 HTTPS 域名。
- 本地登录实现设置 HttpOnly、SameSite=Strict Cookie，响应不向前端返回 token。线上实现是否完全一致仍待运行验证。
- 当前 /mobile 已接入首页、词库、详情、新建和编辑；其他多个路由仍显示占位内容。
- 当前工作区有未提交的 Dockerfile、通知和桌面样式修改，必须保留。

## 方案选择

推荐 Capacitor 8 加载安装包内的 React 构建产物，创建 iOS 工程，复用现有后端。

另两条路线：SwiftUI 重写需要重新实现现有界面；直接在容器打开线上网址依赖远程页面，无法交付随包安装的前端。当前需求优先选择复用现有 React 的方案。

## 第一阶段：可安装、可登录的 iOS 基础版本

1. 为 english-world 增加独立 iOS 构建模式、Capacitor 配置和 Swift Package Manager iOS 工程。原生启动进入 /mobile；网页保留现有入口。
2. iOS 构建 API 地址使用 http://124.223.157.129/api。图片、上传等相对资源地址也要检查，防止错误指向应用本地来源。
3. 原生运行时关闭 PWA 的安装提示、Service Worker 注册与更新提示，应用更新通过重新安装完成。
4. 将原生网络和 Cookie 会话适配集中在明确的接口边界。先验证登录、读取当前用户、重启后保持登录、退出后会话失效，再扩大到其他接口。不得通过移除 HttpOnly 或把凭据记录到日志解决问题。
5. 单独验证 fetch 流式响应、EventSource、文件上传下载。不能假设启用 Capacitor HTTP 后所有浏览器接口都自动兼容；若需要专用原生传输或服务端调整，先记录实际失败和最小解决方案，不宣称现有功能已通过。
6. 按实际网络传输方式配置 iOS HTTP 访问。核实 IP 地址在目标 iOS 的 ATS 配置行为，不直接为所有地址全局放开限制。HTTP 连接不加密，后续有 HTTPS 域名时应切换。
7. 核实安全区、键盘、页面返回、发音和前后台切换行为；增加应用图标和显示名称 English World。

## 功能范围与后续阶段

第一阶段交付安装工程和现有移动页面的可运行版本。现有占位页面仍属于未完成功能，不能将第一阶段描述为完整手机版。第二阶段逐项迁移实际学习、复习及工具能力；需要先核对现有桌面行为及旧移动改造计划，不能因包装成 App 而跳过功能实现。

## 验证与完成标准

- 前端类型检查、生产构建和相关回归测试通过。
- iOS 模拟器构建成功，启动进入正确移动路由；网络错误显示明确可恢复状态。
- 使用本地测试服务验证网络及会话逻辑；线上真实账号验证由用户在设备中输入凭据。
- 在用户选择 Personal Team 后完成真机签名和安装；如尚未真机验证，报告为“工程/模拟器已验证，真机待验证”。
- 每个实际启用功能单独确认请求、显示和错误恢复；尚未迁移和未验证项必须列出。
- 提供重建、同步、打开 Xcode 及 7 天后重新安装的操作说明。重新安装时保持 Bundle ID，避免建议用户先卸载造成数据丢失。

## 用户设备操作

用户在 Xcode 中登录 Apple 账号，选择 Personal Team，连接并信任 iPhone，按设备提示开启开发者模式。账号密码不进入项目文件或聊天。当前设备系统版本和配对情况尚未检查，在签名前核实是否受本机 Xcode 支持。

## 参考

- https://capacitorjs.com/docs/getting-started/environment-setup
- https://capacitorjs.com/docs/apis/http
- https://capacitorjs.com/docs/apis/cookies
- https://developer.apple.com/support/compare-memberships/
