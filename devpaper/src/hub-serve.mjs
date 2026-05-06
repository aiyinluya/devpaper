/**
 * 本地手记控制台：静态文件 + /api/* 触发 index / 单日或全部 HTML 构建（仅监听 127.0.0.1）。
 */
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildHubCalendarSnapshot, buildMemoryIndex } from "./index-build.mjs";
import { filterDatesWithExistingMd } from "./parse.mjs";
import {
  buildDayStylePack,
  buildPeriodHub,
  pruneOrphanDailyHtmlInPeriodDir,
  refreshMonthHubIndex,
  unlinkLegacyRootDayArtifacts,
} from "./build.mjs";
import { monthBounds, enumerateDatesInclusive } from "./range.mjs";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG_ROOT = path.resolve(__dirname, "..");
/**
 * @param {string[]} argv
 * @param {{ logsDir: string, outDir: string, port: number }} opts
 */
export async function startHubFromArgv(argv, opts) {
  const port = (() => {
    const i = argv.indexOf("--port");
    if (i !== -1 && argv[i + 1]) return Number(argv[i + 1]) || 8765;
    return opts.port;
  })();

  const logsDir = opts.logsDir;
  const outDir = opts.outDir;

  /** 扫描 logs 下 md，更新 index.json / INDEX.md / hub-calendar.json，并返回月历快照 */
  async function refreshIndexAndCalendarSnapshot() {
    await buildMemoryIndex(logsDir, { writeMd: true, outDir });
    return buildHubCalendarSnapshot(logsDir, outDir);
  }

  const allow = (/** @type {string} */ addr) =>
    addr === "127.0.0.1" || addr === "::1" || addr === "::ffff:127.0.0.1";

  function sendJson(res, code, obj, extra = {}) {
    const body = JSON.stringify(obj);
    res.writeHead(code, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
      ...extra,
    });
    res.end(body);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        if (!raw) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(e);
        }
      });
      req.on("error", reject);
    });
  }

  /** @param {string} urlPath */
  async function serveStatic(urlPath) {
    const rel = urlPath.replace(/^\/+/, "");
    const safe = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
    const abs = path.join(PKG_ROOT, safe);
    if (!abs.startsWith(PKG_ROOT)) return null;
    try {
      const st = await fs.stat(abs);
      if (!st.isFile()) return null;
      return await fs.readFile(abs);
    } catch {
      return null;
    }
  }

  const server = http.createServer(async (req, res) => {
    const remote = req.socket.remoteAddress ?? "";
    if (!allow(remote)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      });
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);

    if (req.method === "GET" && url.pathname === "/api/calendar") {
      try {
        const snap = await refreshIndexAndCalendarSnapshot();
        sendJson(res, 200, snap);
      } catch (e) {
        sendJson(res, 500, { error: String(e.message || e) });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/index") {
      try {
        const snap = await refreshIndexAndCalendarSnapshot();
        sendJson(res, 200, { ok: true, calendar: snap });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: String(e.message || e) });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/build-day") {
      try {
        const body = await readBody(req);
        const date = body.date;
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          sendJson(res, 400, { ok: false, error: "请求无效，请刷新页面后重试" });
          return;
        }
        try {
          await fs.access(path.join(logsDir, `${date}.md`));
        } catch {
          sendJson(res, 400, {
            ok: false,
            error: "该日还没有手记内容，无法生成",
          });
          return;
        }
        const monthYm = date.slice(0, 7);
        const periodDir = path.join(outDir, monthYm);
        await fs.mkdir(periodDir, { recursive: true });
        await buildDayStylePack(logsDir, date, periodDir, {});
        await refreshMonthHubIndex(outDir, monthYm);
        await unlinkLegacyRootDayArtifacts(outDir, date);
        const snap = await refreshIndexAndCalendarSnapshot();
        sendJson(res, 200, {
          ok: true,
          calendar: snap,
          monthDir: monthYm,
          htmlRel: `${monthYm}/${date}.html`,
        });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: String(e.message || e) });
      }
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/build-month") {
      try {
        const body = await readBody(req);
        const month = body.month;
        if (!month || !/^\d{4}-\d{2}$/.test(month)) {
          sendJson(res, 400, { ok: false, error: "请求无效，请刷新页面后重试" });
          return;
        }
        const bounds = monthBounds(month);
        const dates = enumerateDatesInclusive(bounds.from, bounds.to);
        const datesWithMd = await filterDatesWithExistingMd(logsDir, dates);
        if (datesWithMd.length === 0) {
          sendJson(res, 400, {
            ok: false,
            error: "该月没有任何手记，无法生成合刊",
          });
          return;
        }
        const monthDir = path.join(outDir, month);
        await fs.mkdir(monthDir, { recursive: true });
        await pruneOrphanDailyHtmlInPeriodDir(logsDir, monthDir);
        await buildPeriodHub(
          logsDir,
          outDir,
          datesWithMd,
          {
            indexDirName: month,
            title: `${month} 月刊`,
            subtitle: `${bounds.from} — ${bounds.to}`,
          },
          {}
        );
        await pruneOrphanDailyHtmlInPeriodDir(logsDir, monthDir);
        await refreshMonthHubIndex(outDir, month);
        for (const d of datesWithMd) {
          await unlinkLegacyRootDayArtifacts(outDir, d);
        }
        const snap = await refreshIndexAndCalendarSnapshot();
        const skipped = dates.length - datesWithMd.length;
        sendJson(res, 200, {
          ok: true,
          calendar: snap,
          monthBuiltDays: datesWithMd.length,
          monthSkippedDays: skipped,
        });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: String(e.message || e) });
      }
      return;
    }

    /** 同上区间，但生成「导航壳 + 各日」子目录（与 CLI range 一致） */
    if (req.method === "POST" && url.pathname === "/api/build-period-nav") {
      try {
        const body = await readBody(req);
        const from = body.from;
        const to = body.to;
        if (!from || !to || !YMD.test(from) || !YMD.test(to)) {
          sendJson(res, 400, {
            ok: false,
            error: "请求无效，请刷新页面后重试",
          });
          return;
        }
        const lo = from <= to ? from : to;
        const hi = from <= to ? to : from;
        const dates = enumerateDatesInclusive(lo, hi);
        const datesWithMd = await filterDatesWithExistingMd(logsDir, dates);
        if (datesWithMd.length === 0) {
          sendJson(res, 400, {
            ok: false,
            error: "所选区间内没有手记，无法生成",
          });
          return;
        }
        const indexYm = lo.slice(0, 7);
        const yms = [...new Set(datesWithMd.map((d) => d.slice(0, 7)))];
        for (const ym of yms) {
          const p = path.join(outDir, ym);
          await fs.mkdir(p, { recursive: true });
          await pruneOrphanDailyHtmlInPeriodDir(logsDir, p);
        }
        await buildPeriodHub(
          logsDir,
          outDir,
          datesWithMd,
          {
            indexDirName: indexYm,
            title: `区间 ${lo} — ${hi}`,
            subtitle: `${lo} — ${hi} · ${datesWithMd.length} 日`,
          },
          {}
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
        const snap = await refreshIndexAndCalendarSnapshot();
        sendJson(res, 200, {
          ok: true,
          calendar: snap,
          periodDir: indexYm,
          indexUrl: `/dist/${indexYm}/index.html`,
          periodSkippedDays: dates.length - datesWithMd.length,
        });
      } catch (e) {
        sendJson(res, 500, { ok: false, error: String(e.message || e) });
      }
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      let p = url.pathname;
      if (p === "/" || p === "") p = "/hub/index.html";
      const buf = await serveStatic(p);
      if (buf) {
        const ext = path.extname(p);
        const ct =
          ext === ".html"
            ? "text/html; charset=utf-8"
            : ext === ".json"
              ? "application/json; charset=utf-8"
              : ext === ".css"
                ? "text/css; charset=utf-8"
                : ext === ".js"
                  ? "text/javascript; charset=utf-8"
                  : "application/octet-stream";
        res.writeHead(200, {
          "Content-Type": ct,
          "Access-Control-Allow-Origin": "*",
        });
        if (req.method === "HEAD") res.end();
        else res.end(buf);
        return;
      }
    }

    res.writeHead(404);
    res.end("not found");
  });

  await new Promise((resolve, reject) => {
    server.listen(port, "127.0.0.1", () => resolve(null));
    server.on("error", reject);
  });

  console.log(
    `手记控制台（统一界面） http://127.0.0.1:${port}/hub/index.html\n` +
      `  logs: ${logsDir}\n` +
      `  dist: ${outDir}\n` +
      `  API: GET /api/calendar（含索引刷新）· POST /api/build-day · /api/build-month · /api/build-period-nav · /api/index`
  );
}
