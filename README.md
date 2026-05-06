# Devpaper

用 **Cursor 规则 + 执笔规范文档** 在 AI 解题过程中留下结构化手记，按日落盘到固定目录；用 **CLI** 生成报纸风 HTML（**单日多篇**；**周/月/区间**则生成「导航壳页 + 每日独立日报」可点击切换），并维护 **`index.json` 记忆索引**，减轻「不知道 AI 做了什么」和「同类错误反复踩」的问题。

**原始痛点**：自己写的代码出错，往往能快速联想到大致位置与原因；**若代码几乎全是 AI 写的**而中间过程未留痕，出问题时常**一无所知**。手记把**每日的中间出错、方案取舍**等写进人能读的 `logs/`，便于交付后再排障时对照，也便于与下一轮 AI 续接上下文。在 AI 编程范式下，人的重心更多在需求澄清、技术方案、**对 AI 产出与中间过程的审核**等——**阅读与维护每日手记**，宜与 Code Review、测试一样视为**必要模块**（更长叙事可写在本机 **`docs-local/`** 目录，**不入库**）。

**为何叫「手记」**：强调内容**最终是给人读的**——人是意义与责任的终点；索引与 HTML 是让人更好读、让机器更好帮人的手段。它试图衔接 **古法编程**（过程留在注释与文档）与 **AI 编程**（过程易消散在对话）之间的断层，做一座可积累的桥。命名与立意的展开同样可放在 **`docs-local/`** 自拟文稿中（默认不提交 Git）。

**最短用法（按月）**：`npm install`（一次）→ 写好该月各日 **`logs/YYYY-MM-DD.md`** → **`npm run dp:idx`** → **`npm run dp:month -- 2026-04`**（月份自换）→ 用浏览器打开 **`dist/2026-04/index.html`**（建议 http，见下文第四节）。手记**月历**见下文 **「日历在哪、样式在哪、按月怎么用」** 一节。

本仓库即 **devpaper** 包根目录。行为契约见 **`openspec/specs/`**；新变更流程见 **[`openspec/README.md`](openspec/README.md)**（复制 **[`openspec/template/`](openspec/template/)** 到 **`openspec/changes/<短名>/`**）。**`openspec/changes/archive/`** 仅作本机留档，默认 **不入库**（见根 `.gitignore`）。

**参赛 / 路演 / 他人上手长文**：放在本机 **`docs-local/`**（默认不入库）。

**更多文档**：[Log authoring guide](docs/log-authoring-guide.md)（英文格式骨架，**随 npm 包分发**）。路径 / a11y / 安全 / 备份等长文请放在本机自建的 **`docs-local/`**（**不入库**；可从历史提交或模板自行拷贝 `README.md` 骨架）。

**路径易错点**：本仓库**根目录即包根**，请用 **`node src/cli.mjs …`** 或 **`npm run dp:*` / `npm run html:*`**。若从 **npm 安装的 `node_modules/devpaper`** 内执行，仍用 `node src/cli.mjs`，**不要**再套一层 `devpaper/` 前缀路径。

---

## 价值延伸：规则沉淀与测试协作

**Markdown `##` 与报纸**：单日 md 中每个 `##` 在构建时被切成独立「文章」再上版（`parseDailyMarkdown` → 头版/要闻/简讯等），标题习惯与版式同源；**OpenSpec**（`openspec/`）偏事前契约，**手记**偏事后证据，二者互补——规格里找不到的「为什么」常能在 `logs/` 与索引指纹里找到。更长的形态对照与答辩口径可写在 **`docs-local/`** 自拟文稿。

手记与 **`logs/index.json`** 等产物不只是存档，还可作为**技术资产**继续向下游流动：

- **提炼为开发规则（提效）**：从多篇手记中归纳重复出现的根因、指纹族、禁踩路径与接口约定，可沉淀为 **Cursor Rules**、**`AGENTS.md`** 等，让后续人类开发与 Coding Agent **默认沿用同一套约束**，把「一次踩坑」变成「长期避坑」，形成开发提效闭环。
- **辅助测试与 AI 生成用例**：手记里常见的 **现象 / 根因 / 解法 / 影响面**（及刊位、指纹等元数据）适合作为测试同事的**结构化上下文**；将该日 md、某一 `##` 条目或索引摘要提供给测试侧使用的 AI，可更容易产出**回归重点、边界条件、负例路径**等用例草稿与验收要点——手记提供的是**可追溯、可对需求/代码锚定**的语料，具体 AI 工具链由团队自选。

