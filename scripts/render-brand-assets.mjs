import { access, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const root = resolve(".");
const iconsOnly = process.argv.includes("--icons-only");
const socialOnly = process.argv.includes("--social-only");
const desktopVariants = resolve(homedir(), "Desktop", "Pollframe-Logo-Varianten");
const variantNames = [
  ["01-bereinigt-original", "01 · Bereinigtes Original"],
  ["02-sanfter-verlauf", "02 · Sanfter Verlauf"],
  ["03-offener-rahmen", "03 · Offener Rahmen"],
  ["04-redaktionelles-fenster", "04 · Redaktionelles Fenster"],
  ["05-pf-monogramm", "05 · PF-Monogramm"],
  ["06-signal-portal", "06 · Signalportal"],
  ["07-neue-richtung", "07 · Neue Richtung"],
];

const browser = await chromium.launch({ executablePath: process.env.POLLFRAME_CHROME_PATH || chromium.executablePath() });

async function renderSvg(input, output, width, height) {
  const svg = await readFile(input, "utf8");
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:transparent}svg{display:block;width:${width}px!important;height:${height}px!important}</style>${svg}`);
  await page.locator("svg").screenshot({ path: output, omitBackground: true });
  await page.close();
}

try {
  if (!socialOnly) {
  await renderSvg(resolve(root, "public/wahlbild-icon.svg"), resolve(root, "public/pollframe-app-v2-192.png"), 192, 192);
  await renderSvg(resolve(root, "public/wahlbild-icon.svg"), resolve(root, "public/pollframe-app-v2-512.png"), 512, 512);
  await renderSvg(resolve(root, "public/wahlbild-icon.svg"), resolve(root, "public/apple-touch-icon-v2.png"), 180, 180);
  await renderSvg(resolve(root, "public/pollframe-maskable.svg"), resolve(root, "public/pollframe-maskable-v2-512.png"), 512, 512);
  }
  if (!iconsOnly) await renderSvg(resolve(root, "public/pollframe-social.svg"), resolve(root, "public/pollframe-social.png"), 1200, 630);

  const variantsAvailable = !iconsOnly && !socialOnly && await Promise.all(variantNames.map(async ([name]) => {
    try { await access(resolve(desktopVariants, `${name}.svg`)); return true; }
    catch { return false; }
  })).then((results) => results.every(Boolean));
  if (variantsAvailable) {
    for (const [name] of variantNames) await renderSvg(resolve(desktopVariants, `${name}.svg`), resolve(desktopVariants, `${name}.png`), 1024, 1024);

    const cards = await Promise.all(variantNames.map(async ([name, label]) => {
      const png = await readFile(resolve(desktopVariants, `${name}.png`));
      return `<article><img src="data:image/png;base64,${png.toString("base64")}" alt=""><strong>${label}</strong></article>`;
    }));
    const page = await browser.newPage({ viewport: { width: 1800, height: 1420 }, deviceScaleFactor: 1 });
    await page.setContent(`<!doctype html><html><head><style>
    *{box-sizing:border-box}html,body{margin:0;background:#ecece8;color:#17191c;font-family:Inter,Arial,sans-serif}
    body{width:1800px;min-height:1420px;padding:70px}header{display:flex;align-items:end;justify-content:space-between;margin-bottom:42px}
    h1{margin:0;font-size:56px;letter-spacing:-.045em}p{margin:0;color:#656a70;font-size:22px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:30px}
    article{padding:18px 18px 22px;border:1px solid #d2d2cb;border-radius:24px;background:#fff;box-shadow:0 18px 50px rgb(20 24 29/.08)}
    img{display:block;width:100%;border-radius:18px}strong{display:block;margin-top:17px;font-size:20px}
  </style></head><body><header><div><h1>Pollframe · Logo-Varianten</h1><p>Von bereinigt bis vollständig neu</p></div><p>28. August 2026</p></header><main class="grid">${cards.join("")}</main></body></html>`);
    await page.screenshot({ path: resolve(desktopVariants, "Uebersicht.png"), fullPage: true });
    await page.close();
    await writeFile(resolve(desktopVariants, "ZU-ERST-OEFFNEN.txt"), "Oeffne Uebersicht.png fuer den direkten Vergleich. Alle Einzeldateien liegen zusaetzlich als 1024px-PNG und verlustfreies SVG vor.\n");
  }
} finally {
  await browser.close();
}
