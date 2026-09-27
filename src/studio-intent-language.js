import { foldIntent } from "./studio-intent-features.js";

// Controlled spelling repair only, never applied to quoted content or values.
// Unlike broad fuzzy matching this requires one unique vocabulary neighbour.
const vocabulary =
  "hintergrund dunkel schrift schriftart schriftgrosse uberschrift zentrieren ereignisse zeitverlauf linien balken abgerundet schmaler grosser kleiner background corners rounded typeface headline centered events thinner timeline oscuro fuente titulo centrado acontecimientos".split(
    " ",
  );
function oneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < Math.min(a.length, b.length) && a[i] === b[i]) i++;
  if (a.length === b.length)
    return (
      a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] &&
        a[i + 1] === b[i] &&
        a.slice(i + 2) === b.slice(i + 2))
    );
  return a.length > b.length
    ? a.slice(i + 1) === b.slice(i)
    : a.slice(i) === b.slice(i + 1);
}
export function commandText(text) {
  return foldIntent(text)
    .split(" ")
    .map((w) => {
      if (w.length < 5 || vocabulary.includes(w)) return w;
      const matches = vocabulary.filter((v) => oneEdit(w, v));
      return matches.length === 1 ? matches[0] : w;
    })
    .join(" ");
}
const numerals = {
  ein: 1,
  eine: 1,
  einen: 1,
  zwei: 2,
  drei: 3,
  vier: 4,
  funf: 5,
  sechs: 6,
  sieben: 7,
  acht: 8,
  neun: 9,
  zehn: 10,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  ten: 10,
  un: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  diez: 10,
};
export const numericText = (text) =>
  text.replace(
    /\b[a-z]+\b(?=\s+(?:jahr\w*|years?|anos|ereignisebenen|ebenen|ebene|layers?|capas)\b)/g,
    (w) => numerals[w] ?? w,
  );
const months = [
  ["januar", "january", "enero"],
  ["februar", "february", "febrero"],
  ["marz", "march", "marzo"],
  ["april", "abril"],
  ["mai", "may", "mayo"],
  ["juni", "june", "junio"],
  ["juli", "july", "julio"],
  ["august", "agosto"],
  ["september", "septiembre"],
  ["oktober", "october", "octubre"],
  ["november", "noviembre"],
  ["dezember", "december", "diciembre"],
];
export function commandDates(text) {
  const monthNames = months.flat().join("|");
  const pattern = new RegExp(
    `\\b(\\d{4})[-/. ](\\d{2})[-/. ](\\d{2})\\b|\\b(\\d{1,2})[./](\\d{1,2})[./](\\d{4})\\b|\\b(\\d{1,2})\\.?\\s+(?:de\\s+)?(${monthNames})\\s+(?:de\\s+)?(\\d{4})\\b`,
    "g",
  );
  const found = [];
  const raw = String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  let stripped = raw.replace(
    pattern,
    (full, y, m, d, d2, m2, y2, d3, month, y3) => {
      const year = Number(y || y2 || y3),
        day = Number(d || d2 || d3),
        mon = Number(
          m || m2 || months.findIndex((ms) => ms.includes(month)) + 1,
        );
      const iso = `${year}-${String(mon).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      found.push(
        Number.isFinite(Date.parse(iso)) &&
          new Date(iso).toISOString().slice(0, 10) === iso
          ? iso
          : null,
      );
      return " ";
    },
  );
  return { dates: found, rest: stripped };
}
// Public capability labels double as multilingual retrieval prototypes. These
// are our own short descriptions, not third-party datasets or user messages.
export const intentPrototypes = {
  current: [
    "aktuelle sonntagsfrage wahlabsicht",
    "latest current national polls",
    "encuesta actual intencion voto",
  ],
  history: [
    "historische umfragen zeitverlauf zeitreihe entwicklung",
    "polling history timeline trends over time",
    "evolucion historica encuestas",
  ],
  approval: [
    "kanzler regierung zufriedenheit zustimmung",
    "government chancellor approval satisfaction",
    "aprobacion canciller gobierno",
  ],
  seats: [
    "sitzverteilung sitze mandate parlament",
    "parliament seat distribution allocation",
    "escanos parlamento reparto",
  ],
  majority: [
    "koalition mehrheit bundnisse",
    "coalition majority alliances",
    "coaliciones mayorias alianzas",
  ],
  map: [
    "deutschlandkarte landkarte bundeslander",
    "german regional map federal states",
    "mapa alemania estados",
  ],
  typography: [
    "schrift schriftart uberschrift titel typografie",
    "font typeface text headline",
    "fuente tipografia titulo letra",
  ],
  appearance: [
    "hintergrund ecken farbe dunkel hell",
    "background corners colour dark light",
    "fondo esquinas colores oscuro claro",
  ],
  events: [
    "ereignisse ebenen olkrise pandemie",
    "events layers oil crisis pandemic",
    "acontecimientos capas crisis pandemia",
  ],
};
