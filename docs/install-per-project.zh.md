# 业务项目安装 devpaper（按仓库安装 · 可照做）

面向：**每个业务仓库各自安装 `devpaper`**，在仓库根用 `npx` / `npm scripts` 跑索引、生成 HTML、开手记控制台。多项目可共用同一手记目录（见 §6）。

---

## 0. 环境要求

| 项 | 要求 |
|----|------|
| **Node.js** | **≥ 18**（建议 LTS：18.x、20.x、22.x） |
| **npm** | 随 Node 安装即可；建议 **≥ 9**（Node 18 自带一般为 9.x）。仅安装依赖**不需要**登录 npm。 |
| **网络** | 能访问 **https://registry.npmjs.org**（或你司配置的镜像）。 |

**自检命令**（在项目根或任意目录执行均可）：

```powershell
node -v
npm -v
```

期望示例：`v20.x.x`、`10.x.x`。若 `node` 不存在，请先安装 Node：  
[https://nodejs.org](https://nodejs.org)（选 LTS）。

---

## 1. 确认「业务项目根」

以下所有 `cd` 均指：**含有业务代码、且将放置 `package.json` 的目录**。

- 若已有 `package.json`：直接进入该目录即可。
- 若还没有（纯文件夹）：在目录内初始化。

### 1.1 还没有 `package.json` 时

```powershell
cd D:\path\to\my-app
npm init -y
```

会生成最简 `package.json`。

---

## 2. 在项目根安装指定版本的 devpaper

把路径、版本号换成你的实际情况。**版本号建议写死**（如 `0.1.7`），避免团队间漂版本。

### 2.1 从 npm 官方源安装（推荐）

```powershell
cd D:\path\to\my-app
npm install devpaper@0.1.7 --save-dev
```

成功后，`package.json` 里会出现 `devDependencies.devpaper`，且存在目录  
`node_modules\devpaper\`。

### 2.2 从 Git 标签安装（npm 上还没有该版本时用）

把仓库地址换成你的（HTTPS 或 SSH 均可）：

```powershell
cd D:\path\to\my-app
npm install git+https://github.com/你的用户/devpaper.git#v0.1.7 --save-dev
```

### 2.3 从本机路径安装（例如你正在改 devpaper 源码）

```powershell
cd D:\path\to\my-app
npm install D:\github\new --save-dev
```

路径必须是 **devpaper 包根**（即含有 `package.json` 且 `name` 为 `devpaper` 的那一层）。

---

## 3. 验证安装是否成功

仍在**业务项目根**：

```powershell
npm list devpaper
npx devpaper --help
```

- `npm list`：应显示 `devpaper@0.1.7`（或你安装的版本）。
- `npx devpaper --help`：应打印 **devpaper** 的中文用法说明。

若 `npx devpaper` 报错找不到命令，确认当前目录是装了依赖的项目根，且 `node_modules\.bin` 未被删掉。

---

## 4. 手记目录与 HTML 输出目录

约定（可改路径，但全项目要统一）：

| 用途 | 推荐路径（相对项目根） |
|------|-------------------------|
| 手记 md | `./logs/YYYY-MM-DD.md` |
| 生成的 HTML | `./dist/`（CLI 会自动建 `YYYY-MM` 等子目录） |

**在项目根创建目录（PowerShell）**：

```powershell
cd D:\path\to\my-app
New-Item -ItemType Directory -Force -Path logs, dist | Out-Null
```

**若手记不入 Git**：在项目根 `.gitignore` 中加一行：

```gitignore
logs/*.md
```

（是否忽略 `dist/` 由团队决定；常见是忽略或只提交部分。）

---

## 5. 配置 `package.json` 的 `scripts`（推荐）

在业务项目 **`package.json`** 的 `"scripts"` 里增加下面键值（与上面 `./logs`、`./dist` 一致）。**若你的路径不同，把两处 `./logs`、`./dist` 一起改掉。**

```json
{
  "scripts": {
    "devpaper:rule": "devpaper init-cursor --logs ./logs --out ./dist",
    "devpaper:idx": "devpaper index --logs ./logs --md --out ./dist",
    "devpaper:day": "devpaper build --logs ./logs --out ./dist --date",
    "devpaper:month": "devpaper build --logs ./logs --out ./dist --month",
    "devpaper:hub": "devpaper hub --logs ./logs --out ./dist"
  }
}
```

### 5.1 每条命令是干什么的

| 脚本 | 作用 |
|------|------|
| `devpaper:rule` | 生成 **`.cursor/rules/devpaper-log.mdc`**（一般每个仓库只做一次，或路径变了再做）。 |
| `devpaper:idx` | 更新 **`logs/index.json`**、**`logs/hub-calendar.json`**、可选 **`logs/INDEX.md`**。 |
| `devpaper:day` | 生成**指定日期**的 HTML（需把日期传到 CLI，见 §5.2）。 |
| `devpaper:month` | 生成**整月**合刊相关 HTML。 |
| `devpaper:hub` | 本机启动**手记控制台**（浏览器打开终端里打印的 `http://127.0.0.1:…/hub/index.html`）。 |

### 5.2 带参数的用法（PowerShell）

`--` 后面的内容会原样传给 `devpaper`：

```powershell
cd D:\path\to\my-app
npm run devpaper:rule
npm run devpaper:idx
npm run devpaper:day -- 2026-05-07
npm run devpaper:month -- 2026-05
npm run devpaper:hub
```

- **单日**：`2026-05-07` 换成你的日期 `YYYY-MM-DD`。
- **单月**：`2026-05` 换成你的 `YYYY-MM`。

停掉手记控制台：在运行 `devpaper:hub` 的那个终端里按 **`Ctrl+C`**。

---

## 6. 多项目共用手记（可选）

多个业务仓库仍**各自**执行 §2 安装 `devpaper`；手记与 HTML 可以指向**同一磁盘目录**。

1. 在本机固定两个目录，例如：  
   `D:\Notes\devpaper-logs`、`D:\Notes\devpaper-dist`。
2. 每个项目的 `scripts` 里把 `--logs`、`--out` 都改成上述**相同**绝对路径（或使用 §6.1 环境变量）。
3. 每个项目各执行一次 **`npm run devpaper:rule`**，让 Cursor Rule 里也写上这对路径。

同一天仍只用一个 **`YYYY-MM-DD.md`**，多项目条目用多条 `##` 标题区分（详见 [log-authoring-guide.md](./log-authoring-guide.md)）。

### 6.1 用环境变量省略长路径（与 devpaper 0.1.6+ 行为一致）

在**当前 PowerShell 会话**中（示例）：

```powershell
$env:DEVPAPER_LOGS = "D:\Notes\devpaper-logs"
$env:DEVPAPER_OUT = "D:\Notes\devpaper-dist"
```

`scripts` 可写成：

```json
{
  "scripts": {
    "devpaper:idx": "devpaper index --md",
    "devpaper:hub": "devpaper hub"
  }
}
```

未写 `--logs` / `--out` 时，会读取 **`DEVPAPER_LOGS` / `DEVPAPER_OUT`**（详见仓库 **README**「路径约定」）。  
**注意**：devpaper **不会**自动读取 `.env` 文件；若要用 `.env`，需项目自行用 `dotenv` 等工具在启动前注入环境变量。

---

## 7. 每新开一个业务项目的检查清单

1. [ ] `cd` 到项目根，确认有 **`package.json`**。  
2. [ ] 执行 **`npm install devpaper@0.1.7 --save-dev`**（或 §2.2 / §2.3）。
3. [ ] §3 验证 **`npx devpaper --help`**。  
4. [ ] 创建 **`logs/`**、**`dist/`**（或你自定义的路径）。  
5. [ ] 复制 §5 的 **`scripts`**，按需改路径。  
6. [ ] 执行 **`npm run devpaper:rule`**（生成 Cursor 规则）。  
7. [ ] 写 **`logs/当日.md`** → **`npm run devpaper:idx`** → **`npm run devpaper:day -- 日期`**。  
8. [ ] 需要月历时 **`npm run devpaper:hub`**，用 **http** 打开终端里的地址（**不要**用资源管理器 `file://` 直接双击控制台页）。

---

## 8. 可选：全局安装 `devpaper` 命令

适合：希望在**任意目录**直接敲 **`devpaper`**（不必先 `cd` 到某个项目）。

```powershell
npm install -g devpaper@0.1.7
```

然后确认全局可执行目录在 **PATH** 中：

```powershell
npm bin -g
```

把输出目录（常见为 `C:\Users\<用户名>\AppData\Roaming\npm`）加入用户或系统 **PATH** 后，**新开**一个终端：

```powershell
devpaper --help
```

仍建议**每个业务仓库**保留 **`devDependencies` 里的 devpaper**，以便锁版本、CI 一致；全局命令可配合 **`DEVPAPER_LOGS` / `DEVPAPER_OUT`** 快速起 `hub`。

---

## 9. 常见问题

| 现象 | 处理 |
|------|------|
| **`npm install` 很慢 / 超时** | 配置国内镜像（如公司 npm 镜像），或检查代理。 |
| **`devpaper` 不是内部或外部命令** | 未装全局或未配 PATH；在项目根请用 **`npx devpaper`** 或 **`npm run devpaper:…`**。 |
| **手记控制台按钮灰色 / 月历数据不对** | 应用 **http** 打开 `…/hub/index.html`，且先 **`devpaper:idx`**；`hub` 与 `index` 使用的 **`--logs`/`--out`（或环境变量）必须一致**。 |
| **发布到 npm 报错 401/404** | 与**安装**无关；需 `npm login` 且对包名有发布权限（见主仓库 README / 维护者文档）。 |

---

## 10. 进一步阅读

- 主说明与 CLI 完整表：[README.md](../README.md)  
- 手记条目格式（英文）：[log-authoring-guide.md](./log-authoring-guide.md)（随 `npm install devpaper` 安装在 `node_modules/devpaper/docs/`）

本文随 npm 包分发；路径以 **Windows + PowerShell** 为主，macOS / Linux 请将 `cd`、`mkdir` 等改为对应 shell 写法即可。
