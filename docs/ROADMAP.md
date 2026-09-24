# 云上的春日邮局 · 更新思路

整理日期：2026-09-22。基于提交 `d21ceca` 的代码现状。

## 阅读说明

- 本文回答「这个网页还能如何更新」。构想来自七个视角：访客体验、世界内容、交互与可玩性、分享与留存、工程质量、声音与电台、产品运营。每一条都逐条对照代码核实过，核实结论写在「核实备注」里。
- **投入**：S 半天到一天；M 一到三天；L 一周以上。**影响**：高 / 中 / 低，指对访客体验或项目健康的作用。
- **README 承诺编号**（全文引用）：
  - ① 信件文字不离开页面：不调用邮件或 AI API，不写 localStorage / URL / 控制台，不用 innerHTML。
  - ② 前端代码与字体不依赖外部 CDN，音乐音频除外。
  - ③ 线上不需要常驻 Node 服务、数据库或 SSR。
  - ④ 主岛保留原 HTML 的模型算法、随机调用顺序、固定种子 314159、布局与配色；新内容放副岛、远景、天空、事件层。
  - ⑤ 无障碍：焦点陷阱、Escape、键盘操作、prefers-reduced-motion。
  - ⑥ 常见桌面 GPU 在 1080p 附近 60 FPS。
- 文中「触碰承诺」不表示不能做，只表示要同步改 README 或做产品决定，见第 4 节。
- 本文只提思路，没有修改任何源码。

## 0. 结论摘要

网站的骨架已经完整：体素世界、四季昼夜、事件、热点、寄信回信、邮戳、电台、画质自适应都在。下一步最值钱的不是再加一座岛，而是四件事：

1. **把已有系统的反馈做完整**。核实时发现了几个真实缺陷，回信文字从未显示、电台自动跳过会撞自家限流、热点对键盘用户不可达。
2. **给访客一个再来的理由**。现在每次打开都是同一个黄昏，邮戳刷新即丢。跟随现实时间、节气与节日日历、限定邮戳、本机留存，这一组互相依赖。
3. **让人能把「此刻」带走**。拍照明信片、复制此刻链接、社交预览图，都是纯前端可做的。
4. **补上工程护栏**。没有 CI，视觉回归靠人工截图，Three.js 落后 26 个版本。

## 1. 先修的缺陷

以下都是核实为真的问题，优先于任何新功能。

### 1.1 回信文字从未显示在提示行

`src/scene/createScene.ts` 第 320–325 行：飞艇停靠后先发出回信通知，紧接着同步授予「灯塔」邮戳，邮戳监听器立刻再发一条通知。`src/App.tsx` 第 62–73 行只有一个 `notice` 字符串，React 19 批处理后屏幕上只剩「集到一枚灯塔邮戳」。首次寄信同理：`sendLetter` 内部先授予「樱花」邮戳，写信窗随后写入寄出文案，邮戳通知被覆盖。

修法见 3.1「通知分层与队列」。

### 1.2 电台自动跳过会撞自家限流

`src/components/CloudRadio.tsx` 第 141–157 行：除「需要用户手势」外的任何错误都会 1.5 秒后无条件跳下一首。电台验证记录里前 12 首有 7 首是试听曲，连续 VIP 曲目会打到每 60 秒 30 次的限流，返回的 429 又被当作普通错误再次触发跳过。没有连续失败上限、失败曲目记忆，也不读 Retry-After。`<audio>` 元素自身的 onError 只取消不跳过，与 play() 的 catch 是两套逻辑。

修法见 3.6「播放失败诊断与跳过退避」。

### 1.3 热点对键盘与读屏用户不可达

12 个热点只能靠指针射线点击。`src/scene/types.ts` 第 57 行的 `poke(id)` 注释写着「用于测试和键盘快捷键」，但整个 `src/` 没有调用方，只有 `tests/browser.ts` 用到。这与承诺 ⑤ 有缺口。

修法见 3.5「热点键盘可达与数字键直达」。

### 1.4 没有 CI，且 dist 已过期

仓库没有 `.github/` 目录，typecheck / lint / test / build 全靠手动。`docs/VALIDATION.md` 记录过带三个失败测试推送的情况。`dist/` 建于 9 月 16 日，早于 9 月 21 日的「living world」提交，任何基于当前 dist 的体积预算都会被新构建打破。

修法见 3.7「GitHub Actions 质量门禁」。

### 1.5 两处小缺口

- 场景 API 的 `setSoundVolume` 存在，但没有任何界面调用它，环境音音量无法调节。
- `index.html` 缺 canonical、og:url、og:image、twitter:card、manifest；meta description 与 og:description 文案不一致。

## 2. 快赢清单

S 级投入、价值明显，可以随时开工。详情在第 3 节对应条目。

| 条目 | 影响 | 一句话 |
| --- | --- | --- |
| 通知分层与队列 | 高 | 修复 1.1，回信与邮戳不再互相覆盖 |
| 补全社交预览与 canonical | 高 | 构建期从 Vercel 变量读域名，缺失时不输出 |
| GitHub Actions 质量门禁 | 高 | typecheck / lint / format:check / test / build |
| 热点键盘可达与数字键直达 | 高 | 修复 1.3 |
| 开场落地镜头与加载淡出 | 高 | 第一印象从「弹出静止图」变成「飞艇靠岸」 |
| 热点悬停可见与微反应 | 中 | 鼠标划过变手形，对象轻微呼吸 |
| 春风吹遍群岛 | 中 | 云、鸟、蝴蝶、萤火虫、风车都开始读风力 |
| 时令邮戳与时刻快捷芯片 | 中 | 黎明 / 正午 / 黄昏 / 星夜一点即到 |
| 月相与中秋满月 | 中 | 零 draw call |
| 孔明灯夜放、晨雾云海涨潮、夏夜雷阵雨 | 中 | 三个新随机事件，复用现有事件层 |
| 收藏与播放记忆 | 中 | 音量、模式、上次听到的歌 |
| 声音邀请与侧栏开关 | 中 | 不必再进指南面板开声音 |
| 音效字幕 | 中 | 静音与听障访客的等价反馈 |
| 每日一句与节气问候 | 中 | 同一天所有人看到同一句 |
| 用集到的邮戳寄信 | 中 | 邮票真的贴在 3D 信封上 |
| 星座连线与七夕 | 低 | 两次 draw call |
| 邮局护照导出导入 | 低 | 依赖本机留存 |
| 制作说明与更新记录面板 | 低 | 版本变化时「?」按钮出现小点 |

