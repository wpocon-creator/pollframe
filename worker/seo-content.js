import { SITE_ORIGIN } from "../src/site-origin.js";
import { defaultPageLocale, languageAlternates, localizedCanonical } from "../src/seo-locale.js";

export const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]));
const copy = {
  de: {
    countries: ["Wahlumfragen nach Land", "Aktuelle Wahlumfragen, historische Trends und Wahlergebnisse für Deutschland, das Vereinigte Königreich und Spanien."],
    overview: ["Wahlumfragen in {country}", "Aktuelle politische Umfragen, historische Entwicklungen, Wahlergebnisse und dokumentierte Quellen für {country}."],
    polls: ["{parliament}: aktuelle Wahlumfragen und Verlauf", "Die jüngste verfügbare Einzelumfrage, historische Wahlabsicht und Institutsvergleich für {parliament}. Datenstand, Methodik und Quellen bleiben nachvollziehbar."],
    state: ["Landtagswahl-Umfragen in {country}", "Aktuelle verfügbare Umfragen und historische Parteistärken in {country}. Jede Umfrage behält Institut, Datum und Quellenangabe; Datenlücken werden nicht aufgefüllt."],
    map: ["Wahlumfragen der Bundesländer", "Die Deutschlandkarte führt zu den Umfragen aller 16 Bundesländer. Unterschiedliche Aktualität und Datenlücken bleiben sichtbar."],
    approval: ["Kanzler- und Regierungszufriedenheit in Deutschland", "Veröffentlichte Bewertungen von Bundeskanzler und Bundesregierung mit Amtszeiten, Ereignissen, Fragestellungen und Quellen. Unterschiedliche Messmethoden werden erläutert."],
    seats: ["UK-Wahlkreise: Ergebnisse der Unterhauswahl 2024", "Offizielle Ergebnisse für alle 650 britischen Wahlkreise: Parteien, Stimmen und gewählte Abgeordnete. Diese Zahlen sind Wahlergebnisse, keine aktuellen Umfragen."],
    issues: ["Was Spanien beschäftigt: Probleme, Alltag und Wirtschaft", "Die CIS-Barometer zeigen Probleme des Landes, persönliche Sorgen und wirtschaftliche Einschätzungen. Unterschiedliche Fragen und Erhebungszeiträume werden getrennt ausgewiesen."],
    sources: ["Pollframe: Datenquellen und Lizenzen", "Originalquellen, Nutzungsrechte und Verarbeitungsschritte der veröffentlichten Umfragen, Karten und Wahldaten."],
    editorial: ["Pollframe: Methodik und redaktionelle Standards", "Wie Pollframe Daten prüft und aktualisiert, Ereignisse auswählt, Unsicherheit erklärt und Fehler korrigiert."],
    countryNames: ["Deutschland", "dem Vereinigten Königreich", "Spanien"],
    overviewNames: ["Deutschland", "Vereinigtes Königreich", "Spanien"],
    parliamentNames: ["Bundestag", "britisches Unterhaus", "spanisches Abgeordnetenhaus"],
    latest: "Jüngste verfügbare Einzelumfrage", published: "Veröffentlicht", fieldworkEnd: "Ende der Befragung", fieldwork: "Befragungszeitraum", sample: "Befragte", party: "Partei", share: "Anteil", source: "Quelle", compilation: "Datensammlung", license: "Lizenz / Nutzungshinweise", other: "Sonstige",
    note: "Dies ist eine einzelne Umfrage, kein Durchschnitt und keine Wahlprognose. Nicht einzeln ausgewiesene Parteien sind keine Nullwerte. Kleine Unterschiede können durch Stichprobe und Erhebungsmethode entstehen. In der interaktiven Ansicht lassen sich andere Institute und Zeiträume auswählen.",
    gb: "Die Wahlabsicht bezieht sich auf Großbritannien, ohne Nordirland.", navigation: "Weitere Pollframe-Seiten", languages: "Sprache", unavailable: "Der Datenstand ist gerade nicht verfügbar. Die interaktive Ansicht zeigt verfügbare Daten mit Quellen und Datum.",
  },
  en: {
    countries: ["Election polls by country", "Current election polls, historical trends and election results for Germany, the United Kingdom and Spain."],
    overview: ["Latest election polls in {country}", "Current political polling, historical trends, election results and documented sources for {country}."],
    polls: ["{parliament}: latest election polls and history", "The latest available individual poll, historical voting intention and pollster comparisons for {parliament}, with dates, methodology and original sources."],
    state: ["State election polls in {country}", "Latest available polls and historical party support in {country}. Pollster, date and source remain attached to each survey; gaps are not filled with invented figures."],
    map: ["German state election polls", "Compare polling in Germany's 16 states and open each state's history. Differences in recency and data availability remain visible."],
    approval: ["German chancellor and government approval", "Published evaluations of Germany's chancellor and government, with terms in office, events, survey questions and sources. Differences between measures are explained."],
    seats: ["UK constituencies: 2024 general election results", "Official results for all 650 UK constituencies: parties, votes and elected MPs. These are election results, not current opinion polls."],
    issues: ["Problems facing Spain: national issues, personal concerns and the economy", "CIS barometers on national problems, personal concerns and economic perceptions. Different questions and fieldwork periods are reported separately."],
    sources: ["Pollframe data sources and licences", "Original sources, reuse terms and processing notes for the published polling, maps and election data."],
    editorial: ["Pollframe methodology and editorial standards", "How Pollframe checks and updates data, selects events, explains uncertainty and corrects errors."],
    countryNames: ["Germany", "the United Kingdom", "Spain"], overviewNames: ["Germany", "United Kingdom", "Spain"], parliamentNames: ["Bundestag", "Westminster", "Spain's Congress"],
    latest: "Latest available individual poll", published: "Published", fieldworkEnd: "Fieldwork ended", fieldwork: "Fieldwork", sample: "Respondents", party: "Party", share: "Share", source: "Source", compilation: "Data compilation", license: "Licence / reuse terms", other: "Other",
    note: "This is one poll, not an average or an election forecast. Parties not listed separately are not zeroes. Small differences may reflect sampling and survey methods. Other pollsters and periods can be selected in the interactive view.",
    gb: "Voting intention covers Great Britain, excluding Northern Ireland.", navigation: "More Pollframe pages", languages: "Language", unavailable: "The data snapshot is temporarily unavailable. The interactive view shows available figures with their sources and dates.",
  },
  es: {
    countries: ["Encuestas electorales por país", "Encuestas actuales, tendencias históricas y resultados electorales de Alemania, el Reino Unido y España."],
    overview: ["Últimas encuestas electorales en {country}", "Encuestas políticas actuales, evolución histórica, resultados electorales y fuentes documentadas de {country}."],
    polls: ["{parliament}: últimas encuestas y evolución histórica", "La última encuesta individual disponible, la evolución de la intención de voto y la comparación entre institutos para {parliament}, con fechas, metodología y fuentes."],
    state: ["Encuestas de las elecciones regionales en {country}", "Últimas encuestas disponibles y evolución del apoyo a los partidos en {country}. Se conserva el instituto, la fecha y la fuente de cada encuesta; no se inventan datos para cubrir lagunas."],
    map: ["Encuestas electorales de los estados alemanes", "Compara las encuestas de los 16 estados de Alemania y consulta su evolución histórica. Las diferencias de actualidad y cobertura se indican expresamente."],
    approval: ["Aprobación del canciller y del Gobierno de Alemania", "Valoraciones publicadas del canciller y del Gobierno alemán, con mandatos, acontecimientos, preguntas y fuentes. Se explican las diferencias entre las mediciones."],
    seats: ["Circunscripciones británicas: resultados electorales de 2024", "Resultados oficiales de las 650 circunscripciones del Reino Unido: partidos, votos y diputados elegidos. Son resultados electorales, no encuestas actuales."],
    issues: ["Qué preocupa a España: problemas, preocupaciones personales y economía", "Los barómetros del CIS recogen los problemas del país, las preocupaciones personales y las valoraciones económicas. Se distinguen las preguntas y los periodos de trabajo de campo."],
    sources: ["Fuentes de datos y licencias de Pollframe", "Fuentes originales, condiciones de reutilización y transformaciones de las encuestas, mapas y resultados publicados."],
    editorial: ["Metodología y criterios editoriales de Pollframe", "Cómo Pollframe comprueba y actualiza los datos, selecciona acontecimientos, explica la incertidumbre y corrige errores."],
    countryNames: ["Alemania", "el Reino Unido", "España"], overviewNames: ["Alemania", "Reino Unido", "España"], parliamentNames: ["Bundestag", "Cámara de los Comunes", "Congreso de los Diputados"],
    latest: "Última encuesta individual disponible", published: "Publicada", fieldworkEnd: "Fin del trabajo de campo", fieldwork: "Trabajo de campo", sample: "Personas entrevistadas", party: "Partido", share: "Porcentaje", source: "Fuente", compilation: "Recopilación de datos", license: "Licencia / condiciones de uso", other: "Otros",
    note: "Se muestra una encuesta individual, no una media ni una predicción electoral. Los partidos que no aparecen por separado no tienen necesariamente un resultado de cero. Las pequeñas diferencias pueden deberse a la muestra y al método de encuesta. En la vista interactiva se pueden elegir otros institutos y periodos.",
    gb: "La intención de voto se refiere a Gran Bretaña, sin Irlanda del Norte.", navigation: "Más páginas de Pollframe", languages: "Idioma", unavailable: "El resumen de datos no está disponible temporalmente. La vista interactiva muestra las cifras disponibles con sus fuentes y fechas.",
  },
};

