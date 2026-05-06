import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PKG_ROOT = path.resolve(__dirname, "..");

export function resolveLogs(dir) {
  return path.resolve(process.cwd(), dir);
}

export function resolveOut(dir) {
  return path.resolve(process.cwd(), dir);
}
