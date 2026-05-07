import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cli = path.join(root, "src", "cli.mjs");

test("index CLI: DEVPAPER_LOGS / DEVPAPER_OUT 决定手记与输出根", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "dp-env-idx-"));
  const logs = path.join(base, "logs");
  const dist = path.join(base, "dist");
  await fs.mkdir(logs, { recursive: true });
  await fs.mkdir(dist, { recursive: true });
  await fs.writeFile(
    path.join(logs, "2026-05-06.md"),
    "# d\n\n## 09:00 · x — t\n\nbody\n",
    "utf8"
  );
  const env = {
    ...process.env,
    DEVPAPER_LOGS: logs,
    DEVPAPER_OUT: dist,
  };
  const r = spawnSync(process.execPath, [cli, "index", "--md"], {
    cwd: root,
    encoding: "utf8",
    env,
  });
  assert.equal(r.status, 0, r.stderr + r.stdout);
  await fs.access(path.join(logs, "index.json"));
  await fs.access(path.join(logs, "hub-calendar.json"));
});