export function routeContent(path, locale, stateNames) {
  const c = copy[locale === "de" || locale === "es" ? locale : "en"];
  const index = path.startsWith("/uk") ? 1 : path.startsWith("/es") ? 2 : 0;
  const state = path.match(/^\/de\/landtagswahl\/([a-z-]+)\/umfragen\/?$/)?.[1];
  let kind = "overview";
  if (state && stateNames[state]) kind = "state";
  else if (/\/umfragen$|\/polls$|\/encuestas$/.test(path)) kind = "polls";
  else if (path === "/countries") kind = "countries";
  else if (path.includes("bundeslaender/karte")) kind = "map";
  else if (path.includes("regierung/zufriedenheit")) kind = "approval";
  else if (path === "/uk/constituencies") kind = "seats";
  else if (path === "/es/preocupaciones") kind = "issues";
  else if (path === "/sources") kind = "sources";
  else if (path === "/editorial-standards") kind = "editorial";
  const expand = (text) => text.replaceAll("{country}", state ? stateNames[state] : c.countryNames[index]).replaceAll("{parliament}", c.parliamentNames[index]).replaceAll("in dem Vereinigten Königreich", "im Vereinigten Königreich").replaceAll("licences", locale === "en-US" ? "licenses" : "licences");
  const [heading, description] = c[kind].map(expand);
  return { lang: locale, heading, title: `${heading} · Pollframe`, description, paragraphs: [description], c,
    snapshot: ["overview", "polls", "state"].includes(kind) ? state ?? ["bundestag", "uk-westminster", "spain-congress"][index] : null,
    links: [[c.overviewNames[0], "/"], [c.overviewNames[1], "/uk"], [c.overviewNames[2], "/es"], [c.sources[0], "/sources"]],
  };
}

