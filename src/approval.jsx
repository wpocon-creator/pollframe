import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, InfoPopover, MultiSelect, SelectControl, StaticEmbedPreview } from "./pollframe-ui.jsx";
import { PartyInfoButton } from "./party-profiles.jsx";
import { includeHistoricalEvent, isPrimaryElectionEvent, rankHistoricalEvents } from "./event-selection.js";
import { PngExportButton } from "./png-export-button.jsx";
import { trackAggregateEvent } from "./aggregateAnalytics.js";
import "./approval-cards.css";

const DAY = 86_400_000;
const COUNTRY_IDS = ["de", "uk"];
const COMPARE_COUNTRIES = ["de", "uk"];
const ANSWER_IDS = ["positive", "negative", "net"];
const COUNTRY_COLORS = { de: "var(--approval-compare-de)", uk: "#d63d55" };
const COUNTRY_NAMES = {
  de: { de: "Deutschland", en: "Germany", es: "Alemania" },
  uk: { de: "Vereinigtes Königreich", en: "United Kingdom", es: "Reino Unido" },
  es: { de: "Spanien", en: "Spain", es: "España" },
};
const RECENT_LEADER_SNAPSHOTS = {
  uk: {
    asOf: "2026-06-30",
    expiresAfterDays: 92,
    source: "https://yougov.com/en-gb/ratings/UK-prime-ministers",
    negativeSource: "https://yougov.com/en-gb/topics/public_figure/Liz_Truss",
    sourceLabel: "YouGov Ratings · Q2 2026",
    positive: { name: "Winston Churchill", value: 71 },
    negative: { name: "Liz Truss", value: 65 },
  },
};
const APPROVAL_NOTES = {
  de: {
    de: ["Positiv bedeutet hier ‚eher gut‘, nicht Wahlabsicht.", "Die Reihe wird direkt aus den offiziellen XLSX-Dateien aktualisiert."],
    en: ["Positive means ‘rather good’, not voting intention.", "The series is updated directly from the official XLSX files."],
    es: ["Positivo significa «más bien bien», no intención de voto.", "La serie se actualiza directamente desde los archivos XLSX oficiales."],
  },
};

const COPY = {
  de: {
    eyebrow: "Regierung & Regierungschef",
    title: { de: "Zufriedenheit mit Regierung und Kanzler", uk: "Zufriedenheit mit Regierung und Premierminister", es: "Zufriedenheit mit Regierung und Ministerpräsident" },
    intro: "Aktuelle Bewertung und historischer Verlauf – mit Originalfrage, Amtswechseln, Ereignissen und nachvollziehbarer Quelle.",
    back: "Zurück zur Länderübersicht", current: "Aktueller Stand", government: "Regierung", leader: "Regierungschef", chancellor: "Bundeskanzler", primeMinister: "Premierminister", president: "Ministerpräsident",
    positive: "Zufrieden / positiv", negative: "Unzufrieden / negativ", middle: "Weder noch / keine Angabe", net: "Saldo", published: "Veröffentlicht", previousMeasurement: "Seit der vorherigen Messung", previousMeasurementHelp: "Verglichen werden zwei tatsächlich veröffentlichte Messpunkte.",
    chartEyebrow: "Historische Zufriedenheitswerte", chartTitle: "Zufriedenheit im Zeitverlauf", chartSingle: "Die Farbe folgt der Partei des jeweiligen Regierungschefs. Linien enden bei jedem Amtswechsel.", chartCompare: "Deutschland in Schwarz, das Vereinigte Königreich in Rot. Wegen unterschiedlicher Fragen ist dies kein exaktes Ranking.",
    customize: "Diagramm anpassen", closeEditor: "Anpassung schließen", share: "Teilen & einbetten", png: "PNG exportieren", pngPreparing: "PNG wird erstellt …", pngReady: "PNG gespeichert", pngError: "PNG fehlgeschlagen", csv: "CSV herunterladen",
    display: "Darstellung", trend: "Geglätteter Trend", linear: "Verbundene Messwerte", both: "Trend + Messpunkte", timeRange: "Zeitraum", one: "1 Jahr", five: "5 Jahre", ten: "10 Jahre", all: "Gesamtes Archiv",
    subject: "Reihe", answers: "Antworten", events: "Ereignisse", keyEvents: "Wichtige Ereignisse", allEvents: "Mehr Ereignisse", noEvents: "Keine Ereignisse", eventCategories: "Ereigniskategorien", compare: "Mit Deutschland und UK vergleichen", compareShort: "DE · UK vergleichen", compareOn: "Vergleich Deutschland · UK aktiv", compareHelp: "Die nationale Seite bleibt erhalten; der Vergleich wird nur in diesem Diagramm eingeblendet.",
    originalQuestion: "Originalfrage", source: "Originalquelle", methodology: "Info", infoTitle: "So liest du diese Grafik", noData: "Für diese Auswahl liegen keine Daten vor.", terms: "Amtszeiten", eventContext: "Ereignisse im Zeitraum", eventNote: "Kuratierte Auswahl, nicht vollständig. Sichtbare Marker sind nach Bedeutung und Lesbarkeit ausgewählt; sie belegen keine Ursache.",
    currentSeries: "Laufende Reihe", archiveSeries: "Archiv · Reihe beendet", staleSeries: "Letzte verfügbare Veröffentlichung", points: "Messpunkte", dataAndSource: "Daten & Quelle", open: "Interaktiv öffnen", preview: "Live-Vorschau", copyLink: "Link kopieren", copyEmbed: "Embed-Code kopieren", copied: "Kopiert", appearance: "Darstellung", light: "Hell", dark: "Dunkel", system: "System", embedHeight: "Embed-Höhe", compact: "Kompakt", standard: "Standard", large: "Groß", previousEvent: "Vorheriges Ereignis", nextEvent: "Nächstes Ereignis", closeEvent: "Ereignis schließen",
    responseBalance: "Erfasste Antwortanteile", responseBalanceHelp: "Positiv, negativ und die verbleibenden Antworten ergeben zusammen 100 %.", latestPoint: "Letzter Messpunkt", notComparable: "Nicht direkt als Rangliste vergleichbar", pollster: "Institut", recentLeaderSnapshot: "Wie frühere Premierminister heute gesehen werden", mostPopular: "Höchster positiver Wert", mostDisliked: "Höchster negativer Wert", positiveOpinion: "positive Meinung", negativeOpinion: "negative Meinung", snapshotNote: "Aktuelle Meinung über frühere Regierungschefs – keine Bewertung ihrer damaligen Amtszeit.", noCurrentLeaderRating: (leader) => `Für ${leader} liegt in dieser vergleichbaren Reihe noch keine veröffentlichte Messung vor. Gezeigt wird deshalb die letzte Bewertung des vorherigen Amtsinhabers.`, age: (days) => days === 0 ? "Die Daten sind von heute" : `Die Daten sind ${days} ${days === 1 ? "Tag" : "Tage"} alt`,
  },
  en: {
    eyebrow: "Government & national leader",
    title: { de: "Government and Chancellor approval in Germany", uk: "Government and Prime Minister approval in the UK", es: "Government and Prime Minister approval in Spain" },
    intro: "The latest rating and its historical path, with the original question, changes of office, events and a traceable source.",
    back: "Back to the country overview", current: "Latest rating", government: "Government", leader: "National leader", chancellor: "Chancellor", primeMinister: "Prime Minister", president: "Prime Minister",
    positive: "Satisfied / positive", negative: "Dissatisfied / negative", middle: "Neither / don't know", net: "Net rating", published: "Published", previousMeasurement: "Since the previous measurement", previousMeasurementHelp: "This compares two genuinely published measurements.",
    chartEyebrow: "Historical satisfaction ratings", chartTitle: "Satisfaction over time", chartSingle: "Colour follows the national leader's party. A line ends whenever the holder of office changes.", chartCompare: "Germany is black and the United Kingdom red. Different source questions mean this is not an exact ranking.",
    customize: "Customise chart", closeEditor: "Close customisation", share: "Share & embed", png: "Export PNG", pngPreparing: "Preparing PNG …", pngReady: "PNG saved", pngError: "PNG failed", csv: "Download CSV",
    display: "Display", trend: "Smoothed trend", linear: "Connected measurements", both: "Trend + measurements", timeRange: "Time range", one: "1 year", five: "5 years", ten: "10 years", all: "Full archive",
    subject: "Series", answers: "Answers", events: "Events", keyEvents: "Key events", allEvents: "More events", noEvents: "No events", eventCategories: "Event categories", compare: "Compare Germany with the UK", compareShort: "Compare DE · UK", compareOn: "Germany · UK comparison active", compareHelp: "The page remains national; comparison is only added to this chart.",
    originalQuestion: "Original question", source: "Original source", methodology: "Info", infoTitle: "How to read this chart", noData: "No data is available for this selection.", terms: "Terms in office", eventContext: "Events in this period", eventNote: "Curated, not exhaustive. Visible markers are selected for importance and legibility; they do not establish causation.",
    currentSeries: "Current series", archiveSeries: "Archive · series ended", staleSeries: "Latest available publication", points: "measurements", dataAndSource: "Data & source", open: "Open interactive", preview: "Live preview", copyLink: "Copy link", copyEmbed: "Copy embed code", copied: "Copied", appearance: "Appearance", light: "Light", dark: "Dark", system: "System", embedHeight: "Embed height", compact: "Compact", standard: "Standard", large: "Large", previousEvent: "Previous event", nextEvent: "Next event", closeEvent: "Close event",
    responseBalance: "Recorded answer shares", responseBalanceHelp: "Positive, negative and remaining responses add to 100%.", latestPoint: "Latest measurement", notComparable: "Not directly comparable as a league table", pollster: "Pollster", recentLeaderSnapshot: "How former prime ministers are viewed now", mostPopular: "Highest positive score", mostDisliked: "Highest negative score", positiveOpinion: "positive opinion", negativeOpinion: "negative opinion", snapshotNote: "Current opinion of former heads of government, not a rating of how they governed at the time.", noCurrentLeaderRating: (leader) => `No published measurement for ${leader} is available in this comparable series yet. The latest rating of the previous officeholder is shown instead.`, age: (days) => days === 0 ? "The data is from today" : `The data is ${days} ${days === 1 ? "day" : "days"} old`,
  },
  es: {
    eyebrow: "Gobierno y presidencia",
    title: { de: "Valoración del Gobierno y el canciller en Alemania", uk: "Valoración del Gobierno y el primer ministro británico", es: "Valoración del Gobierno y el presidente de España" },
    intro: "La valoración actual y su evolución histórica, con pregunta original, cambios de mandato, acontecimientos y fuente trazable.",
    back: "Volver al resumen del país", current: "Última valoración", government: "Gobierno", leader: "Presidencia", chancellor: "Canciller", primeMinister: "Primer ministro", president: "Presidente",
    positive: "Satisfecho / positivo", negative: "Insatisfecho / negativo", middle: "Intermedio / no sabe", net: "Saldo", published: "Publicado", previousMeasurement: "Desde la medición anterior", previousMeasurementHelp: "Se comparan dos mediciones realmente publicadas.",
    chartEyebrow: "Valoraciones históricas", chartTitle: "Satisfacción a lo largo del tiempo", chartSingle: "El color sigue al partido del jefe de Gobierno. La línea termina con cada cambio de titular.", chartCompare: "Alemania aparece en negro y Reino Unido en rojo. Las preguntas distintas impiden una clasificación exacta.",
    customize: "Configurar gráfico", closeEditor: "Cerrar configuración", share: "Compartir e insertar", png: "Exportar PNG", pngPreparing: "Preparando PNG …", pngReady: "PNG guardado", pngError: "Error al crear PNG", csv: "Descargar CSV",
    display: "Vista", trend: "Tendencia suavizada", linear: "Mediciones conectadas", both: "Tendencia + mediciones", timeRange: "Periodo", one: "1 año", five: "5 años", ten: "10 años", all: "Todo el archivo",
    subject: "Serie", answers: "Respuestas", events: "Acontecimientos", keyEvents: "Acontecimientos clave", allEvents: "Más acontecimientos", noEvents: "Sin acontecimientos", eventCategories: "Categorías de acontecimientos", compare: "Comparar Alemania y Reino Unido", compareShort: "Comparar DE · UK", compareOn: "Comparación Alemania · Reino Unido activa", compareHelp: "La página sigue siendo nacional; la comparación solo se añade al gráfico.",
    originalQuestion: "Pregunta original", source: "Fuente original", methodology: "Info", infoTitle: "Cómo leer este gráfico", noData: "No hay datos para esta selección.", terms: "Mandatos", eventContext: "Acontecimientos del periodo", eventNote: "Selección editorial, no exhaustiva. Los marcadores visibles priorizan relevancia y legibilidad; no demuestran causalidad.",
    currentSeries: "Serie actual", archiveSeries: "Archivo · serie finalizada", staleSeries: "Última publicación disponible", points: "mediciones", dataAndSource: "Datos y fuente", open: "Abrir interactivo", preview: "Vista previa", copyLink: "Copiar enlace", copyEmbed: "Copiar código", copied: "Copiado", appearance: "Apariencia", light: "Claro", dark: "Oscuro", system: "Sistema", embedHeight: "Altura", compact: "Compacto", standard: "Estándar", large: "Grande", previousEvent: "Acontecimiento anterior", nextEvent: "Acontecimiento siguiente", closeEvent: "Cerrar acontecimiento",
    responseBalance: "Porcentajes de respuesta", responseBalanceHelp: "Las respuestas positivas, negativas y restantes suman el 100 %.", latestPoint: "Última medición", notComparable: "No es una clasificación directamente comparable", pollster: "Instituto", recentLeaderSnapshot: "Cómo se ve hoy a anteriores primeros ministros", mostPopular: "Mayor valor positivo", mostDisliked: "Mayor valor negativo", positiveOpinion: "opinión positiva", negativeOpinion: "opinión negativa", snapshotNote: "Opinión actual sobre antiguos jefes de Gobierno, no una valoración de su gestión en aquel momento.", noCurrentLeaderRating: (leader) => `Aún no hay una medición publicada para ${leader} dentro de esta serie comparable. Por eso se muestra la última valoración del anterior jefe de Gobierno.`, age: (days) => days === 0 ? "Los datos son de hoy" : `Los datos tienen ${days} ${days === 1 ? "día" : "días"}`,
  },
};

