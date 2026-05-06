/**
 * 批量生成虚构 bug 手记（仅演示）。
 * 运行：node scripts/generate-fictional-logs.mjs（仓库根）
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGS = path.resolve(__dirname, "../logs");

/** tag → 报纸「类型」角标（中文） */
const TAG_TO_TYPE = {
  frontend: "前端",
  testing: "测试",
  docker: "构建",
  database: "数据",
  react: "前端",
  git: "工具链",
  build: "构建",
  ci: "CI",
  auth: "认证与安全",
  performance: "性能",
  browser: "前端",
  css: "前端",
  infra: "基础设施",
  typescript: "类型系统",
  k8s: "基础设施",
  tooling: "工具链",
  nginx: "基础设施",
  security: "安全",
  backend: "后端",
  nextjs: "前端",
  serverless: "部署",
};

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** @param {{ tag: string, slug: string }} s @param {number} articleIndex @param {string} dayTag */
function pickSeverity(s, articleIndex, dayTag) {
  if (s.tag === "security") return "高";
  if (s.slug === "graphql-introspection-prod") return "高";
  if (s.tag === "auth") return "中";
  if (s.tag === "performance" || s.slug === "redis-reconnect-storm") return "中";
  const r = hashStr(`${dayTag}|${s.slug}|${articleIndex}`) % 10;
  if (r < 2) return "高";
  if (r < 7) return "中";
  return "低";
}

/**
 * 部分篇目手写刊位，演示与自动头版/要闻/简讯的配合。
 * @param {number} articleIndex
 * @param {number} nArticles
 * @param {string} dayTag yyyymmdd
 * @returns {string} 含换行或空
 */
function optionalDeckLine(articleIndex, nArticles, dayTag) {
  const h = hashStr(dayTag) % 11;
  if (articleIndex === 0 && h === 0) return "**刊位**：头版\n";
  if (articleIndex === 1 && h % 4 === 1) return "**刊位**：要闻\n";
  if (articleIndex === nArticles - 1 && h % 5 === 2) return "**刊位**：简讯\n";
  return "";
}

