# new

本仓库包含 **Devpaper**（AI 解题手记 + 报纸风 HTML + 记忆索引）与 **OpenSpec** 变更说明。完整概念、指纹、刊位、CLI 参数表见 **[devpaper/README.md](devpaper/README.md)**。路径、a11y、安全与备份等补充说明在 **`devpaper/docs-local/`**（见 **[devpaper/docs-local/README.md](devpaper/docs-local/README.md)**，**随 Git，不进 npm 包**）；个人路演稿等仍可放在同目录下其他文件名（默认仅本机）。手记如何**沉淀为 Cursor 规则**、以及如何作为**测试侧 AI 生成用例的上下文**，见 **[devpaper/README.md](devpaper/README.md)** 中 **「价值延伸：规则沉淀与测试协作」** 一节。写手记的 Agent 约束在根目录 **[`.cursor/rules/devpaper-log.mdc`](.cursor/rules/devpaper-log.mdc)**（`alwaysApply`）；**完整执笔骨架（英文规范）**见 **[devpaper/docs/log-authoring-guide.md](devpaper/docs/log-authoring-guide.md)**（**npm 包内仅含此 `docs/` 文件**）。

---

## Devpaper：按月上手（推荐）

1. **安装依赖（一次）**：`cd devpaper && npm install`  
2. **写手记**：按日编辑 **`devpaper/logs/YYYY-MM-DD.md`**（多篇用多个 `##`）。  
3. **索引 + 整月 HTML**（在**仓库根**执行）：

```bash
npm run dp:idx
npm run dp:month -- 2026-04
```

打开 **`devpaper/dist/2026-04/index.html`** 浏览该月导航（建议用 http；说明见 [devpaper/README.md](devpaper/README.md)）。

单日生成仍可用：`npm run dp:day -- 2026-04-30`。

**月历、以及「在网页里一键生成」**才需要本机 http，写法和区别见 **[devpaper/README.md 第四节「要不要开浏览器服务？怎么开？」](devpaper/README.md)**（推荐 **`npm run dp:hub`** 开一个终端即可；或只用 **`npx serve .`** 看月历但不要页内按钮）。

**月历数据**：依赖 **`devpaper/logs/hub-calendar.json`**（`dp:idx` 生成）与 **`devpaper/dist/*.html`**；改 md 后请再跑 `dp:idx` / `dp:day` / `dp:all`。

---

## 常见错误：`Cannot find module '...\src\cli.mjs'`

若在**仓库根**执行 `node src/cli.mjs ...`，Node 会去找根下的 `src/cli.mjs`，**该路径不存在**（CLI 在 `devpaper/src/cli.mjs`）。

请任选其一：

- 在根目录：`node devpaper/src/cli.mjs build --month 2026-04`
- 或在根目录：`npm run devpaper -- build --month 2026-04`
- 或先：`cd devpaper`，再：`node src/cli.mjs build --month 2026-04`

---

## Devpaper：根目录 npm 脚本（复制用）

需 **Node ≥ 18**；依赖在 **`devpaper`** 目录执行过 **`npm install`**。

| 用途 | 命令 |
|------|------|
| 索引 + `INDEX.md` | `npm run dp:idx` |
| 单日默认报纸 | `npm run dp:day -- 2026-04-10` |
| 单日专题大报版式 | `npm run dp:day:bs -- 2026-04-10` |
| 单日阅刊长读版式 | `npm run dp:day:reader -- 2026-04-10` |
| 所有有日志的日各一份 HTML | `npm run dp:all` |
| 本机手记控制台（月历 + 页内一键生成；**可选**，`Ctrl+C` 停） | `npm run dp:hub` → 浏览器打开 **`http://127.0.0.1:8765/hub/index.html`**（说明见 [devpaper/README.md](devpaper/README.md) 第四节） |
| 自然月 + 导航壳 | `npm run dp:month -- 2026-04` |
| 自然周 + 导航壳 | `npm run dp:week -- 2026-04-10` |
| 任意区间 | `npm run devpaper -- build --from 2026-04-01 --to 2026-04-30` |
| 虚构演示日志 | `npm run devpaper:sample`（或见 devpaper README） |
| 隔离目录一键演示 HTML | `npm run dp:demo`（写入 `devpaper/.demo-logs` 与 `devpaper/.demo-out`，不碰真实 `logs/`） |
| 单测 | `npm test`（跑 `devpaper` 包内 `node:test`） |

更多参数（`--logs`、`--out`、`--template`、`--single-html`）见 **[devpaper/README.md](devpaper/README.md)**。

---

## OpenSpec（本仓库）

**流程与目录说明**（立项 → 规格 → 实现 → 合并 → 归档）：见 **[openspec/README.md](openspec/README.md)**。  
**现行契约**：[`openspec/specs/`](openspec/specs/)（与 `devpaper/` 行为强绑定）。  
**新变更骨架**：复制 [`openspec/changes/archive/2026-05-07-openspec-baseline/template/`](openspec/changes/archive/2026-05-07-openspec-baseline/template/) 为 `openspec/changes/<短名>/`。

若已安装 OpenSpec CLI，可在仓库根使用 `openspec list`、`openspec status --change <名>`、`openspec validate <名>` 等命令；**未安装 CLI 不影响**阅读上述 README 与 `specs/*.md` 手工维护流程。

---

## 目录结构（摘要）

| 路径 | 说明 |
|------|------|
| `devpaper/` | CLI、模板、样式、脚本 |
| `devpaper/logs/` | **提交**：按日 `*.md` 手记。**忽略**：`index.json`、`INDEX.md`、`hub-calendar.json`（`npm run dp:idx` 可重建） |
| `devpaper/dist/` | 生成的 HTML（**默认忽略**，本机或 CI 再 `build`） |
| `devpaper/hub/` | 静态月历页（需 http 访问） |
| `devpaper/docs-local/` | 补充文档（部分跟踪；见该目录 README） |
| `openspec/specs/` | 现行能力规格（`daily-log`、`newspaper-html`、`ai-memory-index`、`cursor-skill-devpaper`） |
| `openspec/changes/` | **进行中**子目录 + **`archive/`**（内含基线包 **`2026-05-07-openspec-baseline/`**：`template/` + `specs-snapshot/`） |

**Git 忽略**：仓库根 **`.gitignore`**（OS、IDE、`node_modules`、`*.tgz` 等）+ **`devpaper/.gitignore`**（包内 `dist/`、演示目录、索引生成物等）。不必手动删除这些目录，未跟踪即可上传。