function language(locale) { return locale === "de" ? "de" : locale === "es" ? "es" : "en"; }
function textFor(locale) { return COPY[language(locale)]; }
function countryName(country, locale) { return COUNTRY_NAMES[country]?.[language(locale)] ?? country; }
function approvalNotes(country, locale, fallback) { return APPROVAL_NOTES[country]?.[language(locale)] ?? fallback; }
function numberLocale(locale) { return locale === "de" ? "de-DE" : locale === "es" ? "es-ES" : "en-GB"; }
function parseTime(date) { return Date.parse(`${date}T12:00:00Z`); }
function isoDate(time) { return new Date(time).toISOString().slice(0, 10); }
function dataAge(date) { return Math.max(0, Math.floor((Date.now() - Date.parse(`${date}T00:00:00Z`)) / DAY)); }
function formatDate(date, locale, options = {}) {
  return new Intl.DateTimeFormat(numberLocale(locale), {
    day: options.day === false ? undefined : "numeric",
    month: options.month === false ? undefined : "short",
    year: options.year === false ? undefined : "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}
function electionMarkerText(event, locale, compare) {
  const year = String(new Date(parseTime(event.date)).getUTCFullYear());
  if (compare) return `${event.country.toUpperCase()} ${year}`;
  const word = locale === "de" ? "Wahl" : locale === "es" ? "Elección" : "Election";
  return `${word} ${year}`;
}
function formatValue(value, locale, digits = 1) { return Number(value).toLocaleString(numberLocale(locale), { minimumFractionDigits: digits, maximumFractionDigits: digits }); }
function safeFilename(value) { return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function freezeExportStyles(root) {
  const properties = [
    "color", "background-color", "background-image", "border-color", "border-radius", "box-shadow",
    "fill", "fill-opacity", "stroke", "stroke-opacity", "stroke-width", "stroke-dasharray", "stroke-linecap",
    "font-family", "font-size", "font-style", "font-weight", "letter-spacing", "line-height", "opacity",
    "paint-order", "text-anchor", "text-transform",
  ];
  [root, ...root.querySelectorAll("*")].forEach((node) => {
    const computed = window.getComputedStyle(node);
    properties.forEach((property) => {
      const value = computed.getPropertyValue(property);
      if (value && value !== "normal") node.style.setProperty(property, value);
    });
    node.style.setProperty("animation", "none");
    node.style.setProperty("transition", "none");
  });
}
function answerValue(point, answer) {
  if (answer === "positive") return Number.isFinite(point.positive) ? point.positive : null;
  if (answer === "negative") return Number.isFinite(point.negative) ? point.negative : null;
  if (answer === "net") return Number.isFinite(point.positive) && Number.isFinite(point.negative) ? point.positive - point.negative : null;
  return Number.isFinite(point.positive) && Number.isFinite(point.negative) ? Math.max(0, 100 - point.positive - point.negative) : null;
}
function answerLabel(answer, text) { return text[answer]; }
function answerUnit(answer) { return answer === "net" ? "pp" : "%"; }
function leaderLabel(country, text) { return country === "de" ? text.chancellor : country === "uk" ? text.primeMinister : text.president; }
function endedSeries(country, metric) { return country === "es" && metric === "government"; }
function partyColor(color) { return color?.toLowerCase() === "#181818" ? "var(--approval-conservative)" : color ?? "#687582"; }

const APPROVAL_PARTIES = {
  de: {
    "CDU/CSU": { id: "1", slug: "union", name: "CDU/CSU", color: "var(--party-union)" },
    SPD: { id: "2", slug: "spd", name: "SPD", color: "#d9485f" },
  },
  es: {
    PSOE: { id: "402", slug: "psoe", name: "PSOE", color: "#e0272f" },
    PP: { id: "401", slug: "pp", name: "PP", color: "#1479c9" },
  },
};

function useCompactLayout() {
  const query = "(max-width: 680px)";
  const [compact, setCompact] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setCompact(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return compact;
}

function useViewportSize() {
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
}

function useDialogFocus(open, onClose) {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return undefined;
    const previous = document.activeElement;
    const selector = 'button:not([disabled]),a[href],iframe:not([tabindex="-1"]),[tabindex]:not([tabindex="-1"])';
    window.requestAnimationFrame(() => ref.current?.querySelector(selector)?.focus());
    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); closeRef.current?.(); return; }
      if (event.key !== "Tab") return;
      const items = [...(ref.current?.querySelectorAll(selector) ?? [])].filter((item) => item.getClientRects().length);
      if (!items.length) return;
      if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); previous?.focus?.(); };
  }, [open]);
  return ref;
}

function administrationForPoint(item, point) {
  return item.administrations.find((term) => term.leader === point.leader && point.date >= term.start && (!term.end || point.date <= term.end))
    ?? item.administrations.find((term) => point.date >= term.start && (!term.end || point.date <= term.end));
}

function normalizeEvents(data, eventCatalog, countries) {
  const fromCatalog = countries.flatMap((country) => (eventCatalog?.[country] ?? []).map((event) => ({ ...event, country })));
  const source = fromCatalog.length ? fromCatalog : (data.events ?? []).filter((event) => countries.includes(event.country));
  return source.map((event, index) => ({
    ...event,
    id: event.id ?? `${event.country}-${event.date}-${index}`,
    category: event.category ?? "politics",
    labelDe: event.labelDe ?? event.de ?? event.shortDe,
    labelEn: event.labelEn ?? event.en ?? event.shortEn,
    labelEs: event.labelEs ?? event.es ?? event.shortEs ?? event.en,
    shortDe: event.shortDe,
    shortEn: event.shortEn,
    shortEs: event.shortEs,
  })).filter((event) => includeHistoricalEvent(event) && event.date && event.source);
}

function eventLabel(event, locale) {
  if (locale === "de") return event.labelDe ?? event.labelEn;
  if (locale === "es") return event.labelEs ?? event.labelEn;
  return event.labelEn ?? event.labelDe;
}

function eventDetail(event, locale) {
  if (locale === "de") return event.detailDe ?? event.descriptionDe ?? event.detailEn ?? eventLabel(event, locale);
  if (locale === "es") return event.detailEs ?? event.descriptionEs ?? event.detailEn ?? eventLabel(event, locale);
  return event.detailEn ?? event.descriptionEn ?? event.detailDe ?? eventLabel(event, locale);
}

