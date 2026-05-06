# newspaper-html Specification

## Purpose

约定 **Node CLI `devpaper build`** 从 `logs/*.md` 生成 **静态报纸风 HTML**（含多版式、多期导航、可选 Hub），以及 **`devpaper hub`** 本机控制台。输出目录默认为本包 `dist/`，且 **各日版式文件写入 `dist/YYYY-MM/`**（ISO 月目录名），与月刊导航 `index.html` 同层或跨月相对链接；**不再**在 `dist/` 根目录散装 `YYYY-MM-DD.html`（实现 MAY 清理历史散装文件）。实现主路径为 `devpaper/src/build.mjs`、`devpaper/src/cli.mjs`、`templates/`、`assets/`、`hub/`。

## Requirements

### Requirement: CLI build 子命令

包 MUST 提供 `devpaper build`，支持 `--date YYYY-MM-DD` 与 `--all`；MUST 支持 `--logs`、`--out` 覆盖目录（路径默认相对**本包根**，与当前 shell cwd 无关，以实现为准）。

#### Scenario: 单日构建

- **WHEN** 执行 `devpaper build --date 2026-04-30 --logs ./logs --out ./dist`
- **THEN** 在 `./dist/2026-04/` 下生成 `2026-04-30.html`（版式选择页，内含下拉与 iframe）及各 `2026-04-30.tpl-<id>.html`

#### Scenario: 批量构建

- **WHEN** 执行 `devpaper build --all`
- **THEN** 为 logs 下每个有内容的 `YYYY-MM-DD.md` 在对应 `dist/YYYY-MM/` 下生成版式包

### Requirement: 可选 HTML 模板

CLI MUST 支持 `devpaper build` 的可选参数 `--template`，取值至少包含 `newspaper`（默认）、`broadsheet`、`reader` 与 **`reader-night`**。`newspaper` MUST 沿用既有内联 CSS 与版式；`broadsheet` MUST 使用独立模板与独立 CSS，呈现专题大报分区；`reader` MUST 使用独立模板与独立 CSS，纵向单栏卡片流；**`reader-night`** MUST 与 `reader` 结构一致且使用深色配色 CSS。篇数达到文摘阈值时 MAY 对 `newspaper` / `broadsheet` 使用文摘 HTML 结构与元数据剥离规则。

实现 MAY 支持 `--section-title` 以覆盖 `broadsheet` 报头中的副刊标题。

#### Scenario: 指定 broadsheet 单日构建

- **WHEN** 执行 `devpaper build --date 2026-04-30 --template broadsheet --logs ./logs --out ./dist`
- **THEN** 在 `dist/2026-04/` 生成各 tpl 与版式选择页；**默认 iframe 预览**对应 `--template`

#### Scenario: reader-night

- **WHEN** 执行 `devpaper build --date 2026-04-30 --template reader-night --logs ./logs --out ./dist`
- **THEN** 生成阅刊暗色版式产物，且仍出现在版式下拉的 tpl 列表中

#### Scenario: 单文件模式（--single-html）

- **WHEN** 执行 `devpaper build --date 2026-04-30 --single-html --logs ./logs --out ./dist`
- **THEN** 在对应 `dist/YYYY-MM/` 下仅生成单一 `YYYY-MM-DD.html`（无 tpl 拆分、无版式选择页）

### Requirement: 报纸版式

HTML MUST 内联或引用项目 CSS（按模板而定），并包含报头、文章分隔与可读字体栈。单日篇数低于文摘阈值时 MUST 使用头版 / 要闻 / 简讯大报网格（`newspaper` / `broadsheet` 语义一致但版式 MAY 不同）；篇数达到阈值时 MAY 切换为文摘单列。

#### Scenario: 桌面宽度分栏（大报模式）

- **WHEN** 在宽屏浏览器打开**非文摘**单日 HTML
- **THEN** 正文区域呈现头版通栏 + 要闻主井 + 简讯侧栏等分层排版

#### Scenario: 单日文摘（篇数过多）

