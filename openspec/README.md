# OpenSpec 与本仓库（Devpaper）

本目录存放 **规格驱动** 的契约：

- **`openspec/specs/`**：**现行能力**（与仓库根下的 CLI / 解析 / 模板实现强绑定）。
- **`openspec/changes/<短名>/`**：**进行中**的变更（由你新建；目录内放 proposal / design / tasks / specs 增量）。
- **`openspec/template/`**：**新变更骨架**（复制到 `changes/<短名>/` 后开始写；**唯一权威模板**，不依赖任何归档目录）。

**`openspec/changes/archive/`** 默认 **不纳入 Git**（见仓库根 `.gitignore`）：历史提案若仍需留存，请放在本机、Wiki 或 Release 附件；克隆本仓库者以 **`specs/`** 与 **`template/`** 为准。

## 与实现代码的关系

| 层级 | 路径 | 作用 |
|------|------|------|
| 现行规格 | [`specs/`](./specs/) | 描述当前应满足的行为；改代码若改变对外行为，**应先改 spec 或同步补 spec** |
| 变更骨架 | [`template/`](./template/) | 复制整目录到 `changes/<短名>/` 后填写 |
| 变更提案 | `changes/<短名>/` | 新能力或行为调整：`proposal.md` → `design.md` → `tasks.md` + `specs/<能力>/spec.md` |

能力 ID（目录名）沿用历史命名，与实现模块对应关系：

| 能力 ID | 主要实现 |
|---------|----------|
| `daily-log` | `src/parse.mjs`、手记 Markdown 约定 |
| `newspaper-html` | `src/build.mjs`、`templates/`、`assets/`、`hub/` |
| `ai-memory-index` | `src/index-build.mjs`、`index` / `hub` 子命令 |
| `cursor-skill-devpaper` | Cursor **Rule**（`.cursor/rules/devpaper-log.mdc`）+ **`docs/log-authoring-guide.md`**（npm 包内唯一 `docs` 文件） |

## 推荐工作流（完整闭环）

1. **立项**：复制 **[`openspec/template/`](./template/)** 到 **`openspec/changes/<短名>/`**（整目录复制）。
2. **写 `proposal.md`**：Why / What / Impact；列出涉及的能力 ID。
3. **写 `design.md`**（非平凡时）：关键取舍、与现有解析/HTML 的边界。
4. **写规格增量**：`changes/<短名>/specs/<能力>/spec.md` 用 **Requirement + Scenario** 描述可验收行为。
5. **写 `tasks.md`**：可勾选任务列表；**`tasks.md` 必须为 LF 行尾**（见仓库根 [`.gitattributes`](../.gitattributes)，否则 OpenSpec 插件解析勾选会失败）。
6. **实现**：在仓库根改 `src/` 等、补测、更新 `README.md` / `CHANGELOG.md` 等。
7. **对齐**：实现完成后，将**已定稿**的规格内容**合并回** `openspec/specs/<能力>/spec.md`（若变更目录里已有完整 spec，可直接替换主线对应文件并删除变更目录中的重复）。
8. **收尾**：（可选）将已定稿的 `changes/<短名>/` 移入本机 **`openspec/changes/archive/YYYY-MM-DD-<短名>/`** 留底——该路径默认被 `.gitignore` 忽略，**不会**推送到 GitHub；若无需留档，删除 `changes/<短名>/` 即可。

## PR / 自检清单

- [ ] 行为变化是否有 **spec 或 Purpose** 同步？
- [ ] `tasks.md` 是否 **LF**（Windows 下避免整文件 CRLF）？
- [ ] 仓库根 **`npm test`** 是否通过？
- [ ] CLI 帮助文案（`src/cli.mjs`）是否与规格中的子命令/参数一致？

## 与 Devpaper「手记」的分工

- **OpenSpec**：事前契约——**要做什么、验收长什么样**。
- **Devpaper `logs/`**：事后证据——**当天实际做了什么、根因与权衡**（见 Rule + `log-authoring-guide.md`；手记正文默认不入 Git）。

二者互补；规格里找不到的动机，往往在手记里可追溯。