## 3. 七个方向

每条格式：投入 / 影响；做什么；怎么做；关键文件；核实备注。

### 3.1 反馈与第一印象

#### 通知分层与队列 · S / 高

- 做什么：单行提示改为最多两条叠放的通知。点击文案互相替换；事件与换季排队；回信与邮戳用明信片 / 印章样式停留 8 秒。回信通知带季节小圆章，可点击直接打开信箱；寄信成功通知附「登船跟随」一键进入 ride 视角。
- 怎么做：`App.tsx` 把 `notice: string` 改为带类型、key 与可选 action 的数组，按 type 分流并各自计时（tap 4 秒、event/season 5 秒、reply/stamp 8 秒）。抽成 `src/components/NoticeStack.tsx`，整体仍是一个 `aria-live="polite"` 区域，只有带 action 的条目渲染为按钮。样式复用 `.reply-season` 圆章、`.stamp-slot.earned b` 旋转印章与 `badge-pop` 关键帧。
- 关键文件：`src/App.tsx`、`src/components/NoticeStack.tsx`、`src/styles/overlay.css`。
- 核实备注：直接修复 1.1。`.hint` 的底部偏移有四套媒体查询，叠放两条后要在 390×844 与横屏 540 高度下复核。

#### 开场落地镜头与加载淡出 · S / 高

- 做什么：加载完成不再硬切。加载页 0.7 秒淡出的同时，相机从稍远、稍高、稍偏的位置在约 1.6 秒内滑入默认构图，标题与底栏错落淡入。
- 怎么做：`camera.ts` 新增 `arrive()`，记录一个定时缓动 `{ t, duration: 1.6 }`，在 update 里用 smoothstep 把偏移量叠加到已插值的方位角、仰角、距离上。任何交互、预设、跟随或 reduced-motion 直接把缓动置空。`App.tsx` 给 LoadingScreen 传 `done`，加 `loaded` 类延迟 700 毫秒再卸载。`SceneOptions` 加 `skipArrival`，`tests/browser.ts` 传 true 保持截图基线。
- 关键文件：`src/scene/core/camera.ts`、`src/scene/createScene.ts`、`src/App.tsx`、`src/components/LoadingScreen.tsx`、`src/styles/overlay.css`。
- 核实备注：原方案「只改当前值靠现有阻尼滑入」不成立，方位角阻尼时间常数约 0.14 秒，偏移在 1 秒内就衰减完，全藏在加载页淡出后面。淡入 keyframes 要用 `animation-fill-mode: backwards`，否则会覆盖 `.minimal` 的 opacity 规则导致 H 键隐藏失效。`global.css` 里的 `.loader.loaded` 淡出规则目前没有任何 TSX 使用。

#### 热点悬停可见与微反应 · S / 中

- 做什么：鼠标划过 12 个热点时光标变手形，对象轻微「呼吸」：灯笼微晃、猫尾巴动一动、灯塔亮一瞬。触屏保持现状。
- 怎么做：`camera.ts` 的 pointermove 已在非触屏时计算射线，紧接着对 hits 求交，命中 id 存为 hoverId，设置 `canvas.style.cursor`，暴露 `onHover`。`createScene.ts` 在 hover 进入时调用 `impulses[id].hit(0.12)`，树用 0.05 以免花瓣明显增多。
- 关键文件：`src/scene/core/camera.ts`、`src/scene/createScene.ts`、`src/scene/systems/interactions.ts`。
- 核实备注：hits 共 13 个对象，灯笼两个盒共用一个 id，进入 / 离开要按 id 去抖。inline `cursor: pointer` 会覆盖 `#world:active { cursor: grabbing }`，拖动时要清掉。风车的冲量会累加进 windmillSpin，悬停会让风车多转一点，可接受。

#### 声音邀请与侧栏开关 · S / 中

- 做什么：首次点击画布后出现一次性可点击邀请「这座岛有风声和虫鸣，要打开吗？」；侧栏加喇叭圆钮随时开关；快捷键 M。
- 怎么做：`App.tsx` 新增 `sound-asked` 标记，首次手势且未开启时向通知队列压入一条带 action 的邀请。`SceneOverlay.tsx` 侧栏加 `.round` 按钮，`aria-pressed` 绑 `snapshot.sound`。
- 关键文件：`src/App.tsx`、`src/components/SceneOverlay.tsx`、`src/components/HelpPanel.tsx`、`src/styles/overlay.css`。
- 核实备注：现有的一次性 arm 监听只在「上次已开启」时注册（`App.tsx` 第 86 行提前 return），邀请逻辑要自己注册监听。侧栏现有 5 个圆钮，横屏 540 高度下间距已压到 3 px。M 键无冲突。

#### 音效字幕：无声替代反馈 · S / 中

