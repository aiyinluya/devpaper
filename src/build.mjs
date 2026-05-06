import fs from "node:fs/promises";
import path from "node:path";
import { marked } from "marked";
import { PKG_ROOT } from "./paths.mjs";
import { listTemplateVariants, safeTemplateFileToken } from "./templates.mjs";
import {
  extractArticleType,
  extractDeckTier,
  extractFingerprints,
  extractSeverity,
  filterDatesWithExistingMd,
  listLogDates,
  parseDailyMarkdown,
  stripPresentationMeta,
} from "./parse.mjs";
import { monthBounds, enumerateDatesInclusive } from "./range.mjs";

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 报头二级日期：仅当一级标题日与文件名日不同时追加（避免「2026-04-16 · 2026-04-16」重复）。
 * @param {string} spanClass
 * @param {string} mastheadDate
 * @param {string} fileDate
 */
function fileDateSecondaryLineHtml(spanClass, mastheadDate, fileDate) {
  if (mastheadDate === fileDate) return "";
  return `<span class="${spanClass}"> · ${escapeHtml(fileDate)}</span>`;
}

const SAFE_IMG_URL = /^https?:\/\//i;

/** 自然月目录名：`YYYY-MM`（与 ISO 月一致，不再使用 `month-` 前缀） */
/** @param {string} dateYmd `YYYY-MM-DD` */
export function monthPeriodDirName(dateYmd) {
  return dateYmd.slice(0, 7);
}

/** @param {string} outDir @param {string} dateYmd */
export function monthPeriodDirPath(outDir, dateYmd) {
  return path.join(outDir, monthPeriodDirName(dateYmd));
}

/**
 * 删除 `outDir` 根目录下旧版散落的 `YYYY-MM-DD.html` / `YYYY-MM-DD.tpl-*.html`（以 `YYYY-MM/` 子目录内输出为准）。
 * @param {string} outDir
 * @param {string} dateYmd
 */
export async function unlinkLegacyRootDayArtifacts(outDir, dateYmd) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYmd)) return;
  let names = [];
  try {
    names = await fs.readdir(outDir);
  } catch {
    return;
  }
  const esc = dateYmd.replace(/-/g, "\\-");
  const re = new RegExp(`^${esc}(\\.html|\\.tpl-.+\\.html)$`);
  for (const n of names) {
    if (!re.test(n)) continue;
    const abs = path.join(outDir, n);
    try {
      const st = await fs.stat(abs);
      if (!st.isFile()) continue;
      await fs.unlink(abs);
    } catch {
      /* ignore */
    }
  }
}

/**
 * @param {string} md
 * @returns {string | null}
 */
function firstMarkdownImageUrlSafe(md) {
  const m = md.match(/!\[[^\]]*\]\(([^)\s]+)\)/);
  if (!m) return null;
  const url = m[1].trim().replace(/^<|>$/g, "");
  if (!SAFE_IMG_URL.test(url)) return null;
  return url;
}

/**
 * @param {string} md
 */
function stripFirstMarkdownImage(md) {
  return md.replace(/\s*!\[[^\]]*\]\([^)]*\)\s*/m, "").trimStart();
}

/**
 * @param {string} s
 * @param {number} max
 */
function truncateOneLine(s, max) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * 正文开头 `> 一行文字` 作为大报提要（与无图主栏位配合）。
 * @param {string} md
 * @returns {string}
 */
function extractLeadingBlockquoteLine(md) {
  const m = md.match(/^\s*>\s*(.+?)(?:\r?\n|$)/);
  return m ? m[1].trim() : "";
}

/**
 * @param {string} md
 */
function stripFirstLeadingBlockquoteLine(md) {
  return md.replace(/^\s*>\s*.+?(?:\r?\n|$)/, "").trimStart();
}

/**
 * 从 Markdown 取首段可见文字作提要（无图时替代主图位）。
 * @param {string} md
 * @param {number} maxLen
 */
/**
 * 提要抽取前去掉刊位/等级/类型与指纹行，避免无图主栏出现元数据句。
 * @param {string} md
 */
function mdForStandfirstExcerpt(md) {
  let t = stripPresentationMeta(md);
  t = t
    .replace(/\n?\s*\*\*指纹\*\*[：:]?[^\n]*(?:\r?\n|$)/gimu, "\n")
    .replace(/\n?\s*指纹[:：][^\n]*(?:\r?\n|$)/gimu, "\n");
  return t.trim();
}

