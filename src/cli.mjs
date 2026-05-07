#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import {
  buildAllDays,
  buildDayStylePack,
  buildOneDay,
  buildPeriodHub,
  monthPeriodDirPath,
  pruneOrphanDailyHtmlInPeriodDir,
  refreshMonthHubIndex,
  unlinkLegacyRootDayArtifacts,
} from "./build.mjs";
import { buildMemoryIndex } from "./index-build.mjs";
import { envPath } from "./env-path.mjs";
import { PKG_ROOT, resolveLogs, resolveOut } from "./paths.mjs";
import { initCursorCommand } from "./init-cursor.mjs";
import { filterDatesWithExistingMd } from "./parse.mjs";
import {
  enumerateDatesInclusive,
  monthBounds,
  weekBoundsContaining,
} from "./range.mjs";

/** 默认相对「本包根目录」（`paths.mjs` 解析），避免 cwd 误当成包根 */
const DEFAULT_LOGS = path.join(PKG_ROOT, "logs");
const DEFAULT_OUT = path.join(PKG_ROOT, "dist");

function printHelp() {
  console.log(`devpaper — AI 解题手记：报纸 HTML + 记忆索引

用法:
  devpaper build --date YYYY-MM-DD [--logs <dir>] [--out <dir>]
  devpaper build --all [--logs <dir>] [--out <dir>]
  devpaper build --from YYYY-MM-DD --to YYYY-MM-DD [--logs <dir>] [--out <dir>]
  devpaper build --month YYYY-MM [--logs <dir>] [--out <dir>]
  devpaper build --week-of YYYY-MM-DD [--logs <dir>] [--out <dir>]
  devpaper build … [--template newspaper|broadsheet|reader|reader-night] [--section-title 文本] [--single-html]
  devpaper index [--logs <dir>] [--md] [--out <dir>]
  devpaper hub [--logs <dir>] [--out <dir>] [--port 8765] [--open]
      --open: 启动后尝试用系统默认浏览器打开月历页。
  devpaper init-cursor [--logs <dir>] [--out <dir>] [--cwd <项目根>] [--force]
      在当前项目生成 .cursor/rules/devpaper-log.mdc（手记/HTML 路径写入 Rule）。
      --logs 与 --out 可改用环境变量 DEVPAPER_LOGS、DEVPAPER_OUT；已存在文件时跳过，除非 --force。

路径解析（index / build / hub 及 init-cursor 的默认来源）:
  优先顺序: 命令行 --logs / --out > 环境变量 DEVPAPER_LOGS / DEVPAPER_OUT > 本包内默认 logs、dist。
  init-cursor 中相对路径相对 --cwd（默认当前目录）。

默认 --logs / --out（在未传参且未设上述环境变量时）为本包目录下 logs、dist（与当前工作目录无关）。

路径注意:
  · 在包根请用: node src/cli.mjs … 或 npm run html:day -- 日期
  · 勿在已是包根时再套一层 devpaper/ 前缀路径（旧 monorepo 习惯）

说明:
  · 单日 md 里可写多篇 ##，会排进同一期 HTML。
  · --template：newspaper 经典报面（头版 / 要闻 / 简讯分栏）；broadsheet 专题大报（主栏 / 侧栏 / 底区）；reader 阅刊长读（纵向单栏卡片）；reader-night 阅刊暗色（同结构，深色配色）。默认 newspaper。
  · --section-title：与 broadsheet 搭配时覆盖报头副刊名（默认「手记」）。
  · 默认：各日生成「版式选择页」YYYY-MM-DD.html（下拉切换）+ 各 YYYY-MM-DD.tpl-<id>.html。--single-html 时仅生成单文件日报（无 tpl、无下拉）。
  · 已废弃（仍识别但会提示）：--styles、--omit-main-html（旧版曾单独生成 .styles.html）。
  · 自定义版式壳：templates/user/<id>.html + assets/user/<id>.css（见 templates/user/README.md）。
  · --month / --week-of / --from+--to：各日 HTML 写入 --out 下 **YYYY-MM** 子目录；导航 index.html 写在对应 **起始日所在月**（整月为该月；区间为 --from 所在月；周为周一所在月）。不再使用 dist 根目录散装日报文件。

在包根目录下的短命令（见 package.json）:
  npm run html:day -- 2026-03-06       单日（版式页 + tpl-*）
  npm run html:all                    全部有日志的日
  npm run html:month -- 2026-04       自然月
  npm run html:week -- 2026-04-10     该日所在周
  npm run devpaper -- build --from 2026-04-01 --to 2026-04-15  区间
  npm run idx                         索引 + INDEX.md + hub-calendar.json
  npm run hub                         本地手记控制台（127.0.0.1，含月历与一键生成 API）
  npm test                            运行单测（node:test）

仓库根另有 npm run dp:demo：在 .demo-* 目录生成隔离演示 HTML，不写入真实 logs/。

index 子命令会扫描 logs 下所有 YYYY-MM-DD.md，写入 index.json；加 --md 同时生成 INDEX.md；并写入 logs/hub-calendar.json（扫描 dist 下 YYYY-MM 与旧版 month-* / range-* / week-* 内各日版式页）。
`);
}

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  return argv[i + 1] ?? null;
}