- 做什么：指南面板加「音效字幕」开关。开启后岛上的声音以一行轻字幕出现：「叮，邮局的门铃」「雨声渐起」「夏夜的蛙鸣开始了」；电台开始播放时显示歌名与歌手。
- 怎么做：`ambience.play(name)` 在早退之前广播 cue。阈值穿越检测（雨 0 到大于 0.3、蟋蟀增益出现、入冬）做成纯函数 `soundCues(prev, next)` 放在 `createScene.ts` 的 animate 里，那里每帧已有 rain、night、季节权重。`SceneNotice` 增加 `sound` 类型，`setCaptions(on)` 控制，同一 cue 8 秒内不重复。
- 关键文件：`src/scene/systems/ambience.ts`、`src/scene/createScene.ts`、`src/scene/types.ts`、`src/App.tsx`、`src/components/HelpPanel.tsx`、`tests/world.test.ts`。
- 核实备注：原方案把检测放在 `Ambience.update()` 里是错的，该方法在音效未开启时直接 return，字幕的目标人群正是静音用户。强化承诺 ⑤。

#### 首访三步轻引导 · M / 高

- 做什么：第一次来访、场景就绪 4 秒后依次出现三个可跳过的轻引导：「点一点樱花树」「拖一拖，看看灯塔那边」「寄一封春天」。每步完成时樱花树轻抖、一声 pop。之后不再出现，指南里可重开。
- 怎么做：新建 `src/components/Guide.tsx` 状态机 tapTree → drag → send。第一步用 tap 通知的 id 判定；第二步用 camera 新增的 `orbited` 标志（只在真正环视时置真：pointermove 改了目标角、wheel、方向键）；第三步用 `snapshot.sentCount`。新增 `nudge(id, amount)` 控制器方法只触发冲量不发文案不计邮戳，让树「招手」。
- 关键文件：`src/components/Guide.tsx`、`src/App.tsx`、`src/scene/createScene.ts`、`src/scene/core/camera.ts`、`src/scene/types.ts`、`tests/world.test.ts`。
- 核实备注：原方案用 `interact()` 判定拖动是错的，它在 pointerdown 和所有控件操作时都会被调用，第一步点树就会把第二步自动完成。移动端第二步文案换成「滑一滑」。引导期间抑制声音邀请。

#### 情境文案系统 · M / 高

- 做什么：岛上的话随此刻变化。夜里小兔「借着灯笼的光还在写」，雨天猫「躲到长椅下只露尾巴」，冬天樱花树「攒着劲等开春」，寄过信后小兔说「你的那封我帮你贴好了邮票」，回信提到路上刚遇见的云鲸或那场太阳雨。换季那一刻樱花树抖落一阵花雨、落叶或雪。
- 怎么做：新建 `src/scene/systems/script.ts`，纯函数 `pickLine(id, ctx, cursors)`，ctx 含季节、时刻、夜色、雨、事件、风、寄信数、回信数、邮戳、是否跟随。每热点一组带条件的规则，按热点独立 cursor 轮换。`REPLIES` 改为 `pickReply(season, { lastEvent, night })`。换季分支加 `impulses.tree.hit(1.2)` 与 `ambience.play("rustle")`。
- 关键文件：`src/scene/systems/script.ts`、`interactions.ts`、`postcards.ts`、`airshipFlight.ts`、`createScene.ts`、`src/components/LetterDialog.tsx`、`tests/world.test.ts`、`tests/core.test.ts`。
- 核实备注：现有 `HOTSPOT_LINES` 每热点两句且用跨热点共享的全局 lineIndex；`scheduler.last` 已记录上一次事件可直接用。`sampleFlight` 是被测试直接调用的纯函数，季节化航程字幕应在 createScene 里按 phase 映射，不改它的签名。文案量约 12 热点 × 6 句加 4 季 × 8 句。

#### 回信仪式：未读明信片与侧目 · M / 高

- 做什么：明信片落进邮筒后留在投信口探出一角作为未读状态，邮筒轻轻晃一下；访客闲着时相机温柔地看向邮筒 3 秒再回来；打开信箱后收起。信箱里的回信按明信片样式渲染并标注「秋 · 黄昏」。
- 怎么做：`interactions.moments` 新增 `land` 冲量，在 `postcard.update` 返回 true 那一帧触发，`o.mailbox.rotation.z` 用赋值而非累加。`createPostcardFlight` 增加 resting 状态与 `hide()`。`camera.ts` 新增 `glance(point, distance, seconds)`，保存目标焦点与距离，任何交互立即还原并暂停自动环视的累加。把 `TimeControls.tsx` 里的时段规则抽成 `src/scene/systems/dayPhase.ts` 共用。
- 关键文件：`postcards.ts`、`interactions.ts`、`camera.ts`、`createScene.ts`、`types.ts`、`App.tsx`、`PostcardPanel.tsx`、`tests/browser.ts`。
- 核实备注：原方案复用 `moments.reply` 做邮筒晃动时机错误，它在明信片起飞时触发，飞行 3.2 秒后只剩约 8%，落地时几乎不动。邮筒网格不改，静止时归零，与现有 tap 反应同一做法。

#### 闲置导演相机与漫游 · L / 高

- 做什么：停留超过一分钟无人操作时，相机慢慢滑向樱花树下、码头邮差、花园风车、夜里的灯塔、远处茶山，每站停 20–30 秒配一句淡字幕；云鲸、热气球、流星出现时镜头转过去看；任何拖动立刻交还控制。
- 怎么做：在 glance 之上，`camera.ts` 新增 Tour 状态与航点表，`src/scene/systems/tour.ts` 放航点与选择逻辑，坐标取 `worldLayout.ts` 各岛中心、树与邮差位置。灯塔站只在夜间加入，远岛站只在非低画质加入。`SceneNotice` 加 `tour` 类型。
- 关键文件：`camera.ts`、`tour.ts`、`createScene.ts`、`types.ts`、`App.tsx`、`overlay.css`、`tests/world.test.ts`、`tests/browser.ts`。
- 核实备注：`whaleCurve` / `balloonCurve` 是 `events.ts` 的私有常量，需要导出或由 director 提供 lookPoint。「闲置 60 秒」需要 camera 暴露 lastInput。远岛近景的真实成本是填充率与建模精度，不是实例数，需要视觉核对而非帧率核对。先落地 glance 再扩展。

### 3.2 回访动机

#### 跟随现实时间与季节 · M / 高