function wrapEventLines(value, maxCharacters) {
  const words = String(value ?? "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || candidate.length <= maxCharacters) { line = candidate; continue; }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function approvalEventLimit({ compact, compare, mode, viewportWidth, viewportHeight }) {
  const widthBudgetBase = viewportWidth < 430 ? 5 : viewportWidth < 680 ? 6 : viewportWidth < 980 ? 8 : viewportWidth < 1250 ? 9 : 11;
  const widthBudget = viewportHeight < 520 ? Math.min(5, widthBudgetBase) : widthBudgetBase;
  return viewportHeight < 520
    ? widthBudget
    : mode === "all"
      ? Math.min(14, widthBudget + 2)
      : compare ? Math.min(compact ? 6 : 12, widthBudget + 1) : widthBudget;
}

function layoutVisibleEvents(ranked, { x, left, right, compact, compare, locale, limit }) {
  const lanes = Array.from({ length: 2 }, () => []);
  const selected = [];
  for (const event of ranked) {
    if (selected.length >= limit) break;
    const markerX = x(event.date);
    const countryPrefix = compare ? `${event.country?.toUpperCase()} · ` : "";
    const rawLabel = `${countryPrefix}${shortEventLabel(event, locale)}`;
    const label = rawLabel;
    const labelLines = wrapEventLines(label, compact ? 21 : compare ? 27 : 30);
    const longestLine = Math.max(...labelLines.map((line) => line.length));
    const labelWidth = Math.min(compact ? 205 : 285, Math.max(compact ? 116 : 132, (longestLine * (compact ? 6.45 : 6.8)) + 30));
    const labelHeight = 18 + (labelLines.length * 15);
    const labelCenter = Math.min(right - (labelWidth / 2), Math.max(left + (labelWidth / 2), markerX));
    const interval = [labelCenter - (labelWidth / 2) - 2, labelCenter + (labelWidth / 2) + 2];
    const preferredLane = compare ? Math.max(0, ["de", "uk"].indexOf(event.country)) : -1;
    const laneOrder = preferredLane >= 0 ? [preferredLane, ...lanes.map((_, index) => index).filter((index) => index !== preferredLane)] : lanes.map((_, index) => index);
    const lane = laneOrder.find((index) => lanes[index].every(([start, end]) => interval[1] < start || interval[0] > end)) ?? -1;
    if (lane < 0) continue;
    lanes[lane].push(interval);
    selected.push({ event, markerX, label, labelLines, labelWidth, labelHeight, labelCenter, lane });
  }
  return selected.sort((a, b) => parseTime(a.event.date) - parseTime(b.event.date));
}

function shortEventLabel(event, locale) {
  const label = locale === "de" ? event.shortDe ?? eventLabel(event, locale) : locale === "es" ? event.shortEs ?? eventLabel(event, locale) : event.shortEn ?? eventLabel(event, locale);
  const year = label.match(/\b(?:19|20)\d{2}\b/)?.[0];
  if (year && event.category === "uk-election") return locale === "de" ? `Unterhauswahl ${year}` : locale === "es" ? `Elecciones británicas ${year}` : `UK election ${year}`;
  if (year && /europawahl|european election|elecciones europeas/i.test(label)) return locale === "de" ? `Europawahl ${year}` : locale === "es" ? `Elecciones europeas ${year}` : `European election ${year}`;
  if (year && /bundestagswahl|german federal election/i.test(label)) return locale === "de" ? `Bundestagswahl ${year}` : locale === "es" ? `Elecciones alemanas ${year}` : `German election ${year}`;
  return label;
}

function categoryLabel(category, locale) {
  const known = {
    de: { national: "Nationale Ereignisse", germany: "Deutschland", europe: "Europa", global: "Weltgeschehen", controversy: "Kontroversen", "uk-election": "Unterhauswahlen", "uk-politics": "Britische Politik", "uk-economy": "Wirtschaft", "spain-election": "Parlamentswahlen", "spain-politics": "Spanische Politik" },
    en: { national: "National events", germany: "Germany", europe: "Europe", global: "Global events", controversy: "Controversies", "uk-election": "General elections", "uk-politics": "UK politics", "uk-economy": "Economy", "spain-election": "General elections", "spain-politics": "Spanish politics" },
    es: { national: "Acontecimientos nacionales", germany: "Alemania", europe: "Europa", global: "Acontecimientos mundiales", controversy: "Controversias", "uk-election": "Elecciones británicas", "uk-politics": "Política británica", "uk-economy": "Economía", "spain-election": "Elecciones generales", "spain-politics": "Política española" },
  };
  return known[language(locale)][category] ?? category.replaceAll("-", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function InfoDialog({ data, countries, metric, locale, currentOnly = false }) {
  const text = textFor(locale);
  const calculation = locale === "de"
    ? `${currentOnly ? "Die Werte" : "Die Linien"} übernehmen die veröffentlichten Anteile positiver oder negativer Antworten; der Saldo ist positiv minus negativ in Prozentpunkten. Der kompakte Balken im aktuellen Stand verteilt nur diese beiden Antwortgruppen auf 100 Prozent, damit ihr Verhältnis lesbar bleibt. Neutrale Antworten und fehlende Angaben werden dort nicht als eigene Gruppe gezeigt, bleiben aber Bestandteil der Originalerhebung.`
    : locale === "es"
      ? `${currentOnly ? "Los valores" : "Las líneas"} reproducen los porcentajes publicados de respuestas positivas o negativas; el saldo es el porcentaje positivo menos el negativo, en puntos porcentuales. La barra compacta del dato actual reparte solo esos dos grupos hasta el 100 % para mostrar su relación. Las respuestas neutras y la falta de respuesta no aparecen como grupo separado, pero siguen formando parte del estudio original.`
      : `${currentOnly ? "The figures" : "The lines"} reproduce the published positive or negative response shares; net rating is positive minus negative in percentage points. The compact current bar rescales only those two answer groups to 100% so their relationship is readable. Neutral and missing answers are not shown as a separate group there, but remain part of the original study.`;
  return (
    <InfoPopover label={text.methodology} closeLabel={text.closeEditor} className="approval-info graph-info-compact" cardClassName="approval-info-card">
        <p className="approval-info-prose">{currentOnly
          ? (locale === "de" ? "Der aktuelle Stand zeigt die jüngste veröffentlichte Messung, keinen Durchschnitt mehrerer Umfragen." : locale === "es" ? "El dato actual muestra la medición publicada más reciente, no un promedio de varias encuestas." : "The current status shows the latest published measurement, not an average of several polls.")
          : countries.length > 1 ? text.chartCompare : text.chartSingle} {calculation} {!currentOnly && (locale === "de" ? "Pollframe führt nur die redaktionell ausgewählten Ereignisse für diesen Zeitraum auf. Jedes davon hat im Diagramm eine Markierung: Wahlen erscheinen als durchgezogene Linien, die wichtigsten Ereignisse als Beschriftungen und alle übrigen als kleine hohle Punkte auf der interaktiven Website. Das liefert zeitlichen Kontext, aber keinen Beleg für Ursache und Wirkung." : locale === "es" ? "Pollframe solo enumera los acontecimientos seleccionados editorialmente para este periodo. Cada uno tiene una marca en el gráfico: las elecciones aparecen como líneas continuas, los acontecimientos principales como etiquetas y los demás como pequeños puntos huecos en la web interactiva. Aportan contexto temporal, no demuestran causalidad." : "Pollframe lists only the editorially selected events for this period. Every one has a chart marker: elections use solid lines, the leading events receive labels, and all others use small hollow dots on the interactive website. They provide timing context, not evidence of causation.")} {countries.map((country, index) => {
          const item = data.countries[country];
          const series = item.series[metric];
          const latest = series.at(-1);
          return (
            <React.Fragment key={country}>{index ? " " : " "}<strong>{item.flag} {countryName(country, locale)}.</strong> {text.originalQuestion}: “{item.questions[metric]}” {text.latestPoint}: {formatDate(latest.date, locale)}; {text.age(dataAge(latest.date))}{endedSeries(country, metric) ? `; ${text.archiveSeries}` : ""}. {approvalNotes(country, locale, item.notes).join(" ")} {text.source}: <a href={item.source.href} target="_blank" rel="noreferrer">{item.source.label} ↗</a>.</React.Fragment>
          );
        })}</p>
    </InfoPopover>
  );
}

function CurrentApprovalCard({ data, country, metric, locale, embed = false }) {
  const text = textFor(locale);
  const exportRef = useRef(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTheme, setShareTheme] = useState("light");
  const item = data.countries[country];
  const series = item.series[metric];
  const latest = series.at(-1);
  const net = Number.isFinite(latest.negative) ? latest.positive - latest.negative : null;
  const answered = Number.isFinite(latest.negative) ? latest.positive + latest.negative : latest.positive;
  const age = dataAge(latest.date);
  const ended = endedSeries(country, metric);
  const currentOfficeholder = item.administrations.at(-1)?.leader;
  const supersededLeader = metric === "leader" && currentOfficeholder && latest.leader !== currentOfficeholder;
  const rows = [
    ["positive", latest.positive],
    ["negative", latest.negative],
    ["net", net],
  ].filter(([, value]) => Number.isFinite(value));
  const subject = metric === "government" ? text.government : leaderLabel(country, text);
  const title = `${subject}: ${text.current}`;
  const publicUrl = `${window.location.origin}/?view=approval&country=${country}&metric=${metric}&lang=${locale}#approval-current-${metric}`;
  const embedUrl = `${window.location.origin}/embed.html?view=approval&country=${country}&widget=current-approval&metric=${metric}&lang=${locale}&theme=${shareTheme}`;
  return (
    <aside ref={exportRef} id={`approval-current-${metric}`} className={`approval-current-card approval-current-${metric} ${ended ? "is-archive" : ""}`} aria-labelledby={`approval-current-${metric}-title`}>
      {!embed && <div className="approval-current-corner-info"><InfoDialog data={data} countries={[country]} metric={metric} locale={locale} currentOnly /></div>}
      <small className="widget-data-age">{ended ? text.archiveSeries : text.age(age)}</small>
      {!embed && <div className="approval-current-tools" data-export-ignore="true"><button className="widget-share-trigger" type="button" onClick={() => setShareOpen(true)} aria-label={`${text.share}: ${title}`} title={text.share}><Icon name="share" size={15}/></button><PngExportButton elementRef={exportRef} filename={`pollframe-${country}-${metric}-current`} title={title} subtitle={countryName(country, locale)} locale={locale} label={text.png} credit={`${item.source.label} · Pollframe`} profile="approval-current" className="widget-share-trigger widget-png-trigger"/></div>}
      <header>
        <div><p className="section-label">{subject}</p><h2 id={`approval-current-${metric}-title`}>{metric === "government" ? countryName(country, locale) : latest.leader}</h2></div>
        <div className="approval-current-header-side"><span className={`approval-series-status ${ended || age > 120 || supersededLeader ? "stale" : "live"}`}>{ended ? text.archiveSeries : age > 120 || supersededLeader ? text.staleSeries : text.currentSeries}</span></div>
      </header>
      {supersededLeader && <p className="approval-current-caveat">{text.noCurrentLeaderRating(currentOfficeholder)}</p>}
      <div className="approval-current-values">
        {rows.map(([answer, value]) => <div key={answer} data-answer={answer} data-value={value} className={answer === "net" ? `approval-net-value ${value >= 0 ? "positive" : "negative"}` : ""}><span><i className={answer} />{answer === "net" ? text.net : locale === "de" ? (answer === "positive" ? "Gute Arbeit" : "Schlechte Arbeit") : locale === "es" ? (answer === "positive" ? "Buena gestión" : "Mala gestión") : (answer === "positive" ? "Good performance" : "Poor performance")}</span><strong>{answer === "net" ? `${value > 0 ? "+" : ""}${formatValue(value, locale)} ${locale === "de" ? "Pp." : "pp"}` : `${formatValue(value, locale)}%`}</strong></div>)}
      </div>
      <div className="approval-response-bar" aria-hidden="true"><i className="positive" style={{ width: `${(latest.positive / Math.max(1, answered)) * 100}%` }} /><i className="negative" style={{ width: `${(latest.negative / Math.max(1, answered)) * 100}%` }} /></div>
      <footer><span>{text.published}: <time dateTime={latest.date}>{formatDate(latest.date, locale)}</time></span><a href={item.source.href} target="_blank" rel="noreferrer">{item.source.label} ↗</a></footer>
      <ApprovalSnapshotShareDialog open={shareOpen} onClose={() => setShareOpen(false)} url={publicUrl} embedUrl={embedUrl} elementRef={exportRef} data={data} country={country} metric={metric} locale={locale} theme={shareTheme} setTheme={setShareTheme} title={title} />
    </aside>
  );
}

function ApprovalSnapshotShareDialog({ open, onClose, url, embedUrl, elementRef, data, country, metric, locale, theme, setTheme, title }) {
  const text = textFor(locale);
  const [copied, setCopied] = useState("");
  const [previewWidth, setPreviewWidth] = useState("article");
  const [copyError, setCopyError] = useState(false);
  const dialogRef = useDialogFocus(open, onClose);
  useEffect(() => { if (open) trackAggregateEvent("share_dialog_opened"); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = htmlOverflow; document.body.style.overflow = bodyOverflow; };
  }, [open]);
  if (!open) return null;
  const labels = locale === "de"
    ? { wide: "Breit", article: "Artikel", phone: "Handy", code: "Embed-Code", credit: "Quellenhinweis kopieren", creditDone: "Quellenhinweis kopiert", bug: "Problem melden", copyFailed: "Kopieren fehlgeschlagen" }
    : locale === "es"
      ? { wide: "Ancho", article: "Artículo", phone: "Móvil", code: "Código de inserción", credit: "Copiar cita de fuente", creditDone: "Cita copiada", bug: "Informar", copyFailed: "No se pudo copiar" }
      : { wide: "Wide", article: "Article", phone: "Phone", code: "Embed code", credit: "Copy source note", creditDone: "Source note copied", bug: "Report issue", copyFailed: "Copy failed" };
  const height = 560;
  const code = `<iframe src="${htmlAttribute(embedUrl)}" title="${htmlAttribute(title)}" width="100%" height="${height}" loading="lazy" style="border:0;display:block;width:100%;max-width:100%" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>`;
  const source = data.countries[country].source;
  const sourceNote = `${title}. ${source.label}: ${source.href}. Pollframe: ${url}`;
  const copy = async (value, kind) => {
    setCopyError(false);
    try {
      await copyText(value);
      setCopied(kind);
      if (kind === "link") trackAggregateEvent("share_link_copied");
      if (kind === "embed") trackAggregateEvent("embed_code_copied");
      if (kind === "credit") trackAggregateEvent("source_note_copied");
      window.setTimeout(() => setCopied(""), 1800);
    } catch { setCopyError(true); window.setTimeout(() => setCopyError(false), 2400); }
  };
  return createPortal(<div className="overlay modal-overlay approval-share-modal" role="presentation" data-export-ignore="true" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section ref={dialogRef} className="embed-modal approval-share-card approval-snapshot-share-card" role="dialog" aria-modal="true" aria-labelledby="approval-snapshot-share-title" tabIndex={-1}>
    <div className="panel-header"><div><span className="section-label">{countryName(country, locale)}</span><h2 id="approval-snapshot-share-title">{text.share}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label={text.closeEditor}><Icon name="close" /></button></div>
    <p className="modal-intro">{locale === "de" ? "Der aktuelle Stand bleibt im Embed kompakt, responsiv und mit Originalquelle gekennzeichnet." : locale === "es" ? "El dato actual conserva un diseño compacto y adaptable, con la fuente original identificada." : "The latest rating stays compact and responsive in the embed, with its original source identified."}</p>
    <div className="embed-options embed-options-single"><div><span>{text.appearance}</span><div className="segmented">{[["light",text.light],["dark",text.dark],["system",text.system]].map(([value,label]) => <button key={value} className={theme===value?"selected":""} type="button" aria-pressed={theme===value} onClick={() => setTheme(value)}>{label}</button>)}</div></div></div>
    <div className="embed-preview-toolbar" aria-label={text.preview}>{[["wide",labels.wide],["article",labels.article],["phone",labels.phone]].map(([value,label]) => <button key={value} type="button" className={previewWidth===value?"selected":""} aria-pressed={previewWidth===value} onClick={() => setPreviewWidth(value)}>{label}</button>)}</div>
    <StaticEmbedPreview src={embedUrl} title={title} height={height} previewWidth={previewWidth} targetHeight={330} className="approval-embed-preview" />
    <label className="code-label">{labels.code}<code>{code}</code></label>
    <div className="embed-actions approval-share-actions"><button className="secondary-button" type="button" onClick={() => copy(url,"link")}><Icon name="share" size={16}/>{copied==="link"?text.copied:text.copyLink}</button><button className="primary-button" type="button" onClick={() => copy(code,"embed")}><Icon name="code" size={16}/>{copied==="embed"?text.copied:text.copyEmbed}</button><PngExportButton elementRef={elementRef} filename={`pollframe-${country}-${metric}-current`} title={title} subtitle={countryName(country, locale)} locale={locale} label={text.png} credit={`${source.label} · Pollframe`} profile="approval-current"/><button className="secondary-button" type="button" onClick={() => copy(sourceNote,"credit")}><Icon name="check" size={16}/>{copied==="credit"?labels.creditDone:labels.credit}</button><a className="secondary-button" href={`/?page=bug-report&from=${encodeURIComponent(url)}`}><Icon name="info" size={16}/>{labels.bug}</a></div>
    {copyError && <p className="embed-copy-error" role="status">{labels.copyFailed}</p>}
  </section></div>, document.body);
}

function ApprovalSnapshotEmbed({ data, country, metric, locale }) {
  const text = textFor(locale);
  const item = data.countries[country];
  const shareUrl = `/?view=approval&country=${country}&metric=${metric}&lang=${locale}#approval-current-${metric}`;
  return <main className="widget-embed-page approval-snapshot-embed"><header className="embed-header"><div><strong>↗ POLLFRAME</strong><h1>{metric === "government" ? text.government : leaderLabel(country, text)} · {text.current}</h1></div><span>{countryName(country, locale)}</span></header><CurrentApprovalCard data={data} country={country} metric={metric} locale={locale} embed/><footer className="embed-footer"><a href={item.source.href} target="_blank" rel="noreferrer">{item.source.label} ↗</a><a href={shareUrl} target="_blank" rel="noreferrer">{text.open} ↗</a></footer></main>;
}

function RecentLeaderSnapshot({ country, locale }) {
  const text = textFor(locale);
  const snapshot = RECENT_LEADER_SNAPSHOTS[country];
  if (!snapshot || dataAge(snapshot.asOf) > snapshot.expiresAfterDays) return null;
  return (
    <aside className="approval-leader-snapshot" aria-labelledby="approval-leader-snapshot-title">
      <small className="widget-data-age">{text.age(dataAge(snapshot.asOf))}</small>
      <header><div><p className="section-label">{snapshot.sourceLabel}</p><h3 id="approval-leader-snapshot-title">{text.recentLeaderSnapshot}</h3></div></header>
      <div className="approval-leader-snapshot-values">
        <article><span>{text.mostPopular}</span><strong><a href={snapshot.source} target="_blank" rel="noreferrer">{snapshot.positive.name} ↗</a></strong><b>{snapshot.positive.value}% {text.positiveOpinion}</b></article>
        <article><span>{text.mostDisliked}</span><strong><a href={snapshot.negativeSource} target="_blank" rel="noreferrer">{snapshot.negative.name} ↗</a></strong><b>{snapshot.negative.value}% {text.negativeOpinion}</b></article>
      </div>
      <footer><p>{text.snapshotNote}</p><a href={snapshot.source} target="_blank" rel="noreferrer">{text.source} ↗</a></footer>
    </aside>
  );
}

function segmentedSeries(points, item) {
  const groups = [];
  for (const point of points) {
    const term = administrationForPoint(item, point);
    const key = `${term?.start ?? point.leader}:${point.leader ?? ""}`;
    const last = groups.at(-1);
    if (!last || last.key !== key) groups.push({ key, term, points: [point] });
    else last.points.push(point);
  }
  return groups;
}

function smoothValues(points, answer) {
  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1 || points.length < 3) return { ...point, displayValue: answerValue(point, answer) };
    const values = [points[index - 1], point, points[index + 1]].map((item) => answerValue(item, answer));
    return { ...point, displayValue: values.every(Number.isFinite) ? ((values[0] + (values[1] * 2) + values[2]) / 4) : answerValue(point, answer) };
  });
}

