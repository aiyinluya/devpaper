import test from "node:test";
import assert from "node:assert/strict";
import {
  parseArticleHeading,
  parseDailyMarkdown,
} from "../src/parse.mjs";

test("parseArticleHeading: slug 标题", () => {
  const r = parseArticleHeading("10:00 · my-slug — 标题正文", 0);
  assert.equal(r.slug, "my-slug");
  assert.equal(r.synthetic, false);
  assert.match(r.displayTitle, /my-slug/);
});

test("parseArticleHeading: 无 slug 时合成", () => {
  const r = parseArticleHeading("仅中文描述", 2);
  assert.equal(r.synthetic, true);
  assert.match(r.slug, /^art-2-/);
});

test("parseDailyMarkdown: 空文件仅回退日期", () => {
  const r = parseDailyMarkdown("", "2026-04-01");
  assert.equal(r.mastheadDate, "2026-04-01");
  assert.deepEqual(r.articles, []);
});

test("parseDailyMarkdown: # 报头与一篇 ##", () => {
  const raw = `# 2026-04-02

## 09:00 · demo-case — 演示

### 表象

正文。
`;
  const r = parseDailyMarkdown(raw, "2026-04-02");
  assert.equal(r.mastheadDate, "2026-04-02");
  assert.equal(r.articles.length, 1);
  assert.equal(r.articles[0].slug, "demo-case");
  assert.match(r.articles[0].bodyMd, /表象/);
});

test("parseDailyMarkdown: 报头日与文件名可不同", () => {
  const raw = `# 2026-04-01

## 12:00 · x — y

z
`;
  const r = parseDailyMarkdown(raw, "2026-04-02");
  assert.equal(r.mastheadDate, "2026-04-01");
  assert.equal(r.articles.length, 1);
});