- 做什么：开关「跟随现实」打开后，岛上的时辰与季节跟随访客本地时间与月份（3–5 月春、6–8 夏、9–11 秋、12–2 冬），并记住偏好。晚上打开是星夜，秋天打开是枫红。同时支持 `?hour=6.5&season=2` 分享某个时刻。
- 怎么做：`SimulationClock` 增加可选 `hourSource`，设置后 time 照常推进（飞艇、粒子、事件、风都继续），hour 直接取来源值。`SeasonClock` 增加 hold 标志，跟随时跳过 advance，year 停在「季内 0.08」位置以保证配色稳定。`SceneController` 新增 `setRealTime(on)` 与 `setYear(year)`。拖滑块、点季节按钮自动退出跟随并提示。`SceneOptions` 加 `initial: { hour, year }` 让首帧就落在正确时刻。URL 参数只接受有限数字，解析后调用一次，不进入跟随模式。
- 关键文件：`src/scene/core/simulationClock.ts`、`src/scene/systems/season.ts`、`createScene.ts`、`types.ts`、`src/hooks/useSceneController.ts`、`TimeControls.tsx`、`HelpPanel.tsx`、`App.tsx`、`tests/core.test.ts`、`README.md`。
- 核实备注：四个视角独立提出。两个错误方案已排除：「每 60 秒校正一次」会让天空先走一小时再跳回，每分钟抽搐一次，因为 ×1 时一天只有约 23.5 真实分钟；「用 setSeason 表达小数年份」不行，它会 floor 到整季。**默认开启触碰承诺 ④**，首帧不再等于 `reference-dusk.png`，9 月打开就是秋色；建议默认保持经典黄昏，跟随做显式开关，若日后默认开启则提供 `?classic=1` 给视觉基线。深夜首屏偏暗要配首访提示，暂停时 hour 也要冻结。南半球反季先不自动判断。

#### 邮局历书、每日一句与节气 · S–M / 高

- 做什么：页脚 TODAY'S LITTLE JOURNEY 下多一行随日期变化的内容，如「9 月 23 日 · 秋分 · 昼夜从今天开始平分」；同一天所有人看到同一句。节气当天进入页面多一条问候。按日期决定「今日」偏爱的惊喜：周末更常有云鲸、雨季更常有太阳雨。第二次以后来访显示「欢迎回来，这是你第 N 次来到邮局」，连续 3 个不同日期来访解锁「常客」邮戳。
- 怎么做：新建 `src/content/calendar.ts`：`solarTerm(date)` 用 2026–2032 的节气公历日期表；`dailyLine(date)` 用 `seededRandom.ts` 的 `hash(年, 年内第几天)` 在约 60 条短句里确定性抽取。`EventScheduler` 构造函数新增可选 `weights` 参数在抽样时加权。`src/persist/visits.ts` 存首次日期、去重日期列表与次数。`StampBook` 增加 `visitDays(n)`。
- 关键文件：`src/content/calendar.ts`、`src/content/lines.ts`、`src/persist/visits.ts`、`src/App.tsx`、`events.ts`、`postcards.ts`、`tests/calendar.test.ts`。
- 核实备注：`.notes` 在 850 px 以下被隐藏，手机上要放进 `.mobile-journey`。`visitDays` 若在 `stamps.onEarn` 注册之后调用，每次加载天数 ≥ 3 都会重放提示音，需先恢复已获得邮戳或在注册前调用。节气表要注明年份范围，超出时静默不显示。文案质量决定一切。

#### 农历节日日历与限定装饰邮戳 · M / 高

- 做什么：中秋当晚月亮圆满、温泉村升起天灯、回信带月饼味；元宵前后花园岛吊桥挂满红灯笼；七夕夜里流星格外多、天空多一道淡淡的星桥；春分「花见」、夏至「长日」、七夕「鹊桥」、中秋「望月」、冬至「暖汤」、元旦「新岁」各一枚只在当天能集到的限定邮戳，当天寄出一封信即可获得。
- 怎么做：`calendar.ts` 增加 `lunarDate(d)`，用 `Intl.DateTimeFormat('zh-CN-u-ca-chinese', { month: 'numeric', day: 'numeric' }).formatToParts` 取农历月日，不支持时返回 null 全部静默关闭。`festival.ts` 控制装饰可见性并给 `eligibleEvents` 的 ctx 加 festival 字段调权重。装饰按 `visitors.ts` 的「建一次、默认隐藏」模式：天灯 InstancedMesh 从温泉村上升、红灯笼挂花园岛与灯塔岛并入 farDetail、星桥 Points。`STAMPS` 增加 `limited: true` 条目，`PostcardPanel` 单独一行「限时」区。`?classic=1` 同时关闭日历。
- 关键文件：`src/content/calendar.ts`、`src/scene/systems/festival.ts`、`events.ts`、`src/scene/objects/festive.ts`、`createWorld.ts`、`nightSky.ts`、`postcards.ts`、`createScene.ts`、`PostcardPanel.tsx`、`tests/calendar.test.ts`。
- 核实备注：Node 22 里 Intl 中国日历对 2026-09-25 返回八月十五、2026-02-17 返回正月初一，可用；闰月年份（2028 闰五月）month 部件带闰标记需解析或跳过。`STAMPS` 是 `as const`，`StampId` 自动扩展。限定邮戳依赖下一条的本机留存，否则次日即失。装饰若进入默认视角首帧会轻触承诺 ④，只挂副岛、远岛与天空并尽量夜间显示。首版建议只做中秋、元宵、七夕。

#### 邮戳、回信与计数本机留存 · M / 高

