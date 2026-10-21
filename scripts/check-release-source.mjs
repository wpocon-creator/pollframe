// A release must be reproducible from committed source, not an untracked local
// account/security implementation. Normal development builds remain possible.
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export function assertReleaseClean(status) {
  if (status.trim()) throw Error("Release blocked: review and commit application/configuration changes before deploying. Your local files have not been changed.");
}
export function checkReleaseSource() {
  const paths = ["src", "server", "worker", "migrations", "package.json", "package-lock.json", "vite.config.js", "wrangler.jsonc", "index.html", "embed.html", "public/_headers", "public/*.js", "public/*.css", "public/*.webmanifest", "scripts/build-public.mjs", "scripts/release-provenance.mjs", "scripts/check-release-source.mjs"];
  assertReleaseClean(execFileSync("git", ["status", "--porcelain", "--untracked-files=all", "--", ...paths], { encoding: "utf8" }));
  console.log("Release source is committed and reproducible.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) checkReleaseSource();
