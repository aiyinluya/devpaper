import fs from "node:fs/promises";
import path from "node:path";
import { PKG_ROOT } from "./paths.mjs";

/**
 * @typedef {{ id: string, label: string, engine: "newspaper"|"broadsheet"|"reader"|"reader-night" }} TemplateVariant
 */

const BUILTIN_VARIANTS = /** @type {TemplateVariant[]} */ ([
  { id: "newspaper", label: "经典报面", engine: "newspaper" },
  { id: "broadsheet", label: "专题大报", engine: "broadsheet" },
  { id: "reader", label: "阅刊长读", engine: "reader" },
  { id: "reader-night", label: "阅刊暗色", engine: "reader-night" },
]);

/**
 * 模板 id 用作文件名片段，仅允许小写字母、数字与中划线。
 * @param {string} id
 */
export function safeTemplateFileToken(id) {
  const s = String(id).toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!s || s.length > 48) {
    throw new Error(`非法模板 id：${id}`);
  }
  return s;
}

/**
 * 读取 `templates/user/catalog.json`（可选），用于自定义展示名。
 * 格式：`[{ "id": "acme", "label": "企业简报" }]`；未知 id 忽略。
 * @returns {Promise<Record<string, string>>}
 */
async function loadUserCatalogLabels() {
  const catalogPath = path.join(PKG_ROOT, "templates", "user", "catalog.json");
  try {
    const raw = await fs.readFile(catalogPath, "utf8");
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return {};
    /** @type {Record<string, string>} */
    const out = {};
    for (const row of data) {
      if (!row || typeof row.id !== "string" || typeof row.label !== "string") {
        continue;
      }
      try {
        const id = safeTemplateFileToken(row.id);
        out[id] = row.label.trim();
      } catch {
        continue;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * 列出所有可选版式：内置 + `templates/user/<id>.html` 且存在 `assets/user/<id>.css`。
 * 用户壳层使用与 `newspaper` 相同的占位符与文章 HTML 管线（仅换皮）。
 * @returns {Promise<TemplateVariant[]>}
 */
export async function listTemplateVariants() {
  const labels = await loadUserCatalogLabels();
  const userDir = path.join(PKG_ROOT, "templates", "user");
  /** @type {TemplateVariant[]} */
  const extra = [];
  let names = [];
  try {
    names = await fs.readdir(userDir);
  } catch {
    return [...BUILTIN_VARIANTS];
  }
  for (const n of names) {
    if (!n.toLowerCase().endsWith(".html")) continue;
    if (n.toLowerCase() === "catalog.json") continue;
    const base = n.replace(/\.html$/i, "");
    let id;
    try {
      id = safeTemplateFileToken(base);
    } catch {
      continue;
    }
    if (
      id === "newspaper" ||
      id === "broadsheet" ||
      id === "reader" ||
      id === "reader-night"
    ) {
      continue;
    }
    const htmlPath = path.join(userDir, `${id}.html`);
    const cssPath = path.join(PKG_ROOT, "assets", "user", `${id}.css`);
    try {
      await fs.access(htmlPath);
      await fs.access(cssPath);
    } catch {
      continue;
    }
    extra.push({
      id,
      label: labels[id] ?? id,
      engine: "newspaper",
    });
  }
  return [...BUILTIN_VARIANTS, ...extra];
}
