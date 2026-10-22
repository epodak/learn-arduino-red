# Learn Arduino Red

一个从网页取证走向可生长 3D Arduino 教学应用的项目。原站的 Playwright 镜像与行为取证已经完成；`scaffold/` 已实现第一版**独立可运行的教学实验台**。它并非参考站的逐像素复刻。

参考站：<https://learn-arduino-red.vercel.app/>
本项目仓库：<https://github.com/epodak/learn-arduino-red>

## 当前发现

- 参考站有 12 个语言路由、16 个课程和一个程序化生成的 Three.js/WebGL2 场景。
- 课程数据、3D stage、模拟器和 locale 被拆在 16 个哈希 JS bundle 中；Three.js revision 为 186。
- “Run sketch”目前运行的是由 `lesson.sim` 选择的预定义情景，并没有观察到真正执行任意 Arduino C++ 的路径。
- 生长版已经把课程、部件、模拟器和事件流分离；3D、引脚、串口和进度从同一个状态投影生成。

## 启动独立应用

```bash
cd scaffold
pnpm install
pnpm dev
```

打开 `http://127.0.0.1:5173/`，中文入口为 `http://127.0.0.1:5173/zh/`。在 `scaffold/` 中使用 `pnpm test`、`pnpm build` 和 `pnpm test:e2e` 执行验证；测试覆盖课程注册表、确定性事件重放、桌面及手机端的十二语言路由、页面交互和网络外联。

当前 16 个课程均由数据注册，按模拟器 ID 映射到 11 类通用情景插件。英语、简体中文已有 UI 与课程标题/描述翻译；其他十个语言路由可加载，明确提示采用英语回退。示例 C++ 只读，运行的是虚拟情景，不是 C++ 编译或真机烧录。

## 文档入口

- [重建计划与验收结果](REBUILD_PLAN.md)
- [原站引擎事实记录](docs/engine-notes.md)
- [生长型架构](docs/architecture/重建与生长架构.md)
- [镜像与产品代码隔离决策](docs/decisions/镜像与生长层分离.md)
- [产品定义](PRODUCT.md)
- [设计系统](DESIGN.md)
- [迭代路线图](docs/strategy/Arduino教学产品迭代路线图.md)
- [文档门户](docs/README.md)

## 工具链

本仓库 vendored 了 [website-rebuild-skill](https://github.com/boyang-hu/website-rebuild-skill) `0.3.24` 的项目副本，按 MIT License 保留上游版权与许可证；本地兼容补丁见对应工程文档。该技能的 MIT 许可只覆盖技能本身，不代表参考网站的内容、源码或素材获得再发布许可。

## 证据与发布边界

`mirror/`、`port/`、`src/`、`probe/` 是本地生成的镜像、字节保持副本、源码切片和验证证据，均被 `.gitignore` 排除。参考站的源码、课程文案、字体和图片没有找到明确的再发布许可；因此这些文件不进入公开 Git 历史，也不会自动部署。后续独立 scaffold 应使用自写的模块和经确认可用的素材。
