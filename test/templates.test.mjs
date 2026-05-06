import test from "node:test";
import assert from "node:assert/strict";
import { listTemplateVariants } from "../src/templates.mjs";

test("listTemplateVariants: 内置四条含 reader-night", async () => {
  const v = await listTemplateVariants();
  const ids = v.map((x) => x.id);
  assert.deepEqual(ids.slice(0, 4), [
    "newspaper",
    "broadsheet",
    "reader",
    "reader-night",
  ]);
  const night = v.find((x) => x.id === "reader-night");
  assert.ok(night);
  assert.equal(night.label, "阅刊暗色");
  assert.equal(night.engine, "reader-night");
});