function plainTextStandfirstFromMd(md, maxLen) {
  if (!md || !md.trim()) return "";
  let t = md
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`[^`]*`/g, " ")
    .replace(/\*\*|__|~~|\*|_/g, "")
    .replace(/^#{1,6}\s+.+$/gm, " ")
    .replace(/^\s*[-*+]\s+.+\n?/gm, " ")
    .replace(/\r/g, "\n");
  const paras = t
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const para = paras[0] ?? "";
  if (!para) return "";
  return truncateOneLine(para, maxLen);
}

/**
 * 未手写「刊位」时，要闻条数随总篇数略增，避免大量 bug 全挤进简讯栏。
 * 头版仍固定 1 条；要闻在 2～6 条之间，按 sqrt(除头版外篇数) 取整并封顶。
 * @param {number} total 本篇总数（含头版）
 */
function autoFocusSlotCount(total) {
  if (total <= 2) return Math.max(0, total - 1);
  const rest = total - 1;
  return Math.min(6, Math.max(2, Math.round(Math.sqrt(rest))));
}

/**
 * @param {number} index
 * @param {number} total
 * @returns {"lead"|"focus"|"brief"}
 */
function defaultDeckTier(index, total) {
  if (total <= 1) return "lead";
  if (index === 0) return "lead";
  const slots = autoFocusSlotCount(total);
  if (index >= 1 && index <= slots) return "focus";
  return "brief";
}

function severityLabelZh(sev) {
  if (sev === "high") return "高";
  if (sev === "medium") return "中";
  if (sev === "low") return "低";
  return "";
}

/** 单日同文件内篇数 ≥ 此值时自动用文摘单栏，避免「头版 + 6 要闻 + 几十简讯挤侧栏」。 */
const DIGEST_AUTO_THRESHOLD = 14;

/**
 * @param {{ displayTitle: string, bodyMd: string, tier: string, severity?: "high"|"medium"|"low"|null, typeSlug?: string | null, typeLabel?: string | null }} a
 * @param {number} i
 * @param {boolean} digest
 */
async function renderSingleArticleHtml(a, i, digest) {
  const inner = await marked.parse(a.bodyMd || "_（无正文）_");
  const id = `art-${i}`;
  const tier = a.tier;
  const kicker =
    tier === "lead" ? "头版" : tier === "focus" ? "要闻" : "简讯";
  const sev = a.severity;
  const sevClass = sev ? ` dp-sev-${sev}` : "";
  const typeClass = a.typeSlug ? ` dp-type-${a.typeSlug}` : "";
  const badges = [];
  if (sev) {
    badges.push(
      `<span class="dp-badge dp-badge--sev dp-badge--sev-${escapeHtml(sev)}">${escapeHtml(severityLabelZh(sev))}</span>`
    );
  }
  if (a.typeLabel) {
    badges.push(
      `<span class="dp-badge dp-badge--type">${escapeHtml(a.typeLabel)}</span>`
    );
  }
  const badgeRow =
    badges.length > 0
          ? `<div class="dp-meta-badges">${badges.join("")}</div>`
      : "";
  const kickerBlock = digest
    ? ""
    : `  <p class="dp-kicker dp-kicker--${tier}">${kicker}</p>\n`;
  const articleClass = digest
    ? `dp-article dp-digest-article${sevClass}${typeClass}`
    : `dp-article dp-tier-${tier}${sevClass}${typeClass}`;
  const headlineClass = digest
    ? "dp-digest-headline"
    : `dp-headline dp-headline--${tier}`;
  const bodyClass = digest
    ? "dp-body dp-digest-body"
    : `dp-body dp-body--${tier}`;
  const badgeIndent = badgeRow ? `  ${badgeRow}\n` : "";
  return `<article class="${articleClass}" id="${escapeHtml(id)}">
${kickerBlock}${badgeIndent}  <h2 class="${headlineClass}">${escapeHtml(a.displayTitle)}</h2>
  <div class="${bodyClass}">${inner}</div>
</article>`;
}

/**
 * @param {{ displayTitle: string, slug: string, synthetic?: boolean, bodyMd: string }[]} articles
 */
function assignDeckTiers(articles) {
  const rows = articles.map((a, i) => {
    const manual = extractDeckTier(a.bodyMd);
    const tier = manual ?? defaultDeckTier(i, articles.length);
    const severity = extractSeverity(a.bodyMd);
    const articleType = extractArticleType(a.bodyMd);
    const bodyMd = stripPresentationMeta(a.bodyMd);
    return {
      ...a,
      bodyMd,
      tier,
      manual: Boolean(manual),
      severity,
      typeSlug: articleType?.slug ?? null,
      typeLabel: articleType?.display ?? null,
    };
  });
  let leadSeen = 0;
  const deduped = rows.map((r) => {
    if (r.tier !== "lead") return r;
    leadSeen++;
    if (leadSeen > 1) return { ...r, tier: "focus" };
    return r;
  });
  if (deduped.length && !deduped.some((r) => r.tier === "lead")) {
    return deduped.map((r, i) =>
      i === 0 ? { ...r, tier: "lead" } : r
    );
  }
  return deduped;
}

/**
 * @param {{ displayTitle: string, bodyMd: string, tier: string, severity?: "high"|"medium"|"low"|null, typeSlug?: string | null, typeLabel?: string | null }[]} tiered
 */
async function renderFrontPageHtml(tiered) {
  const chunks = await Promise.all(
    tiered.map(async (a, i) => ({
      html: await renderSingleArticleHtml(a, i, false),
      tier: a.tier,
    }))
  );

  const leads = [];
  const focuses = [];
  const briefs = [];
  for (const c of chunks) {
    if (c.tier === "lead") leads.push(c.html);
    else if (c.tier === "focus") focuses.push(c.html);
    else briefs.push(c.html);
  }

  const leadSection = leads.length
    ? `<section class="dp-sheet dp-sheet--lead" aria-label="头版">
  <div class="dp-sheet-label">头版</div>
  ${leads.join("\n")}
</section>`
    : "";

  const hasRail = briefs.length > 0;
  const hasMain = focuses.length > 0;
  if (!hasMain && !hasRail) {
    return leadSection;
  }

  const cityMods = hasRail ? "" : " dp-sheet--city-solo";
  const rail = hasRail
    ? `<aside class="dp-rail" aria-label="简讯">
  <div class="dp-rail-mast">
    <span class="dp-rail-title">简讯</span>
  </div>
  <div class="dp-rail-stack">${briefs.join("\n")}</div>
</aside>`
    : "";

  const mainWell = hasMain
    ? `<div class="dp-main-well" role="region" aria-label="要闻">
  <div class="dp-main-well-hd"><span>要闻</span></div>
  <div class="dp-main-well-stack">${focuses.join("\n")}</div>
</div>`
    : "";

  const cityGrid = `<div class="dp-sheet dp-sheet--city${cityMods}">
  ${mainWell}
  ${rail}
</div>`;

  return `${leadSection}
<div class="dp-below-fold">
  ${cityGrid}
</div>`;
}

/**
 * @param {{ displayTitle: string, bodyMd: string, tier: string, severity?: "high"|"medium"|"low"|null, typeSlug?: string | null, typeLabel?: string | null }[]} tiered
 */
async function renderDigestHtml(tiered) {
  const blocks = await Promise.all(
    tiered.map((a, i) => renderSingleArticleHtml(a, i, true))
  );
  return `<section class="dp-digest" aria-label="文摘">
  ${blocks.join("\n")}
