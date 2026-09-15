# 云上电台验证 · 2026-09-15

## 环境与真实接口

- Node.js 24.21.0；API Enhanced 固定版本 4.40.1。
- 无账号 Cookie，未启用解锁或随机地域 IP。使用 eapi、standard 音质和公开热歌榜 `3778678`。
- 首次真实接口探测读取到 200 首歌的榜单元数据。前 12 首中，5 首返回完整 MP3、7 首返回 30 秒试听片段；这个结果会随歌单和上游权限变化。
- 当前网站 `/api/music` 实际返回歌单名称「热歌榜」和前 30 首歌曲。
- 生产预览中点击播放《海屿你》，HTMLAudioElement 实测 `paused=false`、`currentTime=78.931587`、`duration=295.940063`、`error=null`，来源 `m801.music.126.net`。这是实际音频解码/播放验证，不只是拿到一个 URL。
- 收起电台和隐藏场景 UI 后仍在播放。第二首《甲乙丙丁 (你我怎么两清)》显示试听标记，实测时长 30 秒、播放进度 14.94 秒；片段结束后自动开始第三首《明知故犯》。暂停控制和音量滑块均已实际操作。
- 桌面 1280×800 与手机 390×844 CSS 视口已检查，见 [桌面截图](screenshots/cloud-radio-desktop.png) 和 [手机截图](screenshots/cloud-radio-mobile.png)。模拟视口不代表手机真机测试。

## 工程检查

- TypeScript strict、ESLint、Vite 生产构建通过。
- Vitest **37 / 37** 通过：原有 28 项场景测试、8 项电台测试和 1 项编译后函数启动测试。
- 电台测试覆盖歌单规范化/数量上限、缓存和并发合并、失败后重试、试听信息、HTTPS 地址验证、歌单外歌曲拒绝、禁止写操作、错误信息隔离。
- 音频元素在播放器展开/收起之外持久挂载。切歌和取消操作中止旧请求，过期响应不覆盖新歌曲；离开页面时清理请求、定时器和音频。

## Vercel 函数导入修复

- 线上错误：编译后的 `api/music.js` 仍然导入 `../server/netease-radio.ts`，而打包器输出的是 `server/netease-radio.js`，导致 `ERR_MODULE_NOT_FOUND`。Vite 本地预览直接处理 TypeScript，未暴露此问题。
- 在 TypeScript 配置中开启 `rewriteRelativeImportExtensions`，让编译器将相对 `.ts` 导入改写为 `.js`，开发时仍可直接使用 TypeScript。参考 [TypeScript 官方说明](https://www.typescriptlang.org/tsconfig/rewriteRelativeImportExtensions.html)。
- 用官方 `@vercel/node@13.0.1` 的编译、依赖追踪和函数打包流程进行前后对照；本地依赖复用以跳过重复安装。修复前的完整产物复现相同报错，修复后入口导入 `.js`，函数依赖图中的 3 个服务端模块均包含在包内。
- 产物为 2,189 个文件、26,427,048 字节。将整个函数包复制到开发目录以外的独立临时目录，关闭 Node 全局模块搜索后运行：入口正常返回 400（非法操作的预期响应），真实歌单请求返回「热歌榜」及 30 首歌曲，第一首返回可播放的网易云 HTTPS 地址。
- 新增 `tests/server-build.test.ts`：按项目配置编译服务端源码，只留下 JavaScript 产物，在独立 Node 子进程中加载真实 API 入口。已验证该测试在修复前失败、修复后通过；不依赖 Vite 的开发期模块解析。

## 边界

- 已验证本机 Vite 生产预览和官方构建器生成的独立函数包；本文记录不代表已完成 Vercel 线上节点验证。
- 尚未验证 Vercel `iad1` 上游网络、真实域名、Safari/iOS/Android 真机和浏览器后台音频策略。
- 一次临时原生 `<audio controls>` 测试页触发了 Codex 内置浏览器页面崩溃；随后当前产品的自定义播放器成功完成实际播放。
- 播放能力以网易云返回结果为准；试听曲目保持试听，不提供额外解锁来源。
