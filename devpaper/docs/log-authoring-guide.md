# Devpaper log authoring guide

This document is the **authoritative reference** for log entry format and metadata. The path is the same whether you **clone the repo** or install via **`npm install devpaper`**: `docs/log-authoring-guide.md` (relative to the `devpaper` package root). The Cursor rule at the repo root (`.cursor/rules/devpaper-log.mdc`) only states *when*, *where*, and *wrap-up* reminders; **templates, field semantics, and copy-paste skeleton live here**.

Log bodies are often written in Chinese (or any human language); **metadata keys** in entries may use the Chinese labels below so they match the HTML/index parsers.

**Repo-only supplements** (default paths, a11y checklist, security assumptions, backup notes): see **[`../docs-local/README.md`](../docs-local/README.md)**. Those files are **not** included in the npm package—only this guide ships under `docs/` in the tarball.

---

## When to write

Before the end of the current session, add an entry to **today’s** log (skip if the user explicitly says not to), after you have:

- Fixed a bug or resolved a non-trivial config/build issue, **and**
- Something meaningful to say about **root cause** or **trade-offs** (not purely mechanical edits).

---

## Where to write

- Default: `devpaper/logs/YYYY-MM-DD.md` (use the **session’s “today”**; if `devpaper` lives under another root, follow the agreed `logs` path).
- If the day file does not exist: create it; the first line may be `# YYYY-MM-DD` as a masthead.

---

## Article shape (one `##` block = one article)

Prefer a **slug** (kebab-case) in the heading for indexing and deduplication:

```markdown
## HH:MM · your-slug — Short human-readable title

**指纹**：`one-token`, `another-token`
**刊位**：头版
**等级**：高
**类型**：构建 / CI
#example-tag

### 表象

### 根因

### 解法要点

### 警示
```

### Deck tier `刊位` (optional, affects newspaper layout)

Near the fingerprint / tags, add one line: `**刊位**：头版`, `**刊位**：要闻`, or `**刊位**：简讯`. HTML maps these to front page / main / sidebar tiers. If omitted: first article → front; roughly 2–6 articles → main (more articles → slightly more main slots); the rest → sidebar.

### Severity and type `等级` / `类型` (optional)

Optional single-line metadata displayed as badges in HTML; `index.json` carries `severity` / `type` / `typeLabel`.

- **等级** (or **严重程度**): `高` / `中` / `低`, or common English tokens such as `P0`, `critical`, `high` (parser uses the first matching line).
- **类型**: free short text; English yields stable CSS class names; pure CJK etc. yields a short `t-…` id while the badge still shows the original label.

These lines are stripped from the article body during HTML build so they do not duplicate `###` sections.

### Fingerprints `指纹` (strongly recommended)

A **fingerprint** is a **short stable token family** for recurring failures/pitfalls—useful for clustering in `index.json`. It is **not** a file hash.

- Recommended: `**指纹**：token-a, token-b` or `指纹：token-a, token-b`.
- Prefer stable names, e.g. `powershell-no-and-chain`, `git-lfs-404`.

Multiple articles per day: use several `##` headings in the same `YYYY-MM-DD.md`; the daily HTML edition will lay them out as separate articles.

### Tags

In the body, `#tag` is supported (must start with a letter, at least 2 characters).

---

## After writing (index and HTML)

**Inside `devpaper/`:** `node src/cli.mjs` / `npm run idx`, `npm run html:day -- …`  
**At monorepo root:** `node devpaper/src/cli.mjs` or `npm run dp:idx`, `npm run dp:day -- …`  
**Do not** run `node devpaper/src/cli.mjs` when cwd is already `devpaper/` (path will double up).

```bash
cd devpaper && npm install && npm run idx
```

From repo root: `npm run dp:idx`. Single-day HTML: `npm run dp:day -- 2026-04-30` (root).

Week / month / range builds write under `devpaper/dist/<period>/`; prefer a local static server over raw `file://` if you hit iframe limits.

```bash
cd devpaper && npm run html:week -- 2026-04-30
cd devpaper && npm run html:month -- 2026-04
cd devpaper && npm run devpaper -- build --from 2026-04-01 --to 2026-04-30
```

---

## Do not

- Invent unverified root causes.
- Paste huge unstructured logs; keep only fragments that help **future you** (or teammates) with similar incidents.
