import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { initCursorCommand } from "../src/init-cursor.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src", "cli.mjs");

test("initCursorCommand: 写入 Rule 且含解析后的绝对路径", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "dp-init-"));
  const r = await initCursorCommand([
    "--cwd",
    base,
    "--logs",
    "./my-logs",
    "--out",
    "./my-dist",
  ]);
  assert.equal(r.ok, true);
  assert.ok("written" in r && r.written);
  const dest = /** @type {{ dest: string }} */ (r).dest;
  const body = await fs.readFile(dest, "utf8");
  const expectLogs = path.resolve(base, "my-logs").split(path.sep).join("/");
  const expectOut = path.resolve(base, "my-dist").split(path.sep).join("/");
  assert.ok(body.includes(expectLogs));
  assert.ok(body.includes(expectOut));
  assert.match(body, /devpaper index/);
});

test("initCursorCommand: 已存在时跳过（无 --force）", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "dp-init-"));
  await initCursorCommand(["--cwd", base, "--logs", "./a", "--out", "./b"]);
  const rulePath = path.join(base, ".cursor", "rules", "devpaper-log.mdc");
  const before = await fs.readFile(rulePath, "utf8");
  const second = await initCursorCommand([
    "--cwd",
    base,
    "--logs",
    "./x",
    "--out",
    "./y",
  ]);
  assert.equal(second.ok, true);
  assert.equal(second.skipped, true);
  const after = await fs.readFile(rulePath, "utf8");
  assert.equal(after, before);
});

test("init-cursor CLI: 缺参时退出码 1", () => {
  const r = spawnSync(process.execPath, [cli, "init-cursor"], {
    encoding: "utf8",
    cwd: root,
  });
  assert.equal(r.status, 1, r.stderr + r.stdout);
  assert.match(r.stderr + r.stdout, /init-cursor/);
});
