# cursor-skill-devpaper Specification

## Purpose

约定 **人类与 Coding Agent** 在排错/方案落地后如何把结构化手记写入仓库，并与 **索引 / HTML** 工作流衔接。交付物为：仓库根 **Cursor Rule**（`.cursor/rules/devpaper-log.mdc`，`alwaysApply`）+ 包内 **`docs/log-authoring-guide.md`**（npm **`files`** 中**唯一** `docs` 条目）。**能力 ID 保留历史名 `cursor-skill-devpaper`**，与是否使用 Cursor「Skill」文件无绑定（本仓库已不维护包内 `.cursor/skills/`）。补充说明（路径、a11y、安全、备份）MAY 放在本机自建的 **`docs-local/`**（**不进 npm 包**；本仓库 **默认不入 Git**）。

## Requirements

### Requirement: 执笔规范可发现路径

规范文档 MUST 以 **`docs/log-authoring-guide.md`** 提供（与 npm 包 `files` 中 **`docs/log-authoring-guide.md`** 一致），仓库根 **`README.md`** MUST 指向该路径；项目级 Rule 为仓库根 **`.cursor/rules/devpaper-log.mdc`**。路径、a11y、安全与备份等补充说明 MAY 放在本机 **`docs-local/`**（不进 npm 包；本仓库默认不入 Git）。

#### Scenario: 新贡献者启用

- **WHEN** 用户克隆仓库并打开根目录 `README.md`
- **THEN** 能根据说明找到 **log-authoring-guide** 与 **devpaper-log** Rule

### Requirement: 非平凡解题后记录

当修复非平凡 bug 或完成需推理的排错且存在可陈述根因时，Agent SHOULD 在结束本轮前追加日志；用户明确拒绝时 MUST 跳过。

#### Scenario: 用户拒绝写日志

- **WHEN** 用户表示不要记录
- **THEN** Agent MUST 不创建或修改日志文件

### Requirement: 默认写入路径

执笔规范与 Rule MUST 指导写入 `logs/YYYY-MM-DD.md`（相对包根；若用户约定其他 logs 目录则以约定为准）。当日文件不存在时 MUST 创建。

#### Scenario: 当日首条记录

- **WHEN** 当日日志文件尚不存在
- **THEN** Agent 创建文件并写入首篇文章骨架

### Requirement: 禁止编造根因

在信息不足时 Agent MUST 不编造根因，MAY 使用「待补充」并列出需用户填写的要点。

#### Scenario: 根因未验证

- **WHEN** 根因仍属猜测
- **THEN** 日志中不写虚假确定性陈述

### Requirement: 索引、月历与指纹意识

Rule 与执笔规范 MUST 在适当时机提示：重要错误类使用稳定 **指纹** 命名；排错结束后 SHOULD 提醒执行 **`devpaper index`**（monorepo 根 **`npm run dp:idx`**）以更新 **`index.json`**、可选 **`INDEX.md`** 与 **`hub-calendar.json`**（若用户禁止执行命令则 MUST 以文字说明命令）。

#### Scenario: 会话结束前提醒

- **WHEN** Agent 完成排错并写入日志
- **THEN** 应提示或执行索引更新命令（在用户允许执行命令时）

### Requirement: 与 CI 一致

仓库 MAY 通过 GitHub Actions 等在**仓库根**执行 **`npm ci` + `npm test`**；规格不强制云端生成 HTML，但 MUST 允许在无 GUI 环境下验证解析与模板逻辑。

#### Scenario: CI 单测

- **WHEN** CI 在仓库根运行 `npm test`
- **THEN** 作为合并门禁的一部分通过或失败可观测

### Requirement: Cursor Rule 一键落地（init-cursor）

CLI MAY 提供 **`devpaper init-cursor`**：在目标项目根（默认当前工作目录，可用 **`--cwd`** 覆盖）创建 **`.cursor/rules/devpaper-log.mdc`**；手记根目录与 HTML 输出根 MUST 通过 **`--logs` / `--out`** 或环境变量 **`DEVPAPER_LOGS` / `DEVPAPER_OUT`**（与 `index` / `build` / `hub` 同一优先级：命令行优先）给出；相对路径相对 **`--cwd`** 解析为绝对路径后写入 Rule。若目标 Rule 文件已存在，默认 MUST **不覆盖**（幂等）；用户传入 **`--force`** 时 MAY 覆盖。模板 MUST 随 npm 包分发（例如 **`templates/cursor/devpaper-log.mdc`**），不得依赖仅存在于 Git 仓库的 **`.cursor/`** 路径。

#### Scenario: 首次初始化

- **WHEN** 用户在空 Cursor 规则目录的业务仓库根执行 `devpaper init-cursor --logs ./logs --out ./dist`
- **THEN** 生成 **`.cursor/rules/devpaper-log.mdc`** 且正文包含已解析的 **`--logs` / `--out`** 绝对路径及与 CLI 一致的收尾命令提示

#### Scenario: 用环境变量代替参数

- **WHEN** 用户已设置 **`DEVPAPER_LOGS`** 与 **`DEVPAPER_OUT`**（非空），且执行 `devpaper init-cursor --cwd <项目根>` 而未传 **`--logs` / `--out`**
- **THEN** 生成 Rule 且正文包含由环境变量解析得到的绝对路径（与命令行传入等价）

#### Scenario: 已存在文件

- **WHEN** 同一路径再次执行且未带 **`--force`**
- **THEN** 不覆盖现有文件且以非错误方式结束（便于脚本幂等）
