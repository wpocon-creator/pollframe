import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const assetsDir = resolve("dist/assets");
const files = await readdir(assetsDir);
const sizes = [];
for (const name of files.filter((file) => /\.(?:js|css)$/.test(file))) {
  const content = await readFile(resolve(assetsDir, name));
  sizes.push({ name, raw: content.length, gzip: gzipSync(content, { level: 9 }).length });
}

const errors = [];
const mainJavaScript = sizes.find(({ name }) => /^main-.*\.js$/.test(name));
const mainCss = sizes.find(({ name }) => /^main-.*\.css$/.test(name));
const totalJavaScriptGzip = sizes.filter(({ name }) => name.endsWith(".js")).reduce((sum, file) => sum + file.gzip, 0);
if (!mainJavaScript) errors.push("main JavaScript asset is missing");
if (!mainCss) errors.push("main CSS asset is missing");
if (mainJavaScript?.gzip > 260 * 1024) errors.push(`main JavaScript is ${(mainJavaScript.gzip / 1024).toFixed(1)} KiB gzip (budget: 260 KiB)`);
if (mainCss?.gzip > 50 * 1024) errors.push(`main CSS is ${(mainCss.gzip / 1024).toFixed(1)} KiB gzip (budget: 50 KiB)`);
if (totalJavaScriptGzip > 390 * 1024) errors.push(`all JavaScript is ${(totalJavaScriptGzip / 1024).toFixed(1)} KiB gzip (budget: 390 KiB)`);
for (const file of sizes) {
  if (file.raw > 900 * 1024) errors.push(`${file.name} is ${(file.raw / 1024).toFixed(1)} KiB raw (per-file budget: 900 KiB)`);
}

if (errors.length) throw new Error(`Performance budget failed:\n- ${errors.join("\n- ")}`);
console.log(`Performance budget passed: main JS ${(mainJavaScript.gzip / 1024).toFixed(1)} KiB gzip, CSS ${(mainCss.gzip / 1024).toFixed(1)} KiB gzip, all JS ${(totalJavaScriptGzip / 1024).toFixed(1)} KiB gzip`);
