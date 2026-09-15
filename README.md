# 云上的春日邮局

**Postcards from the Sky** — 一张可以走进去的春日明信片。React 负责界面，TypeScript + Three.js r160 负责真正的体素微缩世界，Vite 构建为可直接部署到 Vercel 的静态文件。

本项目从根目录的 `spring-post-office.html` 迁移，保留它的模型生成算法、随机调用顺序、固定种子 **314159**、布局、体素尺寸、配色和自定义 Shader。原 HTML 原样保留，不参与生产构建。页面未使用 iframe、整页 HTML 注入、运行时 CDN、外部字体或服务端接口。

## 环境与启动

需要 **Node.js 24.x**（本次验证为 24.21.0）和随 Node 提供的 npm。`package.json`、`.nvmrc` 与部署设置使用同一主版本。项目 `.npmrc` 开启 engine-strict，旧版 Node 会明确报错，避免默默使用不兼容环境。

```sh
nvm use 24
npm ci
npm run dev
```

没有 nvm 时，直接安装 Node.js 24.x 后运行后两行。开发地址以终端输出为准，默认端口 5173。无需环境变量。依赖锁文件由真实 npm 安装生成，请提交 `package-lock.json`，团队安装和 CI 使用 `npm ci`。

| 命令                | 用途                                        |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Vite 开发服务器与热更新                     |
| `npm run typecheck` | 严格 TypeScript 检查                        |
| `npm run lint`      | ESLint 检查，无警告交付                     |
| `npm run test`      | Vitest 核心逻辑测试                         |
| `npm run build`     | 先 TypeScript 检查，再生成 `dist`           |
| `npm run preview`   | 本地检查生产产物，默认端口 4173             |
| `npm run format`    | 格式化源代码与工程配置，不改动原始参考 HTML |

## 操作

- **环视与缩放**：鼠标拖动、滚轮；触屏单指拖动、双指缩放。画布聚焦后方向键环视，加减键缩放。
- **视角**：右侧复位按钮或画布聚焦后 `R`；放大镜按钮走近樱花树。8.5 秒闲置后缓慢自动环视；操作、打开面板、暂停时停止。
- **春风**：在画布上按住 `Space`，或长按「唤起春风」。按钮聚焦后 `Enter` 切换持续春风。松开、取消指针、移出窗口或打开写信窗都会清除输入状态，风力随模拟时间平滑回落。暂停期间风力与所有动画一起冻结。输入框中的空格正常输入。
- **时间**：×1 / ×4 / ×12 / 暂停；滑块切换一天中的时间。卡片右上角可收起为小巧的时钟按钮，点击重新展开；浏览器会记住收起状态。收起不改变时间流速。暂停时相机和滑块仍然可用。恢复后不会补算暂停或后台停留时间。
- **寄信**：点击粉色邮筒或「寄一封春天」，输入最多 80 个 Unicode 字符。计数含空格与标点，普通 emoji 按一个码点计。信封沿弧线飞向正在移动的飞艇，停靠时可衔接离港。飞行中最多容纳 24 封，达到上限会提示稍候；本次页面放飞总数不受此上限影响。
- **弹窗**：打开自动聚焦；Tab / Shift+Tab 在弹窗内循环；Escape、关闭按钮或空白背景关闭，焦点回到触发控件。
- **隐藏界面**：侧边按钮或画布聚焦后 `H`；隐藏后始终保留右侧恢复按钮。
- **画质**：打开「操作指南」选择自动 / 高 / 中 / 低。生产页面默认不显示诊断；加 `?debug=1` 可查看 FPS、draw calls、实例数、渲染分辨率和 GPU 资源数量。开发环境默认开启诊断。

## 数据与隐私

这是虚拟邮局，**信件文字不会发送到外部服务**。不调用邮件或 AI API，不收集姓名、邮箱、联系方式。信件输入只在当前页面内存中存在；提交后清空输入，不保留历史、不写 localStorage / URL / 控制台，不用 innerHTML 渲染用户文字。页面刷新或重试后计数清空。所有模型和纹理由程序生成，图标在仓库内。

项目已接入 Vercel Web Analytics，通过 `src/main.tsx` 中的 `<Analytics />` 统计访客和页面浏览量。未添加自定义事件，不向 Analytics 传递信件内容。开发模式不采集访问数据。

## 生产构建与 Vercel

