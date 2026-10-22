# REBUILD_PLAN — Learn Arduino Red

更新日期：2026-10-22。当前阶段：镜像与原站取证完成；已启动并实现第一版**独立作者化的可生长 scaffold**，全局合同与 UI 已能运行，但它不是原站逐字移植的 L3 等价源码。

## 0. 范围、目标与复杂度评级

用户请求是完整站点，而非单一截图：下载 `https://learn-arduino-red.vercel.app/`，利用 `website-rebuild-skill` 分析 HTML/JS，并把代码重整为可持续生长的项目。当前工作假设覆盖 12 个语言路由、16 个课程、3D Arduino 板、部件/引脚信息、代码展示、串口面板和情景模拟。

| 维度 | 评级（1–5） | 依据 |
|---|---:|---|
| 页面结构与样式 | 3 | 静态 HTML 已包含完整主框架，CSS 为单个哈希文件 |
| 3D 场景 | 4 | WebGL2 + Three.js r186，板和部件由程序化场景生成 |
| 状态/模拟 | 4 | 16 个课程、15 个情景分支，含传感器状态与随机噪声 |
| 多语言 | 3 | 12 个路由、11 个独立 locale bundle，但以英文文案为翻译键 |
| 验证与离线性 | 3 | 可做静态闭包与浏览器回归；原站无源码映射 |
| 公开发布风险 | 4 | 目标仓库是公开仓库，原站源代码/文案/素材的再发布许可未确认 |

**目标终点的暂定判断：**“HTML/JS 重生 + 生长性”意味着需要独立结构化代码，而不仅是格式化 minified JS。`website-rebuild-skill` 已用于取证与字节保持的源码分解。当前另行编写的 scaffold 通过数据合同和事件回放实现第一版功能，**不等于原站全行为/像素的 L3 等价复刻**，两者应当分别验收。

## 1. 原站与采集结果

- 原站：`https://learn-arduino-red.vercel.app/`。
- 代码仓库：`https://github.com/epodak/learn-arduino-red`；GitHub 元数据确认仓库公开。
- 语言路由：英语基线，以及 `/es/`、`/pt/`、`/fr/`、`/de/`、`/it/`、`/tr/`、`/id/`、`/zh/`、`/ja/`、`/ko/`、`/hi/`。
- 原始镜像：71 个文件、约 5.9 MB；所有镜像文件都有 manifest 记录。
- 运行时：全部资源在原站同源；离线扫描未发现静态外联调用点。署名 X 链接保留为用户主动点击的普通链接，不是运行依赖。
- 本地副本：`port/` 从镜像清单逐文件复制，71 个文件 SHA-256 与字节数全部相同。
- 证据目录：`mirror/`、`port/`、`src/`、`probe/` 被 gitignore；它们不进入公开仓库。

## 2. 十个逆向问题的结论

1. **架构主体是什么？** 静态 HTML/CSS + 客户端 JS。HTML 已包含导航、课程列表、检查面板、代码区和串口区；入口 JS 负责 locale 选择、数据填充与交互，3D 场景由 Three.js 生成。没有发现 SSR 或后端 API 调用。
2. **标志性行为的事实源在哪里？** 课程对象位于 `main-DjJVc0Xg.js`；场景与情景模拟位于 `stage-q31hSPBm.js`；Three.js vendor 位于 `kit-BvosHktf.js`。课程对象中的 `sim` 决定运行哪个预定义情景。
3. **Bundle 形态是什么？** 16 个哈希 JS bundle：入口、主 UI/课程、stage、Three.js kit、缩略图工具和 11 个 locale。入口的动态 `import()` 不会完整显示在静态导入图里。
4. **能确认哪些依赖版本？** Three.js 内部 revision 为 186。Vite 风格的哈希资源结构可观察到，但精确 Vite/npm 版本不可见。原站无 source map 引用。
5. **DOM 是如何生成的？** HTML 已提供完整骨架和 `noscript` 后备内容；加载层覆盖启动过程，`#app` 在初始化后解除 `inert`。JS 再绑定控件、装配课程和 3D 状态。
6. **是否有私有二进制模型格式？** 镜像没有 `.glb`、`.gltf`、`.wasm` 或独立模型二进制。3D 几何与状态由程序化 JS 场景构造。
7. **最重要的验收门是什么？** 镜像完整性、12 路由渲染、16 课程计数、离线无外联、字节保持重组、模拟轨迹和 Playwright 交互。每个门都必须给出可重跑命令和结果。
8. **源码可插桩吗？** 原站没有 source map，也没有公开的测试 API。可用 Playwright、DOM、网络与 WebGL 上下文观测；不要修改原始 bundle 来“证明”原站行为。
9. **法律/部署边界是什么？** 没有找到原站代码与内容的明确再发布许可证。只做本地取证和重建；不把原站资产、完整文案或切片提交/推送到公开仓库，也不部署公开副本，除非用户明确决定并完成权利确认。
10. **镜像仍有哪些盲区？** 部件标签的真实点击意图未完全确定；原站的 308 规则不能由本地文件服务器原样重放；传感器模拟存在 `Math.random()`；“编译/上传”并不证明真实 C++ 编译；移动端使用 compact/scale 逻辑，仍需专门的视觉回归。

