# 安全防护说明

## 已实施的防护措施

### 1. 速率限制（Rate Limiting）
- **限制**：每个客户端 60 秒内最多 30 个请求
- **识别**：基于 IP 地址 + User-Agent 组合
- **响应**：超限返回 429 状态码和 Retry-After 头
- **过期清理**：不使用定时器（兼容 Serverless）；当记录超过 1000 条时，在下一次检查中惰性清理过期条目
- **边界**：计数保存在函数实例内存中，Vercel 多实例或冷启动后各自独立计数，只能拦截轻度滥用

### 2. 输入验证
- 歌单/歌曲 ID：必须是 1-16 位数字
- URL 白名单：只接受 `music.126.net` 及其子域名
- 操作白名单：只允许 `playlist` 和 `play` 两个操作
- 协议强制：所有音频 URL 强制使用 HTTPS

### 3. HTTP 安全头
- `X-Content-Type-Options: nosniff` - 防止 MIME 类型嗅探
- `X-Frame-Options: DENY` - 防止点击劫持
- `X-XSS-Protection: 1; mode=block` - 兼容性响应头；现代浏览器的 XSS 防护不依赖它
- `Referrer-Policy: strict-origin-when-cross-origin` - 控制引用信息泄露
- `Permissions-Policy` - 禁用不必要的浏览器功能

### 4. 资源限制
- API 超时：8 秒
- 前端请求超时：20 秒
- 歌单缓存：5 分钟（减少上游 API 压力）
- 歌曲数量：最多 200 首

### 5. 请求控制
- 只允许 GET 方法
- 拒绝带有认证信息的 URL（username/password）
- 自动取消重复/过时的请求（前端 AbortController）

## 建议的额外防护（可选）

### Vercel 平台级防护
目前未使用 Vercel Pro；若需要更强的封禁或挑战能力，先核对当前计划支持的防火墙设置，再在 Vercel Dashboard 配置。

### 监控告警

项目已接入 Vercel Web Analytics，用于查看访问量；它不能替代 `/api/music` 的异常请求监控。排查接口滥用时查看 Vercel Function 日志和 429 响应。当前没有 Pro 计划，不接入自定义 Analytics 事件。

### 环境变量保护
确保 `.env` 文件不被提交：
```bash
# .env
MUSIC_PLAYLIST_ID=你的歌单ID
```

### Content Security Policy（可选）

如果要加入 CSP，先按实际的 WebGL、音频、Vercel Web Analytics 和 API 请求列出所需来源，并在预览环境验证后再启用；旧版只包含本站与音乐域名的示例不足以覆盖当前页面。

## 如果遇到攻击

1. **查看 Vercel 日志**：`vercel logs --follow`
2. **临时封禁**：在 Vercel Dashboard → Settings → Firewall 添加 IP 规则
3. **降低速率限制**：修改 `server/rate-limiter.ts` 中的 `maxRequests` 参数
4. **启用维护模式**：返回静态页面，关闭 API 功能

## 报告安全问题
如果发现安全漏洞，请优先使用仓库 Security 页的私密漏洞报告入口（若已启用）；否则通过维护者提供的私下联系方式报告，不要在公开 Issue 中披露细节。
