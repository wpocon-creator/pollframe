import { EDIT_BAR_DESIGNS, EDIT_AXIS_DESIGNS } from "./studio-edit-model.js";
export function studioCapabilities(template) {
  const t = template?.topic,
    d = template?.design;
  const timeline = ["history", "party", "approval"].includes(t);
  return {
    timeline,
    events: timeline && !["aligned", "panels"].includes(d),
    bars:
      !timeline &&
      (EDIT_BAR_DESIGNS.includes(d) || ["bars", "columns"].includes(d)),
    axis: !timeline && EDIT_AXIS_DESIGNS.includes(d),
    grid:
      timeline ||
      (t === "current" &&
        [
          "classic",
          "news",
          "paper",
          "signal",
          "columns",
          "lollipop",
          "dotplot",
        ].includes(d)) ||
      ["bars", "dots"].includes(d),
    order: ["current", "tendencies"].includes(t),
    precision: !["seats", "majority"].includes(t),
    highlight:
      ["history", "current"].includes(t) && !["paper", "print"].includes(d),
  };
}