## 3. Bundle 角色表

| 层 | 原始工件 | 职责/边界 |
|---|---|---|
| Bootstrap | `index-BodLthS6.js` | locale 解析、动态加载、启动顺序 |
| UI + content | `main-DjJVc0Xg.js` | 16 个课程定义、界面状态、参数、localStorage、UI 事件 |
| 3D + simulation | `stage-q31hSPBm.js` | WebGL stage、部件/引脚状态、15 个模拟分支、动画 |
| Vendor | `kit-BvosHktf.js` | Three.js revision 186；保留原始工件，不作为业务源码重写 |
| Thumbnail | `thumbs-DpTqbeXB.js` | 3D 缩略图渲染 |
| Localization | 11 个 locale bundle | 以英文原文为键的翻译映射；英语基线主要来自主 UI/课程数据 |

## 4. 已执行门与结果

| 门 | 结果 | 说明 |
|---|---|---|
| M0 镜像 | PASS | 71 个文件、约 5.9 MB；清单、URL 映射、缺失引用检查通过 |
| M0.5 离线静态检查 | PASS | 0 个静态外联问题；Windows Node 24 的退出兼容问题已在本地 skill 副本修复 |
| 12 路由浏览器扫查 | PASS | 12/12 HTTP 200；每路由应用 ready、16 个课程项、无失败资源、无外部请求、无非预期浏览器错误 |
| 静态 port 副本 | PASS（抽样） | `/`、`/es/`、`/zh/` 200，16 个课程项，WebGL2，0 外联；其余路由的完整扫查在镜像层完成 |
| Bundle census | PASS | 16 个 JS bundle；生成 chunk census 与静态导入图 |
| 可读坐标 | PARTIAL | 16 个 JS、12 个 HTML 和 CSS 均生成 `_pretty` 坐标视图；主 bundle token 差异仅可用于定位，不能作为交付源 |
| 字节保持切片 | PASS | 15 个非 vendor ESM 分解，重组 0 差异；Three.js vendor 不切片 |
| 交互烟测 | PASS / 1 项待确认 | PINOUT、键盘选课、情景运行、相机旋转通过；3D 部件标签仍需确认其交互语义和无障碍行为 |
| 自有 scaffold v0.1 | PASS（首轮） | 新建可运行 Three.js 页面、16 门数据驱动课程、11 个模拟器插件、事件流、元件选择、响应式页面 |
| scaffold 单元测试 | PASS | 9/9：课程注册/扩展/拒绝无效数据、全部情景重放、随机种子、输入联动和路由 |
| scaffold Playwright | PASS | 桌面/移动两组浏览器，12 路由启动、交互、离线零外联及移动无横向溢出；初轮 9 通过、1 不适用跳过 |
| 逐像素原站等价 | 未执行 | 参考站和 scaffold 设计目标不同；不能把新 UI 误称 1:1 |

## 5. 版本与工具锁定

| 项目 | 已观察/使用版本 | 说明 |
|---|---|---|
| Node.js | `v24.15.0` | 当前 Windows 工作环境 |
| pnpm | `10.34.6` | 项目包管理器；重建脚本统一使用 `pnpm dlx` |
| Playwright | `1.64.1` | 当前本地捕获环境；安装在 gitignored `.cache/` 下，不是公开项目依赖 |
| js-beautify | `1.15.1` | 只生成 `probe/_pretty/` 阅读坐标 |
| Three.js | revision `186` | 从 `kit-BvosHktf.js` 观察到；源站完整 package.json 不可见，npm semver 未确认 |
| Vite | 未知 | 哈希资源结构符合 Vite 风格，但不能据此猜测精确版本 |

