/** @param {string} ymd YYYY-MM-DD */
function parseUTC(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** @param {Date} d */
function toYMD(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Inclusive date range, sorted ascending (UTC calendar).
 * @param {string} from YYYY-MM-DD
 * @param {string} to YYYY-MM-DD
 * @returns {string[]}
 */
export function enumerateDatesInclusive(from, to) {
  if (from > to) return [];
  const out = [];
  const cur = parseUTC(from);
  const end = parseUTC(to);
  while (cur <= end) {
    out.push(toYMD(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/**
 * Monday..Sunday (UTC) week containing the given day.
 * @param {string} anyDay YYYY-MM-DD
 * @returns {{ monday: string, sunday: string }}
 */
export function weekBoundsContaining(anyDay) {
  const d = parseUTC(anyDay);
  const dow = d.getUTCDay();
  const mondayOffset = (dow + 6) % 7;
  const mon = new Date(d.getTime());
  mon.setUTCDate(mon.getUTCDate() - mondayOffset);
  const sun = new Date(mon.getTime());
  sun.setUTCDate(sun.getUTCDate() + 6);
  return { monday: toYMD(mon), sunday: toYMD(sun) };
}

/**
 * @param {string} ym YYYY-MM
 * @returns {{ from: string, to: string }}
 */
export function monthBounds(ym) {
  const m = ym.match(/^(\d{4})-(\d{2})$/);
  if (!m) throw new Error(`无效月份: ${ym}，应为 YYYY-MM`);
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) throw new Error(`无效月份: ${ym}`);
  const first = new Date(Date.UTC(y, mo - 1, 1));
  const last = new Date(Date.UTC(y, mo, 0));
  return { from: toYMD(first), to: toYMD(last) };
}
