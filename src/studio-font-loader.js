import { useEffect, useState } from "react";
import { STUDIO_FONTS } from "./studio-fonts.js";
// Vite emits local assets; no requests to a font CDN and no visitor tracking.
const assets = import.meta.glob(
  "../node_modules/@fontsource-variable/*/files/*-latin-wght-normal.woff2",
  { query: "?url", import: "default", eager: true },
);
const cache = new Map();
export async function loadStudioFont(key) {
  if (/^custom-[a-f0-9-]{36}$/.test(key)) {
    if (!cache.has(key)) cache.set(key, (async()=>{const {getCustomFont}=await import("./studio-custom-fonts.js"); const font=await getCustomFont(key);if(!font)throw Error("Custom font unavailable on this device"); const face=await new FontFace(font.family, Uint8Array.from(atob(font.data.split(",")[1]),c=>c.charCodeAt(0)).buffer, {weight:"100 900"}).load(); document.fonts.add(face);window.dispatchEvent(new Event("studio-font-ready"));return font;})().catch(e=>{cache.delete(key);throw e;}));
    return cache.get(key);
  }
  const family = STUDIO_FONTS.find((f) => f[0] === key)?.[2];
  if (!family?.startsWith("PF ")) return null;
  if (!cache.has(key))
    cache.set(
      key,
      (async () => {
        const url =
          assets[
            `../node_modules/@fontsource-variable/${key}/files/${key}-latin-wght-normal.woff2`
          ];
        if (!url) throw Error("Font unavailable");
        const [response, licenseResponse] = await Promise.all([
          fetch(url),
          fetch(`/licenses/fonts/${key}.txt`),
        ]);
        if (!response.ok || !licenseResponse.ok)
          throw Error("Font unavailable");
        const license = await licenseResponse.text();
        const bytes = await response.arrayBuffer();
        const font = await new FontFace(family, bytes, {
          weight: "100 900",
        }).load();
        document.fonts.add(font);
        const data = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.readAsDataURL(new Blob([bytes], { type: "font/woff2" }));
        });
        window.dispatchEvent(new Event("studio-font-ready"));
        return { family, data, license };
      })().catch((error) => {
        cache.delete(key);
        throw error;
      }),
    );
  return cache.get(key);
}
export function useStudioFont(key) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!key?.startsWith("custom-") && !STUDIO_FONTS.find((f) => f[0] === key)?.[2]?.startsWith("PF ")) return;
    let active = true;
    loadStudioFont(key)
      .then(() => {
        if (active) setVersion((n) => n + 1);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [key]);
  return version;
}
export async function serializeStudioSvg(svg, key) {
  const fonts=await Promise.all([...new Set([key,...(svg.dataset.studioFonts||'').split(',').filter(Boolean)])].map(loadStudioFont));
  // Let React reflow the measured text with the loaded font before capture.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(resolve)),
  );
  const clone = svg.cloneNode(true);
  clone.querySelectorAll("[data-preview-only]").forEach(node => node.remove());
  for (const loaded of fonts.filter(Boolean)) {
    const style = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "style",
    );
    style.textContent = `@font-face{font-family:"${loaded.family}";src:url("${loaded.data}");font-weight:100 900;font-style:normal;}`;
    clone.prepend(style);
    const metadata = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "metadata",
    );
    metadata.textContent = loaded.license;
    clone.prepend(metadata);
  }
  return new XMLSerializer().serializeToString(clone);
}