- 做什么：刷新或隔天回来，信箱里的邮戳、收到过的回信和「累计放飞 N 封」都还在；界面显示「本次已放飞 02 封 · 累计 17 封」；信箱面板底部提供「清空收藏」。信件文字依旧只在内存里。
- 怎么做：新建 `src/persist/storage.ts` 带命名空间与版本的读写，统一 try/catch，把 `App.tsx` 现有的 time-collapsed 与 sound 两处改为调用它。`StampBook` 增加 `toJSON()` / `from(json)`，`ReplyLedger` 增加 `restore(list)`，只接受文本属于 `REPLIES` 池的条目。`SceneOptions` 加 `initial: { stamps, visitDays }`，在 `stamps.onEarn` 注册之前恢复。写回挂在 `type: "stamp"` 通知上而不是 `useEffect([snapshot.stamps])`。`PostcardPanel` 加「以前收到的回信」分组与清空按钮，去掉「刷新后清空」文案。
- 关键文件：`src/persist/storage.ts`、`postcards.ts`、`types.ts`、`createScene.ts`、`App.tsx`、`PostcardPanel.tsx`、`tests/world.test.ts`、`README.md`。
- 核实备注：**触碰承诺 ① 的措辞**。README 第 45 行写「不保留历史、不写 localStorage、刷新后计数清空」，面板第 87 行写「只保存在当前页面，刷新后清空」。承诺的实质对象是信件文字，这里只存枚举 id、固定文案池索引与数字，但文案必须同步改。恢复必须直接写入集合而不走 `award`，否则加载时连播 8 次音效与通知。`snapshot.stamps` 每 300 毫秒都是新数组，不能作为 effect 依赖。手机上 `.stamp-grid` 四列且提示文字隐藏，可改两列。

#### 邮局护照：导出与导入收藏 · S / 低

- 做什么：信箱面板「导出护照」下载一个 JSON（邮戳、回信、累计计数、首次来访日期），「导入护照」选择文件恢复到另一台设备。
- 怎么做：`src/persist/passport.ts` 生成与校验，手写类型守卫：stamp id 必须在 `STAMPS` 中、reply 文本必须在 `REPLIES` 池、数字有限非负、数组长度上限。运行中的场景需要 `controller.grantStamps(ids)`。
- 关键文件：`src/persist/passport.ts`、`PostcardPanel.tsx`、`createScene.ts`、`types.ts`、`tests/persist.test.ts`。
- 核实备注：前提是本机留存先落地。导入内容仍用 React 文本节点渲染，不违反承诺 ①。

### 3.3 分享

#### 补全社交预览与 canonical · S / 高

- 做什么：链接贴进微信、Slack、X 时有标题、描述和一张黄昏邮局大图。
- 怎么做：Vite 插件在构建期读 `VERCEL_PROJECT_PRODUCTION_URL`（或自定义 `SITE_URL`），存在时向 `index.html` 注入 canonical、og:url、og:image、twitter:card；缺失时一概不输出。og 图用 `reference-dusk.png` 裁成 1200×630 放进 `public/`。统一 meta description 与 og:description。
- 关键文件：`index.html`、`vite.config.ts`、`public/`。
- 核实备注：不硬编码域名，与「不伪造」的记录一致。修复 1.5 的后半条。

#### 拍照：导出此刻明信片 · M / 高

- 做什么：侧栏相机按钮，隐藏界面后截下当前画面，加季节邮框、日期与邮戳，下载为 PNG 或调起系统分享。
- 怎么做：渲染管线是同步的，在同一帧 `renderer.render()` 之后立刻 `canvas.toBlob()` 即可拿到画面，不需要开 `preserveDrawingBuffer`。邮框在 2D canvas 上合成，文字用已打包的本地字体。`navigator.share` 支持文件时优先分享，否则下载。
- 关键文件：`src/scene/core/renderer.ts`、`createScene.ts`、`types.ts`、新建 `src/components/PhotoButton.tsx`、`SceneOverlay.tsx`。
- 核实备注：若日后开启后处理，截图要在最终合成之后。「寄信时把这句话印上明信片」是可选扩展，触碰承诺 ①，见第 4 节第 5 条。

#### 复制此刻 · S / 中

- 做什么：一键复制链接，对方打开就是同一季节、时刻、视角，正在发生的事件也会重演。
- 怎么做：把 season、hour、视角预设、事件 id 编码进 URL 查询参数；解析时只接受白名单常量与有限数字，季节、视角、事件的白名单常量都已导出。与「跟随现实时间」共用 `initial` 入口。
- 关键文件：`App.tsx`、`createScene.ts`、`events.ts`、`types.ts`、`tests/core.test.ts`。
- 核实备注：URL 里绝不出现信件文字，符合承诺 ①。

#### PWA 与离线 · M / 中

- 做什么：可安装到桌面与主屏，离线时整座岛照常运行，只有电台提示「离线中」。
- 怎么做：所有模型与贴图都是程序化生成，缓存构建产物与字体即可。manifest 与图标放 `public/`，service worker 对 `/api/music` 走网络优先。
- 关键文件：`public/manifest.webmanifest`、`public/sw.js` 或 `src/sw.ts`、`index.html`、`src/main.tsx`、`CloudRadio.tsx`。
- 核实备注：service worker 源文件若放进 `src`，会被现有 tsconfig 的 DOM lib 卡住，要单独的 tsconfig 加 WebWorker lib，或直接写成 `public/` 下的纯 JS。必须放行 Vercel 统计脚本路径 `/_vercel/insights/*`，否则统计失效。

### 3.4 世界内容

原则：全部放副岛、远景、天空、事件层，不动主岛随机序列（承诺 ④）。

#### 春风吹遍群岛 · S / 中

- 做什么：风变大时云走得更快、鸟逆风变慢、蝴蝶被吹偏、萤火虫聚成一团、风车加速。
- 怎么做：各系统从 `WindSystem` 读当前风力与方向，而不是各自的常数。
- 关键文件：`src/scene/systems/wind.ts`、`clouds.ts`、`wildlife.ts`、`ambient.ts`、`createScene.ts`、`tests/world.test.ts`。
- 核实备注：现在云、鸟、蝴蝶、萤火虫、风车都不读风力。累积量（如风车转角、云的偏移）要放进 `WindSystem` 才能单元测试。

