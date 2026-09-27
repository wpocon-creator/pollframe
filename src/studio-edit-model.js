import { STUDIO_FONTS } from "./studio-fonts.js";
import { parseEventLanes, parseEventNumbers } from "./studio-event-layout.js";
import { elementStyles } from "./studio-elements.js";
import { customEvents } from "./studio-custom-events.js";
import { cleanEventIds } from "./studio-event-ids.js";
import { normalizeTextStyles } from "./studio-text-style.js";
export const HISTORY_EDIT_DEFAULTS = {
  historySmoothing: "auto",
  historyLineWidth: 3,
  historyPointSize: 2,
  historyHeight: 420,
  historyLabelSize: 18,
  historyEventLimit: 8,
  historyEventSeed: 0,
  historyLegend: true,
  historyEndLabels: true,
  historyZero: false,
  historyLayers: 2,
  historyEventIds: null,
  historyEventPinned: "",
  historyEventExcluded: "",
  historyEventLanes: "{}",
  historyEventPositions: "{}",
  historyLayerDensity: "{}",
  historySeedRemoved: "",
  historyEventStyle: "line",
  historyCustomEvents: "[]",
};
export const EDIT_DEFAULTS = Object.freeze({
  ...HISTORY_EDIT_DEFAULTS,
  headline: "",
  subtitle: "",
  editorNote: "",
  font: "auto",
  titleSize: 36,
  barScale: 1,
  axisMax: 0,
  background: "",
  palette: "",
  titleAlign: "left",
  density: 1,
  elementStyles: "{}",
  textStyles: "{}",
  precision: 1,
  showGrid: true,
  exportWidth: 1920,
  titleWeight: 700,
  titleLeading: 1.35,
  subtitleSize: 24,
  noteSize: 19,
  focusParty: "",
  order: "value",
  monochrome: false,
  reference: 0,
  imageFit: "cover",
  imageOverlay: 0.88,
  cornerRadius: 0,
  subtitleAlign: "left",
  noteAlign: "left",
  topPadding: 0,
  subtitleGap: 0,
});
const bounded = (value, min, max, fallback) =>
  value !== "" && Number.isFinite(Number(value))
    ? Math.max(min, Math.min(max, Number(value)))
    : fallback;
