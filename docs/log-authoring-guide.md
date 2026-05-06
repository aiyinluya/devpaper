# Devpaper log authoring guide

This document is the **authoritative reference** for log entry format and metadata. The path is the same whether you **clone this repo** or install via **`npm install devpaper`**: `docs/log-authoring-guide.md` (relative to the **package root**). The Cursor rule (`.cursor/rules/devpaper-log.mdc`) only states *when*, *where*, and *wrap-up* reminders; **templates, field semantics, and copy-paste skeleton live here**.

Log bodies are often written in Chinese (or any human language); **metadata keys** in entries may use the Chinese labels below so they match the HTML/index parsers.

**Optional local supplements** (default paths, a11y checklist, security assumptions, backup notes): keep them in a self-created **`docs-local/`** at the package root on your machine. That directory is **not tracked in this GitHub repo** and is **not** included in the npm package—only this guide ships under `docs/` in the tarball.

---

## When to write

Before the end of the current session, add an entry to **today’s** log (skip if the user explicitly says not to), after you have:

- Fixed a bug or resolved a non-trivial config/build issue, **and**
- Something meaningful to say about **root cause** or **trade-offs** (not purely mechanical edits).

---

## Where to write

- Default: `logs/YYYY-MM-DD.md` (use the **session’s “today”**; if your project uses another `logs` directory by convention, follow that path).
- If the day file does not exist: create it; the first line may be `# YYYY-MM-DD` as a masthead.

### Multi-project, same day (optional)

You MAY keep **one global `logs/` directory** shared across many code repos, and still use **one file per calendar day**. Put entries from different projects in the **same** `YYYY-MM-DD.md`, each as its own `## HH:MM · slug — title` block.

- **Disambiguate projects** with `#project-foo` tags in the body, and/or bake the repo/service into the **slug** (e.g. `acme-api-oauth-timeout`).
- **Fingerprints** SHOULD stay “error family” oriented; add a short **prefix** in the fingerprint line (e.g. `acme`, `jwt-exp`) if you want finer clustering in `index.json`.

To install the Cursor rule into each repo with your chosen `--logs` / `--out`, run **`devpaper init-cursor`** (see the devpaper `README`).

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

**At package root (this repo clone or `node_modules/devpaper`):** `node src/cli.mjs` / `npm run idx`, `npm run html:day -- …`, or from a parent monorepo **`npm run dp:idx`** if you added wrapper scripts.  
**Do not** nest an extra `devpaper/` path segment when cwd is already the package root.

```bash
npm install && npm run idx
```

Single-day HTML: `npm run dp:day -- 2026-04-30` (when `dp:*` scripts exist at repo root) or `npm run html:day -- 2026-04-30`.

Week / month / range builds write under `dist/<period>/`; prefer a local static server over raw `file://` if you hit iframe limits.

```bash
npm run html:week -- 2026-04-30
npm run html:month -- 2026-04
npm run devpaper -- build --from 2026-04-01 --to 2026-04-30
```

---

## Do not

- Invent unverified root causes.
- Paste huge unstructured logs; keep only fragments that help **future you** (or teammates) with similar incidents.
