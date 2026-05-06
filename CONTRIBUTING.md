# 参与 devpaper 开发

## 本地环境

- Node.js **≥ 18**（与 [package.json](package.json) `engines` 一致）。
- 在**仓库根**执行 **`npm install`**。
- 修改 `src/`、`templates/`、`assets/`、`hub/` 后请运行 **`npm test`**；提交前确保单测通过。

CI 与本地均在仓库根执行 **`npm test`**。

## 目录约定

| 目录 | 说明 |
|------|------|
| `src/` | CLI、构建、解析、Hub 服务逻辑 |
| `templates/`、`assets/` | 内置 HTML/CSS |
| `test/` | `node:test` 单测 |
| `logs/` | 手记源 `*.md` 与索引生成物 **默认不入 Git**（见根 `.gitignore`）；本地 `npm run dp:idx` 可重建 `index.json` 等 |
| `dist/` | 构建产物，**默认不入 Git**；由 CI 或本地 `build` 生成 |
| `docs-local/` | 本机自建长文（路径、a11y、安全、备份等），**不入 Git**、**不进 npm** |

## PR 建议

- **粒度**：一个 PR 聚焦一类变更（如只修解析、只加文档），便于审阅与回滚。
- **不提交**：`node_modules/`、`dist/` 全量、`logs/*.md`、`docs-local/`、索引生成物（见 `.gitignore`）。
- **关联**：复杂行为变更可在 PR 描述中链接 [CHANGELOG.md](CHANGELOG.md) 拟追加条目。

## 发布与版本

- 发版前更新 [CHANGELOG.md](CHANGELOG.md) 与 `package.json` 的 `version`。
- npm 包 `files` 仅额外包含 **`docs/log-authoring-guide.md`**。若新增需随包分发的路径请同步修改 `package.json` 的 `files`。

## 规范

- 与手记相关的 Cursor 规则见仓库根 `.cursor/rules/devpaper-log.mdc`；完整格式见 [docs/log-authoring-guide.md](docs/log-authoring-guide.md)。
- 对 CLI 行为的约定变更，请同步更新 [README.md](README.md)、**`openspec/specs/`** 中对应能力，以及 [`openspec/README.md`](openspec/README.md)。新变更目录请自 **`openspec/template/`** 复制到 **`openspec/changes/<短名>/`**（**`changes/archive/`** 仅本机留档，默认不入库）。
