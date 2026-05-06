# Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/) 精神；版本号与 [package.json](package.json) 中 `version` 对齐。

## [Unreleased]

### Changed

- **仓库卫生**：`logs/*.md` 与 **`docs-local/`** 不再纳入 Git（见根 `.gitignore`）；远端历史中的对应文件已从版本树移除，克隆后请在本地自建 `logs/`、`docs-local/`。
- **OpenSpec**：权威变更骨架迁至 **`openspec/template/`**；**`openspec/changes/archive/`** 默认忽略，减小克隆体积；流程见 **`openspec/README.md`**。
- **npm 包**：`package.json` 的 **`files`** 不再包含 **`test/`**（单测随 GitHub 仓库与 CI，不打进 `npm pack`）。

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

[0.1.0]: https://github.com/aiyinluya/devpaper
