# Learn Arduino Red — Engine Notes

更新时间：2026-10-22。本文记录原站的可观测事实，不把推断写成事实，也不代表原站代码已获得再发布许可。

## 1. 证据边界

- 原站：`https://learn-arduino-red.vercel.app/`。
- 本地原始镜像：`mirror/`；镜像清单：`mirror/mirror-manifest.json`；重定向账本：`mirror/redirects.tsv`；外联账本：`mirror/external.txt`。
- 逐字节静态副本：`port/`；由镜像清单逐文件复制并校验 SHA-256，71 个文件、总计约 5.9 MB。
- 代码坐标视图：`probe/_pretty/`，由 `pnpm dlx js-beautify@1.15.1` 生成。它仅用于阅读和定位，不是交付源码；`main-DjJVc0Xg.js` 的 token stream 检查标记为 `DIFFER@25167`，不得拿它替代原始字节。
- 字节保持的切片：`src/readable/`。15 个 ESM 分解均通过 `verify-reassembly`，0 个重组差异。该目录仍是原始 bundle 的结构化切片，不等于已经完成语义重写。
- `mirror/`、`port/`、`src/`、`probe/` 均在 `.gitignore` 中，属于本地证据与派生产物，不会随普通提交发布。

## 2. 启动链与 HTML 层

`probe/_pretty/index.html:1-220` 显示原站不是空白 HTML 壳：页面已有导航、课程列表的静态/`noscript` 后备内容、信息面板、代码区、串口监视器、加载层和 `#app` 容器。启动期间 `#app` 带 `inert`，加载完成后由客户端逻辑启用。HTML 通过一个带哈希的入口脚本和一个带哈希的 CSS 文件启动。

`probe/_pretty/index-BodLthS6.js:1-266` 是入口/路由层：根据路径、保存的语言偏好和浏览器语言选择 locale，再动态加载主 UI、3D stage 和对应的 locale chunk。`census-bundles.mjs` 生成的静态导入图不会完整表达 `import()` 动态导入，因此语言 chunk 的边还要以入口文件中的动态导入表为准。

## 3. Bundle 清单

| Bundle | 原始字节数 | 原始行数 | 观察到的职责 |
|---|---:|---:|---|
| `index-BodLthS6.js` | 5,928 | 1 | 启动、语言选择、动态加载 |
| `main-DjJVc0Xg.js` | 131,218 | 407 | 课程定义、UI 状态、交互与持久化 |
| `stage-q31hSPBm.js` | 424,589 | 4,302 | 3D stage、部件状态、情景模拟与动画 |
| `kit-BvosHktf.js` | 316,523 | 152 | Three.js 模块 bundle；内部 `revision` 为 `186` |
| `thumbs-DpTqbeXB.js` | 4,975 | 1 | 缩略图渲染入口 |
| `de-BjleKp1j.js` | 66,814 | 1 | 德语 locale 数据 |
| `es-DXc-vWaP.js` | 66,776 | 1 | 西班牙语 locale 数据 |
| `fr-fnbXGytW.js` | 69,276 | 1 | 法语 locale 数据 |
| `hi-BA7shazM.js` | 99,709 | 1 | 印地语 locale 数据 |
| `id-CNsWI0r3.js` | 64,949 | 1 | 印尼语 locale 数据 |
| `it-CS9fNRw1.js` | 66,746 | 1 | 意大利语 locale 数据 |
| `ja-C33ou61z.js` | 72,120 | 1 | 日语 locale 数据 |
| `ko-prcWXKny.js` | 68,486 | 1 | 韩语 locale 数据 |
| `pt-DAdBr9jW.js` | 65,677 | 1 | 葡萄牙语 locale 数据 |
| `tr-Du5Em3hV.js` | 66,018 | 1 | 土耳其语 locale 数据 |
| `zh-DawrnNnG.js` | 62,279 | 1 | 简体中文 locale 数据 |

共 16 个 JS bundle、12 个语言路由（英语基线 + 11 个 locale chunk）。`kit-BvosHktf.js` 保持为独立 vendor 工件，不切成项目业务模块；新项目应使用明确锁版本的 Three.js 依赖，而不是把这个 minified vendor bundle 当作自己的源码。

## 4. 课程数据与语言模型

`probe/_pretty/main-DjJVc0Xg.js:194` 开始的是课程数组 `g`。浏览器 DOM 与数据数组均确认有 16 个课程：`board`、`blink`、`button`、`knob`、`rgb`、`light`、`sensor`、`sound`、`piano`、`motor`、`heat`、`servo`、`stepper`、`plant`、`force`、`project`。课程对象同时携带 `id`、标题/说明、代码展示文本、`sim` 标识、部件/引脚信息、参数与场景锚点等字段。

语言模块不是稳定的 message-id 字典，而是以英文原文作为翻译键。入口层遍历 DOM 文本，主 UI 层递归翻译课程对象，并排除一组结构字段。这种做法方便初版翻译，但修改英文文案可能导致翻译映射失配；新架构应改用稳定的 `lesson.*`、`part.*`、`ui.*` 键。