function linearPath(points, x, y, value = (point) => point.displayValue) {
  const coordinates = points.filter((point) => Number.isFinite(value(point))).map((point) => [x(point.date), y(value(point))]);
  return coordinates.length > 1 ? coordinates.map(([px, py], index) => `${index ? "L" : "M"} ${px.toFixed(1)} ${py.toFixed(1)}`).join(" ") : "";
}

function smoothPath(points, x, y) {
  const coordinates = points.filter((point) => Number.isFinite(point.displayValue)).map((point) => ({ x: x(point.date), y: y(point.displayValue) }));
  if (coordinates.length < 2) return "";
  const slopes = coordinates.slice(0, -1).map((point, index) => (coordinates[index + 1].y - point.y) / Math.max(.001, coordinates[index + 1].x - point.x));
  const tangents = coordinates.map((_, index) => index === 0 ? slopes[0] : index === coordinates.length - 1 ? slopes.at(-1) : slopes[index - 1] * slopes[index] <= 0 ? 0 : (slopes[index - 1] + slopes[index]) / 2);
  return coordinates.slice(1).reduce((path, point, index) => {
    const previous = coordinates[index];
    const third = (point.x - previous.x) / 3;
    return `${path} C ${(previous.x + third).toFixed(1)} ${(previous.y + tangents[index] * third).toFixed(1)}, ${(point.x - third).toFixed(1)} ${(point.y - tangents[index + 1] * third).toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, `M ${coordinates[0].x.toFixed(1)} ${coordinates[0].y.toFixed(1)}`);
}

function ApprovalHistoryChart({ data, countries, metric, range, display, answers, eventMode, selectedEventCategories, locale, eventCatalog, compare, interactiveEventDots = true }) {
  const text = textFor(locale);
  const compact = useCompactLayout();
  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const chartBoundsRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [hoverEvent, setHoverEvent] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const countrySeries = useMemo(() => countries.map((country) => ({ country, points: data.countries[country].series[metric] })), [countries, data, metric]);
  const latestTime = Math.max(...countrySeries.flatMap(({ points }) => points.map((point) => parseTime(point.date))));
  const earliestTime = Math.min(...countrySeries.flatMap(({ points }) => points.map((point) => parseTime(point.date))));
  const years = range === "one" ? 1 : range === "five" ? 5 : range === "ten" ? 10 : null;
  const startTime = years ? Math.max(earliestTime, latestTime - (years * 365.25 * DAY)) : earliestTime;
  // Keep every range on the same fitted mobile canvas. A separate scrolling
  // full-archive layout made the chart visibly revert after customisation.
  const visible = countrySeries.map(({ country, points }) => ({ country, points: points.filter((point) => parseTime(point.date) >= startTime && parseTime(point.date) <= latestTime) }));
  const netSelected = answers.includes("net");
  const plottedValues = visible.flatMap(({ points }) => points.flatMap((point) => answers.map((answer) => answerValue(point, answer))).filter(Number.isFinite));
  if (netSelected) plottedValues.push(0);
  if (!plottedValues.length) return <p className="approval-no-data">{text.noData}</p>;
  const rawMin = Math.min(...plottedValues);
  const rawMax = Math.max(...plottedValues);
  const padding = Math.max(4, (rawMax - rawMin) * .1);
  const axisFloor = netSelected ? -100 : 0;
  let minY = Math.max(axisFloor, Math.floor((rawMin - padding) / 5) * 5);
  let maxY = Math.min(100, Math.ceil((rawMax + padding) / 5) * 5);
  if (netSelected) { minY = Math.min(0, minY); maxY = Math.max(0, maxY); }
  if (maxY - minY < 20) { minY = Math.max(axisFloor, minY - 5); maxY = Math.min(100, maxY + 5); }
  const W = compact ? 420 : 1320;
  const H = compact ? 390 : 660;
  const L = compact ? 46 : 58;
  const R = compact ? 18 : 130;
  const B = compact ? 76 : 68;
  const innerW = W - L - R;
  const x = (date) => L + ((parseTime(date) - startTime) / Math.max(1, latestTime - startTime)) * innerW;
  const yStep = maxY - minY <= 30 ? 5 : 10;
  const yTicks = [...new Set([
    ...Array.from({ length: Math.floor((maxY - minY) / yStep) + 1 }, (_, index) => minY + (index * yStep)),
    ...(netSelected ? [0] : []),
  ])].sort((a, b) => a - b);
  const tickCount = compact ? 3 : 5;
  const xTicks = Array.from({ length: tickCount }, (_, index) => startTime + ((latestTime - startTime) * index / Math.max(1, tickCount - 1)));
  const seenSharedEvents = new Set();
  const allEvents = normalizeEvents(data, eventCatalog, countries)
    .filter((event) => parseTime(event.date) >= startTime && parseTime(event.date) <= latestTime && selectedEventCategories.includes(event.category))
    .filter((event) => {
      if (!compare || event.category !== "global") return true;
      const key = event.globalKey ?? `${event.category}:${event.date}`;
      if (seenSharedEvents.has(key)) return false;
      seenSharedEvents.add(key);
      return true;
    })
    .sort((a, b) => parseTime(a.date) - parseTime(b.date));
  const electionEvents = allEvents.filter(isPrimaryElectionEvent);
  const electionMarkers = (() => {
    const lanes = Array.from({ length: compact ? 1 : 2 }, () => []);
    const labelWidth = compare ? (compact ? 66 : 76) : (compact ? 72 : 84);
    return electionEvents.map((event) => {
      const markerX = x(event.date);
      const labelCenter = Math.min(W - R - (labelWidth / 2), Math.max(L + (labelWidth / 2), markerX));
      const interval = [labelCenter - (labelWidth / 2) - 3, labelCenter + (labelWidth / 2) + 3];
      const lane = lanes.findIndex((items) => items.every(([start, end]) => interval[1] < start || interval[0] > end));
      if (lane >= 0) lanes[lane].push(interval);
      return { event, markerX, labelCenter, labelWidth, lane };
    });
  })();
  const eventLimit = eventMode === "none" ? 0 : approvalEventLimit({ compact, compare, mode: eventMode, viewportWidth, viewportHeight });
  const rankedEvents = rankHistoricalEvents(allEvents.map((event) => ({ ...event, balanceCategory: compare ? `${event.country}/${event.category}` : event.category })), {
    limit: eventLimit,
    startTime,
    endTime: latestTime,
    profile: "balanced",
  });
  const eventMarkers = layoutVisibleEvents(rankedEvents, { x, left: L, right: W - R, compact, compare, locale, limit: eventLimit });
  const labelledEventIds = new Set(eventMarkers.map((marker) => marker.event.id));
  const eventMaxLabelHeight = eventMarkers.length ? Math.max(...eventMarkers.map((marker) => marker.labelHeight)) : 0;
  const eventBoxHeight = Math.max(compact ? 36 : 38, eventMaxLabelHeight);
  const eventLaneGap = 4;
  const eventLaneHeight = eventBoxHeight + eventLaneGap;
  const eventLabelBase = compact ? 5 : 8;
  const eventLaneCount = eventMarkers.length ? Math.max(...eventMarkers.map((marker) => marker.lane)) + 1 : 0;
  const eventLayersHeight = (eventLaneCount * eventBoxHeight) + (Math.max(0, eventLaneCount - 1) * eventLaneGap);
  const T = eventLaneCount ? eventLabelBase + eventLayersHeight + (compact ? 7 : 10) : compact ? 28 : 60;
  const eventDots = (() => {
    const dots = rankedEvents
      .filter((candidate) => !labelledEventIds.has(candidate.id))
      .sort((a, b) => parseTime(a.date) - parseTime(b.date))
      .map((event) => {
        const markerX = x(event.date);
        return { event, markerX, markerY: T };
      });
    const groups = new Map();
    dots.forEach((dot) => { const key = dot.event.date; groups.set(key, [...(groups.get(key) ?? []), dot]); });
    return dots.map((dot) => {
      const group = groups.get(dot.event.date);
      if (group.length < 2) return dot;
      const index = group.indexOf(dot);
      return { ...dot, markerX: dot.markerX + (((group.length - 1) / 2 - index) * (compact ? 3.2 : 3.8)) };
    });
  })();
  const displayedEvents = [...new Map([
    ...eventMarkers.map((marker) => marker.event),
    ...eventDots.map((marker) => marker.event),
    ...electionEvents,
  ].map((event) => [event.id, event])).values()].sort((a, b) => parseTime(a.date) - parseTime(b.date));
  const candidateActiveEvent = hoverEvent ?? selectedEvent;
  const activeEvent = candidateActiveEvent && displayedEvents.some((event) => event.id === candidateActiveEvent.id) ? candidateActiveEvent : null;
  const innerH = H - T - B;
  const y = (value) => T + innerH - ((value - minY) / Math.max(1, maxY - minY)) * innerH;
  const termMarkers = countries.flatMap((country) => data.countries[country].administrations
    .filter((term) => parseTime(term.start) > startTime && parseTime(term.start) <= latestTime)
    .map((term) => {
      const countryPoints = visible.find((item) => item.country === country)?.points ?? [];
      const point = countryPoints.find((item) => item.date >= term.start && administrationForPoint(data.countries[country], item)?.start === term.start);
      const value = point ? answerValue(point, answers[0]) : null;
      return Number.isFinite(value) ? { ...term, country, point, value, markerColor: compare ? COUNTRY_COLORS[country] : partyColor(term.color) } : null;
    }).filter(Boolean));
  const segments = visible.flatMap(({ country, points }) => segmentedSeries(points, data.countries[country]).flatMap((segment) => answers.map((answer) => ({ ...segment, country, answer }))));
  const availablePoints = visible.flatMap(({ country, points }) => points.map((point) => ({ ...point, country })));
  const inspect = (event) => {
    const bounds = chartBoundsRef.current ?? event.currentTarget.getBoundingClientRect();
    if (!bounds) return;
    chartBoundsRef.current = bounds;
    const pointerX = ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * W;
    if (pointerX < L || pointerX > W - R) { setHover(null); return; }
    const targetTime = startTime + ((Math.min(W - R, Math.max(L, pointerX)) - L) / (W - L - R)) * (latestTime - startTime);
    const nearest = availablePoints.reduce((best, point) => !best || Math.abs(parseTime(point.date) - targetTime) < Math.abs(parseTime(best.date) - targetTime) ? point : best, null);
    if (!nearest) return;
    const focusTime = parseTime(nearest.date);
    const values = visible.map(({ country, points }) => {
      const point = points.reduce((best, item) => !best || Math.abs(parseTime(item.date) - focusTime) < Math.abs(parseTime(best.date) - focusTime) ? item : best, null);
      return point && (!compare || Math.abs(parseTime(point.date) - focusTime) <= 120 * DAY) ? { country, point } : null;
    }).filter(Boolean);
    setHover({ x: x(nearest.date), date: nearest.date, values });
  };
  const showEvent = (event) => { setHover(null); setHoverEvent(event); };
  const clearEvent = () => { setHoverEvent(null); if (!selectedEvent) setHover(null); };
  const colorFor = (country, segment) => compare ? COUNTRY_COLORS[country] : partyColor(segment.term?.color);
  const endLabels = visible.flatMap(({ country, points }) => answers.map((answer) => {
    const point = [...points].reverse().find((entry) => Number.isFinite(answerValue(entry, answer)));
    if (!point) return null;
    const term = administrationForPoint(data.countries[country], point);
    const value = answerValue(point, answer);
    return { country, answer, point, value, color: compare ? COUNTRY_COLORS[country] : partyColor(term?.color), labelY: y(value) };
  })).filter(Boolean).sort((a, b) => a.labelY - b.labelY);
  const labelGap = 19;
  endLabels.forEach((label, index) => { label.labelY = Math.max(label.labelY, index ? endLabels[index - 1].labelY + labelGap : T + 9); });
  for (let index = endLabels.length - 1; index >= 0; index -= 1) {
    const ceiling = index === endLabels.length - 1 ? H - B - 9 : endLabels[index + 1].labelY - labelGap;
    endLabels[index].labelY = Math.min(endLabels[index].labelY, ceiling);
  }
  const legendItems = compare
    ? countries.map((country) => ({ key: country, label: `${data.countries[country].flag} ${countryName(country, locale)}`, color: COUNTRY_COLORS[country] }))
    : data.countries[countries[0]].administrations
      .filter((term) => parseTime(term.start) <= latestTime && parseTime(term.end ?? "2100-01-01") >= startTime)
      .map((term) => ({ key: term.start, label: `${term.leader} · ${term.party}`, leader: term.leader, party: APPROVAL_PARTIES[countries[0]]?.[term.party] ?? null, country: countries[0], color: partyColor(term.color) }));
  const legendTitle = compare ? (locale === "de" ? "Länder" : locale === "es" ? "Países" : "Countries") : text.terms;
  const tooltipHeight = hover ? 38 + hover.values.reduce((height) => height + 21 + (answers.length * 15), 0) : 0;
  const tooltipX = hover ? (hover.x > W - 340 ? hover.x - 320 : hover.x + 15) : 0;
  return (
    <div className="chart-region approval-chart-region">
      <div className="line-legend approval-line-legend" aria-label={legendTitle}>
        <strong>{legendTitle}:</strong>
        {legendItems.map((item) => <span key={item.key}><i style={{ background: item.color }} />{item.party ? <>{item.leader} · <PartyInfoButton party={item.party} country={item.country} as="span" /></> : item.label}</span>)}
        <span className="axis-range-note">Y: {minY}–{maxY} {answerUnit(answers[0])}</span>
      </div>
      {answers.length > 1 && <div className="line-legend approval-answer-legend" aria-label={text.answers}><strong>{text.answers}:</strong>{answers.map((answer) => <span className={`answer-${answer}`} key={answer}><i />{answerLabel(answer, text)}</span>)}</div>}
      <div className="chart-stage">
        <span className="chart-scroll-hint" />
        <div className="chart-wrap">
        <svg className="poll-chart approval-poll-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${text.chartTitle} · ${metric === "government" ? text.government : text.leader}`} onPointerEnter={(event) => { chartBoundsRef.current = event.currentTarget.getBoundingClientRect(); }} onPointerMove={(event) => { if (window.matchMedia("(hover:hover) and (pointer:fine)").matches && !event.target.closest?.(".event-marker,.event-dot")) inspect(event); }} onPointerDown={(event) => { if (event.pointerType !== "touch" && !event.target.closest?.(".event-marker,.event-dot")) { inspect(event); setSelectedEvent(null); } }} onPointerLeave={(event) => { if (event.pointerType === "touch") return; chartBoundsRef.current = null; setHover(null); setHoverEvent(null); }}>
          {!netSelected && minY > 0 && <text x={L} y={T - 14} className="axis-domain-label">Y: {minY}–{maxY}%</text>}
          {yTicks.map((tick) => <g key={tick}><line className={`grid-line ${netSelected && tick === 0 ? "zero-line" : ""}`} x1={L} x2={W - R} y1={y(tick)} y2={y(tick)} /><text className="axis-label" x={L - 14} y={y(tick) + 5} textAnchor="end">{tick}{answerUnit(answers[0]) === "%" ? "%" : ""}</text></g>)}
          {electionMarkers.map(({ event, markerX, labelCenter, lane }) => <g className="historical-election-marker" key={`election-${event.country}-${event.id}`} aria-label={`${formatDate(event.date, locale)} · ${eventLabel(event, locale)}`}><line x1={markerX} x2={markerX} y1={T} y2={H - B + 7} />{lane >= 0 && <g className="election-bottom-label"><text x={labelCenter} y={H - B + 18 + (lane * 14)} textAnchor="middle">{electionMarkerText(event, locale, compare)}</text></g>}<title>{formatDate(event.date, locale)} · {eventLabel(event, locale)}</title></g>)}
          {interactiveEventDots && eventMode !== "none" && eventDots.length > 0 && <g className="interactive-event-layer" data-export-ignore="true">{eventDots.map(({ event, markerX, markerY }) => <g key={`dot-${event.country}-${event.id}`} className={`event-dot event-${event.category}`} role="button" tabIndex="0" aria-label={`${formatDate(event.date, locale)} · ${eventLabel(event, locale)}`} onMouseEnter={() => showEvent(event)} onMouseLeave={clearEvent} onFocus={() => showEvent(event)} onBlur={clearEvent} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(event); setHoverEvent(event); setHover(null); }} onKeyDown={(keyEvent) => { if (!["Enter", " "].includes(keyEvent.key)) return; keyEvent.preventDefault(); setSelectedEvent(event); setHoverEvent(event); setHover(null); }}><circle className="event-dot-hit" cx={markerX} cy={markerY} r={compact ? 14 : 15} /><circle className="event-anchor" cx={markerX} cy={markerY} r={compact ? 4.8 : 5.5} /></g>)}</g>}
          {eventMarkers.map((marker) => {
            const event = marker.event;
            const labelY = eventLabelBase + (marker.lane * eventLaneHeight);
            const firstLineY = labelY + (eventBoxHeight / 2) - (((marker.labelLines.length - 1) * 15) / 2) + 5;
            return <g key={`${event.country}-${event.id}`} className={`event-marker approval-event-marker-original event-${event.category} ${activeEvent?.id === event.id ? "active" : ""}`} tabIndex="0" role="button" aria-label={`${formatDate(event.date, locale)} · ${eventLabel(event, locale)}`} onMouseEnter={() => showEvent(event)} onMouseLeave={clearEvent} onFocus={() => showEvent(event)} onBlur={clearEvent} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedEvent(event); setHoverEvent(event); setHover(null); }} onKeyDown={(keyEvent) => { if (!["Enter", " "].includes(keyEvent.key)) return; keyEvent.preventDefault(); setSelectedEvent(event); setHoverEvent(event); setHover(null); }}>
              <line className="event-hit-target" x1={marker.markerX} x2={marker.markerX} y1={T} y2={H - B} />
              <line className="approval-event-context-line" x1={marker.markerX} x2={marker.markerX} y1={labelY + (eventBoxHeight / 2)} y2={H - B} />
              <rect className="event-label-bg" x={marker.labelCenter - (marker.labelWidth / 2)} y={labelY} width={marker.labelWidth} height={eventBoxHeight} rx="10" />
              <text className="event-label-text" x={marker.labelCenter} y={firstLineY} textAnchor="middle">{marker.labelLines.map((line, index) => <tspan x={marker.labelCenter} dy={index === 0 ? 0 : 15} key={`${event.id}-${index}`}>{line}</tspan>)}</text>
            </g>;
          })}
          {activeEvent && !eventMarkers.some((marker) => marker.event.id === activeEvent.id) && <line className={`approval-active-event-line event-${activeEvent.category}`} x1={x(activeEvent.date)} x2={x(activeEvent.date)} y1={T} y2={H - B} />}
          {termMarkers.map((term) => <g className={`approval-term-marker country-${term.country}`} data-country={term.country} data-leader={term.leader} data-start={term.start} key={`${term.country}-${term.start}`}><line className="term-marker-halo" x1={x(term.point.date)} x2={x(term.point.date)} y1={y(term.value) - 8} y2={y(term.value) + 8} /><line className="term-marker-tick" x1={x(term.point.date)} x2={x(term.point.date)} y1={y(term.value) - 7} y2={y(term.value) + 7} style={{ stroke: term.markerColor }} /><title>{term.leader} · {formatDate(term.start, locale)}</title></g>)}
          {segments.map((segment) => {
            const raw = segment.points.map((point) => ({ ...point, displayValue: answerValue(point, segment.answer) })).filter((point) => Number.isFinite(point.displayValue));
            const smooth = smoothValues(segment.points, segment.answer).filter((point) => Number.isFinite(point.displayValue));
            const trendPath = smoothPath(smooth, x, y);
            const averagePath = linearPath(raw, x, y);
            const color = colorFor(segment.country, segment);
            return <g className={`approval-series answer-${segment.answer}`} data-country={segment.country} data-term={segment.term?.start ?? segment.key} data-answer={segment.answer} key={`${segment.country}-${segment.key}-${segment.answer}`}>
              {(display === "trend" || display === "both") && trendPath && <><path d={trendPath} className="series-halo" fill="none" /><path d={trendPath} className="series-line" fill="none" style={{ stroke: color }} /></>}
              {(display === "linear" || display === "both") && averagePath && <><path d={averagePath} className="average-series-halo" fill="none" /><path d={averagePath} className="average-series-line" fill="none" style={{ stroke: color }} /></>}
              {display === "both" && raw.map((point) => <circle className="chart-cursor-point approval-average-point" key={point.date} cx={x(point.date)} cy={y(point.displayValue)} r="3.2" fill={color} />)}
            </g>;
          })}
          {!compact && endLabels.map((label) => <g className={`series-end-label approval-end-label answer-${label.answer}`} key={`${label.country}-${label.answer}-end`}><line x1={W - R + 5} x2={W - R + 17} y1={label.labelY} y2={label.labelY} style={{ stroke: label.color }} /><text x={W - R + 23} y={label.labelY + 4}>{compare ? `${data.countries[label.country].flag} ` : ""}{label.answer === "net" && label.value > 0 ? "+" : ""}{formatValue(label.value, locale)}{answerUnit(label.answer) === "%" ? "%" : " pp"}</text></g>)}
          {hover && <><line className="chart-cursor-line" x1={hover.x} x2={hover.x} y1={T} y2={H - B} />{hover.values.flatMap(({ country, point }) => answers.map((answer) => Number.isFinite(answerValue(point, answer)) ? <circle className="chart-cursor-point" key={`${country}-${answer}`} cx={hover.x} cy={y(answerValue(point, answer))} r="4" fill={compare ? COUNTRY_COLORS[country] : partyColor(administrationForPoint(data.countries[country], point)?.color)} /> : null))}</>}
          {xTicks.map((time, index) => { const date = isoDate(time); return <text className="axis-label" key={time} x={x(date)} y={H - 20} textAnchor={index === 0 ? "start" : index === xTicks.length - 1 ? "end" : "middle"}>{formatDate(date, locale, { day: false, month: range === "one" })}</text>; })}
          {hover && <g className="chart-tooltip approval-svg-tooltip" transform={`translate(${tooltipX}, ${T + 8})`}><rect width="305" height={tooltipHeight} rx="11" /><text x="15" y="24" className="tooltip-date">{formatDate(hover.date, locale)}</text>{hover.values.map(({ country, point }, countryIndex) => { const offset = 42 + hover.values.slice(0, countryIndex).reduce((sum) => sum + 21 + (answers.length * 15), 0); return <g key={country}><circle cx="17" cy={offset + 1} r="4.5" fill={compare ? COUNTRY_COLORS[country] : partyColor(administrationForPoint(data.countries[country], point)?.color)} /><text x="30" y={offset + 5} className="tooltip-name">{data.countries[country].flag} {point.leader}</text>{answers.map((answer, answerIndex) => { const value = answerValue(point, answer); return <text x="15" y={offset + 23 + (answerIndex * 15)} className="tooltip-meta" key={answer}>{answerLabel(answer, text)} · {answer === "net" && value > 0 ? "+" : ""}{formatValue(value, locale)}{answerUnit(answer) === "%" ? "%" : " pp"}</text>; })}</g>; })}</g>}
        </svg>
        </div>
        {activeEvent && <aside className={`event-hover-card approval-event-card event-${activeEvent.category}`} aria-live="polite"><div><span>{activeEvent.category === "global" ? "🌐" : data.countries[activeEvent.country]?.flag} {categoryLabel(activeEvent.category, locale)}</span><time dateTime={activeEvent.date}>{formatDate(activeEvent.date, locale)}</time></div><strong>{eventLabel(activeEvent, locale)}</strong><p>{eventDetail(activeEvent, locale)}</p><a className="event-card-source" href={activeEvent.source} target="_blank" rel="noreferrer">{text.source}<Icon name="external" size={13} /></a></aside>}
      </div>
      {eventMode !== "none" && displayedEvents.length > 0 && <details className="event-key"><summary><span><strong>{text.eventContext}</strong><small>{locale === "de" ? `${displayedEvents.length} Ereignisse gezeigt · ${eventMarkers.length} beschriftet${interactiveEventDots && eventDots.length ? ` · ${eventDots.length} als Punkte` : ""}${electionEvents.length ? ` · ${electionEvents.length} Wahlen` : ""}` : locale === "es" ? `${displayedEvents.length} acontecimientos mostrados · ${eventMarkers.length} etiquetados${interactiveEventDots && eventDots.length ? ` · ${eventDots.length} como puntos` : ""}${electionEvents.length ? ` · ${electionEvents.length} elecciones` : ""}` : `${displayedEvents.length} events shown · ${eventMarkers.length} labelled${interactiveEventDots && eventDots.length ? ` · ${eventDots.length} as dots` : ""}${electionEvents.length ? ` · ${electionEvents.length} elections` : ""}`}</small></span><Icon name="chevron" size={16} /></summary><div className="event-key-body"><p>{text.eventNote}</p><div className="event-key-list">{displayedEvents.map((event) => <a href={event.source} target="_blank" rel="noreferrer" className={`event-key-item event-${event.category}`} key={event.id} onPointerEnter={() => setHoverEvent(event)} onPointerLeave={() => setHoverEvent(null)}><span className="event-number" aria-hidden="true" /><span><time dateTime={event.date}>{formatDate(event.date, locale)}</time><strong>{eventLabel(event, locale)}</strong></span><Icon name="external" size={13} /></a>)}</div></div></details>}
      {eventMode !== "none" && allEvents.length === 0 && <p className="event-empty-note">{locale === "de" ? "Für diesen Zeitraum und die gewählten Kategorien sind keine kuratierten Ereignisse hinterlegt." : locale === "es" ? "No hay acontecimientos editoriales registrados para este periodo y estas categorías." : "No curated events are recorded for this period and these categories."}</p>}
    </div>
  );
}

