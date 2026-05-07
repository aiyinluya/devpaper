# hub（手记月历）

- **页面**：`index.html` — 月历格子、链到月刊与各日 HTML。  
- **样式**：与页面同在 **`index.html` 顶部的 `<style>…</style>`**，无单独 CSS 文件；改外观请编辑其中的 `:root`、`.h-cal`、`.h-day` 等。  
- **数据**：在 **`devpaper hub`**（或 `npm run dp:hub`）下由 **`/api/calendar`** 与 **`/logs/index.json`** 提供；若仅用静态站打开（无 API），则读 **`../logs/hub-calendar.json`**（须先对同一套 `logs`/`dist` 跑索引）。  
- **路径**：本机 hub 服务会把 **`/dist/*`** 映射到当前 hub 的 **HTML 输出根**，**`/logs/*`** 映射到 **手记根**（与命令行 `--logs`/`--out` 或 **`DEVPAPER_LOGS`/`DEVPAPER_OUT`** 一致），全局安装 + 环境变量时控制台里的链接也会指向你的真实目录。  
- **打开方式**：勿用 `file://`（无 API 时月历可显示但生成按钮不可用）。执行 `npm run dp:hub` 或 **`devpaper hub`** 后，终端会打印 **`http://127.0.0.1:<端口>/hub/index.html`**；可加 **`--open`**。`npx serve .` 时访问 **`/hub/index.html`**。停服：**Ctrl+C**。  

完整说明见 **`../README.md`** 中的「日历在哪、样式在哪、按月怎么用」与「要不要开浏览器服务」两节。
