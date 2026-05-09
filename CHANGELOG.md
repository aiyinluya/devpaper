# Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 精神；版本号与 [package.json](package.json) 中 `version` 对齐。

## [Unreleased]

## [0.1.7] - 2026-05-09

### Added

- **安装入口**：README 顶部新增「我只是想在业务项目里用」快速路径，直达业务项目安装步骤。
- **发版手册**：新增 [docs/release.zh.md](docs/release.zh.md)，覆盖 `CHANGELOG`、版本号、`npm publish`、Git tag 与常见 401/404/403/2FA 问题，并随 npm 包分发。
- **测试覆盖**：新增 hub 控制台集成测试，覆盖 `/hub/index.html`、`/logs/*`、`/dist/*` 映射到当前 `logsDir` / `outDir`；补充 `build --date` 读取 `DEVPAPER_LOGS` / `DEVPAPER_OUT` 的 CLI 测试。

### Changed

- **`devpaper hub` 可测试性**：`startHubFromArgv()` 返回 `{ server, url, logsDir, outDir }`，方便集成测试关闭本机服务；CLI 使用方式不变。

## [0.1.6] - 2026-05-07

### Fixed

- **`devpaper hub` 静态路径**：浏览器访问 **`/dist/*`**、**`/logs/*`** 时改为映射到当前 hub 使用的 **`outDir` / `logsDir`**（与 API 一致），避免全局安装且手记在其它目录时，控制台内链接仍指向包内空目录的问题。

### Changed

- **路径默认值**：`index`、`build`、`hub` 与 **`init-cursor`** 在未传 `--logs` / `--out` 时，统一按 **命令行 > 环境变量 `DEVPAPER_LOGS` / `DEVPAPER_OUT` > 包内默认 `logs` / `dist`** 解析（此前仅 `hub` 读取环境变量）。
- **`index`**：仅在**未**通过 `--out` 或 `DEVPAPER_OUT` 指定 HTML 输出根时，扫描 `dist`、写 `hub-calendar.json` 仍使用 **`手记目录` 上一级下的 `dist`**，与「只传 `--logs`」的旧用法兼容。

## [0.1.5] - 2026-05-06

### Changed

- **`devpaper hub`**：启动后在终端**醒目打印**月历 URL 与 **Ctrl+C 停止**说明；支持 **`--open`** 尝试用系统默认浏览器打开。
- **`hub` 默认路径**：若未传 `--logs` / `--out`，可读环境变量 **`DEVPAPER_LOGS`**、**`DEVPAPER_OUT`**（便于全局安装后任意目录启动）。

## [0.1.4] - 2026-05-06

### Added

- **`devpaper init-cursor`**：在任意项目根生成 **`.cursor/rules/devpaper-log.mdc`**（`--logs` / `--out` 必填，路径写入 Rule；已存在时默认跳过，**`--force`** 覆盖）。模板随包分发：`templates/cursor/devpaper-log.mdc`。
- 文档：[README](README.md) 与 [docs/log-authoring-guide.md](docs/log-authoring-guide.md) 补充**全局手记目录**与**多项目同一天**写法；本仓库脚本 **`npm run dp:init-cursor`** 供开发自测。

## [0.1.3] - 2026-05-06

### Fixed

- **`bin`**：新增包根 **`devpaper-bin.js`**（`#!/usr/bin/env node` + `import "./src/cli.mjs"`），`package.json` 的 **`bin.devpaper`** 指向该文件名（无子目录），避免部分 npm 版本将 **`bin/…` 或 `.mjs` 直链** 判为无效并从 registry 剥离。

## [0.1.2] - 2026-05-06

### Fixed

- **`bin`**：按 npm 要求改为 **`"bin": "./src/cli.mjs"`**（与包名 `devpaper` 对应全局命令 `devpaper`），避免发布时被自动剥离导致 **`npx devpaper` / 全局安装无入口**。

## [0.1.1] - 2026-05-06

### Changed

- **仓库卫生**：`logs/*.md` 与 **`docs-local/`** 不再纳入 Git（见根 `.gitignore`）；克隆后请在本地自建 `logs/`、`docs-local/`。
- **OpenSpec**：权威变更骨架在 **`openspec/template/`**；**`openspec/changes/archive/`** 默认忽略；流程见 **`openspec/README.md`**。
- **npm 包**：`package.json` 的 **`files`** 不再包含 **`test/`**（ tarball 更瘦；单测在 GitHub / CI）。

### Security

- 已用 **`git filter-repo`** 从 Git 历史中剔除曾提交的 `logs/*.md`、`docs-local/`、OpenSpec 归档目录及 `logs` 下索引生成物等路径；**npm 包内容未变**，仅仓库历史更干净。已有克隆需 **`git fetch` + `git reset --hard origin/main`** 或重新 clone。

## [0.1.0] - 2026-05-06

### Changed

- npm 包 `files`：仅分发 **`docs/log-authoring-guide.md`**；默认路径、a11y、安全与备份说明建议放在本机 **`docs-local/`**（不进 tarball）。
- OpenSpec：主线 **`openspec/specs/*`** 与当前 CLI/HTML/索引行为对齐；新增 **`openspec/README.md`**。后续版本将变更骨架固定为仓库根 **`openspec/template/`**（不再依赖 `changes/archive/` 内的副本）。原 `templete` 误拼目录已移除。

### Added

- 内置版式：**经典报面**（`newspaper`）、**专题大报**（`broadsheet`）、**阅刊长读**（`reader`）、**阅刊暗色**（`reader-night`）；各日 `YYYY-MM-DD.html` 下拉切换与各 `tpl-<id>.html`。
- 阅刊：按刊位（头版 / 要闻 / 简讯）分级样式；暖色纸墨主题；暗色主题（`reader-night.css` 叠层）。
- 报头 `{{FILE_DATE_SECONDARY}}`：仅当 Markdown 一级标题日与文件名日不一致时显示落盘日，避免同日双写。
- CLI：`--template reader-night`；npm 脚本 `html:day:reader-night`。
- `node:test` 单测（`npm test`）、GitHub Actions 单 Job CI（`.github/workflows/devpaper-ci.yml`）。

### Fixed

- `parseArticleHeading` / `SLUG_IN_HEADING`：标题行在去掉 `## ` 后应仍能解析 `HH:MM · slug — 标题` 中的 kebab slug（此前整篇被误判为合成 slug）。

### 升级提示

- 拉取含新模板或 HTML 结构变更的版本后，对受影响月份重跑 **`npm run html:month -- YYYY-MM`**（仓库根 **`npm run dp:month -- …`**），以免版式下拉仍为旧产物。
- 若依赖 `index.json` 中的 `slug` 做外链，本次 slug 解析修复会使**新索引**与旧索引中同一篇的 `slug` 可能不一致；需要时可 **`npm run idx`** / **`npm run dp:idx`** 全量重建索引。

[0.1.7]: https://github.com/aiyinluya/devpaper/releases/tag/v0.1.7
[0.1.6]: https://github.com/aiyinluya/devpaper/releases/tag/v0.1.6
[0.1.5]: https://github.com/aiyinluya/devpaper/releases/tag/v0.1.5
[0.1.4]: https://github.com/aiyinluya/devpaper/releases/tag/v0.1.4
[0.1.3]: https://github.com/aiyinluya/devpaper/releases/tag/v0.1.3
[0.1.2]: https://github.com/aiyinluya/devpaper/releases/tag/v0.1.2
[0.1.1]: https://github.com/aiyinluya/devpaper/releases/tag/v0.1.1
[0.1.0]: https://github.com/aiyinluya/devpaper
