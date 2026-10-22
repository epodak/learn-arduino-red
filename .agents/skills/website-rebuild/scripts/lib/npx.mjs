// lib/npx.mjs — compatibility-named wrapper for pinned CLI tools (acorn / js-beautify).
//
// 中文规格（本文件）
// This project uses pnpm as its only package runner. Keep the upstream helper's
// exported name to avoid touching every consumer, but translate `npx -y PKG …`
// into `pnpm dlx PKG …` and drop `-y` (pnpm dlx is already non-interactive).
// On Windows pnpm is a .cmd shim, so route it through cmd.exe as before.
//
// 出身（Windows 移植修复）：beautify-bundle / module-map / slice-esm / cold-audit-decls /
// verify-module-map / lib/tokens 各自 `spawnSync("npx", …)`，在 Windows 上全员失败
// （acorn 与 js-beautify 的门成片假红）。收拢成一处，平台差异只有一个读法。
import { spawnSync } from "node:child_process";

/** Translate `npx -y <package> ...` into `pnpm dlx <package> ...`; preserve the caller result contract. */
export function spawnNpx(args, options = {}) {
  const normalized = args[0] === "-y" || args[0] === "--yes" ? args.slice(1) : args;
  const runnerArgs = ["dlx", ...normalized];
  if (process.platform === "win32") {
    return spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "pnpm", ...runnerArgs], options);
  }
  return spawnSync("pnpm", runnerArgs, options);
}