async function downloadPng(element, title) {
  if (!element) throw new Error("Missing export element");
  if (document.fonts?.ready) await document.fonts.ready;
  const { toBlob } = await import("html-to-image");
  const background = "#ffffff";
  const host = document.createElement("div");
  host.className = "png-export-host approval-png-export-host";
  const surface = document.createElement("section");
  surface.className = "png-export-surface approval-png-export-surface";
  const header = document.createElement("header");
  header.className = "png-export-header";
  const identity = document.createElement("div");
  const brand = document.createElement("strong");
  brand.textContent = "↗ POLLFRAME";
  const context = document.createElement("small");
  context.textContent = title;
  identity.append(brand, context);
  const date = document.createElement("time");
  date.textContent = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date());
  header.append(identity, date);
  const content = document.createElement("div");
  content.className = "png-export-content";
  const clone = element.cloneNode(true);
  clone.querySelectorAll("[data-export-ignore], .interactive-event-layer, .event-dot, .event-dot-hit, .event-anchor, .event-hover-card, .chart-scroll-hint, .event-key").forEach((node) => node.remove());
  clone.classList.add("png-export-clone");
  clone.querySelectorAll("path.series-halo,path.series-line,path.average-series-halo,path.average-series-line").forEach((path) => path.setAttribute("fill", "none"));
  content.append(clone);
  const footer = document.createElement("footer");
  footer.className = "png-export-footer";
  footer.append(document.createTextNode(title), document.createTextNode("Pollframe · original sources shown in graphic"));
  surface.append(header, content, footer);
  host.append(surface);
  document.body.append(host);
  surface.style.width = "1600px";
  clone.style.width = "100%";
  clone.style.maxWidth = "none";
  let blob;
  try {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    freezeExportStyles(surface);
    clone.querySelectorAll(".chart-wrap").forEach((node) => node.style.setProperty("overflow", "visible"));
    clone.querySelectorAll(".poll-chart").forEach((node) => { node.style.setProperty("width", "100%"); node.style.setProperty("min-width", "0"); });
    blob = await toBlob(surface, { pixelRatio: 2.5, width: 1600, backgroundColor: background, cacheBust: true });
  } finally {
    host.remove();
  }
  if (!blob) throw new Error("PNG renderer returned no image");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${safeFilename(title)}-${new Date().toISOString().slice(0, 10)}.png`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(value); return true; }
    catch { /* use the selection fallback below */ }
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.inset = "0 auto auto -9999px";
  textarea.style.opacity = "0";
  textarea.setAttribute("readonly", "");
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard copy was rejected");
  return true;
}

function htmlAttribute(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function ShareDialog({ open, onClose, url, embedUrl, chartRef, data, countries, metric, locale, theme, setTheme }) {
  const text = textFor(locale);
  const [copied, setCopied] = useState("");
  const [previewWidth, setPreviewWidth] = useState("article");
  const [copyError, setCopyError] = useState(false);
  const dialogRef = useDialogFocus(open, onClose);
  useEffect(() => { if (open) trackAggregateEvent("share_dialog_opened"); }, [open]);
  useEffect(() => {
    if (!open) return undefined;
    const htmlOverflow = document.documentElement.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    const bodyPadding = document.body.style.paddingRight;
    const scrollbarWidth = Math.max(0, window.innerWidth - document.documentElement.clientWidth);
    const currentPadding = Number.parseFloat(getComputedStyle(document.body).paddingRight) || 0;
    if (scrollbarWidth) document.body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = htmlOverflow; document.body.style.overflow = bodyOverflow; document.body.style.paddingRight = bodyPadding; };
  }, [open]);
  if (!open) return null;
  const height = 1120;
  const code = `<iframe src="${htmlAttribute(embedUrl)}" title="${htmlAttribute(text.chartTitle)}" width="100%" height="${height}" loading="lazy" style="border:0;display:block;width:100%;max-width:100%" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>`;
  const labels = locale === "de"
    ? { wide: "Breit", article: "Artikel", phone: "Handy", code: "Embed-Code", credit: "Quellenhinweis kopieren", creditDone: "Quellenhinweis kopiert", bug: "Problem melden", copyFailed: "Kopieren fehlgeschlagen" }
    : locale === "es"
      ? { wide: "Ancho", article: "Artículo", phone: "Móvil", code: "Código de inserción", credit: "Copiar cita de fuente", creditDone: "Cita copiada", bug: "Informar", copyFailed: "No se pudo copiar" }
      : { wide: "Wide", article: "Article", phone: "Phone", code: "Embed code", credit: "Copy source note", creditDone: "Source note copied", bug: "Report issue", copyFailed: "Copy failed" };
  const sourceNote = `${text.chartTitle}. ${countries.map((country) => `${data.countries[country].source.label}: ${data.countries[country].source.href}`).join(" · ")} Pollframe: ${url}`;
  const bugUrl = `/?page=bug-report&from=${encodeURIComponent(url)}`;
  const copy = async (value, kind) => {
    setCopyError(false);
    try {
      await copyText(value);
      setCopied(kind);
      if (kind === "link") trackAggregateEvent("share_link_copied");
      if (kind === "embed") trackAggregateEvent("embed_code_copied");
      if (kind === "credit") trackAggregateEvent("source_note_copied");
      window.setTimeout(() => setCopied(""), 1800);
    }
    catch { setCopyError(true); window.setTimeout(() => setCopyError(false), 2400); }
  };
  const downloadCsv = () => {
    const rows = [["country", "metric", "date", "positive", "negative", "net", "remainder", "leader", "party", "source"]];
    countries.forEach((country) => data.countries[country].series[metric].forEach((point) => rows.push([country, metric, point.date, point.positive, point.negative ?? "", answerValue(point, "net") ?? "", answerValue(point, "middle") ?? "", point.leader ?? "", point.party ?? "", data.countries[country].source.href])));
    const blob = new Blob([rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `pollframe-approval-${metric}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    trackAggregateEvent("csv_downloaded");
  };
  return createPortal(
    <div className="overlay modal-overlay approval-share-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className="embed-modal approval-share-card" role="dialog" aria-modal="true" aria-labelledby="approval-share-title" tabIndex={-1}>
        <div className="panel-header"><div><span className="section-label">{text.share}</span><h2 id="approval-share-title">{text.preview}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label={text.closeEditor}><Icon name="close" /></button></div>
        <p className="modal-intro">{locale === "de" ? "Die Vorschau ist eine ruhige, nicht interaktive Miniatur. Das veröffentlichte Embed bleibt responsiv und mit Pollframe sowie Originalquelle gekennzeichnet." : locale === "es" ? "La vista previa es una miniatura estática. El gráfico publicado sigue siendo adaptable y conserva Pollframe y la fuente original." : "The preview is a static thumbnail. The published embed stays responsive, with Pollframe and the original source clearly identified."}</p>
        <div className="embed-options embed-options-single">
          <div><span>{text.appearance}</span><div className="segmented">{[["light", text.light], ["dark", text.dark], ["system", text.system]].map(([id, label]) => <button className={theme === id ? "selected" : ""} type="button" key={id} aria-pressed={theme === id} onClick={() => setTheme(id)}>{label}</button>)}</div></div>
        </div>
        <div className="embed-preview-toolbar" aria-label={text.preview}>{[["wide",labels.wide],["article",labels.article],["phone",labels.phone]].map(([value,label])=><button key={value} type="button" className={previewWidth===value?"selected":""} aria-pressed={previewWidth===value} onClick={()=>setPreviewWidth(value)}>{label}</button>)}</div>
        <StaticEmbedPreview src={embedUrl} title={text.preview} height={height} previewWidth={previewWidth} targetHeight={360} className="approval-embed-preview" />
        <label className="code-label">{labels.code}<code>{code}</code></label>
        <div className="embed-actions approval-share-actions">
          <button className="secondary-button" type="button" onClick={() => copy(url, "link")}><Icon name="share" size={16} />{copied === "link" ? text.copied : text.copyLink}</button>
          <button className="primary-button" type="button" onClick={() => copy(code, "embed")}><Icon name="code" size={16} />{copied === "embed" ? text.copied : text.copyEmbed}</button>
          <PngExportButton elementRef={chartRef} filename={`pollframe-approval-${metric}`} title={text.chartTitle} subtitle={countries.map((country) => countryName(country, locale)).join(" · ")} locale={locale} label={text.png} credit={`${countries.map((country) => data.countries[country].source.label).join(" · ")} · Pollframe`} profile="approval" />
          <button className="secondary-button" type="button" onClick={downloadCsv}><Icon name="download" size={16} />{text.csv}</button>
          <button className="secondary-button" type="button" onClick={() => copy(sourceNote, "credit")}><Icon name="check" size={16} />{copied === "credit" ? labels.creditDone : labels.credit}</button>
          <a className="secondary-button" href={bugUrl}><Icon name="info" size={16} />{labels.bug}</a>
        </div>
        {copyError && <p className="embed-copy-error" role="status">{labels.copyFailed}</p>}
      </section>
    </div>, document.body
  );
}