#### 月相与中秋满月 · S / 中

- 做什么：月亮按真实日期显示盈亏，中秋必圆。
- 怎么做：按朔望月 29.53 天由日期算相位，在月亮材质上用一个 uniform 画暗面，零新增 draw call。
- 关键文件：`nightSky.ts`、`src/content/calendar.ts`。

#### 三个新事件：孔明灯夜放、晨雾云海涨潮、夏夜雷阵雨 · S / 中

- 做什么：夜里温泉村放起一串孔明灯；清晨云海漫过下层岛基再退去；夏夜远处闪电、雨声加重。
- 怎么做：接入 `events.ts` 的 `eligibleEvents`，分别复用实例化粒子、水面高度 uniform、天空亮度脉冲，均零新增 draw call 或复用已有网格。
- 关键文件：`events.ts`、`water.ts`、`sky.ts`、`dayNight.ts`、`ambience.ts`、`tests/world.test.ts`。
- 核实备注：闪电要尊重 prefers-reduced-motion，改为柔和变亮，不闪烁。

#### 冬夜极光 · M / 中

- 做什么：冬季晴夜，北方天空飘一条缓慢流动的绿紫光带。
- 怎么做：照搬 `rainbow.ts` 的弧带网格法，换成加色混合与噪声流动的着色器。
- 关键文件：`src/scene/objects/aurora.ts`、`createWorld.ts`、`events.ts`。

#### 星座连线与七夕 · S / 低

- 做什么：星夜里偶尔连出几个星座，七夕夜牛郎织女之间架起星桥。
- 怎么做：一组 LineSegments 加一组 Points，两次 draw call。
- 关键文件：`nightSky.ts`、`festival.ts`。

#### 节日限定装饰 · M / 中

- 做什么：见 3.2 农历节日条目，装饰随节日挂上取下。
- 怎么做：借用 `seasonalColors.ts` 里「缩放为 0 即隐藏」的机制，按季节 / 节日权重缩放。

#### 灯塔海鸥 · M / 低

- 做什么：一群海鸥绕灯塔盘旋，偶尔落在栏杆上。
- 怎么做：单个 InstancedMesh 加顶点着色器拍翅位移。
- 核实备注：现有鸟是 15 次 draw call 且不投影，海鸥不能照抄这种做法，否则性能预算（承诺 ⑥）吃紧。

#### 飞艇停靠花园岛 · M / 中

- 做什么：飞艇航线多一站花园岛，短暂停靠再出发。
- 怎么做：在 `airshipFlight.ts` 航线中插入停靠段，但保持一圈仍为 76 秒；停靠段速度为零，要手动补零速测试。
- 关键文件：`airshipFlight.ts`、`tests/world.test.ts`。
- 核实备注：`sampleFlight` 被测试直接调用，改动后全部航程测试需重跑。

#### 驿站岛与索道缆车 · L / 中

- 做什么：新的一座驿站岛，由缆车与主岛相连，缆车来回运送邮包。
- 怎么做：新地形必须追加在温泉村之后生成，否则会移动远景岛的随机序列。
- 关键文件：`archipelago.ts`、`farIslands.ts`、`worldLayout.ts`、新建 `ropeway.ts`。
- 核实备注：唯一的 L 级内容项，建议在视觉回归基线建立后再做。

### 3.5 交互与玩法

#### 热点键盘可达与数字键直达 · S / 高

- 做什么：指南面板列出 12 个热点的真实按钮；画布聚焦时按 1–9、0 等数字键直接触发。
- 怎么做：按钮与键盘都调用已有的 `poke(id)`；按钮文字就是热点名称，读屏可读。
- 关键文件：`HelpPanel.tsx`、`SceneCanvas.tsx`、`types.ts`。
- 核实备注：直接修复 1.3。数字键不与现有快捷键冲突，但要在焦点位于输入框时忽略。

#### 时令邮戳与时刻快捷芯片 · S / 中

- 做什么：时间控件旁四个芯片「黎明 / 正午 / 黄昏 / 星夜」一点即到；在对应时刻寄信可集到四枚时令邮戳。
- 怎么做：芯片调用已有的 setHour；时段规则与回信仪式共用 `dayPhase.ts`。
- 关键文件：`TimeControls.tsx`、`dayPhase.ts`、`postcards.ts`。

#### 视角预设扩展与双击飞行 · M / 中

- 做什么：预设扩展到花园、灯塔、茶山、温泉村；双击热点平滑飞过去；闲置自动环视改为沿样条巡游，而不是单轴转圈。
- 怎么做：`camera.ts` 增加预设表与样条插值；双击用现有射线求交。
- 关键文件：`camera.ts`、`worldLayout.ts`、`ActionControls.tsx`。

#### 指针即存在与长按抚摸 · S–M / 低

- 做什么：指针附近花瓣轻轻让开；长按猫或兔子是「抚摸」，会有专属反应。
- 怎么做：pointermove 已有射线；长按用计时器加移动阈值。

#### 小玩法：春日回声、拾花瓣、群岛寻宝 · M / 中

- 做什么：点击的节奏被山谷回声重复一遍；接住飘落的花瓣可计数；每周一次的寻宝线索藏在各岛。
- 核实备注：计数与寻宝进度依赖本机留存。

#### 追流星许愿 · S / 低

- 做什么：流星出现时点中它，许愿成功得一枚邮戳。
- 核实备注：隐藏对象的命中盒仍会被射线击中，求交前必须过滤 `visible === false` 的对象。

#### 用集到的邮戳寄信 · S / 中

- 做什么：写信时从已集邮戳里挑一枚，贴在飞出去的 3D 信封上。
- 关键文件：`LetterDialog.tsx`、`envelope.ts`、`letterDelivery.ts`。

#### 第一人称岛上散步 · L / 中

