import "./publishing-layout.css";
import { columnPlan } from "./publishing-column-plan.js";

// Keep ranking order, a shared zero baseline and equal bar heights. A second
// row is a readability fallback, never a fixed five-party limit.
export function layoutPublishingColumns(list) {
  const items = [...list.children];
  const { columns, rows } = columnPlan(items.length, list.clientWidth, list.classList.contains("spain-concern-ranking") ? 148 : 108);
  list.dataset.pngPortraitColumns = String(columns);
  list.dataset.pngPortraitRows = String(rows);
  list.style.setProperty("grid-template-columns", `repeat(${columns * 2},minmax(0,1fr))`, "important");
  list.style.setProperty("grid-template-rows", `repeat(${rows},minmax(0,1fr))`, "important");
  items.forEach((item, index) => {
    const remainder = items.length % columns;
    const start = remainder && index === items.length - remainder ? columns - remainder + 1 : "auto";
    item.style.setProperty("grid-column", `${start} / span 2`);
  });
}

export function observePublishingColumns(list) {
  if (!list) return () => {};
  const update = () => layoutPublishingColumns(list);
  update();
  const observer = new ResizeObserver(update);
  observer.observe(list);
  return () => observer.disconnect();
}
