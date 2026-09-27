import { analyticsExcluded } from "../public/analytics-preference.js";
const opened = new Set();
export function recentStudioTemplates() {
  try {
    const ids = JSON.parse(
      localStorage.getItem("pollframe-studio-recent") || "[]",
    );
    return Array.isArray(ids)
      ? ids.filter((id) => typeof id === "string").slice(0, 40)
      : [];
  } catch {
    return [];
  }
}
export function trackStudioTemplate(id) {
  try {
    localStorage.setItem(
      "pollframe-studio-recent",
      JSON.stringify(
        [id, ...recentStudioTemplates().filter((old) => old !== id)].slice(
          0,
          40,
        ),
      ),
    );
  } catch {}
  if (
    analyticsExcluded() ||
    opened.has(id) ||
    !import.meta.env.PROD ||
    location.protocol !== "https:"
  )
    return;
  opened.add(id);
  fetch("/api/studio-popular", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ template: id }),
    credentials: "omit",
    keepalive: true,
  }).catch(() => {});
}
export function sortedStudioTemplates(templates, sort, counts = {}) {
  const recent = recentStudioTemplates();
  const recommended = [
    "original",
    "news",
    "rail",
    "briefing",
    "classic",
    "table",
    "focus",
    "print",
  ];
  const rank = (t) => {
    const i = recommended.indexOf(t.design);
    return i < 0 ? 99 : i;
  };
  return templates
    .map((t, i) => ({ t, i }))
    .sort((a, b) =>
      sort === "recent"
        ? (recent.indexOf(a.t.id) < 0 ? 999 : recent.indexOf(a.t.id)) -
            (recent.indexOf(b.t.id) < 0 ? 999 : recent.indexOf(b.t.id)) ||
          a.i - b.i
        : sort === "popular"
          ? (counts[b.t.id] || 0) - (counts[a.t.id] || 0) || a.i - b.i
          : sort === "new"
            ? String(b.t.added || "").localeCompare(String(a.t.added || "")) ||
              a.i - b.i
            : rank(a.t) - rank(b.t) || a.i - b.i,
    )
    .map((x) => x.t);
}