export function alternateLinks(path) {
  return [...languageAlternates(path), { locale: "x-default", href: localizedCanonical(path, defaultPageLocale(path)) }]
    .map(({ locale, href }) => `<link rel="alternate" hreflang="${locale}" href="${escapeHtml(href)}" />`).join("");
}

function safeLink(url, label) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" || parsed.protocol === "http:") return `<a href="${escapeHtml(parsed.href)}" rel="noreferrer">${escapeHtml(label)}</a>`;
  } catch { /* Missing original release URL is not an excuse to invent one. */ }
  return "";
}

export function snapshotHtml(snapshot, route) {
  if (!snapshot) return route.snapshot ? `<p>${escapeHtml(route.c.unavailable)}</p>` : "";
  const c = route.c;
  const locale = route.lang === "de" ? "de-DE" : route.lang;
  const date = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") ? new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`)) : "";
  const otherIds = new Set(["0", "209", "414"]);
  const rows = snapshot.results.map(({ id, name, value }) => `<tr><th scope="row">${escapeHtml(otherIds.has(id) ? c.other : name)}</th><td>${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)}%</td></tr>`).join("");
  const fieldwork = Array.isArray(snapshot.fieldwork) && snapshot.fieldwork.every((value) => date(value)) ? `<p>${c.fieldwork}: ${snapshot.fieldwork.map(date).map(escapeHtml).join(" – ")}</p>` : "";
  return `<section aria-label="${escapeHtml(c.latest)}"><h2>${escapeHtml(c.latest)}</h2><p>${escapeHtml(snapshot.pollster)} · ${snapshot.dateType === "fieldwork" ? c.fieldworkEnd : c.published}: <time datetime="${escapeHtml(snapshot.date)}">${escapeHtml(date(snapshot.date))}</time></p>${fieldwork}${snapshot.sample ? `<p>${c.sample}: ${escapeHtml(snapshot.sample)}</p>` : ""}<table><thead><tr><th>${c.party}</th><th>${c.share}</th></tr></thead><tbody>${rows}</tbody></table><p>${escapeHtml(c.note)}</p>${route.snapshot === "uk-westminster" ? `<p>${c.gb}</p>` : ""}<p>${c.source}: ${safeLink(snapshot.sourceUrl, snapshot.pollster)} · ${c.compilation}: ${safeLink(snapshot.compilationUrl, snapshot.source)} · ${c.license}: ${safeLink(snapshot.licenseUrl, snapshot.license)}</p></section>`;
}

export function seoFallback(route, path, snapshot) {
  const links = route.links.map(([label, href]) => `<a href="${escapeHtml(localizedCanonical(href, route.lang))}">${escapeHtml(label)}</a>`).join(" · ");
  const languages = languageAlternates(path).map(({ locale, href }) => `<a href="${escapeHtml(href)}" hreflang="${locale}" lang="${locale}">${({ de: "Deutsch", "en-GB": "English (UK)", "en-US": "English (US)", es: "Español" })[locale]}</a>`).join(" · ");
  return `<main class="legal-page" id="seo-initial-content"><a class="breadcrumb" href="${SITE_ORIGIN}/">Pollframe</a><h1>${escapeHtml(route.heading)}</h1><p>${escapeHtml(route.description)}</p>${snapshotHtml(snapshot, route)}<nav aria-label="${escapeHtml(route.c.navigation)}">${links}</nav><p>${escapeHtml(route.c.languages)}: ${languages}</p></main>`;
}