独立 scaffold 开始后，必须通过 `pnpm` 和 `pnpm-lock.yaml` 锁定实际安装的版本；不得把参考站的版本推断写成已安装事实。

现有 `scaffold/package.json` 与 `scaffold/pnpm-lock.yaml` 均为正式项目依赖；`scaffold/tests/unit/` 和 `scaffold/tests/e2e/` 是产品级验证入口。原站取证所用 Playwright 仍位于 gitignored `.cache/`，与 scaffold 正式测试依赖分离。

## 6. 已知产品事实与设计债务

- 代码展示区是只读的；当前没有 `textarea` 或 `contenteditable`。`Run sketch` 将 `lesson.sim` 交给预定义情景分支，不执行编辑器中的 C++。
- 情景工厂 `ms(t, a)` 位于 `stage-q31hSPBm.js:12290`。当前有 15 个分支，`sensor` 和 `project` 共用一个分支。增加课程往往需要同时修改主课程数组与模拟器函数。
- 多语言以英文文案为键，不利于长期改文案、拆课程或扩展语言。
- 至少 6 处 `Math.random()` 影响模拟输入/传感器读数，测试应注入可播种 RNG。
- 动态按钮有空 `aria-label`；新 UI 必须有稳定的可访问名称、键盘行为和可测试的选择 API。
- 目前没有真实 Arduino 编译/上传、任意电路求解或真实硬件 I/O 的证据。

## 7. 生长层建议

不要把 `probe/_pretty` 或 `src/readable` 当作最终产品源码。新代码已放入独立的 `scaffold/`，以行为证据而不是复制 minified 文件作为规格：

1. `domain/`：`LessonDefinition`、`PartDefinition`、`PinDefinition`、`SimulationEvent` 等稳定类型和 schema。
2. `content/lessons/`：每课一个数据模块，包含目标、部件、接线、示例代码、参数、模拟器 ID 和验收轨迹。
3. `simulators/`：注册表 + 插件接口。先实现可播种、可重放的 `ScenarioSimulator`；以后可加受限 Arduino 运行时适配器。
4. `scene/`：程序化部件工厂、scene graph、raycast/picking、相机控制；渲染器只消费统一状态。
5. `runtime/`：确定性时钟、虚拟引脚、串口事件、输入事件和 event log。
6. `ui/` 与 `i18n/`：由事件/状态投影 UI；使用稳定翻译键；避免空 `aria-label`。
7. `tests/`：schema 测试、模拟轨迹快照、键盘/可访问性检查、12 路由烟测、离线闭包检查。

## 8. 固定点与验收指标

- 新增普通课程只需新增一份 `LessonDefinition` 和翻译项；只有出现新物理行为时才新增模拟器插件。不得修改全局路由、课程列表渲染或语言解析器。
- 同一个 `SimulationEvent` 流驱动引脚状态、3D 动画、串口日志和教学步骤，禁止每个 UI 面板各自推断状态。
- 固定随机种子下，课程的事件轨迹与快照必须稳定；同一输入/状态应得到相同的投影。
- 任何提交都应保持：测试通过、0 外部运行时请求、12 个语言路由可加载、交互控件有可访问名称、原始镜像哈希不变。

## 9. 下一步与待确认范围

当前已完成证据采集和结构盘点，并按“路径 B”先实现了可生长的独立 scaffold。仍然存在两条后续路径：

- **路径 A：先做完整 1:1 端到端复刻，再做语义重写。** 优点是视觉/交互基线更严谨；成本较高，且公开发布前仍需要处理原站内容与素材权利。
- **路径 B：把镜像作为不可变行为规格，直接建立独立的生长型 scaffold。** 先重建核心布局、程序化 Arduino 板、课程注册表和可重放模拟器，不复制原站文案/图片；这是更符合“让项目具有生长性”的路径。

路径 B 的首轮成果已存在。无论后续选择哪条路径，在获得明确授权或确认许可之前，都不推送原站派生资产、不公开部署原站克隆。自有 scaffold 可以作为独立应用代码单独提交。`docs/engine-notes.md` 记录原站证据，`docs/architecture/重建与生长架构.md` 记录新代码结构，`docs/strategy/Arduino教学产品迭代路线图.md` 记录后续实际门槛。
