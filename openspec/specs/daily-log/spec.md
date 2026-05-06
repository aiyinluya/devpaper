# daily-log Specification

## Purpose

约定 **按日落盘的 Markdown 手记** 的文件名、文章切分、标题 slug、指纹与可选元数据（刊位、等级、类型），使 **同一套解析** 同时服务于 HTML 构建与 `index.json` 索引。默认路径为包内 `logs/YYYY-MM-DD.md`（monorepo 下常为 `devpaper/logs/`）。人类撰写与 **Cursor Rule**（`.cursor/rules/devpaper-log.mdc`）+ **`devpaper/docs/log-authoring-guide.md`** 对齐；能力 ID `daily-log` 为规格名，不要求目录名含 daily-log。

## Requirements

### Requirement: 按日单文件命名

系统 MUST 使用 `YYYY-MM-DD.md` 作为单日日志文件名；写作时的「当天」以用户或 Agent **会话语境中的日期**为准（与 Rule / `log-authoring-guide` 描述一致）。

#### Scenario: 新建某日日志

- **WHEN** 用户在 2026-04-30 解题后追加记录
- **THEN** 目标文件名为 `2026-04-30.md`

### Requirement: 文章以二级标题分块

每条记录 MUST 以 `## ` 起头形成独立文章；同一文件内多篇按出现顺序排版。

#### Scenario: 同一日多篇

- **WHEN** 单个 md 中存在多个 `##` 块
- **THEN** CLI 与索引生成将每块视为独立文章并保持顺序

### Requirement: 标题行 slug 约定

标题行 SHOULD 使用「可选时间 · kebab-case slug — 可读标题」；slug MUST 匹配 `[a-z][a-z0-9-]*`。若无法解析 slug，实现 MUST 生成合成 slug 并在索引中标记 `synthetic: true`。实现 MUST 支持标题行可选前缀 `## ` 与正文块解析一致（即整块以 `##` 开头时仍能解析 slug）。

#### Scenario: 带 slug 的标题

- **WHEN** 标题行为 `## 14:05 · login-timeout — 登录偶发超时`
- **THEN** 解析得到 slug `login-timeout` 且 `synthetic` 为 false

#### Scenario: 无 slug 的标题

- **WHEN** 标题行为 `## 仅中文描述`
- **THEN** 解析得到合成 slug 且 `synthetic` 为 true

### Requirement: 推荐正文小节

Rule 与 `log-authoring-guide` SHOULD 推荐每篇文章使用三级标题小节：`### 表象`、`### 根因`、`### 解法要点`、`### 警示`。实现 MUST 在未写齐时仍能渲染与索引（不要求四个标题均存在才视为合法文章）。

#### Scenario: 最小文章

- **WHEN** 某 `##` 块下仅有正文段落、无上述 `###` 小节
- **THEN** 构建与索引不抛错，该篇仍出现在 HTML 与 `entries` 中

### Requirement: 指纹与标签抽取

文章 SHOULD 使用 `**指纹**` 行列出短 token；正文 MAY 使用 `#tag`（字母开头、长度≥2）。索引生成 MUST 抽取指纹与标签。

#### Scenario: 多指纹

- **WHEN** 正文含 `**指纹**：a, b`
- **THEN** 索引 `fingerprints` 数组包含 `a` 与 `b`

### Requirement: 指纹行的等价写法

除 `**指纹**` 外，实现 MUST 识别单独一行的 `指纹：` 或 `指纹:` 前缀（同一行逗号分隔多个 token），并在索引抽取中与加粗写法合并去重。

#### Scenario: 纯文本指纹行

- **WHEN** 文章正文含行 `指纹：foo, bar`
- **THEN** `foo` 与 `bar` MUST 出现在该文章的索引指纹列表中

### Requirement: 等级与类型元数据（可选）

文章 MAY 在正文靠前位置使用单行 `**等级**：…` 或 `**严重程度**：…`（取值映射为 `high` / `medium` / `low` 或省略），以及单行 `**类型**：…`（自由文本）。索引生成 MUST 抽取为 `severity`、`type`（slug）、`typeLabel`（原文）；HTML 构建 MUST 在渲染前剥离这些行以免重复显示。

#### Scenario: 高等级与类型写入索引

- **WHEN** 正文含 `**等级**：高` 与 `**类型**：安全`
- **THEN** 该条索引 `severity` 为 `high`，`type` 为非空 slug，`typeLabel` 为 `安全`

### Requirement: 刊位元数据（可选）

文章 MAY 使用单行 `**刊位**：头版` / `要闻` / `简讯`（或等价英文 `lead` / `focus` / `brief`）。HTML 构建 MUST 在分配头版/要闻/简讯 tier 时尊重手写刊位（含多条「头版」时仅保留首条为头版、其余降级之规则，以实现为准），且 MUST 在渲染前剥离刊位行。

#### Scenario: 手写要闻

- **WHEN** 正文靠前含 `**刊位**：要闻`
- **THEN** 该篇在报纸网格中进入要闻区（除非实现因冲突规则将其调整），且正文中不重复显示该行
