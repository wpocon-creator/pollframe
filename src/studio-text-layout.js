let context;
const measuredWidths = new Map();
const MAX_MEASUREMENTS = 4096;
let listeningForFonts = false;

function observeFontChanges() {
  if (listeningForFonts || typeof window === "undefined") return;
  listeningForFonts = true;
  const clear = () => measuredWidths.clear();
  // Invalidate fallback metrics after bundled or imported fonts finish loading.
  window.addEventListener("studio-font-ready", clear);
  document.fonts?.addEventListener?.("loadingdone", clear);
  document.fonts?.addEventListener?.("loadingerror", clear);
}
export function textWidth(
  value,
  size = 20,
  font = "Arial, sans-serif",
  weight = 400,
  italic = false,
) {
  if (typeof document !== "undefined") {
    context ??= document.createElement("canvas").getContext("2d");
    if (context) {
      observeFontChanges();
      const canvasFont = `${italic ? "italic " : ""}${weight} ${size}px ${font}`;
      const text = String(value);
      const key = JSON.stringify([canvasFont, text]);
      if (measuredWidths.has(key)) return measuredWidths.get(key);
      context.font = canvasFont;
      const width = context.measureText(text).width;
      if (measuredWidths.size >= MAX_MEASUREMENTS) measuredWidths.delete(measuredWidths.keys().next().value);
      measuredWidths.set(key, width);
      return width;
    }
  }
  return Array.from(String(value)).length * size * 0.66;
}
export function wrapText(value, width, size, font, weight = 400, italic = false) {
  const lines = [];
  let line = "";
  for (const word of String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)) {
    if (line && textWidth(`${line} ${word}`, size, font, weight, italic) <= width) {
      line += ` ${word}`;
      continue;
    }
    if (line) lines.push(line);
    if (textWidth(word, size, font, weight, italic) <= width) {
      line = word;
      continue;
    }
    line = "";
    // Also handle long unbroken headlines, URLs and compound words.
    for (const char of word) {
      if (line && textWidth(line + char, size, font, weight, italic) > width) {
        lines.push(line);
        line = "";
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