- 做什么：切换到小兔视角，在主岛上走一圈。
- 核实备注：需要碰撞与地面高度查询，主岛现有体素数据可复用；与闲置导演相机同属 L 级，排在最后。

### 3.6 声音与电台

#### 播放失败诊断与跳过退避 · S / 高

- 做什么：修复 1.2。连续失败按 1.5、3、6、12 秒退避，连续 5 次停止并提示；失败曲目记入本次会话不再重试；429 按 Retry-After 等待。
- 怎么做：把 play() 的 catch 与 `<audio>` 的 onError 合并为同一个 `handleFailure(reason)`；服务端 429 带 Retry-After 头。
- 关键文件：`CloudRadio.tsx`、`server/rate-limiter.ts`、`server/music-handler.ts`、`tests/music.test.ts`。

#### 收藏与播放记忆 · S / 中

- 做什么：记住音量、播放模式、上次听到的歌；可以收藏喜欢的曲目。
- 核实备注：存曲目 id 与数字，走 `src/persist/storage.ts`。

#### 季节音景与热点音效 · M / 中

- 做什么：四季各有底噪（春鸟、夏蝉、秋虫、冬风），12 个热点各配一声。
- 关键文件：`ambience.ts`、`interactions.ts`。

#### 统一混音台 · S / 中

- 做什么：一个面板里分别调环境音、音效、电台音量。
- 核实备注：`setSoundVolume` 已存在但界面从未调用，修复 1.5 前半条。

#### 歌词同步 · M / 中

- 做什么：电台下方滚动显示当前歌词。
- 怎么做：上游包已有 lyric 接口；只在展开歌词时惰性拉取，避免撞限流。

#### 多频道与歌单预检 · M / 中

- 做什么：按季节与入夜自动选台；歌单加载时预检可播性，跳过 VIP 曲目。
- 怎么做：服务端改为多歌单独立缓存，歌单 id 由环境变量配置。
- 关键文件：`server/music-service.ts`、`server/netease-radio.ts`、`api/music.ts`。

#### 花园岛留声机与灯塔雾号 · S–M / 低

- 做什么：点留声机切电台，夜雾中灯塔每隔一阵低鸣。

#### 岛上音乐盒 · M / 中

- 做什么：网易云不可用时，用 WebAudio 生成每日不同的八音盒旋律。
- 核实备注：种子必须用整数（如年内第几天），否则每天旋律相同。

#### 音乐律动 · L / 低

- 做什么：灯笼亮度、飞艇螺旋桨随音乐节拍律动。
- 核实备注：前提是网易云 CDN 返回 CORS 头，否则 AnalyserNode 只能读到静音。先写探测脚本确认，再投入。

### 3.7 工程护栏

#### GitHub Actions 质量门禁 · S / 高

- 做什么：每次 push 与 PR 跑 typecheck、lint、format:check、test、build。
- 关键文件：`.github/workflows/ci.yml`。
- 核实备注：修复 1.4。同时清掉过期的 `dist/`，或确认它已被忽略。

#### Playwright 视觉回归 · M / 高

- 做什么：固定季节、时刻、种子下截图比对主岛，守住承诺 ④。
- 怎么做：忽略规则与 eslint 配置里已有 Playwright 的痕迹，`tests/browser.ts` 已有确定性的 visual 模式。事件调度器要注入固定随机。
- 核实备注：要用 dev server 而不是 preview，preview 下测试页不会被构建。Three.js 升级前必须先有这条基线。

#### 补测试 · S–M / 中

- 限流器、相机数学、季节调色板目前没有单元测试。
- 组件测试：Vitest 4 已移除 `environmentMatchGlobs`，要用 `projects` 分出 jsdom 项目，并 stub 掉 jsdom 缺失的 `HTMLDialogElement.showModal`。

#### 拆分与去重 · M / 中

- `createScene.ts` 近 500 行，拆出事件接线、通知、音效三块。
- 三份 CSS 里重复的断点抽成共享自定义媒体查询或统一常量。

#### Three.js 升级到 0.186 · M / 中

- 核实备注：从 r182 起 `PCFSoftShadowMap` 已弃用，换成 `PCFShadowMap` 会改变阴影观感，直接触碰承诺 ④。必须先有视觉回归基线，见第 4 节第 7 条。

### 3.8 运营

#### 制作说明与更新记录面板 · S / 低

- 做什么：关于页讲清这座岛怎么做的；更新记录按版本列出，版本变化时「?」按钮出现小点。
- 核实备注：已读版本号存本机，依赖留存决定。

#### 换季歌单 · S / 中

- 做什么：四个公开歌单由环境变量配置，随季节切换。与多频道合并实施。

#### 中英双语 · L / 中

- 核实备注：约 180 处中文散落在 22 个文件里。先做 key 化重构，再翻译；文案质量要求高，不建议机翻。

## 4. 需要拍板的取舍

以下每条都触碰 README 里的明确承诺。构想本身都可行，但要改文档或做产品决定。

1. **本机留存邮戳、回信、累计计数**（承诺 ①措辞）。建议做：只存枚举 id 与数字，绝不存信件文字，同步改 README 与面板文案并加清空按钮。恢复时必须直接写入集合而不走 `award`。
2. **跟随现实时间是否默认开启**（承诺 ④）。默认开启会让首帧不再等于参考截图。建议先做显式开关加深链，默认保持经典黄昏。
3. **Vercel Analytics 自定义事件**。README 明说未添加，且只有 Pro 计划可用，Hobby 会静默丢弃。错误上报、寄信计数、移动端性能基线都以它为前提，先确认计划。
4. **专辑封面**（承诺 ②）。会新增一个直连的网易云图片域，README「音乐由网易云 CDN 提供」要改写。小事。
5. **寄信时把这句话印上明信片**（承诺 ①边界）。信件文字会进入本地图片并可能被分享。若做，默认关闭、逐次勾选。
6. **分享页 SSR 与实时全站计数**（承诺 ③）。前者需要爬虫专用 Function，后者需要 Redis 且容易被刷。建议不做实时计数；静态 `stats.json` 可以做，但数字要如实标注为人工维护。
7. **Three.js 升级到 0.186**（承诺 ④）。阴影观感会变，必须先有视觉回归基线。
8. **自动画质升档**（承诺 ⑥）。README 明说不会自动升档以免来回抖动，建议放弃这条。

