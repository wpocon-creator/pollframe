import { normalizeStyle } from "./studio-style-model.js";
// Portable files never distribute a locally imported font without its licence.
// Its device-specific UUID could not work on a recipient's machine anyway.
function portableStyle(state) {
  const style=normalizeStyle(state), text=JSON.parse(style.textStyles);
  if(style.font.startsWith('custom-'))style.font='auto';
  for(const role of Object.values(text))if(role.font.startsWith('custom-'))role.font='auto';
  style.textStyles=JSON.stringify(text);
  return style;
}
export function styleDocument(state) {
  return {
    type: "pollframe-style",
    version: 1,
    style: portableStyle(state),
  };
}
export function parseStyle(text) {
  if (text.length > 20000) throw Error("size");
  const doc = JSON.parse(text);
  if (
    doc?.type !== "pollframe-style" ||
    doc.version !== 1 ||
    !doc.style ||
    typeof doc.style !== "object" ||
    Array.isArray(doc.style)
  )
    throw Error("format");
  return portableStyle(doc.style);
}
export function saveFile(content, type, name) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
const csvCell = (value) =>
  `"${String(value ?? "")
    .replace(/^(?=\s*[=+@\-\t\r])/, "'")
    .replaceAll('"', '""')}"`;
export function snapshotCsv(snapshot, rows) {
  const extra = snapshot.kind === "tendencies";
  const valueColumn =
    snapshot.kind === "seats"
      ? "modelled_seats"
      : snapshot.mode === "growth"
        ? "change_pp"
        : "share_percent";
  return (
    "\uFEFF" +
    [
      [
        "series",
        valueColumn,
        "publication_date",
        "pollster",
        "source",
        "source_url",
        "license",
        "license_url",
        "region",
        ...(extra
          ? ["comparison_date", "previous_share_percent", "change_pp"]
          : []),
      ],
      ...rows.map((row) => [
        row.name,
        row.value,
        row.date || snapshot.date,
        snapshot.pollster,
        snapshot.source,
        snapshot.sourceUrl,
        row.license || snapshot.license,
        row.licenseUrl || snapshot.licenseUrl || (/dawum/i.test(snapshot.source || '') ? 'https://opendatacommons.org/licenses/odbl/1-0/' : ''),
        row.region || snapshot.regionSlug || snapshot.region || '',
        ...(extra ? [snapshot.baselineDate, row.previousValue, row.delta] : []),
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}