---

## 日历在哪、样式在哪、按月怎么用

### 日历页面与样式文件

| 是什么 | 路径 |
|--------|------|
| **手记月历**（格子状态、链到 `dist`） | **`hub/index.html`** |
| **月历的样式** | 写在 **`hub/index.html` 里同一个文件的 `<style>…</style>`**（从约第 7 行开始）。**没有**单独的 `hub.css`；改颜色、间距、格子高，就改这里的 `:root`、`.h-cal`、`.h-day`、`.h-ok` / `.h-need` / `.h-no-note` 等选择器。 |

### 如何在浏览器里打开月历

1. **推荐（月历 + 可选页内按钮）**：在仓库根执行 **`npm run dp:hub`**，浏览器打开 **`http://127.0.0.1:8765/hub/index.html`**（停服：终端 `Ctrl+C`）。  
2. **只要月历、不要 Node 控制台**：仓库根 **`npx --yes serve .`**，在终端给出的地址后加 **`/hub/index.html`**。  

**不要**用资源管理器直接 **`file://`** 打开 `hub/index.html`，否则读不到旁边的 **`logs/hub-calendar.json`**。月历数据依赖：先 **`npm run dp:idx`** 生成 `hub-calendar.json`。

### 按月生成 HTML（月刊样例）

在**仓库根**依次执行（把 `2026-04` 换成你的 `YYYY-MM`）：

```bash
npm run dp:idx
npm run dp:month -- 2026-04
```

**生成结果**：目录 **`dist/2026-04/`**（目录名即 **`YYYY-MM`**）

| 文件 | 作用 |
|------|------|
| **`index.html`** | **月刊导航壳**：按日切换，iframe 里加载当日 **`YYYY-MM-DD.html`**（版式选择页，可下拉换 tpl）。 |
| **`YYYY-MM-DD.html`** | 当日版式选择页（顶栏 + iframe）。 |
| **`YYYY-MM-DD.tpl-*.html`** | 各内置/自定义版式的完整日报页。 |

本地预览：用 **`npm run dp:hub`** 或 **`npx serve .`** 起 http 后，打开 **`…/2026-04/index.html`**（或从月历页点进某日 `dist` 链接）。

---

## 使用说明（照着做）

### 1. 一次性准备

1. 安装 Node **≥ 18**。  
2. 在**仓库根**执行 **`npm install`**（安装 `marked`；只需做一次）。  
3. 手记源文件写在 **`logs/YYYY-MM-DD.md`**（同一天可多篇，每篇一个 `##` 标题）。

### 2. 命令速查（仓库根）

主推 **月刊** 见上文 **「按月生成 HTML（月刊样例）」** 小节。其余常用命令：

| 你想做的事 | 命令 |
|------------|------|
| 更新索引 + 月历状态 JSON | `npm run dp:idx` |
| **按自然月生成** `dist/YYYY-MM/` + `index.html` | `npm run dp:month -- 2026-04` |
| 按周生成 | `npm run dp:week -- 2026-04-10` |
| 任意日期区间 | `npm run devpaper -- build --from 2026-04-01 --to 2026-04-15` |
| 为「已有 md 的日期」各生成一份，写入对应 **`dist/YYYY-MM/`** | `npm run dp:all` |
| 只生成某一天（写入 **`dist/YYYY-MM/`**，并刷新该月 `index.html`） | `npm run dp:day -- 2026-04-30` |
| 单日且默认 iframe 偏向专题大报 tpl | `npm run dp:day:bs -- 2026-04-30` |
| 单日且默认 iframe 偏向阅刊长读 tpl | `npm run dp:day:reader -- 2026-04-30` |

生成物说明：各日 **`YYYY-MM-DD.html`**（版式选择页）与 **`YYYY-MM-DD.tpl-*.html`** 均在 **`dist/YYYY-MM/`**；**区间 / 周**不再单独建 `range-*` / `week-*` 目录，日报仍写入各日所属月，**导航 `index.html` 写在区间起始日所在月**（周为周一所在月）。索引 **`logs/index.json`**，月历用 **`logs/hub-calendar.json`**（`dp:idx` 时写入；扫描 **`dist/YYYY-MM`** 及旧版 `month-*` / `range-*` / `week-*`，**不**认 `dist` 根散装 HTML）。**升级或拉取新版 devpaper 后**，若内置版式有增减，请对该月重跑 **`dp:month` / `dp:all`**（或逐日 **`dp:day`**），否则 **`YYYY-MM-DD.html` 下拉仍为旧版**（例如缺「阅刊长读」）。