2026-09-24 已拍板：按建议只留存非信件文字，现实时间做默认关闭的显式开关，不做实时全站计数和自动画质升档；导出明信片中的信件文字默认关闭、每次单独勾选。当前没有 Vercel Pro，跳过自定义 Analytics 事件。专辑封面与 Three.js 升级仍按对应条目的验收要求处理。

## 5. 建议顺序

前后有依赖：

1. **护栏与修缺陷**：CI、Playwright 视觉基线、通知队列、电台退避、社交预览 meta。
2. **第一印象与可达性**：开场镜头、热点悬停、键盘热点、春风群岛、声音邀请与字幕。
3. **回访**：先拍板留存，再做历书、节气、限定邮戳，然后跟随现实开关、月相、节日装饰。
4. **分享**：拍照明信片、复制此刻、PWA。
5. **内容与玩法持续迭代**：新事件、极光、情境文案、预设与巡游、寻宝、留声机、电台频道与歌词。
6. **大项目**：驿站岛、散步模式、双语、音乐律动、Three.js 升级。

## 6. 尚未覆盖的角度

- **屏幕阅读器对 3D 场景的文字描述**：目前读屏用户只能听到控件，听不到「此刻岛上正在发生什么」。可以考虑一个随季节、时刻、事件更新的 `aria-live` 场景描述。
- **真机验证**：所有功能至今没有在真实手机上验证过，这仍是最大的未知。建议在第 1 阶段结束时做一轮 iOS Safari 与安卓 Chrome 实测，再定移动端性能路线。


## 7. 实施进度

按第 5 节顺序推进，每完成一项提交一次并在此登记。

| 条目 | 状态 | 提交说明 |
| --- | --- | --- |
| GitHub Actions 质量门禁 | 已完成 | 新增 `.github/workflows/ci.yml` 与 `format:check` 脚本 |
| 通知分层与队列 | 已完成 | `noticeQueue.ts` + `NoticeStack.tsx`，回信带「打开信箱」、寄信带「登船跟随」，修复 1.1 |
| 播放失败诊断与跳过退避 | 已完成 | `src/music/skipPolicy.ts`：1.5/3/6/12 秒退避、连续 5 次停止、读 Retry-After、跳过本次失败曲目；play() 与 `<audio>` onError 合并为同一 `fail()`，修复 1.2 |
| 热点键盘可达与数字键直达 | 已完成 | 指南面板 11 个热点按钮（邮筒已有「寄一封春天」），数字键 1–9、0 直达，修复 1.3 |
| 补全社交预览与 canonical | 已完成 | `server/vite-meta.ts` 构建期读 `SITE_URL` / `VERCEL_PROJECT_PRODUCTION_URL` 注入标签，缺失时不输出；新增 `public/og.jpg`；统一两处 description，修复 1.5 后半条 |
| Playwright 视觉回归 | 已完成 | `npm run test:visual`，4 张主岛基线（`tests/visual/*-win32.png`）。仅在本机跑、不进 CI：Windows 上 SwiftShader 截图会超时，改用 D3D11；Linux CI 需另生成 linux 基线后再接入 |
| 热点悬停可见与微反应 | 已完成 | `camera.ts` 悬停按 id 去抖、设置手形光标（按下时清除以保留 grabbing），进入时给对应热点 0.12 冲量、樱花树 0.05；浏览器中实测光标切换 |
| 开场落地镜头与加载淡出 | 已完成 | 定时镜头缓动、加载页淡出与界面错落淡入；交互和减少动态效果会结束镜头，浏览器测试可跳过开场 |
| 春风吹遍群岛 | 已完成 | 风力系统累计云层位移、鸟群逆风偏移与风车转角，蝴蝶和萤火虫响应风；暂停冻结累计量 |
| 声音邀请与侧栏开关 | 已完成 | 首次点击画布出现一次性邀请；侧栏按钮和 M 键随时开关环境音效 |
| 音效字幕 | 已完成 | 指南里可开启字幕，互动音效与雨声、虫鸣、冬风由场景状态发出文字提示，电台播放时提示歌名和歌手 |
| 首访三步轻引导 | 已完成 | 场景就绪 4 秒后依次引导点树、真正环视、寄信；可跳过且本机记住，指南可重开；每步完成时树轻抖并播放 pop |
| 邮戳、回信与计数本机留存 | 已完成 | 版本化 localStorage 只存邮戳 ID、固定回信索引与累计次数；刷新恢复，信箱可清空，README 隐私说明同步更新 |
| 邮局历书、每日一句与节气 | 已完成 | 香港天文台 2026–2032 节气表、60 条确定性每日短句、回访日期去重与常客邮戳；周末云鲸和雨季太阳雨加权 |
| 农历节日日历与限定装饰邮戳 | 已完成 | `Intl` 农历月日识别中秋、元宵和七夕；天灯、桥灯和星桥按节日出现；六枚当日寄信限定邮戳、节日回信与 `?classic=1` 关闭日历 |
| 跟随现实时间与季节 | 已完成 | 默认关闭并记住选择；本地时辰与月份驱动场景，暂停冻结时辰，手动调整退出；`?hour=6.5&season=2` 一次性设初始画面 |

2026-09-24 验证：TypeScript、ESLint、Prettier、75 项单元测试、生产构建和 10 项 Playwright 测试通过；四张主岛视觉基线未变。开场、春风、声音邀请与字幕作为前一轮工作一次补交；其后每项单独提交并推送。下一项是月相与中秋满月。
