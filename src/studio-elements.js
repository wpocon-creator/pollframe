// Presentation-only overrides. Never accept replacement text, SVG, URLs or data.
export function elementStyles(value) {
  let raw;
  try {
    raw = typeof value === "string" ? JSON.parse(value) : value;
  } catch {
    return {};
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const result = {};
  for (const [key, v] of Object.entries(raw).slice(0, 180)) {
    if (!/^[a-z][a-z0-9_-]{0,80}$/.test(key) || !v || typeof v !== "object")
      continue;
    const clamp = (n, a, b, d) =>
      Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : d;
    result[key] = {
      scale: clamp(v.scale, 0.7, 1.6, 1),
      x: clamp(v.x, -36, 36, 0),
      y: clamp(v.y, -24, 24, 0),
    };
  }
  return result;
}
const hash = (s) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
};
export function describeElements(svg) {
  // A node can change from an individually selectable mark into a grouped
  // event/text element after rerendering. Do not leave a stale nested hit target.
  svg.querySelectorAll("[data-studio-item]").forEach(node => {
    delete node.dataset.studioItem;
    delete node.dataset.studioKind;
    delete node.dataset.studioAdjustable;
  });
  const found = [],
    groups = new Set(),
    counts = new Map();
  for (const node of svg.querySelectorAll(
    "text,path,rect,circle,ellipse,line,polygon,polyline,image",
  )) {
    if (node.closest("defs,clipPath,mask,pattern,marker")) continue;
    const group = node.closest("[data-editor-target]"),
      target = group?.dataset.editorTarget;
    if (target === "chart" && group.dataset.historyParty) {
      if (groups.has(group)) continue;
      groups.add(group);
      found.push({node:group,id:`series-${group.dataset.historyParty}`,kind:"series",editable:false,content:false,label:"Chart line"});
      continue;
    }
    if (["text", "subtitle", "note", "output", "events", "legend"].includes(target)) {
      if (groups.has(group)) continue;
      groups.add(group);
      const id =
        target === "events" && group.dataset.eventId
          ? `event-${group.dataset.eventId}`
          : target==='legend'?`legend-${group.dataset.legendId}`:target;
      found.push({
        node: group,
        id,
        kind: target==='legend'?'label':target,
        family: target==='legend'?'legend-label':undefined,
        eventId: group.dataset.eventId,
        editable: ["text", "subtitle", "note", "legend"].includes(target),
        content: ["text", "subtitle", "note"].includes(target),
        label: group.textContent?.trim() || target,
      });
      continue;
    }
    const text = node.tagName === "text",
      value = node.textContent?.trim() || "";
    const protectedText =
      text &&
      (node.closest("a") ||
        /pollframe|dawum|odbl|quelle|source|fuente|license|licen|veroffentlicht|veröffentlicht|published|publicad|insa|forsa|infratest/i.test(
          value,
        ));
    const numeric =
      text && /^[−+\-]?\d[\d.,\s]*\s*(%|pp|Pp\.|Pp|Sitze)?$/.test(value);
    const kind = protectedText
      ? "output"
      : text
        ? numeric
          ? Number(node.getAttribute("font-size")) <= 20
            ? "axis"
            : "value"
          : "label"
        : "mark";
    const row = node.closest("[data-party-id]");
    // Keep a party's presentation when fresh polling changes its numeric value.
    const stem = `${kind}-${hash(row && text ? `party-${row.dataset.partyId}-${kind}` : text ? value : node.tagName + "-" + (node.getAttribute("d") || node.getAttribute("x") || ""))}`;
    const count = counts.get(stem) || 0;
    counts.set(stem, count + 1);
    found.push({
      node,
      id: `${stem}-${count}`,
      kind,
      family: `${row ? "party" : "chart"}-${kind}`,
      editable: text && !protectedText,
      content: false,
      label: value || node.tagName,
    });
  }
  for (const item of found) {
    item.node.dataset.studioItem = item.id;
    item.node.dataset.studioKind = item.kind;
    item.node.dataset.studioAdjustable = String(item.editable);
  }
  return found;
}
export const elementDefault = { scale: 1, x: 0, y: 0 };