### 3. 在包根目录（本仓库克隆后）

已 `npm install` 后：

| 用途 | 命令 |
|------|------|
| 单日 | `npm run html:day -- 2026-04-30` |
| 单日 broadsheet | `npm run html:day:bs -- 2026-04-30` |
| 单日 reader（纵向单栏） | `npm run html:day:reader -- 2026-04-30` |
| 单日 reader-night（阅刊暗色） | `npm run html:day:reader-night -- 2026-04-30` |
| 全部有日志的日 | `npm run html:all` |
| 索引 + INDEX.md + hub-calendar | `npm run idx` |
| 本机手记控制台（月历 + 一键生成 API） | `npm run hub` |
| 等价直接调 CLI | `node src/cli.mjs build --date 2026-04-30` 等 |

### 4. 要不要开浏览器服务？怎么开？

先分清三件事：**看日报**、**看月历**、**在网页里一键生成**。只有后两种才和「本机起一个 http 服务」有关；**生成 HTML 本身**永远是终端里跑 `npm run dp:*`，不依赖浏览器。

| 你想做什么 | 要不要开服务 | 怎么做 |
|------------|--------------|--------|
| 只看某一天生成的 **`dist/YYYY-MM/YYYY-MM-DD.html`**（版式页） | **通常不用**。用资源管理器双击、或 VS Code / Cursor 的「在浏览器中打开」一般即可。 | 若 iframe 里 tpl 预览异常，再改用下面任意一种 http 方式打开同一文件。 |
| 打开 **`hub/index.html` 月历**（读 `logs/hub-calendar.json`） | **要**。浏览器用 **`file://` 打开时，读不到同目录外的 JSON**，所以必须用 **http(s)**。 | **任选其一**：① 下面「方式 A」只开 `dp:hub`；②「方式 B」用 `npx serve` 只当静态站（没有网页上的生成按钮）。 |
| 月历上点 **「刷新 / 出单日 / 出区间…」等生成按钮** | **要**，且必须是 **`dp:hub` 自带的那个服务**（页面和 `/api/*` 同源）。索引在 **打开页、点刷新、每次生成后** 会自动更新。 | 见「方式 A」。 |

#### 方式 A（推荐）：只开一个终端 — `dp:hub` 一站式

`dp:hub` 会在本机 **127.0.0.1** 起一个 **很小的 Node 服务**（不是对外部署，关掉终端即停）。它既提供 **月历静态页**，又提供 **`/api/*`** 给按钮用。

**在仓库根**执行：

```bash
npm run dp:hub
```

**在包根目录**（与上表相同 cwd）执行：

```bash
npm run hub
```

终端里会出现监听地址。用浏览器打开（默认端口 **8765**）：

- **`http://127.0.0.1:8765/hub/index.html`**

改端口示例：

```bash
npm run devpaper -- hub --port 9000
```

停服：在该终端按 **`Ctrl+C`**。

#### 方式 B：只要月历、不要网页按钮 — `npx serve` 静态站

**在仓库根**执行（需已装 Node，会临时下载 `serve`）：

```bash
npx --yes serve .
```

看终端里打印的 **`http://localhost:xxxx`**，在浏览器地址栏后面加上路径，例如：

- **`http://localhost:xxxx/hub/index.html`**

改 md / 要更新格子状态前，先在另一个终端跑 **`npm run dp:idx`**。生成 HTML 仍用 **`npm run dp:day`** / **`dp:all`**（本方式**没有**页内一键生成）。

#### 和「写 md、出 HTML」的关系（再强调一遍）

- **改 md、跑索引、跑 build**：一律在 **PowerShell / 终端** 里执行 `npm run dp:idx`、`npm run dp:day -- …` 等，**不需要**为了生成文件而开浏览器服务。  
- **开服务**：只是为了 **在浏览器里** 舒适地打开月历、或 **用按钮触发** 本机再跑一次上面的命令。

### 5. `--single-html`（可选）

- 需要**单文件、无版式下拉、无 tpl** 的旧式输出时，在 `build` 上加 **`--single-html`**（例如 CI 极简产物）。

### 6. 与 Cursor 集成（闭环）

