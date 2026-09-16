# 安全防护说明

## 已实施的防护措施

### 1. 速率限制（Rate Limiting）
- **限制**：每个客户端 60 秒内最多 30 个请求
- **识别**：基于 IP 地址 + User-Agent 组合
- **响应**：超限返回 429 状态码和 Retry-After 头
- **自动清理**：每 5 分钟清理过期记录

### 2. 输入验证
- 歌单/歌曲 ID：必须是 1-16 位数字
- URL 白名单：只接受 `*.music.126.net` 域名
- 操作白名单：只允许 `playlist` 和 `play` 两个操作
- 协议强制：所有音频 URL 强制使用 HTTPS

### 3. HTTP 安全头
- `X-Content-Type-Options: nosniff` - 防止 MIME 类型嗅探
- `X-Frame-Options: DENY` - 防止点击劫持
- `X-XSS-Protection: 1; mode=block` - XSS 防护
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
在 Vercel Dashboard 启用：
- **DDoS Protection**（Pro 计划）
- **Firewall Rules**：按地域/IP 封禁
- **Attack Challenge Mode**：疑似攻击时显示验证码

### 监控告警
```bash
# 添加 Vercel Analytics 监控异常流量
npm install @vercel/analytics
```

### 环境变量保护
确保 `.env` 文件不被提交：
```bash
# .env
MUSIC_PLAYLIST_ID=你的歌单ID
```

### Content Security Policy（可选）
如果需要更严格的安全策略，在 `index.html` 添加：
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               connect-src 'self' https://*.music.126.net; 
               style-src 'self' 'unsafe-inline';">
```

## 如果遇到攻击

1. **查看 Vercel 日志**：`vercel logs --follow`
2. **临时封禁**：在 Vercel Dashboard → Settings → Firewall 添加 IP 规则
3. **降低速率限制**：修改 `server/rate-limiter.ts` 中的 `maxRequests` 参数
4. **启用维护模式**：返回静态页面，关闭 API 功能

## 报告安全问题
如果发现安全漏洞，请通过 GitHub Issues 私密报告（不要公开披露）。
