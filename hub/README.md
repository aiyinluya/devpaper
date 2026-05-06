# hub（手记月历）

- **页面**：`index.html` — 月历格子、链到 `../dist/` 下各日版式页。  
- **样式**：与页面同在 **`index.html` 顶部的 `<style>…</style>`**，无单独 CSS 文件；改外观请编辑其中的 `:root`、`.h-cal`、`.h-day` 等。  
- **数据**：`../logs/hub-calendar.json`（由仓库根 `npm run dp:idx` 生成）。  
- **打开方式**：勿用 `file://`。仓库根执行 `npm run dp:hub`（或全局 `devpaper hub`）后，终端会打印 **`http://127.0.0.1:<端口>/hub/index.html`**；可加 **`--open`** 尝试自动打开浏览器。`npx serve .` 时访问 `/hub/index.html`。停服：**Ctrl+C**。  

完整说明见 **`../README.md`** 中的「日历在哪、样式在哪、按月怎么用」与「要不要开浏览器服务」两节。