1. **放进项目**：克隆本仓库或 `npm install devpaper`；可将 [`.cursor/rules/devpaper-log.mdc`](.cursor/rules/devpaper-log.mdc) 复制到你项目的 `.cursor/rules/` 以约束 Agent；**完整格式骨架**见 [docs/log-authoring-guide.md](docs/log-authoring-guide.md)（英文规范，正文语言不限）。  
2. **日志**：`logs/*.md`，由 Agent 按 [Log authoring guide](docs/log-authoring-guide.md) / 自己维护。  
3. **出报**：终端跑上表 `dp:*` 或 `html:*`；可选 **`--template broadsheet`**（专题大报分区）、**`--template reader`**（阅刊长读纵向卡片）、**`--template reader-night`**（同结构，深色阅刊）；头版图用正文靠前处的 `![](https://…)`；无图时用首段提要 + 指纹，或正文最开头一行 `> 自定义提要`。

---

## CLI 与 npm：完整参数表

**前置条件**：Node.js **≥ 18**；在**包根**（本仓库根或 `node_modules/devpaper`）执行 `npm install` 一次。

**路径约定**：未指定 `--logs` / `--out` 时，CLI 固定使用**本包根目录**下的 `logs/` 与 `dist/`，与当前 shell 的 cwd 无关。你传入的相对路径仍相对**当前 shell 所在目录**解析。  
**克隆本仓库**：`logs/*.md` **不入 Git**；目录内保留 **`logs/.gitkeep`**。请自行新建 `logs/YYYY-MM-DD.md`，或运行 **`npm run sample:logs`** 生成虚构演示手记（会写入 `logs/`）。

| 用途 | 命令 | 参数 | 默认 `--logs` | 默认 `--out` | 生成物 / 行为 |
|------|------|------|---------------|--------------|----------------|
| 帮助 | `node src/cli.mjs` | 无子命令或 `-h` / `--help` | — | — | 打印用法后退出 |
| 记忆索引 | `node src/cli.mjs index` | 可选 `--logs`、`--out`（`--out` 指定扫描 **dist** 的路径以写 `hub-calendar.json`）、`--md` | 本包 `logs` | — | `index.json`、`hub-calendar.json`；`--md` 再写 `INDEX.md` |
| 本机控制台 | `node src/cli.mjs hub` | 可选 `--logs`、`--out`、`--port` | 本包 `logs` | 本包 `dist` | 监听 127.0.0.1，静态 + `/api/*` |
| 单日报纸 HTML | `node src/cli.mjs build --date YYYY-MM-DD` | **必填** `--date`；可选 `--logs`、`--out`、`--template`、`--section-title`、**`--single-html`** | 本包 `logs` | 本包 `dist` | 写入 **`dist/YYYY-MM/`**（版式页 + 各 `tpl-*.html`）；`--single-html` 时仅单文件同目录 |
| 每天各一份 HTML | `node src/cli.mjs build --all` | 可选同上 | 同上 | 同上 | 每个有日志的日期各一份 |
| 日期区间 + 导航 | `node src/cli.mjs build --from A --to B` | **必填** `--from`、`--to` | 同上 | 同上 | `<out>/range-…/index.html` + 各日 |
| 自然月 + 导航 | `node src/cli.mjs build --month YYYY-MM` | **必填** `--month` | 同上 | 同上 | `<out>/month-…/index.html` + 各日 |
| 自然周 + 导航 | `node src/cli.mjs build --week-of YYYY-MM-DD` | **必填** `--week-of` | 同上 | 同上 | `<out>/week-…/index.html` + 各日 |
| 短命令（包根） | `npm run html:day -- …` 等 | 见本包 `package.json` | `./logs` | `./dist` | `html:day` / `html:day:bs` / `html:day:reader` / `html:day:reader-night` / `html:all` / `html:month` / `html:week`、`idx`、`hub` |
| 单测 | `npm test` | 无 | — | — | 运行 `node --test test/**/*.test.mjs` |
| 预设全部日报 | `npm run build:html` | 无 | `./logs` | `./dist` | 等同 `build --all` |
| 预设索引 | `npm run build:index` | 无 | `./logs` | — | 等同 `index --md` |
| 虚构演示日志 | `npm run sample:logs` | 无 | 写脚本内 `logs/` | — | 覆盖演示用 `logs/*.md` |

在包根执行 `npm link` 后，可将 `node src/cli.mjs` 换为全局命令 **`devpaper`**。

---

## 版本与变更

- **变更日志**：[CHANGELOG.md](CHANGELOG.md)（按版本列出新增 / 修复 / 升级注意点）。
- **当前版本**：与 [package.json](package.json) 中 `version` 一致。
- **升级后**：若内置 HTML/CSS/模板有变，对受影响自然月重跑 **`npm run html:month -- YYYY-MM`**（仓库根 **`npm run dp:month -- …`**），并视需要 **`npm run idx`** / **`npm run dp:idx`** 重建索引与月历数据。
- **自动化测试**：在包根执行 **`npm test`**。

