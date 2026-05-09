# Devpaper 发版流程（npm + Git tag）

面向：维护者准备把当前仓库发布成一个新的 npm 版本，并让 Git 历史能追溯到同一个版本号。

---

## 0. 发版前提

| 项 | 要求 |
|----|------|
| Node.js | **≥ 18** |
| npm | 建议 **≥ 9**；能访问 `https://registry.npmjs.org/` |
| npm 账号 | 已登录，且对包名 `devpaper` 有发布权限 |
| Git | 当前分支包含要发布的代码，工作区清楚可解释 |

自检：

```powershell
node -v
npm -v
npm config get registry
npm whoami
```

期望：

- `npm config get registry` 输出 `https://registry.npmjs.org/`（或团队明确使用的 registry）。
- `npm whoami` 输出你的 npm 用户名，而不是 `401 Unauthorized`。

---

## 1. 决定版本号

遵循 semver 的基本直觉：

- **patch**：修 bug、补文档、兼容性增强，例如 `0.1.6` → `0.1.7`。
- **minor**：增加功能，但不破坏已有用法，例如 `0.1.7` → `0.2.0`。
- **major**：破坏性变更，例如 `1.2.3` → `2.0.0`。

确认 npm 上是否已有该版本：

```powershell
npm view devpaper version
npm view devpaper versions
```

若要发布的版本已存在，必须换一个新版本号；npm 不允许覆盖同名同版本。

---

## 2. 更新版本与 CHANGELOG

1. 将 `CHANGELOG.md` 的 `[Unreleased]` 内容整理到新版本节，例如：

   ```markdown
   ## [0.1.7] - 2026-05-09
   ```

2. 更新 `package.json`：

   ```json
   {
     "version": "0.1.7"
   }
   ```

3. 同步 `package-lock.json`：

   ```powershell
   npm install --package-lock-only
   ```

4. 若 `CHANGELOG.md` 底部维护 release 链接，补上：

   ```markdown
   [0.1.7]: https://github.com/aiyinluya/devpaper/releases/tag/v0.1.7
   ```

---

## 3. 本地验证

在仓库根执行：

```powershell
npm test
npm pack --dry-run
```

重点看：

- 测试全部通过。
- `npm pack --dry-run` 的 `Tarball Contents` 包含必要文件：
  - `devpaper-bin.js`
  - `src/`
  - `assets/`
  - `templates/`
  - `hub/`
  - `docs/log-authoring-guide.md`
  - `docs/install-per-project.zh.md`
  - `docs/release.zh.md`

如果新增了随包分发的文档或模板，记得同步 `package.json` 的 `files`。

---

## 4. 提交 Git

确认差异：

```powershell
git status
git diff
```

提交：

```powershell
git add CHANGELOG.md package.json package-lock.json README.md docs src test hub openspec
git commit -m "chore(release): v0.1.7"
```

提交信息可按实际内容调整。不要把本机私有日志、临时打包产物、调试文件混进 release commit。

---

## 5. 发布 npm

先确认登录与权限：

```powershell
npm whoami
npm owner ls devpaper
```

发布：

```powershell
npm publish
```

若是 scoped public 包，例如 `@your-scope/devpaper`，首次发布通常需要：

```powershell
npm publish --access public
```

发布成功后验证：

```powershell
npm view devpaper version
npm view devpaper dist-tags
```

本机也可新建临时目录验证安装：

```powershell
mkdir $env:TEMP\dp-install-check
cd $env:TEMP\dp-install-check
npm init -y
npm install devpaper@0.1.7 --save-dev
npx devpaper --help
```

---

## 6. 打 Git tag

发布到 npm 后，给对应 commit 打 tag，方便以后从源码追溯 npm 版本。

```powershell
git tag v0.1.7
git push origin main
git push origin v0.1.7
```

如果 main 已经先推过：

```powershell
git push origin v0.1.7
```

建议 npm 版本号、Git tag、CHANGELOG 版本号保持一致。

---

## 7. 常见错误

| 现象 | 含义 / 处理 |
|------|-------------|
| `npm whoami` 报 `401 Unauthorized` | 当前机器未登录或 token 失效。执行 `npm login`，或更新 `.npmrc` 中的 auth token。 |
| `npm publish` 报 `404 Not Found - PUT ...` | 常见原因是未登录、无包名权限，或 registry 不对。先跑 `npm whoami`、`npm owner ls devpaper`、`npm config get registry`。 |
| `npm publish` 报 `403 Forbidden` | 可能没有发布权限、2FA 不满足、包名受限，或该版本已发布。查看 npm 网页上的 Maintainers 与安全设置。 |
| `You cannot publish over the previously published versions` | 该版本号已存在。提高 `package.json` 的 `version`，同步 lockfile 与 CHANGELOG 后重发。 |
| `devpaper` 发布后全局命令仍不可用 | 确认 `package.json` 的 `bin.devpaper` 指向 `devpaper-bin.js`，且 tarball 中包含该文件。安装侧还需确认 npm 全局 bin 目录在 PATH 中。 |
| tarball 缺少新文档/模板 | 检查 `package.json` 的 `files` 字段，再跑 `npm pack --dry-run`。 |

---

## 8. npm publish 与 Git tag 的区别

- **`npm publish`**：把当前包内容发布到 npm registry，供 `npm install devpaper@x.y.z` 使用。
- **`git tag vX.Y.Z`**：给某个 Git commit 打版本标记，供源码追溯、GitHub Release、diff 对比使用。

二者没有技术上的强绑定，但维护上应保持同一个版本号对应同一份代码。