</section>`;
}

/**
 * 纵向单栏「阅刊」卡片：按 md 内篇序自上而下排列。
 * @param {{ displayTitle: string, bodyMd: string, tier: string, severity?: "high"|"medium"|"low"|null, typeSlug?: string | null, typeLabel?: string | null }} a
 * @param {number} i
 */
async function renderReaderArticleBlock(a, i) {
  const inner = await marked.parse(a.bodyMd || "_（无正文）_");
  const tier = a.tier;
  const tierClass =
    tier === "lead"
      ? " rd-card--lead"
      : tier === "focus"
        ? " rd-card--focus"
        : " rd-card--brief";
  const kicker =
    tier === "lead" ? "头版" : tier === "focus" ? "要闻" : "简讯";
  const sev = a.severity;
  const sevClass = sev ? ` rd-sev-${sev}` : "";
  const typeClass = a.typeSlug ? ` rd-type-${a.typeSlug}` : "";
  const badges = [];
  if (sev) {
    badges.push(
      `<span class="rd-badge rd-badge--sev rd-badge--sev-${escapeHtml(sev)}">${escapeHtml(severityLabelZh(sev))}</span>`
    );
  }
  if (a.typeLabel) {
    badges.push(
      `<span class="rd-badge rd-badge--type">${escapeHtml(a.typeLabel)}</span>`
    );
  }
  const badgeRow =
    badges.length > 0
      ? `<div class="rd-meta-badges">${badges.join("")}</div>`
      : "";
  const num = String(i + 1).padStart(2, "0");
  return `<article class="rd-card${tierClass}${sevClass}${typeClass}" id="art-${i}">
  <header class="rd-card-head">
    <div class="rd-card-head-top">
      <p class="rd-kicker rd-kicker--${tier}">${escapeHtml(kicker)}</p>
      <span class="rd-card-num" aria-hidden="true">${num}</span>
    </div>
    ${badgeRow}
    <h2 class="rd-card-title">${escapeHtml(a.displayTitle)}</h2>
  </header>
  <div class="rd-card-body rd-card-body--${tier}">${inner}</div>
</article>`;
}

/**
 * @param {{ displayTitle: string, bodyMd: string, tier: string, severity?: "high"|"medium"|"low"|null, typeSlug?: string | null, typeLabel?: string | null }[]} tiered
 */
async function renderReaderStreamHtml(tiered) {
  const blocks = await Promise.all(
    tiered.map((a, i) => renderReaderArticleBlock(a, i))
  );
  return `<div class="rd-stream" aria-label="手记正文">
${blocks.join("\n")}
</div>`;
}

/**
 * @param {{ mastheadDate: string, articles: { displayTitle: string, slug: string, bodyMd: string }[], fileDate: string, emptyMessage?: string, sectionTitle?: string }} doc
 * @param {{ night?: boolean }} [options] `night` 为 true 时使用阅刊暗色（`reader-night.css`）
 */
export async function renderReaderHtml(doc, options = {}) {
  const night = Boolean(options.night);
  const tplPath = path.join(PKG_ROOT, "templates", "reader.html");
  const baseCssPath = path.join(PKG_ROOT, "assets", "reader.css");
  const nightCssPath = path.join(PKG_ROOT, "assets", "reader-night.css");
  const cssPromise = night
    ? Promise.all([
        fs.readFile(baseCssPath, "utf8"),
        fs.readFile(nightCssPath, "utf8"),
      ]).then(([base, extra]) => `${base}\n${extra}`)
    : fs.readFile(baseCssPath, "utf8");
  const [tplRaw, css] = await Promise.all([
    fs.readFile(tplPath, "utf8"),
    cssPromise,
  ]);
  let tpl = tplRaw;
  let articlesBlock;
  if (doc.articles.length === 0) {
    const emptyDefault = "本日无手记。";
    const emptyMsg = doc.emptyMessage ?? emptyDefault;
    articlesBlock = `<p class="rd-empty">${escapeHtml(emptyMsg)}</p>`;
  } else {
    const tiered = assignDeckTiers(doc.articles);
    articlesBlock = await renderReaderStreamHtml(tiered);
  }
  tpl = tpl.replace("{{INLINE_CSS}}", css);
  tpl = tpl.replace(
    "{{RD_HEAD_EXTRA}}",
    night
      ? '<meta name="theme-color" content="#12141a" />\n  '
      : ""
  );
  tpl = tpl.replace(
    "{{RD_BODY_CLASS}}",
    night ? "rd-paper rd-paper--night" : "rd-paper"
  );
  tpl = tpl.replace(
    "{{RD_EDITION_LABEL}}",
    night ? "阅刊暗色" : "阅刊长读"
  );
  tpl = tpl.replaceAll("{{MASTHEAD_DATE}}", escapeHtml(doc.mastheadDate));
  tpl = tpl.replaceAll("{{FILE_DATE}}", escapeHtml(doc.fileDate));
  tpl = tpl.replaceAll(
    "{{FILE_DATE_SECONDARY}}",
    fileDateSecondaryLineHtml("rd-file-date", doc.mastheadDate, doc.fileDate)
  );
  tpl = tpl.replace("{{ARTICLES}}", articlesBlock);
  return tpl;
}

/**
 * @param {{ severity?: "high"|"medium"|"low"|null, typeLabel?: string | null }} a
 */
function broadsheetBadgeRowHtml(a) {
  const sev = a.severity;
  const badges = [];
  if (sev) {
    badges.push(
      `<span class="bs-badge bs-badge--sev-${escapeHtml(sev)}">${escapeHtml(severityLabelZh(sev))}</span>`
    );
  }
  if (a.typeLabel) {
    badges.push(`<span class="bs-badge bs-badge--type">${escapeHtml(a.typeLabel)}</span>`);
  }
  return badges.length
    ? `<div class="bs-meta-badges">${badges.join("")}</div>`
    : "";
}

/**
 * @param {{ displayTitle: string, bodyMd: string, tier: string, severity?: "high"|"medium"|"low"|null, typeSlug?: string | null, typeLabel?: string | null }} a
 * @param {number} artIndex
 */
async function renderBroadsheetHero(a, artIndex) {
  const rawMd = a.bodyMd || "";
  const imgUrl = firstMarkdownImageUrlSafe(rawMd);
  let mdBase = imgUrl ? stripFirstMarkdownImage(rawMd) : rawMd;
  const deckQuote = extractLeadingBlockquoteLine(mdBase);
  const mdForParse = deckQuote
    ? stripFirstLeadingBlockquoteLine(mdBase)
    : mdBase;
  const inner = await marked.parse(mdForParse || "_（无正文）_");
  const badges = broadsheetBadgeRowHtml(a);
  const sev = a.severity;
  const typeClass = a.typeSlug ? ` bs-type-${a.typeSlug}` : "";
  const sevClass = sev ? ` bs-sev-${sev}` : "";

  let heroSlot = "";
  if (imgUrl) {
    heroSlot = `<figure class="bs-hero-figure"><img src="${escapeHtml(imgUrl)}" alt="" /></figure>`;
  } else {
    const standText =
      deckQuote || plainTextStandfirstFromMd(mdForStandfirstExcerpt(mdForParse), 340);
    const fps = extractFingerprints(mdForParse).slice(0, 10);
    if (standText || fps.length > 0) {
      const fpHtml =
        fps.length > 0
          ? `<ul class="bs-hero-fp" aria-label="指纹">${fps
              .map((f) => `<li>${escapeHtml(f)}</li>`)
              .join("")}</ul>`
          : "";
      const standHtml = standText
        ? `<p class="bs-hero-standfirst">${escapeHtml(standText)}</p>`
        : "";
      heroSlot = `<div class="bs-hero-slot bs-hero-slot--text">${fpHtml}${standHtml}</div>`;
    }
  }

  return `<article class="bs-hero-article${sevClass}${typeClass}" id="art-${artIndex}">
  <p class="bs-kicker">头版</p>