const SCENARIOS = [
  {
    slug: "cors-preflight-403",
    title: "本地联调 API 预检请求 403",
    fp: "cors-preflight-blocked",
    tag: "frontend",
    表象: "浏览器控制台 CORS error，OPTIONS 返回 403。",
    根因: "网关未放行 OPTIONS，且 `Access-Control-Allow-Origin` 未包含本地端口。",
    解法: "在网关白名单加入 `http://localhost:5173`；后端对 OPTIONS 快速 204。",
    防再犯: "先 curl -X OPTIONS 看响应头，再改业务代码。",
  },
  {
    slug: "jest-mock-hoist",
    title: "jest.mock 放在 import 之后不生效",
    fp: "jest-mock-after-import",
    tag: "testing",
    表象: "单测里 mock 了模块仍走到真实实现。",
    根因: "ESM / 提升规则下 `jest.mock` 须在工厂与引用顺序上符合 hoist 约定。",
    解法: "改用 `jest.unstable_mockModule` + 动态 `await import()`，或拆 `setupFiles`。",
    防再犯: "mock 与 import 同文件时先读官方 ESM 指南再写。",
  },
  {
    slug: "docker-layer-cache",
    title: "Docker 构建每次全量重装依赖",
    fp: "docker-copy-packagejson-order",
    tag: "docker",
    表象: "改一行业务代码，`npm ci` 仍跑十几分钟。",
    根因: "`COPY . .` 过早导致依赖层缓存失效。",
    解法: "先只 COPY package*.json 再 `npm ci`，最后 COPY 源码。",
    防再犯: "多阶段构建里把「易变层」放到 Dockerfile 尾部。",
  },
  {
    slug: "prisma-shadow-db",
    title: "migrate dev 报 shadow database 连不上",
    fp: "prisma-shadow-url-missing",
    tag: "database",
    表象: "CI 里 `prisma migrate dev` 失败，本地正常。",
    根因: "CI 未配置 `shadowDatabaseUrl` 或无建库权限。",
    解法: "CI 用 `migrate deploy`；dev 才用 `migrate dev`。",
    防再犯: "流水线里区分 migrate 命令，勿混用。",
  },
  {
    slug: "react-useeffect-twice",
    title: "StrictMode 下 effect 执行两次误以为泄漏",
    fp: "react-strictmode-double-invoke",
    tag: "react",
    表象: "开发环境 useEffect cleanup+setup 各跑两遍。",
    根因: "React 18 StrictMode 故意双调用以暴露副作用问题。",
    解法: "副作用幂等化；计数/订阅用 cleanup 对称释放。",
    防再犯: "勿用 `useEffect` 做「只应发生一次」的注册类逻辑。",
  },
  {
    slug: "git-lfs-pointer",
    title: "拉下来的大文件只有几百字节",
    fp: "git-lfs-not-pulled",
    tag: "git",
    表象: "二进制打开是文本 pointer。",
    根因: "未安装 LFS 或未 `git lfs pull`。",
    解法: "安装 lfs 后 `git lfs install && git lfs pull`。",
    防再犯: "README 写明克隆后必跑 `git lfs pull`。",
  },
  {
    slug: "vite-dynamic-import-chunk",
    title: "动态 import 偶发 chunk load failed",
    fp: "vite-base-path-mismatch",
    tag: "build",
    表象: "部署子路径后懒加载 404。",
    根因: "`base` 与 CDN 前缀不一致，chunk URL 拼错。",
    解法: "统一 `vite.config` 的 `base` 与 nginx `alias`。",
    防再犯: "发版前用「子路径」 smoke 打开懒加载路由。",
  },
  {
    slug: "node-oom-build",
    title: "CI 构建 Node heap out of memory",
    fp: "node-old-space-size",
    tag: "ci",
    表象: "tsc / webpack 在 2G 容器里 OOM。",
    根因: "默认 V8 老生代上限偏低 + 项目体量大。",
    解法: "`NODE_OPTIONS=--max-old-space-size=4096` 或拆包并行。",
    防再犯: "大仓 CI 模板里默认带上内存参数。",
  },
  {
    slug: "oauth-redirect-mismatch",
    title: "登录回调 redirect_uri 不匹配",
    fp: "oauth-redirect-trailing-slash",
    tag: "auth",
    表象: "IdP 报 `redirect_uri_mismatch`。",
    根因: "注册回调带尾斜杠，应用回调没带（或 http/https 混用）。",
    解法: "与白名单字节级对齐；统一 https。",
    防再犯: "把允许的 redirect 列表当配置表审一遍。",
  },
  {
    slug: "sql-n-plus-one",
    title: "列表接口 P99 突然变差",
    fp: "orm-n-plus-one-queries",
    tag: "performance",
    表象: "监控显示 SQL 条数与列表行数成正比爆炸。",
    根因: "循环里懒加载关联，典型 N+1。",
    解法: "`include`/`join` 或 DataLoader 批处理。",
    防再犯: "对列表 API 开 SQL 条数阈值告警。",
  },
  {
    slug: "safari-date-parse",
    title: "仅 Safari 解析日期失败",
    fp: "safari-date-iso-format",
    tag: "browser",
    表象: "`new Date('2026-04-30 10:00:00')` 在 Safari NaN。",
    根因: "Safari 对非 ISO8601 字符串更严格。",
    解法: "改用 `2026-04-30T10:00:00` 或 `date-fns` 解析。",
    防再犯: "日期字面量一律 ISO 或时间戳。",
  },
  {
    slug: "github-actions-cache-key",
    title: "依赖没变但缓存总 miss",
    fp: "actions-cache-key-too-fine",
    tag: "ci",
    表象: "lockfile 未变，cache restore 仍 miss。",
    根因: "cache key 绑了 `github.run_id` 等易变字段。",
    解法: "key 只锁 `hashFiles('**/package-lock.json')`。",
    防再犯: "cache 策略文档化，PR 模板 checklist。",
  },
  {
    slug: "z-index-stacking",
    title: "Modal 被别的组件盖住",
    fp: "css-stacking-context-trap",
    tag: "css",
    表象: "z-index 9999 仍被挡。",
    根因: "父级 `transform`/`opacity` 新建层叠上下文。",
    解法: "Portal 挂到 `body`；或调整父级。",
    防再犯: "弹层统一走 Portal + design token。",
  },
  {
    slug: "redis-reconnect-storm",
    title: "故障恢复后 Redis 连接打满",
    fp: "ioredis-reconnect-backoff",
    tag: "infra",
    表象: "抖动后应用进程句柄与连接数飙升。",
    根因: "重连无退避，多实例雪崩式重连。",
    解法: "指数退避 + 抖动；限制每进程连接池上限。",
    防再犯: "压测里注入网络抖动观察重连曲线。",
  },
  {
    slug: "typescript-excess-props",
    title: "组件 props 报错 excess property",
    fp: "ts-union-discriminant-missing",
    tag: "typescript",
    表象: "传了 `variant` 仍提示未知属性。",
    根因: "联合类型未收窄，对象字面量走 excess check。",
    解法: "加判别字段或 `satisfies` / 显式类型断言（慎用）。",
    防再犯: "复杂 props 用 discriminated union 建模。",
  },
  {
    slug: "k8s-probe-restart",
    title: "Pod 不停重启但业务能访问",
    fp: "k8s-probe-too-short",
    tag: "k8s",
    表象: "`kubectl get pod` RESTARTS 持续增长。",
    根因: "`readiness` 初始延迟过短，冷启动未完成即失败。",
    解法: "`initialDelaySeconds` 上调；区分 liveness/readiness。",
    防再犯: "冷启动慢的 JVM/Node 单独调探针。",
  },
  {
    slug: "eslint-flat-config",
    title: "升级 ESLint 9 后规则全丢",
    fp: "eslint-flat-config-migration",
    tag: "tooling",
    表象: "CI lint 通过但本地无规则感。",
    根因: "仍用 `.eslintrc` 而 CLI 默认 flat。",
    解法: "写 `eslint.config.js` 并迁移 extends。",
    防再犯: "大版本升级跟官方 migration 一页页过。",
  },
  {
    slug: "websocket-proxy-upgrade",
    title: "本地 WS 在生产 nginx 下断连",
    fp: "nginx-proxy-websocket-headers",
    tag: "nginx",
    表象: "握手 404 或秒断。",
    根因: "缺 `Upgrade`/`Connection` 透传或 `map` 未配。",
    解法: "按 nginx 文档配 `proxy_set_header Upgrade` 等。",
    防再犯: "WS 路由单独 `location` 块，勿与静态混用。",
  },
  {
    slug: "bcrypt-compare-always-false",
    title: "登录校验永远 false",
    fp: "bcrypt-trim-password",
    tag: "auth",
    表象: "密码确定正确仍失败。",
    根因: "前端传参带 BOM/空格，hash 与明文不一致。",
    解法: "trim + 编码统一；日志勿打明文。",
    防再犯: "DTO 层统一 `trim()` 策略。",
  },
  {
    slug: "graphql-introspection-prod",
    title: "生产误开 GraphQL introspection",
    fp: "graphql-introspection-leak",
    tag: "security",
    表象: "安全扫描报高危。",
    根因: "默认开发配置带到生产。",
    解法: "生产关 introspection + persisted queries。",
    防再犯: "配置分环境 schema 校验。",
  },
  {
    slug: "pnpm-peer-hoist",
    title: "pnpm 下 peer 依赖解析诡异",
    fp: "pnpm-peer-phantom-deps",
    tag: "tooling",
    表象: "运行时 `Cannot find module 'react-dom'`。",
    根因: "phantom dependency 在 pnpm 严格隔离下暴露。",
    解法: "显式声明依赖或 `.npmrc` `public-hoist-pattern` 审慎放开。",
    防再犯: "新包接入先 `pnpm why`。",
  },
  {
    slug: "axios-timeout-retry",
    title: "超时重试把幂等写接口打爆",
    fp: "axios-retry-non-idempotent",
    tag: "backend",
    表象: "用户抱怨扣款两次。",
    根因: "全局重试未排除 POST 支付路径。",
    解法: "重试白名单仅 GET；支付走幂等键。",
    防再犯: "重试中间件默认保守，显式开。",
  },
  {
    slug: "next-image-domain",
    title: "next/image 报 hostname 未配置",
    fp: "next-config-images-remote",
    tag: "nextjs",
    表象: "线上图片裂图，本地正常。",
    根因: "`images.remotePatterns` 未包含 CDN 域。",
    解法: "在 `next.config` 声明域与 pathname pattern。",
    防再犯: "环境变量区分 asset 域名并校验配置。",
  },
  {
    slug: "mysql-collation-join",
    title: "两表 join 结果随机丢行",
    fp: "mysql-collation-mismatch",
    tag: "database",
    表象: "count 对不上，无报错。",
    根因: "列 collation 不同导致隐式转换不走索引且比较异常。",
    解法: "统一 `utf8mb4_unicode_ci` 或显式 COLLATE。",
    防再犯: "建表规范里写死默认 collation。",
  },
  {
    slug: "ffmpeg-static-path",
    title: "serverless 里 ffmpeg 二进制找不到",
    fp: "ffmpeg-lambda-layer-path",
    tag: "serverless",
    表象: "本地 CLI 正常，Lambda ENOENT。",
    根因: "层挂载路径与 `PATH` 未同步。",
    解法: "用 `@ffmpeg-installer` 或指定 `/opt/bin/ffmpeg`。",
    防再犯: "二进制依赖在 Dockerfile / layer 文档化路径。",
  },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function toYMD(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** @param {string} fromYmd @param {string} toYmd inclusive */
function enumerateDays(fromYmd, toYmd) {
  const [fy, fm, fd] = fromYmd.split("-").map(Number);
  const [ty, tm, td] = toYmd.split("-").map(Number);
  const a = Date.UTC(fy, fm - 1, fd);
  const b = Date.UTC(ty, tm - 1, td);
  const out = [];
  for (let t = a; t <= b; t += 86400000) {
    out.push(toYMD(new Date(t)));
  }
  return out;
}

function pickTimes(n, seed) {
  const bases = ["09", "10", "11", "14", "15", "16", "17", "18", "20", "21"];
  const out = [];
  for (let i = 0; i < n; i++) {
    const h = bases[(seed + i * 3) % bases.length];
    const min = pad(((seed * 7 + i * 11) % 55) + 1);
    out.push(`${h}:${min}`);
  }
  return out;
}

function shuffle(arr, seed) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (seed + i * 17) % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function article(s, time, dayTag, articleIndex, nArticles) {
  const variant = (s.fp + dayTag).length % 2 === 0;
  const fpLine = variant
    ? `**指纹**：\`${s.fp}\`, \`fictional-${dayTag}\``
    : `指纹：${s.fp}, fictional-${dayTag}`;
  const typeLabel = TAG_TO_TYPE[s.tag] ?? "其他";
  const severity = pickSeverity(s, articleIndex, dayTag);
  const deck = optionalDeckLine(articleIndex, nArticles, dayTag);
  return `## ${time} · ${s.slug} — ${s.title}

${fpLine}
${deck}**等级**：${severity}
**类型**：${typeLabel}
#${s.tag} #fictional

### 表象

${s.表象}

### 根因

${s.根因}

### 解法要点

${s.解法}

### 警示

${s.防再犯}
`;
}

async function main() {
  await fs.mkdir(LOGS, { recursive: true });
  const dates = enumerateDays("2026-03-01", "2026-05-15");
  let seed = 1;

  for (const dateStr of dates) {
    const dnum = Number(dateStr.slice(-2));
    const nArticles = 3 + (seed % 3);
    const times = pickTimes(nArticles, dnum + seed);
    const pool = shuffle(SCENARIOS, dnum + seed * 13).slice(0, nArticles);
    const dayTag = dateStr.replaceAll("-", "");

    const parts = [`# ${dateStr}`, ""];
    for (let i = 0; i < nArticles; i++) {
      parts.push(article(pool[i], times[i], dayTag, i, nArticles));
      if (i < nArticles - 1) parts.push("");
    }
    await fs.writeFile(
      path.join(LOGS, `${dateStr}.md`),
      parts.join("\n") + "\n",
      "utf8"
    );
    seed += 7;
  }

  console.log(`已写入 ${dates.length} 天 × 多篇虚构手记 → ${LOGS}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
