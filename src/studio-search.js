import {
  searchDescription,
  SEARCH_STYLES,
} from "./studio-search-descriptions.js";
import {
  conceptFor,
  searchTokens,
  normalizeSearch,
  searchDistance as distance,
} from "./studio-search-core.js";
export { normalizeSearch } from "./studio-search-core.js";
// Small, deterministic and entirely local. Queries never leave the browser.
const terms = {
  current:
    "sonntagsfrage wahlumfrage aktuell umfrage polling latest current election encuesta actual intención voto bundestag stimmenanteile abstimmung wahlabsicht",
  history:
    "verlauf historisch entwicklung zeitreihe trend history historical timeline evolución historia tiempo temporal langfristig rückblick jahre datum zeitraum linienkurven umfragekurven zeitachse",
  party: "partei parteien party parties partido partidos tendenz tendencia",
  seats:
    "sitze mandate mandat sitzverteilung parlament koalition mehrheit seats parliament coalition escaños mayoría",
  map: "karte bundesländer region map geography mapa regiones",
  approval:
    "zufriedenheit kanzler regierung approval satisfaction government satisfacción gobierno",
  classic: "standard original klassisch normal balken bar horizontal barras",
  material:
    "3d räumlich plastisch körper skulptur party colour säulen vertical bloques tridimensional",
  majority:
    "mehrheit koalition rechner fehlt abstand bündnis coalition majority threshold distance calculator",
  tendencies:
    "änderung veränderung vorher nachher vergleich gains losses change delta diferencia",
  "approval-current":
    "aktuell zufriedenheit kanzler regierung merz politbarometer current approval satisfaction government canciller",
  pie: "kreis kreisdiagramm torten tortendiagramm kuchendiagramm kuchen pie circle circular tarta pastel",
  news: "zeitung nachrichten artikel journalist presse news article newspaper prensa noticias barras",
  paper: "druck print papier paper serif newspaper zeitung clásico",
  broadcast:
    "fernsehen tv television nachrichten broadcast dunkel dark oscuro säulen vertical",
  poster:
    "poster plakat social instagram story portrait hochformat cartel vertical",
  table: "tabelle zahlen liste table numbers tabla cifras",
  cards: "kacheln karten cards dashboard tarjetas",
  lollipop: "punkte lollipop dots dünn minimal puntos",
  dotplot: "punkte dots dotplot minimal puntos",
  signal: "signal technisch technical mono",
  ladder: "rangfolge rangliste ranking ladder comparación",
  original: "original standard pollframe klassisch vertraut linien halo",
  print:
    "druck schwarz weiß s/w schwarzweiss black white monochrome grayscale serif zeitung prensa impresión",
  panels:
    "small multiples einzelne parteien facetten nebeneinander getrennt panels vergleich comparison paneles separados",
  rail: "endwerte wertespalte liste rand beschriftung lesbar endpoint labels values columna etiquetas",
  briefing:
    "briefing newsletter tabelle start ende zahlen differenz redaktion fact sheet tabla resumen",
  neon: "leuchtlinien neon leuchten futuristisch technisch cool glow luminous gaming luminoso",
  focus:
    "eine partei fokus hervorheben fläche area spotlight highlight enfoque destacar",
  change:
    "gewinne verluste zuwachs seit beginn differenz prozentpunkte delta change gains losses diferencia puntos porcentuales",
};
const formats = {
  landscape:
    "quer querformat breit artikel presentation präsentation slide horizontal wide landscape apaisado",
  square: "quadrat quadratisch square instagram social feed cuadrado",
  portrait:
    "hochformat hochkant story stories smartphone portrait vertical verticales",
};
const aliases = {
  zeitverlauf: "history",
  parteienverlauf: "party",
  parteiverlauf: "party",
  zeitlicher: "history",
  zeitentwicklung: "history",
  umfragenverlauf: "history",
  sonntagsfragen: "current",
  wahltrends: "history",
  historie: "history",
  zeitungsgrafik: "print",
  schwarzweiss: "print",
  mehrheitsrechner: "seats",
  coalitions: "seats",
  anteile: "current",
  umfragewerte: "current",
  balkendiagramm: "classic",
  saulendiagramm: "broadcast",
  liniendiagramm: "history",
  zeitreihen: "history",
  timeline: "history",
};
const documents = new WeakMap();
function documentFor(item) {
  if (documents.has(item)) return documents.get(item);
  const title = normalizeSearch(item.name.join(" "));
  const { description, vocabulary } = searchDescription(item);
  const styleWords = new Set(
    normalizeSearch(vocabulary).split(" ").filter(Boolean),
  );
  const words = [
    ...new Set(
      normalizeSearch(
        [
          title,
          ...item.detail,
          item.keywords || "",
          description,
          vocabulary,
          terms[item.topic] || "",
          terms[item.design] || "",
          formats[item.preset] || "",
          item.preset,
          "bundestag deutschland german alemania",
          ["current", "history", "party", "seats"].includes(item.topic)
            ? "cdu csu union spd sozialdemokraten afd grüne gruene gruenen greens linke fdp liberale bsw"
            : "",
        ].join(" "),
      ).split(" "),
    ),
  ];
  const doc = { title, words, wordSet: new Set(words), styleWords };
  documents.set(item, doc);
  return doc;
}
export function searchTemplates(candidates, query) {
  const ignored = new Set(
    "eine einen ein der die das für fur mit und the a an for with and un una el la los las para con y grafik graphic graphics grafico grafica diagramm chart".split(
      " ",
    ),
  );
  const tokens = normalizeSearch(query)
    .slice(0, 160)
    .split(" ")
    .filter((token) => token && !ignored.has(token))
    .slice(0, 12);
  if (!tokens.length) return { items: candidates, fallback: false };
  const exactNames = candidates.filter((item) =>
    item.name.some((name) => normalizeSearch(name) === normalizeSearch(query)),
  );
  if (exactNames.length) return { items: exactNames, fallback: false };
  const topicWords = {
    history:
      "history historical historygraph historie historisch verlauf zeitreihe timeline zeitreihen entwicklung evolucion historia historica",
    current: "current latest aktuell aktuelle sonntagsfrage sonntagsfragen",
    approval:
      "approval satisfaction zufriedenheit regierung kanzler gobierno satisfaccion",
    party: "party partytrend partei parteiverlauf parteienverlauf partido",
    seats: "seats sitze sitzverteilung mandate escanos",
    majority: "coalition koalition mehrheit majority coalicion",
    map: "map karte landkarte bundeslander mapa",
    tendencies: "change gains losses veranderung gewinne verluste delta cambio",
  };
  const intentTokens = searchTokens(query);
  const intents = new Set(
    intentTokens.map((t) => conceptFor(t, topicWords)).filter(Boolean),
  );
  // A subject + a timeline is one combined request, not two competing types.
  if (intents.has("approval") || intents.has("party"))
    intents.delete("history");
  if (intents.has("approval") && intents.has("current")) {
    intents.clear();
    intents.add("approval-current");
  }
  const styles = new Set(
    intentTokens.map((t) => conceptFor(t, SEARCH_STYLES)).filter(Boolean),
  );
  const topicCandidates = intents.size
    ? candidates.filter((t) => intents.has(t.topic))
    : candidates;
  const pool = topicCandidates.length ? topicCandidates : candidates;
  const scores = new Map();
  const ranked = pool
    .map((item, index) => {
      const { title, words, wordSet, styleWords } = documentFor(item);
      let matched = 0;
      const score = tokens.reduce((sum, token) => {
        const concept = aliases[token];
        const semantic = styleWords.has(token)
          ? 12
          : concept && (concept === item.topic || concept === item.design)
            ? 9
            : 0;
        // Exact terms and curated style matches need no fuzzy scan. Once a prefix
        // matches, no remaining non-exact word can score higher.
        let best = Math.max(semantic, wordSet.has(token) ? 10 : 0);
        if (best < 7)
          for (const word of words) {
            const key = token + "|" + word;
            let score = scores.get(key);
            if (score === undefined) {
              score = word.startsWith(token)
                ? 7
                : token.length >= 4 && word.includes(token)
                  ? 5
                  : token.length >= 4 &&
                      distance(token, word) <= (token.length > 7 ? 2 : 1)
                    ? 3
                    : 0;
              scores.set(key, score);
            }
            best = Math.max(best, score);
            if (best >= 7) break;
          }
        if (best) matched++;
        return sum + best + (title.includes(token) ? 2 : 0);
      }, 0);
      const exact = item.name.some(
        (name) => normalizeSearch(name) === normalizeSearch(query),
      );
      const concepts = searchDescription(item).concepts;
      const styleMatches = [...styles].filter((s) =>
        concepts.includes(s),
      ).length;
      return {
        item,
        index,
        styleMatches,
        score: exact ? 1000 : matched ? (score * matched) / tokens.length : 0,
      };
    })
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.styleMatches - a.styleMatches ||
        b.score - a.score ||
        a.index - b.index,
    );
  return {
    items: ranked.length ? ranked.map((row) => row.item) : candidates,
    fallback: !ranked.length,
  };
}
