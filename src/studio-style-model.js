import { normalizeEdit } from "./studio-edit-model.js";
import { studioCapabilities } from "./studio-capabilities.js";

// A style is presentation, never a dataset, annotation, filter or axis scale.
// Keep this allowlist shared by JSON imports and the local style library.
export const STYLE_KEYS = Object.freeze([
  "font",
  "textStyles",
  "titleSize",
  "titleWeight",
  "titleLeading",
  "subtitleSize",
  "noteSize",
  "titleAlign",
  "subtitleAlign",
  "noteAlign",
  "background",
  "cornerRadius",
  "barScale",
  "historyLineWidth",
  "historyPointSize",
  "historyLabelSize",
  "showGrid",
  "monochrome",
  "historyEventStyle",
]);
export function normalizeStyle(input = {}) {
  const normalized = normalizeEdit(input);
  return {
    ...Object.fromEntries(STYLE_KEYS.map((key) => [key, normalized[key]])),
    theme: input.theme === "dark" ? "dark" : "light",
    edges: normalized.cornerRadius > 0 ? "rounded" : "sharp",
  };
}
export function stylePatch(style, template) {
  const patch = normalizeStyle(style),
    capabilities = studioCapabilities(template);
  if (!capabilities.bars) delete patch.barScale;
  if (!capabilities.timeline)
    for (const key of [
      "historyLineWidth",
      "historyPointSize",
      "historyLabelSize",
    ])
      delete patch[key];
  if (!capabilities.grid) delete patch.showGrid;
  if (!capabilities.events) delete patch.historyEventStyle;
  return patch;
}

// Reset presentation only. Never clear the user's text, filters, time range,
// custom events or protected data when they ask to reset a style.
export function resetStylePatch() {
  return {
    ...normalizeStyle({}),
    elementStyles: "{}",
    palette: "",
    backgroundImage: "",
  };
}
