# case-studies/scripts.md — scripts/README.md 的实证记录

> **何时加载本文件**：不在必经集合里。只在想知道某个脚本或某条工具链规则**为什么长这样**、或要核对它的实证强度时读；小节名与 `scripts/README.md` 的章节与表格行一一对应。规格本身不在这里：`node scripts/<x>.mjs --help`。

## 本文件的形态史

v0.3.16–v0.3.20 之间本文件有两张表：主表记用法 / 出处 / 成熟度，速查表记用途与使用阶段。与上表互补：上表记用法 / 出处 / 成熟度，本表记**用途、实证与使用阶段**（原 SKILL.md「Script Directory」的完整版；SKILL.md 现在只保留一句话用途，细节以此处为准）。

## serve.mjs

规则与规格：README 表格一行 + `node scripts/serve.mjs --help`。

v0.3.16：`--redirects`/`--cdp-port` 此前接受但无人读，现按未知旗标拒绝

## probe.mjs

规则与规格：README 表格一行 + `node scripts/probe.mjs --help`。

v0.3.16：`--expect-side`/`--evalAfterDelay` 进 KNOWN_FLAGS（此前有文档却被判 unknown）；

## pixelcompare.mjs

规则与规格：README 表格一行 + `node scripts/pixelcompare.mjs --help`。

实测带宽 0.31 → 0.20，**仍未归零**：剩下的是 IntersectionObserver 门控的 canvas，shim 尚未接管

## probe-shim.js

规则与规格：README 表格一行 + `scripts/probe-shim.js` 的文件头注。

接管后实测带宽 0.31 → **0.04**，门的可用阈值从 0.5 收到 0.1

## harvest-cases.mjs

规则与规格：README 表格一行 + `node scripts/harvest-cases.mjs --help`。

手写用例编码的是**你相信引擎的参数是什么**——六个手写用例曾全落在同一条曲线上、全绿。

## verify-payload.mjs

规则与规格：README 表格一行 + `node scripts/verify-payload.mjs --help`。

实测：它抓到两侧本地化实现不一致（一侧留 `href="http://host"`、另一侧写出 `href=""`），而外壳字节门全绿

## verify-lenprefix.mjs

规则与规格：README 表格一行 + `node scripts/verify-lenprefix.mjs --help`。

实测 eightdesign：115 条路由里 2 条只渲染出 70 字（对侧 2,440），**零 404、零请求失败、HTML 字节数一致、其它门全绿**；

## cold-audit-modules.mjs

规则与规格：README 表格一行 + `node scripts/cold-audit-modules.mjs --help`。

⛔ 实测抓到一处条件 require（`require(t ? "a" : "b")`）导致闭包少算两个模块，**而 9 个检查点逐像素全零毫无察觉**。

此前落在两种签名之外，raycastkbd 7 个补抓 chunk 里 6 个报"只查了 2/3"）

`node cold-audit-modules.mjs [--src port]`

⚠ **v0.3.21 迁移时抓到的漂移**：上面那行用法是 README 曾经写的，脚本从未认过 `--src`——它只认 `--map` / `--closure`（`lib/cli.mjs` 的 known 集）。规格搬进头注时 selftest 的「用法行旗标必须在 known 集里」当场判红，所以它留在这里当证据，不进头注。

## cold-audit-decls.mjs

规则与规格：README 表格一行 + `node scripts/cold-audit-decls.mjs --help`。

实测 samsy：964/4770 examined，首跑 349 UNKNOWN 全部归桶（三大 vendor 交错区 + 编译期常量 + 主线程重复打包的 worker 模块），0 缺口

## sweep-routes.mjs

规则与规格：README 表格一行 + `node scripts/sweep-routes.mjs --help`。

源自四个项目重复手搓的逐路由 probe 循环——按启动次数计价的教训(§成本),122 路由从 ~40 分钟降到 7.5 分钟,并发收割事故随单实例消失。

## lib/hash.mjs

规则与规格：README 表格一行 + `scripts/lib/hash.mjs` 的文件头注。

此前 19 个文件 23 处各写一份、三处各自实现流式
