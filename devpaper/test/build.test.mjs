import test from "node:test";
import assert from "node:assert/strict";
import { renderDayHtml } from "../src/build.mjs";

const minimalArticle = {
  displayTitle: "12:00 · smoke-build — 单测",
  slug: "smoke-build",
  synthetic: false,
  bodyMd: "### 表象\n\nx\n",
};

test("renderDayHtml reader: 同日不重复报头日期", async () => {
  const html = await renderDayHtml({
    mastheadDate: "2099-06-01",
    fileDate: "2099-06-01",
    articles: [minimalArticle],
    template: "reader",
  });
  assert.match(html, /<span class="rd-dateline">2099-06-01<\/span>/);
  assert.doesNotMatch(
    html,
    /<span class="rd-dateline">2099-06-01<\/span><span class="rd-file-date"> · 2099-06-01/
  );
});

test("renderDayHtml reader-night: 暗色类与 theme-color", async () => {
  const html = await renderDayHtml({
    mastheadDate: "2099-06-02",
    fileDate: "2099-06-02",
    articles: [minimalArticle],
    template: "reader-night",
  });
  assert.match(html, /class="rd-paper rd-paper--night"/);
  assert.match(html, /name="theme-color"/);
  assert.match(html, /content="#12141a"/);
});

test("renderDayHtml newspaper: 版式指纹", async () => {
  const html = await renderDayHtml({
    mastheadDate: "2099-06-03",
    fileDate: "2099-06-03",
    articles: [minimalArticle],
    template: "newspaper",
  });
  assert.match(html, /class="dp-paper"/);
});