主 UI 使用 localStorage 保存语言、完成进度、设置、参数值和串口面板高度。观察到的键包括 `learn-arduino:lang`、`learn-arduino:done`、`learn-arduino:settings`、`learn-arduino:values` 和 `learn-arduino:console-height`。首次加载时存储可能为空，不能据此判断项目不支持持久化。

## 5. 3D 渲染与情景模拟

`probe/extra-facts.json` 的浏览器实测为 WebGL2。原站没有 `.glb`、`.gltf`、`.wasm` 或独立二进制模型资源；Arduino 板、部件、锚点和视觉状态由 JS/Three.js 场景代码构造。`probe/_pretty/stage-q31hSPBm.js:13220-13480` 可看到 renderer、scene、raycaster、相机控制、部件选择与状态更新的初始化路径。

`probe/_pretty/stage-q31hSPBm.js:12290` 的 `ms(t, a)` 是情景模拟工厂。其分支按 `builtin`、`blink`、`button`、`knob`、`rgb`、`light`、`sensor`/`project`、`sound`、`piano`、`motor`、`heat`、`stepper`、`plant`、`force` 和 `servo` 分流；`sensor` 与 `project` 共用一个分支。它不是一个可任意扩展的通用电路仿真内核。

`probe/_pretty/main-DjJVc0Xg.js:4982` 将 `lesson.sim` 传给 stage 的 `runSketch`；stage 方法在 `probe/_pretty/stage-q31hSPBm.js:14117`。该调用路径传递的是情景 ID 和回调，不是代码编辑器内容。DOM 实测没有 `textarea` 或 `contenteditable` 代码输入区。因此，“Compiling / Uploading / Done uploading”是教学模拟的 UI 状态，不构成真正编译或上传 Arduino C++ 的证据。新产品在接入真实执行器之前，应明确标注为“情景模拟”。

`Math.random()` 出现在距离传感器、模拟输入、植物/力传感器等分支（例如 `stage-q31hSPBm.js:12459`、`12518`、`12731`、`12883`、`12955`）。回归测试若要求稳定轨迹，需要注入可播种的随机源，而不是依赖全局随机数。

## 6. 运行时边界与已测交互

- 12 个本地化路由全部返回 200，应用解除 `inert`，每个路由都能呈现 16 个课程项。
- 资源捕获与离线静态扫描没有发现运行时外联依赖；没有发现 Service Worker、source map 引用、WebSocket 或后端 API 的实际调用路径。
- 3D canvas 使用 WebGL2。课程完成、语言、设置、参数和面板高度通过 localStorage 持久化。
- `PINOUT` 切换、键盘选择课程、运行 Sketch 的模拟流程和相机旋转已通过 Playwright 交互验证。
- 动态生成的可见部件标签与 `PINOUT` 控件存在空 `aria-label`，导致按可访问名称定位失败；部件标签的点击行为也未能通过稳定的 DOM 点击改变详情面板。重建应提供稳定的部件选择契约、可访问名称和键盘等价操作。
- 本地镜像服务器无法逐字节复现 `/es` 到 `/es/` 等 11 条 308 规则，因为两种路径映射到同一个本地文件。原始规则保留在 `mirror/redirects.tsv`；真正部署时需要单独配置 canonical slash redirects。

CSS 设计事实位于 `probe/_pretty/index-CeIbtN2h.css:218-238`：暖纸色背景 `#f6eddd`、深层背景 `#efe3d1`、侧栏 `#e9dcca`、海军蓝 `#18213d`、青绿色 `#1aa3a1`，并使用 Barlow、Barlow Semi Condensed 与 JetBrains Mono。`index-CeIbtN2h.css:472` 的 `.artboard` 使用约 `1672 × 941` 的固定设计画布并通过 scale/compact 逻辑适配视口；新 scaffold 应单独验收真正的响应式布局。

## 7. 不能推断的事项

- 没有发现原站源码仓库或明确的再发布许可证；公开可访问不等于允许公开再发布 HTML、JS、文案、字体和图片。
- Three.js revision 已观察为 `186`，但源站完整 `package.json` 不可见，不能推断其 Vite、TypeScript 或 Three.js 的精确 npm semver。
- 没有证据表明原站能执行任意用户 Arduino C++、能连接真实硬件、能做任意电路布线或能进行电气约束求解。
- 3D 标签在自动化中不稳定不等于其设计意图一定是可点击；它可能是标注层。重建应明确决定标签是装饰、选择入口，还是两者兼有。

## 8. 对生长架构的含义

保留原始镜像作为行为证据，不直接在 minified bundle 上重构产品。新代码应将课程、部件、模拟器和渲染器分开：课程是经 schema 校验的数据；模拟器通过注册表按 `simulatorId` 装配；事件流是串口、引脚、部件动画和教学提示的共同事实来源；3D 只消费状态投影；本地化使用稳定键。具体对象关系与固定点见 `docs/architecture/重建与生长架构.md`。
