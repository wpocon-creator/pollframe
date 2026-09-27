import {
  PARTY_DEFINITIONS,
  UK_PARTY_DEFINITIONS,
} from "./party-definitions.js";
import { SPAIN_PARTY_DEFINITIONS } from "./spain-data.js";
import { routeParamsForPath } from "./public-routes.js";
import { normalizeEdit } from "./studio-edit-model.js";
import { HISTORY_DESIGNS } from "./studio-history-model.js";
import { EXTRA_DESIGNS } from "./studio-extra-model.js";
import {STUDIO_DATASETS} from './studio-regions.js';
// A publishing recipe contains settings, never replacement poll numbers or URLs.
export const STUDIO_REGIONS = {
  de: "bundestag",
  uk: "uk-westminster",
  es: "spain-congress",
};
export const CURRENT_DESIGNS = [
  [
    "poll-classic",
    "classic",
    "landscape",
    "Pollframe Original",
    "Pollframe Original",
    "Pollframe Original",
  ],
  [
    "poll-pie",
    "pie",
    "square",
    "Kreisdiagramm",
    "Pie chart",
    "Gráfico circular",
  ],
  ["poll-material", "material", "square", "Skulptur", "Sculpture", "Escultura"],
  ["poll-wide", "news", "landscape", "Nachrichtenlage", "Newsroom", "Noticias"],
  [
    "poll-paper",
    "paper",
    "portrait",
    "Morgenblatt",
    "Morning paper",
    "El diario",
  ],
  [
    "poll-columns",
    "broadcast",
    "landscape",
    "Sendebild",
    "On air",
    "En antena",
  ],
  [
    "poll-lollipop",
    "lollipop",
    "landscape",
    "Punktlandung",
    "On point",
    "En el punto",
  ],
  ["poll-dotplot", "dotplot", "square", "Messlatte", "Benchmark", "Referencia"],
  [
    "poll-table",
    "table",
    "portrait",
    "Faktenblatt",
    "Fact sheet",
    "Ficha de datos",
  ],
  ["poll-square", "cards", "square", "Kartenstapel", "Cards", "Tarjetas"],
  ["poll-poster", "poster", "portrait", "Plakat", "Poster", "Cartel"],
  ["poll-signal", "signal", "landscape", "Signal", "Signal", "Señal"],
  [
    "poll-ladder",
    "ladder",
    "square",
    "Werte-Leiter",
    "Value ladder",
    "Escala de valores",
  ],
].map(([id, design, preset, ...name]) => ({
  id,
  design,
  preset,
  name,
  country: "de",
  topic: "current",
  profile: "current-poll",
  widget: "current-average",
  art: design,
  detail: ["Aktuelle Umfrage", "Latest poll", "Última encuesta"],
}));
const REMOVED_STUDIO_IDS = new Set(["history-wide","history-rail","party-news","party-rail","approval-news","approval-rail","approval-panels","approval-briefing","approval-focus","majority-distance","majority-duel","majority-strip"]);
// Keep the renderers/recipes recoverable, but never advertise withdrawn data.
export const isPausedStudioRequest = (input = {}) =>
  [input.template, input.profile, input.topic].some(value =>
    typeof value === "string" && /^approval(?:-|$)/.test(value));
export const STUDIO_TEMPLATES = [
  ...CURRENT_DESIGNS,
  ...HISTORY_DESIGNS,
  ...EXTRA_DESIGNS,
  {id:"approval-aligned",design:"aligned",preset:"landscape",topic:"approval",profile:"approval-history",country:"de",art:"lines",name:["Amtszeiten im Vergleich","Terms compared","Comparación de mandatos"],detail:["Monate seit Amtsantritt","Months since taking office","Meses desde la toma de posesión"],keywords:"regierungen kanzler amtsbeginn gleicher start vergleich normalisiert monate merkel scholz merz governments leaders aligned terms comparison"},
].filter(t=>!REMOVED_STUDIO_IDS.has(t.id) && !isPausedStudioRequest(t));
export const STUDIO_PARTIES = Object.fromEntries(
  Object.entries({
    de: PARTY_DEFINITIONS,
    uk: UK_PARTY_DEFINITIONS,
    es: SPAIN_PARTY_DEFINITIONS,
  }).map(([country, parties]) => [
    country,
    parties
      .filter((party) => party.slug !== "other")
      .map(({ id, slug, name, color }) => [id, slug, name, color]),
  ]),
);
export const studioText = (values, locale) => {
  const text = values[locale === "de" ? 0 : locale === "es" ? 2 : 1];
  return locale === "en-US"
    ? text
        .replace(/ustomis/g, "ustomiz")
        .replace(/odelled/g, "odeled")
        .replace(/licences/g, "licenses")
    : text;
};
const list = (value) =>
  typeof value === "string" && value.length <= 600 && /^[\w,-]*$/.test(value)
    ? value
    : null;
const cleanText = (value, maximum) =>
  typeof value === "string"
    ? value.replace(/[\u0000-\u001f]/g, " ").slice(0, maximum)
    : "";
const date = (value) =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value
    ? value
    : "";
