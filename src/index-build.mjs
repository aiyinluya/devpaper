import fs from "node:fs/promises";
import path from "node:path";
import {
  extractArticleType,
  extractFingerprints,
  extractSeverity,
  extractTags,
  listLogDates,
  parseDailyMarkdown,
} from "./parse.mjs";

const INDEX_VERSION = 1;
const HUB_CAL_VERSION = 4;

/**
 * 扫描 `logs/*.md` 与 `dist` 下 **YYYY-MM** 目录内版式页；兼容旧版 `month-*`、`range-*`、`week-*`。**不**读 `dist` 根散装 HTML。
 * @param {string} logsDir
 * @param {string} outDir
 */
export async function buildHubCalendarSnapshot(logsDir, outDir) {
  const logDates = new Set(await listLogDates(logsDir));
  let distNames = [];
  try {
    distNames = await fs.readdir(outDir);
  } catch {
    distNames = [];
  }
  const htmlRe = /^(\d{4}-\d{2}-\d{2})\.html$/;
  const htmlDates = new Set();
  /** 相对 `outDir` 的版式选择页路径（月刊目录优先于区间/周目录） */
  /** @type {Record<string, string>} */
  const htmlRel = {};
  /** @type {Record<string, boolean>} */
  const monthNavAvailable = {};

  /** @param {string} dirName @param {string} file @param {string} date */
  function recordDayHtml(dirName, file, date) {
    htmlDates.add(date);
    if (!htmlRel[date]) htmlRel[date] = `${dirName}/${file}`;
  }

  for (const n of distNames) {
    const nm = n.match(/^(\d{4}-\d{2})$/);
    if (!nm) continue;
    const ym = nm[1];
    const dirAbs = path.join(outDir, n);
    let isDir = false;
    try {
      const st = await fs.stat(dirAbs);
      isDir = st.isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    try {
      const sub = await fs.readdir(dirAbs);
      monthNavAvailable[ym] =
        (monthNavAvailable[ym] || false) ||
        sub.some((f) => htmlRe.test(f)) ||
        sub.includes("index.html");
      for (const f of sub) {
        const dm = f.match(htmlRe);
        if (dm) recordDayHtml(n, f, dm[1]);
      }
    } catch {
      monthNavAvailable[ym] = false;
    }
  }

  for (const n of distNames) {
    const lm = n.match(/^month-(\d{4}-\d{2})$/);
    if (!lm) continue;
    const ym = lm[1];
    const dirAbs = path.join(outDir, n);
    let isDir = false;
    try {
      const st = await fs.stat(dirAbs);
      isDir = st.isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    try {
      const sub = await fs.readdir(dirAbs);
      monthNavAvailable[ym] =
        (monthNavAvailable[ym] || false) ||
        sub.some((f) => htmlRe.test(f)) ||
        sub.includes("index.html");
      for (const f of sub) {
        const dm = f.match(htmlRe);
        if (dm && !htmlRel[dm[1]]) recordDayHtml(n, f, dm[1]);
      }
    } catch {
      /* skip */
    }
  }

  const rangeRe = /^range-(\d{4}-\d{2}-\d{2})-to-(\d{4}-\d{2}-\d{2})$/;
  for (const n of distNames) {
    const rm = n.match(rangeRe);
    if (!rm) continue;
    const lo = rm[1];
    const hi = rm[2];
    const dirAbs = path.join(outDir, n);
    let isDir = false;
    try {
      const st = await fs.stat(dirAbs);
      isDir = st.isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    try {
      const sub = await fs.readdir(dirAbs);
      for (const f of sub) {
        const dm = f.match(htmlRe);
        if (!dm) continue;
        const date = dm[1];
        if (date < lo || date > hi) continue;
        if (!htmlRel[date]) recordDayHtml(n, f, date);
      }
    } catch {
      /* skip */
    }
  }

  const weekRe = /^week-(\d{4}-\d{2}-\d{2})-to-(\d{4}-\d{2}-\d{2})$/;
  for (const n of distNames) {
    const wm = n.match(weekRe);
    if (!wm) continue;
    const lo = wm[1];
    const hi = wm[2];
    const dirAbs = path.join(outDir, n);
    let isDir = false;
    try {
      const st = await fs.stat(dirAbs);
      isDir = st.isDirectory();
    } catch {
      continue;
    }
    if (!isDir) continue;
    try {
      const sub = await fs.readdir(dirAbs);
      for (const f of sub) {
        const dm = f.match(htmlRe);
        if (!dm) continue;
        const date = dm[1];
        if (date < lo || date > hi) continue;
        if (!htmlRel[date]) recordDayHtml(n, f, date);
      }
    } catch {
      /* skip */
    }
  }
  /** 月历只跟踪「有手记 md」的日期，避免 dist 里无 md 的残留 HTML 误判为已生成 / 待生成 */
  const all = [...logDates].sort();
  /** @type {Record<string, { hasMd: boolean, hasHtml: boolean, htmlRel?: string }>} */
  const dates = {};
  for (const d of all) {
    const hasHtml = htmlDates.has(d);
    const rel = htmlRel[d];
    dates[d] = {
      hasMd: true,
      hasHtml,
      ...(hasHtml && rel ? { htmlRel: rel } : {}),
    };
  }
  return {
    version: HUB_CAL_VERSION,
    generatedAt: new Date().toISOString(),
    dates,
    monthNavAvailable,
  };
}

/**
 * @param {string} logsDir
 * @param {string} outDir
 */
export async function writeHubCalendarJson(logsDir, outDir) {
  const snap = await buildHubCalendarSnapshot(logsDir, outDir);
  const p = path.join(logsDir, "hub-calendar.json");
  await fs.writeFile(p, JSON.stringify(snap, null, 2), "utf8");
  return p;
}

/**
 * @param {string} logsDir
 * @param {{ writeMd?: boolean, outDir?: string }} [opts]
 */
export async function buildMemoryIndex(logsDir, opts = {}) {
  await fs.mkdir(logsDir, { recursive: true });
  const dates = await listLogDates(logsDir);
  /** @type {object[]} */
  const entries = [];

  for (const date of dates) {
    const filePath = path.join(logsDir, `${date}.md`);
    const raw = await fs.readFile(filePath, "utf8");
    const { articles } = parseDailyMarkdown(raw, date);
    let order = 0;
    for (const art of articles) {
      const fps = extractFingerprints(art.bodyMd);
      const tags = extractTags(art.bodyMd);
      const severity = extractSeverity(art.bodyMd);
      const articleType = extractArticleType(art.bodyMd);
      entries.push({
        date,
        file: `${date}.md`,
        htmlFile: `${date.slice(0, 7)}/${date}.html`,
        title: art.displayTitle,
        slug: art.slug,
        synthetic: art.synthetic,
        fingerprints: fps,
        tags,
        severity,
        type: articleType?.slug ?? null,
        typeLabel: articleType?.display ?? null,
        anchor: `art-${order}`,
        order,
      });
      order++;
    }
  }

  const doc = {
    version: INDEX_VERSION,
    generatedAt: new Date().toISOString(),
    entries,
  };

  const jsonPath = path.join(logsDir, "index.json");
  await fs.writeFile(jsonPath, JSON.stringify(doc, null, 2), "utf8");

  if (opts.writeMd) {
    await writeIndexMd(logsDir, doc);
  }

  const outDir = opts.outDir ?? path.resolve(logsDir, "..", "dist");
  const hubCalendarPath = await writeHubCalendarJson(logsDir, outDir);

  return { jsonPath, entryCount: entries.length, hubCalendarPath };
}

/**
 * @param {string} logsDir
 * @param {{ version: number, generatedAt: string, entries: any[] }} doc
 */
async function writeIndexMd(logsDir, doc) {
  const lines = [
    "# Devpaper 记忆索引",
    "",
    `生成时间：${doc.generatedAt}（UTC）`,
    "",
    "| 日期 | slug | 指纹 | 文件 |",
    "| --- | --- | --- | --- |",
  ];
  for (const e of doc.entries) {
    const fp = e.fingerprints.length ? e.fingerprints.join("; ") : "—";
    const slug = e.synthetic ? `${e.slug} *` : e.slug;
    lines.push(
      `| ${e.date} | ${slug} | ${fp} | [${e.file}](./${e.file}) |`
    );
  }
  lines.push("", "*带 `*` 的 slug 为自动生成。*", "");
  await fs.writeFile(path.join(logsDir, "INDEX.md"), lines.join("\n"), "utf8");
}
