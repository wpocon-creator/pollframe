const clean = (s) =>
  String(s || "")
    .replace(/[<>\u0000-\u001f]/g, "")
    .trim();
export function customEvents(input) {
  let rows;
  try {
    rows = typeof input === "string" ? JSON.parse(input) : input;
  } catch {
    return [];
  }
  if (!Array.isArray(rows)) return [];
  const ids = new Set();
  return rows.slice(0, 24).flatMap((row) => {
    if (
      !row ||
      !/^custom-[\w-]{1,64}$/.test(row.id) ||
      ids.has(row.id) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      !Number.isFinite(Date.parse(row.date)) ||
      new Date(row.date).toISOString().slice(0, 10) !== row.date
    )
      return [];
    const label = clean(row.label).slice(0, 100);
    if (!label) return [];
    let source = "";
    try {
      const u = new URL(row.source);
      if (u.protocol === "https:" && !u.username && !u.password)
        source = u.href.slice(0, 500);
    } catch {}
    ids.add(row.id);
    return [
      {
        id: row.id,
        date: row.date,
        label,
        source,
        category: ["national", "germany", "europe", "global", "custom"].includes(row.category) ? row.category : "custom",
        description: clean(row.description).slice(0, 800),
        custom: true,
        priority: 0,
      },
    ];
  });
}
