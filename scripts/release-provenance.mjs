// Public build identity, never credentials or user data. Poll snapshots are
// deliberately excluded: the separate four-hour updater may change those.
import { createHash } from "node:crypto";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export async function sourceDigest(root = ".") {
  const files = ["package.json", "package-lock.json", "vite.config.js", "wrangler.jsonc", "index.html", "embed.html", "public/_headers", "public/sw.js"];
  async function walk(dir) {
    for (const entry of await readdir(resolve(root, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isSymbolicLink()) throw Error("Source symlinks are not allowed");
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  for (const dir of ["src", "server", "worker", "migrations"]) await walk(dir);
  for (const entry of await readdir(resolve(root, "public"), { withFileTypes: true }))
    if (entry.isFile() && /\.(?:js|css|webmanifest)$/.test(entry.name) && !files.includes(`public/${entry.name}`)) files.push(`public/${entry.name}`);
  const hash = createHash("sha256");
  for (const path of files.sort()) hash.update(path + "\0").update(await readFile(resolve(root, path))).update("\0");
  return hash.digest("hex");
}

export async function releaseManifest(root = ".") {
  const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  if (!/^[a-f0-9]{40}$/.test(revision)) throw Error("Missing source revision");
  return {
    schema: 1,
    sourceRevision: revision,
    sourceDigest: await sourceDigest(root),
    lockDigest: createHash("sha256").update(await readFile(resolve(root, "package-lock.json"))).digest("hex"),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await writeFile(resolve("dist/release.json"), JSON.stringify(await releaseManifest()) + "\n");
  console.log("Public source/lockfile release identity written (no secrets).");
}