```sh
npm ci
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

`dist/` 包含全部线上所需 HTML、JS、CSS 与静态文件。`preview` 只用于本地验证；线上由 Vercel CDN 提供静态资源，没有常驻 Node 服务、Functions、数据库或 SSR。

1. 项目仓库：[Ayi456/MyWeb](https://github.com/Ayi456/MyWeb)，使用 `main` 分支。仓库包含原始 HTML 与真实锁文件，排除 `node_modules`、`dist`、`.tools`。
2. Vercel → Add New → Project → 导入 `Ayi456/MyWeb`。
3. **Root Directory 选择包含本 README 和 package.json 的目录**。如果仓库根目录就是本项目，保持 `.`；如果放在子目录，选择对应子目录。
4. 按下表核对设置，Node.js 选择 24.x，然后由你点击 Deploy。
5. 构建完成后，用 Vercel 实际提供的域名检查加载、寄信、触屏与静态资源。

| Vercel 设置      | 值              |
| ---------------- | --------------- |
| Framework Preset | Vite            |
| Install Command  | `npm ci`        |
| Build Command    | `npm run build` |
| Output Directory | `dist`          |
| Node.js          | `24.x`          |
| 环境变量         | 默认不需要      |

`vercel.json` 已包含四项静态构建设置。单页面不需要路由或全量 rewrite。没有添加其他托管平台适配器。

### 访问统计

依赖 `@vercel/analytics` 和 React 组件已接入。手动部署前，在 Vercel 项目的 Analytics 页面确认 Web Analytics 已启用；部署完成后访问线上网站，再回到 Analytics 查看数据。详见 [Vercel 官方接入指南](https://vercel.com/docs/analytics/quickstart)。

Vercel 部署由仓库导入后创建；仓库中没有预设线上域名。上线后可在 `index.html` 中补充真实 canonical、`og:url`，并将 `og:image` 设置为实际域名下的场景截图 URL。真实场景测试截图位于 `docs/screenshots/`。

## 结构与维护

| 位置                       | 职责                                          |
| -------------------------- | --------------------------------------------- |
| `src/components`           | React 界面、时间控件、模态寄信、加载/失败界面 |
| `src/hooks`                | 延迟初始化、取消异步挂载、低频订阅与键盘春风  |
| `src/scene/createScene.ts` | 唯一动画循环、场景 API 与生命周期编排         |
| `src/scene/config.ts`      | 固定种子、初始时间/相机、质量、时间参数       |
| `src/scene/core`           | 相机、统一时钟、共享资源追踪、HDR 渲染管线    |
| `src/scene/objects`        | 从原 HTML 迁移的模型工厂与所属 Shader         |
| `src/scene/systems`        | 昼夜、风、动物姿态、航线、信封与自动画质      |
| `src/scene/utils`          | LCG 随机数、共享立方体 InstancedMesh 批渲染   |
| `src/styles`               | 原型样式与响应式/无障碍补充                   |
| `tests/core.test.ts`       | 时间、航线、种子、风、信件、画质测试          |
| `tests/browser.html`       | 开发环境中的真实 WebGL 生命周期验证页         |
| `docs/VALIDATION.md`       | 实际验证结果与明确的未验证项                  |

场景公开 `setSpeed`、`setTimeOfDay`、`setWind`、`setCameraPreset`、`setQuality`、`setInteractionBlocked`、`sendLetter`、`subscribe`、`dispose`。React 不保存 Three 对象，也不逐帧 setState；每 300 ms 或用户操作时同步轻量快照，统计每秒更新。

资源归场景所有，模型工厂共享 cube / material；信封只释放它自己的线条和实例缓冲。销毁时取消 RAF、订阅、事件和 ResizeObserver，释放几何体、材质、纹理、阴影与 HDR render target，最后释放 renderer。React StrictMode 的取消初始化分支和重复清理均已处理。后台停止 RAF，恢复前台重置时间基准；WebGL 不可用、Shader 错误或 context lost 进入可重试错误界面。

## 画质与已知限制

- 高：DPR 上限 1.6，1024 阴影，1250 花瓣；中：1.2 / 768 / 850；低：0.9 / 512 / 480。相机、主模型和体素比例不会随质量改变。
- 自动模式从桌面高档、粗指针设备中档开始。先观察 8 秒，在低于 43 FPS 累积约 5 秒后降一级，再冷却 10 秒。不会自动升档来回抖动；可手动选档重置。
- 花瓣、云团、溪水、瀑布和萤火虫使用 GPU 动画。位移对象有明确剔除策略；主体和花朵采用 InstancedMesh，共享几何体/材质。
- 竖屏采用相机随动天空与雾密度补偿，修复原型在拉远时的天空裁切和过度雾化；桌面基准保持不变。
- 保留 r160 sRGB 输出、ACES、0.95 exposure、原雾参数及 HDR 微弱 Bloom / 暗角。灯光色改为连续插值；离港/靠港速度增加缓动、螺旋桨累积角度避免切换时跳动。
- 系统减少动态效果会关闭自动环视和 UI 动画，减弱风的摇摆响应；可进一步用暂停冻结整个世界。仍保留缓慢环境动画。
- 目标是常见桌面 GPU 在 1080p 附近流畅运行，不保证所有设备 60 FPS。WebGL / 硬件加速为必要条件。真实移动 GPU、Safari、中文输入法候选词和长时间运行仍需在目标设备确认，不能用桌面视口模拟代替真机验证。

浏览器验证页使用 `npm run dev` 后打开 `/tests/browser.html?debug=1`，会在真实 WebGL 上检查暂停、寄信、资源回落、三次创建/销毁、不可用和 context loss 恢复，并输出实际 FPS。该页只作为测试源码存在，**不会进入生产 dist**。测试时保持该标签页处于选中状态，切到后台会按设计暂停模拟。

响应式验证可在开发服务打开 `/tests/responsive.html?width=390&height=844`（另需启动 `npm run preview`）。这只是测试用容器，嵌入当前生产页面以提供真实子视口；生产项目没有 iframe，也没有嵌入原始 HTML。