export function normalizeStudioState(input = {}) {
  const legacy = {
    "history-change": "history-original",
    "history-wide":"history-original", "history-rail":"history-original", "party-news":"party-original", "party-rail":"party-original", "approval-news":"approval-original", "approval-rail":"approval-original", "approval-panels":"approval-aligned", "approval-briefing":"approval-original", "approval-focus":"approval-aligned", "majority-distance":"majority-original", "majority-duel":"majority-cards", "majority-strip":"majority-original",
    "party-wide": "party-original",
    "party-square": "party-focus",
  };
  if (legacy[input.template])
    input = { ...input, template: legacy[input.template] };
  const country = ["de", "uk", "es"].includes(input.country)
    ? input.country
    : input.region === "uk-westminster"
      ? "uk"
      : input.region === "spain-congress"
        ? "es"
        : "de";
  const locale = ["de", "en-GB", "en-US", "es"].includes(input.lang)
    ? input.lang
    : "de";
  const requested = STUDIO_TEMPLATES.find(
    (template) =>
      template.id === input.template &&
      (!template.country || template.country === country),
  );
  const template =
    requested ??
    STUDIO_TEMPLATES.find(
      (item) =>
        item.profile === input.profile &&
        (!item.country || item.country === country),
    ) ??
    STUDIO_TEMPLATES[0];
  let range = [
    "month",
    "three",
    "six",
    "ytd",
    "year",
    "two",
    "five",
    "ten",
    "all",
    "election",
    "custom",
  ].includes(input.range)
    ? input.range
    : "year";
  let start = date(input.start ?? input.from),
    end = date(input.end ?? input.to);
  if (start && end && start > end) [start, end] = [end, start];
  if (range === "custom" && (!start || !end)) range = "year";
  if (
    template.topic === "party" &&
    ["ten", "election", "custom"].includes(range)
  )
    range = "all";
  const region = country==='de' && STUDIO_DATASETS.some(r=>r[0]===input.region) ? input.region : STUDIO_REGIONS[country];
  const defaultParty = country==='de' ? region==='bundestag'?'union':region==='bayern'?'csu':'cdu' : {uk:'labour',es:'pp'}[country];
  return {
    ...normalizeEdit(input),
    country,
    region,
    currentBasis: input.currentBasis === 'average' ? 'average' : 'latest',
    showPollOrigins: ['history','party'].includes(template.topic) && !['panels','change'].includes(template.design) && (input.showPollOrigins === true || input.showPollOrigins === 'true'),
    lang: locale,
    template: template.id,
    theme: input.theme === "dark" ? "dark" : "light",
    edges: input.edges === "rounded" ? "rounded" : "sharp",
    metric: input.metric === "government" ? "government" : "leader",
    approvalTerms: input.approvalTerms == null ? null : String(input.approvalTerms).split(",").filter(id=>/^term-\d{4}-\d{2}-\d{2}$/.test(id)).slice(0,20).join(","),
    answer: ["positive", "negative", "net"].includes(input.answer)
      ? input.answer
      : "positive",
    coalition: list(input.coalition),
    mapMode: ["leader", "party", "growth"].includes(input.mapMode)
      ? input.mapMode
      : "leader",
    mapParty: ["union", "2", "3", "4", "5", "7", "8", "23"].includes(
      input.mapParty,
    )
      ? input.mapParty
      : "union",
    headline: cleanText(input.headline, 100),
    range,
    mode: ["trend", "linear", "polls", "both"].includes(input.mode)
      ? input.mode
      : "trend",
    parties: list(input.parties),
    pollsters: list(input.pollsters),
    events: list(input.events),
    party: (input.party!=='union'||region==='bundestag') && STUDIO_PARTIES[country].some((party) => party[1] === input.party)
      ? input.party
      : defaultParty,
    start,
    end,
  };
}
export function studioEmbedParams(input, { source = false } = {}) {
  const state = normalizeStudioState(input);
  const template = STUDIO_TEMPLATES.find((item) => item.id === state.template);
  const params = new URLSearchParams({
    region: state.region,
    lang: state.lang,
    theme: source ? "light" : state.theme,
    embed: "1",
    share: "1",
    range: state.range,
    mode: state.mode,
  });
  if (template.widget) params.set("widget", template.widget);
  if(source && state.currentBasis==='average')params.set('studioAverage','1');
  if (template.art === "columns") params.set("layout", "columns");
  for (const key of ["parties", "pollsters", "events"])
    if (state[key] !== null) params.set(key, state[key]);
  if (template.topic === "party") {
    params.set("party", state.party);
    params.set(
      "period",
      state.range === "ten" ||
        state.range === "election" ||
        state.range === "custom"
        ? "all"
        : state.range,
    );
  }
  if (state.start) params.set("from", state.start);
  if (state.end) params.set("to", state.end);
  if (!source && state.headline) params.set("headline", state.headline);
  return params;
}
export function studioHref({
  sourceUrl,
  profile,
  locale = "de",
  returnTo,
  context = {},
}) {
  const source = new URL(sourceUrl ?? "/", "https://pollframe.com");
  const input = {
    ...routeParamsForPath(source.pathname),
    ...Object.fromEntries(source.searchParams),
    ...context,
    lang: locale,
    profile,
  };
  input.start ??= input.from;
  input.end ??= input.to;
  const params = new URLSearchParams({ view: "studio" });
  for (const [key, value] of Object.entries(normalizeStudioState(input)))
    if (
      value !== null &&
      (value !== "" || ["events", "parties", "pollsters"].includes(key))
    )
      params.set(key, value);
  params.set("back", safeStudioBack(returnTo));
  return `/?${params}`;
}
export function safeStudioBack(value) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    value.length < 2400 &&
    !/[\u0000-\u001f]/.test(value) &&
    !/[?&]view=studio(?:&|$)/.test(value)
    ? value
    : "/";
}
export function studioEmbedCode(src, title, height) {
  const escape = (value) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  return `<iframe src="${escape(src)}" title="${escape(title)}" width="100%" height="${height}" loading="lazy" style="border:0;display:block;width:100%;max-width:100%" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>`;
}