/**
 * @param {string[]} argv
 */
function parseBuildSkin(argv) {
  const t = argValue(argv, "--template");
  if (
    t &&
    t !== "newspaper" &&
    t !== "broadsheet" &&
    t !== "reader" &&
    t !== "reader-night"
  ) {
    console.error(
      "--template 须为 newspaper、broadsheet、reader 或 reader-night"
    );
    process.exit(1);
  }
  const sectionTitle = argValue(argv, "--section-title");
  if (argv.includes("--styles")) {
    console.warn("提示: --styles 已废弃；默认即生成版式选择页与各 tpl-*.html。");
  }
  if (argv.includes("--omit-main-html")) {
    console.warn("提示: --omit-main-html 已废弃；已不再生成单独的 .styles.html。");
  }
  return {
    template: /** @type {"newspaper"|"broadsheet"|"reader"|"reader-night"} */ (
      t ?? "newspaper"
    ),
    sectionTitle: sectionTitle ?? undefined,
    singleHtml: argv.includes("--single-html"),
  };
}

function assertYMD(name, v) {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const got = v == null || v === "" ? "（空）" : JSON.stringify(v);
    console.error(`${name} 须为 YYYY-MM-DD，例如 2026-04-30（收到：${got}）`);
    process.exit(1);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("-h") || argv.includes("--help") || argv.length === 0) {
    printHelp();
    process.exit(0);
  }

  const cmd = argv[0];

  if (cmd === "init-cursor") {
    const r = await initCursorCommand(argv.slice(1));
    if (!r.ok) {
      console.error(r.error);
      process.exit(1);
    }
    if ("skipped" in r && r.skipped) {
      console.log(`已存在（未写入）：${r.dest}\n若要覆盖请加上 --force`);
      process.exit(0);
    }
    if ("written" in r && r.written) {
      console.log(`已写入 ${r.dest}`);
      console.log("下一步示例：");
      console.log(
        `  devpaper index --logs ${r.logsDir} --md --out ${r.outDir}`
      );
      console.log(
        `  devpaper build --logs ${r.logsDir} --out ${r.outDir} --date YYYY-MM-DD`
      );
    }
    return;
  }

  const logsDir = resolveLogs(
    argValue(argv, "--logs") ?? envPath("DEVPAPER_LOGS") ?? DEFAULT_LOGS
  );
  const outDir = resolveOut(
    argValue(argv, "--out") ?? envPath("DEVPAPER_OUT") ?? DEFAULT_OUT
  );

  if (cmd === "hub") {
    const hubArgs = argv.slice(1);
    const openBrowser = hubArgs.includes("--open");
    const hubArgsForServer = hubArgs.filter((a) => a !== "--open");
    const portArg = argValue(hubArgsForServer, "--port");
    const port = portArg ? Number(portArg) || 8765 : 8765;
    const { startHubFromArgv } = await import("./hub-serve.mjs");
    await startHubFromArgv(hubArgsForServer, {
      logsDir,
      outDir,
      port,
      openBrowser,
    });
    return;
  }

  if (cmd === "index") {
    const writeMd = argv.includes("--md");
    const explicitOut =
      argValue(argv, "--out") != null || envPath("DEVPAPER_OUT") !== undefined;
    const calOut = explicitOut
      ? outDir
      : path.resolve(logsDir, "..", "dist");
    const { jsonPath, entryCount, hubCalendarPath } = await buildMemoryIndex(logsDir, {
      writeMd,
      outDir: calOut,
    });
    console.log(`已写入 ${jsonPath}（${entryCount} 条）`);
    if (writeMd) {
      console.log(`已写入 ${path.join(logsDir, "INDEX.md")}`);
    }
    console.log(`已写入 ${hubCalendarPath}`);
    return;
  }

  if (cmd === "build") {
    await fs.mkdir(outDir, { recursive: true });
    const skin = parseBuildSkin(argv);

    if (argv.includes("--all")) {
      const paths = await buildAllDays(logsDir, outDir, skin);
      console.log(`已生成 ${paths.length} 个 HTML → ${outDir}`);
      return;
    }

    const from = argValue(argv, "--from");
    const to = argValue(argv, "--to");
    const month = argValue(argv, "--month");
    const weekOf = argValue(argv, "--week-of");
    const date = argValue(argv, "--date");

    if (from || to) {
      if (!from || !to) {
        console.error("区间汇总须同时提供 --from 与 --to");
        process.exit(1);
      }
      assertYMD("--from", from);
      assertYMD("--to", to);
      if (from > to) {
        console.error("--from 不能晚于 --to");
        process.exit(1);
      }
      const dates = enumerateDatesInclusive(from, to);
      const datesWithMd = await filterDatesWithExistingMd(logsDir, dates);
      if (datesWithMd.length === 0) {
        console.error(
          `所选区间内无手记 md，已退出。请确认 ${logsDir} 下存在对应日期的 .md，或缩小区间。`
        );
        process.exit(1);
      }
      const indexYm = from.slice(0, 7);
      const yms = [...new Set(datesWithMd.map((d) => d.slice(0, 7)))];
      for (const ym of yms) {
        const p = path.join(outDir, ym);
        await fs.mkdir(p, { recursive: true });
        await pruneOrphanDailyHtmlInPeriodDir(logsDir, p);
      }
      const { hubPath, dailyPaths } = await buildPeriodHub(
        logsDir,
        outDir,
        datesWithMd,
        {
          indexDirName: indexYm,
          title: `区间 ${from} — ${to}`,
          subtitle: `${from} — ${to} · ${datesWithMd.length} 日`,
        },
        skin
      );
      for (const ym of yms) {
        await pruneOrphanDailyHtmlInPeriodDir(logsDir, path.join(outDir, ym));
      }
      for (const d of datesWithMd) {
        await unlinkLegacyRootDayArtifacts(outDir, d);
      }
      for (const ym of yms) {
        await refreshMonthHubIndex(outDir, ym);
      }
      console.log(
        `已写入 ${hubPath}（${dailyPaths.length} 份日报）→ ${path.dirname(hubPath)}`
      );
      return;
    }

    if (month) {
      if (!/^\d{4}-\d{2}$/.test(month)) {
        console.error("--month 须为 YYYY-MM");
        process.exit(1);
      }
      let bounds;
      try {
        bounds = monthBounds(month);
      } catch (e) {
        console.error(String(e.message || e));
        process.exit(1);
      }
      const dates = enumerateDatesInclusive(bounds.from, bounds.to);
      const datesWithMd = await filterDatesWithExistingMd(logsDir, dates);
      if (datesWithMd.length === 0) {
        console.error(
          `${month} 月内无手记 md，已退出。请确认 ${logsDir} 下有该月 YYYY-MM-DD.md。`
        );
        process.exit(1);
      }
      const periodAbs = path.join(outDir, month);
      await fs.mkdir(periodAbs, { recursive: true });
      await pruneOrphanDailyHtmlInPeriodDir(logsDir, periodAbs);
      const { hubPath, dailyPaths } = await buildPeriodHub(
        logsDir,
        outDir,
        datesWithMd,
        {
          indexDirName: month,
          title: `${month} 月刊`,
          subtitle: `${bounds.from} — ${bounds.to}`,
        },
        skin
      );
      await pruneOrphanDailyHtmlInPeriodDir(logsDir, periodAbs);
      await refreshMonthHubIndex(outDir, month);
      for (const d of datesWithMd) {
        await unlinkLegacyRootDayArtifacts(outDir, d);
      }
      console.log(
        `已写入 ${hubPath}（${dailyPaths.length} 份日报）→ ${path.dirname(hubPath)}`
      );
      return;
    }

    if (weekOf) {
      assertYMD("--week-of", weekOf);
      const { monday, sunday } = weekBoundsContaining(weekOf);
      const dates = enumerateDatesInclusive(monday, sunday);
      const datesWithMd = await filterDatesWithExistingMd(logsDir, dates);
      if (datesWithMd.length === 0) {
        console.error(
          `该周内无手记 md，已退出。请确认 ${logsDir} 下有该周内的 YYYY-MM-DD.md。`
        );
        process.exit(1);
      }
      const indexYm = monday.slice(0, 7);
      const yms = [...new Set(datesWithMd.map((d) => d.slice(0, 7)))];
      for (const ym of yms) {
        const p = path.join(outDir, ym);
        await fs.mkdir(p, { recursive: true });
        await pruneOrphanDailyHtmlInPeriodDir(logsDir, p);
      }
      const { hubPath, dailyPaths } = await buildPeriodHub(
        logsDir,
        outDir,
        datesWithMd,
        {
          indexDirName: indexYm,
          title: `周 ${monday} — ${sunday}`,
          subtitle: `${monday} — ${sunday}`,
        },
        skin
      );
      for (const ym of yms) {
        await pruneOrphanDailyHtmlInPeriodDir(logsDir, path.join(outDir, ym));
      }
      for (const d of datesWithMd) {
        await unlinkLegacyRootDayArtifacts(outDir, d);
      }
      for (const ym of yms) {
        await refreshMonthHubIndex(outDir, ym);
      }
      console.log(
        `已写入 ${hubPath}（${dailyPaths.length} 份日报）→ ${path.dirname(hubPath)}`
      );
      return;
    }

    if (date) {
      assertYMD("--date", date);
      const dayDir = monthPeriodDirPath(outDir, date);
      await fs.mkdir(dayDir, { recursive: true });
      if (skin.singleHtml) {
        const html = await buildOneDay(logsDir, date, skin);
        const outPath = path.join(dayDir, `${date}.html`);
        await fs.writeFile(outPath, html, "utf8");
        await refreshMonthHubIndex(outDir, date.slice(0, 7));
        await unlinkLegacyRootDayArtifacts(outDir, date);
        console.log(`已写入 ${outPath}（--single-html，无版式切换）`);
        return;
      }
      const paths = await buildDayStylePack(logsDir, date, dayDir, skin);
      await refreshMonthHubIndex(outDir, date.slice(0, 7));
      await unlinkLegacyRootDayArtifacts(outDir, date);
      console.log(
        `已写入 ${paths.length} 个文件（版式页 ${path.join(dayDir, `${date}.html`)} + 各 tpl）`
      );
      return;
    }

    console.error(
      "请指定 --date、--all、--from/--to、--month 或 --week-of。单日示例：--date 2026-04-30"
    );
    printHelp();
    process.exit(1);
  }

  console.error(`未知命令: ${cmd}`);
  printHelp();
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
