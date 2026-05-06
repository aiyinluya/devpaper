/**
 * 在隔离目录生成一页演示 HTML（不写真实 devpaper/logs）。
 * 仓库根：npm run dp:demo
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildDayStylePack } from "../src/build.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, "..");
const DEMO_LOGS = path.join(PKG, ".demo-logs");
const DEMO_OUT = path.join(PKG, ".demo-out");
/** 固定演示日，避免与用户手记冲突 */
const DATE = "2099-12-15";
const MONTH_DIR = path.join(DEMO_OUT, DATE.slice(0, 7));

const md = `# ${DATE}

## 12:00 · dp-demo-smoke — 演示手记

**指纹**：\`demo\`, \`smoke\`
**类型**：工具链

### 表象

一键演示生成的单页。

### 根因

无。

### 解法要点

查看 dist 下版式页与各 tpl。

### 警示

可删除 \`.demo-logs\` 与 \`.demo-out\` 目录后重跑。
`;

async function main() {
  await fs.mkdir(DEMO_LOGS, { recursive: true });
  await fs.mkdir(MONTH_DIR, { recursive: true });
  await fs.writeFile(path.join(DEMO_LOGS, `${DATE}.md`), md, "utf8");
  const paths = await buildDayStylePack(DEMO_LOGS, DATE, MONTH_DIR, {});
  const picker = path.join(MONTH_DIR, `${DATE}.html`);
  console.log(`演示输出目录: ${MONTH_DIR}`);
  console.log(`版式选择页: ${picker}`);
  console.log(`共写入 ${paths.length} 个文件。`);
  console.log(
    "提示: 用浏览器打开上述 html（建议本地 http 服务）；勿依赖 file:// 测 Hub。"
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