- **WHEN** 单日 `YYYY-MM-DD.md` 内 `##` 篇数达到实现所设阈值
- **THEN** 该日 HTML MAY 使用文摘单栏结构，以避免侧栏过载

### Requirement: 空日志仍可生成

当日文件不存在或解析后无文章时，CLI MUST 仍生成有效 HTML 并含友好提示。

#### Scenario: 无 md 文件

- **WHEN** 对不存在文件执行 `build --date`
- **THEN** 仍输出 html 且含简短空状态提示（如「本日无手记。」或等价短句）

### Requirement: Markdown 安全渲染

正文 MUST 通过 `marked` 渲染；输出 MUST 经安全策略避免注入（代码块与内联 HTML 按实现安全处理）。

#### Scenario: 代码块展示

- **WHEN** 正文含 fenced code block
- **THEN** HTML 中代码以可阅读形式展示且不破坏页面结构

### Requirement: 区间、自然月与自然周（导航 + 每日版式包）

CLI MUST 支持：`devpaper build --from YYYY-MM-DD --to YYYY-MM-DD`、`devpaper build --month YYYY-MM`、`devpaper build --week-of YYYY-MM-DD`（周界以实现 `range.mjs` 为准）。

对上述命令，实现 MUST：

- 为每个日历日在 **`--out/<该日YYYY-MM>/`** 写入 **`YYYY-MM-DD.html`** 与各 **`YYYY-MM-DD.tpl-<id>.html`**；
- 在 **`--out/<indexDirName>/`** 写入导航壳 **`index.html`**，其中 **`indexDirName`** 为 **`YYYY-MM`**：整月为该月；区间为 **`--from` 所在月**；周为 **该周周一所在月**；
- 导航页 iframe MUST 能解析到各日版式页（含跨月时相对路径 `../其它月/`）。

实现 MAY 仍识别旧版目录名 `month-YYYY-MM`、`range-*`、`week-*` 内已有 HTML（用于索引扫描兼容），但**新构建**以 **`YYYY-MM` + 单月导航目录** 为准。

#### Scenario: 自然月导出

- **WHEN** 执行 `devpaper build --month 2026-04`
- **THEN** 生成 `dist/2026-04/index.html`，且 2026-04 内各日在 `dist/2026-04/` 下具有对应 `YYYY-MM-DD.html` 与 tpl 文件

#### Scenario: 自定义区间导出

- **WHEN** 执行 `devpaper build --from 2026-04-01 --to 2026-04-07`
- **THEN** 导航写入 `dist/2026-04/index.html`（起始月在 4 月时），各日文件落在各自月份的 `dist/YYYY-MM/` 下

#### Scenario: 单日仍支持多篇

- **WHEN** 单日 `YYYY-MM-DD.md` 中存在多个 `##` 文章
- **THEN** `build --date` 生成的 HTML MUST 在同一期中展示全部文章

### Requirement: 按等级与类型区分呈现

当文章含有效 **等级** / **严重程度** 与/或 **类型** 元数据时，生成 HTML MUST 为文章容器增加可区分的样式类，MUST 以角标或等价非侵入方式展示等级与类型标签，且 MUST 在 Markdown 转 HTML 前剥离元数据行。

#### Scenario: 高等级文章视觉强调

- **WHEN** 某篇含 `**等级**：高`（或等价映射值）
- **THEN** 该篇在报纸视图中呈现高于默认的强调样式，且正文中不再重复该行

### Requirement: Hub 本机子命令

CLI MUST 提供 `devpaper hub [--logs <dir>] [--out <dir>] [--port <n>]`，在 **回环地址** 提供静态 `hub/index.html` 与 **`/api/*`**（具体端口默认以实现为准，须为本地开发用途）。Hub 所依赖的月历数据来自 **`logs/hub-calendar.json`**（由 `index` 流程写入，见 `ai-memory-index` 能力）。

#### Scenario: Hub 启动

- **WHEN** 用户执行 `devpaper hub` 且 `logs`、`dist` 可读写
- **THEN** 进程监听本机端口并可打开 `hub/index.html` 通过 HTTP 访问（勿依赖 `file://` 访问月历全部能力）
