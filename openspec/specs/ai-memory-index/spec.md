# ai-memory-index Specification

## Purpose

约定 **`devpaper index`** 从 `logs/*.md` 生成 **`index.json`**（机器可读记忆索引）、可选 **`INDEX.md`**（人类扫读表），以及 **`logs/hub-calendar.json`**（Hub 月历与「是否已生成 HTML」状态）。索引默认与 `build` 产物的路径约定一致：**`htmlFile` 为相对 `dist` 的路径 `YYYY-MM/YYYY-MM-DD.html`**。实现主路径为 `src/index-build.mjs`、`src/cli.mjs`；Hub 快照扫描 MAY 兼容旧版 `month-*` / `range-*` / `week-*` 目录中的版式页。

## Requirements

### Requirement: index 子命令与默认路径

CLI MUST 提供 `devpaper index [--logs <dir>]`；默认写入与 logs 同目录的 `index.json`；MUST 支持 `--md` 同步生成 `INDEX.md`；MUST 支持 **`--out <dir>`** 指定 **dist** 目录，用于生成 **`hub-calendar.json`**（扫描该目录下各月 `YYYY-MM` 及兼容旧目录名）。

#### Scenario: 生成 JSON

- **WHEN** 执行 `devpaper index --logs ./logs`
- **THEN** 创建或覆盖 `./logs/index.json`

#### Scenario: 生成 Markdown 表

- **WHEN** 执行 `devpaper index --logs ./logs --md`
- **THEN** 额外创建或覆盖 `./logs/INDEX.md`

#### Scenario: 指定 dist 写月历

- **WHEN** 执行 `devpaper index --logs ./logs --out ./dist`
- **THEN** 扫描 `./dist` 下版式页并创建或覆盖 `./logs/hub-calendar.json`

### Requirement: index.json 结构

`index.json` MUST 包含 `version`（整数）、`generatedAt`（ISO8601）、`entries` 数组。每项 MUST 含 `date`、`file`、`title`、`slug`、`fingerprints`、`tags`、`synthetic`；SHOULD 含 `htmlFile`、`anchor`、`order`；当正文含等级/类型元数据时 SHOULD 含 **`severity`**、**`type`**、**`typeLabel`**（以实现抽取结果为准）。

#### Scenario: 单篇文章条目

- **WHEN** 某日日志含一篇文章
- **THEN** `entries` 中对应项包含上述 MUST 字段且 `fingerprints`/`tags` 为数组

### Requirement: htmlFile 与 dist 目录约定对齐

每条目的 `htmlFile` MUST 为 **`YYYY-MM/YYYY-MM-DD.html`**（相对 `--out` 所指的 dist 根目录），与 `build` 默认写入的版式选择页路径一致。

#### Scenario: AI 从索引跳转到 html

- **WHEN** 读取某 entry 的 `htmlFile` 得到 `2026-04/2026-04-30.html`
- **THEN** 可与 `dist/2026-04/2026-04-30.html` 直接对应

### Requirement: hub-calendar.json 结构

`hub-calendar.json` MUST 包含 **`version`**（整数）、**`generatedAt`**（ISO8601）、**`dates`**（以 `YYYY-MM-DD` 为键的对象，值至少含 `hasMd`、`hasHtml`，MAY 含 `htmlRel`）、**`monthNavAvailable`**（以 `YYYY-MM` 为键，表示该月是否存在可导航的月刊/版式页集合）。仅对 **存在手记 md 的日期** 生成键，以避免 dist 残留 HTML 误判。

#### Scenario: 月历可区分已生成 HTML

- **WHEN** 某日有 md 且 `dist` 下已有对应 `YYYY-MM-DD.html`
- **THEN** `dates[该日].hasHtml` 为 true 且 `htmlRel` 为非空相对路径（若实现提供）

### Requirement: 从正文抽取指纹

索引 MUST 解析每篇文章块内 `**指纹**` 行并拆分逗号、顿号等分隔符为多个 token；MUST 支持等价 `指纹：` 行（见 `daily-log` 能力）。

#### Scenario: 指纹行解析

- **WHEN** 文章含 `**指纹**：powershell-and, git-lfs-404`
- **THEN** 该条 `fingerprints` 含两个字符串

### Requirement: 条目顺序稳定

在未改日志前提下重复运行 `index`，`entries` MUST 按日期升序、同日按文章出现顺序排列且语义稳定。

#### Scenario: 幂等排序

- **WHEN** 连续两次运行 `devpaper index`
- **THEN** 两次 `entries` 顺序一致（字段值除 `generatedAt` 外一致）
