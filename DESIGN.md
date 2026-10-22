# Design System

## 视觉方向

采用“技术手册 / 实验台”而不是通用暗黑 Dashboard。参考站的视觉语言是暖纸色背景、深海军蓝文字、青绿色状态色、低对比细边框，以及 Barlow/JetBrains Mono 的技术排版。新产品可以继承这种信息层级，但必须使用自己的代码、文案和经确认可用的字体/素材，不直接复制参考站的品牌资源。

## 参考站测得的颜色

以下颜色来自 `probe/_pretty/index-CeIbtN2h.css:218-238`，只作为视觉研究记录，不要求新产品逐像素照搬：

| Token | 参考值 | 用途 |
|---|---|---|
| `--bg` | `#f6eddd` | 主背景 |
| `--bg-deep` | `#efe3d1` | 背景深层 |
| `--sidebar` | `#e9dcca` | 导航区 |
| `--card` | `#f9f2e5` | 卡片/面板 |
| `--line` | `#cec0ad` | 边界 |
| `--navy` | `#18213d` | 主标题/高对比文字 |
| `--ink` | `#4f535b` | 正文 |
| `--muted` | `#696d74` | 次级文字 |
| `--teal` | `#1aa3a1` | 主要交互/状态 |
| `--teal-deep` | `#3f7f8e` | 次级强调 |
| `--kw` | `#2a56a3` | 代码关键字 |
| `--fn` | `#c0652d` | 代码函数/暖色强调 |

## 字体

参考站使用 Barlow、Barlow Semi Condensed 和 JetBrains Mono。原站字体文件属于镜像证据，暂不复制到公开源码。新 scaffold 首期使用系统 sans/mono fallback；确认字体授权后，再通过明确版本的官方字体包或自有资产添加离线字体。

## 布局与响应式

- 桌面基准：左侧课程导航、中间 3D 板卡、右侧检查/代码/串口面板。
- 参考站 CSS 使用约 `1672 × 941` 的 artboard 和 scale/compact 逻辑。新 scaffold 不应把整页当成固定画布缩放；应采用可响应的 CSS Grid/Flex，移动端把检查/代码/串口面板改为抽屉或纵向分区。
- 3D canvas 的尺寸、设备像素比和相机视角必须由容器尺寸驱动；面板展开不能遮挡核心部件。
- 关键控件必须有清晰焦点、键盘操作、非空 accessible name；3D 部件选择必须提供列表/面板等价入口。

## 动效

- LED、按钮、旋钮、传感器和电机动画由模拟状态驱动，不允许 UI 独立随机闪烁。
- 相机移动应有可控的缓动与复位；尊重 `prefers-reduced-motion`。
- 测试模式使用固定随机种子和可控时钟，确保截图与事件轨迹可重放。

## 组件规范

- `LessonNav`：只消费课程注册表，不硬编码课程数量。
- `BoardViewport`：只消费 `SceneProjection`，不维护模拟真值。
- `PartInspector`：由 `PartDefinition.inspectorSections` 生成；每个部件 ID 稳定。
- `CodeTrace`：显示课程代码/执行轨迹；在真实运行时未接入前，明确区分“示例代码”和“实际执行”。
- `SerialMonitor`：从 `SimulationEvent` 读取串口事件，不自行生成输出。
- `LocaleProvider`：使用稳定 message key，不以英文文案为 key。

## 验收规则

1. 1440×1000 桌面与 390×844 移动视口均需截图回归。
2. 可见按钮不得使用空 `aria-label`；课程、部件和标签有可访问名称。
3. 3D 场景状态与串口/引脚面板必须对应同一事件轨迹。
4. 页面启动后不请求第三方运行时资源；所有必需资源同源自托管。
5. 原站镜像与派生证据不作为新产品素材目录；只有经确认授权的资源才能进入可发布 scaffold。
