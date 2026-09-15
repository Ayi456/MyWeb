# 验证记录

基线验证日期：2026-09-14；群岛扩展验证日期：2026-09-15。这里区分已执行的检查、桌面模拟和未验证项，不代表公开部署已完成。

## 群岛、邮路与彩虹（2026-09-15）

- 新增花园岛、吊桥、转动风车、灯塔岛与停泊码头；新模型使用独立随机种子，不改变主岛原有模型的随机布局。
- 彩虹为场景内半透明几何体，边缘和两端渐隐，具有正常深度遮挡；白天可见，23:00 隐去，灯塔暖光亮起。
- **28 / 28** 个核心测试通过，包括所有新航线阶段的连续性、两端停泊时速度归零、灯塔停留、主岛闭环、风车与灯塔气囊避让距离，以及寄信触发离港时保留灯塔停靠。
- TypeScript、ESLint、生产构建通过。生产页无控制台 error / warn。
- [真实 WebGL 原始结果](archipelago-engine-results.txt)：三次完整创建/销毁、暂停、寄信与送达、12 封信后的 GPU 资源回落、WebGL 不可用、context loss 与恢复均通过。连续十次 FPS 采样均为 **60**，217 draw calls，9686 instances，22 geometries，6 textures；测试设备仍为 GTX 1650。
- 实际捕获了飞艇停靠灯塔小站的画面；状态文字与停泊位置一致。测试用时间倍率已恢复为 ×1。
- 检查了 1280×720 桌面与 390×844 竖屏；竖屏默认角度稍向正面调整，灯塔避开右侧按钮。手机尺寸来自桌面浏览器模拟，不代表真机性能。
- 开发热更新时出现过 WebGL 创建失败，点击「重新启程」可恢复；生产预览重新加载和独立场景重建测试正常。

| 状态 | 当前截图 |
| --- | --- |
| 群岛与柔和彩虹 | [桌面](screenshots/archipelago-desktop.png) |
| 灯塔停靠 | [邮路](screenshots/archipelago-lighthouse-stop.png) |
| 入夜：彩虹隐去，灯塔亮起 | [夜景](screenshots/archipelago-night.png) |
| 正午竖屏构图 | [手机模拟](screenshots/archipelago-mobile.png) |

以下章节保留迁移基线的历史结果；新增副岛和彩虹后，不再以原 HTML 的像素一致性作为扩展场景的验收标准。

## 工程

- Node.js **24.21.0**、npm **11.19.0**；官方 Node 压缩包通过 SHA-256 校验，临时运行时位于被 gitignore 排除的 `.tools/`，未替换系统 Node。
- 使用官方 npm registry 真实安装，生成 `package-lock.json`。最终工具链使用 ESLint 10，所有插件 peer dependencies 匹配。
- 正常 `npm ci`（只指定本项目缓存目录）、TypeScript strict、ESLint、Vitest、Vite 生产构建结果见 [原始工程输出](engineering-results.txt)。
- **19 / 19** 个核心逻辑测试通过：三个倍率、暂停/恢复、跨午夜、暂停中拖动时间、随机数精确复现、风力平滑与暂停、五个航线连接点、循环闭合、航线避开岛体、信件从出发到送达、自动画质的时间窗口及手动选档。
- Vite 产物按 React UI、场景系统、Three.js 拆包；Three.js r160 及匹配类型均固定为 0.160.0。生产包没有运行时第三方 CDN、开发机器绝对路径、localhost、iframe 或服务端调用。
- `npm run preview` 已实际运行。静态 HTTP 资源检查单独记录在 [资源结果](static-assets.json)。
- 初次清洁安装时 Windows 锁定了运行中 Vite 的原生模块；停止开发/预览进程后重新安装成功，未强行删除使用中的文件。

## 浏览器与交互

环境为 Windows、Codex 内置 Chromium **152.0.0.0**、ANGLE / Direct3D11、**NVIDIA GeForce GTX 1650**。普通生产页与 `?debug=1` 页面都已加载，正常生产页没有观察到 JavaScript 未处理异常、Shader 编译错误或资源 404。故障注入测试会主动产生预期的 WebGL 创建错误，该记录不属于正常运行错误。

已实际操作：

- 桌面拖动、滚轮、复位、树下近景；暂停仍可调整视角。
- 空闲后诊断中的 `autoOrbit` 为 true，拖动后变回 false。
- 键盘 Enter 切换春风、打开弹窗清除春风；统一时钟下风力恢复归零。
- 写信自动聚焦；中文与空格输入；实时字数；Tab / Shift+Tab 首尾循环；Escape 关闭后回到寄信按钮。
- 暂停寄信出现提示与 3D 信封，计数增加；恢复后信件状态推进为送达，信封移除；信件飞行中增加的绘制和几何体随后回落。
- 时间滑块切换白天与夜晚，夜间星空/窗光/灯串出现；×1 / ×4 / ×12 / 暂停按钮状态有效。
- 隐藏 UI 后仅保留恢复按钮，点击可恢复全部界面。
- 选择低画质后 framebuffer 从 1600×900 调整至 1152×648；恢复自动可回到初始画质档。
- 模拟 WebGL 不可用时 React 显示明确失败说明；恢复测试环境后点击「重新启程」，场景重新加载，页面中只保留一个画布。

