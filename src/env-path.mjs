/**
 * 读取非空环境变量路径（用于 DEVPAPER_LOGS / DEVPAPER_OUT）。
 * 仅空白视为未设置；不做其它校验。
 * @param {string} name
 * @returns {string | undefined}
 */
export function envPath(name) {
  const v = process.env[name];
  if (v == null) return undefined;
  const t = v.trim();
  return t === "" ? undefined : v;
}
