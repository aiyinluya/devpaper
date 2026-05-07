import fs from "node:fs/promises";
import path from "node:path";
import { envPath } from "./env-path.mjs";
import { PKG_ROOT } from "./paths.mjs";

const TEMPLATE_REL = "templates/cursor/devpaper-log.mdc";

const LOG_GUIDE_HINT =
  "`node_modules/devpaper/docs/log-authoring-guide.md`（npm 安装 devpaper 后）或克隆本工具仓库后的 `docs/log-authoring-guide.md`";

/** @param {string[]} argv */
function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  return argv[i + 1] ?? null;
}

/** @param {string} abs */
function toPortablePath(abs) {
  return path.resolve(abs).split(path.sep).join("/");
}

/**
 * @param {string[]} argv init-cursor 之后的参数
 * @returns {Promise<{ ok: true, skipped: true, dest: string } | { ok: true, written: true, dest: string, logsDir: string, outDir: string } | { ok: false, error: string }>}
 */
export async function initCursorCommand(argv) {
  const force = argv.includes("--force");
  const cwd = path.resolve(argValue(argv, "--cwd") ?? process.cwd());
  const logsRaw = argValue(argv, "--logs") ?? envPath("DEVPAPER_LOGS");
  const outRaw = argValue(argv, "--out") ?? envPath("DEVPAPER_OUT");
  if (!logsRaw || !outRaw) {
    return {
      ok: false,
      error:
        "init-cursor 需要手记目录与 HTML 输出根：请传 --logs <dir> 与 --out <dir>，或设置环境变量 DEVPAPER_LOGS 与 DEVPAPER_OUT（相对路径相对 --cwd，默认当前目录）。",
    };
  }
  const logsDir = toPortablePath(path.resolve(cwd, logsRaw));
  const outDir = toPortablePath(path.resolve(cwd, outRaw));

  const rulesDir = path.join(cwd, ".cursor", "rules");
  const dest = path.join(rulesDir, "devpaper-log.mdc");
  await fs.mkdir(rulesDir, { recursive: true });

  try {
    const st = await fs.stat(dest);
    if (st.isFile() && !force) {
      return { ok: true, skipped: true, dest };
    }
  } catch {
    /* ENOENT */
  }

  const templatePath = path.join(PKG_ROOT, TEMPLATE_REL);
  let tpl;
  try {
    tpl = await fs.readFile(templatePath, "utf8");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `无法读取模板：${templatePath}（${msg}）`,
    };
  }

  const body = tpl
    .replaceAll("{{LOGS_DIR}}", logsDir)
    .replaceAll("{{OUT_DIR}}", outDir)
    .replaceAll("{{LOG_GUIDE_HINT}}", LOG_GUIDE_HINT);

  await fs.writeFile(dest, body, "utf8");
  return {
    ok: true,
    written: true,
    dest,
    logsDir,
    outDir,
  };
}