${badges ? `  ${badges}\n` : ""}  <h2 class="bs-hero-headline">${escapeHtml(a.displayTitle)}</h2>
  ${heroSlot}
  <div class="bs-hero-body">${inner}</div>
</article>`;
}

/**
 * @param {{ displayTitle: string, bodyMd: string, severity?: "high"|"medium"|"low"|null, typeSlug?: string | null, typeLabel?: string | null }} a
 * @param {number} artIndex
 */
async function renderBroadsheetRailArticle(a, artIndex) {
  const inner = await marked.parse(a.bodyMd || "_（无正文）_");
  const badges = broadsheetBadgeRowHtml(a);
  const sev = a.severity;
  const typeClass = a.typeSlug ? ` bs-type-${a.typeSlug}` : "";
  const sevClass = sev ? ` bs-sev-${sev}` : "";
  return `<article class="bs-rail-article${sevClass}${typeClass}" id="art-${artIndex}">
${badges ? `  ${badges}\n` : ""}  <h3 class="bs-rail-headline">${escapeHtml(a.displayTitle)}</h3>
  <div class="bs-rail-body">${inner}</div>
</article>`;
}

/**
 * @param {{ displayTitle: string, bodyMd: string, severity?: "high"|"medium"|"low"|null, typeSlug?: string | null, typeLabel?: string | null }} a
 * @param {number} artIndex
 */
async function renderBroadsheetBelowArticle(a, artIndex) {
  const inner = await marked.parse(a.bodyMd || "_（无正文）_");
  const badges = broadsheetBadgeRowHtml(a);
  const sev = a.severity;
  const typeClass = a.typeSlug ? ` bs-type-${a.typeSlug}` : "";
  const sevClass = sev ? ` bs-sev-${sev}` : "";
  return `<article class="bs-below-article${sevClass}${typeClass}" id="art-${artIndex}">
${badges ? `  ${badges}\n` : ""}  <h3 class="bs-below-headline">${escapeHtml(a.displayTitle)}</h3>
  <div class="bs-below-body">${inner}</div>
</article>`;
}

/**
 * @param {{ displayTitle: string, bodyMd: string, tier: string, severity?: "high"|"medium"|"low"|null, typeSlug?: string | null, typeLabel?: string | null }[]} tiered
 * @returns {Promise<{ teaserBlock: string, inner: string }>}
 */
async function renderBroadsheetFrontHtml(tiered) {
  if (tiered.length === 0) {
    return { teaserBlock: "", inner: "" };
  }
  const heroIdx = tiered.findIndex((a) => a.tier === "lead");
  const hi = heroIdx >= 0 ? heroIdx : 0;
  const hero = tiered[hi];
  const others = tiered.filter((_, i) => i !== hi);
  const teaserCandidates = others.slice(0, 3);
  const teaserBlock =
    teaserCandidates.length >= 2
      ? `<div class="bs-teaser-row" aria-label="提要">
${teaserCandidates
  .map(
    (t) =>
      `  <div class="bs-teaser-cell">${escapeHtml(truncateOneLine(t.displayTitle, 140))}</div>`
  )
  .join("\n")}
</div>
<div class="bs-rule" aria-hidden="true"></div>
`
      : "";
  const rail = others.slice(0, 4);
  const bottom = others.slice(4);
  const heroHtml = await renderBroadsheetHero(hero, hi);
  const railHtml =
    rail.length > 0
      ? `<aside class="bs-hero-rail" aria-label="侧栏">
${(await Promise.all(rail.map((a, i) => renderBroadsheetRailArticle(a, hi + 1 + i)))).join("\n")}
</aside>`
      : "";
  const zoneClass =
    rail.length === 0 ? "bs-hero-zone bs-hero-zone--solo" : "bs-hero-zone";
  const mainGrid = `<div class="${zoneClass}">