[真实 WebGL 验证原始结果](browser-engine-results.txt) 包含三次完整创建/销毁、重复 dispose、单一 RAF、信件资源回收、WebGL unavailable、context loss 及重新创建。测试会拦截自己的 requestAnimationFrame 计数：运行时 1 个待执行回调，销毁后 0 个；销毁后订阅不再触发。

## 视觉对照

原 HTML 的 SHA-256 在工作前后均为：

`67BE4F28E77F422CD1924D8B6C005AA396D3F24186D2492C918A234EBDC2B168`

对照使用 **1280×720** 相同浏览器视口、随机种子 **314159**、模拟时间 **0**、停靠时间 **1.5**、风力 **0**、高画质。原型的临时测试副本只冻结时间、设置时刻/相机并隐藏界面；原始文件不变。迁移版通过测试页面调用公开场景 API 达成相同状态。

| 场景 | 参考 | 迁移后 | RGB 平均绝对差（0–255） |
| --- | --- | --- | --- |
| 16:19:48 黄昏，默认视角 | [参考](screenshots/reference-dusk.png) | [迁移后](screenshots/migrated-dusk.png) | 0.3676 |
| 12:00 白天，樱花树近景 | [参考](screenshots/reference-day.png) | [迁移后](screenshots/migrated-day.png) | 0.0000 |
| 23:00 星夜，默认视角 | [参考](screenshots/reference-night.png) | [迁移后](screenshots/migrated-night.png) | 0.0000 |

樱花树、邮局、浮岛、飞艇、动物、灯串与水面保留。黄昏微小差异来自主灯色的连续插值，替代原型的阈值突变。这组静止截图的一致性不代表所有动画帧都逐像素一致：离港/靠港加减速、灯光过渡和风力时钟经过了修正。

## 响应式

首次视口设置未立即作用到已有页面，因此先用独立测试容器，给**当前生产页面**提供真实 390×844 和 844×390 子视口。随后也在原生 390×844 标签页确认了实际 innerWidth/innerHeight，并检查写信窗口与 Escape 返回焦点。该测试容器不进入 dist，未嵌入旧 HTML。DOM 实测 clientWidth 与 scrollWidth 相等，未发现横向溢出。已保存 [竖屏](screenshots/mobile-portrait.png)、[手机写信窗口](screenshots/mobile-letter.png) 与 [横屏](screenshots/mobile-landscape.png) 证据。

竖屏检查发现并修复了原型的远距离天空裁切与雾过浓问题：竖屏天空跟随相机，远裁面按比例扩展，雾密度补偿响应式相机距离；桌面默认条件不变。控制区与主场景分离，侧边触控区域保留 44 px。

这里验证的是桌面浏览器中的实际 CSS 视口和 WebGL 渲染，**不是手机真机测试**。工具对嵌套页面的部分点击/键盘注入不可用，手机布局可核验，触屏手势不能据此声称已通过。

## 性能与内存

- 冷构造到第一帧（浏览器测试页已经加载模块后计时）：三次为 **415 / 447 / 330 ms**。不包括下载依赖模块与首次网络访问，不是完整首访加载耗时。
- 稳态 10 秒采样：**60, 60, 60, 60, 60, 60, 60, 60, 60, 60 FPS**，约 16.7 ms/帧。测试 framebuffer **1581×900**，约 **201 draw calls、8334 instances**；普通生产页 framebuffer 1600×900 时也观察到 60 FPS。
- 夜景首次使用萤火虫后资源基线为 **21 geometries / 5 textures**；白天初始为 20 / 5。连续额外发送 12 封信并等待送达后，资源回到该基线，没有持续增加。生命周期测试全部结束后 RAF 归零。
- 切换画质时单个统计窗口曾短暂观察到 52 FPS；不把这种资源重建窗口当作稳定运行性能。
- 未作 1080p 真全屏基准、移动 GPU 跑分、长时间 JS heap profiler 或所有设备 60 FPS 保证。主线程内存、驱动缓存和长时间使用仍需要专项剖析。

## 未完成外部验证

- 没有公开部署到 Vercel，没有账号授权、仓库推送或真实域名验证；交付的是可部署静态代码。
- Safari / iOS / Android 真机、真实双指缩放、长按与 pointercancel、系统 reduced-motion 切换、中文输入法候选词组合及软键盘遮挡尚未真机验证。对应代码路径已实现，不能将桌面测试等同真机通过。
- 还没有真实域名，因此没有伪造 canonical / og:url / 社交分享 URL，也没有将设计图冒充 preview.jpg。

Vercel 与 Vite 设置参考：[Vite 官方入门与构建说明](https://vite.dev/guide/)、[Vercel Node.js 版本说明](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)。本项目只需要静态托管，Node 24 用于构建。