协作流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

---

## 「指纹」是什么？还能叫什么？

**指纹**不是文件哈希，而是你给**同一类错误**起的短代号，便于 `index.json` 聚类与新会话检索。

可替换叫法：**错误族 ID**、**踩坑代号**、**pattern-id** 等。书写示例（均会被索引识别）：

```markdown
**指纹**：`foo`, `bar`
指纹：baz, qux
```

---

## 快速开始

**在仓库根（本 monorepo）**：

```bash
npm install
npm run dp:idx
npm run dp:month -- 2026-04
```

**等价：已在包根时**：

```bash
npm install
npm run idx
npm run html:month -- 2026-04
```

月刊产物在 **`dist/2026-04/index.html`**（目录名为 **`YYYY-MM`**）。需要手记月历或页内一键生成时，见上文 **「日历在哪…」** 与 **第四节**（推荐 **`npm run dp:hub`**）。

演示用大量虚构手记可重生（会覆盖 `logs/` 下按日文件）：

```bash
npm run sample:logs
node src/cli.mjs index --logs ./logs --md
```

**不覆盖真实 `logs/` 的一页演示**：在**仓库根**执行 **`npm run dp:demo`**，输出到 `.demo-out/<YYYY-MM>/` 与 `.demo-logs/`（见 [CHANGELOG.md](CHANGELOG.md)）。

---

## 报纸与「多篇、多期」

- **同一天多篇**：同一 `YYYY-MM-DD.md` 内多个 `##`，会排进**同一份**当日 HTML。
- **周 / 月 / 区间**：在 `dist/` 下以 **`YYYY-MM`** 为目录名；各日 HTML 写入**该日所属月**的文件夹；**`index.html`（导航）**写在整月时为该月，**区间**为起始日所在月，**周**为周一所在月（跨月时 iframe 使用相对路径 `../其它月/`）。**`build --date` / `build --all`** 亦写入对应 **`dist/YYYY-MM/`**；生成后会删 `dist` 根下旧版散装文件。若磁盘上仍有旧目录名 **`month-YYYY-MM`**，可手动改名为 **`YYYY-MM`** 或重新生成该月。

---

## Cursor 与执笔规范

手记的**详细模板与元数据说明**见 **[docs/log-authoring-guide.md](docs/log-authoring-guide.md)**（与根目录 **`.cursor/rules/devpaper-log.mdc`** 搭配：Rule 管纪律，文档管格式）。**以主线 [`openspec/specs/`](openspec/specs/) 为准**；旧版 OpenSpec 提案若需对照可查 **Git 历史**。

---

## 报纸版式与「刊位」

HTML 按**头版 / 要闻 / 简讯**分层：头版单栏大字、舒适行长；要闻主栏带左侧色条；简讯进侧栏（篇数多时侧栏自动双列）。可在正文里写 `**刊位**：头版` / `要闻` / `简讯`（与指纹同级即可）。

未写「刊位」时：**固定 1 条头版**；**要闻条数随总篇数在 2～6 条间自动调整**（大致随「除头版外篇数」的平方根增长，篇数很多时也不会只给 2 条要闻）；其余进简讯。多条手写「头版」时只保留第一条，其余降为要闻。

可选 **`**等级**：高|中|低`**（或 **`**严重程度**：…`**）与 **`**类型**：…`**（自由短文本）：报纸 HTML 会显示角标并加不同侧线强调；`index.json` 每条会多 `severity`、`type`、`typeLabel` 字段。生成前会从正文剥离，不与小节重复。

## 日志、索引与目录

| 路径 | 说明 |
|------|------|
| `logs/YYYY-MM-DD.md` | 按日落盘；推荐标题 `## HH:MM · slug — 标题` |
| `logs/index.json` | `index` / `dp:idx` 生成，供检索与 **`hub/`** 月历 |
| `logs/INDEX.md` | `index --md` 时生成的人类可读表 |
| `dist/YYYY-MM/` | `build` 生成的报纸页（按日 HTML 在对应月份目录内；兼容旧版 `month-*` / `range-*` / `week-*`） |
| `hub/index.html` | 月历（需 http；可配合 `npm run hub` 使用 API 按钮） |
| `logs/hub-calendar.json` | `index` 生成：各日是否有 md / 是否在合刊子目录下已有版式页 |

---

## License

MIT