<div class="bs-hero-main">
${heroHtml}
</div>
${railHtml}
</div>`;
  let bottomBlock = "";
  if (bottom.length > 0) {
    const startIdx = hi + 1 + rail.length;
    bottomBlock = `<section class="bs-below" aria-label="更多手记">
${(
      await Promise.all(
        bottom.map((a, i) => renderBroadsheetBelowArticle(a, startIdx + i))
      )
    ).join("\n")}
</section>`;
  }
  return { teaserBlock, inner: `${mainGrid}\n${bottomBlock}` };
}

/**
 * @param {{ mastheadDate: string, articles: { displayTitle: string, slug: string, bodyMd: string }[], fileDate: string, emptyMessage?: string, layout?: "auto"|"digest"|"newspaper", digestThreshold?: number, sectionTitle?: string, template?: "newspaper"|"broadsheet" }} doc
 */
export async function renderBroadsheetHtml(doc) {
  const tplPath = path.join(PKG_ROOT, "templates", "broadsheet.html");
  const cssPath = path.join(PKG_ROOT, "assets", "broadsheet.css");
  const [tplRaw, css] = await Promise.all([
    fs.readFile(tplPath, "utf8"),
    fs.readFile(cssPath, "utf8"),
  ]);
  let tpl = tplRaw;
  const layout = doc.layout ?? "auto";
  const threshold = doc.digestThreshold ?? DIGEST_AUTO_THRESHOLD;
  const useDigest =
    layout === "digest" ||
    (layout === "auto" && doc.articles.length >= threshold);

  let articlesBlock = "";
  let teaserBlock = "";
  let bodyClass = "bs-paper";
  if (doc.articles.length === 0) {
    const emptyDefault = "本日无手记。";
    const emptyMsg = doc.emptyMessage ?? emptyDefault;
    articlesBlock = `<p class="bs-empty">${escapeHtml(emptyMsg)}</p>`;
  } else {
    const tiered = assignDeckTiers(doc.articles);
    if (useDigest) {
      bodyClass = "bs-paper bs-paper--digest";
      articlesBlock = `<div class="bs-digest-shell">${await renderDigestHtml(
        tiered
      )}</div>`;
    } else {
      const parts = await renderBroadsheetFrontHtml(tiered);
      teaserBlock = parts.teaserBlock;
      articlesBlock = parts.inner;
    }
  }

  tpl = tpl.replace("{{INLINE_CSS}}", css);
  tpl = tpl.replaceAll("{{MASTHEAD_DATE}}", escapeHtml(doc.mastheadDate));
  tpl = tpl.replaceAll("{{FILE_DATE}}", escapeHtml(doc.fileDate));
  tpl = tpl.replaceAll(
    "{{FILE_DATE_SECONDARY}}",
    fileDateSecondaryLineHtml("bs-dateline-muted", doc.mastheadDate, doc.fileDate)
  );
  tpl = tpl.replace("{{SECTION_TITLE}}", escapeHtml(doc.sectionTitle ?? "手记"));
  tpl = tpl.replace("{{BODY_CLASS}}", bodyClass);
  tpl = tpl.replace("{{TEASER_BLOCK}}", teaserBlock);
  tpl = tpl.replace("{{ARTICLES}}", articlesBlock);
  return tpl;
}

/**
 * @param {{ mastheadDate: string, articles: { displayTitle: string, slug: string, bodyMd: string }[], fileDate: string, emptyMessage?: string, layout?: "auto"|"digest"|"newspaper", digestThreshold?: number, sectionTitle?: string, template?: "newspaper"|"broadsheet"|"reader"|string }} doc
 */
export async function renderDayHtml(doc) {
  const t = doc.template ?? "newspaper";
  if (t === "broadsheet") return renderBroadsheetHtml(doc);
  if (t === "reader") return renderReaderHtml(doc);
  if (t === "reader-night") return renderReaderHtml(doc, { night: true });
  if (t === "newspaper") return renderNewspaperHtml(doc);
  if (/^[a-z0-9-]+$/.test(t)) {
    return renderUserNewspaperShellHtml(doc, t);
  }
  throw new Error(`Unknown template: ${t}`);
}

/**
 * @param {{ mastheadDate: string, articles: { displayTitle: string, slug: string, bodyMd: string }[], fileDate: string, emptyMessage?: string, layout?: "auto"|"digest"|"newspaper", digestThreshold?: number }} doc
 * @param {{ tplPath: string, cssPath: string } | null} [shell]
 */
export async function renderNewspaperHtml(doc, shell = null) {
  const tplPath =
    shell?.tplPath ?? path.join(PKG_ROOT, "templates", "newspaper.html");
  const cssPath =
    shell?.cssPath ?? path.join(PKG_ROOT, "assets", "newspaper.css");
  let tpl = await fs.readFile(tplPath, "utf8");
  const css = await fs.readFile(cssPath, "utf8");

  const layout = doc.layout ?? "auto";
  const threshold = doc.digestThreshold ?? DIGEST_AUTO_THRESHOLD;
  const useDigest =
    layout === "digest" ||
    (layout === "auto" && doc.articles.length >= threshold);

  let articlesBlock;
  if (doc.articles.length === 0) {
    const emptyDefault = "本日无手记。";
    const emptyMsg = doc.emptyMessage ?? emptyDefault;
    articlesBlock = `<p class="dp-empty">${emptyMsg}</p>`;
  } else {
    const tiered = assignDeckTiers(doc.articles);
    articlesBlock = useDigest
      ? await renderDigestHtml(tiered)
      : await renderFrontPageHtml(tiered);
  }

  const bodyClass = useDigest ? "dp-paper dp-paper--digest" : "dp-paper";

  tpl = tpl.replace("{{INLINE_CSS}}", css);
  tpl = tpl.replaceAll("{{MASTHEAD_DATE}}", escapeHtml(doc.mastheadDate));
  tpl = tpl.replaceAll("{{FILE_DATE}}", escapeHtml(doc.fileDate));
  tpl = tpl.replaceAll(
    "{{FILE_DATE_SECONDARY}}",
    fileDateSecondaryLineHtml("dp-file-date", doc.mastheadDate, doc.fileDate)
  );
  tpl = tpl.replace("{{BODY_CLASS}}", bodyClass);
  tpl = tpl.replace("{{ARTICLES}}", articlesBlock);
  return tpl;
}

/**
 * 用户 `templates/user/<id>.html` + `assets/user/<id>.css`，占位符与内置 newspaper 一致。
 * @param {{ mastheadDate: string, articles: { displayTitle: string, slug: string, bodyMd: string }[], fileDate: string, emptyMessage?: string, layout?: "auto"|"digest"|"newspaper", digestThreshold?: number, sectionTitle?: string, template?: string }} doc
 * @param {string} id
 */
async function renderUserNewspaperShellHtml(doc, id) {
  const tid = safeTemplateFileToken(id);
  const tplPath = path.join(PKG_ROOT, "templates", "user", `${tid}.html`);
  const cssPath = path.join(PKG_ROOT, "assets", "user", `${tid}.css`);
  return renderNewspaperHtml(doc, { tplPath, cssPath });
}

/**
 * @param {string} date YYYY-MM-DD
 * @param {{ id: string, label: string, engine: string }[]} variants
 */
async function renderStylePickerHtml(date, variants) {
  const tplPath = path.join(PKG_ROOT, "templates", "style-picker.html");
  const cssPath = path.join(PKG_ROOT, "assets", "style-picker.css");
  const [tplRaw, css] = await Promise.all([
    fs.readFile(tplPath, "utf8"),
    fs.readFile(cssPath, "utf8"),
  ]);
  const selectOptions = variants
    .map((v, i) => {
      const tok = safeTemplateFileToken(v.id);
      const src = `./${date}.tpl-${tok}.html`;
      const selected = i === 0 ? " selected" : "";
      return `<option value="${escapeHtml(src)}"${selected}>${escapeHtml(v.label)}</option>`;
    })
    .join("\n      ");
  const firstTok = safeTemplateFileToken(variants[0].id);
  const firstSrc = `./${date}.tpl-${firstTok}.html`;
  return tplRaw
    .replace("{{INLINE_PICKER_CSS}}", css)
    .replaceAll("{{PICKER_DATE}}", escapeHtml(date))
    .replace("{{SELECT_OPTIONS}}", selectOptions)
    .replace("{{FIRST_IFRAME_SRC}}", escapeHtml(firstSrc));
}

/**
 * 生成各 `DATE.tpl-<id>.html` 与 **`DATE.html` 版式选择页**（顶栏下拉 + iframe 预览各 tpl）。
 * @param {string} logsDir
 * @param {string} date
 * @param {string} outDir
 * @param {{ template?: "newspaper"|"broadsheet", sectionTitle?: string }} [options]
 * @returns {Promise<string[]>}
 */
/** 合刊目录内 `YYYY-MM-DD.html` / `YYYY-MM-DD.tpl-*.html`，无对应 `logs/<日>.md` 时删除（避免旧版全月遍历留下的空版式页）。 */
const PERIOD_DAY_ARTIFACT =
  /^(\d{4}-\d{2}-\d{2})(\.html|\.tpl-.+\.html)$/;

/**
 * @param {string} logsDir
 * @param {string} periodDir 某月目录绝对路径（如 …/dist/2026-04）
 * @returns {Promise<string[]>} 已删除的文件名
 */
export async function pruneOrphanDailyHtmlInPeriodDir(logsDir, periodDir) {
  let files = [];
  try {
    files = await fs.readdir(periodDir);
  } catch {
    return [];
  }
  const removed = [];
  for (const f of files) {
    const m = f.match(PERIOD_DAY_ARTIFACT);
    if (!m) continue;
    const date = m[1];
    try {
      await fs.access(path.join(logsDir, `${date}.md`));
    } catch {
      try {
        await fs.unlink(path.join(periodDir, f));
        removed.push(f);
      } catch {
        /* ignore */
      }
    }
  }
  return removed;
}

export async function buildDayStylePack(logsDir, date, outDir, options = {}) {
  const file = path.join(logsDir, `${date}.md`);
  let raw = "";
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    raw = "";
  }
  const { mastheadDate, articles } = parseDailyMarkdown(raw, date);
  const docBase = {
    mastheadDate,
    articles,
    fileDate: date,
    sectionTitle: options.sectionTitle,
  };
  let variants = await listTemplateVariants();
  const pref = options.template ?? "newspaper";
  const prefIdx = variants.findIndex((v) => v.id === pref || v.engine === pref);
  if (prefIdx > 0) {
    const [pick] = variants.splice(prefIdx, 1);
    variants.unshift(pick);
  }
  const written = [];
  for (const v of variants) {
    const tok = safeTemplateFileToken(v.id);
    const templateId =
      v.engine === "broadsheet"
        ? "broadsheet"
        : v.id === "newspaper"
          ? "newspaper"
          : v.engine === "reader-night" || v.id === "reader-night"
            ? "reader-night"
            : v.id;
    const html = await renderDayHtml({
      ...docBase,
      template: /** @type {"newspaper"|"broadsheet"|"reader"|"reader-night"|string} */ (
        templateId
      ),
    });
    const p = path.join(outDir, `${date}.tpl-${tok}.html`);
    await fs.writeFile(p, html, "utf8");
    written.push(p);
  }
  const picker = await renderStylePickerHtml(date, variants);
  const pickerPath = path.join(outDir, `${date}.html`);
  await fs.writeFile(pickerPath, picker, "utf8");
  written.push(pickerPath);
  return written;
}

/**
 * @param {string} logsDir
 * @param {string} date YYYY-MM-DD
 * @param {{ template?: "newspaper"|"broadsheet", sectionTitle?: string }} [options]
 */
export async function buildOneDay(logsDir, date, options = {}) {
  const file = path.join(logsDir, `${date}.md`);
  let raw = "";
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    raw = "";
  }
  const { mastheadDate, articles } = parseDailyMarkdown(raw, date);
  return renderDayHtml({
    mastheadDate,
    articles,
    fileDate: date,
    template: options.template ?? "newspaper",
    sectionTitle: options.sectionTitle,
  });
}

const ZH_WEEK = ["日", "一", "二", "三", "四", "五", "六"];

function utcWeekdayZh(isoYmd) {
  const d = new Date(`${isoYmd}T12:00:00.000Z`);
  return ZH_WEEK[d.getUTCDay()];
}

/** @param {string} isoYmd YYYY-MM-DD */
function formatNavDateLabel(isoYmd) {
  const parts = isoYmd.split("-");
  if (parts.length !== 3) return isoYmd;
  const mo = Number(parts[1]);
  const dd = Number(parts[2]);
  return `${mo}月${dd}日（周${utcWeekdayZh(isoYmd)}）`;
}

/**
 * `index.html` 位于 `outDir/<indexDirName>/` 时，指向各日版式页的相对路径（可跨月 `../YYYY-MM/`）。
 * @param {string} indexDirName `YYYY-MM`
 * @param {string} dateYmd
 */
function dayPickerHrefFromIndexDir(indexDirName, dateYmd) {
  const dayYm = dateYmd.slice(0, 7);
  if (dayYm === indexDirName) return `./${dateYmd}.html`;
  return `../${dayYm}/${dateYmd}.html`;
}

/**
 * 周期导航页：内嵌 iframe 指向各日 **`YYYY-MM-DD.html`**（版式选择页，可下拉切换 tpl）。
 * @param {{ title: string, subtitle: string, datesSorted: string[], indexDirName: string }} meta
 */
async function renderPeriodHubHtml(meta) {
  const hubCssPath = path.join(PKG_ROOT, "assets", "hub.css");
  const hubTplPath = path.join(PKG_ROOT, "templates", "period-hub.html");
  const [css, tpl] = await Promise.all([
    fs.readFile(hubCssPath, "utf8"),
    fs.readFile(hubTplPath, "utf8"),
  ]);
  const { title, subtitle, datesSorted, indexDirName } = meta;
  const mastExtra = subtitle.trim()
    ? `<p class="dp-hub-sub">${escapeHtml(subtitle.trim())}</p>`
    : "";
  const first = datesSorted[0];
  const firstSrc = first ? dayPickerHrefFromIndexDir(indexDirName, first) : "about:blank";
  const navButtons =
    datesSorted.length === 0
      ? ""
      : datesSorted
          .map((d, i) => {
            const active = i === 0 ? " is-active" : "";
            const label = formatNavDateLabel(d);
            const src = dayPickerHrefFromIndexDir(indexDirName, d);
            return `<button type="button" class="dp-nav-btn${active}" data-dp-src="${escapeHtml(src)}">${escapeHtml(label)}</button>`;
          })
          .join("\n    ");
  return tpl
    .replace("{{INLINE_HUB_CSS}}", css)
    .replaceAll("{{HUB_TITLE}}", escapeHtml(title))
    .replace("{{HUB_MAST_EXTRA}}", mastExtra)
    .replace("{{NAV_BUTTONS}}", navButtons)
    .replace("{{FIRST_IFRAME_SRC}}", escapeHtml(firstSrc));
}

/**
 * 为每个日历日在 `outDir/<该日YYYY-MM>/` 生成版式包；导航壳写入 `outDir/<indexDirName>/index.html`（`indexDirName` 为 `YYYY-MM`，区间时常为起始日所在月）。
 * @param {string} logsDir
 * @param {string} outDir
 * @param {string[]} datesSorted YYYY-MM-DD 升序
 * @param {{ indexDirName: string, title: string, subtitle: string }} meta `indexDirName` 须为 `YYYY-MM`
 * @returns {Promise<{ hubPath: string, periodDir: string, dailyPaths: string[], datesSorted: string[] }>}
 * @param {{ template?: "newspaper"|"broadsheet", sectionTitle?: string, singleHtml?: boolean }} [options]
 */
export async function buildPeriodHub(logsDir, outDir, datesSorted, meta, options = {}) {
  const indexDirName = meta.indexDirName;
  if (!indexDirName || !/^\d{4}-\d{2}$/.test(indexDirName)) {
    throw new Error("buildPeriodHub 需要 meta.indexDirName（YYYY-MM）");
  }
  const indexDir = path.join(outDir, indexDirName);
  await fs.mkdir(indexDir, { recursive: true });
  const dailyPaths = [];
  for (const d of datesSorted) {
    const dayDir = monthPeriodDirPath(outDir, d);
    await fs.mkdir(dayDir, { recursive: true });
    if (options.singleHtml) {
      const html = await buildOneDay(logsDir, d, options);
      const p = path.join(dayDir, `${d}.html`);
      await fs.writeFile(p, html, "utf8");
      dailyPaths.push(p);
    } else {
      const ps = await buildDayStylePack(logsDir, d, dayDir, options);
      dailyPaths.push(...ps);
    }
  }
  const hubHtml = await renderPeriodHubHtml({
    title: meta.title,
    subtitle: meta.subtitle,
    datesSorted,
    indexDirName,
  });
  const hubPath = path.join(indexDir, "index.html");
  await fs.writeFile(hubPath, hubHtml, "utf8");
  return { hubPath, periodDir: indexDirName, dailyPaths, datesSorted };
}

const MONTH_DAY_PICKER_HTML = /^(\d{4}-\d{2}-\d{2})\.html$/;

/**
 * 按 `YYYY-MM` 目录内已有 `YYYY-MM-DD.html` 版式页重写 `index.html`（无版式页则跳过）。
 * @param {string} outDir
 * @param {string} monthYm `YYYY-MM`
 * @returns {Promise<string | null>} 写入的 `index.html` 绝对路径，或 null
 */
export async function refreshMonthHubIndex(outDir, monthYm) {
  const periodDir = path.join(outDir, monthYm);
  let entries = [];
  try {
    entries = await fs.readdir(periodDir);
  } catch {
    return null;
  }
  const datesSorted = entries
    .filter((f) => MONTH_DAY_PICKER_HTML.test(f))
    .map((f) => /** @type {RegExpMatchArray} */ (f.match(MONTH_DAY_PICKER_HTML))[1])
    .filter((d) => d.startsWith(monthYm))
    .sort();
  if (datesSorted.length === 0) return null;
  const bounds = monthBounds(monthYm);
  const hubHtml = await renderPeriodHubHtml({
    title: `${monthYm} 月刊`,
    subtitle: `${bounds.from} — ${bounds.to}`,
    datesSorted,
    indexDirName: monthYm,
  });
  const hubPath = path.join(periodDir, "index.html");
  await fs.writeFile(hubPath, hubHtml, "utf8");
  return hubPath;
}

/**
 * @param {string} logsDir
 * @param {string} outDir
 * @param {{ template?: "newspaper"|"broadsheet", sectionTitle?: string, singleHtml?: boolean }} [options]
 */
export async function buildAllDays(logsDir, outDir, options = {}) {
  const dates = await listLogDates(logsDir);
  const written = [];
  const monthsTouched = /** @type {Set<string>} */ (new Set());
  await fs.mkdir(outDir, { recursive: true });
  for (const d of dates) {
    const ym = d.slice(0, 7);
    const monthDir = monthPeriodDirPath(outDir, d);
    await fs.mkdir(monthDir, { recursive: true });
    if (options.singleHtml) {
      const html = await buildOneDay(logsDir, d, options);
      const outPath = path.join(monthDir, `${d}.html`);
      await fs.writeFile(outPath, html, "utf8");
      written.push(outPath);
    } else {
      const ps = await buildDayStylePack(logsDir, d, monthDir, options);
      written.push(...ps);
    }
    await unlinkLegacyRootDayArtifacts(outDir, d);
    monthsTouched.add(ym);
  }
  for (const ym of monthsTouched) {
    await refreshMonthHubIndex(outDir, ym);
  }
  return written;
}

/** 自然月目录：`dist/YYYY-MM`（纯 ISO 月，不含其它前缀） */
const PERIOD_MONTH_DIR = /^(\d{4}-\d{2})$/;

/**
 * 扫描 `outDir` 下已有自然月目录 `YYYY-MM`，按该月日历范围整包重生成。
 * @param {{ template?: "newspaper"|"broadsheet", sectionTitle?: string, singleHtml?: boolean }} [options]
 * @returns {Promise<{ rebuiltCount: number, periodDirs: string[] }>}
 */
export async function rebuildAllPeriodHubs(logsDir, outDir, options = {}) {
  let dirents = [];
  try {
    dirents = await fs.readdir(outDir, { withFileTypes: true });
  } catch {
    return { rebuiltCount: 0, periodDirs: [] };
  }
  const names = dirents.filter((d) => d.isDirectory()).map((d) => d.name);
  names.sort();
  const periodDirs = [];
  for (const name of names) {
    const monthM = name.match(PERIOD_MONTH_DIR);
    if (monthM) {
      const month = monthM[1];
      const bounds = monthBounds(month);
      const dates = enumerateDatesInclusive(bounds.from, bounds.to);
      const datesWithMd = await filterDatesWithExistingMd(logsDir, dates);
      if (datesWithMd.length === 0) continue;
      await buildPeriodHub(
        logsDir,
        outDir,
        datesWithMd,
        {
          indexDirName: month,
          title: `${month} 月刊`,
          subtitle: `${bounds.from} — ${bounds.to}`,
        },
        options
      );
      for (const d of datesWithMd) {
        await unlinkLegacyRootDayArtifacts(outDir, d);
      }
      periodDirs.push(name);
    }
  }
  return { rebuiltCount: periodDirs.length, periodDirs };
}

/**
 * 将多日内所有 `##` 合并为**单页** HTML（文摘或大报）。默认产品路径已改为 {@link buildPeriodHub}；
 * 本函数保留供脚本或实验调用。
 * @param {string} logsDir
 * @param {string[]} datesSorted YYYY-MM-DD ascending
 * @param {{ mastheadLabel: string, fileDateLabel: string, layout?: "digest"|"newspaper" }} labels
 * @param {{ template?: "newspaper"|"broadsheet", sectionTitle?: string }} [options]
 */
export async function buildMergedReport(logsDir, datesSorted, labels, options = {}) {
  /** @type {{ displayTitle: string, slug: string, synthetic: boolean, bodyMd: string }[]} */
  const merged = [];
  for (const date of datesSorted) {
    const file = path.join(logsDir, `${date}.md`);
    let raw = "";
    try {
      raw = await fs.readFile(file, "utf8");
    } catch {
      raw = "";
    }
    const { articles } = parseDailyMarkdown(raw, date);
    for (const a of articles) {
      merged.push({
        displayTitle: `「${date}」${a.displayTitle}`,
        slug: `${date}-${a.slug}`,
        synthetic: a.synthetic,
        bodyMd: a.bodyMd,
      });
    }
  }
  const mastheadDate = labels.mastheadLabel;
  const fileDate = labels.fileDateLabel;
  const emptyMessage =
    merged.length === 0 ? "该刊期内无手记。" : undefined;

  return renderDayHtml({
    mastheadDate,
    articles: merged,
    fileDate,
    emptyMessage,
    layout: labels.layout === "newspaper" ? "newspaper" : "digest",
    template: options.template ?? "newspaper",
    sectionTitle: options.sectionTitle,
  });
}