export function ApprovalPage({ data, locale, embed = false, eventCatalog = {} }) {
  const text = textFor(locale);
  const query = new URLSearchParams(window.location.search);
  // Keep the initial shared-view contract stable even after the canonical URL
  // effect removes the transient `share=1` parameter from the address bar.
  const sharedView = useRef(query.get("share") === "1").current;
  const availableCountries = COUNTRY_IDS.filter((country) => data.countries?.[country]);
  const requestedCountry = availableCountries.includes(query.get("country")) ? query.get("country") : availableCountries[0] ?? "de";
  const canCompare = COMPARE_COUNTRIES.every((country) => data.countries?.[country]);
  const [compare, setCompare] = useState(() => canCompare && (query.get("compare") === "1" || query.get("mode") === "compare"));
  const [metric, setMetric] = useState(() => ["government", "leader"].includes(query.get("metric")) ? query.get("metric") : "leader");
  const [range, setRange] = useState(() => ["one", "five", "ten", "all"].includes(query.get("range")) ? query.get("range") : "ten");
  const [display, setDisplay] = useState(() => ["trend", "linear", "both"].includes(query.get("display")) ? query.get("display") : "trend");
  const [answers, setAnswers] = useState(() => {
    const requested = (query.get("answers") ?? "positive").split(",").filter((answer) => ANSWER_IDS.includes(answer));
    return [requested[0] ?? "positive"];
  });
  const eventMode = "key";
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareTheme, setShareTheme] = useState("light");
  const chartRef = useRef(null);
  const countries = compare && canCompare ? COMPARE_COUNTRIES : [requestedCountry];
  const allEvents = useMemo(() => normalizeEvents(data, eventCatalog, countries), [data, eventCatalog, countries.join(",")]);
  const eventCategories = useMemo(() => [...new Set(allEvents.map((event) => event.category))], [allEvents]);
  const availableEventCategoriesRef = useRef(eventCategories);
  const [selectedEventCategories, setSelectedEventCategories] = useState(() => {
    const requested = (query.get("eventCats") ?? "").split(",").filter(Boolean);
    const initialCountries = compare && canCompare ? COMPARE_COUNTRIES : [requestedCountry];
    return requested.length ? requested : [...new Set(normalizeEvents(data, eventCatalog, initialCountries).map((event) => event.category))];
  });
  useEffect(() => {
    setSelectedEventCategories((current) => {
      const newlyAvailable = eventCategories.filter((category) => !availableEventCategoriesRef.current.includes(category));
      return [...new Set([...current, ...newlyAvailable])];
    });
    availableEventCategoriesRef.current = eventCategories;
  }, [eventCategories]);
  const toggleEventCategory = (category) => setSelectedEventCategories((current) => current.includes(category)
    ? current.length > 1 ? current.filter((item) => item !== category) : current
    : [...current, category]);
  const params = new URLSearchParams({ view: "approval", country: requestedCountry, compare: compare ? "1" : "0", metric, range, display, answers: answers.join(","), events: "1", eventCats: selectedEventCategories.join(","), lang: locale, share: "1" });
  const publicUrl = `${window.location.origin}/?${params}`;
  const embedParams = new URLSearchParams(params);
  embedParams.delete("share");
  embedParams.set("theme", shareTheme);
  const embedUrl = `${window.location.origin}/embed.html?${embedParams}`;
  useEffect(() => {
    if (embed) return;
    const url = new URL(window.location.href);
    ["mode", "countries"].forEach((key) => url.searchParams.delete(key));
    for (const [key, value] of params) url.searchParams.set(key, value);
    url.searchParams.delete("share");
    window.history.replaceState({}, "", url);
  }, [compare, metric, range, display, answers, selectedEventCategories, locale, embed]);
  const primarySeries = data.countries[countries[0]].series[metric];
  const primaryLatest = primarySeries.at(-1);
  const backHref = requestedCountry === "uk" ? "/?country=uk" : "/";
  const graphTitle = compare ? `${text.chartTitle}: ${countryName("de", locale)} · ${countryName("uk", locale)}` : `${metric === "government" ? text.government : leaderLabel(requestedCountry, text)}: ${text.chartTitle}`;
  if (embed && query.get("widget") === "current-approval") {
    const snapshotMetric = ["leader", "government"].includes(query.get("metric")) ? query.get("metric") : "leader";
    return <ApprovalSnapshotEmbed data={data} country={requestedCountry} metric={snapshotMetric} locale={locale} />;
  }
  const content = (
    <section ref={chartRef} className="chart-card approval-main-chart" aria-labelledby="approval-chart-title">
      <small className="widget-data-age">{endedSeries(countries[0], metric) ? text.archiveSeries : text.age(dataAge(primaryLatest.date))}</small>
      <div className="chart-heading approval-main-heading">
        <div className="chart-title-row widget-info-heading">
          <InfoDialog data={data} countries={countries} metric={metric} locale={locale} />
          <div><p className="section-label">{text.chartEyebrow}</p><h2 id="approval-chart-title">{graphTitle}</h2><p>{compare ? text.chartCompare : text.chartSingle}</p></div>
        </div>
        {!embed && <div className="chart-actions" data-export-ignore="true">
          <button className={`secondary-button ${customizeOpen ? "active" : ""}`} type="button" onClick={() => setCustomizeOpen((value) => !value)} aria-expanded={customizeOpen}><Icon name="sliders" />{text.customize}</button>
          {canCompare && <button className={`secondary-button approval-compare-toggle ${compare ? "active" : ""}`} type="button" aria-pressed={compare} onClick={() => setCompare((value) => !value)}><Icon name="globe" />{text.compareShort}</button>}
          <div className="approval-main-publish-tools">
            <button className="primary-button widget-share-trigger approval-share-trigger" type="button" onClick={() => setShareOpen(true)} aria-label={text.share} title={text.share}><Icon name="share" /><span>{text.share}</span></button>
            <PngExportButton elementRef={chartRef} filename={`pollframe-approval-${requestedCountry}-${metric}`} title={graphTitle} subtitle={countryName(requestedCountry, locale)} locale={locale} label={text.png} credit={`${countries.map((country) => data.countries[country].source.label).join(" · ")} · Pollframe`} profile="approval" className="widget-share-trigger widget-png-trigger approval-publish-trigger" />
          </div>
        </div>}
      </div>
      {customizeOpen && !embed && <div className="customize-panel approval-customize-panel" data-export-ignore="true">
        <SelectControl label={text.display} value={display} onChange={setDisplay} options={[["trend", text.trend], ["linear", text.linear], ["both", text.both]].map(([value, label]) => ({ value, label }))} />
        <SelectControl label={text.timeRange} value={range} onChange={setRange} options={[["one", text.one], ["five", text.five], ["ten", text.ten], ["all", text.all]].map(([value, label]) => ({ value, label }))} />
        <SelectControl label={text.subject} value={metric} onChange={setMetric} options={[["leader", leaderLabel(requestedCountry, text)], ["government", text.government]].map(([value, label]) => ({ value, label }))} />
        <SelectControl label={text.answers} value={answers[0]} onChange={(answer) => setAnswers([answer])} options={ANSWER_IDS.filter((answer) => data.countries[requestedCountry].series[metric].some((point) => Number.isFinite(answerValue(point, answer)))).map((answer) => ({ value: answer, label: answerLabel(answer, text) }))} />
        <MultiSelect label={text.eventCategories} summary={`${selectedEventCategories.length} / ${eventCategories.length}`} items={eventCategories.map((category) => ({ id: category, label: categoryLabel(category, locale) }))} selected={selectedEventCategories} onToggle={toggleEventCategory} />
      </div>}
      <ApprovalHistoryChart data={data} countries={countries} metric={metric} range={range} display={display} answers={answers} eventMode={eventMode} selectedEventCategories={selectedEventCategories} locale={locale} eventCatalog={eventCatalog} compare={compare} interactiveEventDots={!embed && !sharedView} />
      <footer className="approval-source-footer"><strong>{text.dataAndSource}</strong>{countries.map((country) => { const item = data.countries[country]; const series = item.series[metric]; return <a key={country} href={item.source.href} target="_blank" rel="noreferrer"><span>{item.flag} {item.source.label} · {series.length} {text.points} · {formatDate(series[0].date, locale)}–{formatDate(series.at(-1).date, locale)}</span><b>{text.source} ↗</b></a>; })}</footer>
      {!compare && <RecentLeaderSnapshot country={requestedCountry} locale={locale} />}
    </section>
  );
  if (embed) return <main className="approval-page is-embed"><div className="approval-page-inner">{content}<footer className="approval-embed-footer"><strong>↗ POLLFRAME</strong><a href={publicUrl} target="_blank" rel="noreferrer">{text.open} ↗</a></footer></div></main>;
  return (
    <main id="top" className="approval-page">
      <div className="approval-page-inner">
        <nav className="region-breadcrumb approval-breadcrumb" aria-label="Navigation"><a href={backHref}>← {text.back}</a><span>/</span><strong>{data.countries[requestedCountry].flag} {countryName(requestedCountry, locale)}</strong></nav>
        <section className="intro-section approval-intro-section">
          <div className="intro-copy"><div className="eyebrow"><span />{text.eyebrow} · {countryName(requestedCountry, locale)}</div><h1>{text.title[requestedCountry]}</h1><p>{text.intro}</p></div>
          <div className="approval-current-stack">
            <CurrentApprovalCard data={data} country={requestedCountry} metric="leader" locale={locale} />
            <CurrentApprovalCard data={data} country={requestedCountry} metric="government" locale={locale} />
          </div>
        </section>
        {content}
      </div>
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} url={publicUrl} embedUrl={embedUrl} chartRef={chartRef} data={data} countries={countries} metric={metric} locale={locale} theme={shareTheme} setTheme={setShareTheme} />
    </main>
  );
}
