import { normalizeSearch, searchRows } from "./studio-search-core.js";
const groups = [
  [
    /war|krieg|guerra|invasion|ukraine|iraq|irak|afghanistan|gulf|golfkrieg|gaza|hamas|hormuz|russ.*angriff/,
    "war wars conflict invasion military krieg kriege kriegsbeginn konflikt angriff militar guerra guerras conflicto invasion militar",
  ],
  [
    /covid|corona|pandemi|lockdown/,
    "pandemic coronavirus covid outbreak health lockdown pandemie ausbruch gesundheit pandemia salud confinamiento",
  ],
  [
    /oil|energy|gas|energie|olkrise|hormuz/,
    "oil energy gas crisis price energy shock energie olkrise preise energia petroleo crisis",
  ],
  [
    /election|wahl|eleccion|referendum|brexit/,
    "elections election vote referendum wahl wahlen abstimmung eleccion elecciones referendo",
  ],
  [
    /finance|finanz|bank|euro|debt|schulden|lehm|recession/,
    "economy recession banking finance debt wirtschaft finanzen bankenkrise schulden economia finanzas deuda recesion",
  ],
  [
    /coalition|koalition|government|regierung|kanzler|chancellor|gobierno/,
    "government coalition leadership regierung koalition kanzler gobierno coalicion canciller",
  ],
  [
    /climate|klima|flood|flut|hochwasser|clima/,
    "climate floods environment klima flut umwelt clima inundaciones medioambiente",
  ],
  [
    /migration|refugee|flucht|asyl/,
    "migration refugees asylum immigration flucht fluchtlinge asyl migracion refugiados asilo",
  ],
];
export function eventSearchText(event) {
  const parts = [
    event.id,
    event.label,
    event.date,
    event.category,
    event.de,
    event.en,
    event.es,
    event.shortDe,
    event.shortEn,
    event.shortEs,
    event.description,
    event.descriptionDe,
    event.descriptionEn,
    event.descriptionEs,
    event.detailDe,
    event.detailEn,
    event.detailEs,
  ].filter((v) => typeof v === "string");
  const text = normalizeSearch(parts.join(" "));
  const category =
    {
      national: "elections wahlen elecciones",
      germany:
        "german germany deutschland national national politics politik politica",
      europe: "europe european europa eu",
      global: "world global international welt mundo",
    }[event.category] || "";
  return (
    text +
    " " +
    category +
    " " +
    groups
      .filter(([pattern]) => pattern.test(text))
      .map(([, words]) => words)
      .join(" ")
  );
}
export const searchEvents = (events, query) =>
  searchRows(events, query, eventSearchText);
