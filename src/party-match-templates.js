import { text as t } from "./party-match-text.js";
const item = (id, graphic, de, en, es, keywords) => ({
  id,
  graphic,
  name: t(de, en, es),
  keywords,
});
export const MATCH_GRAPHICS = [
  {
    id: "ranking",
    name: t("Parteien-Ranking", "Party ranking", "Clasificación de partidos"),
  },
  {
    id: "topics",
    name: t("Themenvergleich", "Topic agreement", "Coincidencia por temas"),
  },
  {
    id: "spectrum",
    name: t("Politisches Spektrum", "Political spectrum", "Espectro político"),
  },
  { id: "duel", name: t("Zwei Parteien", "Two parties", "Dos partidos") },
];
export const MATCH_DESIGNS = [
  item(
    "pollframe",
    "ranking",
    "Pollframe Original",
    "Pollframe Original",
    "Pollframe Original",
    "original standard schlicht simple traditional classic",
  ),
  item(
    "editorial",
    "ranking",
    "Redaktion",
    "Editorial",
    "Editorial",
    "redaktion zeitung serif traditional clean report",
  ),
  item(
    "social",
    "ranking",
    "Klare Kante",
    "Bold",
    "Impacto",
    "social media bold cards modern large",
  ),
  item(
    "ranking-dots",
    "ranking",
    "Punktlandung",
    "Dot plot",
    "Diagrama de puntos",
    "dots minimal modern simple punkte",
  ),
  item(
    "ranking-columns",
    "ranking",
    "Skyline",
    "Skyline",
    "Horizonte",
    "vertical columns säulen instagram modern",
  ),
  item(
    "ranking-cards",
    "ranking",
    "Kartenraster",
    "Card grid",
    "Tarjetas",
    "tiles grid karten magazine social",
  ),
  item(
    "ranking-rings",
    "ranking",
    "Kreisgalerie",
    "Ring gallery",
    "Galería circular",
    "ring circular circle kreis donut",
  ),
  item(
    "ranking-podium",
    "ranking",
    "Podium",
    "Podium",
    "Podio",
    "top three podium medal social poster",
  ),
  item(
    "topics-bars",
    "topics",
    "Themenprofil",
    "Topic profile",
    "Perfil temático",
    "themes topics horizontal bars detailed comparison",
  ),
  item(
    "topics-radar",
    "topics",
    "Themenradar",
    "Topic radar",
    "Radar temático",
    "radar spider netz diagramm creative",
  ),
  item(
    "topics-matrix",
    "topics",
    "Parteien-Matrix",
    "Party matrix",
    "Matriz de partidos",
    "heatmap table matrix detailed all parties",
  ),
  item(
    "topics-cards",
    "topics",
    "Themenkarten",
    "Topic cards",
    "Tarjetas temáticas",
    "cards tiles square modern social",
  ),
  item(
    "spectrum-plane",
    "spectrum",
    "Spektrumkarte",
    "Spectrum map",
    "Mapa del espectro",
    "spectrum compass liberal conservative left right modern",
  ),
  item(
    "spectrum-axes",
    "spectrum",
    "Deine Achsen",
    "Your axes",
    "Tus ejes",
    "spectrum axes simple scales left right bars",
  ),
  item(
    "spectrum-profile",
    "spectrum",
    "Profilkarte",
    "Profile card",
    "Tarjeta de perfil",
    "profile poster spectrum cards social modern",
  ),
  item(
    "duel-bars",
    "duel",
    "Direktvergleich",
    "Head to head",
    "Comparación directa",
    "comparison duel two parties paired bar horizontal",
  ),
  item(
    "duel-cards",
    "duel",
    "Zwei Perspektiven",
    "Two perspectives",
    "Dos perspectivas",
    "duel cards comparison social poster",
  ),
  item(
    "duel-bridge",
    "duel",
    "Auf einer Linie",
    "On one scale",
    "En una escala",
    "duel dumbbell gap difference two party simple",
  ),
];
const clean = (s) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export function searchMatchDesigns(query, graphic = "all") {
  const words = clean(query).split(/\s+/).filter(Boolean);
  const aliases = {
    modern: ["modern", "moden", "sleek"],
    simple: ["simple", "schlicht", "einfach", "minimal"],
    spectrum: [
      "spectrum",
      "spektrum",
      "kompass",
      "politisch",
      "political",
      "brujula",
    ],
    ranking: [
      "ranking",
      "rangliste",
      "parteien",
      "parties",
      "match",
      "ergebnis",
      "result",
    ],
    topics: ["topics", "themen", "thematic", "tema"],
    duel: ["duel", "vergleich", "compare", "comparison", "zwei", "two"],
  };
  const expand = (w) => [
    w,
    ...Object.entries(aliases)
      .filter(([, v]) => v.includes(w))
      .flatMap(([k, v]) => [k, ...v]),
  ];
  const scored = MATCH_DESIGNS.filter(
    (d) => graphic === "all" || d.graphic === graphic,
  ).map((d) => {
    const hay = clean(
      [d.id, d.graphic, ...Object.values(d.name), d.keywords].join(" "),
    );
    return {
      d,
      score: words.reduce(
        (n, w) => n + (expand(w).some((term) => hay.includes(term)) ? 1 : 0),
        0,
      ),
    };
  });
  return scored
    .sort((a, b) => b.score - a.score)
    .filter((r) => !words.length || r.score > 0)
    .map((r) => r.d);
}
