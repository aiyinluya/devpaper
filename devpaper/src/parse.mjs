import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}\.md$/;

/** 匹配「## 」之后的一行标题（也兼容整行仍以 `## ` 开头的老数据） */
const SLUG_IN_HEADING =
  /^(?:##\s+)?(?:(\d{1,2}:\d{2})\s*·\s*)?([a-z][a-z0-9-]*)\s*[—\-]\s*(.+)$/u;

/**
 * @param {string} logsDir
 * @returns {Promise<string[]>}
 */
export async function listLogDates(logsDir) {
  let names;
  try {
    names = await fs.readdir(logsDir);
  } catch {
    return [];
  }
  return names
    .filter((n) => DATE_RE.test(n))
    .map((n) => n.replace(/\.md$/, ""))
    .sort();
}

/**
 * 仅保留 `logs/<YYYY-MM-DD>.md` 存在的日期（合刊/区间不生成空版式页）。
 * @param {string} logsDir
 * @param {string[]} datesSorted
 * @returns {Promise<string[]>}
 */
export async function filterDatesWithExistingMd(logsDir, datesSorted) {
  const out = [];
  for (const d of datesSorted) {
    try {
      await fs.access(path.join(logsDir, `${d}.md`));
      out.push(d);
    } catch {
      /* skip */
    }
  }
  return out;
}

function shortHash(s) {
  return crypto.createHash("sha256").update(s).digest("hex").slice(0, 8);
}

/**
 * @param {string} headingLine content after "## " (no ##)
 * @param {number} index
 */
export function parseArticleHeading(headingLine, index) {
  const m = headingLine.match(SLUG_IN_HEADING);
  if (m && m[2]) {
    return {
      displayTitle: headingLine.trim(),
      slug: m[2],
      synthetic: false,
    };
  }
  const fallback = headingLine.trim() || `article-${index}`;
  return {
    displayTitle: fallback,
    slug: `art-${index}-${shortHash(fallback)}`,
    synthetic: true,
  };
}

/**
 * @param {string} body
 * @returns {string[]}
 */
function addFingerprintTokens(raw, out) {
  for (const part of raw.split(/[,，、;；]/)) {
    const t = part.trim().replace(/^[`"'「」]+|[`"'」]+$/g, "");
    if (t) out.add(t);
  }
}

/**
 * 指纹：人工维护的「错误族」短标识，便于 index 与跨会话检索（非文件哈希）。
 * 支持 **指纹** 行与纯文本「指纹：」行。
 * @param {string} body
 * @returns {string[]}
 */
export function extractFingerprints(body) {
  const out = new Set();
  const patterns = [
    /\*\*指纹\*\*[:：]?\s*(.+)$/gmu,
    /(?:^|\n)指纹[:：]\s*(.+)$/gmu,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(body)) !== null) {
      addFingerprintTokens(m[1].trim(), out);
    }
  }
  return [...out];
}

/**
 * @param {string} body
 * @returns {string[]} without leading #
 */
export function extractTags(body) {
  const out = new Set();
  const re = /(^|[\s,，(（])#([a-zA-Z][a-zA-Z0-9_-]{1,31})\b/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out.add(m[2]);
  }
  return [...out];
}

/** @typedef {"lead" | "focus" | "brief"} DeckTier */

/**
 * 读取正文开头的 **刊位**：头版 | 要闻 | 简讯（或 lead / focus / brief），用于 HTML 分层排版。
 * @param {string} body
 * @returns {DeckTier | null}
 */
export function extractDeckTier(body) {
  const m = body.match(
    /\*\*刊位\*\*[：:]\s*(头版|要闻|简讯|lead|focus|brief)\b/i
  );
  if (!m) return null;
  const raw = m[1];
  if (raw === "头版" || /^lead$/i.test(raw)) return "lead";
  if (raw === "要闻" || /^focus$/i.test(raw)) return "focus";
  if (raw === "简讯" || /^brief$/i.test(raw)) return "brief";
  return null;
}

/**
 * 去掉刊位行（可出现在指纹、标签之后），避免渲染进 HTML。
 * @param {string} body
 */
/** @typedef {"high" | "medium" | "low"} SeverityLevel */

/**
 * 从正文读取 **等级** / **严重程度**（单行），用于版式与索引；不写则视为 null（HTML 不加强调样式）。
 * @param {string} body
 * @returns {SeverityLevel | null}
 */
export function extractSeverity(body) {
  const re = /^\s*\*\*(?:等级|严重程度)\*\*[：:]\s*(.+)\s*$/gmu;
  const m = re.exec(body);
  if (!m) return null;
  const raw = m[1].trim();
  if (!raw) return null;
  const lo = raw.toLowerCase();
  if (/^(高|中|低)$/.test(raw)) {
    if (raw === "高") return "high";
    if (raw === "中") return "medium";
    return "low";
  }
  if (/^(严重|致命|高风险|高优先级)/.test(raw)) return "high";
  if (/^(一般|普通|中风险)/.test(raw)) return "medium";
  if (/^(轻微|低风险|低优先级)/.test(raw)) return "low";
  if (
    /^(p0|critical|blocker|high|sev-?0|s0)(?:[\s_\-,.;:/]|$)/i.test(lo)
  ) {
    return "high";
  }
  if (/^(p1|medium|normal|moderate|sev-?1|s1)(?:[\s_\-,.;:/]|$)/i.test(lo)) {
    return "medium";
  }
  if (/^(p2|low|minor|trivial|sev-?2|s2|info)(?:[\s_\-,.;:/]|$)/i.test(lo)) {
    return "low";
  }
  return null;
}

/**
 * @param {string} label
 * @returns {string | null} 仅用于 CSS 类名后缀，ASCII 优先；纯中文等会生成稳定短前缀。
 */
export function slugifyArticleType(label) {
  const raw = String(label || "").trim();
  if (!raw) return null;
  let slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  if (slug.length >= 2) return slug;
  return `t-${shortHash(raw).slice(0, 10)}`;
}

/**
 * @param {string} body
 * @returns {{ slug: string, display: string } | null}
 */
export function extractArticleType(body) {
  const re = /^\s*\*\*类型\*\*[：:]\s*(.+)\s*$/gmu;
  const m = re.exec(body);
  if (!m) return null;
  const display = m[1].trim();
  if (!display) return null;
  const slug = slugifyArticleType(display);
  if (!slug) return null;
  return { slug, display };
}

/**
 * 去掉刊位、等级/严重程度、类型等展示用元数据行，避免重复出现在 HTML 正文。
 * @param {string} body
 */
export function stripPresentationMeta(body) {
  return body
    .replace(
      /\n?\s*\*\*刊位\*\*[：:]\s*(?:头版|要闻|简讯|lead|focus|brief)\s*/gi,
      "\n"
    )
    .replace(
      /\n?\s*\*\*(?:等级|严重程度)\*\*[：:][^\r\n]*(?:\r?\n|$)/gimu,
      "\n"
    )
    .replace(/\n?\s*\*\*类型\*\*[：:][^\r\n]*(?:\r?\n|$)/gimu, "\n")
    .trim();
}

/**
 * @deprecated 使用 {@link stripPresentationMeta}；行为已扩展为同时剥离等级与类型行。
 */
export function stripDeckLine(body) {
  return stripPresentationMeta(body);
}

/**
 * @param {string} raw
 * @param {string} fallbackDate YYYY-MM-DD from filename
 */
export function parseDailyMarkdown(raw, fallbackDate) {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  let i = 0;
  let mastheadDate = fallbackDate;
  if (lines[0]?.startsWith("# ")) {
    mastheadDate = lines[0].replace(/^#\s+/, "").trim() || fallbackDate;
    i = 1;
  }
  while (i < lines.length && lines[i].trim() === "") i++;
  const rest = lines.slice(i).join("\n").trim();
  if (!rest) {
    return { mastheadDate, articles: [] };
  }
  const chunks = rest.split(/\n(?=##\s)/);
  /** @type {{ displayTitle: string, slug: string, synthetic: boolean, bodyMd: string }[]} */
  const articles = [];
  let idx = 0;
  for (const chunk of chunks) {
    const t = chunk.trim();
    if (!t) continue;
    const m = t.match(/^##\s+(.+?)(?:\n|$)/);
    const headingRest = m ? m[1].trim() : `未命名-${idx}`;
    const bodyMd = m ? t.slice(m[0].length).trim() : t;
    const { displayTitle, slug, synthetic } = parseArticleHeading(
      headingRest,
      idx
    );
    articles.push({ displayTitle, slug, synthetic, bodyMd });
    idx++;
  }
  return { mastheadDate, articles };
}
