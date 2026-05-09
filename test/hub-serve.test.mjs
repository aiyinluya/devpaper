import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { startHubFromArgv } from "../src/hub-serve.mjs";

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

test("hub: /dist 与 /logs 映射到当前 logsDir/outDir", async () => {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "dp-hub-"));
  const logsDir = path.join(base, "logs");
  const outDir = path.join(base, "dist");
  await fs.mkdir(logsDir, { recursive: true });
  await fs.mkdir(path.join(outDir, "2026-05"), { recursive: true });
  await fs.writeFile(
    path.join(logsDir, "index.json"),
    JSON.stringify({ entries: [{ date: "2026-05-07" }] }),
    "utf8"
  );
  await fs.writeFile(
    path.join(outDir, "2026-05", "index.html"),
    "<!doctype html><title>real out</title>",
    "utf8"
  );

  const originalLog = console.log;
  let hub;
  try {
    console.log = () => {};
    hub = await startHubFromArgv([], {
      logsDir,
      outDir,
      port: 0,
      openBrowser: false,
    });
  } finally {
    console.log = originalLog;
  }

  try {
    const hubPage = await fetch(`${hub.url}`);
    assert.equal(hubPage.status, 200);
    assert.match(await hubPage.text(), /手记控制台/);

    const logsRes = await fetch(new URL("/logs/index.json", hub.url));
    assert.equal(logsRes.status, 200);
    assert.deepEqual(await logsRes.json(), {
      entries: [{ date: "2026-05-07" }],
    });

    const distRes = await fetch(new URL("/dist/2026-05/index.html", hub.url));
    assert.equal(distRes.status, 200);
    assert.match(await distRes.text(), /real out/);
  } finally {
    await closeServer(hub.server);
  }
});
