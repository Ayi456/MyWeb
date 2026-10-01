# 场景元素视觉审阅 · 2026-10-01

## 证据

- [整体视角](./01-overview.png)：当前默认镜头。
- [樱花树视角](./02-tree-view.png)：镜头靠近树后的构图。
- [邮局近景](./03-office-closeup.png)：房子、飞艇和花圃的细节。
- [写信兔近景](./04-writer-closeup.png)：人物、猫和花草的细节。

## 结论

近景模型已经有足够的细节，主要的粗糙感来自三件事：默认镜头太远导致元素缩小；雾、曝光和环境光把轮廓冲淡；重复的花草、圆团树冠和白色人物材质缺少层次。

## 优先级

1. **先做画面分层**：降低 `CONFIG.fogDensity` 与 `CONFIG.exposure`，收一点环境光，保留暖色主光和偏冷补光；给房子、树和人物补接触阴影或软阴影贴片。
2. **重排默认构图**：默认镜头距离收近约 10–15%，让邮局、樱花树和飞艇形成三角主构图；保留现在的远景作为“群岛总览”视角。
3. **房子材质分离**：屋顶瓦片增加 3 档明暗和轻微粗糙度变化；墙面、木门、金属门铃使用不同材质；窗户增加暖色内光、窗帘和窗台厚度。
4. **人物增加识别点**：兔子保持圆润比例，但给写信兔加围巾/袖口和更明确的手部，邮差增加包带、帽檐和鞋底；脸部保留现在的贴面五官，增加眼睛高光和耳朵内侧渐变。
5. **飞艇做成独立视觉主角**：气囊补纵向缝线和轻微渐变，吊舱增加舷窗、金属扣件、尾翼和更厚的螺旋桨；飞行时用一条更明显的布质旗帜强化动势。
6. **花草树木减少复制感**：花朵拆成 3–4 个物种，随机高度、倾角、花瓣数量和簇密度；樱花树增加深色内层和少量可见枝梢，远处树改成更低对比度的层级。

## 代码落点

- 渲染和曝光：[src/scene/config.ts](../../../src/scene/config.ts)、[src/scene/core/renderer.ts](../../../src/scene/core/renderer.ts)
- 灯光和雾：[src/scene/core/context.ts](../../../src/scene/core/context.ts)、[src/scene/objects/sky.ts](../../../src/scene/objects/sky.ts)
- 邮局：[src/scene/objects/postOffice.ts](../../../src/scene/objects/postOffice.ts)
- 人物：[src/scene/objects/bunny.ts](../../../src/scene/objects/bunny.ts)、[src/scene/objects/animals.ts](../../../src/scene/objects/animals.ts)
- 飞艇：[src/scene/objects/airship.ts](../../../src/scene/objects/airship.ts)
- 樱花树和花草：[src/scene/objects/sakura.ts](../../../src/scene/objects/sakura.ts)、[src/scene/objects/flowers.ts](../../../src/scene/objects/flowers.ts)

## 限制

本审阅基于当前运行画面和固定近景截图；没有在不同屏幕亮度、低端 GPU、夜景和四季切换下重新评价材质表现。截图只能判断可见层次，不能替代性能和可访问性测试。


- [飞艇视角](./05-airship-ride.png)：飞行状态下的飞艇轮廓与吊舱。

## 本轮已实施

- [更新后的总览](./after-overview.png)
- [更新后的樱花树视角](./after-tree.png)
- [修复后的飞艇视角](./after-airship.png)

本轮代码把飞艇等待点和返航弧线移出主岛包络，码头同步延长；将小湖和出水口改成不规则水面与连续水带，并补了泡沫、睡莲和水面涟漪；樱花树缩小大块花冠、增加近景花簇和枝梢花苞。
同时把宽景的曝光从 0.95 调到 0.92、雾密度从 0.011 调到 0.0095，让树冠、房子和飞艇的轮廓更清楚。