export function normalizeEdit(input) {
  const palette = String(input.palette || "")
    .split(",")
    .slice(0, 30)
    .filter((value) => /^[a-zA-Z0-9_-]{1,30}:#[a-f\d]{6}$/i.test(value))
    .join(",");
  return {
    historySmoothing: ["auto", "none", "light", "medium", "strong"].includes(input.historySmoothing) ? input.historySmoothing : "auto",
    historyCustomEvents: JSON.stringify(customEvents(input.historyCustomEvents)),
    elementStyles: JSON.stringify(elementStyles(input.elementStyles)),
    textStyles: JSON.stringify(normalizeTextStyles(input.textStyles)),
    historyLayers: Math.round(bounded(input.historyLayers, 0, 4, 2)),
    historyEventSeed: Math.round(bounded(input.historyEventSeed, 0, 2147483647, 0)),
    historyEventPinned: cleanEventIds(input.historyEventPinned),
    historyEventExcluded: cleanEventIds(input.historyEventExcluded),
    historyEventIds:
      input.historyEventIds == null
        ? null
        : String(input.historyEventIds)
            .split(",")
            .filter((id) => /^[\w-]{1,100}$/.test(id))
            .slice(0, 80)
            .join(","),
    historyEventLanes: JSON.stringify(parseEventLanes(input.historyEventLanes)),
    historyEventPositions: JSON.stringify(parseEventNumbers(input.historyEventPositions)),
    historyLayerDensity: JSON.stringify(Object.fromEntries(Object.entries(parseEventNumbers(input.historyLayerDensity,0,16)).filter(([key]) => /^[0-3]$/.test(key)))),
    historySeedRemoved: cleanEventIds(input.historySeedRemoved),
    historyEventStyle: ["line", "dashed", "band"].includes(
      input.historyEventStyle,
    )
      ? input.historyEventStyle
      : "line",
    subtitleAlign: ["left", "center", "right"].includes(input.subtitleAlign)
      ? input.subtitleAlign
      : "left",
    noteAlign: ["left", "center", "right"].includes(input.noteAlign)
      ? input.noteAlign
      : "left",
    topPadding: bounded(input.topPadding, 0, 60, 0),
    subtitleGap: bounded(input.subtitleGap, 0, 48, 0),
    cornerRadius: bounded(
      input.cornerRadius,
      0,
      80,
      input.edges === "rounded" ? 24 : 0,
    ),
    historyLineWidth: bounded(input.historyLineWidth, 1, 7, 3),
    historyPointSize: bounded(input.historyPointSize, 1, 5, 2),
    historyHeight: bounded(input.historyHeight, 280, 660, 420),
    historyLabelSize: bounded(input.historyLabelSize, 15, 22, 18),
    historyEventLimit: bounded(input.historyEventLimit, 0, 16, 8),
    historyLegend:
      input.historyLegend !== false && input.historyLegend !== "false",
    historyEndLabels:
      input.historyEndLabels !== false && input.historyEndLabels !== "false",
    historyZero: input.historyZero === true || input.historyZero === "true",
    titleWeight: Number(input.titleWeight) === 400 ? 400 : 700,
    titleLeading: bounded(input.titleLeading, 1.35, 1.5, 1.35),
    subtitleSize: bounded(input.subtitleSize, 18, 30, 24),
    noteSize: bounded(input.noteSize, 16, 24, 19),
    focusParty: /^[a-zA-Z0-9_-]{1,30}$/.test(input.focusParty || "")
      ? input.focusParty
      : "",
    order: input.order === "name" ? "name" : "value",
    monochrome: input.monochrome === true || input.monochrome === "true",
    reference: bounded(input.reference, 0, 100, 0),
    imageFit: input.imageFit === "contain" ? "contain" : "cover",
    imageOverlay: bounded(input.imageOverlay, 0.65, 1, 0.88),
    workspace: input.workspace === "edit" ? "edit" : "preview",
    subtitle: String(input.subtitle || "")
      .replace(/[<>\x00-\x1f]/g, "")
      .slice(0, 160),
    editorNote: String(input.editorNote || "")
      .replace(/[<>\x00-\x1f]/g, "")
      .slice(0, 180),
    titleAlign: ["left", "center", "right"].includes(input.titleAlign)
      ? input.titleAlign
      : "left",
    density: 1, // Retired: old links no longer stretch chart layout unpredictably.
    precision: Number(input.precision) === 0 ? 0 : 1,
    showGrid: input.showGrid !== false && input.showGrid !== "false",
    exportWidth: [960, 1920, 2880, 3840].includes(Number(input.exportWidth))
      ? Number(input.exportWidth)
      : 1920,
    font: STUDIO_FONTS.some((f) => f[0] === input.font) || /^custom-[a-f0-9-]{36}$/.test(input.font) ? input.font : "auto",
    titleSize: bounded(input.titleSize, 24, 64, 36),
    barScale: bounded(input.barScale, 0.5, 1.6, 1),
    axisMax: bounded(input.axisMax, 0, 100, 0),
    background: /^#[a-f\d]{6}$/i.test(input.background) ? input.background : "",
    palette,
  };
}
export const EDIT_BAR_DESIGNS = ["classic", "news", "paper", "signal"];
export const EDIT_AXIS_DESIGNS = [...EDIT_BAR_DESIGNS, "lollipop", "dotplot"];
export function editRecipe(state) {
  return {
    ...Object.fromEntries(
      Object.keys(EDIT_DEFAULTS).map((key) => [
        key,
        state[key] ?? EDIT_DEFAULTS[key],
      ]),
    ),
    ...Object.fromEntries(
      Object.entries(state).filter(([key]) => key.startsWith("history")),
    ),
    edges: state.edges,
    theme: state.theme,
    metric: state.metric,
    mapMode: state.mapMode,
    mapParty: state.mapParty,
    answer: state.answer,
    approvalTerms: state.approvalTerms,
    coalition: state.coalition,
    party: state.party,
    parties: state.parties,
    template: state.template,
    range: state.range,
    start: state.start,
    end: state.end,
    mode: state.mode,
    events: state.events,
    pollsters: state.pollsters,
  };
}
