import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import { usePwaLifecycle } from "./pwa.js";
import {
  SPAIN_EVENT_CATEGORIES,
  SPAIN_PARTY_DEFINITIONS,
  SPAIN_POLITICAL_EVENTS,
  SpainCountryOverview,
  SpainIssuesPage,
  SpainMiniMap,
  SpainPollingInsights,
} from "./spain.jsx";
import "./styles.css";

const DAY = 86_400_000;
const CURRENT_TERM_START = "2025-02-23";
const ARCHIVE_START = "2017-01-01";
const EMBED_PATH = "/embed.html";
const DATA_SOURCE_URL = "https://dawum.de/API/";
const DATA_LICENSE_URL = "https://opendatacommons.org/licenses/odbl/1-0/";
const MAP_SOURCE_URL = "https://github.com/VictorCazanave/svg-maps/tree/master/packages/germany";
const MAP_ORIGINAL_URL = "https://mapsvg.com/maps/germany";
const MAP_LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
const ELECTION_SOURCE_URL = "https://www.bundeswahlleiterin.de/bundestagswahlen.html";
const CONTACT_EMAIL = "opinionpoll.redaktion@proton.me";
const SITE_ORIGIN = "https://de.pollframe.workers.dev";
const SOCIAL_IMAGE_URL = `${SITE_ORIGIN}/pollframe-social.png`;
const IS_EMBED_ENTRY = window.location.pathname === EMBED_PATH;
const LOCALE_META = {
  de: { language: "de", direction: "ltr", number: "de-DE", openGraph: "de_DE" },
  "en-GB": { language: "en", direction: "ltr", number: "en-GB", openGraph: "en_GB" },
  "en-US": { language: "en", direction: "ltr", number: "en-US", openGraph: "en_US" },
  tr: { language: "tr", direction: "ltr", number: "tr-TR", openGraph: "tr_TR" },
  ru: { language: "ru", direction: "ltr", number: "ru-RU", openGraph: "ru_RU" },
  ar: { language: "ar", direction: "rtl", number: "ar", openGraph: "ar_AR" },
  es: { language: "es", direction: "ltr", number: "es-ES", openGraph: "es_ES" },
};
const SUPPORTED_LOCALES = Object.keys(LOCALE_META);
const DAWUM_REGION_PATHS = {
  bundestag: "Bundestag",
  "baden-wuerttemberg": "Baden-Wuerttemberg",
  bayern: "Bayern",
  berlin: "Berlin",
  brandenburg: "Brandenburg",
  bremen: "Bremen",
  hamburg: "Hamburg",
  hessen: "Hessen",
  "mecklenburg-vorpommern": "Mecklenburg-Vorpommern",
  niedersachsen: "Niedersachsen",
  "nordrhein-westfalen": "Nordrhein-Westfalen",
  "rheinland-pfalz": "Rheinland-Pfalz",
  saarland: "Saarland",
  sachsen: "Sachsen",
  "sachsen-anhalt": "Sachsen-Anhalt",
  "schleswig-holstein": "Schleswig-Holstein",
  thueringen: "Thueringen",
};
const DAWUM_POLLSTER_PATHS = {
  "1": "Infratest_dimap",
  "2": "Forsa",
  "3": "Emnid",
  "5": "INSA",
  "6": "Forschungsgruppe_Wahlen",
  "9": "Allensbach",
  "13": "YouGov",
  "17": "Ipsos",
};
const PARTY_DEFINITIONS = [
  // Plenary order from left to right (as viewed from the Bundestag presidium).
  // BSW's position reflects its last official Bundestag seating; regional
  // parties are placed beside the closest comparable parliamentary group.
  { id: "23", slug: "bsw", name: "BSW", color: "#79566f" },
  { id: "5", slug: "left", name: "Linke", color: "#9b438b" },
  { id: "2", slug: "spd", name: "SPD", color: "#d9485f" },
  { id: "4", slug: "greens", name: "Grüne", color: "#3b9950" },
  { id: "10", slug: "ssw", name: "SSW", color: "#315e9f" },
  { id: "3", slug: "fdp", name: "FDP", color: "#d7aa00" },
  { id: "8", slug: "free-voters", name: "Freie Wähler", color: "#e27b22" },
  { id: "1", slug: "union", name: "CDU/CSU", color: "var(--party-union)" },
  { id: "101", slug: "cdu", name: "CDU", color: "var(--party-union)" },
  { id: "102", slug: "csu", name: "CSU", color: "#4d82b8" },
  { id: "14", slug: "bvb-fw", name: "BVB/FW", color: "#cf6b28" },
  { id: "7", slug: "afd", name: "AfD", color: "#178ec5" },
];

const UK_PARTY_DEFINITIONS = [
  // Broad parliamentary seating order, used only to make repeated legends
  // predictable. It is not an editorial left/right score.
  { id: "202", slug: "green", name: "Green", color: "#4b9b4a" },
  { id: "201", slug: "labour", name: "Labour", color: "#d83b55" },
  { id: "203", slug: "snp", name: "SNP", color: "#d2aa00" },
  { id: "204", slug: "plaid", name: "Plaid Cymru", color: "#2f8f68" },
  { id: "205", slug: "liberal-democrats", name: "Liberal Democrats", color: "#e79a00" },
  { id: "206", slug: "conservative", name: "Conservative", color: "#1875b9" },
  { id: "207", slug: "reform", name: "Reform UK", color: "#16a5a3" },
  { id: "208", slug: "ukip", name: "UKIP", color: "#6f4b8b" },
  { id: "210", slug: "change-uk", name: "Change UK", color: "#282f65" },
  { id: "211", slug: "sdp", name: "SDP", color: "#8a2d35" },
  { id: "209", slug: "other", name: "Other", color: "#7c858f" },
];
const UK_MAP_PARTY_DEFINITIONS = [
  ...UK_PARTY_DEFINITIONS,
  { id: "301", slug: "sinn-fein", name: "Sinn Féin", color: "#3f8c55" },
  { id: "302", slug: "dup", name: "DUP", color: "#b5293b" },
  { id: "303", slug: "alliance", name: "Alliance", color: "#d7b51c" },
  { id: "304", slug: "uup", name: "UUP", color: "#4a87b6" },
  { id: "305", slug: "sdlp", name: "SDLP", color: "#4ca866" },
  { id: "306", slug: "tuv", name: "TUV", color: "#315a83" },
];

const MAP_PARTY_GROUPS = [
  { id: "union", ids: ["1", "101", "102"], name: "CDU/CSU", short: "CDU", color: "var(--party-union)" },
  { id: "7", ids: ["7"], name: "AfD", short: "AfD", color: "#178ec5" },
  { id: "2", ids: ["2"], name: "SPD", short: "SPD", color: "#d9485f" },
  { id: "4", ids: ["4"], name: "Grüne", short: "GRÜNE", color: "#3b9950" },
  { id: "5", ids: ["5"], name: "Linke", short: "LINKE", color: "#9b438b" },
  { id: "3", ids: ["3"], name: "FDP", short: "FDP", color: "#d7aa00" },
  { id: "23", ids: ["23"], name: "BSW", short: "BSW", color: "#79566f" },
  { id: "8", ids: ["8"], name: "Freie Wähler", short: "FW", color: "#e27b22" },
  { id: "10", ids: ["10"], name: "SSW", short: "SSW", color: "#315e9f" },
  { id: "14", ids: ["14"], name: "BVB/FW", short: "BVB/FW", color: "#cf6b28" },
];

const STATE_MAP_LABELS = {
  bw: { x: 218, y: 650 },
  by: { x: 395, y: 625 },
  be: { x: 540, y: 268, calloutX: 493, calloutY: 276 },
  bb: { x: 472, y: 335 },
  hb: { x: 98, y: 206, calloutX: 184, calloutY: 214 },
  hh: { x: 168, y: 145, calloutX: 235, calloutY: 160 },
  he: { x: 255, y: 450 },
  mv: { x: 426, y: 145 },
  ni: { x: 270, y: 275 },
  nw: { x: 142, y: 385 },
  rp: { x: 120, y: 505 },
  sl: { x: 42, y: 590, calloutX: 73, calloutY: 590 },
  sn: { x: 470, y: 465 },
  st: { x: 392, y: 330 },
  sh: { x: 275, y: 82 },
  th: { x: 356, y: 430 },
};

const REGION_META = [
  { slug: "bundestag", mapId: null, type: "federal", name: "Deutschland", parliament: "Bundestag", electionName: "Bundestagswahl", baseSeats: 630 },
  { slug: "uk-westminster", mapId: null, type: "uk-federal", name: "United Kingdom", parliament: "House of Commons", electionName: "UK general election", baseSeats: 650 },
  { slug: "spain-congress", mapId: null, type: "spain-federal", name: "España", parliament: "Congreso de los Diputados", electionName: "Elecciones generales", baseSeats: 350 },
  { slug: "baden-wuerttemberg", mapId: "bw", type: "state", name: "Baden-Württemberg", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 120 },
  { slug: "bayern", mapId: "by", type: "state", name: "Bayern", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 180 },
  { slug: "berlin", mapId: "be", type: "state", name: "Berlin", parliament: "Abgeordnetenhaus", electionName: "Abgeordnetenhauswahl", baseSeats: 130 },
  { slug: "brandenburg", mapId: "bb", type: "state", name: "Brandenburg", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 88 },
  { slug: "bremen", mapId: "hb", type: "state", name: "Bremen", parliament: "Bürgerschaft", electionName: "Bürgerschaftswahl", baseSeats: 87 },
  { slug: "hamburg", mapId: "hh", type: "state", name: "Hamburg", parliament: "Bürgerschaft", electionName: "Bürgerschaftswahl", baseSeats: 121 },
  { slug: "hessen", mapId: "he", type: "state", name: "Hessen", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 110 },
  { slug: "mecklenburg-vorpommern", mapId: "mv", type: "state", name: "Mecklenburg-Vorpommern", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 71 },
  { slug: "niedersachsen", mapId: "ni", type: "state", name: "Niedersachsen", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 135 },
  { slug: "nordrhein-westfalen", mapId: "nw", type: "state", name: "Nordrhein-Westfalen", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 181 },
  { slug: "rheinland-pfalz", mapId: "rp", type: "state", name: "Rheinland-Pfalz", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 101 },
  { slug: "saarland", mapId: "sl", type: "state", name: "Saarland", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 51 },
  { slug: "sachsen", mapId: "sn", type: "state", name: "Sachsen", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 120 },
  { slug: "sachsen-anhalt", mapId: "st", type: "state", name: "Sachsen-Anhalt", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 83 },
  { slug: "schleswig-holstein", mapId: "sh", type: "state", name: "Schleswig-Holstein", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 69, thresholdExemptPartyIds: ["10"] },
  { slug: "thueringen", mapId: "th", type: "state", name: "Thüringen", parliament: "Landtag", electionName: "Landtagswahl", baseSeats: 88 },
];

const STATE_ELECTION_DATES = {
  "baden-wuerttemberg": ["2021-03-14", "2026-03-08"],
  bayern: ["2018-10-14", "2023-10-08"],
  berlin: ["2021-09-26", "2023-02-12", "2026-09-20"],
  brandenburg: ["2019-09-01", "2024-09-22"],
  bremen: ["2019-05-26", "2023-05-14"],
  hamburg: ["2020-02-23", "2025-03-02"],
  hessen: ["2018-10-28", "2023-10-08"],
  "mecklenburg-vorpommern": ["2021-09-26", "2026-09-20"],
  niedersachsen: ["2017-10-15", "2022-10-09"],
  "nordrhein-westfalen": ["2017-05-14", "2022-05-15"],
  "rheinland-pfalz": ["2021-03-14", "2026-03-22"],
  saarland: ["2017-03-26", "2022-03-27"],
  sachsen: ["2019-09-01", "2024-09-01"],
  "sachsen-anhalt": ["2021-06-06", "2026-09-06"],
  "schleswig-holstein": ["2017-05-07", "2022-05-08"],
  thueringen: ["2019-10-27", "2024-09-01"],
};

const ELECTION_RESULTS = {
  "2017-09-24": {
    "1": 32.9, "2": 20.5, "3": 10.7, "4": 8.9, "5": 9.2, "7": 12.6,
  },
  "2021-09-26": {
    "1": 24.1, "2": 25.7, "3": 11.5, "4": 14.8, "5": 4.9, "7": 10.3,
  },
  "2025-02-23": {
    "1": 28.5, "2": 16.4, "3": 4.3, "4": 11.6, "5": 8.8, "7": 20.8, "23": 4.981,
  },
};

function setMetaByName(name, content) {
  let element = document.head.querySelector(`meta[name="${name}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("name", name);
    document.head.append(element);
  }
  element.setAttribute("content", content);
}

function setMetaByProperty(property, content) {
  let element = document.head.querySelector(`meta[property="${property}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute("property", property);
    document.head.append(element);
  }
  element.setAttribute("content", content);
}

function setCanonicalUrl(path) {
  let element = document.head.querySelector('link[rel="canonical"]');
  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", "canonical");
    document.head.append(element);
  }
  element.setAttribute("href", new URL(path, SITE_ORIGIN).href);
}

function updatePageMetadata({
  title,
  description,
  canonicalPath,
  locale,
  indexable = true,
}) {
  const canonicalUrl = new URL(canonicalPath, SITE_ORIGIN).href;
  const openGraphLocale = LOCALE_META[locale]?.openGraph ?? "en_GB";
  document.title = title;
  setMetaByName("description", description);
  setMetaByName("robots", indexable
    ? "index, follow, max-image-preview:large"
    : "noindex, follow, noarchive");
  setMetaByName("twitter:card", "summary_large_image");
  setMetaByName("twitter:title", title);
  setMetaByName("twitter:description", description);
  setMetaByName("twitter:image", SOCIAL_IMAGE_URL);
  setMetaByName("twitter:image:alt", "Pollframe – Wahlumfragen für Bund und Länder");
  setMetaByProperty("og:type", "website");
  setMetaByProperty("og:site_name", "Pollframe");
  setMetaByProperty("og:locale", openGraphLocale);
  setMetaByProperty("og:title", title);
  setMetaByProperty("og:description", description);
  setMetaByProperty("og:url", canonicalUrl);
  setMetaByProperty("og:image", SOCIAL_IMAGE_URL);
  setMetaByProperty("og:image:width", "1200");
  setMetaByProperty("og:image:height", "630");
  setMetaByProperty("og:image:type", "image/png");
  setMetaByProperty("og:image:alt", "Pollframe – Wahlumfragen für Bund und Länder");
  setCanonicalUrl(canonicalPath);
}

const EVENT_CATEGORIES = [
  {
    id: "national",
    de: "Bundestagswahlen",
    en: "National elections",
    deDescription: "Alle Bundestagswahlen im Datenzeitraum",
    enDescription: "Every federal election in the data period",
  },
  {
    id: "germany",
    de: "Deutschland",
    en: "German events",
    deDescription: "Regierung, Parlament, Urteile, Krisen und wichtige Landtagswahlen",
    enDescription: "Government, parliament, rulings, crises and key state elections",
  },
  {
    id: "europe",
    de: "Europa",
    en: "European events",
    deDescription: "Europawahlen und institutionelle Wendepunkte der EU",
    enDescription: "European elections and institutional turning points",
  },
  {
    id: "global",
    de: "Weltgeschehen",
    en: "Global events",
    deDescription: "Internationale Einschnitte mit erheblicher Wirkung auf Deutschland",
    enDescription: "International turning points with substantial effects on Germany",
  },
  {
    id: "controversy",
    de: "Politische Kontroversen",
    en: "Political controversies",
    deDescription: "Optional: formelle Untersuchungen, Behördenbefunde oder Bundestagsdebatten",
    enDescription: "Optional: formal investigated, officially assessed or debated cases",
  },
];

const POLITICAL_EVENTS = [
  {
    id: "election-2017", category: "national", date: "2017-09-24",
    de: "Bundestagswahl 2017", en: "2017 federal election", shortDe: "Bundestagswahl 2017", shortEn: "2017 election",
    detailDe: "Wahl zum 19. Deutschen Bundestag. Das amtliche Zweitstimmenergebnis wird im Diagramm separat als Raute dargestellt.",
    detailEn: "Election of the 19th Bundestag. The official second-vote result is plotted separately as a diamond.",
    source: "https://www.bundeswahlleiterin.de/bundestagswahlen/2017.html",
  },
  {
    id: "merkel-four", category: "germany", date: "2018-03-14",
    de: "Angela Merkel erneut zur Bundeskanzlerin gewählt", en: "Angela Merkel re-elected chancellor", shortDe: "Kanzlerwahl Merkel", shortEn: "Merkel elected",
    detailDe: "Der Bundestag wählte Angela Merkel mit 364 Stimmen zum vierten Mal zur Bundeskanzlerin.",
    detailEn: "The Bundestag elected Angela Merkel chancellor for a fourth term with 364 votes.",
    source: "https://www.bundestag.de/webarchiv/textarchiv/2018/kw11-de-kanzlerwahl-546336",
  },
  {
    id: "eu-election-2019", category: "europe", date: "2019-05-26",
    de: "Europawahl 2019", en: "2019 European election", shortDe: "Europawahl 2019", shortEn: "2019 EU election",
    detailDe: "In Deutschland wurden 96 Abgeordnete für das Europäische Parlament gewählt.",
    detailEn: "Voters in Germany elected 96 members of the European Parliament.",
    source: "https://www.bundeswahlleiterin.de/europawahlen/2019/ergebnisse.html",
  },
  {
    id: "climate-programme-2030", category: "germany", date: "2019-09-20",
    de: "Bundesregierung legt Klimaschutzprogramm 2030 vor", en: "Government presents Climate Action Programme 2030", shortDe: "Klimapaket 2030", shortEn: "Climate programme",
    detailDe: "Das Klimakabinett einigte sich unter anderem auf einen nationalen CO₂-Preis für Verkehr und Wärme sowie Förder- und Entlastungsmaßnahmen.",
    detailEn: "The climate cabinet agreed measures including national carbon pricing for transport and heating alongside incentives and relief.",
    source: "https://www.bundesregierung.de/breg-en/issues/climate-action/klimaschutzprogramm-2030-1674080",
  },
  {
    id: "brexit", category: "europe", date: "2020-01-31",
    de: "Vereinigtes Königreich verlässt die EU", en: "United Kingdom leaves the EU", shortDe: "Brexit", shortEn: "Brexit",
    detailDe: "Mit Inkrafttreten des Austrittsabkommens endete die Mitgliedschaft des Vereinigten Königreichs in der Europäischen Union.",
    detailEn: "The United Kingdom’s EU membership ended when the withdrawal agreement entered into force.",
    source: "https://www.consilium.europa.eu/en/press/press-releases/2020/01/30/brexit-council-adopts-decision-to-conclude-the-withdrawal-agreement/",
  },
  {
    id: "thuringia-controversy", category: "controversy", date: "2020-02-05",
    de: "Kontroverse Ministerpräsidentenwahl in Thüringen", en: "Controversial Thuringia minister-president vote", shortDe: "Thüringen-Kontroverse", shortEn: "Thuringia controversy",
    detailDe: "Thomas Kemmerich wurde auch mit Stimmen der AfD gewählt. Die bundespolitischen Folgen waren Gegenstand einer Aktuellen Stunde im Bundestag.",
    detailEn: "Thomas Kemmerich was elected with votes that included the AfD. The national consequences were debated in the Bundestag.",
    source: "https://www.bundestag.de/webarchiv/textarchiv/2020/kw07-de-aktuelle-stunde-wahl-thueringen-682088",
  },
  {
    id: "pandemic", category: "global", date: "2020-03-11",
    de: "WHO stuft COVID-19 als Pandemie ein", en: "WHO characterises COVID-19 as a pandemic", shortDe: "COVID-19-Pandemie", shortEn: "COVID-19 pandemic",
    detailDe: "Die WHO bezeichnete den weltweiten COVID-19-Ausbruch erstmals als Pandemie.",
    detailEn: "The WHO characterised the worldwide COVID-19 outbreak as a pandemic.",
    source: "https://www.who.int/news-room/speeches/item/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020",
  },
  {
    id: "contact-restrictions", category: "germany", date: "2020-03-22",
    de: "Bund und Länder beschließen Kontaktbeschränkungen", en: "Federal and state governments agree contact restrictions", shortDe: "Kontaktbeschränkungen", shortEn: "Contact restrictions",
    detailDe: "Bund und Länder erweiterten die Maßnahmen zur Begrenzung sozialer Kontakte während der ersten Pandemiewelle.",
    detailEn: "Federal and state governments expanded restrictions on social contact during the first pandemic wave.",
    source: "https://www.bundesregierung.de/breg-de/mediathek/bund-laender-leitlinien-1733222",
  },
  {
    id: "wirecard", category: "controversy", date: "2020-06-25",
    de: "Wirecard beantragt Insolvenz", en: "Wirecard files for insolvency", shortDe: "Wirecard-Insolvenz", shortEn: "Wirecard insolvency",
    detailDe: "Die Insolvenz nach dem Bekanntwerden einer Bilanzlücke führte später zu einem Untersuchungsausschuss über mögliches Versagen staatlicher Aufsicht.",
    detailEn: "The insolvency following disclosure of a balance-sheet gap later led to a parliamentary inquiry into possible regulatory failures.",
    source: "https://www.bundestag.de/webarchiv/Ausschuesse/ausschuesse19/untersuchungsausschuesse/3untersuchungsausschuss",
  },
  {
    id: "vaccination-start", category: "germany", date: "2020-12-27",
    de: "Start der Corona-Impfkampagne", en: "COVID-19 vaccination campaign begins", shortDe: "Impfstart", shortEn: "Vaccination begins",
    detailDe: "Deutschland und die übrigen EU-Staaten begannen koordiniert mit den Impfungen gegen COVID-19; zunächst wurden besonders gefährdete Gruppen priorisiert.",
    detailEn: "Germany and the other EU member states began coordinated COVID-19 vaccinations, initially prioritising particularly vulnerable groups.",
    source: "https://www.bundesregierung.de/breg-en/service/archive/launch-of-the-covid-19-vaccination-campaign-in-germany-1841476",
  },
  {
    id: "mask-affair", category: "controversy", date: "2021-03-08",
    de: "Unionsabgeordnete treten in der Maskenaffäre aus", en: "Union MPs leave over mask affair", shortDe: "Maskenaffäre", shortEn: "Mask affair",
    detailDe: "Georg Nüßlein und Nikolas Löbel verließen ihre Fraktionen beziehungsweise Parteien im Zusammenhang mit Ermittlungen zu Maskengeschäften.",
    detailEn: "Georg Nüßlein and Nikolas Löbel left their parliamentary groups or parties amid investigations connected with mask deals.",
    source: "https://www.bundestag.de/dokumente/textarchiv/2024/kw32-fraktionslose-1014020",
  },
  {
    id: "floods-2021", category: "germany", date: "2021-07-14",
    de: "Beginn der Flutkatastrophe in Westdeutschland", en: "Western Germany floods begin", shortDe: "Flutkatastrophe", shortEn: "Western floods",
    detailDe: "Extremes Hochwasser traf vor allem Rheinland-Pfalz und Nordrhein-Westfalen; mehr als 180 Menschen starben.",
    detailEn: "Extreme flooding struck mainly Rhineland-Palatinate and North Rhine-Westphalia; more than 180 people died.",
    source: "https://www.bundesregierung.de/breg-de/aktuelles/gedenken-flut-ahrtal-2364150",
  },
  {
    id: "election-2021", category: "national", date: "2021-09-26",
    de: "Bundestagswahl 2021", en: "2021 federal election", shortDe: "Bundestagswahl 2021", shortEn: "2021 election",
    detailDe: "Wahl zum 20. Deutschen Bundestag. Das amtliche Ergebnis wird separat als Raute dargestellt.",
    detailEn: "Election of the 20th Bundestag. The official result is plotted separately as a diamond.",
    source: "https://www.bundeswahlleiterin.de/bundestagswahlen/2021/ergebnisse.html",
  },
  {
    id: "scholz", category: "germany", date: "2021-12-08",
    de: "Olaf Scholz zum Bundeskanzler gewählt", en: "Olaf Scholz elected chancellor", shortDe: "Kanzlerwahl Scholz", shortEn: "Scholz elected",
    detailDe: "Der Bundestag wählte Olaf Scholz mit 395 Stimmen zum Bundeskanzler.",
    detailEn: "The Bundestag elected Olaf Scholz chancellor with 395 votes.",
    source: "https://www.bundestag.de/dokumente/textarchiv/2021/kw49-de-kanzlerwahl-870142",
  },
  {
    id: "ukraine", category: "global", date: "2022-02-24",
    de: "Russland beginnt Angriff auf die Ukraine", en: "Russia launches its invasion of Ukraine", shortDe: "Angriff auf Ukraine", shortEn: "Invasion of Ukraine",
    detailDe: "Russische Streitkräfte begannen den großangelegten militärischen Angriff auf die Ukraine.",
    detailEn: "Russian forces began the full-scale military invasion of Ukraine.",
    source: "https://www.auswaertiges-amt.de/de/newsroom/baerbock-ukraine-2513392",
  },
  {
    id: "zeitenwende", category: "germany", date: "2022-02-27",
    de: "Regierungserklärung zur „Zeitenwende“", en: "“Turning point” government statement", shortDe: "„Zeitenwende“-Rede", shortEn: "“Turning point” speech",
    detailDe: "Bundeskanzler Scholz kündigte in einer Sondersitzung eine grundlegende Neuausrichtung der deutschen Sicherheits- und Verteidigungspolitik an.",
    detailEn: "In a special sitting, Chancellor Scholz announced a major shift in German security and defence policy.",
    source: "https://www.bundestag.de/dokumente/textarchiv/2022/kw08-sondersitzung-882198",
  },
  {
    id: "gas-alert", category: "germany", date: "2022-06-23",
    de: "Alarmstufe des Notfallplans Gas ausgerufen", en: "Germany activates gas emergency alert level", shortDe: "Gas-Alarmstufe", shortEn: "Gas alert level",
    detailDe: "Nach reduzierten russischen Lieferungen aktivierte die Bundesregierung die zweite Stufe des Notfallplans Gas und rief zum Energiesparen auf.",
    detailEn: "Following reduced Russian deliveries, the government activated the second stage of its gas emergency plan and called for energy savings.",
    source: "https://www.bundesregierung.de/breg-de/service/newsletter-und-abos/bulletin/rede-des-bundesministers-fuer-wirtschaft-und-klimaschutz-dr-robert-habeck--2055698",
  },
  {
    id: "cum-ex-testimony", category: "controversy", date: "2022-08-19",
    de: "Scholz sagt erneut im Cum-Ex-Ausschuss aus", en: "Scholz testifies again to Cum-Ex inquiry", shortDe: "Cum-Ex-Aussage", shortEn: "Cum-Ex testimony",
    detailDe: "Olaf Scholz sagte als Zeuge erneut im Hamburger Untersuchungsausschuss zur Warburg Bank und möglichen politischen Einflussnahmen aus.",
    detailEn: "Olaf Scholz again testified to Hamburg’s inquiry into the Warburg Bank and possible political influence.",
    source: "https://www.hamburgische-buergerschaft.de/service-/pressemitteilungen/pm-pua-cum-ex-37-879290",
  },
  {
    id: "energy-price-brakes", category: "germany", date: "2022-12-15",
    de: "Bundestag beschließt Strom- und Gaspreisbremsen", en: "Bundestag passes electricity and gas price caps", shortDe: "Energiepreisbremsen", shortEn: "Energy price caps",
    detailDe: "Der Bundestag verabschiedete Preisbremsen für Strom, Gas und Wärme als Reaktion auf die stark gestiegenen Energiekosten.",
    detailEn: "The Bundestag adopted price caps for electricity, gas and heating in response to sharply increased energy costs.",
    source: "https://www.bundestag.de/dokumente/textarchiv/2022/kw50-de-energiepreisbremse-924550",
  },
  {
    id: "nuclear-exit", category: "germany", date: "2023-04-15",
    de: "Letzte deutsche Kernkraftwerke abgeschaltet", en: "Germany’s final nuclear plants shut down", shortDe: "Atomausstieg", shortEn: "Nuclear phase-out",
    detailDe: "Mit dem Ende des Leistungsbetriebs der letzten drei Kernkraftwerke wurde der deutsche Atomausstieg abgeschlossen.",
    detailEn: "Germany completed its nuclear phase-out when the final three nuclear power plants ended commercial operation.",
    source: "https://www.bundesregierung.de/breg-de/schwerpunkte/bezahlbare-und-saubere-energie-1581908",
  },
  {
    id: "heating-law", category: "germany", date: "2023-09-08",
    de: "Bundestag beschließt neues Gebäudeenergiegesetz", en: "Bundestag passes revised Building Energy Act", shortDe: "Gebäudeenergiegesetz", shortEn: "Building Energy Act",
    detailDe: "Nach einer kontroversen öffentlichen und parlamentarischen Debatte beschloss der Bundestag die Novelle des Gebäudeenergiegesetzes.",
    detailEn: "Following a contentious public and parliamentary debate, the Bundestag passed the revised Building Energy Act.",
    source: "https://www.bundestag.de/parlament/plenum/abstimmung/abstimmung?id=868",
  },
  {
    id: "israel-gaza", category: "global", date: "2023-10-07",
    de: "Hamas-Angriff auf Israel und Beginn des Gaza-Krieges", en: "Hamas attack on Israel and start of Gaza war", shortDe: "7. Oktober / Gaza-Krieg", shortEn: "7 October / Gaza war",
    detailDe: "Der Großangriff der Hamas auf Israel und die anschließende israelische Militäroperation markierten eine neue Phase des Konflikts.",
    detailEn: "The large-scale Hamas attack on Israel and the subsequent Israeli military operation marked a new phase of the conflict.",
    source: "https://www.un.org/unispal/document/october-2023-monthly-bulletin/",
  },
  {
    id: "budget-ruling", category: "germany", date: "2023-11-15",
    de: "Bundesverfassungsgericht verwirft Nachtragshaushalt", en: "Constitutional Court voids supplementary budget", shortDe: "Haushaltsurteil", shortEn: "Budget ruling",
    detailDe: "Das Bundesverfassungsgericht erklärte die Übertragung von 60 Milliarden Euro an Kreditermächtigungen in den Klima- und Transformationsfonds für nichtig.",
    detailEn: "The Constitutional Court voided the transfer of €60 billion in borrowing authority to the Climate and Transformation Fund.",
    source: "https://www.bundesverfassungsgericht.de/SharedDocs/Pressemitteilungen/DE/2023/bvg23-101.html",
  },
  {
    id: "potsdam-meeting", category: "controversy", date: "2024-01-10",
    de: "Correctiv-Bericht über das Potsdamer Treffen", en: "Correctiv report on the Potsdam meeting", shortDe: "Potsdam-Kontroverse", shortEn: "Potsdam controversy",
    detailDe: "Die Veröffentlichung löste bundesweite Proteste und eine Bundestagsdebatte aus. Beteiligte und die AfD bestritten Teile der Darstellung.",
    detailEn: "The report prompted nationwide protests and a Bundestag debate. Participants and the AfD disputed parts of the account.",
    source: "https://www.bundestag.de/dokumente/textarchiv/2024/kw03-de-aktuelle-stunde-remigration-986558",
  },
  {
    id: "eu-migration-pact", category: "europe", date: "2024-05-14",
    de: "EU beschließt Asyl- und Migrationspakt", en: "EU adopts migration and asylum pact", shortDe: "EU-Asylreform", shortEn: "EU asylum reform",
    detailDe: "Der Rat der EU nahm zehn Rechtsakte zur Reform des gemeinsamen Asyl- und Migrationssystems an.",
    detailEn: "The Council of the EU adopted ten legislative acts reforming the common migration and asylum system.",
    source: "https://www.consilium.europa.eu/en/press/press-releases/2024/05/14/the-council-adopts-the-eu-s-pact-on-migration-and-asylum/",
  },
  {
    id: "eu-election-2024", category: "europe", date: "2024-06-09",
    de: "Europawahl 2024", en: "2024 European election", shortDe: "Europawahl 2024", shortEn: "2024 EU election",
    detailDe: "In Deutschland wurden die Abgeordneten für die zehnte Wahlperiode des Europäischen Parlaments gewählt.",
    detailEn: "Germany elected its members for the European Parliament’s tenth term.",
    source: "https://www.bundeswahlleiterin.de/europawahlen/2024/ergebnisse.html",
  },
  {
    id: "east-state-elections", category: "germany", date: "2024-09-01",
    de: "Landtagswahlen in Sachsen und Thüringen", en: "State elections in Saxony and Thuringia", shortDe: "Wahlen Sachsen/Thüringen", shortEn: "Saxony/Thuringia votes",
    detailDe: "Zeitgleiche Landtagswahlen in Sachsen und Thüringen mit bundesweiter politischer Aufmerksamkeit.",
    detailEn: "Simultaneous state elections in Saxony and Thuringia attracted nationwide political attention.",
    source: "https://wahlen.thueringen.de/landtagswahlen/lw_pressemitteilungen.asp",
  },
  {
    id: "border-controls", category: "germany", date: "2024-09-16",
    de: "Kontrollen an allen deutschen Landgrenzen", en: "Controls extended to all German land borders", shortDe: "Grenzkontrollen", shortEn: "Border controls",
    detailDe: "Vorübergehende Binnengrenzkontrollen wurden auf alle deutschen Landgrenzen ausgeweitet.",
    detailEn: "Temporary internal border controls were extended to all German land borders.",
    source: "https://www.bundesregierung.de/breg-de/aktuelles/migration-ordnen-und-steuern-2231258",
  },
  {
    id: "brandenburg-election", category: "germany", date: "2024-09-22",
    de: "Landtagswahl in Brandenburg", en: "Brandenburg state election", shortDe: "Wahl Brandenburg", shortEn: "Brandenburg vote",
    detailDe: "Wahl zum achten Landtag Brandenburg; SPD, AfD, BSW und CDU zogen in den Landtag ein.",
    detailEn: "Election of Brandenburg’s eighth Landtag; the SPD, AfD, BSW and CDU entered parliament.",
    source: "https://wahlen.brandenburg.de/wahlen/de/landtagswahl/aktuelle-informationen/",
  },
  {
    id: "us-election-2024", category: "global", date: "2024-11-05",
    de: "Donald Trump gewinnt die US-Präsidentschaftswahl", en: "Donald Trump wins US presidential election", shortDe: "US-Wahl 2024", shortEn: "2024 US election",
    detailDe: "Donald Trump gewann die Präsidentschaftswahl und kehrte im Januar 2025 als 47. Präsident ins Weiße Haus zurück.",
    detailEn: "Donald Trump won the presidential election and returned to the White House as the 47th president in January 2025.",
    source: "https://www.archives.gov/electoral-college/2024",
  },
  {
    id: "coalition-end", category: "germany", date: "2024-11-06",
    de: "Bruch der Ampelkoalition", en: "Traffic-light coalition breaks down", shortDe: "Ampelkoalition endet", shortEn: "Coalition breaks down",
    detailDe: "Bundeskanzler Scholz bat um die Entlassung von Finanzminister Lindner; die FDP schied aus der Bundesregierung aus.",
    detailEn: "Chancellor Scholz requested Finance Minister Lindner’s dismissal; the FDP left the federal government.",
    source: "https://www.bundesregierung.de/breg-de/service/newsletter-und-abos/bulletin/rede-von-bundeskanzler-olaf-scholz-2319070",
  },
  {
    id: "confidence-vote", category: "germany", date: "2024-12-16",
    de: "Bundestag verweigert Scholz das Vertrauen", en: "Bundestag denies Scholz confidence", shortDe: "Vertrauensfrage", shortEn: "Confidence vote",
    detailDe: "Olaf Scholz erhielt nicht die erforderliche Kanzlermehrheit; damit wurde der Weg zu einer vorgezogenen Bundestagswahl eröffnet.",
    detailEn: "Olaf Scholz failed to secure the required majority, opening the constitutional route to an early federal election.",
    source: "https://www.bundestag.de/dokumente/textarchiv/2024/kw51-de-vertrauensfrage-1033624",
  },
  {
    id: "election-2025", category: "national", date: "2025-02-23",
    de: "Bundestagswahl 2025", en: "2025 federal election", shortDe: "Bundestagswahl 2025", shortEn: "2025 election",
    detailDe: "Vorgezogene Wahl zum 21. Deutschen Bundestag. Das amtliche Ergebnis wird separat als Raute dargestellt.",
    detailEn: "Early election of the 21st Bundestag. The official result is plotted separately as a diamond.",
    source: "https://www.bundeswahlleiterin.de/bundestagswahlen/2025/ergebnisse.html",
  },
  {
    id: "debt-reform", category: "germany", date: "2025-03-18",
    de: "Bundestag beschließt Reform der Schuldenbremse", en: "Bundestag approves debt-brake reform", shortDe: "Reform Schuldenbremse", shortEn: "Debt-brake reform",
    detailDe: "Der Bundestag beschloss mit Zweidrittelmehrheit Verfassungsänderungen für Verteidigungsausgaben und ein Infrastruktur-Sondervermögen.",
    detailEn: "A two-thirds Bundestag majority approved constitutional changes for defence spending and an infrastructure fund.",
    source: "https://www.bundestag.de/dokumente/textarchiv/2025/kw11-de-sondersitzung-1056228",
  },
  {
    id: "coalition-agreement-2025", category: "germany", date: "2025-04-09",
    de: "Union und SPD stellen Koalitionsvertrag vor", en: "CDU/CSU and SPD present coalition agreement", shortDe: "Koalitionsvertrag", shortEn: "Coalition agreement",
    detailDe: "CDU, CSU und SPD präsentierten den Koalitionsvertrag „Verantwortung für Deutschland“; unterzeichnet wurde er am 5. Mai.",
    detailEn: "CDU, CSU and SPD presented their coalition agreement, “Responsibility for Germany”; it was signed on 5 May.",
    source: "https://www.bundesregierung.de/breg-de/aktuelles/koalitionsvertrag-2025-2340970",
  },
  {
    id: "merz", category: "germany", date: "2025-05-06",
    de: "Friedrich Merz zum Bundeskanzler gewählt", en: "Friedrich Merz elected chancellor", shortDe: "Kanzlerwahl Merz", shortEn: "Merz elected",
    detailDe: "Friedrich Merz wurde im zweiten Wahlgang mit 325 Stimmen zum Bundeskanzler gewählt.",
    detailEn: "Friedrich Merz was elected chancellor in the second ballot with 325 votes.",
    source: "https://www.bundestag.de/dokumente/textarchiv/2025/kw19-de-kanzlerwahl-1062470",
  },
  {
    id: "bw-election", category: "germany", date: "2026-03-08",
    de: "Landtagswahl in Baden-Württemberg", en: "Baden-Württemberg state election", shortDe: "Wahl Baden-Württemberg", shortEn: "Baden-Württemberg vote",
    detailDe: "Wahl zum 18. Landtag von Baden-Württemberg.",
    detailEn: "Election of Baden-Württemberg’s 18th Landtag.",
    source: "https://www.statistik-bw.de/presse/pressemitteilungen/pressemitteilung/vorlaeufige-ergebnisse-der-landtagswahl-2026-in-baden-wuerttemberg/",
  },
  {
    id: "hormuz-oil-crisis", category: "global", date: "2026-03-13",
    de: "Ölpreiskrise nach Sperrung der Straße von Hormus", en: "Oil-price crisis after Strait of Hormuz closure", shortDe: "Ölpreiskrise / Hormus", shortEn: "Hormuz oil-price crisis",
    detailDe: "Die faktische Sperrung der wichtigen Schifffahrtsroute ließ die Energie- und Kraftstoffpreise steigen. Die Bundesregierung kündigte unter anderem die Freigabe eines Teils der deutschen Ölreserve an.",
    detailEn: "The effective closure of the major shipping route pushed up energy and fuel prices. Germany announced measures including the release of part of its oil reserve.",
    source: "https://www.bundesregierung.de/breg-de/service/newsletter-und-abos/bundesregierung-aktuell/ausgabe-10-2026-maerz-13-2410162?view=renderNewsletterHtml",
  },
  {
    id: "rp-election", category: "germany", date: "2026-03-22",
    de: "Landtagswahl in Rheinland-Pfalz", en: "Rhineland-Palatinate state election", shortDe: "Wahl Rheinland-Pfalz", shortEn: "Rhineland-Palatinate vote",
    detailDe: "Wahl zum 19. Landtag von Rheinland-Pfalz.",
    detailEn: "Election of Rhineland-Palatinate’s 19th Landtag.",
    source: "https://www.wahlen.rlp.de/landtagswahl/bekanntmachungen/bekanntmachung-endergebnis-lw-2026",
  },
];

const UK_EVENT_CATEGORIES = [
  { id: "uk-election", de: "Unterhauswahlen", en: "General elections", deDescription: "Wahlen zum britischen Unterhaus", enDescription: "Elections to the House of Commons" },
  { id: "uk-politics", de: "Britische Politik", en: "UK political events", deDescription: "Regierungswechsel, Referenden und zentrale Entscheidungen", enDescription: "Changes of government, referendums and major decisions" },
  { id: "uk-economy", de: "Wirtschaft und Krisen", en: "Economy and crises", deDescription: "Ereignisse mit breiter wirtschaftlicher oder gesellschaftlicher Wirkung", enDescription: "Events with broad economic or social effects" },
  { id: "global", de: "Weltgeschehen", en: "Global events", deDescription: "Internationale Einschnitte mit Wirkung auf das Vereinigte Königreich", enDescription: "International turning points affecting the United Kingdom" },
];

const UK_ELECTION_DATES = [
  "1945-07-05", "1950-02-23", "1951-10-25", "1955-05-26", "1959-10-08", "1964-10-15",
  "1966-03-31", "1970-06-18", "1974-02-28", "1974-10-10", "1979-05-03", "1983-06-09",
  "1987-06-11", "1992-04-09", "1997-05-01", "2001-06-07", "2005-05-05", "2010-05-06",
  "2015-05-07", "2017-06-08", "2019-12-12", "2024-07-04",
];
const UK_POLITICAL_EVENTS = [
  ...UK_ELECTION_DATES.map((date) => {
    const year = Number(date.slice(0, 4));
    return {
      id: `uk-election-${date}`, category: "uk-election", date,
      de: `Britische Unterhauswahl ${year}`, en: `${year} UK general election`,
      shortDe: `Unterhauswahl ${year}`, shortEn: `${year} election`,
      detailDe: "Wahl zum britischen Unterhaus. Das Ergebnis wird im Diagramm zusätzlich als Raute dargestellt.",
      detailEn: "Election to the House of Commons. The result is also shown as a diamond in the chart.",
      source: "https://commonslibrary.parliament.uk/research-briefings/sn04512/",
    };
  }),
  { id: "uk-tehran", category: "global", date: "1943-11-28", priority: 1, de: "Teheran-Konferenz", en: "Tehran Conference", shortDe: "Teheran-Konferenz", shortEn: "Tehran Conference", detailDe: "Churchill, Roosevelt und Stalin trafen sich erstmals gemeinsam und verständigten sich auf zentrale Schritte der alliierten Kriegsstrategie.", detailEn: "Churchill, Roosevelt and Stalin met together for the first time and agreed central elements of Allied war strategy.", source: "https://www.iwm.org.uk/history/the-big-three-and-the-tehran-conference" },
  { id: "uk-d-day", category: "global", date: "1944-06-06", priority: 0, de: "Landung der Alliierten in der Normandie", en: "Allied landings in Normandy", shortDe: "D-Day", shortEn: "D-Day", detailDe: "Britische, amerikanische und alliierte Streitkräfte landeten in der Normandie und eröffneten eine neue Front in Westeuropa.", detailEn: "British, American and other Allied forces landed in Normandy, opening a new front in western Europe.", source: "https://www.iwm.org.uk/history/how-d-day-was-fought-from-the-sea" },
  { id: "uk-ve-day", category: "global", date: "1945-05-08", priority: 0, de: "Ende des Krieges in Europa", en: "War in Europe ends", shortDe: "VE Day", shortEn: "VE Day", detailDe: "Mit dem Victory in Europe Day endete der Zweite Weltkrieg in Europa; wenige Wochen später fand die Unterhauswahl statt.", detailEn: "Victory in Europe Day marked the end of the Second World War in Europe; a general election followed weeks later.", source: "https://lordslibrary.parliament.uk/end-of-the-second-world-war-80th-anniversary/" },
  { id: "uk-nhs", category: "uk-politics", date: "1948-07-05", priority: 0, de: "Gründung des National Health Service", en: "National Health Service begins", shortDe: "Gründung des NHS", shortEn: "NHS founded", detailDe: "Der National Health Service nahm seine Arbeit auf und führte eine weitgehend steuerfinanzierte Gesundheitsversorgung ein, die am Ort der Behandlung kostenlos war.", detailEn: "The National Health Service began operating, introducing healthcare largely funded through taxation and free at the point of use.", source: "https://lordslibrary.parliament.uk/research-briefings/lln-2018-0073/" },
  { id: "uk-sterling-devaluation", category: "uk-economy", date: "1967-11-18", priority: 1, de: "Abwertung des Pfund Sterling", en: "Sterling devalued", shortDe: "Pfund-Abwertung", shortEn: "Sterling devaluation", detailDe: "Die Regierung senkte den offiziellen Wechselkurs des Pfunds von 2,80 auf 2,40 US-Dollar.", detailEn: "The government reduced sterling's official exchange rate from 2.80 to 2.40 US dollars.", source: "https://www.bankofengland.co.uk/-/media/boe/files/quarterly-bulletin/1967/commentary-qb-1967-q4.pdf" },
  { id: "uk-joins-eec", category: "uk-politics", date: "1973-01-01", priority: 0, de: "Beitritt zur Europäischen Wirtschaftsgemeinschaft", en: "United Kingdom joins the EEC", shortDe: "Beitritt zur EWG", shortEn: "UK joins EEC", detailDe: "Das Vereinigte Königreich trat gemeinsam mit Irland und Dänemark der Europäischen Wirtschaftsgemeinschaft bei.", detailEn: "The United Kingdom joined the European Economic Community alongside Ireland and Denmark.", source: "https://www.parliament.uk/about/living-heritage/evolutionofparliament/legislativescrutiny/parliament-and-europe/overview/britain-and-eec-to-single-european-act/" },
  { id: "uk-energy-crisis", category: "uk-economy", date: "1973-12-13", priority: 1, de: "Energiekrise und Drei-Tage-Woche", en: "Energy crisis and Three-Day Week", shortDe: "Energiekrise", shortEn: "Energy crisis", detailDe: "Ölknappheit und der Arbeitskampf im Kohlebergbau führten zu starken Energiebeschränkungen; Anfang 1974 galt für viele Betriebe die Drei-Tage-Woche.", detailEn: "Oil shortages and industrial action in coal mining led to severe energy restrictions; many businesses moved to a Three-Day Week in early 1974.", source: "https://api.parliament.uk/historic-hansard/commons/1973/dec/13/energy-supplies" },
  { id: "uk-devolution-referendums", category: "uk-politics", date: "1997-09-11", priority: 1, de: "Referenden über Devolution", en: "Devolution referendums", shortDe: "Devolution-Referenden", shortEn: "Devolution votes", detailDe: "Schottland stimmte deutlich und Wales eine Woche später knapp für eigene, dezentralisierte Institutionen.", detailEn: "Scotland voted clearly, and Wales narrowly one week later, for new devolved institutions.", source: "https://publications.parliament.uk/pa/ld201516/ldselect/ldconst/149/14913.htm" },
  { id: "uk-suez", category: "global", date: "1956-10-29", de: "Beginn der Suezkrise", en: "Suez Crisis begins", shortDe: "Suezkrise", shortEn: "Suez Crisis", detailDe: "Israel, Großbritannien und Frankreich begannen ihre militärischen Operationen in der Suezkrise.", detailEn: "Israel, Britain and France began their military operations during the Suez Crisis.", source: "https://history.blog.gov.uk/2017/03/14/the-suez-crisis/" },
  { id: "uk-falklands", category: "global", date: "1982-04-02", de: "Beginn des Falklandkriegs", en: "Falklands War begins", shortDe: "Falklandkrieg", shortEn: "Falklands War", detailDe: "Argentinische Truppen besetzten die Falklandinseln; der Krieg endete im Juni 1982.", detailEn: "Argentine forces occupied the Falkland Islands; the war ended in June 1982.", source: "https://www.iwm.org.uk/history/a-short-history-of-the-falklands-war" },
  { id: "uk-black-wednesday", category: "uk-economy", date: "1992-09-16", de: "Schwarzer Mittwoch", en: "Black Wednesday", shortDe: "Schwarzer Mittwoch", shortEn: "Black Wednesday", detailDe: "Das Pfund verließ nach starken Marktinterventionen den Europäischen Wechselkursmechanismus.", detailEn: "Sterling left the European Exchange Rate Mechanism after extensive market intervention.", source: "https://www.bankofengland.co.uk/quarterly-bulletin/1993/q2/the-uk-crisis-of-september-1992" },
  { id: "uk-iraq", category: "global", date: "2003-03-20", de: "Beginn des Irakkriegs", en: "Iraq War begins", shortDe: "Irakkrieg", shortEn: "Iraq War", detailDe: "Die US-geführte Invasion des Irak begann unter Beteiligung britischer Streitkräfte.", detailEn: "The US-led invasion of Iraq began with British forces participating.", source: "https://www.iwm.org.uk/history/the-iraq-war" },
  { id: "uk-financial-crisis", category: "uk-economy", date: "2008-09-15", de: "Globale Finanzkrise", en: "Global financial crisis", shortDe: "Finanzkrise", shortEn: "Financial crisis", detailDe: "Der Zusammenbruch von Lehman Brothers markierte eine Eskalation der globalen Finanzkrise.", detailEn: "The collapse of Lehman Brothers marked an escalation of the global financial crisis.", source: "https://www.bankofengland.co.uk/quarterly-bulletin/2018/q4/the-2008-financial-crisis-ten-years-on" },
  { id: "uk-coalition", category: "uk-politics", date: "2010-05-11", de: "Konservative und Liberaldemokraten bilden Koalition", en: "Conservative–Liberal Democrat coalition formed", shortDe: "Koalition 2010", shortEn: "2010 coalition", detailDe: "David Cameron wurde Premierminister einer Koalition aus Konservativen und Liberaldemokraten.", detailEn: "David Cameron became prime minister of a Conservative–Liberal Democrat coalition.", source: "https://www.gov.uk/government/history/past-prime-ministers/david-cameron" },
  { id: "uk-scotland-referendum", category: "uk-politics", date: "2014-09-18", de: "Schottisches Unabhängigkeitsreferendum", en: "Scottish independence referendum", shortDe: "Schottland-Referendum", shortEn: "Scottish referendum", detailDe: "Eine Mehrheit stimmte gegen die Unabhängigkeit Schottlands.", detailEn: "A majority voted against Scottish independence.", source: "https://www.electoralcommission.org.uk/research-reports-and-data/our-reports-and-data-past-elections-and-referendums/scottish-independence-referendum-report" },
  { id: "uk-brexit-referendum", category: "uk-politics", date: "2016-06-23", de: "Brexit-Referendum", en: "EU referendum", shortDe: "Brexit-Referendum", shortEn: "EU referendum", detailDe: "51,9 Prozent stimmten für den Austritt des Vereinigten Königreichs aus der Europäischen Union.", detailEn: "51.9% voted for the United Kingdom to leave the European Union.", source: "https://www.electoralcommission.org.uk/research-reports-and-data/our-reports-and-data-past-elections-and-referendums/eu-referendum" },
  { id: "uk-leaves-eu", category: "uk-politics", date: "2020-01-31", de: "Vereinigtes Königreich verlässt die EU", en: "United Kingdom leaves the EU", shortDe: "EU-Austritt", shortEn: "UK leaves EU", detailDe: "Die Mitgliedschaft des Vereinigten Königreichs in der Europäischen Union endete.", detailEn: "The United Kingdom's membership of the European Union ended.", source: "https://www.gov.uk/government/news/uk-leaves-the-eu" },
  { id: "uk-lockdown", category: "uk-economy", date: "2020-03-23", de: "Erster landesweiter Covid-Lockdown", en: "First nationwide Covid lockdown", shortDe: "Covid-Lockdown", shortEn: "Covid lockdown", detailDe: "Die Regierung kündigte weitreichende Beschränkungen des öffentlichen Lebens an.", detailEn: "The government announced wide-ranging restrictions on public life.", source: "https://www.instituteforgovernment.org.uk/sites/default/files/timeline-lockdown-web.pdf" },
  { id: "uk-ukraine", category: "global", date: "2022-02-24", de: "Russland greift die Ukraine an", en: "Russia invades Ukraine", shortDe: "Angriff auf Ukraine", shortEn: "Invasion of Ukraine", detailDe: "Russland begann seinen großangelegten militärischen Angriff auf die Ukraine.", detailEn: "Russia began its full-scale military invasion of Ukraine.", source: "https://commonslibrary.parliament.uk/research-briefings/cbp-9476/" },
  { id: "uk-mini-budget", category: "uk-economy", date: "2022-09-23", de: "Mini-Budget der Regierung Truss", en: "Truss government mini-budget", shortDe: "Mini-Budget", shortEn: "Mini-budget", detailDe: "Das Wachstumspaket führte zu starken Marktreaktionen und wurde anschließend in wesentlichen Teilen zurückgenommen.", detailEn: "The growth plan prompted sharp market reactions and was subsequently reversed in large part.", source: "https://commonslibrary.parliament.uk/research-briefings/cbp-9649/" },
  { id: "uk-israel-gaza", category: "global", date: "2023-10-07", de: "Hamas-Angriff auf Israel und Gaza-Krieg", en: "Hamas attack on Israel and Gaza war", shortDe: "7. Oktober / Gaza", shortEn: "7 October / Gaza", detailDe: "Der Großangriff der Hamas auf Israel und die folgende israelische Militäroperation markierten eine neue Phase des Konflikts.", detailEn: "The large-scale Hamas attack on Israel and subsequent Israeli military operation marked a new phase of the conflict.", source: "https://commonslibrary.parliament.uk/research-briefings/cbp-9874/" },
];

const STATE_EVENT_CATEGORY = {
  id: "state-election",
  de: "Landeswahlen",
  en: "State elections",
  deDescription: "Wahlen zum jeweiligen Landesparlament",
  enDescription: "Elections to the respective state parliament",
};

function regionEvents(region) {
  if (region.type === "uk-federal") return UK_POLITICAL_EVENTS;
  if (region.type === "spain-federal") return SPAIN_POLITICAL_EVENTS;
  if (region.type === "federal") return POLITICAL_EVENTS;
  const elections = (STATE_ELECTION_DATES[region.slug] ?? []).map((date) => ({
    id: `${region.slug}-${date}`,
    category: "state-election",
    date,
    de: `${region.electionName} ${new Date(parseDate(date)).getUTCFullYear()}`,
    en: `${region.name} election ${new Date(parseDate(date)).getUTCFullYear()}`,
    shortDe: `${region.electionName} ${new Date(parseDate(date)).getUTCFullYear()}`,
    shortEn: `${region.name} vote`,
    detailDe: `Wahl zum ${region.parliament} in ${region.name}.`,
    detailEn: `Election to the ${region.parliament} in ${region.name}.`,
    source: "https://www.bundeswahlleiterin.de/service/landtagswahlen.html",
  }));
  return [
    ...elections,
    ...POLITICAL_EVENTS.filter((event) => event.category !== "controversy"),
  ];
}

function regionEventCategories(region) {
  if (region.type === "uk-federal") return UK_EVENT_CATEGORIES;
  if (region.type === "spain-federal") return SPAIN_EVENT_CATEGORIES;
  if (region.type === "federal") return EVENT_CATEGORIES;
  return [
    STATE_EVENT_CATEGORY,
    ...EVENT_CATEGORIES.filter((category) => (
      ["national", "germany", "europe", "global"].includes(category.id)
    )),
  ];
}

function eventText(event, locale, kind = "label") {
  if (locale === "es") return kind === "short" ? event.shortEs ?? event.es ?? event.shortEn : kind === "detail" ? event.detailEs ?? event.detailEn : event.es ?? event.en;
  if (locale === "de") return kind === "short" ? event.shortDe : kind === "detail" ? event.detailDe : event.de;
  return kind === "short" ? event.shortEn : kind === "detail" ? event.detailEn : event.en;
}

function eventCategoryText(category, locale, description = false) {
  if (locale === "es") return description ? category.esDescription ?? category.enDescription : category.es ?? category.en;
  if (locale === "de") return description ? category.deDescription : category.de;
  return description ? category.enDescription : category.en;
}

const EVENT_LABEL_PRIORITY = new Map([
  ["election-2017", 0],
  ["eu-election-2019", 0],
  ["pandemic", 0],
  ["election-2021", 0],
  ["ukraine", 0],
  ["israel-gaza", 0],
  ["budget-ruling", 1],
  ["eu-election-2024", 1],
  ["eu-seat-composition-2024", 1],
  ["epp-lead-candidate-2024", 1],
  ["coalition-end", 0],
  ["election-2025", 0],
  ["hormuz-oil-crisis", 0],
  ["merz", 1],
]);

const copy = {
  de: {
    settings: "Einstellungen",
    dataInfo: "Informationen zu Daten und Methodik",
    overview: "Bundestag · Sonntagsfrage",
    title: "Umfragen zur Bundestagswahl",
    intro: "Aktuelle Werte und der langfristige Verlauf – vergleichbar, nachvollziehbar und ohne politische Bewertung.",
    current: "Aktueller Durchschnitt",
    currentNote: "Neueste Umfrage je ausgewähltem Institut",
    compared: "Veränderung gegenüber vor 7 Tagen",
    chartTitle: "Entwicklung der Wahlabsicht",
    chartSubtitle: "Jedes ausgewählte Institut wird gleich gewichtet. Linien verbinden die berechneten Werte; die Punktansicht zeigt Veröffentlichungsdaten.",
    chartSwipe: "↔ Zum Erkunden horizontal wischen",
    customize: "Diagramm anpassen",
    share: "Teilen & einbetten",
    exportPng: "PNG exportieren",
    exportPreparing: "PNG wird erstellt …",
    exportReady: "PNG gespeichert",
    exportError: "Export fehlgeschlagen",
    display: "Darstellung",
    trend: "Geglätteter Trend",
    linear: "Verbundene Durchschnittswerte",
    polls: "Durchschnittspunkte",
    both: "Trend + Durchschnittspunkte",
    timeRange: "Zeitraum",
    oneMonthLong: "1 Monat",
    threeMonths: "3 Monate",
    sixMonths: "6 Monate",
    yearToDate: "Seit Jahresbeginn",
    year: "1 Jahr",
    twoYears: "2 Jahre",
    sinceElection: "Seit der Wahl 2025",
    fiveYearsLong: "5 Jahre",
    fullArchive: "Gesamtes Archiv · seit 2017",
    events: "Ereignisse",
    eventCount: (count) => count === 0 ? "Ausgeblendet" : count === 1 ? "1 Kategorie" : `${count} Kategorien`,
    eventsShown: "Eingeblendete Ereignisse",
    eventsNote: "Markierung berühren oder fokussieren für Kontext. Ereignisse belegen keinen ursächlichen Zusammenhang mit Umfrageänderungen.",
    eventEntries: (count) => `${count} ${count === 1 ? "Eintrag" : "Einträge"} im gewählten Zeitraum`,
    lineLegend: "Linien",
    axisRange: (min, max) => `Skala ${min}–${max} %${min > 0 ? " · Null ausgeblendet" : ""}`,
    axisStart: (min) => `Achse beginnt bei ${min} %`,
    pollsters: "Institute",
    pollsterCount: (count, total) => count === total ? `Alle ${total}` : `${count} ausgewählt`,
    parties: "Parteien",
    sourcePrefix: "Daten von",
    dataUpdated: "Datenstand",
    raw: "Daten herunterladen (JSON)",
    csv: "Als CSV herunterladen",
    pollTable: "Veröffentlichte Einzelumfragen",
    pollTableIntro: "Neueste Umfragen der ausgewählten Institute. Die Werte sind Veröffentlichungen der Institute, nicht der Pollframe-Durchschnitt.",
    pollTableCount: (shown, total) => `${shown} von ${total} Umfragen angezeigt`,
    pollDate: "Veröffentlicht",
    fieldwork: "Befragung",
    sample: "Stichprobe",
    method: "Methode",
    openSource: "Bei DAWUM öffnen",
    showMorePolls: "Weitere Umfragen anzeigen",
    methodology: "Methodik",
    pollRecords: "veröffentlichte Umfragen",
    archiveCoverage: "Archivzeitraum",
    dataStandard: "Offene Daten · nachvollziehbare Methode",
    tendencies: "Tendenzen nach Partei",
    tendenciesIntro: "Aktueller Durchschnitt im Vergleich zum Stand vor 90 Tagen. Die Einordnung ist rein rechnerisch und erklärt keine Ursachen.",
    tendencyRising: "steigend",
    tendencySlightRising: "leicht steigend",
    tendencyStable: "weitgehend stabil",
    tendencySlightFalling: "leicht rückläufig",
    tendencyFalling: "rückläufig",
    tendencyUnavailable: "Keine vergleichbare Basis",
    openParty: (party) => `Detailansicht für ${party} öffnen`,
    percentagePoints90: (delta) => `${delta > 0 ? "+" : ""}${delta.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Prozentpunkte in 90 Tagen`,
    partyDetail: "Parteiverlauf",
    partyDetailTitle: (party) => `${party} im Zeitverlauf`,
    partyDetailIntro: "Geglätteter Durchschnitt der aktuell ausgewählten Institute.",
    oneMonth: "1 M",
    sixMonthsShort: "6 M",
    yearToDateShort: "YTD",
    twoYearsShort: "2 J",
    fiveYears: "5 J",
    maximum: "Max.",
    currentValue: "Aktuell",
    changeInPeriod: "Veränderung",
    relativeChange: "Relativ",
    periodHigh: "Hoch",
    periodLow: "Tief",
    percentagePoints: "Prozentpunkte",
    ppShort: " Pp.",
    versusPeriodStart: "gegenüber Periodenbeginn",
    notEnoughData: "Für diesen Zeitraum liegt keine ausreichende Vergleichsbasis vor.",
    eventSelectionTitle: "Auswahl der Ereignisse",
    eventSelectionText: "Aufgenommen werden klar datierbare Wahlen, institutionelle Wendepunkte und Krisen mit erkennbarer Bedeutung für Deutschland. Die optionale Kontroversen-Ebene verlangt zusätzlich eine formelle Untersuchung, einen Behördenbefund oder eine Bundestagsdebatte. Vorwürfe und Gegenpositionen werden getrennt benannt. Jede Markierung ist mit einer Primärquelle verlinkt.",
    language: "Sprache & Region",
    languageHelp: "Bestimmt Sprache, Datums- und Zahlenformat.",
    appearance: "Darstellung",
    appearanceHelp: "Folgt auf Wunsch automatisch der Darstellung deines Geräts.",
    system: "System",
    light: "Hell",
    dark: "Dunkel",
    textSize: "Textgröße",
    textSizeHelp: "Vergrößert die Oberfläche, ohne den Inhalt zu verändern.",
    standard: "Standard · 17 px",
    larger: "Größer · 19 px",
    motion: "Bewegung",
    motionHelp: "Reduziert Übergänge und Animationen für eine ruhigere Bedienung.",
    reduced: "Reduziert",
    electionTomorrow: "Rechnerische Sitzverteilung aus dem aktuellen Umfragemittel",
    projectionLabel: "Rechnerische Modellansicht",
    projectionIntro: "Vereinfachte Sitzverteilung aus dem aktuellen Durchschnitt. Aufgeführt werden ausschließlich rechnerische Mehrheiten, keine Vorhersagen.",
    seats: "Sitze",
    majority: "Mehrheit",
    partiesInParliament: "Parteien im Bundestag",
    representedVotes: "abgebildete Stimmen",
    thresholdWatch: "Unterhalb der 5-%-Hürde",
    noThresholdParties: "Alle dargestellten Parteien liegen bei mindestens 5 %.",
    arithmeticMajorities: "Rechnerische Mehrheiten",
    seatsOutOf: (seats) => `${seats} von 630 Sitzen`,
    projectionMethod: "630 Sitze werden mit einem vereinfachten Sainte-Laguë-Verfahren auf Parteien mit mindestens 5 % verteilt. Wahlkreise, Grundmandate, Landeslisten, Minderheitenparteien und Rundungseffekte können das tatsächliche Ergebnis verändern. Koalitionen sind redaktionell nach parlamentarischer Sitznähe geordnet; Kombinationen mit der AfD stehen nachrangig. Die Reihenfolge ist keine Wahrscheinlichkeitsangabe.",
    close: "Schließen",
    settingsTitle: "Einstellungen",
    app: "App",
    appSettingsTitle: "Pollframe auf diesem Gerät",
    appSettingsHelp: "Als App installieren für einen schnelleren Start, eine eigene Navigation und den zuletzt geladenen Stand bei Verbindungsproblemen.",
    installApp: "Pollframe installieren",
    installNow: "Kostenlos installieren",
    showInstallSteps: "Installationsschritte anzeigen",
    appInstalled: "Auf diesem Gerät installiert",
    appUnavailable: "Die Installation wird angeboten, sobald dein Browser sie unterstützt. Du kannst Pollframe weiterhin normal im Browser verwenden.",
    iosInstallTitle: "Auf iPhone oder iPad installieren",
    iosInstallStepOne: "Öffne Pollframe in Safari und tippe auf Teilen.",
    iosInstallStepTwo: "Wähle „Zum Home-Bildschirm“ und danach „Hinzufügen“.",
    offlineStatus: "Offline · Der zuletzt geladene Stand bleibt sichtbar und kann veraltet sein.",
    cachedDataStatus: "Gespeicherter Datenstand · Verbindung prüfen, bevor du Werte veröffentlichst.",
    updateReady: "Eine neue Pollframe-Version ist bereit.",
    updateNow: "Jetzt aktualisieren",
    navOverview: "Übersicht",
    navPolling: "Umfragen",
    navMap: "Karte",
    navCountries: "Länder",
    navSettings: "Mehr",
    embedTitle: "Grafik teilen",
    embedText: "Die aktuelle Ansicht als werbefreie, responsive Grafik übernehmen. Quelle und Lizenz bleiben immer sichtbar.",
    embedPreview: "Embed-Code",
    copyCode: "Code kopieren",
    copied: "Kopiert",
    embedTheme: "Darstellung",
    embedHeight: "Höhe",
    embedLight: "Hell",
    embedDark: "Dunkel",
    embedAuto: "Automatisch",
    embedCompact: "Kompakt",
    embedStandard: "Standard",
    embedLarge: "Groß",
    embedOpen: "Vorschau öffnen",
    copyLink: "Ansichtslink kopieren",
    linkCopied: "Link kopiert",
    embedPrivacy: "Keine Cookies, kein Tracking und keine fremden Skripte im Embed.",
    embedByline: "Interaktive Bundestagsumfragen",
    methodTitle: "Daten und Methodik",
    methodIntro: "Die Darstellung trennt veröffentlichte Umfragewerte, den geglätteten Durchschnitt und amtliche Wahlergebnisse.",
    meanTitle: "So entsteht der Durchschnitt",
    meanText: "Für jedes ausgewählte Institut zählt am jeweiligen Datum nur dessen neueste Umfrage aus den vergangenen 45 Tagen. Aus diesen Werten bilden wir das einfache arithmetische Mittel. Damit hat jedes Institut das gleiche Gewicht – unabhängig davon, wie häufig es veröffentlicht.",
    selectionTitle: "Auswahl der Institute",
    selectionText: "Enthalten sind Infratest dimap, Forsa, Verian (Emnid), INSA, Forschungsgruppe Wahlen, Allensbach, YouGov und Ipsos, sofern Befragungszeitraum und Stichprobenumfang veröffentlicht sind. Die feste Auswahl ist keine Qualitätsrangliste oder Garantie für einzelne Ergebnisse.",
    limitsTitle: "Was der Wert nicht sagt",
    limitsText: "Umfragen sind Momentaufnahmen mit Unsicherheit. Der Durchschnitt korrigiert derzeit weder institutsspezifische Effekte noch Stichprobenfehler. Die geglättete Linie verbindet berechnete Stützpunkte; amtliche Wahlergebnisse erscheinen separat als Rauten. Tendenzkarten bewerten 90-Tage-Änderungen ab ±0,4 Prozentpunkten als leicht und ab ±1,2 als deutlich. Keine dieser Darstellungen ist eine Wahlprognose.",
    sourceTitle: "Quelle und Lizenz",
    sourceText: "Die einzelnen Umfragen seit 2017 stammen aus der offenen DAWUM-Datenbank (ODbL 1.0). Pollframe filtert acht Institute, vereinheitlicht Felder und berechnet daraus eigene Mittelwerte und Trends. Die Wahlergebnisse 2017, 2021 und 2025 stammen von der Bundeswahlleiterin, Wiesbaden; Prozentwerte wurden gekürzt und grafisch neu dargestellt.",
    electionSource: "Wahlergebnisse",
    lastPoll: "Letzte enthaltene Umfrage",
    basedOn: (count) => `Mittel aus ${count} Instituten`,
    onePollster: "Ein Institut ausgewählt",
    loading: "Umfragedaten werden geladen …",
    error: "Die Umfragedaten konnten nicht geladen werden.",
    footerLine: "Datenbasierte Darstellung · Keine Wahlprognose",
    privacy: "Datenschutz",
    licences: "Lizenzen",
    contact: "Kontakt",
    info: "Info",
  },
  "en-GB": {
    settings: "Settings",
    dataInfo: "Information about data and methodology",
    overview: "Bundestag · Voting intention",
    title: "German federal polling overview",
    intro: "Current figures and the long-term picture – comparable, traceable and without political commentary.",
    current: "Current average",
    currentNote: "Latest poll from each selected pollster",
    compared: "Change from 7 days earlier",
    chartTitle: "Voting intention over time",
    chartSubtitle: "Each selected pollster receives equal weight. Lines connect calculated values; points mark publication dates.",
    chartSwipe: "↔ Swipe horizontally to explore",
    customize: "Customise chart",
    share: "Share & embed",
    exportPng: "Export PNG",
    exportPreparing: "Creating PNG …",
    exportReady: "PNG saved",
    exportError: "Export failed",
    display: "Display",
    trend: "Smoothed trend",
    linear: "Connected averages",
    polls: "Average points",
    both: "Trend + average points",
    timeRange: "Time range",
    oneMonthLong: "1 month",
    threeMonths: "3 months",
    sixMonths: "6 months",
    yearToDate: "Year to date",
    year: "1 year",
    twoYears: "2 years",
    sinceElection: "Since the 2025 election",
    fiveYearsLong: "5 years",
    fullArchive: "Full archive · since 2017",
    events: "Events",
    eventCount: (count) => count === 0 ? "Hidden" : count === 1 ? "1 category" : `${count} categories`,
    eventsShown: "Events shown",
    eventsNote: "Markers provide chronological context. They do not establish that an event caused a change in polling.",
    eventEntries: (count) => `${count} ${count === 1 ? "entry" : "entries"} in the selected period`,
    lineLegend: "Lines",
    axisRange: (min, max) => `Scale ${min}–${max}%${min > 0 ? " · zero omitted" : ""}`,
    axisStart: (min) => `Axis starts at ${min}%`,
    pollsters: "Pollsters",
    pollsterCount: (count, total) => count === total ? `All ${total}` : `${count} selected`,
    parties: "Parties",
    sourcePrefix: "Data from",
    dataUpdated: "Data updated",
    raw: "Download data (JSON)",
    csv: "Download as CSV",
    pollTable: "Published individual polls",
    pollTableIntro: "Latest polls from the selected pollsters. These are the pollsters’ published figures, not the Pollframe average.",
    pollTableCount: (shown, total) => `${shown} of ${total} polls shown`,
    pollDate: "Published",
    fieldwork: "Fieldwork",
    sample: "Sample",
    method: "Method",
    openSource: "Open at DAWUM",
    showMorePolls: "Show more polls",
    methodology: "Methodology",
    pollRecords: "published polls",
    archiveCoverage: "Archive coverage",
    dataStandard: "Open data · transparent method",
    tendencies: "Party tendencies",
    tendenciesIntro: "The current average compared with 90 days earlier. This is a numerical description and does not explain causes.",
    tendencyRising: "rising",
    tendencySlightRising: "slightly rising",
    tendencyStable: "broadly stable",
    tendencySlightFalling: "slightly falling",
    tendencyFalling: "falling",
    tendencyUnavailable: "No comparable baseline",
    openParty: (party) => `Open detailed view for ${party}`,
    percentagePoints90: (delta) => `${delta > 0 ? "+" : ""}${delta.toLocaleString("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} percentage points in 90 days`,
    partyDetail: "Party history",
    partyDetailTitle: (party) => `${party} over time`,
    partyDetailIntro: "Smoothed average of the currently selected pollsters.",
    oneMonth: "1M",
    sixMonthsShort: "6M",
    yearToDateShort: "YTD",
    twoYearsShort: "2Y",
    fiveYears: "5Y",
    maximum: "Max",
    currentValue: "Current",
    changeInPeriod: "Change",
    relativeChange: "Relative",
    periodHigh: "High",
    periodLow: "Low",
    percentagePoints: "percentage points",
    ppShort: " pp",
    versusPeriodStart: "from the start of the period",
    notEnoughData: "There is not enough comparable data for this period.",
    eventSelectionTitle: "How events are selected",
    eventSelectionText: "The timeline includes clearly dated elections, institutional turning points and crises with evident significance for Germany. The optional controversies layer additionally requires a formal inquiry, an official finding or a Bundestag debate. Allegations and responses are identified separately. Every marker links to a primary source.",
    language: "Language & region",
    languageHelp: "Controls language, date and number formats.",
    appearance: "Appearance",
    appearanceHelp: "Can automatically follow your device appearance.",
    system: "System",
    light: "Light",
    dark: "Dark",
    textSize: "Text size",
    textSizeHelp: "Makes the interface larger without changing its content.",
    standard: "Standard · 17 px",
    larger: "Larger · 19 px",
    motion: "Motion",
    motionHelp: "Reduces transitions and animation for a calmer experience.",
    reduced: "Reduced",
    electionTomorrow: "Modelled seat allocation from the current polling average",
    projectionLabel: "Mathematical model",
    projectionIntro: "A simplified seat allocation based on the current average. Only mathematical majorities are listed; none is a prediction.",
    seats: "Seats",
    majority: "Majority",
    partiesInParliament: "Parties in parliament",
    representedVotes: "votes represented",
    thresholdWatch: "Below the 5% threshold",
    noThresholdParties: "Every displayed party is at or above 5%.",
    arithmeticMajorities: "Mathematical majorities",
    seatsOutOf: (seats) => `${seats} of 630 seats`,
    projectionMethod: "The 630 seats are allocated with a simplified Sainte-Laguë method to parties polling at least 5%. Constituencies, basic mandates, state lists, national-minority parties and rounding may change an actual result. Coalitions are editorially ordered by proximity of their parties in parliament; combinations with the AfD appear later. This order is not a probability assessment.",
    close: "Close",
    settingsTitle: "Settings",
    app: "App",
    appSettingsTitle: "Pollframe on this device",
    appSettingsHelp: "Install it for quicker launches, dedicated navigation and access to the last loaded view during connection problems.",
    installApp: "Install Pollframe",
    installNow: "Install for free",
    showInstallSteps: "Show installation steps",
    appInstalled: "Installed on this device",
    appUnavailable: "Installation will appear when your browser supports it. Pollframe remains fully usable in the browser.",
    iosInstallTitle: "Install on iPhone or iPad",
    iosInstallStepOne: "Open Pollframe in Safari and tap Share.",
    iosInstallStepTwo: "Choose ‘Add to Home Screen’, then tap ‘Add’.",
    offlineStatus: "Offline · The last loaded figures remain visible and may be out of date.",
    cachedDataStatus: "Saved data shown · Check your connection before publishing figures.",
    updateReady: "A new Pollframe version is ready.",
    updateNow: "Update now",
    navOverview: "Overview",
    navPolling: "Polling",
    navMap: "Map",
    navCountries: "Countries",
    navSettings: "More",
    embedTitle: "Share this chart",
    embedText: "Use the current view as an ad-free, responsive chart. Source and licence always remain visible.",
    embedPreview: "Embed code",
    copyCode: "Copy code",
    copied: "Copied",
    embedTheme: "Appearance",
    embedHeight: "Height",
    embedLight: "Light",
    embedDark: "Dark",
    embedAuto: "Automatic",
    embedCompact: "Compact",
    embedStandard: "Standard",
    embedLarge: "Large",
    embedOpen: "Open preview",
    copyLink: "Copy view link",
    linkCopied: "Link copied",
    embedPrivacy: "No cookies, tracking or third-party scripts in the embed.",
    embedByline: "Interactive German federal polling",
    methodTitle: "Data and methodology",
    methodIntro: "The display separates published poll results, the smoothed average and official election results.",
    meanTitle: "How the average is calculated",
    meanText: "For each selected pollster, only its latest poll within the previous 45 days is counted at each date. We take the simple arithmetic mean of those figures. Each pollster therefore has equal weight, regardless of publishing frequency.",
    selectionTitle: "Pollster selection",
    selectionText: "The fixed set is Infratest dimap, Forsa, Verian (Emnid), INSA, Forschungsgruppe Wahlen, Allensbach, YouGov and Ipsos where fieldwork dates and sample sizes are published. It is not a quality ranking or a guarantee of any individual result.",
    limitsTitle: "What the figure does not show",
    limitsText: "Polls are uncertain snapshots. The average does not currently adjust for pollster-specific effects or sampling error. The smoothed line connects calculated points; official election results are shown separately as diamonds. Tendency cards classify 90-day changes from ±0.4 percentage points as slight and from ±1.2 as clear. None of these displays is an election forecast.",
    sourceTitle: "Source and licence",
    sourceText: "Individual polls since 2017 come from the open DAWUM database (ODbL 1.0). Pollframe filters eight pollsters, normalises fields and calculates its own averages and trends. The 2017, 2021 and 2025 election results come from the Federal Returning Officer, Wiesbaden; percentages were shortened and presented in a new graphic form.",
    electionSource: "Election results",
    lastPoll: "Latest included poll",
    basedOn: (count) => `Average of ${count} pollsters`,
    onePollster: "One pollster selected",
    loading: "Loading polling data …",
    error: "Polling data could not be loaded.",
    footerLine: "Data-based overview · Not an election forecast",
    privacy: "Privacy",
    licences: "Licences",
    contact: "Contact",
    info: "Info",
  },
};

copy["en-US"] = {
  ...copy["en-GB"],
  intro: "Current figures and the long-term picture – comparable, traceable, and without political commentary.",
  customize: "Customize chart",
  percentagePoints90: (delta) => `${delta > 0 ? "+" : ""}${delta.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} percentage points in 90 days`,
  sourceTitle: "Source and license",
  sourceText: "Individual polls since 2017 come from the open DAWUM database (ODbL 1.0). Pollframe filters eight pollsters, normalizes fields, and calculates its own averages and trends. The 2017, 2021, and 2025 election results come from the Federal Returning Officer, Wiesbaden; percentages were shortened and presented in a new graphic form.",
};

copy.es = {
  ...copy["en-GB"],
  settings: "Ajustes", dataInfo: "Información sobre datos y método",
  overview: "Congreso de los Diputados · intención de voto",
  title: "Encuestas de las elecciones generales en España",
  intro: "Valores actuales y evolución a largo plazo, comparables, trazables y sin valoración política.",
  current: "Media actual", currentNote: "Última encuesta de cada instituto seleccionado",
  compared: "Cambio respecto a hace 7 días", chartTitle: "Evolución de la intención de voto",
  chartSubtitle: "La última encuesta de cada instituto seleccionado en los 45 días anteriores tiene el mismo peso. Las líneas conectan las medias calculadas.",
  chartSwipe: "↔ Desliza para explorar", customize: "Configurar gráfico", share: "Compartir e insertar",
  exportPng: "Exportar PNG", exportPreparing: "Creando PNG…", exportReady: "PNG guardado", exportError: "No se pudo exportar",
  display: "Vista", trend: "Tendencia suavizada", linear: "Medias conectadas", polls: "Puntos de la media", both: "Tendencia + puntos",
  timeRange: "Periodo", oneMonthLong: "1 mes", threeMonths: "3 meses", sixMonths: "6 meses", yearToDate: "Año en curso", year: "1 año", twoYears: "2 años", sinceElection: "Desde las elecciones de 2023", fiveYearsLong: "5 años", fullArchive: "Archivo completo · desde 2023",
  events: "Acontecimientos", eventCount: (count) => count === 0 ? "Ocultos" : count === 1 ? "1 categoría" : `${count} categorías`, eventsShown: "Acontecimientos visibles", eventsNote: "Las marcas ofrecen contexto temporal, pero no demuestran causalidad.", eventEntries: (count) => `${count} acontecimientos en el periodo`,
  lineLegend: "Líneas", axisRange: (min, max) => `Escala ${min}–${max}%${min > 0 ? " · cero oculto" : ""}`, axisStart: (min) => `El eje empieza en ${min}%`,
  pollsters: "Institutos", pollsterCount: (count, total) => count === total ? `Todos (${total})` : `${count} seleccionados`, parties: "Partidos",
  sourcePrefix: "Datos de", dataUpdated: "Datos actualizados", raw: "Descargar datos (JSON)", csv: "Descargar CSV", pollTable: "Encuestas publicadas",
  pollTableIntro: "Últimas encuestas de los institutos seleccionados. Son valores publicados, no la media de Pollframe.", pollTableCount: (shown, total) => `${shown} de ${total} encuestas`, pollDate: "Fecha", fieldwork: "Trabajo de campo", sample: "Muestra", method: "Método", openSource: "Abrir fuente original", showMorePolls: "Mostrar más encuestas", methodology: "Metodología", pollRecords: "encuestas publicadas", archiveCoverage: "Cobertura", dataStandard: "Datos reutilizables · método trazable",
  tendencies: "Tendencia por partido", tendenciesIntro: "Comparación de la media actual con la de hace 90 días. Es un cálculo, no una explicación de las causas.",
  tendencyRising: "sube", tendencySlightRising: "sube ligeramente", tendencyStable: "estable", tendencySlightFalling: "baja ligeramente", tendencyFalling: "baja", tendencyUnavailable: "Sin base comparable",
  openParty: (party) => `Abrir detalle de ${party}`, percentagePoints90: (delta) => `${delta > 0 ? "+" : ""}${delta.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} puntos en 90 días`, partyDetail: "Evolución del partido", partyDetailTitle: (party) => `${party} a lo largo del tiempo`, partyDetailIntro: "Media suavizada de los institutos seleccionados.",
  oneMonth: "1 M", sixMonthsShort: "6 M", yearToDateShort: "YTD", twoYearsShort: "2 A", fiveYears: "5 A", maximum: "Máx.", currentValue: "Actual", changeInPeriod: "Cambio", relativeChange: "Relativo", periodHigh: "Máximo", periodLow: "Mínimo", percentagePoints: "puntos porcentuales", ppShort: " pp", versusPeriodStart: "desde el inicio", notEnoughData: "No hay una base comparable suficiente para este periodo.",
  eventSelectionTitle: "Selección de acontecimientos", eventSelectionText: "Se incluyen elecciones e hitos institucionales claramente fechados. Su proximidad a una variación no prueba causa y efecto; cada marca enlaza a una fuente.",
  language: "Idioma y región", languageHelp: "Define el idioma y los formatos de fecha y número.", appearance: "Apariencia", appearanceHelp: "Puede seguir automáticamente el tema del dispositivo.", system: "Sistema", light: "Claro", dark: "Oscuro", textSize: "Tamaño del texto", textSizeHelp: "Amplía la interfaz sin cambiar el contenido.", standard: "Estándar · 17 px", larger: "Grande · 19 px", motion: "Movimiento", motionHelp: "Reduce transiciones y animaciones.", reduced: "Reducido",
  close: "Cerrar", settingsTitle: "Ajustes", app: "App", installApp: "Instalar Pollframe", installNow: "Instalar gratis", appInstalled: "Instalada en este dispositivo", appUnavailable: "La instalación aparecerá cuando el navegador sea compatible.", showInstallSteps: "Ver instrucciones", iosInstallTitle: "Instalar en iPhone o iPad", iosInstallStepOne: "Abre Pollframe en Safari y toca Compartir.", iosInstallStepTwo: "Selecciona «Añadir a pantalla de inicio» y después «Añadir».", appSettingsTitle: "Pollframe en este dispositivo", appSettingsHelp: "Instálala para abrir más rápido, navegar como app y conservar la última vista sin conexión.", offlineStatus: "Sin conexión · los datos guardados pueden estar desactualizados.", cachedDataStatus: "Se muestran datos guardados.", updateReady: "Hay una nueva versión de Pollframe.", updateNow: "Actualizar",
  navOverview: "Resumen", navPolling: "Encuestas", navMap: "Mapa", navCountries: "Países", navSettings: "Más",
  methodTitle: "Datos y metodología de España", methodIntro: "La vista separa encuestas publicadas, medias calculadas y resultados oficiales.", meanTitle: "Cómo se calcula la media", meanText: "En cada fecha cuenta la última encuesta de cada instituto seleccionado dentro de los 45 días anteriores. Pollframe calcula la media aritmética simple: cada instituto pesa lo mismo, con independencia de la frecuencia de publicación.", selectionTitle: "Selección de institutos", selectionText: "La vista inicial incluye todos los institutos válidos del archivo. Pueden compararse por separado; su inclusión no equivale a una clasificación de calidad.", limitsTitle: "Qué no muestra el gráfico", limitsText: "Las encuestas son estimaciones con incertidumbre. El promedio no corrige efectos propios de cada instituto ni escaños por provincia. No es una previsión electoral.", sourceTitle: "Fuente y licencia", sourceText: "Pollframe normaliza las tablas de encuestas citadas en Wikipedia bajo CC BY-SA 4.0 y conserva el enlace a la publicación original de cada fila cuando está disponible. Los resultados electorales proceden del Ministerio del Interior.", electionSource: "Resultados electorales", lastPoll: "Última encuesta incluida", basedOn: (count) => `Media de ${count} institutos`, onePollster: "Un instituto seleccionado", loading: "Cargando datos…", error: "No se pudieron cargar los datos.", footerLine: "Resumen basado en datos · no es una previsión", privacy: "Privacidad", licences: "Licencias", contact: "Contacto", info: "Información",
};

copy.tr = {
  ...copy["en-GB"],
  settings: "Ayarlar",
  dataInfo: "Veri ve yöntem bilgileri",
  overview: "Bundestag · Oy tercihi",
  title: "Almanya federal seçim anketleri",
  intro: "Güncel değerler ve uzun vadeli görünüm — karşılaştırılabilir, izlenebilir ve siyasi yorum içermeden.",
  current: "Güncel ortalama",
  currentNote: "Seçilen her araştırma şirketinin son anketi",
  compared: "7 gün öncesine göre değişim",
  chartTitle: "Oy tercihlerinin zaman içindeki gelişimi",
  chartSubtitle: "Seçilen her araştırma şirketi eşit ağırlıktadır. Çizgiler hesaplanan değerleri, noktalar yayın tarihlerini gösterir.",
  chartSwipe: "↔ İncelemek için yatay kaydırın",
  customize: "Grafiği özelleştir",
  share: "Paylaş ve yerleştir",
  exportPng: "PNG indir",
  exportPreparing: "PNG hazırlanıyor …",
  exportReady: "PNG kaydedildi",
  exportError: "Dışa aktarma başarısız",
  display: "Görünüm",
  trend: "Yumuşatılmış eğilim",
  linear: "Birleştirilmiş ortalamalar",
  polls: "Ortalama noktaları",
  both: "Eğilim + ortalama noktaları",
  timeRange: "Zaman aralığı",
  oneMonthLong: "1 ay",
  threeMonths: "3 ay",
  sixMonths: "6 ay",
  yearToDate: "Yıl başından beri",
  year: "1 yıl",
  twoYears: "2 yıl",
  sinceElection: "2025 seçiminden beri",
  fiveYearsLong: "5 yıl",
  fullArchive: "Tüm arşiv · 2017'den beri",
  events: "Olaylar",
  eventCount: (count) => count === 0 ? "Gizli" : `${count} kategori`,
  eventsShown: "Gösterilen olaylar",
  eventsNote: "İşaretler kronolojik bağlam sunar; anket değişikliklerinin nedenini kanıtlamaz.",
  eventEntries: (count) => `Seçilen dönemde ${count} kayıt`,
  lineLegend: "Çizgiler",
  axisRange: (min, max) => `Ölçek %${min}–${max}${min > 0 ? " · sıfır gösterilmiyor" : ""}`,
  axisStart: (min) => `Eksen %${min}'ten başlıyor`,
  pollsters: "Araştırma şirketleri",
  pollsterCount: (count, total) => count === total ? `Tümü (${total})` : `${count} seçili`,
  parties: "Partiler",
  sourcePrefix: "Veri kaynağı",
  dataUpdated: "Veri tarihi",
  raw: "Veriyi indir (JSON)",
  csv: "CSV indir",
  pollTable: "Yayımlanan tekil anketler",
  pollTableIntro: "Seçilen şirketlerin son anketleri. Bunlar Pollframe ortalaması değil, şirketlerin yayımladığı değerlerdir.",
  pollTableCount: (shown, total) => `${total} anketin ${shown} tanesi gösteriliyor`,
  pollDate: "Yayınlandı",
  fieldwork: "Saha çalışması",
  sample: "Örneklem",
  method: "Yöntem",
  openSource: "DAWUM'da aç",
  showMorePolls: "Daha fazla anket göster",
  methodology: "Yöntem",
  pollRecords: "yayımlanmış anket",
  archiveCoverage: "Arşiv dönemi",
  dataStandard: "Açık veri · şeffaf yöntem",
  tendencies: "Parti eğilimleri",
  tendenciesIntro: "Güncel ortalamanın 90 gün önceki durumla sayısal karşılaştırması; nedenleri açıklamaz.",
  tendencyRising: "yükseliyor",
  tendencySlightRising: "hafif yükseliyor",
  tendencyStable: "büyük ölçüde sabit",
  tendencySlightFalling: "hafif düşüyor",
  tendencyFalling: "düşüyor",
  tendencyUnavailable: "Karşılaştırılabilir temel yok",
  openParty: (party) => `${party} ayrıntılarını aç`,
  percentagePoints90: (delta) => `90 günde ${delta > 0 ? "+" : ""}${delta.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} puan`,
  partyDetail: "Parti geçmişi",
  partyDetailTitle: (party) => `${party}: zaman içindeki değişim`,
  partyDetailIntro: "Seçili araştırma şirketlerinin yumuşatılmış ortalaması.",
  oneMonth: "1A", sixMonthsShort: "6A", yearToDateShort: "YBB", twoYearsShort: "2Y", fiveYears: "5Y", maximum: "Tümü",
  currentValue: "Güncel", changeInPeriod: "Değişim", relativeChange: "Göreli", periodHigh: "En yüksek", periodLow: "En düşük",
  percentagePoints: "puan", ppShort: " puan", versusPeriodStart: "dönem başlangıcına göre",
  notEnoughData: "Bu dönem için yeterli karşılaştırılabilir veri yok.",
  language: "Dil ve bölge", languageHelp: "Dil, tarih ve sayı biçimini belirler.",
  appearance: "Görünüm", appearanceHelp: "Cihazınızın görünümünü otomatik olarak izleyebilir.",
  system: "Sistem", light: "Açık", dark: "Koyu",
  textSize: "Metin boyutu", textSizeHelp: "İçeriği değiştirmeden arayüzü büyütür.", standard: "Standart · 17 px", larger: "Büyük · 19 px",
  motion: "Hareket", motionHelp: "Daha sakin kullanım için geçişleri ve animasyonları azaltır.", reduced: "Azaltılmış",
  electionTomorrow: "Güncel anket ortalamasına göre modellenmiş sandalye dağılımı",
  projectionLabel: "Matematiksel model", projectionIntro: "Güncel ortalamaya dayalı basitleştirilmiş sandalye dağılımı; tahmin değildir.",
  seats: "Sandalye", majority: "Çoğunluk", partiesInParliament: "Parlamentodaki partiler", representedVotes: "temsil edilen oylar",
  thresholdWatch: "%5 barajının altında", noThresholdParties: "Gösterilen tüm partiler en az %5 seviyesinde.", arithmeticMajorities: "Aritmetik çoğunluklar",
  seatsOutOf: (seats) => `630 sandalyenin ${seats} tanesi`,
  close: "Kapat", settingsTitle: "Ayarlar",
  embedTitle: "Grafiği paylaş", embedText: "Güncel görünümü reklamsız ve duyarlı bir grafik olarak kullanın. Kaynak ve lisans görünür kalır.",
  embedPreview: "Yerleştirme kodu", copyCode: "Kodu kopyala", copied: "Kopyalandı", embedTheme: "Görünüm", embedHeight: "Yükseklik",
  embedLight: "Açık", embedDark: "Koyu", embedAuto: "Otomatik", embedCompact: "Kompakt", embedStandard: "Standart", embedLarge: "Büyük",
  embedOpen: "Önizlemeyi aç", copyLink: "Görünüm bağlantısını kopyala", linkCopied: "Bağlantı kopyalandı",
  embedPrivacy: "Yerleştirmede çerez, izleme veya üçüncü taraf betiği yoktur.", embedByline: "Etkileşimli Almanya federal seçim anketleri",
  methodTitle: "Veri ve yöntem", methodIntro: "Yayımlanan anketler, yumuşatılmış ortalama ve resmî seçim sonuçları ayrı gösterilir.",
  sourceTitle: "Kaynak ve lisans", electionSource: "Seçim sonuçları", lastPoll: "Dahil edilen son anket",
  basedOn: (count) => `${count} araştırma şirketinin ortalaması`, onePollster: "Bir araştırma şirketi seçili",
  loading: "Anket verileri yükleniyor …", error: "Anket verileri yüklenemedi.", footerLine: "Veriye dayalı görünüm · Seçim tahmini değildir",
  privacy: "Gizlilik", licences: "Lisanslar", contact: "İletişim", info: "Bilgi",
};

copy.ru = {
  ...copy["en-GB"],
  settings: "Настройки", dataInfo: "Данные и методика", overview: "Бундестаг · Рейтинги партий",
  title: "Опросы перед выборами в Бундестаг", intro: "Текущие значения и долгосрочная динамика — сопоставимо, прозрачно и без политических оценок.",
  current: "Текущее среднее", currentNote: "Последний опрос каждого выбранного института", compared: "Изменение за 7 дней",
  chartTitle: "Динамика электоральных предпочтений", chartSubtitle: "Каждый выбранный институт имеет одинаковый вес. Линии соединяют расчётные значения, точки отмечают даты публикаций.",
  chartSwipe: "↔ Проведите по горизонтали", customize: "Настроить график", share: "Поделиться и встроить",
  exportPng: "Скачать PNG", exportPreparing: "Создаём PNG …", exportReady: "PNG сохранён", exportError: "Ошибка экспорта",
  display: "Вид", trend: "Сглаженный тренд", linear: "Соединённые средние", polls: "Средние точки", both: "Тренд + средние точки", timeRange: "Период",
  oneMonthLong: "1 месяц", threeMonths: "3 месяца", sixMonths: "6 месяцев", yearToDate: "С начала года", year: "1 год", twoYears: "2 года",
  sinceElection: "После выборов 2025", fiveYearsLong: "5 лет", fullArchive: "Весь архив · с 2017 года",
  events: "События", eventCount: (count) => count === 0 ? "Скрыты" : `${count} категорий`, eventsShown: "Показанные события",
  eventsNote: "Метки дают хронологический контекст, но не доказывают причинную связь.", eventEntries: (count) => `${count} событий за выбранный период`,
  lineLegend: "Линии", axisRange: (min, max) => `Шкала ${min}–${max}%${min > 0 ? " · без нуля" : ""}`, axisStart: (min) => `Ось начинается с ${min}%`,
  pollsters: "Институты", pollsterCount: (count, total) => count === total ? `Все (${total})` : `Выбрано: ${count}`, parties: "Партии",
  sourcePrefix: "Источник данных", dataUpdated: "Данные на", raw: "Скачать данные (JSON)", csv: "Скачать CSV",
  pollTable: "Опубликованные опросы", pollTableIntro: "Последние опросы выбранных институтов. Это опубликованные значения, а не среднее Pollframe.",
  pollTableCount: (shown, total) => `Показано ${shown} из ${total}`, pollDate: "Опубликовано", fieldwork: "Полевой период", sample: "Выборка", method: "Метод",
  openSource: "Открыть на DAWUM", showMorePolls: "Показать ещё", methodology: "Методика", pollRecords: "опубликованных опросов", archiveCoverage: "Период архива",
  dataStandard: "Открытые данные · прозрачная методика", tendencies: "Тенденции партий",
  tendenciesIntro: "Числовое сравнение текущего среднего со значением 90 дней назад; причины не оцениваются.",
  tendencyRising: "растёт", tendencySlightRising: "слегка растёт", tendencyStable: "почти без изменений", tendencySlightFalling: "слегка снижается", tendencyFalling: "снижается", tendencyUnavailable: "Нет базы для сравнения",
  openParty: (party) => `Открыть данные ${party}`, percentagePoints90: (delta) => `${delta > 0 ? "+" : ""}${delta.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} п. п. за 90 дней`,
  partyDetail: "История партии", partyDetailTitle: (party) => `${party}: динамика`, partyDetailIntro: "Сглаженное среднее выбранных институтов.",
  oneMonth: "1М", sixMonthsShort: "6М", yearToDateShort: "СГ", twoYearsShort: "2Г", fiveYears: "5Л", maximum: "Макс.",
  currentValue: "Сейчас", changeInPeriod: "Изменение", relativeChange: "Относительно", periodHigh: "Максимум", periodLow: "Минимум", percentagePoints: "процентных пункта", ppShort: " п. п.", versusPeriodStart: "к началу периода", notEnoughData: "Недостаточно сопоставимых данных за этот период.",
  language: "Язык и регион", languageHelp: "Определяет язык, формат дат и чисел.", appearance: "Оформление", appearanceHelp: "Может соответствовать настройкам устройства.",
  system: "Система", light: "Светлая", dark: "Тёмная", textSize: "Размер текста", textSizeHelp: "Увеличивает интерфейс без изменения содержания.", standard: "Обычный · 17 px", larger: "Крупный · 19 px",
  motion: "Анимация", motionHelp: "Уменьшает переходы и анимацию.", reduced: "Уменьшена", electionTomorrow: "Расчётное распределение мест по текущему среднему",
  projectionLabel: "Математическая модель", projectionIntro: "Упрощённое распределение мест; это не прогноз.", seats: "Места", majority: "Большинство", partiesInParliament: "Партии в парламенте", representedVotes: "учтённых голосов", thresholdWatch: "Ниже барьера 5%", noThresholdParties: "Все показанные партии набирают не менее 5%.", arithmeticMajorities: "Арифметические большинства", seatsOutOf: (seats) => `${seats} из 630 мест`,
  close: "Закрыть", settingsTitle: "Настройки", embedTitle: "Поделиться графиком", embedText: "Используйте текущий вид как адаптивный график без рекламы. Источник и лицензия остаются видимыми.",
  embedPreview: "Код для встраивания", copyCode: "Копировать код", copied: "Скопировано", embedTheme: "Оформление", embedHeight: "Высота", embedLight: "Светлая", embedDark: "Тёмная", embedAuto: "Авто", embedCompact: "Компактно", embedStandard: "Стандарт", embedLarge: "Крупно", embedOpen: "Открыть предпросмотр", copyLink: "Копировать ссылку", linkCopied: "Ссылка скопирована", embedPrivacy: "Без файлов cookie, отслеживания и сторонних скриптов.", embedByline: "Опросы перед выборами в Бундестаг",
  methodTitle: "Данные и методика", methodIntro: "Опубликованные опросы, сглаженное среднее и официальные итоги показаны отдельно.", sourceTitle: "Источник и лицензия", electionSource: "Итоги выборов", lastPoll: "Последний учтённый опрос", basedOn: (count) => `Среднее ${count} институтов`, onePollster: "Выбран один институт", loading: "Загрузка данных …", error: "Не удалось загрузить данные.", footerLine: "Обзор на основе данных · Не прогноз выборов", privacy: "Конфиденциальность", licences: "Лицензии", contact: "Контакты", info: "Информация",
};

copy.ar = {
  ...copy["en-GB"],
  settings: "الإعدادات", dataInfo: "معلومات البيانات والمنهجية", overview: "البوندستاغ · نوايا التصويت",
  title: "استطلاعات الانتخابات الاتحادية الألمانية", intro: "الأرقام الحالية والاتجاه طويل المدى — قابلة للمقارنة وشفافة ومن دون تعليق سياسي.",
  current: "المتوسط الحالي", currentNote: "أحدث استطلاع من كل مؤسسة مختارة", compared: "التغير مقارنةً بما قبل 7 أيام",
  chartTitle: "تطور نوايا التصويت", chartSubtitle: "تحصل كل مؤسسة مختارة على الوزن نفسه. تصل الخطوط القيم المحسوبة وتشير النقاط إلى تواريخ النشر.",
  chartSwipe: "↔ اسحب أفقياً للاستكشاف", customize: "تخصيص الرسم", share: "مشاركة وتضمين",
  exportPng: "تنزيل PNG", exportPreparing: "جارٍ إنشاء PNG …", exportReady: "تم حفظ PNG", exportError: "فشل التصدير",
  display: "العرض", trend: "اتجاه سلس", linear: "متوسطات متصلة", polls: "نقاط المتوسط", both: "الاتجاه + نقاط المتوسط", timeRange: "الفترة الزمنية",
  oneMonthLong: "شهر", threeMonths: "3 أشهر", sixMonths: "6 أشهر", yearToDate: "منذ بداية السنة", year: "سنة", twoYears: "سنتان", sinceElection: "منذ انتخابات 2025", fiveYearsLong: "5 سنوات", fullArchive: "الأرشيف الكامل · منذ 2017",
  events: "الأحداث", eventCount: (count) => count === 0 ? "مخفية" : `${count} فئات`, eventsShown: "الأحداث المعروضة", eventsNote: "توفر العلامات سياقاً زمنياً ولا تثبت وجود علاقة سببية.", eventEntries: (count) => `${count} أحداث في الفترة المختارة`,
  lineLegend: "الخطوط", axisRange: (min, max) => `المقياس ${min}–${max}%${min > 0 ? " · الصفر غير معروض" : ""}`, axisStart: (min) => `يبدأ المحور عند ${min}%`,
  pollsters: "مؤسسات الاستطلاع", pollsterCount: (count, total) => count === total ? `الكل (${total})` : `${count} محددة`, parties: "الأحزاب",
  sourcePrefix: "مصدر البيانات", dataUpdated: "تاريخ البيانات", raw: "تنزيل البيانات (JSON)", csv: "تنزيل CSV", pollTable: "الاستطلاعات المنشورة",
  pollTableIntro: "أحدث استطلاعات المؤسسات المختارة. هذه قيم منشورة وليست متوسط Pollframe.", pollTableCount: (shown, total) => `عرض ${shown} من ${total}`, pollDate: "النشر", fieldwork: "العمل الميداني", sample: "العينة", method: "المنهج", openSource: "فتح في DAWUM", showMorePolls: "عرض المزيد", methodology: "المنهجية", pollRecords: "استطلاعات منشورة", archiveCoverage: "فترة الأرشيف", dataStandard: "بيانات مفتوحة · منهج شفاف",
  tendencies: "اتجاهات الأحزاب", tendenciesIntro: "مقارنة رقمية بين المتوسط الحالي وما كان عليه قبل 90 يوماً، من دون تفسير الأسباب.",
  tendencyRising: "صاعد", tendencySlightRising: "صاعد قليلاً", tendencyStable: "مستقر إلى حد كبير", tendencySlightFalling: "منخفض قليلاً", tendencyFalling: "منخفض", tendencyUnavailable: "لا توجد قاعدة مقارنة",
  openParty: (party) => `فتح تفاصيل ${party}`, percentagePoints90: (delta) => `${delta > 0 ? "+" : ""}${delta.toLocaleString("ar", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} نقطة خلال 90 يوماً`, partyDetail: "سجل الحزب", partyDetailTitle: (party) => `${party} عبر الزمن`, partyDetailIntro: "متوسط سلس لمؤسسات الاستطلاع المختارة.",
  oneMonth: "شهر", sixMonthsShort: "6ش", yearToDateShort: "السنة", twoYearsShort: "2س", fiveYears: "5س", maximum: "الكل", currentValue: "حالياً", changeInPeriod: "التغير", relativeChange: "نسبي", periodHigh: "الأعلى", periodLow: "الأدنى", percentagePoints: "نقاط مئوية", ppShort: " نقطة", versusPeriodStart: "مقارنة ببداية الفترة", notEnoughData: "لا توجد بيانات كافية قابلة للمقارنة لهذه الفترة.",
  language: "اللغة والمنطقة", languageHelp: "تحدد اللغة وتنسيق التاريخ والأرقام.", appearance: "المظهر", appearanceHelp: "يمكنه اتباع مظهر جهازك تلقائياً.", system: "النظام", light: "فاتح", dark: "داكن", textSize: "حجم النص", textSizeHelp: "يكبر الواجهة من دون تغيير المحتوى.", standard: "عادي · 17 px", larger: "كبير · 19 px", motion: "الحركة", motionHelp: "يقلل الانتقالات والحركة.", reduced: "مخفضة",
  electionTomorrow: "توزيع مقاعد محسوب من متوسط الاستطلاعات الحالي", projectionLabel: "نموذج رياضي", projectionIntro: "توزيع مبسط للمقاعد وليس توقعاً.", seats: "مقاعد", majority: "الأغلبية", partiesInParliament: "الأحزاب في البرلمان", representedVotes: "الأصوات الممثلة", thresholdWatch: "دون عتبة 5%", noThresholdParties: "كل الأحزاب المعروضة عند 5% أو أكثر.", arithmeticMajorities: "الأغلبيات الحسابية", seatsOutOf: (seats) => `${seats} من 630 مقعداً`,
  close: "إغلاق", settingsTitle: "الإعدادات", embedTitle: "مشاركة الرسم", embedText: "استخدم العرض الحالي كرسم متجاوب بلا إعلانات. يبقى المصدر والترخيص ظاهرين.", embedPreview: "رمز التضمين", copyCode: "نسخ الرمز", copied: "تم النسخ", embedTheme: "المظهر", embedHeight: "الارتفاع", embedLight: "فاتح", embedDark: "داكن", embedAuto: "تلقائي", embedCompact: "مضغوط", embedStandard: "عادي", embedLarge: "كبير", embedOpen: "فتح المعاينة", copyLink: "نسخ رابط العرض", linkCopied: "تم نسخ الرابط", embedPrivacy: "لا ملفات تعريف ارتباط أو تتبع أو نصوص خارجية في التضمين.", embedByline: "استطلاعات الانتخابات الاتحادية الألمانية",
  methodTitle: "البيانات والمنهجية", methodIntro: "تُعرض نتائج الاستطلاعات والمتوسط السلس والنتائج الرسمية بصورة منفصلة.", sourceTitle: "المصدر والترخيص", electionSource: "نتائج الانتخابات", lastPoll: "آخر استطلاع مشمول", basedOn: (count) => `متوسط ${count} مؤسسات`, onePollster: "مؤسسة واحدة محددة", loading: "جارٍ تحميل البيانات …", error: "تعذر تحميل البيانات.", footerLine: "عرض قائم على البيانات · ليس توقعاً انتخابياً", privacy: "الخصوصية", licences: "التراخيص", contact: "اتصال", info: "معلومات",
};

Object.assign(copy.tr, {
  app: "Uygulama", appSettingsTitle: "Bu cihazda Pollframe", appSettingsHelp: "Daha hızlı açılış, özel gezinme ve bağlantı sorunlarında son yüklenen görünüm için yükleyin.",
  installApp: "Pollframe'ı yükle", installNow: "Ücretsiz yükle", showInstallSteps: "Yükleme adımlarını göster", appInstalled: "Bu cihaza yüklendi", appUnavailable: "Tarayıcınız desteklediğinde yükleme seçeneği görünecektir.",
  iosInstallTitle: "iPhone veya iPad'e yükle", iosInstallStepOne: "Pollframe'ı Safari'de açın ve Paylaş'a dokunun.", iosInstallStepTwo: "‘Ana Ekrana Ekle’yi, ardından ‘Ekle’yi seçin.",
  offlineStatus: "Çevrimdışı · Son yüklenen değerler gösteriliyor ve güncel olmayabilir.", cachedDataStatus: "Kaydedilmiş veriler gösteriliyor · yayımlamadan önce bağlantınızı kontrol edin.", updateReady: "Yeni bir Pollframe sürümü hazır.", updateNow: "Şimdi güncelle",
  navOverview: "Genel", navPolling: "Anketler", navMap: "Harita", navCountries: "Ülkeler", navSettings: "Daha fazla",
});
Object.assign(copy.ru, {
  app: "Приложение", appSettingsTitle: "Pollframe на этом устройстве", appSettingsHelp: "Установите для быстрого запуска, удобной навигации и доступа к последнему загруженному виду при проблемах с сетью.",
  installApp: "Установить Pollframe", installNow: "Установить бесплатно", showInstallSteps: "Показать шаги установки", appInstalled: "Установлено на этом устройстве", appUnavailable: "Установка появится, когда её поддержит браузер.",
  iosInstallTitle: "Установка на iPhone или iPad", iosInstallStepOne: "Откройте Pollframe в Safari и нажмите «Поделиться».", iosInstallStepTwo: "Выберите «На экран Домой», затем «Добавить».",
  offlineStatus: "Нет сети · Показаны последние загруженные данные, они могут устареть.", cachedDataStatus: "Показаны сохранённые данные · перед публикацией проверьте соединение.", updateReady: "Доступна новая версия Pollframe.", updateNow: "Обновить",
  navOverview: "Обзор", navPolling: "Опросы", navMap: "Карта", navCountries: "Страны", navSettings: "Ещё",
});
Object.assign(copy.ar, {
  app: "التطبيق", appSettingsTitle: "Pollframe على هذا الجهاز", appSettingsHelp: "ثبّته لفتح أسرع وتنقل مخصص والوصول إلى آخر عرض محمّل عند تعذر الاتصال.",
  installApp: "تثبيت Pollframe", installNow: "تثبيت مجاناً", showInstallSteps: "عرض خطوات التثبيت", appInstalled: "مثبّت على هذا الجهاز", appUnavailable: "سيظهر خيار التثبيت عندما يدعمه متصفحك.",
  iosInstallTitle: "التثبيت على iPhone أو iPad", iosInstallStepOne: "افتح Pollframe في Safari واضغط على مشاركة.", iosInstallStepTwo: "اختر «إضافة إلى الشاشة الرئيسية» ثم «إضافة».",
  offlineStatus: "غير متصل · تظهر آخر بيانات حُمّلت وقد تكون قديمة.", cachedDataStatus: "تظهر بيانات محفوظة · تحقق من الاتصال قبل نشر الأرقام.", updateReady: "إصدار جديد من Pollframe جاهز.", updateNow: "تحديث الآن",
  navOverview: "نظرة عامة", navPolling: "استطلاعات", navMap: "الخريطة", navCountries: "الدول", navSettings: "المزيد",
});

function stateLocaleOverrides(locale, region) {
  if (locale === "tr") return {
    overview: `${region.name} · Oy tercihi`,
    title: `${region.name} eyalet seçim anketleri`,
    intro: `${region.name} için güncel değerler ve uzun vadeli eğilim — veri kapsamı açıkça belirtilir.`,
    chartTitle: `${region.name}: oy tercihlerinin gelişimi`,
    sinceElection: "Son eyalet seçiminden beri",
    fullArchive: "Tüm eyalet arşivi · 2017'den beri",
  };
  if (locale === "ru") return {
    overview: `${region.name} · Рейтинги партий`,
    title: `Опросы перед выборами в земле ${region.name}`,
    intro: `Текущие значения и долгосрочная динамика для земли ${region.name} с прозрачным указанием охвата данных.`,
    chartTitle: `Динамика электоральных предпочтений: ${region.name}`,
    sinceElection: "После последних земельных выборов",
    fullArchive: "Весь архив земли · с 2017 года",
  };
  if (locale === "ar") return {
    overview: `${region.name} · نوايا التصويت`,
    title: `استطلاعات انتخابات ولاية ${region.name}`,
    intro: `الأرقام الحالية والاتجاه طويل المدى في ${region.name} مع توضيح نطاق البيانات.`,
    chartTitle: `تطور نوايا التصويت في ${region.name}`,
    sinceElection: "منذ آخر انتخابات للولاية",
    fullArchive: "أرشيف الولاية الكامل · منذ 2017",
  };
  return null;
}

function Icon({ name, size = 20 }) {
  const paths = {
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.09a2 2 0 0 1 1 1.74v.5a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2Z" /></>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
    share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    download: <><path d="M12 4v11M8 11l4 4 4-4" /><path d="M5 20h14" /></>,
    external: <><path d="M14 5h5v5M19 5l-8 8" /><path d="M17 13v5H6V7h5" /></>,
    home: <><path d="m4 11 8-7 8 7" /><path d="M6.5 10v10h11V10M10 20v-6h4v6" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 5-7" /></>,
    map: <><path d="m3.5 6 5-2 7 2 5-2v14l-5 2-7-2-5 2Z" /><path d="M8.5 4v14M15.5 6v14" /></>,
    globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></>,
    app: <><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M10 6h4M11 18h2" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M18.5 12a7 7 0 1 0-1.4 5.1" /></>,
    wifiOff: <><path d="m3 3 18 18" /><path d="M8.5 8.7A12 12 0 0 1 20 10M5 10a12 12 0 0 0-1 1M8.5 14.5a6 6 0 0 1 7 0M12 19h.01" /></>,
    star: <path d="m12 3 2.75 5.57 6.15.9-4.45 4.33 1.05 6.12L12 17.03l-5.5 2.89 1.05-6.12L3.1 9.47l6.15-.9Z" />,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 8h18c0-1-3-1-3-8" /><path d="M10 21h4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m16 16 5 5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></>,
    grip: <><circle cx="8" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="8" cy="17" r="1" fill="currentColor" stroke="none" /><circle cx="16" cy="17" r="1" fill="currentColor" stroke="none" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [active]);
}

function BackButton({ fallback = "/", label }) {
  const goBack = () => {
    if (window.history.length > 1) window.history.back();
    else window.location.assign(fallback);
  };
  return (
    <button className="page-back-button" type="button" onClick={goBack}>
      <span aria-hidden="true">←</span>{label}
    </button>
  );
}

function navigateInApp(href, { replace = false } = {}) {
  const target = new URL(href, window.location.href);
  if (target.origin !== window.location.origin) {
    window.location.assign(target.href);
    return;
  }
  const next = `${target.pathname}${target.search}${target.hash}`;
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (next !== current) window.history[replace ? "replaceState" : "pushState"]({}, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.requestAnimationFrame(() => {
    const anchor = target.hash && document.getElementById(decodeURIComponent(target.hash.slice(1)));
    if (anchor) anchor.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0, behavior: "instant" });
  });
}

function appLinkHandler(href) {
  return (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateInApp(href);
  };
}

function BrandMark({ className = "" }) {
  return (
    <svg
      className={`brand-mark ${className}`.trim()}
      viewBox="0 0 32 32"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        className="brand-mark-frame"
        d="M10.5 7.5H7.5v17h3M21.5 7.5h3v17h-3"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.25"
      />
      <path
        className="brand-mark-signal"
        d="m10 20 4.25-4.25 3.5 2.5L22 11.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
      />
      <circle className="brand-mark-point" cx="17.75" cy="18.25" r="1.65" fill="currentColor" />
    </svg>
  );
}

const DATE_TIMESTAMP_CACHE = new Map();
const DATE_FORMATTER_CACHE = new Map();
const FORMATTED_DATE_CACHE = new Map();

function parseDate(date) {
  if (DATE_TIMESTAMP_CACHE.has(date)) return DATE_TIMESTAMP_CACHE.get(date);
  const timestamp = Date.parse(`${date}T12:00:00Z`);
  DATE_TIMESTAMP_CACHE.set(date, timestamp);
  return timestamp;
}

function validIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? "") && Number.isFinite(Date.parse(`${value}T12:00:00Z`));
}

function toIso(timestamp) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function startOfUtcYear(timestamp) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), 0, 1, 12);
}

function getRangeStart(range, endTime, termStart = CURRENT_TERM_START, archiveStart = ARCHIVE_START) {
  const ranges = {
    month: endTime - (31 * DAY),
    three: endTime - (92 * DAY),
    six: endTime - (183 * DAY),
    ytd: startOfUtcYear(endTime),
    year: endTime - (365 * DAY),
    two: endTime - (2 * 365 * DAY),
    election: parseDate(termStart),
    five: endTime - (5 * 365 * DAY),
    ten: endTime - (10 * 365 * DAY),
    all: parseDate(archiveStart),
  };
  return Math.max(ranges[range] ?? ranges.all, parseDate(archiveStart));
}

function adaptivePercentageAxis(values) {
  const finiteValues = values.filter(Number.isFinite);
  if (!finiteValues.length) {
    return { min: 0, max: 40, ticks: [0, 5, 10, 15, 20, 25, 30, 35, 40] };
  }

  const step = 5;
  const dataMin = Math.max(0, Math.min(...finiteValues));
  const dataMax = Math.min(100, Math.max(...finiteValues));
  let min = dataMin >= step
    ? Math.max(step, Math.floor((dataMin - 0.5) / step) * step)
    : 0;
  let max = Math.min(100, Math.ceil((dataMax + 0.5) / step) * step);

  // Keep single-party views readable without turning tiny movements into cliffs.
  while (max - min < 15) {
    if (min >= step) min -= step;
    else if (max <= 100 - step) max += step;
    else break;
  }

  const ticks = Array.from(
    { length: Math.round((max - min) / step) + 1 },
    (_, index) => min + (index * step),
  );
  return { min, max, ticks };
}

function storedPreference(key, fallback, allowed) {
  try {
    const value = window.localStorage.getItem(key);
    return allowed.includes(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

function queryListPreference(query, key, fallback, allowed, enabled) {
  if (!enabled || !query.has(key)) return fallback;
  const raw = query.get(key) ?? "";
  if (raw.length > 512) return fallback;
  if (raw === "") return [];
  const allowedValues = new Set(allowed);
  const values = [...new Set(raw.split(","))]
    .filter((value) => allowedValues.has(value))
    .slice(0, allowedValues.size);
  return values.length ? values : fallback;
}

function allocateSeats(
  results,
  totalSeats = 630,
  partyDefinitions = PARTY_DEFINITIONS,
  thresholdExemptPartyIds = [],
) {
  const thresholdExempt = new Set(thresholdExemptPartyIds);
  const eligible = partyDefinitions
    .map((party) => ({ ...party, value: results[party.id] }))
    .filter((party) => (
      Number.isFinite(party.value)
      && (party.value >= 5 || thresholdExempt.has(party.id))
    ));
  const representedVote = eligible.reduce((sum, party) => sum + party.value, 0);
  if (!representedVote) return { parties: [], representedVote: 0 };

  const quotas = eligible.map((party) => ({ ...party, seats: 0 }));
  for (let seat = 0; seat < totalSeats; seat += 1) {
    const winner = quotas.reduce((best, party) => (
      (party.value / ((2 * party.seats) + 1)) > (best.value / ((2 * best.seats) + 1))
        ? party
        : best
    ), quotas[0]);
    winner.seats += 1;
  }

  return {
    // PARTY_DEFINITIONS is deliberately kept in plenary order, so retaining
    // this order makes the bar read politically from left to right.
    parties: quotas,
    representedVote,
  };
}

const PARLIAMENTARY_POSITION = new Map([
  ["23", -1], // BSW (last official Bundestag seating)
  ["5", 0],   // Linke
  ["2", 1],   // SPD
  ["4", 2],   // Grüne
  ["10", 2.5], // SSW
  ["3", 3],   // FDP
  ["8", 3.5], // Freie Wähler
  ["1", 4],   // CDU/CSU
  ["101", 4],
  ["102", 4],
  ["14", 4.5], // BVB/FW
  ["7", 5],   // AfD
]);

function coalitionOrderScore(parties) {
  let distance = 0;
  for (let left = 0; left < parties.length; left += 1) {
    for (let right = left + 1; right < parties.length; right += 1) {
      const leftPosition = PARLIAMENTARY_POSITION.get(parties[left].id) ?? 2.5;
      const rightPosition = PARLIAMENTARY_POSITION.get(parties[right].id) ?? 2.5;
      distance += Math.abs(leftPosition - rightPosition);
    }
  }

  const combinesAfdWithAnotherParty = parties.some((party) => party.id === "7")
    && parties.some((party) => party.id !== "7");
  return distance + (combinesAfdWithAnotherParty ? 100 : 0);
}

function findMajorities(parties, majority = 316) {
  const combinations = [];
  const visit = (start, targetSize, selected) => {
    if (selected.length === targetSize) {
      const seats = selected.reduce((sum, party) => sum + party.seats, 0);
      if (seats >= majority) combinations.push({ parties: [...selected], seats });
      return;
    }
    for (let index = start; index < parties.length; index += 1) {
      visit(index + 1, targetSize, [...selected, parties[index]]);
    }
  };
  visit(0, 2, []);
  visit(0, 3, []);
  return combinations
    .sort((a, b) => (
      coalitionOrderScore(a.parties) - coalitionOrderScore(b.parties)
      || a.parties.length - b.parties.length
      || b.seats - a.seats
    ))
    .slice(0, 12);
}

function getNumberLocale(locale) {
  return LOCALE_META[locale]?.number ?? "en-GB";
}

function formatDate(date, locale, options = {}) {
  const withYear = Boolean(options.year);
  const cacheKey = `${locale}:${withYear ? "year" : "short"}:${date}`;
  if (FORMATTED_DATE_CACHE.has(cacheKey)) return FORMATTED_DATE_CACHE.get(cacheKey);
  const formatterKey = `${locale}:${withYear ? "year" : "short"}`;
  let formatter = DATE_FORMATTER_CACHE.get(formatterKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(getNumberLocale(locale), {
      day: "numeric",
      month: "short",
      year: withYear ? "numeric" : undefined,
      timeZone: "UTC",
    });
    DATE_FORMATTER_CACHE.set(formatterKey, formatter);
  }
  const formatted = formatter.format(new Date(parseDate(date)));
  FORMATTED_DATE_CACHE.set(cacheKey, formatted);
  return formatted;
}

function averageAtDate(polls, pollsterIds, date, partyIds) {
  const target = parseDate(date);
  const cutoff = target - (45 * DAY);
  const latestByPollster = new Map();
  const selectedPollsters = new Set(pollsterIds);

  for (const poll of polls) {
    const pollDate = parseDate(poll.date);
    if (!selectedPollsters.has(poll.pollster) || pollDate > target || pollDate < cutoff) continue;
    const previous = latestByPollster.get(poll.pollster);
    if (!previous || poll.date > previous.date) latestByPollster.set(poll.pollster, poll);
  }

  const results = {};
  for (const partyId of partyIds) {
    let sum = 0;
    let count = 0;
    for (const poll of latestByPollster.values()) {
      const value = poll.results[partyId];
      if (!Number.isFinite(value)) continue;
      sum += value;
      count += 1;
    }
    if (count) results[partyId] = sum / count;
  }

  return { results, pollsterCount: latestByPollster.size };
}

function makeAverageSeries(polls, pollsterIds, dates, partyIds) {
  if (!dates.length || !pollsterIds.length) return [];
  const selectedPollsters = new Set(pollsterIds);
  const orderedDates = [...new Set(dates)].sort();
  const relevantPolls = polls.filter((poll) => selectedPollsters.has(poll.pollster));
  const latestByPollster = new Map();
  const output = [];
  let pollIndex = 0;

  for (const date of orderedDates) {
    const target = parseDate(date);
    const cutoff = target - (45 * DAY);
    while (pollIndex < relevantPolls.length && parseDate(relevantPolls[pollIndex].date) <= target) {
      const poll = relevantPolls[pollIndex];
      latestByPollster.set(poll.pollster, poll);
      pollIndex += 1;
    }
    const currentPolls = [...latestByPollster.values()]
      .filter((poll) => parseDate(poll.date) >= cutoff);
    if (!currentPolls.length) continue;
    const results = {};
    for (const partyId of partyIds) {
      let sum = 0;
      let count = 0;
      for (const poll of currentPolls) {
        const value = poll.results[partyId];
        if (!Number.isFinite(value)) continue;
        sum += value;
        count += 1;
      }
      if (count) results[partyId] = sum / count;
    }
    output.push({ date, results, pollsterCount: currentPolls.length });
  }
  return output;
}

function smoothTrendSeries(series, partyIds, windowDays) {
  if (windowDays <= 14 || series.length < 3) return series;
  const windowMs = windowDays * DAY;
  return series.map((point, pointIndex) => {
    const pointTime = parseDate(point.date);
    const results = {};
    for (const partyId of partyIds) {
      let weightedTotal = 0;
      let totalWeight = 0;
      const addPoint = (index) => {
        const distance = Math.abs(parseDate(series[index].date) - pointTime);
        const value = series[index].results[partyId];
        if (!Number.isFinite(value)) return;
        const weight = 1 - (distance / (windowMs + 1));
        weightedTotal += value * weight;
        totalWeight += weight;
      };
      for (let index = pointIndex; index >= 0; index -= 1) {
        if (pointTime - parseDate(series[index].date) > windowMs) break;
        addPoint(index);
      }
      for (let index = pointIndex + 1; index < series.length; index += 1) {
        if (parseDate(series[index].date) - pointTime > windowMs) break;
        addPoint(index);
      }
      if (totalWeight) results[partyId] = weightedTotal / totalWeight;
    }
    return { ...point, results, pollsterCount: series[pointIndex].pollsterCount };
  });
}

function makeTrend(polls, pollsterIds, startDate, endDate, partyDefinitions = PARTY_DEFINITIONS, smoothingDays = 14) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const dates = [startDate];
  let cursor = start + (14 * DAY);
  while (cursor < end) {
    dates.push(toIso(cursor));
    cursor += 14 * DAY;
  }
  if (dates.at(-1) !== endDate) dates.push(endDate);

  const partyIds = partyDefinitions.map((party) => party.id);
  return smoothTrendSeries(makeAverageSeries(
    polls,
    pollsterIds,
    dates,
    partyIds,
  ), partyIds, smoothingDays);
}

function interpolateSeriesPoint(points, targetTime, partyIds) {
  if (!points.length) return null;
  const nearest = nearestDateIndex(points, targetTime);
  const nearestTime = parseDate(points[nearest].date);
  const leftIndex = nearestTime <= targetTime ? nearest : Math.max(0, nearest - 1);
  const rightIndex = nearestTime >= targetTime ? nearest : Math.min(points.length - 1, nearest + 1);
  const leftPoint = points[leftIndex];
  const rightPoint = points[rightIndex];
  const leftTime = parseDate(leftPoint.date);
  const rightTime = parseDate(rightPoint.date);
  const ratio = rightTime === leftTime ? 0 : Math.max(0, Math.min(1, (targetTime - leftTime) / (rightTime - leftTime)));
  const results = {};
  for (const partyId of partyIds) {
    const leftValue = leftPoint.results[partyId];
    const rightValue = rightPoint.results[partyId];
    if (Number.isFinite(leftValue) && Number.isFinite(rightValue)) results[partyId] = leftValue + ((rightValue - leftValue) * ratio);
    else if (Number.isFinite(leftValue)) results[partyId] = leftValue;
    else if (Number.isFinite(rightValue)) results[partyId] = rightValue;
  }
  return {
    date: toIso(Math.max(leftTime, Math.min(rightTime, targetTime))),
    results,
    pollsterCount: Math.max(leftPoint.pollsterCount ?? 0, rightPoint.pollsterCount ?? 0),
  };
}

function continuousSmoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) {
    return `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  }
  let path = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];
    const handle = (point.x - previous.x) * 0.34;
    path += ` C ${(previous.x + handle).toFixed(1)} ${previous.y.toFixed(1)}, ${(point.x - handle).toFixed(1)} ${point.y.toFixed(1)}, ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }
  return path;
}

function continuousLinearPath(points) {
  if (!points.length) return "";
  return points
    .map((point, index) => `${index ? "L" : "M"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");
}

function segmentedPath(points, pathBuilder, maxGapDays = Infinity) {
  if (!points.length || !Number.isFinite(maxGapDays)) return pathBuilder(points);
  const segments = [];
  let segment = [];
  for (const point of points) {
    if (segment.length && parseDate(point.date) - parseDate(segment.at(-1).date) > maxGapDays * DAY) {
      segments.push(segment);
      segment = [];
    }
    segment.push(point);
  }
  if (segment.length) segments.push(segment);
  return segments.map(pathBuilder).join(" ");
}

function circleGlyphPath(points, radius) {
  const diameter = radius * 2;
  return points.map((point) => (
    `M ${(point.x - radius).toFixed(1)} ${point.y.toFixed(1)}`
    + ` a ${radius} ${radius} 0 1 0 ${diameter} 0`
    + ` a ${radius} ${radius} 0 1 0 -${diameter} 0`
  )).join(" ");
}

function nearestDateIndex(points, targetTime) {
  if (!points.length) return -1;
  let low = 0;
  let high = points.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (parseDate(points[middle].date) < targetTime) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return 0;
  const before = low - 1;
  return Math.abs(parseDate(points[low].date) - targetTime)
    < Math.abs(parseDate(points[before].date) - targetTime)
    ? low
    : before;
}

function SelectControl({ label, value, onChange, options }) {
  const detailsRef = useRef(null);
  const selectedOption = options.find((option) => option.value === value) ?? options[0];

  const choose = (nextValue) => {
    onChange(nextValue);
    detailsRef.current?.removeAttribute("open");
  };

  return (
    <details className="select-control" ref={detailsRef}>
      <summary>
        <span><small>{label}</small><strong>{selectedOption.label}</strong></span>
        <Icon name="chevron" size={16} />
      </summary>
      <div className="select-menu">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={option.value === value ? "selected" : ""}
            onClick={() => choose(option.value)}
          >
            <span>{option.label}</span>
            {option.value === value && <Icon name="check" size={15} />}
          </button>
        ))}
      </div>
    </details>
  );
}

function useFinePointer() {
  const query = "(hover: hover) and (pointer: fine)";
  const getMatches = () => window.matchMedia(query).matches && (navigator.maxTouchPoints ?? 0) === 0;
  const [matches, setMatches] = useState(getMatches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches && (navigator.maxTouchPoints ?? 0) === 0);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  return matches;
}

function GraphInfoPopover({ locale, title, paragraphs, source = null, className = "" }) {
  const label = locale === "es" ? "Cómo leer este gráfico" : locale === "de" ? "So wird diese Grafik gelesen" : "How to read this chart";
  return (
    <details className={`graph-info-popover ${className}`.trim()} data-export-ignore="true">
      <summary aria-label={label} title={label}><Icon name="info" size={15} /></summary>
      <div className="graph-info-card" role="note">
        <strong>{title || label}</strong>
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        {source && <a href={source.href} target="_blank" rel="noreferrer">{source.label}<Icon name="external" size={12} /></a>}
      </div>
    </details>
  );
}

function mainChartInfo(locale, regionType, mode, weightedUk = false) {
  const language = locale === "es" ? "es" : locale === "de" ? "de" : "en";
  const copy = {
    de: {
      title: "Was zeigt der Verlauf?",
      purpose: "Die Linien zeigen die geschätzte Wahlabsicht der ausgewählten Parteien im gewählten Zeitraum. Sie sind keine Wahlprognose.",
      average: "Für jeden Zeitpunkt zählt je ausgewähltem Institut nur die jüngste Umfrage der vorherigen 45 Tage. Diese Werte werden gleich gewichtet gemittelt.",
      trend: "Im Trendmodus werden die zweiwöchigen Mittelwerte geglättet. Je länger der sichtbare Zeitraum, desto breiter ist das Glättungsfenster. Dadurch wird die Richtung klarer, kurzfristige Ausschläge werden aber gedämpft.",
      linear: "Diese Ansicht verbindet die berechneten Durchschnittspunkte ohne zusätzliche Glättung.",
      points: "Jeder Punkt ist der Durchschnitt der zu diesem Zeitpunkt verfügbaren Institute – nicht eine einzelne Umfrage.",
      both: "Die geglättete Trendlinie und die ungeschönten Durchschnittspunkte werden gemeinsam gezeigt.",
      uk: "Der britische Standard verwendet den qualitätsgewichteten 14-Tage-Durchschnitt des UK Election Data Vault. Pollframe stellt diese Quellwerte dar und glättet sie im Trendmodus passend zum sichtbaren Zeitraum.",
    },
    en: {
      title: "What does this trend show?",
      purpose: "The lines show estimated voting intention for the selected parties over the chosen period. They are not an election forecast.",
      average: "At each date, only each selected pollster’s latest poll from the preceding 45 days is used. Those values receive equal weight in the mean.",
      trend: "Trend mode smooths the fortnightly averages. The longer the visible period, the wider the smoothing window, clarifying direction while muting short-lived changes.",
      linear: "This view connects the calculated average points without additional smoothing.",
      points: "Each point is the mean of the pollsters available at that date, not an individual poll.",
      both: "The smoothed trend and the unsmoothed average points are shown together.",
      uk: "The UK default uses UK Election Data Vault’s quality-weighted 14-day average. Pollframe plots those source values and, in trend mode, smooths them for the visible time span.",
    },
    es: {
      title: "¿Qué muestra la evolución?",
      purpose: "Las líneas muestran la intención de voto estimada para los partidos seleccionados durante el periodo elegido. No son una predicción electoral.",
      average: "En cada fecha solo cuenta la encuesta más reciente de cada instituto seleccionado dentro de los 45 días anteriores. Esos valores tienen el mismo peso en la media.",
      trend: "El modo tendencia suaviza las medias quincenales. Cuanto más largo sea el periodo visible, más amplio será el suavizado: aclara la dirección, pero reduce los movimientos breves.",
      linear: "Esta vista conecta los puntos medios calculados sin suavizado adicional.",
      points: "Cada punto es la media de los institutos disponibles en esa fecha, no una encuesta individual.",
      both: "Se muestran a la vez la tendencia suavizada y los puntos medios sin suavizar.",
      uk: "La vista británica predeterminada usa la media de 14 días ponderada por calidad de UK Election Data Vault. Pollframe representa esos valores y los suaviza según el periodo visible en el modo tendencia.",
    },
  }[language];
  const modeText = mode === "trend" ? copy.trend : mode === "linear" ? copy.linear : mode === "polls" ? copy.points : copy.both;
  return {
    title: copy.title,
    paragraphs: [copy.purpose, weightedUk && regionType === "uk-federal" ? copy.uk : copy.average, modeText],
  };
}

function snapshotInfo(locale, weightedUk = false) {
  if (locale === "es") return {
    title: "Cómo se calcula la media actual",
    paragraphs: ["Cada barra muestra la media más reciente, no el resultado de una sola encuesta.", weightedUk ? "Para Reino Unido se usa la media de 14 días ponderada por calidad de UK Election Data Vault." : "Se usa la encuesta más reciente de cada instituto seleccionado dentro de los últimos 45 días; todos los institutos reciben el mismo peso."],
  };
  if (locale === "de") return {
    title: "So entsteht der aktuelle Mittelwert",
    paragraphs: ["Jeder Balken zeigt den jüngsten Mittelwert – nicht das Ergebnis einer einzelnen Umfrage.", weightedUk ? "Für das Vereinigte Königreich wird der qualitätsgewichtete 14-Tage-Durchschnitt des UK Election Data Vault verwendet." : "Je ausgewähltem Institut zählt die jüngste Umfrage der letzten 45 Tage; alle Institute erhalten dasselbe Gewicht."],
  };
  return {
    title: "How the current average is calculated",
    paragraphs: ["Each bar shows the latest average, not the result of one individual poll.", weightedUk ? "For the UK, Pollframe uses UK Election Data Vault’s quality-weighted 14-day average." : "Each selected pollster contributes its latest poll from the preceding 45 days, with equal weight for every pollster."],
  };
}

function DateRangeSlider({ locale, min, max, start, end, onStart, onEnd }) {
  const isGerman = locale === "de";
  const l = (de, en, es) => locale === "es" ? es : isGerman ? de : en;
  const minTime = parseDate(min);
  const maxTime = parseDate(max);
  const totalDays = Math.max(1, Math.round((maxTime - minTime) / DAY));
  const inputStart = Math.max(0, Math.min(totalDays - 1, Math.round((parseDate(start) - minTime) / DAY)));
  const inputEnd = Math.max(inputStart + 1, Math.min(totalDays, Math.round((parseDate(end) - minTime) / DAY)));
  const [draftStart, setDraftStart] = useState(inputStart);
  const [draftEnd, setDraftEnd] = useState(inputEnd);
  const [activeHandle, setActiveHandle] = useState(null);
  const draftRef = useRef({ start: inputStart, end: inputEnd });
  const committedRef = useRef({ start: inputStart, end: inputEnd });
  useEffect(() => {
    setDraftStart(inputStart);
    draftRef.current.start = inputStart;
    committedRef.current.start = inputStart;
  }, [inputStart]);
  useEffect(() => {
    setDraftEnd(inputEnd);
    draftRef.current.end = inputEnd;
    committedRef.current.end = inputEnd;
  }, [inputEnd]);
  const commit = (kind) => {
    const day = draftRef.current[kind];
    const committedDay = committedRef.current[kind];
    setActiveHandle(null);
    if (day === committedDay) return;
    committedRef.current[kind] = day;
    const iso = toIso(minTime + (day * DAY));
    if (kind === "start") onStart(iso); else onEnd(iso);
  };
  const updateStart = (value) => {
    const day = Math.min(Number(value), draftRef.current.end - 1);
    draftRef.current.start = day;
    setDraftStart(day);
  };
  const updateEnd = (value) => {
    const day = Math.max(Number(value), draftRef.current.start + 1);
    draftRef.current.end = day;
    setDraftEnd(day);
  };
  const startPercent = (draftStart / totalDays) * 100;
  const endPercent = (draftEnd / totalDays) * 100;
  const displayedStart = toIso(minTime + (draftStart * DAY));
  const displayedEnd = toIso(minTime + (draftEnd * DAY));
  const ticks = [0, .25, .5, .75, 1].map((portion) => ({ left: portion * 100, label: new Date(minTime + (totalDays * portion * DAY)).getUTCFullYear() }));
  const selectedDays = Math.max(1, draftEnd - draftStart);
  const selectedTotalMonths = Math.round(selectedDays / 30.44);
  const selectedYears = Math.floor(selectedTotalMonths / 12);
  const selectedMonths = selectedTotalMonths % 12;
  const duration = selectedYears
    ? `${selectedYears} ${l(selectedYears === 1 ? "Jahr" : "Jahre", selectedYears === 1 ? "year" : "years", selectedYears === 1 ? "año" : "años")}${selectedMonths ? ` · ${selectedMonths} ${l("Mon.", "mo", "mes")}` : ""}`
    : selectedMonths
      ? `${selectedMonths} ${l(selectedMonths === 1 ? "Monat" : "Monate", selectedMonths === 1 ? "month" : "months", selectedMonths === 1 ? "mes" : "meses")}`
      : `${selectedDays} ${l(selectedDays === 1 ? "Tag" : "Tage", selectedDays === 1 ? "day" : "days", selectedDays === 1 ? "día" : "días")}`;
  return (
    <div className={`custom-date-slider ${activeHandle ? "is-dragging" : ""}`}>
      <div className="custom-date-header">
        <span>{l("Exakter Zeitraum", "Exact date range", "Periodo exacto")}</span>
        <strong>{duration}</strong>
      </div>
      <div className="custom-date-values" aria-live="polite">
        <span className={activeHandle === "start" ? "active" : ""}><small>{l("Von", "From", "Desde")}</small><strong>{formatDate(displayedStart, locale, { year: true })}</strong></span>
        <i aria-hidden="true">→</i>
        <span className={activeHandle === "end" ? "active" : ""}><small>{l("Bis", "To", "Hasta")}</small><strong>{formatDate(displayedEnd, locale, { year: true })}</strong></span>
      </div>
      <div className="dual-range-shell">
        <div className="dual-range" style={{ "--range-start": `${startPercent}%`, "--range-end": `${endPercent}%` }}>
          <div className="dual-range-track" aria-hidden="true"><i /></div>
          <label className={activeHandle === "start" ? "active" : ""}><span className="sr-only">{l("Beginn des Zeitraums", "Start of date range", "Inicio del periodo")}</span><input type="range" min="0" max={totalDays} value={draftStart} aria-label={l("Beginn des Zeitraums", "Start of date range", "Inicio del periodo")} aria-valuetext={formatDate(displayedStart, locale, { year: true })} onPointerDown={() => setActiveHandle("start")} onPointerUp={() => commit("start")} onPointerCancel={() => commit("start")} onKeyDown={() => setActiveHandle("start")} onKeyUp={() => commit("start")} onBlur={() => commit("start")} onChange={(event) => updateStart(event.target.value)} /></label>
          <label className={activeHandle === "end" ? "active" : ""}><span className="sr-only">{l("Ende des Zeitraums", "End of date range", "Fin del periodo")}</span><input type="range" min="0" max={totalDays} value={draftEnd} aria-label={l("Ende des Zeitraums", "End of date range", "Fin del periodo")} aria-valuetext={formatDate(displayedEnd, locale, { year: true })} onPointerDown={() => setActiveHandle("end")} onPointerUp={() => commit("end")} onPointerCancel={() => commit("end")} onKeyDown={() => setActiveHandle("end")} onKeyUp={() => commit("end")} onBlur={() => commit("end")} onChange={(event) => updateEnd(event.target.value)} /></label>
        </div>
        <div className="dual-range-ticks" aria-hidden="true">{ticks.map((tick, index) => <span key={`${tick.label}-${index}`} style={{ left: `${tick.left}%` }}><i />{tick.label}</span>)}</div>
      </div>
      <p><span className="custom-date-speed-dot" />{activeHandle
        ? l("Vorschau – beim Loslassen wird das Diagramm aktualisiert.", "Previewing — the chart updates when you release.", "Vista previa: el gráfico se actualiza al soltar.")
        : l("Ziehe die beiden Griffe. Das Diagramm wird erst beim Loslassen neu berechnet.", "Drag either handle. The chart recalculates once when you release.", "Arrastra los controles. El gráfico se recalcula una vez al soltar.")}</p>
    </div>
  );
}

function MultiSelect({ label, summary, items, selected, onToggle }) {
  return (
    <details className="multi-select">
      <summary>
        <span><small>{label}</small><strong>{summary}</strong></span>
        <Icon name="chevron" size={16} />
      </summary>
      <div className="multi-menu">
        {items.map((item) => (
          <label key={item.id}>
            <input type="checkbox" checked={selected.includes(item.id)} onChange={() => onToggle(item.id)} />
            <span className="check-box"><Icon name="check" size={14} /></span>
            <span className="multi-label">
              <strong>{item.label}</strong>
              {item.description && <small>{item.description}</small>}
            </span>
          </label>
        ))}
      </div>
    </details>
  );
}

function PollChart({
  t,
  locale,
  selectedParties,
  selectedPollsters,
  selectedEventCategories,
  mode,
  range,
  polls,
  pollsters,
  latestDate,
  displayEndDate = latestDate,
  partyDefinitions = PARTY_DEFINITIONS,
  events = POLITICAL_EVENTS,
  eventCategories = EVENT_CATEGORIES,
  electionResults = ELECTION_RESULTS,
  termStart = CURRENT_TERM_START,
  archiveStart = ARCHIVE_START,
  maxConnectionGapDays = Infinity,
  customStartDate,
  customEndDate,
}) {
  const width = 1320;
  const height = 660;
  const left = 58;
  const right = 130;
  const bottom = 62;
  const innerW = width - left - right;
  const [hover, setHover] = useState(null);
  const [hoverEvent, setHoverEvent] = useState(null);
  const [cursor, setCursor] = useState(null);
  const chartBoundsRef = useRef(null);
  const directEventLinks = useFinePointer();

  useEffect(() => {
    const resetBounds = () => { chartBoundsRef.current = null; };
    window.addEventListener("resize", resetBounds, { passive: true });
    return () => window.removeEventListener("resize", resetBounds);
  }, []);

  const archiveStartTime = parseDate(archiveStart);
  const latestTime = parseDate(displayEndDate);
  const requestedCustomEnd = customEndDate ? parseDate(customEndDate) : latestTime;
  const endTime = range === "custom"
    ? Math.max(archiveStartTime, Math.min(latestTime, requestedCustomEnd))
    : latestTime;
  const requestedCustomStart = customStartDate ? parseDate(customStartDate) : archiveStartTime;
  const startTime = range === "custom"
    ? Math.max(archiveStartTime, Math.min(endTime - DAY, requestedCustomStart))
    : getRangeStart(range, endTime, termStart, archiveStart);
  const startDate = toIso(startTime);
  const endDate = toIso(endTime);
  const spanDays = Math.max(1, (endTime - startTime) / DAY);
  const smoothingDays = spanDays > 3650 ? 112 : spanDays > 1825 ? 84 : spanDays > 730 ? 56 : spanDays > 365 ? 35 : 14;
  const trendVisible = mode === "trend" || mode === "both";
  const averageLineVisible = mode === "linear" || mode === "polls" || mode === "both";
  const averagePointsVisible = mode === "polls" || mode === "both";
  const averageSeriesVisible = averageLineVisible || averagePointsVisible;
  const selectedPollsterSet = useMemo(() => new Set(selectedPollsters), [selectedPollsters]);
  const selectedPartySet = useMemo(() => new Set(selectedParties), [selectedParties]);
  const partyIds = useMemo(() => partyDefinitions.map((party) => party.id), [partyDefinitions]);
  const trend = useMemo(
    () => (trendVisible
      ? makeTrend(polls, selectedPollsters, startDate, endDate, partyDefinitions, smoothingDays)
      : []),
    [trendVisible, polls, selectedPollsters, startDate, endDate, partyDefinitions, smoothingDays],
  );
  const visiblePolls = useMemo(
    () => (averageSeriesVisible ? polls.filter((poll) => (
        selectedPollsterSet.has(poll.pollster)
        && parseDate(poll.date) >= startTime
        && parseDate(poll.date) <= endTime
      )) : []),
    [averageSeriesVisible, polls, selectedPollsterSet, startTime, endTime],
  );
  const averageDates = useMemo(
    () => [...new Set(visiblePolls.map((poll) => poll.date))].sort(),
    [visiblePolls],
  );
  const averagePoints = useMemo(
    () => makeAverageSeries(polls, selectedPollsters, averageDates, partyIds),
    [polls, selectedPollsters, averageDates, partyIds],
  );

  const activeParties = useMemo(
    () => partyDefinitions.filter((party) => selectedPartySet.has(party.id)),
    [partyDefinitions, selectedPartySet],
  );
  const selectedEventCategorySet = useMemo(
    () => new Set(selectedEventCategories),
    [selectedEventCategories],
  );
  const visibleEvents = useMemo(
    () => events.filter((event) => (
      selectedEventCategorySet.has(event.category)
      && parseDate(event.date) >= startTime
      && parseDate(event.date) <= endTime
    )),
    [events, selectedEventCategorySet, startTime, endTime],
  );
  const visibleElections = useMemo(
    () => Object.entries(electionResults)
      .filter(([date]) => parseDate(date) >= startTime && parseDate(date) <= endTime)
      .map(([date, results]) => ({ date, results })),
    [electionResults, startTime, endTime],
  );
  const yAxis = useMemo(() => adaptivePercentageAxis([
    ...trend.flatMap((point) => activeParties.map((party) => point.results[party.id])),
    ...(averageSeriesVisible ? averagePoints.flatMap((point) => activeParties.map((party) => point.results[party.id])) : []),
    ...(trendVisible ? visibleElections.flatMap((election) => activeParties.map((party) => election.results[party.id])) : []),
  ].filter(Number.isFinite)), [trend, activeParties, averageSeriesVisible, averagePoints, trendVisible, visibleElections]);
  const x = (date) => left + ((parseDate(date) - startTime) / Math.max(endTime - startTime, 1)) * innerW;
  const maxEventLabels = spanDays > 3650 ? 8 : spanDays > 1825 ? 10 : 12;
  const labeledEventIds = useMemo(() => {
    if (visibleEvents.length <= maxEventLabels) return new Set(visibleEvents.map((event) => event.id));
    const selected = new Set();
    const bucketWidth = Math.max(1, (endTime - startTime) / maxEventLabels);
    for (let bucket = 0; bucket < maxEventLabels; bucket += 1) {
      const bucketStart = startTime + (bucket * bucketWidth);
      const bucketEnd = bucket === maxEventLabels - 1 ? endTime + 1 : bucketStart + bucketWidth;
      const centre = (bucketStart + bucketEnd) / 2;
      const candidate = visibleEvents
        .filter((event) => {
          const time = parseDate(event.date);
          return time >= bucketStart && time < bucketEnd;
        })
        .sort((a, b) => (
          (a.priority ?? EVENT_LABEL_PRIORITY.get(a.id) ?? 2) - (b.priority ?? EVENT_LABEL_PRIORITY.get(b.id) ?? 2)
          || Math.abs(parseDate(a.date) - centre) - Math.abs(parseDate(b.date) - centre)
        ))[0];
      if (candidate) selected.add(candidate.id);
    }
    if (selected.size < maxEventLabels) {
      [...visibleEvents]
        .filter((event) => !selected.has(event.id))
        .sort((a, b) => (
          (a.priority ?? EVENT_LABEL_PRIORITY.get(a.id) ?? 2) - (b.priority ?? EVENT_LABEL_PRIORITY.get(b.id) ?? 2)
          || parseDate(b.date) - parseDate(a.date)
        ))
        .slice(0, maxEventLabels - selected.size)
        .forEach((event) => selected.add(event.id));
    }
    return selected;
  }, [visibleEvents, maxEventLabels, startTime, endTime]);
  const { eventMarkers, eventLaneCount } = useMemo(() => {
    const laneEnds = [];
    const markers = [...visibleEvents].sort((a, b) => parseDate(a.date) - parseDate(b.date)).map((event) => {
      const markerX = x(event.date);
      const label = eventText(event, locale, "short");
      const showLabel = labeledEventIds.has(event.id);
      if (!showLabel) return { ...event, markerX, label, showLabel };
      const labelWidth = Math.min(240, Math.max(108, (label.length * 7.2) + 26));
      const labelCenter = Math.min(
        width - right - (labelWidth / 2),
        Math.max(left + (labelWidth / 2), markerX),
      );
      const labelStart = labelCenter - (labelWidth / 2);
      const labelEnd = labelCenter + (labelWidth / 2);
      let lane = laneEnds.findIndex((lastEnd) => labelStart >= lastEnd + 10);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = labelEnd;
      return { ...event, lane, markerX, label, labelWidth, labelCenter, showLabel };
    });
    return { eventMarkers: markers, eventLaneCount: laneEnds.length };
  }, [visibleEvents, locale, labeledEventIds, startTime, endTime]);
  const top = Math.max(112, 60 + (eventLaneCount * 31));
  const margin = { top, right, bottom, left };
  const innerH = height - top - bottom;
  const y = (value) => (
    margin.top
    + innerH
    - ((value - yAxis.min) / Math.max(yAxis.max - yAxis.min, 1)) * innerH
  );
  const trendPaths = useMemo(() => new Map(activeParties.map((party) => [
    party.id,
    segmentedPath(trend
      .filter((point) => Number.isFinite(point.results[party.id]))
      .map((point) => ({ date: point.date, x: x(point.date), y: y(point.results[party.id]) })), continuousSmoothPath, maxConnectionGapDays),
  ])), [activeParties, trend, startTime, endTime, top, yAxis.min, yAxis.max, maxConnectionGapDays]);
  const averagePaths = useMemo(() => new Map(activeParties.map((party) => [
    party.id,
    segmentedPath(averagePoints
      .filter((point) => Number.isFinite(point.results[party.id]))
      .map((point) => ({ date: point.date, x: x(point.date), y: y(point.results[party.id]) })), continuousLinearPath, maxConnectionGapDays),
  ])), [activeParties, averagePoints, startTime, endTime, top, yAxis.min, yAxis.max, maxConnectionGapDays]);
  const averagePointRadius = averagePoints.length > 240 ? 2.7 : averagePoints.length > 120 ? 3.3 : 4.2;
  const averagePointStroke = averagePoints.length > 240 ? 1.4 : averagePoints.length > 120 ? 1.7 : 2;
  const averagePointPaths = useMemo(() => new Map(activeParties.map((party) => [
    party.id,
    circleGlyphPath(averagePoints
      .filter((point) => Number.isFinite(point.results[party.id]))
      .map((point) => ({ x: x(point.date), y: y(point.results[party.id]) })), averagePointRadius),
  ])), [activeParties, averagePoints, averagePointRadius, startTime, endTime, top, yAxis.min, yAxis.max]);
  const tickDates = Array.from({ length: 5 }, (_, index) => toIso(startTime + ((endTime - startTime) * index / 4)));
  const labelSeries = trendVisible ? trend : averagePoints;
  const endLabels = useMemo(() => {
    const labels = activeParties
      .map((party) => {
        let point = null;
        for (let index = labelSeries.length - 1; index >= 0; index -= 1) {
          if (Number.isFinite(labelSeries[index].results[party.id])) {
            point = labelSeries[index];
            break;
          }
        }
        return point ? { party, point, value: point.results[party.id], labelY: y(point.results[party.id]) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.labelY - b.labelY);
    const labelGap = 20;
    const labelTop = margin.top + 9;
    const labelBottom = height - margin.bottom - 9;
    labels.forEach((label, index) => {
      label.labelY = Math.max(label.labelY, index === 0 ? labelTop : labels[index - 1].labelY + labelGap);
    });
    for (let index = labels.length - 1; index >= 0; index -= 1) {
      const ceiling = index === labels.length - 1
        ? labelBottom
        : labels[index + 1].labelY - labelGap;
      labels[index].labelY = Math.min(labels[index].labelY, ceiling);
    }
    return labels;
  }, [activeParties, labelSeries, top, yAxis.min, yAxis.max]);
  const inspectionSeries = averageSeriesVisible ? averagePoints : trend;
  const updateInspection = ({ bounds, clientX, clientY }) => {
    if (!inspectionSeries.length) {
      setCursor((current) => (current === null ? current : null));
      return;
    }
    const chartX = ((clientX - bounds.left) / bounds.width) * width;
    const chartY = ((clientY - bounds.top) / bounds.height) * height;
    if (
      chartX < margin.left
      || chartX > width - margin.right
      || chartY < margin.top
      || chartY > height - margin.bottom
    ) {
      setCursor((current) => (current === null ? current : null));
      return;
    }
    const targetTime = startTime + ((chartX - left) / innerW) * (endTime - startTime);
    const nearestPoint = averageSeriesVisible
      ? inspectionSeries[nearestDateIndex(inspectionSeries, targetTime)]
      : interpolateSeriesPoint(inspectionSeries, targetTime, partyIds);
    const values = activeParties
      .map((party) => ({ party, value: nearestPoint.results[party.id] }))
      .filter(({ value }) => Number.isFinite(value));
    if (!values.length) {
      setCursor((current) => (current === null ? current : null));
      return;
    }
    const nearest = values.reduce((candidate, value) => (
      Math.abs(y(value.value) - chartY) < Math.abs(y(candidate.value) - chartY) ? value : candidate
    ), values[0]);
    const nextCursor = {
      date: nearestPoint.date,
      values,
      nearest: {
        ...nearest,
        date: nearestPoint.date,
        x: chartX,
        pollster: t.basedOn(nearestPoint.pollsterCount),
      },
    };
    setCursor((current) => (
      current?.date === nextCursor.date
        && current.nearest.party.id === nextCursor.nearest.party.id
        && Math.abs((current.nearest.x ?? 0) - nextCursor.nearest.x) < 0.5
        ? current
        : nextCursor
    ));
  };
  const inspectChart = (event) => {
    const bounds = chartBoundsRef.current ?? event.currentTarget.getBoundingClientRect();
    chartBoundsRef.current = bounds;
    updateInspection({
      bounds,
      clientX: event.clientX,
      clientY: event.clientY,
    });
  };
  const inspection = hover ?? cursor?.nearest ?? null;
  const activeEvent = hoverEvent;

  return (
    <div className="chart-region">
      <div className="line-legend" aria-label={t.parties}>
        <strong>{t.lineLegend}:</strong>
        {activeParties.map((party) => (
          <span key={party.id}><i style={{ background: party.color }} />{party.name}</span>
        ))}
        <span className="axis-range-note">{t.axisRange(yAxis.min, yAxis.max)}</span>
      </div>
      <div className="chart-stage">
        <span className="chart-scroll-hint">{t.chartSwipe}</span>
        <div className="chart-wrap">
          <svg
            className="poll-chart"
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-labelledby="chart-title chart-desc"
            onPointerEnter={(event) => { chartBoundsRef.current = event.currentTarget.getBoundingClientRect(); }}
            onPointerMove={inspectChart}
            onPointerDown={(event) => {
              inspectChart(event);
              if (!event.target.closest?.(".event-marker")) setHoverEvent(null);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType === "touch") return;
              chartBoundsRef.current = null;
              setCursor(null);
              setHover(null);
            }}
          >
          <title id="chart-title">{t.chartTitle}</title>
          <desc id="chart-desc">{t.chartSubtitle}</desc>
          {yAxis.min > 0 && (
            <text x={margin.left} y={margin.top - 14} className="axis-domain-label">
              {t.axisStart(yAxis.min)}
            </text>
          )}
          {yAxis.ticks.map((tick) => (
            <g key={tick}>
              <line x1={margin.left} x2={width - margin.right} y1={y(tick)} y2={y(tick)} className="grid-line" />
              <text x={margin.left - 14} y={y(tick) + 5} textAnchor="end" className="axis-label">{tick}%</text>
            </g>
          ))}
          {eventMarkers.map((event) => {
            const labelY = event.showLabel ? 18 + (event.lane * 31) : null;
            return (
              <g
                key={event.id}
                className={`event-marker event-${event.category} ${directEventLinks ? "direct-link" : "inspect-only"}`}
                tabIndex={directEventLinks ? "0" : undefined}
                role={directEventLinks ? "link" : undefined}
                aria-label={`${formatDate(event.date, locale, { year: true })} · ${eventText(event, locale)}`}
                onMouseEnter={() => setHoverEvent(event)}
                onMouseLeave={() => setHoverEvent(null)}
                onFocus={() => { if (directEventLinks) setHoverEvent(event); }}
                onBlur={() => { if (directEventLinks) setHoverEvent(null); }}
                onClick={() => {
                  if (directEventLinks) window.open(event.source, "_blank", "noopener,noreferrer");
                  else setHoverEvent(event);
                }}
                onKeyDown={(keyEvent) => {
                  if (!directEventLinks || (keyEvent.key !== "Enter" && keyEvent.key !== " ")) return;
                  keyEvent.preventDefault();
                  window.open(event.source, "_blank", "noopener,noreferrer");
                }}
              >
                <line className="event-hit-target" x1={event.markerX} x2={event.markerX} y1={margin.top} y2={height - margin.bottom} />
                <line
                  className={!event.showLabel && activeEvent?.id !== event.id ? "event-line-minimal" : ""}
                  x1={event.markerX}
                  x2={event.markerX}
                  y1={event.showLabel ? labelY + 24 : margin.top}
                  y2={!event.showLabel && activeEvent?.id !== event.id ? margin.top + 12 : height - margin.bottom}
                />
                {event.showLabel && (
                  <>
                    <rect className="event-label-bg" x={event.labelCenter - (event.labelWidth / 2)} y={labelY} width={event.labelWidth} height="24" rx="6" />
                    <text className="event-label-text" x={event.labelCenter} y={labelY + 16} textAnchor="middle">{event.label}</text>
                  </>
                )}
                <circle className="event-anchor" cx={event.markerX} cy={margin.top} r={event.showLabel ? "3.5" : "5"} />
              </g>
            );
          })}
          {inspection && (
            <line
              className="chart-cursor-line"
              x1={inspection.x ?? x(inspection.date)}
              x2={inspection.x ?? x(inspection.date)}
              y1={margin.top}
              y2={height - margin.bottom}
            />
          )}
          {activeParties.map((party) => (
            <g key={party.id}>
              {trendVisible && trendPaths.get(party.id) && (
                <>
                  <path d={trendPaths.get(party.id)} className="series-halo" />
                  <path d={trendPaths.get(party.id)} className="series-line" style={{ stroke: party.color }} />
                </>
              )}
              {averageLineVisible && averagePaths.get(party.id) && (
                <>
                  <path d={averagePaths.get(party.id)} className="average-series-halo" />
                  <path d={averagePaths.get(party.id)} className="average-series-line" style={{ stroke: party.color }} />
                </>
              )}
              {averagePointsVisible && averagePointPaths.get(party.id) && (
                <path
                  d={averagePointPaths.get(party.id)}
                  className="average-series-points"
                  style={{ stroke: party.color }}
                  strokeWidth={averagePointStroke}
                  aria-hidden="true"
                />
              )}
              {trendVisible && visibleElections.map((election) => {
                const value = election.results[party.id];
                if (!Number.isFinite(value)) return null;
                const sourceLabel = locale === "es" ? "Resultado electoral oficial" : locale === "de" ? "Amtliches Wahlergebnis" : "Official election result";
                return (
                  <rect
                    key={`election-${party.id}-${election.date}`}
                    className="election-point"
                    x={x(election.date) - 4.5}
                    y={y(value) - 4.5}
                    width="9"
                    height="9"
                    rx="1"
                    fill={party.color}
                    transform={`rotate(45 ${x(election.date)} ${y(value)})`}
                    tabIndex="0"
                    role="button"
                    aria-label={`${party.name}: ${value}% · ${sourceLabel} · ${formatDate(election.date, locale, { year: true })}`}
                    onMouseEnter={() => setHover({ party, value, date: election.date, pollster: sourceLabel })}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover({ party, value, date: election.date, pollster: sourceLabel })}
                    onBlur={() => setHover(null)}
                  />
                );
              })}
            </g>
          ))}
          {(trendVisible || averageSeriesVisible) && endLabels.map(({ party, point, value, labelY }) => (
            <g key={`end-label-${party.id}`} className="series-end-label" aria-hidden="true">
              <path
                d={`M${x(point.date) + 4},${y(value)} L${width - margin.right + 7},${labelY}`}
                style={{ stroke: party.color }}
              />
              <circle cx={width - margin.right + 12} cy={labelY} r="3.5" fill={party.color} />
              <text x={width - margin.right + 21} y={labelY + 4}>
                {party.name} {value.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%
              </text>
            </g>
          ))}
          {!hover && cursor?.values.map(({ party, value }) => (
            <circle
              key={`cursor-${party.id}`}
              className="chart-cursor-point"
              cx={cursor.nearest.x ?? x(cursor.date)}
              cy={y(value)}
              r={cursor.nearest.party.id === party.id ? 5 : 3.5}
              fill={party.color}
            />
          ))}
          {tickDates.map((date, index) => (
            <text key={date} x={x(date)} y={height - 20} textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"} className="axis-label">
              {range === "all" || spanDays > 2_500
                ? new Date(parseDate(date)).getUTCFullYear()
                : formatDate(date, locale, { year: spanDays > 450 || index === 0 || index === 4 })}
            </text>
          ))}
          {inspection && (
            <g
              className="chart-tooltip"
              transform={`translate(${
                (inspection.x ?? x(inspection.date)) > width - 282 ? (inspection.x ?? x(inspection.date)) - 258 : (inspection.x ?? x(inspection.date)) + 15
              }, ${Math.min(Math.max(y(inspection.value) - 94, margin.top + 8), height - margin.bottom - 96)})`}
            >
              <rect width="246" height="88" rx="11" />
              <circle cx="17" cy="20" r="4.5" fill={inspection.party.color} />
              <text x="30" y="24" className="tooltip-name">{inspection.party.name} · {inspection.value.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%</text>
              <text x="15" y="54" className="tooltip-date">{formatDate(inspection.date, locale, { year: true })}</text>
              <text x="15" y="76" className="tooltip-meta">{inspection.pollster}</text>
            </g>
          )}
          </svg>
        </div>
        {activeEvent && (
          <aside className={`event-hover-card event-${activeEvent.category}`} aria-live="polite">
            <div>
              <span>{eventCategoryText(eventCategories.find((category) => category.id === activeEvent.category) ?? {}, locale)}</span>
              <time dateTime={activeEvent.date}>{formatDate(activeEvent.date, locale, { year: true })}</time>
            </div>
            <strong>{eventText(activeEvent, locale)}</strong>
            <p>{eventText(activeEvent, locale, "detail")}</p>
          </aside>
        )}
      </div>
      {eventMarkers.length > 0 && (
        <details className="event-key">
          <summary>
            <span>
              <strong>{t.eventsShown}</strong>
              <small>{t.eventEntries(eventMarkers.length)}</small>
            </span>
            <Icon name="chevron" size={16} />
          </summary>
          <div className="event-key-body">
            <p>{t.eventsNote}</p>
            <div className="event-key-list">
              {eventMarkers.map((event) => (
                <a key={event.id} href={event.source} target="_blank" rel="noreferrer" className={`event-key-item event-${event.category}`}>
                  <span className="event-number" aria-hidden="true" />
                  <span>
                    <time dateTime={event.date}>{formatDate(event.date, locale, { year: true })}</time>
                    <strong>{eventText(event, locale)}</strong>
                  </span>
                  <Icon name="external" size={13} />
                </a>
              ))}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}

function ResultsCard({ t, locale, current, previous, date, partyDefinitions = PARTY_DEFINITIONS, statusLabel = null, region = REGION_META[0] }) {
  const [showAll, setShowAll] = useState(false);
  const numberLocale = getNumberLocale(locale);
  const info = snapshotInfo(locale, region.type === "uk-federal" && Boolean(statusLabel));
  const rows = partyDefinitions
    .map((party) => ({
      ...party,
      value: current.results[party.id],
      delta: current.results[party.id] - previous.results[party.id],
    }))
    .filter((party) => Number.isFinite(party.value))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="results-card" aria-labelledby="snapshot-title">
      <div className="card-heading">
        <div>
          <p className="section-label">{t.current}</p>
          <h2 id="snapshot-title">{formatDate(date, locale, { year: true })}</h2>
        </div>
        <div className="card-heading-actions"><span className="status-dot"><i /> {statusLabel ?? t.basedOn(current.pollsterCount)}</span><GraphInfoPopover locale={locale} title={info.title} paragraphs={info.paragraphs} className="graph-info-compact" /><WatchlistStar country={region.type === "uk-federal" ? "uk" : region.type === "spain-federal" ? "es" : "de"} regionSlug={region.slug} regionName={region.name} type="snapshot" partyIds={[]} label={`${region.name} · ${t.current}`} /></div>
      </div>
      <div className="result-list">
        {(region.type === "spain-federal" && !showAll ? rows.slice(0, 8) : rows).map((party) => (
          <div className="result-row" key={party.id}>
            <div className="party-name"><span style={{ background: party.color }} />{party.name}</div>
            <div className="result-bar"><i style={{ width: `${(party.value / 30) * 100}%`, background: party.color }} /></div>
            <strong>{party.value.toLocaleString(numberLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</strong>
            <span className={`delta ${party.delta > 0.04 ? "up" : party.delta < -0.04 ? "down" : ""}`}>
              {Number.isFinite(party.delta) ? `${party.delta > 0 ? "+" : ""}${party.delta.toLocaleString(numberLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}` : "–"}
            </span>
          </div>
        ))}
      </div>
      {region.type === "spain-federal" && rows.length > 8 && <button className="results-more" type="button" onClick={() => setShowAll((value) => !value)}>{showAll ? (locale === "es" ? "Mostrar menos" : locale === "de" ? "Weniger anzeigen" : "Show fewer") : (locale === "es" ? `Ver ${rows.length - 8} partidos más` : locale === "de" ? `${rows.length - 8} weitere Parteien` : `${rows.length - 8} more parties`)}</button>}
      <div className="results-note"><Icon name="info" size={16} /><span>{t.compared}</span></div>
    </section>
  );
}

function TendencySection({ t, locale, current, baseline, onSelectParty, partyDefinitions = PARTY_DEFINITIONS, region = REGION_META[0] }) {
  const numberLocale = getNumberLocale(locale);
  const rows = partyDefinitions
    .map((party) => {
      const value = current.results[party.id];
      const previousValue = baseline.results[party.id];
      const delta = Number.isFinite(value) && Number.isFinite(previousValue) ? value - previousValue : null;
      let status = t.tendencyUnavailable;
      let direction = "unavailable";
      if (Number.isFinite(delta)) {
        if (delta >= 1.2) {
          status = t.tendencyRising;
          direction = "up";
        } else if (delta >= 0.4) {
          status = t.tendencySlightRising;
          direction = "up";
        } else if (delta <= -1.2) {
          status = t.tendencyFalling;
          direction = "down";
        } else if (delta <= -0.4) {
          status = t.tendencySlightFalling;
          direction = "down";
        } else {
          status = t.tendencyStable;
          direction = "stable";
        }
      }
      return { ...party, value, delta, status, direction };
    })
    .filter((party) => Number.isFinite(party.value))
    .sort((a, b) => b.value - a.value);

  return (
    <section className="tendency-section" aria-labelledby="tendency-title">
      <div className="tendency-heading">
        <h3 id="tendency-title">{t.tendencies}</h3>
        <p>{t.tendenciesIntro}</p>
      </div>
      <div className="tendency-grid">
        {rows.map((party) => (
          <article className="tendency-card" key={party.id}>
            <button type="button" className="tendency-card-main" onClick={() => onSelectParty(party)} aria-label={t.openParty(party.name)}>
              <div className="tendency-party"><span style={{ background: party.color }} /><strong>{party.name}</strong><b>{party.value.toLocaleString(numberLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</b></div>
              <div className={`tendency-status ${party.direction}`}>{party.status}</div>
              <p>{Number.isFinite(party.delta) ? t.percentagePoints90(party.delta) : t.tendencyUnavailable}</p>
              <span className="tendency-open" aria-hidden="true">↗</span>
            </button>
            <WatchlistStar country={region.type === "uk-federal" ? "uk" : region.type === "spain-federal" ? "es" : "de"} regionSlug={region.slug} regionName={region.name} partyIds={[party.id]} label={`${party.name} · ${region.name}`} className="tendency-watch-star" />
          </article>
        ))}
      </div>
    </section>
  );
}

function normaliseSearch(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

const UK_POSTCODE_PATTERN = /\b(GIR\s?0AA|(?:[A-PR-UWYZ][0-9][0-9A-HJKSTUW]?|[A-PR-UWYZ][A-HK-Y][0-9][0-9ABEHMNPRV-Y]?)\s?[0-9][ABD-HJLNP-UW-Z]{2})\b/i;
const UK_OUTCODE_PATTERN = /^(?:GIR|[A-PR-UWYZ][0-9][0-9A-HJKSTUW]?|[A-PR-UWYZ][A-HK-Y][0-9][0-9ABEHMNPRV-Y]?)$/i;

function safeConstituencyQuery(value) {
  return String(value ?? "").slice(0, 80).replace(/[<>\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trimStart();
}

function extractUKPostcode(value) {
  const match = String(value ?? "").toUpperCase().match(UK_POSTCODE_PATTERN);
  return match ? match[1].replace(/\s+/g, "") : "";
}

function extractUKOutcode(value) {
  const compact = String(value ?? "").toUpperCase().replace(/\s+/g, "");
  return UK_OUTCODE_PATTERN.test(compact) ? compact : "";
}

function boundedEditDistance(left, right, limit) {
  if (Math.abs(left.length - right.length) > limit) return limit + 1;
  let previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let row = 1; row <= left.length; row += 1) {
    const current = [row];
    let minimum = row;
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + cost);
      minimum = Math.min(minimum, current[column]);
    }
    if (minimum > limit) return limit + 1;
    previous = current;
  }
  return previous[right.length];
}

function constituencySearchScore(query, constituency) {
  const needle = normaliseSearch(query);
  const name = normaliseSearch(constituency.name);
  const code = normaliseSearch(constituency.code);
  if (!needle) return Number.POSITIVE_INFINITY;
  if (needle === name || needle === code) return 0;
  if (name.startsWith(needle)) return 1;
  if (name.includes(needle) || code.includes(needle)) return 2;
  const queryWords = needle.split(" ");
  const nameWords = name.split(" ");
  if (queryWords.every((word) => nameWords.some((candidate) => candidate.startsWith(word)))) return 3;
  if (needle.length < 4) return Number.POSITIVE_INFINITY;
  const limit = Math.max(1, Math.min(5, Math.floor(needle.length * 0.28)));
  const distance = boundedEditDistance(needle, name, limit);
  return distance <= limit ? 4 + (distance / Math.max(needle.length, 1)) : Number.POSITIVE_INFINITY;
}

function rankConstituencies(query, constituencies, limit = 8) {
  return constituencies.map((seat) => ({ seat, score: constituencySearchScore(query, seat) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((left, right) => left.score - right.score || left.seat.name.localeCompare(right.seat.name))
    .slice(0, limit);
}

function standardPollingSnapshot(pollData, partyDefinitions = PARTY_DEFINITIONS) {
  if (!pollData?.polls?.length) return null;
  const latestDate = pollData.polls.at(-1).date;
  const ids = partyDefinitions.filter((party) => pollData.parties?.[party.id]).map((party) => party.id);
  const pollsters = pollData.metadata?.defaultPollsters ?? Object.keys(pollData.pollsters ?? {});
  const average = averageAtDate(pollData.polls, pollsters, latestDate, ids);
  return { date: latestDate, results: average.results };
}

function SinceLastVisit({ locale, country, snapshot, partyDefinitions }) {
  const [changes, setChanges] = useState(null);
  const isGerman = locale === "de";
  useEffect(() => {
    if (!snapshot?.date || !snapshot?.results) return;
    const storageKey = `pollframe-last-snapshot-${country}`;
    try {
      const previous = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (previous?.results) {
        const visible = partyDefinitions.map((party) => {
          const now = Number(snapshot.results[party.id]);
          const then = Number(previous.results[party.id]);
          if (!Number.isFinite(now) || !Number.isFinite(then)) return null;
          const delta = Math.round((now - then) * 10) / 10;
          return Math.abs(delta) >= 0.1 ? { ...party, delta, now } : null;
        }).filter(Boolean).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, 4);
        setChanges(visible.length ? { items: visible, previousDate: previous.date } : null);
      }
      window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    } catch {
      setChanges(null);
    }
  }, [country, snapshot, partyDefinitions]);
  if (!changes) return null;
  return (
    <section className="since-visit" aria-labelledby={`since-visit-${country}`}>
      <div><p className="section-label">{isGerman ? "Seit deinem letzten Besuch" : "Since your last visit"}</p><h2 id={`since-visit-${country}`}>{isGerman ? "Das hat sich verändert" : "What changed"}</h2></div>
      <div className="since-visit-items">{changes.items.map((party) => <div key={party.id}><span><i style={{ background: party.color }} />{party.name}</span><strong className={party.delta > 0 ? "up" : "down"}>{party.delta > 0 ? "+" : ""}{party.delta.toLocaleString(getNumberLocale(locale), { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</strong><small>{isGerman ? "Punkte" : "points"}</small></div>)}</div>
      <small>{isGerman ? `Verglichen mit deinem zuletzt gespeicherten Stand${changes.previousDate ? ` vom ${formatDate(changes.previousDate, locale, { year: true })}` : ""}. Nur echte Änderungen ab 0,1 Punkten werden gezeigt.` : `Compared with your last saved view${changes.previousDate ? ` on ${formatDate(changes.previousDate, locale, { year: true })}` : ""}. Only actual changes of 0.1 points or more appear.`}</small>
    </section>
  );
}

function UKConstituencyPage({ locale, constituencyData }) {
  const isGerman = locale === "de";
  const query = new URLSearchParams(window.location.search);
  const initialSlug = query.get("seat");
  const [selectedSlug, setSelectedSlug] = useState(() => constituencyData.constituencies.some((seat) => seat.slug === initialSlug) ? initialSlug : "");
  const initialSeat = constituencyData.constituencies.find((seat) => seat.slug === initialSlug);
  const [search, setSearch] = useState(initialSeat?.name ?? "");
  const [searchStatus, setSearchStatus] = useState("");
  const [remoteMatches, setRemoteMatches] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef(null);
  const lookupControllerRef = useRef(null);
  const revealMobileSearch = () => {
    if (!window.matchMedia("(max-width: 600px)").matches) return;
    window.requestAnimationFrame(() => {
      searchInputRef.current?.closest(".constituency-finder")?.scrollIntoView({ block: "start" });
    });
  };
  useEffect(() => {
    const closeSuggestions = (event) => { if (!event.target.closest(".constituency-search-form")) setSearchOpen(false); };
    document.addEventListener("pointerdown", closeSuggestions);
    return () => {
      document.removeEventListener("pointerdown", closeSuggestions);
      lookupControllerRef.current?.abort();
    };
  }, []);
  const selected = constituencyData.constituencies.find((seat) => seat.slug === selectedSlug);
  const localMatches = useMemo(() => rankConstituencies(search, constituencyData.constituencies), [search, constituencyData]);
  const matches = remoteMatches.length ? remoteMatches : localMatches.map(({ seat }) => ({ seat, context: seat.region && seat.region !== seat.country ? `${seat.country} · ${seat.region}` : seat.country }));
  const closeResults = useMemo(() => constituencyData.constituencies.map((constituency) => {
    const resultRows = Object.values(constituency.results).sort((a, b) => b.share - a.share);
    return { constituency, margin: (resultRows[0]?.share ?? 0) - (resultRows[1]?.share ?? 0) };
  }).sort((a, b) => a.margin - b.margin).slice(0, 10), [constituencyData]);
  const selectSeat = (slug, status = "") => {
    const seat = constituencyData.constituencies.find((item) => item.slug === slug);
    if (!seat) return;
    setSelectedSlug(slug);
    setSearch(seat.name);
    setRemoteMatches([]);
    setSearchOpen(false);
    setSearchStatus(status);
    const url = new URL(window.location.href);
    url.searchParams.set("seat", slug);
    window.history.replaceState({}, "", url);
  };

  const seatsForNames = (names, context) => {
    const seen = new Set();
    return names.flatMap((name) => {
      const ranked = rankConstituencies(name, constituencyData.constituencies, 1);
      const candidate = ranked[0];
      if (!candidate || candidate.score > 3 || seen.has(candidate.seat.slug)) return [];
      seen.add(candidate.seat.slug);
      return [{ seat: candidate.seat, context }];
    });
  };

  const fetchLookup = async (path, signal) => {
    const response = await fetch(`https://api.postcodes.io${path}`, { cache: "no-store", credentials: "omit", headers: { Accept: "application/json" }, mode: "cors", referrerPolicy: "no-referrer", signal });
    const length = Number(response.headers.get("content-length"));
    if (!response.ok || (Number.isFinite(length) && length > 250_000)) throw new Error("lookup failed");
    const type = response.headers.get("content-type") ?? "";
    if (!type.toLowerCase().includes("json")) throw new Error("unexpected response");
    const body = await response.text();
    if (body.length > 250_000) throw new Error("response too large");
    return JSON.parse(body);
  };

  const resolveOutcode = async (outcode, context, signal) => {
    if (outcode.startsWith("BT")) return [];
    const payload = await fetchLookup(`/outcodes/${encodeURIComponent(outcode)}`, signal);
    const names = Array.isArray(payload.result?.parliamentary_constituency) ? payload.result.parliamentary_constituency.slice(0, 8) : [];
    return seatsForNames(names, context || outcode);
  };

  const findConstituency = async (event) => {
    event.preventDefault();
    const safeQuery = safeConstituencyQuery(search).trim();
    if (!safeQuery || isSearching) return;
    const postcode = extractUKPostcode(safeQuery);
    const outcode = postcode ? "" : extractUKOutcode(safeQuery);
    const firstLocal = localMatches[0];
    const secondLocal = localMatches[1];
    const localLeadIsClear = !secondLocal || secondLocal.score - firstLocal.score > 0.08;
    const confidentLocal = firstLocal && (firstLocal.score === 0 || (firstLocal.score < 4.5 && localLeadIsClear)) ? firstLocal.seat : null;
    if (confidentLocal && !postcode && !outcode) {
      selectSeat(confidentLocal.slug);
      return;
    }
    if (!postcode && !outcode && firstLocal?.score <= 3 && !localLeadIsClear) {
      setRemoteMatches([]);
      setSearchOpen(true);
      setSearchStatus(isGerman ? "Mehrere Wahlkreise passen. Wähle den richtigen aus der Liste." : "Several constituencies match. Choose the right one from the list.");
      return;
    }
    const compactLocation = normaliseSearch(safeQuery).replace(/\b(?:road|rd|street|st|avenue|ave|lane|ln|drive|dr|close|court|house|flat)\b/g, " ").replace(/\b\d+[a-z]?\b/g, " ").replace(/\s+/g, " ").trim();
    lookupControllerRef.current?.abort();
    const controller = new AbortController();
    lookupControllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 7_000);
    setIsSearching(true);
    setRemoteMatches([]);
    setSearchOpen(false);
    setSearchStatus(isGerman ? "Wahlkreis wird gesucht …" : "Finding your constituency…");
    try {
      let found = [];
      let broaderArea = "";
      if (postcode) {
        if (postcode.startsWith("BT")) throw new Error("northern-ireland");
        try {
          const formattedPostcode = `${postcode.slice(0, -3)} ${postcode.slice(-3)}`;
          const payload = await fetchLookup(`/postcodes?query=${encodeURIComponent(formattedPostcode)}&limit=5`, controller.signal);
          const results = Array.isArray(payload.result) ? payload.result : [];
          const exact = results.find((item) => String(item.postcode ?? "").replace(/\s+/g, "").toUpperCase() === postcode);
          if (!exact) throw new Error("exact postcode not found");
          const name = exact.parliamentary_constituency_2024 ?? exact.parliamentary_constituency;
          found = seatsForNames(name ? [name] : [], exact.postcode ?? postcode);
        } catch (error) {
          if (controller.signal.aborted) throw error;
          broaderArea = postcode.slice(0, -3);
          found = await resolveOutcode(broaderArea, `${isGerman ? "Größeres Postcode-Gebiet" : "Broader postcode area"} ${broaderArea}`, controller.signal);
        }
      } else if (outcode) {
        if (outcode.startsWith("BT")) throw new Error("northern-ireland");
        found = await resolveOutcode(outcode, `${isGerman ? "Postleitzahlgebiet" : "Postcode area"} ${outcode}`, controller.signal);
      } else {
        const tokens = compactLocation.split(" ").filter((token) => token.length > 1);
        const placeQueries = [...new Set([
          tokens.slice(-3).join(" "),
          tokens.slice(-2).join(" "),
          tokens.at(-1),
        ].filter(Boolean))].slice(0, 3);
        for (const placeQuery of placeQueries) {
          const payload = await fetchLookup(`/places?q=${encodeURIComponent(placeQuery)}&limit=5`, controller.signal);
          const places = Array.isArray(payload.result) ? payload.result.slice(0, 5) : [];
          const relevant = places.filter((place) => normaliseSearch(`${place.name_1 ?? ""} ${place.name_2 ?? ""}`).includes(normaliseSearch(placeQuery))).slice(0, 3);
          const outcodes = [...new Set(relevant.map((place) => String(place.outcode ?? "").toUpperCase()).filter((value) => UK_OUTCODE_PATTERN.test(value) && !value.startsWith("BT")))].slice(0, 3);
          const results = await Promise.all(outcodes.map((value) => resolveOutcode(value, `${relevant.find((place) => String(place.outcode).toUpperCase() === value)?.name_1 ?? placeQuery} · ${value}`, controller.signal).catch(() => [])));
          found = results.flat();
          if (found.length) break;
        }
      }
      const unique = [...new Map(found.map((item) => [item.seat.slug, item])).values()].slice(0, 8);
      if (!unique.length) throw new Error("not found");
      if (unique.length === 1) selectSeat(unique[0].seat.slug, `${isGerman ? "Gefunden" : "Found"}: ${unique[0].seat.name}${broaderArea ? ` · ${isGerman ? "über das Gebiet" : "via area"} ${broaderArea}` : ""}`);
      else {
        setRemoteMatches(unique);
        setSearchOpen(true);
        setSearchStatus(broaderArea
          ? (isGerman ? `Der genaue Postcode wurde nicht gefunden. Das größere Gebiet ${broaderArea} berührt mehrere Wahlkreise – wähle den passenden aus.` : `The exact postcode was not found. The broader ${broaderArea} area overlaps several constituencies—choose the right one.`)
          : (isGerman ? "Dieses Gebiet berührt mehrere Wahlkreise. Wähle den passenden aus." : "This area overlaps more than one constituency. Choose the right one below."));
      }
    } catch {
      const isNorthernIreland = postcode.startsWith("BT") || outcode.startsWith("BT");
      setSearchStatus(isNorthernIreland
        ? (isGerman ? "Für nordirische BT-Postleitzahlen ist keine passende kommerzielle Geodatenlizenz eingebunden. Suche stattdessen nach dem Wahlkreisnamen." : "Northern Irish BT postcode lookup needs separate licensed data. Search by constituency name instead.")
        : (isGerman ? "Kein eindeutiger Treffer. Versuche den vollständigen Postcode, den Ort oder den Wahlkreisnamen." : "No clear match. Try the full postcode, town or constituency name."));
      setSearchOpen(Boolean(localMatches.length));
    } finally {
      window.clearTimeout(timeout);
      if (lookupControllerRef.current === controller) lookupControllerRef.current = null;
      setIsSearching(false);
    }
  };
  const rows = selected ? Object.entries(selected.results).map(([id, result]) => ({
    id,
    share: result.share,
    votes: result.votes,
    party: UK_MAP_PARTY_DEFINITIONS.find((party) => party.id === id) ?? { name: "Other", color: "#737b84" },
  })).sort((a, b) => b.share - a.share) : [];
  const winner = UK_MAP_PARTY_DEFINITIONS.find((party) => party.id === selected?.winner?.partyId) ?? UK_PARTY_DEFINITIONS.find((party) => party.id === selected?.winner?.partyId);
  useEffect(() => {
    updatePageMetadata({
      title: selected ? `${selected.name} · Wahlergebnis 2024 · Pollframe` : (isGerman ? "Britische Wahlkreisergebnisse 2024 · Pollframe" : "UK constituency results 2024 · Pollframe"),
      description: isGerman ? "Wahlkreissuche und amtliche Ergebnisse der Unterhauswahl 2024 für alle 650 britischen Wahlkreise." : "Constituency search and official 2024 general-election results for all 650 UK constituencies.",
      canonicalPath: selected ? `/?view=uk-constituencies&seat=${encodeURIComponent(selected.slug)}` : "/?view=uk-constituencies",
      locale,
      indexable: true,
    });
  }, [selected, locale, isGerman]);
  return (
    <main id="top" className="constituency-page">
      <nav className="region-breadcrumb"><BackButton fallback="/?country=uk" label={isGerman ? "Zurück" : "Back"} /><span>/</span><a href="/?country=uk">{isGerman ? "UK-Übersicht" : "UK overview"}</a><span>/</span><strong>{isGerman ? "Wahlkreise" : "Constituencies"}</strong></nav>
      <section className="constituency-hero"><div><p className="section-label">650 {isGerman ? "Unterhauswahlkreise" : "Commons constituencies"}</p><h1>{isGerman ? "Finde deinen Wahlkreis" : "Find your constituency"}</h1><p>{isGerman ? "Gib einen Postcode, einen Ort oder den Wahlkreisnamen ein. Pollframe zeigt anschließend ausschließlich das amtliche Ergebnis der Unterhauswahl 2024." : "Enter a postcode, town or constituency name. Pollframe then shows only the official result of the 2024 general election."}</p></div></section>
      <section className="constituency-finder" aria-label={isGerman ? "Wahlkreissuche" : "Constituency search"}>
        <form className="finder-field constituency-search-form" onSubmit={findConstituency}>
          <label htmlFor="seat-search">{isGerman ? "Postcode, Ort oder Wahlkreis" : "Postcode, town or constituency"}</label>
          <div className="constituency-search-box"><Icon name="search" size={19} /><input ref={searchInputRef} id="seat-search" type="search" value={search} maxLength={80} onFocus={() => { setSearchOpen(Boolean(search.trim() && matches.length)); revealMobileSearch(); }} onChange={(event) => { setSearch(safeConstituencyQuery(event.target.value)); setRemoteMatches([]); setSearchStatus(""); setSearchOpen(true); }} placeholder={isGerman ? "z. B. SK17 6BE, Buxton oder High Peak" : "e.g. SK17 6BE, Buxton or High Peak"} autoComplete="postal-code" autoCapitalize="words" spellCheck="false" enterKeyHint="search" /><button className="primary-button" type="submit" disabled={isSearching}>{isSearching ? (isGerman ? "Suche …" : "Searching…") : (isGerman ? "Suchen" : "Search")}</button></div>
          {searchOpen && matches.length > 0 && <div className="finder-results" role="listbox" aria-label={isGerman ? "Suchvorschläge" : "Search suggestions"}>{matches.map(({ seat, context }) => <button key={seat.code} type="button" role="option" aria-selected={seat.slug === selectedSlug} onClick={() => selectSeat(seat.slug)}><span><strong>{seat.name}</strong><small>{context}</small></span><span>→</span></button>)}</div>}
          <div className="finder-feedback">{searchStatus ? <small role="status">{searchStatus}</small> : <small>{isGerman ? "Auch vollständige Adressen mit enthaltenem Postcode und Postcode-Gebiete wie SK17 funktionieren." : "Full addresses containing a postcode and postcode areas such as SK17 work too."}</small>}<small>{isGerman ? "Erst beim Suchen wird nur der benötigte Postcode oder Ortsbegriff an Postcodes.io übertragen. Pollframe speichert ihn nicht." : "Only after you search is the required postcode or place term sent to Postcodes.io. Pollframe does not store it."}</small></div>
        </form>
        {selected && <div className="selected-constituency" aria-live="polite"><span><Icon name="check" size={16} /><small>{isGerman ? "Ausgewählter Wahlkreis" : "Selected constituency"}</small><strong>{selected.name}</strong></span><button type="button" onClick={() => { setSearch(""); setSearchStatus(""); setRemoteMatches([]); setSearchOpen(false); window.requestAnimationFrame(() => searchInputRef.current?.focus()); }}>{isGerman ? "Ändern" : "Change"}</button></div>}
      </section>

      {selected ? <section className="constituency-detail">
        <div className="constituency-title"><div><p className="section-label">{selected.country}{selected.region !== selected.country ? ` · ${selected.region}` : ""}</p><h2>{selected.name}</h2><small>{selected.code} · {selected.electorate.toLocaleString(getNumberLocale(locale))} {isGerman ? "Wahlberechtigte 2024" : "electors in 2024"}</small></div><button className="secondary-button" type="button" onClick={() => { setSearch(""); setSearchStatus(""); setRemoteMatches([]); setSearchOpen(false); window.requestAnimationFrame(() => searchInputRef.current?.focus()); }}>{isGerman ? "Andere suchen" : "Find another"}</button></div>
        <div className="constituency-columns official-only"><article><p className="section-label uk-historical-label">{isGerman ? "Amtliches Wahlergebnis · 4. Juli 2024" : "Official election result · 4 July 2024"}</p><h3><i style={{ background: winner?.color }} />{winner?.name ?? "Other"}</h3><strong>{selected.winner.candidate}</strong><span>{isGerman ? "Vorsprung vor Platz zwei" : "Lead over second place"}: {selected.winner.majority.toLocaleString(getNumberLocale(locale))} {isGerman ? "Stimmen" : "votes"}</span><a href={selected.sourceUrl} target="_blank" rel="noreferrer">{isGerman ? "Quelle beim UK Parliament" : "Source at UK Parliament"}<Icon name="external" size={14} /></a></article></div>
        <div className="constituency-chart-heading"><strong>{isGerman ? "Amtliche Stimmenanteile der Wahl 2024" : "Official vote shares at the 2024 election"}</strong><small>{selected.validVotes.toLocaleString(getNumberLocale(locale))} {isGerman ? "gültige Stimmen" : "valid votes"}</small></div>
        <div className="constituency-result-list" aria-label={isGerman ? "Amtliche Stimmenanteile 2024" : "Official 2024 vote shares"}>{rows.map((row) => <div key={row.id}><span><i style={{ background: row.party.color }} />{row.party.name}</span><div><i style={{ width: `${row.share}%`, background: row.party.color }} /></div><strong>{row.share.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%</strong></div>)}</div>
        <p className="projection-method"><Icon name="info" size={15} />{isGerman ? "Diese Ansicht enthält keine Hochrechnung und keine Schätzung für heute. Gezeigt werden ausschließlich die vom UK Parliament veröffentlichten Ergebnisse der Unterhauswahl 2024." : "This view contains no projection or estimate for today. It shows only the 2024 general-election results published by the UK Parliament."}</p>
      </section> : <section className="battleground-list"><div><p className="section-label">{isGerman ? "Knappste Ergebnisse 2024" : "Closest results in 2024"}</p><h2>{isGerman ? "Wahlkreise zum Erkunden" : "Constituencies to explore"}</h2></div><div>{closeResults.map(({ constituency, margin }) => <button type="button" key={constituency.code} onClick={() => selectSeat(constituency.slug)}><span><strong>{constituency.name}</strong><small>{constituency.country}</small></span><b>{margin.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })} pp</b></button>)}</div></section>}
      <p className="constituency-source">
        {isGerman ? "Quelle: UK Parliament. " : "Source: UK Parliament. "}
        Contains Parliamentary information licensed under the <a href="https://www.parliament.uk/site-information/copyright/open-parliament-licence/" target="_blank" rel="noreferrer">Open Parliament Licence v3.0</a>.
        {isGerman ? " Postleitzahlsuche: Postcodes.io und OS OpenData (Großbritannien)." : " Postcode lookup: Postcodes.io and OS OpenData (Great Britain)."}
      </p>
    </main>
  );
}

function UKVotesVsSeats({ locale, pollData }) {
  const [mode, setMode] = useState("votes");
  const [showMinorParties, setShowMinorParties] = useState(false);
  const [compact, setCompact] = useState(() => window.matchMedia("(max-width: 600px)").matches);
  const isGerman = locale === "de";
  useEffect(() => {
    const media = window.matchMedia("(max-width: 600px)");
    const update = () => setCompact(media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  const result = pollData.metadata?.election2024;
  if (!result) return null;
  const totalSeats = result.totalSeats ?? 650;
  const rows = UK_PARTY_DEFINITIONS.map((party) => ({
    ...party,
    votes: result.votes?.[party.id],
    seats: result.seats?.[party.id] ?? 0,
  })).filter((party) => Number.isFinite(party.votes) || party.seats > 0)
    .sort((a, b) => mode === "votes" ? (b.votes ?? 0) - (a.votes ?? 0) : b.seats - a.seats);
  const minorRows = rows.filter((party) => (party.votes ?? 0) < 4 && party.id !== "209");
  const majorRows = rows.filter((party) => (party.votes ?? 0) >= 4 && party.id !== "209");
  const existingOther = rows.find((party) => party.id === "209");
  const groupedOther = {
    id: "minor-parties",
    name: isGerman ? "Sonstige" : "Other",
    color: existingOther?.color ?? "#7c858f",
    votes: minorRows.reduce((sum, party) => sum + (party.votes ?? 0), existingOther?.votes ?? 0),
    seats: minorRows.reduce((sum, party) => sum + party.seats, existingOther?.seats ?? 0),
  };
  const displayedRows = !compact || showMinorParties ? rows : [...majorRows, groupedOther]
    .sort((a, b) => mode === "votes" ? (b.votes ?? 0) - (a.votes ?? 0) : b.seats - a.seats);
  const max = Math.max(...displayedRows.map((party) => mode === "votes" ? party.votes ?? 0 : party.seats), 1);
  return (
    <section id="votes-seats" className="projection-section uk-votes-seats" aria-labelledby="uk-votes-seats-title">
      <div className="projection-heading">
        <div><p className="section-label">{isGerman ? "Amtliches Ergebnis · Unterhauswahl 2024" : "Official result · 2024 general election"}</p><h3 id="uk-votes-seats-title">{isGerman ? "Ein Wahlergebnis, zwei sehr verschiedene Bilder" : "One result, two very different pictures"}</h3><p>{isGerman ? "Die Werte stammen aus der Wahl 2024 – nicht aus aktuellen Umfragen. Wechsle zwischen nationalem Stimmenanteil und Anteil der 650 Unterhaussitze." : "These figures are from the 2024 election—not current polling. Switch between national vote share and each party's share of the 650 Commons seats."}</p></div>
        <div className="segmented uk-result-toggle"><button className={mode === "votes" ? "selected" : ""} onClick={() => setMode("votes")}>{isGerman ? "Stimmen" : "Votes"}</button><button className={mode === "seats" ? "selected" : ""} onClick={() => setMode("seats")}>{isGerman ? "Sitze" : "Seats"}</button></div>
      </div>
      <div id="uk-result-list" className="uk-result-list">{displayedRows.map((party) => {
        const value = mode === "votes" ? party.votes ?? 0 : party.seats;
        const display = mode === "votes"
          ? `${value.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%`
          : `${value} · ${((value / totalSeats) * 100).toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%`;
        return <div className="uk-result-row" key={party.id}><span><i style={{ background: party.color }} />{party.name}</span><div><i style={{ width: `${(value / max) * 100}%`, background: party.color }} /></div><strong>{display}</strong></div>;
      })}</div>
      {compact && minorRows.length > 0 && <button className="uk-minor-toggle" type="button" aria-expanded={showMinorParties} aria-controls="uk-result-list" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setShowMinorParties(!showMinorParties); }}>{showMinorParties ? (isGerman ? "Kleinere Parteien zusammenfassen" : "Group smaller parties") : (isGerman ? `${minorRows.length} kleinere Parteien anzeigen` : `Show ${minorRows.length} smaller parties`)}<Icon name="chevron" size={15} /></button>}
      <p className="projection-method"><Icon name="info" size={15} />{isGerman ? "UK-Gesamtergebnis einschließlich Nordirland. ‚Andere‘ bündelt kleinere Parteien, Unabhängige und nordirische Parteien, die in der GB-Umfragereihe nicht einzeln geführt werden." : "UK-wide result including Northern Ireland. “Other” groups smaller parties, independents and Northern Irish parties not broken out in the GB polling series."}</p>
    </section>
  );
}

function ParliamentProjection({
  t,
  locale,
  current,
  region = REGION_META[0],
  partyDefinitions = PARTY_DEFINITIONS,
}) {
  const [showAllCoalitions, setShowAllCoalitions] = useState(false);
  const numberLocale = getNumberLocale(locale);
  const totalSeats = region.baseSeats ?? 630;
  const thresholdExemptPartyIds = region.thresholdExemptPartyIds ?? [];
  const thresholdExempt = new Set(thresholdExemptPartyIds);
  const { parties, representedVote } = allocateSeats(
    current.results,
    totalSeats,
    partyDefinitions,
    thresholdExemptPartyIds,
  );
  const majority = Math.floor(totalSeats / 2) + 1;
  const coalitions = findMajorities(parties, majority);
  const belowThreshold = partyDefinitions
    .map((party) => ({ ...party, value: current.results[party.id] }))
    .filter((party) => (
      Number.isFinite(party.value)
      && party.value < 5
      && !thresholdExempt.has(party.id)
    ))
    .sort((a, b) => b.value - a.value);
  const maxSeats = Math.max(...parties.map((party) => party.seats), 1);
  const isGerman = locale === "de";
  const isFederal = region.type === "federal";
  const projectionLabel = isFederal
    ? t.projectionLabel
    : (isGerman ? `Regierungsrechner · ${region.name}` : `Government calculator · ${region.name}`);
  const projectionTitle = isFederal
    ? t.electionTomorrow
    : (isGerman
      ? `Rechnerische Sitzverteilung für den ${region.parliament}`
      : `Modelled seat allocation for the ${region.parliament}`);
  const partiesInParliament = isFederal
    ? t.partiesInParliament
    : (isGerman ? `Parteien im ${region.parliament}` : `Parties in the ${region.parliament}`);
  const thresholdException = thresholdExemptPartyIds.length
    ? (isGerman
      ? " Der SSW wird als Partei der dänischen Minderheit ohne Fünf-Prozent-Hürde berücksichtigt."
      : " The SSW is included without a five-percent threshold as the party of the Danish minority.")
    : "";
  const bremenCaveat = region.slug === "bremen"
    ? (isGerman
      ? " Die in Bremen getrennt für Bremen und Bremerhaven geltende Sperrklausel kann aus landesweiten Umfragen nicht nachgebildet werden."
      : " Bremen's separate thresholds for Bremen and Bremerhaven cannot be reconstructed from statewide polling.")
    : "";
  const projectionMethod = isFederal
    ? t.projectionMethod
    : (isGerman
      ? `${totalSeats} Regelsitze werden als einheitliches Vergleichsmodell mit Sainte-Laguë auf Parteien ab 5 % verteilt. Das tatsächliche Landeswahlrecht, Wahlkreise, Direkt-, Überhang- und Ausgleichsmandate sowie Rundungseffekte können das Ergebnis und die Parlamentsgröße verändern.${thresholdException}${bremenCaveat} Die Balken folgen der parlamentarischen Links-rechts-Sitzordnung; das ist keine inhaltliche Bewertung. Koalitionen sind nach Sitznähe geordnet, Kombinationen mit der AfD stehen nachrangig. Die Reihenfolge ist keine Wahrscheinlichkeitsangabe.`
      : `${totalSeats} standard seats are allocated as a consistent comparison model using Sainte-Laguë for parties at or above 5%. The actual state electoral law, constituencies, direct, overhang and compensatory mandates, and rounding can change the result and parliament size.${thresholdException}${bremenCaveat} Bars follow parliamentary left-to-right seating and do not express an editorial judgement. Coalitions are ordered by seating proximity, with combinations including the AfD shown later. The order is not a probability assessment.`);

  if (!parties.length) return null;

  return (
    <section className="projection-section" aria-labelledby="projection-title">
      <div className="projection-heading">
        <div>
          <p className="section-label">{projectionLabel}</p>
          <h3 id="projection-title">{projectionTitle}</h3>
          <p>{t.projectionIntro}</p>
        </div>
        <div className="majority-badge">
          <span>{t.majority}</span>
          <strong>{majority}</strong>
          <small>{t.seats}</small>
        </div>
      </div>

      <div className="projection-summary">
        <div>
          <span>{partiesInParliament}</span>
          <strong>{parties.length}</strong>
        </div>
        <div>
          <span>{t.representedVotes}</span>
          <strong>{representedVote.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}%</strong>
        </div>
        <div>
          <span>{t.thresholdWatch}</span>
          <strong>{belowThreshold.length}</strong>
        </div>
      </div>

      <div className="seat-bar" aria-label={t.seats}>
        {parties.map((party) => (
          <span
            key={party.id}
            className={`seat-segment seat-segment-${party.slug}`}
            style={{ width: `${(party.seats / totalSeats) * 100}%`, background: party.color }}
            title={`${party.name}: ${party.value.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}% · ${party.seats} ${t.seats}`}
          >
            {party.value.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}%
          </span>
        ))}
        <i style={{ left: `${(majority / totalSeats) * 100}%` }} aria-hidden="true" />
      </div>

      <div className="projection-grid">
        <div className="seat-list">
          <h4>{t.seats}</h4>
          {parties.map((party) => (
            <div className="seat-row" key={party.id}>
              <span className="seat-party"><i style={{ background: party.color }} />{party.name}</span>
              <span className="seat-meter"><i style={{ width: `${(party.seats / maxSeats) * 100}%`, background: party.color }} /></span>
              <strong>{party.seats}</strong>
            </div>
          ))}
          <div className="threshold-box">
            <span>{t.thresholdWatch}</span>
            {belowThreshold.length ? (
              <div>{belowThreshold.map((party) => (
                <b key={party.id}><i style={{ background: party.color }} />{party.name} {party.value.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}%</b>
              ))}</div>
            ) : <p>{t.noThresholdParties}</p>}
          </div>
        </div>

        <div className={`coalition-list ${showAllCoalitions ? "show-all" : ""}`}>
          <h4>{t.arithmeticMajorities}</h4>
          {coalitions.map((coalition) => {
            const coalitionId = coalition.parties.map((party) => party.id).sort().join("-");
            return (
              <div className="coalition-row" key={coalitionId}>
                <span>
                  {coalition.parties.map((party) => <i key={party.id} style={{ background: party.color }} />)}
                </span>
                <strong>
                  {coalition.parties.map((party) => party.name).join(" + ")}
                </strong>
                <b>{coalition.seats}</b>
                <small>+{coalition.seats - majority}</small>
                <WatchlistStar country="de" regionSlug={region.slug} regionName={region.name} type="coalition" partyIds={coalition.parties.map((party) => party.id)} label={`${coalition.parties.map((party) => party.name).join(" + ")} · ${region.name}`} className="coalition-watch-star" />
              </div>
            );
          })}
          {coalitions.length > 5 && <button className="coalition-more" type="button" onClick={() => setShowAllCoalitions((value) => !value)}>{showAllCoalitions ? (isGerman ? "Weniger anzeigen" : "Show fewer") : (isGerman ? `${coalitions.length - 5} weitere` : `${coalitions.length - 5} more`)}<Icon name="chevron" size={15} /></button>}
        </div>
      </div>

      <p className="projection-method"><Icon name="info" size={15} />{projectionMethod}</p>
    </section>
  );
}

function PartyDetailModal({
  party,
  onClose,
  t,
  locale,
  polls,
  selectedPollsters,
  latestDate,
  partyDefinitions = PARTY_DEFINITIONS,
  termStart = CURRENT_TERM_START,
  archiveStart = ARCHIVE_START,
}) {
  const [period, setPeriod] = useState("year");
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [compactChart, setCompactChart] = useState(() => window.matchMedia("(max-width: 700px)").matches);
  const pointerFrameRef = useRef(0);
  const pendingPointerRef = useRef(null);
  useBodyScrollLock(Boolean(party));
  useEffect(() => setPeriod("year"), [party?.id]);
  useEffect(() => () => {
    if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current);
  }, []);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => setCompactChart(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  const endTime = parseDate(latestDate);
  const startDate = toIso(getRangeStart(period, endTime, termStart, archiveStart));
  const series = useMemo(() => {
    if (!party) return [];
    return makeTrend(polls, selectedPollsters, startDate, latestDate, partyDefinitions)
      .map((point) => ({ ...point, value: point.results[party.id] }))
      .filter((point) => Number.isFinite(point.value));
  }, [party, polls, selectedPollsters, startDate, latestDate, partyDefinitions]);
  const first = series[0];
  const last = series.at(-1);
  const delta = first && last ? last.value - first.value : null;
  const relative = Number.isFinite(delta) && first.value !== 0 ? (delta / first.value) * 100 : null;
  const high = series.length ? Math.max(...series.map((point) => point.value)) : null;
  const low = series.length ? Math.min(...series.map((point) => point.value)) : null;
  const numberLocale = getNumberLocale(locale);
  const signed = (value, suffix) => Number.isFinite(value)
    ? `${value > 0 ? "+" : ""}${value.toLocaleString(numberLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}${suffix}`
    : "–";
  const formatValue = (value) => Number.isFinite(value)
    ? `${value.toLocaleString(numberLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
    : "–";

  const width = compactChart ? 430 : 920;
  const height = compactChart ? 300 : 350;
  const margin = compactChart
    ? { top: 28, right: 14, bottom: 44, left: 42 }
    : { top: 28, right: 30, bottom: 48, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const chartMin = Number.isFinite(low) ? Math.max(0, Math.floor(low - 2)) : 0;
  const chartMax = Number.isFinite(high) ? Math.ceil(high + 2) : 10;
  const span = Math.max(chartMax - chartMin, 1);
  const x = (date) => margin.left + ((parseDate(date) - parseDate(startDate)) / Math.max(endTime - parseDate(startDate), 1)) * innerW;
  const y = (value) => margin.top + innerH - ((value - chartMin) / span) * innerH;
  const chartPoints = useMemo(
    () => series.map((point) => ({ date: point.date, x: x(point.date), y: y(point.value) })),
    [series, startDate, endTime, chartMin, span],
  );
  const path = useMemo(() => continuousSmoothPath(chartPoints), [chartPoints]);
  const areaPath = path
    ? `${path} L ${chartPoints.at(-1).x.toFixed(1)} ${height - margin.bottom} L ${chartPoints[0].x.toFixed(1)} ${height - margin.bottom} Z`
    : "";
  const tickCount = compactChart ? 3 : 4;
  const tickDates = useMemo(
    () => Array.from({ length: tickCount }, (_, index) => toIso(parseDate(startDate) + ((endTime - parseDate(startDate)) * index / (tickCount - 1)))),
    [startDate, endTime, tickCount],
  );
  if (!party) return null;
  const graphInfo = mainChartInfo(locale, "party", "trend");

  const inspectedPoint = Number.isInteger(hoveredIndex) ? series[hoveredIndex] : last;
  const updateInspection = ({ node, clientX }) => {
    if (!series.length) return;
    const bounds = node.getBoundingClientRect();
    const pointerX = ((clientX - bounds.left) / bounds.width) * width;
    const pointerTime = parseDate(startDate) + (
      (Math.min(width - margin.right, Math.max(margin.left, pointerX)) - margin.left) / innerW
    ) * (endTime - parseDate(startDate));
    const nearestIndex = nearestDateIndex(series, pointerTime);
    setHoveredIndex((current) => (current === nearestIndex ? current : nearestIndex));
  };
  const inspectChart = (event) => {
    pendingPointerRef.current = { node: event.currentTarget, clientX: event.clientX };
    if (pointerFrameRef.current) return;
    pointerFrameRef.current = window.requestAnimationFrame(() => {
      pointerFrameRef.current = 0;
      if (pendingPointerRef.current) updateInspection(pendingPointerRef.current);
    });
  };

  return (
    <div className="overlay modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="party-modal" role="dialog" aria-modal="true" aria-labelledby="party-detail-title">
        <div className="party-modal-header">
          <div>
            <p className="section-label">{t.partyDetail}</p>
            <div className="party-modal-title-row"><h2 id="party-detail-title"><span style={{ background: party.color }} />{t.partyDetailTitle(party.name)}</h2><GraphInfoPopover locale={locale} title={graphInfo.title} paragraphs={graphInfo.paragraphs} /></div>
            <p>{t.partyDetailIntro}</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t.close}><Icon name="close" /></button>
        </div>

        <div className="party-periods" aria-label={t.timeRange}>
          {[
            ["month", t.oneMonth],
            ["three", t.threeMonths],
            ["six", t.sixMonthsShort],
            ["ytd", t.yearToDateShort],
            ["year", t.year],
            ["two", t.twoYearsShort],
            ["five", t.fiveYears],
            ["all", t.maximum],
          ].map(([id, label]) => (
            <button key={id} className={period === id ? "selected" : ""} onClick={() => setPeriod(id)}>{label}</button>
          ))}
        </div>

        {series.length > 1 ? (
          <>
            <div className="party-metrics">
              <div className="party-metric-current"><span>{t.currentValue}</span><strong>{formatValue(last.value)}</strong></div>
              <div className="party-metric-change"><span>{t.changeInPeriod}</span><strong className={delta > 0 ? "positive" : delta < 0 ? "negative" : ""}>{signed(delta, t.ppShort)}</strong><small>{t.versusPeriodStart}</small></div>
              <div className="party-metric-relative"><span>{t.relativeChange}</span><strong className={relative > 0 ? "positive" : relative < 0 ? "negative" : ""}>{signed(relative, "%")}</strong><small>{t.versusPeriodStart}</small></div>
              <div className="party-metric-high"><span>{t.periodHigh}</span><strong>{formatValue(high)}</strong></div>
              <div className="party-metric-low"><span>{t.periodLow}</span><strong>{formatValue(low)}</strong></div>
            </div>
            <div className="party-detail-chart">
              <svg
                className={compactChart ? "compact" : undefined}
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label={t.partyDetailTitle(party.name)}
                onPointerMove={inspectChart}
                onPointerDown={inspectChart}
                onPointerLeave={(event) => {
                  if (event.pointerType === "touch") return;
                  pendingPointerRef.current = null;
                  if (pointerFrameRef.current) {
                    window.cancelAnimationFrame(pointerFrameRef.current);
                    pointerFrameRef.current = 0;
                  }
                  setHoveredIndex(null);
                }}
              >
                {[0, 0.5, 1].map((portion) => {
                  const value = chartMin + (span * portion);
                  return (
                    <g key={portion}>
                      <line x1={margin.left} x2={width - margin.right} y1={y(value)} y2={y(value)} className="grid-line" />
                      <text x={margin.left - 10} y={y(value) + 4} textAnchor="end" className="axis-label">{value.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}%</text>
                    </g>
                  );
                })}
                <defs>
                  <linearGradient id={`party-gradient-${party.slug}`} x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor={party.color} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={party.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {path && (
                  <>
                    <path d={areaPath} fill={`url(#party-gradient-${party.slug})`} className="party-area" />
                    <path d={path} className="party-detail-line-halo" />
                    <path d={path} className="party-detail-line" style={{ stroke: party.color }} />
                  </>
                )}
                <circle cx={x(last.date)} cy={y(last.value)} r="5" fill={party.color} stroke="var(--surface)" strokeWidth="2" />
                {inspectedPoint && (
                  <g className="party-inspector">
                    <line x1={x(inspectedPoint.date)} x2={x(inspectedPoint.date)} y1={margin.top} y2={height - margin.bottom} />
                    <circle cx={x(inspectedPoint.date)} cy={y(inspectedPoint.value)} r="6" fill={party.color} stroke="var(--surface)" strokeWidth="3" />
                    <g transform={`translate(${Math.min(width - 156, Math.max(8, x(inspectedPoint.date) - 70))} 8)`}>
                      <rect width="148" height="48" rx="8" />
                      <text x="12" y="19">{formatDate(inspectedPoint.date, locale, { year: true })}</text>
                      <text className="party-inspector-value" x="12" y="37">{formatValue(inspectedPoint.value)}</text>
                    </g>
                  </g>
                )}
                {tickDates.map((date, index) => (
                  <text key={date} x={x(date)} y={height - 16} textAnchor={index === 0 ? "start" : index === tickDates.length - 1 ? "end" : "middle"} className="axis-label">
                    {formatDate(date, locale, { year: ["two", "five", "all"].includes(period) || index === 0 })}
                  </text>
                ))}
              </svg>
            </div>
          </>
        ) : (
          <p className="party-no-data">{t.notEnoughData}</p>
        )}
      </section>
    </div>
  );
}

function AppInstallSettings({ pwa, t }) {
  if (!pwa) return null;
  const handleInstall = async () => {
    await pwa.requestInstall();
  };
  return (
    <section className="setting-section app-setting-section" aria-labelledby="app-setting-title">
      <div className="app-setting-heading">
        <span className="app-setting-icon"><BrandMark /></span>
        <div><h3 id="app-setting-title">{t.appSettingsTitle}</h3><p>{t.appSettingsHelp}</p></div>
      </div>
      {pwa.installed ? (
        <div className="app-installed-status"><Icon name="check" /><span>{t.appInstalled}</span></div>
      ) : pwa.canInstall ? (
        <button className="app-install-primary" onClick={handleInstall}>
          <Icon name="download" /><span>{pwa.isIos ? t.showInstallSteps : t.installNow}</span>
        </button>
      ) : (
        <p className="app-install-unavailable">{t.appUnavailable}</p>
      )}
      {pwa.showIosInstructions && !pwa.installed && (
        <div className="ios-install-steps" aria-live="polite">
          <strong>{t.iosInstallTitle}</strong>
          <ol><li>{t.iosInstallStepOne}</li><li>{t.iosInstallStepTwo}</li></ol>
        </div>
      )}
    </section>
  );
}

function SettingsPanel({
  open,
  onClose,
  locale,
  setLocale,
  t,
  theme,
  setTheme,
  textSize,
  setTextSize,
  motion,
  setMotion,
  pwa,
  allowedLocales = SUPPORTED_LOCALES,
}) {
  if (!open) return null;
  const languages = [
    { id: "de", label: "Deutsch", region: "Deutschland" },
    { id: "en-GB", label: "English", region: "United Kingdom" },
    { id: "en-US", label: "English", region: "United States" },
    { id: "tr", label: "Türkçe", region: "Türkiye" },
    { id: "ru", label: "Русский", region: "Русский" },
    { id: "ar", label: "العربية", region: "العربية" },
    { id: "es", label: "Español", region: "España" },
  ];
  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="side-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="panel-header">
          <h2 id="settings-title">{t.settingsTitle}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t.close}><Icon name="close" /></button>
        </div>
        <AppInstallSettings pwa={pwa} t={t} />
        <section className="setting-section">
          <h3>{t.language}</h3>
          <p>{t.languageHelp}</p>
          <div className="language-list">
            {languages.filter((language) => allowedLocales.includes(language.id)).map((language) => (
              <button key={language.id} className={`language-option ${locale === language.id ? "selected" : ""}`} onClick={() => setLocale(language.id)}>
                <span><strong>{language.label}</strong><small>{language.region}</small></span>
                {locale === language.id && <Icon name="check" />}
              </button>
            ))}
          </div>
        </section>
        <section className="setting-section">
          <h3>{t.appearance}</h3>
          <p>{t.appearanceHelp}</p>
          <div className="segmented full">
            {[["system", t.system], ["light", t.light], ["dark", t.dark]].map(([id, label]) => (
              <button key={id} className={theme === id ? "selected" : ""} onClick={() => setTheme(id)}>{label}</button>
            ))}
          </div>
        </section>
        <section className="setting-section">
          <h3>{t.textSize}</h3>
          <p>{t.textSizeHelp}</p>
          <div className="segmented full">
            {[["standard", t.standard], ["large", t.larger]].map(([id, label]) => (
              <button key={id} className={textSize === id ? "selected" : ""} onClick={() => setTextSize(id)}>{label}</button>
            ))}
          </div>
        </section>
        <section className="setting-section">
          <h3>{t.motion}</h3>
          <p>{t.motionHelp}</p>
          <div className="segmented full">
            {[["system", t.system], ["reduced", t.reduced]].map(([id, label]) => (
              <button key={id} className={motion === id ? "selected" : ""} onClick={() => setMotion(id)}>{label}</button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

function MethodModal({
  open,
  onClose,
  t,
  metadata,
  latestDate,
  locale,
  electionSourceUrl = ELECTION_SOURCE_URL,
}) {
  if (!open) return null;
  return (
    <div className="overlay modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="info-modal" role="dialog" aria-modal="true" aria-labelledby="method-title">
        <div className="panel-header">
          <div>
            <p className="section-label">{t.info}</p>
            <h2 id="method-title">{t.methodTitle}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label={t.close}><Icon name="close" /></button>
        </div>
        <p className="modal-intro">{t.methodIntro}</p>
        <div className="method-sections">
          <section><span>01</span><div><h3>{t.meanTitle}</h3><p>{t.meanText}</p></div></section>
          <section><span>02</span><div><h3>{t.selectionTitle}</h3><p>{t.selectionText}</p></div></section>
          <section><span>03</span><div><h3>{t.eventSelectionTitle}</h3><p>{t.eventSelectionText}</p></div></section>
          <section><span>04</span><div><h3>{t.limitsTitle}</h3><p>{t.limitsText}</p></div></section>
          <section><span>05</span><div><h3>{t.sourceTitle}</h3><p>{t.sourceText}</p></div></section>
        </div>
        <div className="source-box">
          <span>{t.lastPoll}: <strong>{formatDate(latestDate, locale, { year: true })}</strong></span>
          <span>{t.dataUpdated}: <strong>{formatDate(metadata.databaseUpdated.slice(0, 10), locale, { year: true })}</strong></span>
          <div>
            <a href={metadata.sourceUrl ?? DATA_SOURCE_URL} target="_blank" rel="noreferrer">{metadata.source ?? "dawum.de"} <Icon name="external" size={14} /></a>
            <a href={metadata.licenseUrl ?? DATA_LICENSE_URL} target="_blank" rel="noreferrer">{metadata.license ?? "ODbL 1.0"} <Icon name="external" size={14} /></a>
            {electionSourceUrl && (
              <a href={electionSourceUrl} target="_blank" rel="noreferrer">{t.electionSource}: {metadata.electionSourceLabel ?? (locale === "es" ? "Administración electoral" : locale === "de" ? "Die Bundeswahlleiterin, Wiesbaden" : "Federal Returning Officer, Wiesbaden")} <Icon name="external" size={14} /></a>
            )}
          </div>
          {metadata.archiveSourceUrls?.length > 1 && (
            <details className="archive-source-list">
              <summary>{locale === "es" ? `${metadata.archiveSourceUrls.length} páginas del archivo utilizadas` : locale === "de" ? `${metadata.archiveSourceUrls.length} verwendete Archivseiten` : `${metadata.archiveSourceUrls.length} archive pages used`}</summary>
              <ol>{metadata.archiveSourceUrls.map((url, index) => <li key={url}><a href={url} target="_blank" rel="noreferrer">{locale === "es" ? `Fuente ${index + 1}` : locale === "de" ? `Quelle ${index + 1}` : `Source ${index + 1}`} <Icon name="external" size={13} /></a></li>)}</ol>
            </details>
          )}
        </div>
      </section>
    </div>
  );
}

function DataAttribution({
  locale,
  metadata,
  includeElection = false,
  includeMap = false,
  electionSourceUrl = ELECTION_SOURCE_URL,
  electionSourceLabel = null,
}) {
  const isGerman = locale === "de";
  const l = (de, en, es) => locale === "es" ? es : isGerman ? de : en;
  const sourceUrl = metadata?.sourceUrl ?? DATA_SOURCE_URL;
  const source = metadata?.source ?? "dawum.de";
  const licenseUrl = metadata?.licenseUrl ?? DATA_LICENSE_URL;
  const license = metadata?.license ?? "ODbL 1.0";
  return (
    <span className="data-attribution">
      {l("Daten von", "Data from", "Datos de")}{" "}
      <a href={sourceUrl} target="_blank" rel="noreferrer">{source}</a>{" "}
      (<a href={licenseUrl} target="_blank" rel="noreferrer">{license}</a>)
      {metadata?.databaseUpdated && <> · {l("Stand", "updated", "actualizado")} {formatDate(metadata.databaseUpdated.slice(0, 10), locale, { year: true })}</>}
      {includeElection && (
        <> · {l("Wahlergebnisse", "Election results", "Resultados electorales")}:{" "}
          <a href={electionSourceUrl} target="_blank" rel="noreferrer">{electionSourceLabel ?? l("Die Bundeswahlleiterin, Wiesbaden", "Federal Returning Officer, Wiesbaden", "Administración electoral")}</a>
          {" "}({l("gekürzt und neu dargestellt", "shortened and newly presented", "abreviados y representados de nuevo")})
        </>
      )}
      {includeMap && (
        <> · {isGerman ? "Kartengeometrie" : "Map geometry"}:{" "}
          <a href={MAP_SOURCE_URL} target="_blank" rel="noreferrer">@svg-maps/germany</a>
          {" "}/{isGerman ? " Bearbeitung von " : " adaptation by "}
          <a href={MAP_SOURCE_URL} target="_blank" rel="noreferrer">Victor Cazanave</a>
          {" "}{isGerman ? "nach" : "from"}{" "}
          <a href={MAP_ORIGINAL_URL} target="_blank" rel="noreferrer">MapSVG</a>
          {" "}(<a href={MAP_LICENSE_URL} target="_blank" rel="noreferrer">CC BY 4.0</a>; {isGerman ? "von Pollframe eingefärbt und beschriftet" : "coloured and labelled by Pollframe"})
        </>
      )}
    </span>
  );
}

function MapAttribution({ locale }) {
  return (
    <p className="map-attribution">
      <DataAttribution locale={locale} includeMap />
    </p>
  );
}

function buildEmbedUrl({ locale, theme, range, mode, selectedParties, selectedPollsters, selectedEventCategories, regionSlug, customStartDate, customEndDate }) {
  const url = new URL(EMBED_PATH, window.location.origin);
  url.searchParams.set("embed", "1");
  if (regionSlug) url.searchParams.set("region", regionSlug);
  url.searchParams.set("lang", locale);
  url.searchParams.set("theme", theme);
  url.searchParams.set("range", range);
  url.searchParams.set("mode", mode);
  url.searchParams.set("parties", selectedParties.join(","));
  url.searchParams.set("pollsters", selectedPollsters.join(","));
  url.searchParams.set("events", selectedEventCategories.join(","));
  if (range === "custom" && customStartDate && customEndDate) {
    url.searchParams.set("from", customStartDate);
    url.searchParams.set("to", customEndDate);
  }
  return url.toString();
}

function buildShareUrl({ locale, range, mode, selectedParties, selectedPollsters, selectedEventCategories, regionSlug, customStartDate, customEndDate }) {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("region", regionSlug);
  url.searchParams.set("share", "1");
  url.searchParams.set("lang", locale);
  url.searchParams.set("range", range);
  url.searchParams.set("mode", mode);
  url.searchParams.set("parties", selectedParties.join(","));
  url.searchParams.set("pollsters", selectedPollsters.join(","));
  url.searchParams.set("events", selectedEventCategories.join(","));
  if (range === "custom" && customStartDate && customEndDate) {
    url.searchParams.set("from", customStartDate);
    url.searchParams.set("to", customEndDate);
  }
  return url.toString();
}

function buildMapShareUrl({ locale, mode, partyId }) {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("view", "map");
  url.searchParams.set("share", "1");
  url.searchParams.set("lang", locale);
  url.searchParams.set("mapMode", mode);
  url.searchParams.set("mapParty", partyId);
  return url.toString();
}

function buildPollSourceUrl(regionSlug, poll, metadata) {
  if (poll.sourceUrl) return poll.sourceUrl;
  const regionPath = DAWUM_REGION_PATHS[regionSlug];
  const pollsterPath = DAWUM_POLLSTER_PATHS[poll.pollster];
  if (!regionPath || !pollsterPath || !/^\d{4}-\d{2}-\d{2}$/.test(poll.date)) return metadata?.sourceUrl ?? DATA_SOURCE_URL;
  return `https://dawum.de/${regionPath}/${pollsterPath}/${poll.date}/`;
}

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function downloadPollCsv({ pollData, selectedPollsters, regionSlug }) {
  const partyEntries = Object.entries(pollData.parties);
  const header = [
    "publication_date", "fieldwork_start", "fieldwork_end", "pollster", "sample",
    "method", ...partyEntries.map(([, label]) => label), "source_url", "license",
  ];
  const rows = pollData.polls
    .filter((poll) => selectedPollsters.includes(poll.pollster))
    .map((poll) => [
      poll.date,
      poll.fieldwork?.[0] ?? "",
      poll.fieldwork?.[1] ?? "",
      pollData.pollsters[poll.pollster] ?? poll.pollster,
      poll.sample ?? "",
      poll.method ?? "",
      ...partyEntries.map(([partyId]) => poll.results[partyId] ?? ""),
      buildPollSourceUrl(regionSlug, poll, pollData.metadata),
      pollData.metadata?.license ?? "ODbL 1.0",
    ]);
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
  const blobUrl = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = `pollframe-${regionSlug}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
}

async function copyToClipboard(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    const field = document.createElement("textarea");
    field.value = value;
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }
}

function safeFilenamePart(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

function freezeExportStyles(root) {
  const properties = [
    "color", "background-color", "background-image", "border-color", "border-radius",
    "box-shadow", "fill", "fill-opacity", "stroke", "stroke-opacity", "stroke-width",
    "font-family", "font-size", "font-style", "font-weight", "letter-spacing", "line-height",
    "opacity", "paint-order", "text-anchor", "text-transform",
  ];
  [root, ...root.querySelectorAll("*")].forEach((node) => {
    const computed = window.getComputedStyle(node);
    for (const property of properties) {
      const value = computed.getPropertyValue(property);
      if (value && value !== "normal") node.style.setProperty(property, value);
    }
    node.style.setProperty("animation", "none");
    node.style.setProperty("transition", "none");
  });
}

async function downloadElementPng({ element, filename, title, subtitle, locale, credit = "DAWUM · ODbL 1.0 · de.pollframe.workers.dev" }) {
  if (!element) throw new Error("Missing export element");
  if (document.fonts?.ready) await document.fonts.ready;
  const host = document.createElement("div");
  host.className = "png-export-host";
  const surface = document.createElement("section");
  surface.className = "png-export-surface";
  surface.dir = LOCALE_META[locale]?.direction ?? "ltr";
  surface.lang = LOCALE_META[locale]?.language ?? "en";
  const header = document.createElement("header");
  header.className = "png-export-header";
  const identity = document.createElement("div");
  const brand = document.createElement("strong");
  const brandMark = document.createElement("span");
  brandMark.className = "png-export-brand-mark";
  brandMark.textContent = "↗";
  brand.append(brandMark, document.createTextNode("POLLFRAME"));
  const context = document.createElement("small");
  context.textContent = subtitle;
  identity.append(brand, context);
  const date = document.createElement("time");
  date.textContent = new Intl.DateTimeFormat(getNumberLocale(locale), { dateStyle: "medium" }).format(new Date());
  header.append(identity, date);
  const content = document.createElement("div");
  content.className = "png-export-content";
  const footer = document.createElement("footer");
  footer.className = "png-export-footer";
  const footerTitle = document.createElement("span");
  footerTitle.textContent = title;
  const creditNode = document.createElement("span");
  creditNode.textContent = credit;
  footer.append(footerTitle, creditNode);
  surface.append(header, content, footer);
  const clone = element.cloneNode(true);
  clone.querySelectorAll("[data-export-ignore], .chart-hover-card, .event-hover-card, .chart-scroll-hint, .event-key, .chart-footer").forEach((node) => node.remove());
  clone.classList.add("png-export-clone");
  content.append(clone);
  host.append(surface);
  document.body.append(host);
  try {
    await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
    freezeExportStyles(surface);
    surface.style.setProperty("width", "1440px");
    clone.style.setProperty("width", "100%");
    clone.style.setProperty("max-width", "none");
    clone.querySelectorAll(".chart-wrap, .party-selector").forEach((node) => node.style.setProperty("overflow", "visible"));
    clone.querySelectorAll(".poll-chart").forEach((node) => {
      node.style.setProperty("width", "100%");
      node.style.setProperty("min-width", "0");
    });
    const { toBlob } = await import("html-to-image");
    const blob = await toBlob(surface, {
      width: 1440,
      pixelRatio: 2.25,
      cacheBust: true,
      backgroundColor: "#ffffff",
    });
    if (!blob) throw new Error("PNG renderer returned no image");
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${safeFilenamePart(filename)}-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = objectUrl;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
  } finally {
    host.remove();
  }
}

function PngExportButton({ elementRef, filename, title, subtitle, locale, t, credit, className = "secondary-button" }) {
  const [status, setStatus] = useState("idle");
  const exportPng = async () => {
    if (status === "working") return;
    setStatus("working");
    try {
      await downloadElementPng({ element: elementRef.current, filename, title, subtitle, locale, credit });
      setStatus("done");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch (error) {
      console.error("PNG export failed", error);
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 2600);
    }
  };
  const label = status === "working" ? t.exportPreparing : status === "done" ? t.exportReady : status === "error" ? t.exportError : t.exportPng;
  return (
    <button className={`${className} png-export-button`} type="button" onClick={exportPng} disabled={status === "working"} data-export-ignore="true">
      <Icon name={status === "done" ? "check" : "download"} size={17} />{label}
    </button>
  );
}

function PollTable({ t, locale, pollData, selectedPollsters, selectedParties, partyDefinitions, regionSlug }) {
  const [visibleCount, setVisibleCount] = useState(12);
  const numberLocale = getNumberLocale(locale);
  const weightedSelected = selectedPollsters.includes(pollData.metadata?.weightedAveragePollsterId);
  const ratings = pollData.metadata?.pollsterRatings ?? {};
  const polls = useMemo(() => pollData.polls
    .filter((poll) => !poll.synthetic && (
      selectedPollsters.includes(poll.pollster)
      || (weightedSelected && /^[ABC][+-]?$/.test(ratings[poll.pollster] ?? ""))
    ))
    .slice()
    .reverse(), [pollData, selectedPollsters, weightedSelected, ratings]);
  const visiblePolls = polls.slice(0, visibleCount);
  const parties = partyDefinitions.filter((party) => selectedParties.includes(party.id));
  const fieldworkLabel = (poll) => {
    const [start, end] = poll.fieldwork ?? [];
    if (!start || !end) return "–";
    return start === end
      ? formatDate(start, locale, { year: true })
      : `${formatDate(start, locale, { year: true })} – ${formatDate(end, locale, { year: true })}`;
  };
  const valueLabel = (value) => Number.isFinite(value)
    ? `${value.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}%`
    : "–";

  return (
    <details className="poll-table-section">
      <summary>
        <span><span className="section-label">{t.dataStandard}</span><strong>{t.pollTable}</strong><small>{t.pollTableCount(Math.min(visibleCount, polls.length), polls.length)}</small></span>
        <Icon name="chevron" size={18} />
      </summary>
      <div className="poll-table-body">
        <div className="poll-table-heading">
          <p>{t.pollTableIntro}</p>
          <button
            className="secondary-button"
            type="button"
            onClick={() => downloadPollCsv({ pollData, selectedPollsters, regionSlug })}
          ><Icon name="download" size={16} />{t.csv}</button>
        </div>
        <div className="poll-table-scroll poll-table-desktop">
          <table>
            <thead><tr>
              <th>{t.pollDate}</th><th>{t.pollsters}</th><th>{t.fieldwork}</th><th>{t.sample}</th><th>{t.method}</th>
              {parties.map((party) => <th key={party.id}>{party.name}</th>)}
              <th>{t.sourceTitle}</th>
            </tr></thead>
            <tbody>{visiblePolls.map((poll, index) => (
              <tr key={`${poll.date}-${poll.pollster}-${index}`}>
                <td><time dateTime={poll.date}>{formatDate(poll.date, locale, { year: true })}</time></td>
                <td><strong>{pollData.pollsters[poll.pollster]}</strong></td>
                <td>{fieldworkLabel(poll)}</td>
                <td>{poll.sample?.toLocaleString(numberLocale) ?? "–"}</td>
                <td>{poll.method || "–"}</td>
                {parties.map((party) => <td key={party.id}>{valueLabel(poll.results[party.id])}</td>)}
                <td><a href={buildPollSourceUrl(regionSlug, poll, pollData.metadata)} target="_blank" rel="noreferrer">{t.openSource}<Icon name="external" size={13} /></a></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="poll-card-list">
          {visiblePolls.map((poll, index) => (
            <article key={`${poll.date}-${poll.pollster}-card-${index}`}>
              <header><div><time dateTime={poll.date}>{formatDate(poll.date, locale, { year: true })}</time><strong>{pollData.pollsters[poll.pollster]}</strong></div><a href={buildPollSourceUrl(regionSlug, poll, pollData.metadata)} target="_blank" rel="noreferrer" aria-label={`${t.openSource}: ${pollData.pollsters[poll.pollster]}`}><Icon name="external" size={16} /></a></header>
              <dl>
                <div><dt>{t.fieldwork}</dt><dd>{fieldworkLabel(poll)}</dd></div>
                <div><dt>{t.sample}</dt><dd>{poll.sample?.toLocaleString(numberLocale) ?? "–"}</dd></div>
                <div><dt>{t.method}</dt><dd>{poll.method || "–"}</dd></div>
              </dl>
              <div className="poll-card-values">{parties.map((party) => <span key={party.id}><i style={{ background: party.color }} />{party.name}<strong>{valueLabel(poll.results[party.id])}</strong></span>)}</div>
            </article>
          ))}
        </div>
        {visibleCount < polls.length && <button className="poll-table-more secondary-button" type="button" onClick={() => setVisibleCount((count) => count + 24)}>{t.showMorePolls}</button>}
        <p className="poll-table-source"><DataAttribution locale={locale} metadata={pollData.metadata} /></p>
      </div>
    </details>
  );
}

function EmbedModal({
  open,
  onClose,
  t,
  locale,
  range,
  mode,
  selectedParties,
  selectedPollsters,
  selectedEventCategories,
  regionSlug,
  customStartDate,
  customEndDate,
}) {
  const [embedTheme, setEmbedTheme] = useState("light");
  const [embedHeight, setEmbedHeight] = useState("standard");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  useBodyScrollLock(open);
  const heights = { compact: 520, standard: 680, large: 820 };
  const embedUrl = buildEmbedUrl({
    locale,
    theme: embedTheme,
    range,
    mode,
    selectedParties,
    selectedPollsters,
    selectedEventCategories,
    regionSlug,
    customStartDate,
    customEndDate,
  });
  const code = `<iframe src="${embedUrl}" width="100%" height="${heights[embedHeight]}" style="border:0;display:block;width:100%;max-width:100%" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" title="${t.embedByline}"></iframe>`;
  const shareUrl = buildShareUrl({
    locale,
    range,
    mode,
    selectedParties,
    selectedPollsters,
    selectedEventCategories,
    regionSlug,
    customStartDate,
    customEndDate,
  });
  const copyCode = async () => {
    await copyToClipboard(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const copyLink = async () => {
    await copyToClipboard(shareUrl);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  };

  if (!open) return null;
  return (
    <div className="overlay modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="embed-modal" role="dialog" aria-modal="true" aria-labelledby="embed-title">
        <div className="panel-header">
          <h2 id="embed-title">{t.embedTitle}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t.close}><Icon name="close" /></button>
        </div>
        <p className="modal-intro">{t.embedText}</p>
        <div className="embed-options">
          <div>
            <span>{t.embedTheme}</span>
            <div className="segmented">
              {[["light", t.embedLight], ["dark", t.embedDark], ["system", t.embedAuto]].map(([value, label]) => (
                <button key={value} className={embedTheme === value ? "selected" : ""} onClick={() => setEmbedTheme(value)}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <span>{t.embedHeight}</span>
            <div className="segmented">
              {[["compact", t.embedCompact], ["standard", t.embedStandard], ["large", t.embedLarge]].map(([value, label]) => (
                <button key={value} className={embedHeight === value ? "selected" : ""} onClick={() => setEmbedHeight(value)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="embed-live-preview">
          <iframe
            src={embedUrl}
            title={t.embedByline}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
        <label className="code-label">
          {t.embedPreview}
          <code>{code}</code>
        </label>
        <div className="embed-actions">
          <button className="secondary-button" onClick={copyLink}><Icon name="share" /> {linkCopied ? t.linkCopied : t.copyLink}</button>
          <button className="primary-button" onClick={copyCode}><Icon name="share" /> {copied ? t.copied : t.copyCode}</button>
          <a className="secondary-button" href={embedUrl} target="_blank" rel="noreferrer">{t.embedOpen}<Icon name="external" size={15} /></a>
        </div>
        <small className="embed-privacy"><Icon name="check" size={14} />{t.embedPrivacy}</small>
      </section>
    </div>
  );
}

function EmbedView({
  t,
  locale,
  pollData,
  latestDate,
  selectedParties,
  selectedPollsters,
  selectedEventCategories,
  mode,
  range,
  partyDefinitions = PARTY_DEFINITIONS,
  events = POLITICAL_EVENTS,
  eventCategories = EVENT_CATEGORIES,
  electionResults = ELECTION_RESULTS,
  termStart = CURRENT_TERM_START,
  archiveStart = ARCHIVE_START,
  regionSlug = "bundestag",
  customStartDate,
  customEndDate,
}) {
  return (
    <main className="embed-page">
      <header className="embed-header">
        <div>
          <span className="embed-brand"><BrandMark />POLLFRAME</span>
          <h1>{t.chartTitle}</h1>
        </div>
        <time dateTime={latestDate}>{formatDate(latestDate, locale, { year: true })}</time>
      </header>
      <div className="embed-legend">
        {partyDefinitions.filter((party) => selectedParties.includes(party.id)).map((party) => (
          <span key={party.id}><i style={{ background: party.color }} />{party.name}</span>
        ))}
      </div>
      <PollChart
        t={t}
        locale={locale}
        selectedParties={selectedParties}
        selectedPollsters={selectedPollsters}
        selectedEventCategories={selectedEventCategories}
        mode={mode}
        range={range}
        polls={pollData.polls}
        pollsters={pollData.pollsters}
        latestDate={latestDate}
        displayEndDate={latestDate}
        partyDefinitions={partyDefinitions}
        events={events}
        eventCategories={eventCategories}
        electionResults={electionResults}
        termStart={termStart}
        archiveStart={archiveStart}
        customStartDate={customStartDate}
        customEndDate={customEndDate}
      />
      <footer className="embed-footer">
        <DataAttribution
          locale={locale}
          metadata={pollData.metadata}
          includeElection={["bundestag", "uk-westminster"].includes(regionSlug)}
          electionSourceUrl={pollData.metadata?.electionSourceUrl ?? ELECTION_SOURCE_URL}
          electionSourceLabel={pollData.metadata?.electionSourceLabel}
        />
        <a href={`/?region=${regionSlug}`} target="_blank" rel="noreferrer">Interaktiv öffnen <Icon name="external" size={13} /></a>
      </footer>
    </main>
  );
}

function HeaderCountryMenu({ locale, country }) {
  const isGerman = locale === "de";
  const label = locale === "es" ? "Seleccionar país" : isGerman ? "Land auswählen" : "Select country";
  const current = country === "uk" ? "🇬🇧 UK" : country === "es" ? "🇪🇸 ES" : country === "all" ? (locale === "es" ? "Países" : isGerman ? "Länder" : "Countries") : "🇩🇪 DE";
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 68, right: 14 });
  const buttonRef = useRef(null);
  const popoverRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const updateAnchor = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      setAnchor({
        top: Math.round(rect.bottom + 9),
        right: Math.max(14, Math.round(window.innerWidth - rect.right)),
      });
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const closeOutside = (event) => {
      if (buttonRef.current?.contains(event.target) || popoverRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [open]);

  const popover = open && createPortal(
    <div
      ref={popoverRef}
      id="header-country-popover"
      className="header-country-popover"
      style={{ "--country-popover-top": `${anchor.top}px`, "--country-popover-right": `${anchor.right}px` }}
    >
      <strong>{label}</strong>
      <a className={country === "de" ? "selected" : ""} href="/"><span>🇩🇪</span><span><b>Deutschland</b><small>Bundestag · Länder</small></span>{country === "de" && <Icon name="check" size={15} />}</a>
      <a className={country === "uk" ? "selected" : ""} href="/?country=uk"><span>🇬🇧</span><span><b>United Kingdom</b><small>Westminster · constituencies</small></span>{country === "uk" && <Icon name="check" size={15} />}</a>
      <a className={country === "es" ? "selected" : ""} href="/?country=es"><span>🇪🇸</span><span><b>España</b><small>Congreso · autonomías</small></span>{country === "es" && <Icon name="check" size={15} />}</a>
      <a className="country-all-link" href="/?view=countries">{locale === "es" ? "Ver todos los países" : isGerman ? "Alle Länder anzeigen" : "View all countries"}<span>→</span></a>
    </div>,
    document.body,
  );
  return (
    <div className="header-country-menu">
      <button
        ref={buttonRef}
        type="button"
        className="header-button"
        aria-label={label}
        aria-expanded={open}
        aria-controls="header-country-popover"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="globe" />
        <span>{current}</span>
        <span className="header-country-chevron"><Icon name="chevron" size={13} /></span>
      </button>
      {popover}
    </div>
  );
}

function SiteHeader({ t, locale = "de", onSettings, onInfo, pwa, homeHref = "/", homeLabel = "Pollframe Deutschland-Übersicht", countryCode }) {
  const headerCountry = countryCode ?? (homeHref.includes("country=uk") ? "uk" : homeHref.includes("country=es") ? "es" : "de");
  const installApp = async () => {
    const outcome = await pwa?.requestInstall();
    if (outcome === "instructions" || outcome === "unavailable") onSettings?.();
  };
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href={homeHref} aria-label={homeLabel}>
          <BrandMark />
          <span>POLLFRAME</span>
          <em>BETA</em>
        </a>
        <div className="header-actions">
          <HeaderCountryMenu locale={locale} country={headerCountry} />
          {pwa && !pwa.installed && (
            <button className="header-button app-header-button" onClick={installApp} aria-label={t.installApp}>
              <Icon name="download" /><span>{t.app}</span>
            </button>
          )}
          {onInfo && (
            <button className="header-button info-button" onClick={onInfo} aria-label={t.dataInfo}>
              <Icon name="info" /><span>{t.info}</span>
            </button>
          )}
          <button className="header-button" onClick={onSettings} aria-label={t.settings}>
            <Icon name="settings" /><span>{t.settings}</span>
          </button>
        </div>
      </div>
      {!pwa?.online && (
        <div className="app-status app-status-offline" role="status"><Icon name="wifiOff" size={17} /><span>{t.offlineStatus}</span></div>
      )}
      {pwa?.online && pwa?.usedCachedData && (
        <div className="app-status app-status-cached" role="status"><Icon name="info" size={17} /><span>{t.cachedDataStatus}</span></div>
      )}
      {pwa?.updateAvailable && (
        <div className="app-status app-status-update" role="status">
          <span><Icon name="refresh" size={17} />{t.updateReady}</span>
          <button onClick={pwa.applyUpdate}>{t.updateNow}</button>
        </div>
      )}
    </header>
  );
}

function MobileAppNavigation({ t, onSettings, homeHref }) {
  const query = new URLSearchParams(window.location.search);
  const currentRegion = query.get("region");
  const isUK = homeHref.includes("country=uk") || currentRegion === "uk-westminster";
  const isSpain = homeHref.includes("country=es") || currentRegion === "spain-congress";
  const country = isUK ? "uk" : isSpain ? "es" : "de";
  const overviewHref = isUK ? "/?country=uk" : isSpain ? "/?country=es" : "/";
  const exploreHref = isUK ? "/?country=uk&view=uk-map" : isSpain ? "/?country=es#spain-map" : "/?view=states";
  const watchlistHref = `/?view=watchlist&country=${country}`;
  const active = query.get("view") === "watchlist" ? "watchlist" : (isUK && query.get("view") === "uk-map") || (isSpain && window.location.hash === "#spain-map") || (!isUK && !isSpain && query.get("view") === "states") ? "explore" : "overview";
  return (
    <nav className="mobile-app-nav" aria-label={t.app}>
      <a href={watchlistHref} onClick={appLinkHandler(watchlistHref)} aria-current={active === "watchlist" ? "page" : undefined}><Icon name="star" /><span>Watchlist</span></a>
      <a href={overviewHref} onClick={appLinkHandler(overviewHref)} aria-current={active === "overview" ? "page" : undefined}><Icon name="home" /><span>{t.navOverview}</span></a>
      <a href={exploreHref} onClick={appLinkHandler(exploreHref)} aria-current={active === "explore" ? "page" : undefined}><Icon name="map" /><span>{isUK ? (t.navMap ?? "Map") : t.navMap}</span></a>
    </nav>
  );
}

function SiteFooter({ t, onInfo, onSettings, sourceUrl, pwa, homeHref = "/", homeLabel = "Pollframe Deutschland-Übersicht" }) {
  const installApp = async () => {
    const outcome = await pwa?.requestInstall();
    if (outcome === "instructions") onSettings?.();
  };
  return (
    <>
      <footer>
        <a className="brand small" href={homeHref} aria-label={homeLabel}><BrandMark /><span>POLLFRAME</span></a>
        <p>{t.footerLine}</p>
        <nav>
          {onInfo && <button className="footer-action" onClick={onInfo}>{t.methodology}</button>}
          {pwa?.canInstall && <button className="footer-action" onClick={installApp}>{t.installApp}</button>}
          {sourceUrl && <a className="footer-action" href={sourceUrl} target="_blank" rel="noreferrer">{t.sourceTitle}</a>}
          <a className="footer-action" href="/?page=datenschutz">{t.privacy}</a>
          <a className="footer-action" href="/?page=lizenzen">{t.licences}</a>
          <a className="footer-action" href="/?page=impressum">Impressum</a>
          <a className="footer-action" href="/?page=kontakt">{t.contact}</a>
        </nav>
      </footer>
      {pwa?.installed && <MobileAppNavigation t={t} onSettings={onSettings} homeHref={homeHref} />}
    </>
  );
}

function mapPartyValue(region, party, source = "current") {
  const results = region?.[source]?.results ?? {};
  const match = party.ids.find((id) => Number.isFinite(results[id]));
  return match ? { value: results[match], rawId: match } : null;
}

function mapPartyName(party, rawId, locale) {
  if (party.id === "union") {
    if (rawId === "102") return "CSU";
    if (rawId === "101") return "CDU";
  }
  if (locale !== "de" && party.id === "4") return "Greens";
  if (locale !== "de" && party.id === "5") return "Left";
  return party.short;
}

function mapPartyFullName(party, locale) {
  if (locale === "de") return party.name;
  if (party.id === "4") return "Greens";
  if (party.id === "5") return "Left";
  if (party.id === "8") return "Free Voters";
  return party.name;
}

function stateMapMetric(region, mode, selectedParty, range) {
  const missing = {
    fill: "var(--surface-strong)",
    opacity: 1,
    label: "—",
    valueLabel: "keine Daten",
    title: "Keine ausreichenden Daten",
    parties: [],
  };
  if (!region) return missing;

  if (mode === "party") {
    const result = mapPartyValue(region, selectedParty);
    if (!result) return missing;
    const spread = Math.max(range.max - range.min, 1);
    return {
      fill: selectedParty.color,
      opacity: 0.28 + (0.72 * ((result.value - range.min) / spread)),
      label: mapPartyName(selectedParty, result.rawId, range.locale),
      value: result.value,
      valueLabel: `${result.value.toLocaleString(range.numberLocale, { maximumFractionDigits: 1 })}%`,
      title: `${mapPartyFullName(selectedParty, range.locale)}: ${result.value.toLocaleString(range.numberLocale, { maximumFractionDigits: 1 })}%`,
      parties: [{ ...selectedParty, rawId: result.rawId }],
    };
  }

  const source = mode === "growth" ? "movement" : "current";
  const candidates = MAP_PARTY_GROUPS
    .map((party) => {
      const result = mapPartyValue(region, party, source);
      return result ? { ...party, ...result } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.value - a.value);
  if (!candidates.length || (mode === "growth" && candidates[0].value <= 0)) return missing;

  const best = candidates[0];
  const parties = mode === "leader"
    ? candidates.filter((candidate) => Math.abs(candidate.value - best.value) < 0.05)
    : [best];
  const partyLabel = parties.map((party) => mapPartyName(party, party.rawId, range.locale)).join("/");
  const valueLabel = mode === "growth"
    ? `${best.value >= 0 ? "+" : ""}${best.value.toLocaleString(range.numberLocale, { maximumFractionDigits: 1 })} PP`
    : `${best.value.toLocaleString(range.numberLocale, { maximumFractionDigits: 1 })}%`;
  return {
    fill: parties.length > 1 ? `url(#map-tie-${region.mapId})` : best.color,
    opacity: 0.88,
    label: partyLabel,
    value: best.value,
    valueLabel,
    title: `${partyLabel}: ${valueLabel}`,
    parties,
  };
}

function StateCoverageMap({ states, locale, mapGeometry }) {
  const isGerman = locale === "de";
  const language = overviewText(locale);
  const l = (german, key) => isGerman ? german : language[key];
  const [focusedSlug, setFocusedSlug] = useState("berlin");
  const focused = states.find((region) => region.slug === focusedSlug) ?? states[0];
  const coverageLabel = (coverage) => ({
    good: l("Gute Datenreihe", "coverageGood"),
    fair: l("Brauchbar, aber dünner", "coverageFair"),
    limited: l("Begrenzte Datenreihe", "coverageLimited"),
  }[coverage]);
  const byMapId = new Map(states.map((region) => [region.mapId, region]));

  return (
    <section id="laenderkarte" className="map-section" aria-labelledby="coverage-map-title">
      <div className="map-copy">
        <p className="section-label">{l("Datenabdeckung", "coverageTitle")}</p>
        <h2 id="coverage-map-title">{l("Länderkarte", "stateMap")}</h2>
        <p>{l("Wähle ein Bundesland, um seine vollständige Umfragereihe zu öffnen. Die Einfärbung zeigt, wie dicht die verfügbare Datenreihe ist.", "coverageIntro")}</p>
        {focused && (
          <a className="map-selection" href={`/?region=${focused.slug}`}>
            <span className={`coverage-dot ${focused.coverage}`} />
            <div>
              <strong>{focused.name}</strong>
              <small>{focused.pollCount} {l("Umfragen", "pollsWord")} · {formatDate(focused.latestDate, locale, { year: true })}</small>
            </div>
            <span className="entry-arrow" aria-hidden="true">→</span>
          </a>
        )}
        <div className="map-legend" aria-label={l("Datenabdeckung", "coverageTitle")}>
          {["good", "fair", "limited"].map((coverage) => (
            <span key={coverage}><i className={coverage} />{coverageLabel(coverage)}</span>
          ))}
        </div>
      </div>
      <div className="germany-map-wrap">
        {mapGeometry ? (
        <svg className="germany-map" viewBox={mapGeometry.viewBox} role="img" aria-label={l("Datenabdeckung nach Bundesland", "coverageAria")}>
          {mapGeometry.locations.map((location) => {
            const region = byMapId.get(location.id);
            if (!region) return null;
            return (
              <a
                key={location.id}
                href={`/?region=${region.slug}`}
                aria-label={`${region.name}: ${coverageLabel(region.coverage)}`}
                onPointerEnter={() => setFocusedSlug(region.slug)}
                onFocus={() => setFocusedSlug(region.slug)}
              >
                <path className={`map-state ${region.coverage} ${focused?.slug === region.slug ? "active" : ""}`} d={location.path}>
                  <title>{region.name} · {coverageLabel(region.coverage)} · {region.pollCount} {l("Umfragen", "pollsWord")}</title>
                </path>
              </a>
            );
          })}
        </svg>
        ) : <div className="map-data-loading">{l("Karte wird geladen …", "mapLoading")}</div>}
      </div>
    </section>
  );
}

function StateDirectory({ states, locale }) {
  const isGerman = locale === "de";
  return (
    <section className="state-directory" aria-labelledby="state-list-title">
      <div>
        <p className="section-label">{isGerman ? "Alle Ansichten" : "All views"}</p>
        <h2 id="state-list-title">{isGerman ? "Bundesländer von A bis Z" : "States from A to Z"}</h2>
      </div>
      <div className="state-grid">
        {states.map((region) => (
          <a key={region.slug} href={`/?region=${region.slug}`}>
            <span className={`coverage-dot ${region.coverage}`} />
            <strong>{region.name}</strong>
            <small>{region.pollCount} {isGerman ? "Umfragen" : "polls"} · {formatDate(region.latestDate, locale, { year: true })}</small>
            <span aria-hidden="true">→</span>
          </a>
        ))}
      </div>
      <p className="coverage-method">
        <Icon name="info" size={16} />
        {isGerman
          ? "Datenreihen: gut ab 45, brauchbar ab 25, begrenzt unter 25 veröffentlichten Umfragen der ausgewählten Institute seit 2017. Eine lange Reihe bedeutet nicht automatisch viele aktuelle Umfragen."
          : "Data series: good from 45, usable from 25, limited below 25 published polls by the selected institutes since 2017. A long series does not necessarily mean many current polls."}
      </p>
    </section>
  );
}

function GermanyPollingMap({
  data,
  mapGeometry,
  locale,
  mode,
  setMode,
  partyId,
  setPartyId,
  focusedSlug,
  setFocusedSlug,
  onShare,
  embed = false,
}) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const exportRef = useRef(null);
  const isGerman = locale === "de";
  const t = copy[locale] ?? copy["en-GB"];
  const language = overviewText(locale);
  const l = (german, key, ...args) => {
    if (isGerman) return typeof german === "function" ? german(...args) : german;
    const value = language[key];
    return typeof value === "function" ? value(...args) : value;
  };
  const numberLocale = getNumberLocale(locale);
  const states = data?.regions ?? [];
  const today = Date.now();
  const ageInDays = (region) => Math.max(0, Math.floor((today - parseDate(region.latestDate)) / DAY));
  const isStale = (region) => ageInDays(region) > 90;
  const byMapId = new Map(states.map((region) => [region.mapId, region]));
  const selectedParty = MAP_PARTY_GROUPS.find((party) => party.id === partyId) ?? MAP_PARTY_GROUPS[0];
  const partyValues = states
    .map((region) => mapPartyValue(region, selectedParty)?.value)
    .filter(Number.isFinite);
  const range = {
    min: partyValues.length ? Math.min(...partyValues) : 0,
    max: partyValues.length ? Math.max(...partyValues) : 1,
    locale,
    numberLocale,
  };
  const metrics = new Map(states.map((region) => [
    region.slug,
    stateMapMetric(region, mode, selectedParty, range),
  ]));
  const focused = states.find((region) => region.slug === focusedSlug) ?? states[0];
  const focusedMetric = focused ? metrics.get(focused.slug) : null;
  const legendParties = [...new Map(
    [...metrics.values()]
      .flatMap((metric) => metric.parties)
      .map((party) => [party.id, party]),
  ).values()];
  const title = mode === "leader"
    ? l("Stärkste Partei im jeweils neuesten Landesdurchschnitt", "leadingTitle")
    : mode === "growth"
      ? l("Stärkster geschätzter Zuwachs", "gainTitle")
      : `${mapPartyFullName(selectedParty, locale)} ${l("im Ländervergleich", "acrossStates")}`;
  const mapLocations = (mapGeometry?.locations ?? [])
    .map((location) => {
      const region = byMapId.get(location.id);
      if (!region) return null;
      return {
        location,
        region,
        metric: metrics.get(region.slug),
        position: STATE_MAP_LABELS[location.id],
      };
    })
    .filter(Boolean);
  const focusedLocation = mapLocations.find(({ region }) => region.slug === focused?.slug)?.location;

  if (!data || !mapGeometry) {
    return <div className="map-data-loading">{l("Länderdaten werden geladen …", "mapLoading")}</div>;
  }

  const mapViewOptions = [
    { value: "leader", label: l("Stärkste Partei", "leadingParty") },
    { value: "party", label: l("Partei vergleichen", "compareParty") },
    { value: "growth", label: l("Stärkster Zuwachs", "largestGain") },
  ];

  return (
    <div ref={exportRef} className={`poll-map-module ${embed ? "embedded" : ""}`}>
      <div className="poll-map-actions" data-export-ignore="true">
        <button
          className={`secondary-button ${customizeOpen ? "active" : ""}`}
          onClick={() => setCustomizeOpen(!customizeOpen)}
          aria-expanded={customizeOpen}
        >
          <Icon name="sliders" />{l("Karte anpassen", "customizeMap")}
        </button>
        {onShare && (
          <>
            <PngExportButton
              elementRef={exportRef}
              filename={`pollframe-deutschlandkarte-${mode}`}
              title={title}
              subtitle={l("Deutschland im Überblick", "germanyOverview")}
              locale={locale}
              t={t}
              credit="DAWUM · ODbL 1.0 · MapSVG/@svg-maps · CC BY 4.0 · de.pollframe.workers.dev"
            />
            <button className="primary-button map-share-button" onClick={onShare}>
              <Icon name="share" />{l("Karte einbetten", "embedMap")}
            </button>
          </>
        )}
      </div>

      {customizeOpen && (
        <div className="customize-panel map-customize-panel" data-export-ignore="true">
          <div className="map-view-controls">
            <span className="map-control-label">{l("Was soll die Karte zeigen?", "mapQuestion")}</span>
            <div className="map-view-options" role="radiogroup" aria-label={l("Kartenansicht", "mapView")}>
              {mapViewOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === option.value}
                  className={mode === option.value ? "selected" : ""}
                  onClick={() => setMode(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {mode === "party" && (
              <div className="map-party-control">
                <span className="map-control-label">{l("Partei auswählen", "chooseParty")}</span>
                <div className="map-party-options" role="radiogroup" aria-label={l("Partei auswählen", "chooseParty")}>
                  {MAP_PARTY_GROUPS.slice(0, 8).map((party) => (
                    <button
                      key={party.id}
                      type="button"
                      role="radio"
                      aria-checked={partyId === party.id}
                      className={partyId === party.id ? "selected" : ""}
                      onClick={() => setPartyId(party.id)}
                    >
                      <i style={{ background: party.color }} />
                      {mapPartyFullName(party, locale)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="poll-map-heading">
        <div>
          <p className="section-label">{mode === "growth" ? l("Trend · 180 Tage", "trend180") : l("Neuester Landesdurchschnitt", "latestAverage")}</p>
          <h3>{title}</h3>
        </div>
        {mode === "party" ? (
          <div className="intensity-legend" style={{ "--map-party-color": selectedParty.color }}>
            <span>{range.min.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}%</span>
            <i />
            <span>{range.max.toLocaleString(numberLocale, { maximumFractionDigits: 1 })}%</span>
          </div>
        ) : (
          <div className="party-map-legend">
            {legendParties.map((party) => (
              <span key={party.id}><i style={{ background: party.color }} />{mapPartyFullName(party, locale)}</span>
            ))}
          </div>
        )}
      </div>

      <div className="poll-map-layout">
        <div className="germany-map-wrap polling">
          <svg className="germany-map polling-map" viewBox={mapGeometry.viewBox} role="img" aria-label={title}>
            <defs>
              {states.map((region) => {
                const metric = metrics.get(region.slug);
                if (metric?.parties.length < 2) return null;
                return (
                  <pattern
                    key={region.mapId}
                    id={`map-tie-${region.mapId}`}
                    width="16"
                    height="16"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(35)"
                  >
                    <rect width="8" height="16" fill={metric.parties[0].color} />
                    <rect x="8" width="8" height="16" fill={metric.parties[1].color} />
                  </pattern>
                );
              })}
            </defs>
            <g className="poll-map-shapes">
              {mapLocations.map(({ location, region, metric }) => (
                <a
                  key={location.id}
                  href={`/?region=${region.slug}`}
                  aria-label={`${region.name}: ${metric.title}; ${isGerman ? "Stand" : "latest"} ${formatDate(region.latestDate, locale, { year: true })}`}
                  onPointerEnter={() => setFocusedSlug(region.slug)}
                  onFocus={() => setFocusedSlug(region.slug)}
                >
                  <path
                    className={`poll-map-state ${focused?.slug === region.slug ? "active" : ""}`}
                    d={location.path}
                    style={{ fill: metric.fill, fillOpacity: metric.opacity }}
                  >
                    <title>{region.name} · {metric.title} · {formatDate(region.latestDate, locale, { year: true })}</title>
                  </path>
                </a>
              ))}
            </g>
            {focusedLocation && (
              <g className="poll-map-selection-outline" aria-hidden="true">
                <path className="selection-halo" d={focusedLocation.path} />
                <path className="selection-stroke" d={focusedLocation.path} />
              </g>
            )}
            <g className="poll-map-labels" aria-hidden="true">
              {mapLocations.map(({ location, metric, position }) => {
                if (!position) return null;
                const callout = Number.isFinite(position.calloutX);
              return (
                <g
                  key={location.id}
                  className={`map-value-label ${callout ? "callout" : ""}`}
                >
                  {callout && (
                    <>
                      <line className="callout-halo" x1={position.calloutX} y1={position.calloutY} x2={position.x} y2={position.y} />
                      <line x1={position.calloutX} y1={position.calloutY} x2={position.x} y2={position.y} />
                    </>
                  )}
                  <g transform={`translate(${position.x} ${position.y})`}>
                    <rect x="-40" y="-19" width="80" height="38" rx="8" />
                    <text textAnchor="middle">
                      <tspan x="0" y="-3">{metric.label}</tspan>
                      <tspan className="map-value-number" x="0" y="12">{metric.valueLabel}</tspan>
                    </text>
                  </g>
                </g>
              );
              })}
            </g>
          </svg>
        </div>

        {focused && focusedMetric && (
          <a className="poll-map-selection" href={`/?region=${focused.slug}`}>
            <div className="poll-map-selection-top">
              <span>{l("Ausgewählt", "selected")}</span>
              <span aria-hidden="true">→</span>
            </div>
            <strong>{focused.name}</strong>
            {isStale(focused) && (
              <span className="map-stale-badge">
                {l((days) => `Älterer Stand · ${days} Tage`, "olderData", ageInDays(focused))}
              </span>
            )}
            <div className="poll-map-focus-value">
              {focusedMetric.parties[0] && <i style={{ background: focusedMetric.parties[0].color }} />}
              <span>{focusedMetric.label}</span>
              <b>{focusedMetric.valueLabel}</b>
            </div>
            <dl>
              <div><dt>{l("Stand", "latestLabel")}</dt><dd>{formatDate(focused.latestDate, locale, { year: true })}</dd></div>
              <div><dt>{l("Institute im Mittel", "pollstersAverage")}</dt><dd>{focused.current.instituteCount}</dd></div>
            </dl>
            <small>{mode === "growth"
              ? l((count) => `${count} Umfragen auf einer linearen 180-Tage-Trendlinie; bei zu wenigen Daten keine Einfärbung.`, "growthNote", focused.movement.observationCount)
              : l("Je Institut zählt die jüngste Umfrage innerhalb von 45 Tagen gleich.", "averageNote")}</small>
          </a>
        )}
      </div>
    </div>
  );
}

function buildMapEmbedUrl({ locale, theme, mode, partyId }) {
  const url = new URL(EMBED_PATH, window.location.origin);
  url.searchParams.set("embed", "1");
  url.searchParams.set("view", "map");
  url.searchParams.set("lang", locale);
  url.searchParams.set("theme", theme);
  url.searchParams.set("mapMode", mode);
  url.searchParams.set("mapParty", partyId);
  return url.toString();
}

function MapEmbedModal({ open, onClose, t, locale, mode, partyId }) {
  const [embedTheme, setEmbedTheme] = useState("light");
  const [embedHeight, setEmbedHeight] = useState("standard");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const isGerman = locale === "de";
  const heights = { compact: 520, standard: 680, large: 820 };
  const embedUrl = buildMapEmbedUrl({ locale, theme: embedTheme, mode, partyId });
  const code = `<iframe src="${embedUrl}" width="100%" height="${heights[embedHeight]}" style="border:0;display:block;width:100%;max-width:100%" loading="lazy" referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox" title="${isGerman ? "Pollframe Deutschlandkarte" : "Pollframe map of Germany"}"></iframe>`;
  const shareUrl = buildMapShareUrl({ locale, mode, partyId });
  const copyCode = async () => {
    await copyToClipboard(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };
  const copyLink = async () => {
    await copyToClipboard(shareUrl);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 1800);
  };
  if (!open) return null;
  return (
    <div className="overlay modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="embed-modal" role="dialog" aria-modal="true" aria-labelledby="map-embed-title">
        <div className="panel-header">
          <h2 id="map-embed-title">{isGerman ? "Deutschlandkarte einbetten" : "Embed map of Germany"}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t.close}><Icon name="close" /></button>
        </div>
        <p className="modal-intro">{isGerman
          ? "Die eingebettete Karte bleibt interaktiv: Leser können zwischen stärkster Partei, Parteivergleich und Zuwachs wechseln."
          : "The embedded map stays interactive: readers can switch between leading party, party comparison and gains."}</p>
        <div className="embed-options">
          <div>
            <span>{t.embedTheme}</span>
            <div className="segmented">
              {[["light", t.embedLight], ["dark", t.embedDark], ["system", t.embedAuto]].map(([value, label]) => (
                <button key={value} className={embedTheme === value ? "selected" : ""} onClick={() => setEmbedTheme(value)}>{label}</button>
              ))}
            </div>
          </div>
          <div>
            <span>{t.embedHeight}</span>
            <div className="segmented">
              {[["compact", t.embedCompact], ["standard", t.embedStandard], ["large", t.embedLarge]].map(([value, label]) => (
                <button key={value} className={embedHeight === value ? "selected" : ""} onClick={() => setEmbedHeight(value)}>{label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="embed-live-preview map-preview">
          <iframe
            src={embedUrl}
            title={isGerman ? "Vorschau der Deutschlandkarte" : "Map preview"}
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          />
        </div>
        <label className="code-label">
          {t.embedPreview}
          <code>{code}</code>
        </label>
        <div className="embed-actions">
          <button className="secondary-button" onClick={copyLink}><Icon name="share" />{linkCopied ? t.linkCopied : t.copyLink}</button>
          <button className="primary-button" onClick={copyCode}><Icon name="share" />{copied ? t.copied : t.copyCode}</button>
          <a className="secondary-button" href={embedUrl} target="_blank" rel="noreferrer">{t.embedOpen}<Icon name="external" size={15} /></a>
        </div>
        <small className="embed-privacy"><Icon name="check" size={14} />{t.embedPrivacy}</small>
      </section>
    </div>
  );
}

function MapEmbedView({ t, locale, data, mapGeometry, mode, setMode, partyId, setPartyId, focusedSlug, setFocusedSlug }) {
  const isGerman = locale === "de";
  return (
    <main className="map-embed-page">
      <header className="embed-header">
        <div>
          <span className="embed-brand"><BrandMark />POLLFRAME</span>
          <h1>{isGerman ? "Deutschland im Überblick" : "Germany at a glance"}</h1>
        </div>
        <span>{isGerman ? "Je Land neuester verfügbarer Stand" : "Latest available figure for each state"}</span>
      </header>
      <GermanyPollingMap
        data={data}
        mapGeometry={mapGeometry}
        locale={locale}
        mode={mode}
        setMode={setMode}
        partyId={partyId}
        setPartyId={setPartyId}
        focusedSlug={focusedSlug}
        setFocusedSlug={setFocusedSlug}
        embed
      />
      <footer className="embed-footer">
        <DataAttribution locale={locale} metadata={data.metadata} includeMap />
        <a href="/?view=map" target="_blank" rel="noreferrer">{isGerman ? "Interaktiv öffnen" : "Open interactive"} <Icon name="external" size={13} /></a>
      </footer>
    </main>
  );
}

const overviewLanguage = {
  "en-GB": {
    germany: "Germany", federalAndStates: "Federal and state elections", germanyOverview: "Germany at a glance",
    overviewIntro: "National elections first, with all 16 states in the main map below. Every card leads to a complete information page.",
    countryOverview: "Country overview", currentHistory: "Current polls · historical series", electionsAndMaps: "Elections and maps in Germany",
    nationalLevel: "National level", federalElection: "Federal election", federalWidget: "Current average, long-term trend, pollsters, events and seat model.",
    stateComparison: "State comparison", stateWidget: "Compare party strength and movement across all 16 states on a customisable map.",
    pollsLabel: "Polls", sinceLabel: "Since", latestLabel: "Latest", statesLabel: "States", viewsLabel: "Views", sharingLabel: "Sharing",
    mapLoading: "Loading state data…", customizeMap: "Customise map", embedMap: "Embed map", leadingParty: "Leading party", compareParty: "Compare party", largestGain: "Largest gain",
    mapQuestion: "What should the map show?", mapView: "Map view", chooseParty: "Choose a party", trend180: "Trend · 180 days", latestAverage: "Latest state average",
    leadingTitle: "Leading party in each state’s latest average", gainTitle: "Largest estimated gain", acrossStates: "across the states", selected: "Selected", olderData: (days) => `Older data · ${days} days`,
    pollstersAverage: "Pollsters in average", growthNote: (count) => `${count} polls in a linear 180-day trend; no colour where data is insufficient.`, averageNote: "Each pollster’s latest poll within 45 days receives equal weight.",
    mapDataNote: "The state map and every state page use available values only; data gaps remain visible at individual points.",
    coverageTitle: "Data coverage", stateMap: "State map", coverageIntro: "Choose a state to open its complete polling series. Colour intensity indicates how dense the available series is.",
    coverageGood: "Good series", coverageFair: "Usable, but thinner", coverageLimited: "Limited series", pollsWord: "polls", coverageAria: "Polling coverage by state",
  },
  tr: {
    germany: "Almanya", federalAndStates: "Federal ve eyalet seçimleri", germanyOverview: "Almanya'ya genel bakış",
    overviewIntro: "Önce federal seçimler, ardından ana haritada 16 eyalet. Her kart ayrıntılı bir bilgi sayfasına açılır.",
    countryOverview: "Ülke görünümü", currentHistory: "Güncel anketler · geçmiş seriler", electionsAndMaps: "Almanya'daki seçimler ve haritalar",
    nationalLevel: "Federal düzey", federalElection: "Federal seçim", federalWidget: "Güncel ortalama, uzun vadeli eğilim, kurumlar, olaylar ve sandalye modeli.",
    stateComparison: "Eyalet karşılaştırması", stateWidget: "16 eyalette parti gücünü ve değişimi özelleştirilebilir haritada karşılaştırın.",
    pollsLabel: "Anket", sinceLabel: "Başlangıç", latestLabel: "Son", statesLabel: "Eyalet", viewsLabel: "Görünüm", sharingLabel: "Paylaşım",
    mapLoading: "Eyalet verileri yükleniyor…", customizeMap: "Haritayı özelleştir", embedMap: "Haritayı yerleştir", leadingParty: "En güçlü parti", compareParty: "Parti karşılaştır", largestGain: "En büyük artış",
    mapQuestion: "Harita neyi göstersin?", mapView: "Harita görünümü", chooseParty: "Parti seçin", trend180: "Eğilim · 180 gün", latestAverage: "Son eyalet ortalaması",
    leadingTitle: "Her eyaletin son ortalamasındaki en güçlü parti", gainTitle: "Tahmini en büyük artış", acrossStates: "eyalet karşılaştırması", selected: "Seçili", olderData: (days) => `Eski veri · ${days} gün`,
    pollstersAverage: "Ortalamadaki kurumlar", growthNote: (count) => `180 günlük doğrusal eğilimde ${count} anket; yetersiz veride renk yok.`, averageNote: "Her kurumun 45 gün içindeki son anketi eşit ağırlıktadır.", mapDataNote: "Harita ve eyalet sayfaları yalnızca mevcut değerleri kullanır; boşluklar tekil noktalarda görünür kalır.",
    coverageTitle: "Veri kapsamı", stateMap: "Eyalet haritası", coverageIntro: "Tüm anket serisini açmak için bir eyalet seçin. Renk yoğunluğu mevcut serinin sıklığını gösterir.", coverageGood: "İyi seri", coverageFair: "Kullanılabilir, daha seyrek", coverageLimited: "Sınırlı seri", pollsWord: "anket", coverageAria: "Eyaletlere göre anket kapsamı",
  },
  ru: {
    germany: "Германия", federalAndStates: "Федеральные и земельные выборы", germanyOverview: "Германия в целом",
    overviewIntro: "Сначала федеральные выборы, затем 16 земель на большой карте. Каждая карточка ведёт на подробную страницу.",
    countryOverview: "Обзор страны", currentHistory: "Текущие опросы · исторические ряды", electionsAndMaps: "Выборы и карты Германии",
    nationalLevel: "Федеральный уровень", federalElection: "Выборы в Бундестаг", federalWidget: "Текущее среднее, долгосрочный тренд, институты, события и модель мест.",
    stateComparison: "Сравнение земель", stateWidget: "Сравните силу партий и изменения во всех 16 землях на настраиваемой карте.",
    pollsLabel: "Опросы", sinceLabel: "С", latestLabel: "Последний", statesLabel: "Земли", viewsLabel: "Виды", sharingLabel: "Публикация",
    mapLoading: "Загрузка данных земель…", customizeMap: "Настроить карту", embedMap: "Встроить карту", leadingParty: "Лидирующая партия", compareParty: "Сравнить партию", largestGain: "Наибольший рост",
    mapQuestion: "Что показать на карте?", mapView: "Вид карты", chooseParty: "Выберите партию", trend180: "Тренд · 180 дней", latestAverage: "Последнее среднее по земле",
    leadingTitle: "Лидирующая партия в последнем среднем каждой земли", gainTitle: "Наибольший расчётный рост", acrossStates: "по землям", selected: "Выбрано", olderData: (days) => `Старые данные · ${days} дней`,
    pollstersAverage: "Институтов в среднем", growthNote: (count) => `${count} опросов в линейном тренде за 180 дней; без окраски при нехватке данных.`, averageNote: "Последний опрос каждого института за 45 дней имеет равный вес.", mapDataNote: "Карта и страницы земель используют только имеющиеся значения; пробелы видны в отдельных точках.",
    coverageTitle: "Охват данных", stateMap: "Карта земель", coverageIntro: "Выберите землю, чтобы открыть весь ряд опросов. Насыщенность цвета показывает плотность доступных данных.", coverageGood: "Хороший ряд", coverageFair: "Достаточный, но редкий", coverageLimited: "Ограниченный ряд", pollsWord: "опросов", coverageAria: "Охват опросов по землям",
  },
  ar: {
    germany: "ألمانيا", federalAndStates: "الانتخابات الاتحادية وانتخابات الولايات", germanyOverview: "نظرة عامة على ألمانيا",
    overviewIntro: "الانتخابات الاتحادية أولاً، ثم الولايات الـ16 على الخريطة الكبيرة. تفتح كل بطاقة صفحة معلومات كاملة.",
    countryOverview: "نظرة على البلد", currentHistory: "استطلاعات حالية · سلاسل تاريخية", electionsAndMaps: "الانتخابات والخرائط في ألمانيا",
    nationalLevel: "المستوى الاتحادي", federalElection: "الانتخابات الاتحادية", federalWidget: "المتوسط الحالي والاتجاه طويل المدى والمؤسسات والأحداث ونموذج المقاعد.",
    stateComparison: "مقارنة الولايات", stateWidget: "قارن قوة الأحزاب وحركتها في الولايات الـ16 على خريطة قابلة للتخصيص.",
    pollsLabel: "استطلاعات", sinceLabel: "منذ", latestLabel: "الأحدث", statesLabel: "ولايات", viewsLabel: "عروض", sharingLabel: "مشاركة",
    mapLoading: "جارٍ تحميل بيانات الولايات…", customizeMap: "تخصيص الخريطة", embedMap: "تضمين الخريطة", leadingParty: "الحزب الأقوى", compareParty: "مقارنة حزب", largestGain: "أكبر نمو",
    mapQuestion: "ماذا تريد أن تعرض الخريطة؟", mapView: "عرض الخريطة", chooseParty: "اختر حزباً", trend180: "اتجاه · 180 يوماً", latestAverage: "أحدث متوسط للولاية",
    leadingTitle: "الحزب الأقوى في أحدث متوسط لكل ولاية", gainTitle: "أكبر نمو تقديري", acrossStates: "بين الولايات", selected: "المحدد", olderData: (days) => `بيانات أقدم · ${days} يوماً`,
    pollstersAverage: "المؤسسات في المتوسط", growthNote: (count) => `${count} استطلاعاً في اتجاه خطي لمدة 180 يوماً؛ لا لون عند نقص البيانات.`, averageNote: "يحصل أحدث استطلاع لكل مؤسسة خلال 45 يوماً على وزن متساوٍ.", mapDataNote: "تستخدم الخريطة وصفحات الولايات القيم المتاحة فقط؛ تبقى فجوات البيانات ظاهرة عند النقاط الفردية.",
    coverageTitle: "تغطية البيانات", stateMap: "خريطة الولايات", coverageIntro: "اختر ولاية لفتح سلسلة استطلاعاتها كاملة. تدل كثافة اللون على كثافة البيانات المتاحة.", coverageGood: "سلسلة جيدة", coverageFair: "صالحة لكنها أقل كثافة", coverageLimited: "سلسلة محدودة", pollsWord: "استطلاع", coverageAria: "تغطية الاستطلاعات حسب الولاية",
  },
};

function overviewText(locale) {
  if (locale === "de") return null;
  return overviewLanguage[locale] ?? overviewLanguage["en-GB"];
}

function OverviewInfoWidget({ href, eyebrow, title, text, stats, accent }) {
  return (
    <a className={`federal-entry overview-classic-widget ${accent === "opinion" ? "map-entry" : ""}`} href={href}>
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      <dl>{stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <span className="entry-arrow" aria-hidden="true">→</span>
    </a>
  );
}

function CountryIndexPage({ locale, summary }) {
  const isGerman = locale === "de";
  const l = (de, en, es) => locale === "es" ? es : isGerman ? de : en;
  const germanFederal = summary?.germany?.regions?.find((region) => region.type === "federal");
  const uk = summary?.uk?.westminster;
  const spain = summary?.spain?.congress;
  return (
    <main id="top" className="germany-country-overview country-index-page">
      <nav className="region-breadcrumb country-breadcrumb" aria-label="Navigation"><strong>Pollframe</strong></nav>
      <section className="germany-country-hero country-index-hero">
        <div><div className="eyebrow"><span />{l("Verfügbare Länder", "Available countries", "Países disponibles")}</div><h1>{l("Land auswählen", "Select a country", "Seleccionar país")}</h1><p>{l("Wähle die politische Ebene, die du öffnen möchtest. Jedes Land verwendet seine eigene Datenlage und Methodik.", "Choose the political system you want to explore. Each country uses its own available data and methodology.", "Elige el sistema político que quieres explorar. Cada país utiliza sus propios datos y su propia metodología.")}</p></div>
      </section>
      <section className="overview-entry-stack country-index-grid" aria-label={isGerman ? "Länderauswahl" : "Country selection"}>
        <OverviewInfoWidget accent="parliament" href="/" eyebrow={l("Bundestag und Länder", "Federal and state elections", "Bundestag y estados federados")} title={`🇩🇪 ${l("Deutschland", "Germany", "Alemania")}`} text={l("Bundestagsumfragen und die 16 Länder in einer gemeinsamen Übersicht.", "Federal polling and all 16 states in one overview.", "Encuestas federales y los 16 estados en una sola vista.")} stats={[[l("Umfragen", "Polls", "Encuestas"), germanFederal?.pollCount?.toLocaleString(getNumberLocale(locale)) ?? "–"], [l("Seit", "Since", "Desde"), germanFederal?.firstDate?.slice(0, 4) ?? "2017"], [l("Ebenen", "Levels", "Niveles"), "17"]]} />
        <OverviewInfoWidget accent="opinion" href="/?country=uk" eyebrow={l("Westminster und Regionen", "Westminster and regions", "Westminster y regiones")} title="🇬🇧 United Kingdom" text={l("Unterhausumfragen seit 1943 und regionale Ergebnisse der Wahl 2024.", "Westminster polling since 1943 and regional results from the 2024 election.", "Encuestas de Westminster desde 1943 y resultados regionales de 2024.")} stats={[[l("Umfragen", "Polls", "Encuestas"), uk?.pollCount?.toLocaleString(getNumberLocale(locale)) ?? "–"], [l("Seit", "Since", "Desde"), uk?.firstDate?.slice(0, 4) ?? "1943"], [l("Aktualisiert", "Updated", "Actualizado"), uk?.latestDate ? formatDate(uk.latestDate, locale) : "–"]]} />
        <OverviewInfoWidget accent="parliament" href="/?country=es" eyebrow={locale === "es" ? "Congreso y autonomías" : isGerman ? "Kongress und Autonomien" : "Congress and autonomies"} title="🇪🇸 España" text={locale === "es" ? "Intención de voto, evolución desde 1996, preocupaciones públicas y territorios." : isGerman ? "Wahlabsicht seit 1996, öffentliche Sorgen und Regionen." : "Voting intention since 1996, public concerns and territories."} stats={[[locale === "es" ? "Encuestas" : isGerman ? "Umfragen" : "Polls", spain?.pollCount?.toLocaleString(getNumberLocale(locale)) ?? "–"], [locale === "es" ? "Desde" : isGerman ? "Seit" : "Since", spain?.firstDate?.slice(0, 4) ?? "1996"], [locale === "es" ? "Actualizado" : isGerman ? "Aktualisiert" : "Updated", spain?.latestDate ? formatDate(spain.latestDate, locale) : "–"]]} />
      </section>
    </main>
  );
}

function GermanyCountryOverview({ locale, summary, mapOnly = false }) {
  const isGerman = locale === "de";
  const language = overviewText(locale);
  const l = (german, key) => isGerman ? german : language[key];
  const [mapGeometry, setMapGeometry] = useState(null);
  useEffect(() => {
    let active = true;
    import("@svg-maps/germany").then((module) => {
      if (active) setMapGeometry(module.default);
    }).catch(() => {
      if (active) setMapGeometry(null);
    });
    return () => { active = false; };
  }, []);
  const regions = summary?.regions ?? [];
  const states = regions.filter((region) => region.type === "state");
  const federal = regions.find((region) => region.type === "federal");
  const lastVisitSnapshot = useMemo(() => standardPollingSnapshot(summary?.federalPolling), [summary]);
  if (mapOnly) return (
    <main id="top" className="germany-country-overview state-map-app-page">
      <nav className="region-breadcrumb country-breadcrumb" aria-label="Navigation"><BackButton fallback="/" label={isGerman ? "Zurück" : "Back"} /><span>/</span><strong>{l("Länderkarte", "stateMap")}</strong></nav>
      {states.length > 0 && <StateCoverageMap states={states} locale={locale} mapGeometry={mapGeometry} />}
    </main>
  );
  return (
    <main id="top" className="germany-country-overview">
      <nav className="region-breadcrumb country-breadcrumb" aria-label="Navigation"><strong>{l("Deutschland", "germany")}</strong></nav>
      <section className="germany-country-hero">
        <div><div className="eyebrow"><span />{l("Bundestag und Länder", "federalAndStates")}</div><h1>🇩🇪 {l("Deutschland im Überblick", "germanyOverview")}</h1><p>{l("Bundesweite Wahlen oben, die 16 Länder in der großen Karte darunter. Jede Karte führt zu einer vollständigen Informationsseite.", "overviewIntro")}</p></div>
        <div className="overview-profile-badge"><span>{l("Länderübersicht", "countryOverview")}</span><strong>{l("Deutschland", "germany")}</strong><small>{l("Laufende Umfragen · historische Reihen", "currentHistory")}</small></div>
      </section>
      <SinceLastVisit locale={locale} country="de" snapshot={lastVisitSnapshot} partyDefinitions={PARTY_DEFINITIONS} />
      <section className="overview-entry-stack" aria-label={l("Wahlen und Karten in Deutschland", "electionsAndMaps")}>
        <OverviewInfoWidget accent="parliament" href="/?region=bundestag" eyebrow={l("Nationale Ebene", "nationalLevel")} title={l("Bundestagswahl", "federalElection")} text={l("Aktueller Durchschnitt, langfristiger Trend, Institute, Ereignisse und Sitzmodell.", "federalWidget")} stats={[[l("Umfragen", "pollsLabel"), federal?.pollCount?.toLocaleString(getNumberLocale(locale)) ?? "–"], [l("Seit", "sinceLabel"), federal?.firstDate ? new Date(parseDate(federal.firstDate)).getUTCFullYear() : "–"], [l("Zuletzt", "latestLabel"), federal ? formatDate(federal.latestDate, locale, { year: true }) : "–"]]} />
        <OverviewInfoWidget accent="opinion" href="/?view=map" eyebrow={l("Vergleich der Länder", "stateComparison")} title={l("Deutschland im Überblick", "germanyOverview")} text={l("Parteistärken und Bewegungen auf einer anpassbaren Karte über alle 16 Länder vergleichen.", "stateWidget")} stats={[[l("Länder", "statesLabel"), "16"], [l("Ansichten", "viewsLabel"), "3"], [l("Teilen", "sharingLabel"), "Embed"]]} />
      </section>
      {states.length > 0 && <StateCoverageMap states={states} locale={locale} mapGeometry={mapGeometry} />}
      <p className="germany-country-note">{l("Länderkarte und jede Länderansicht verwenden ausschließlich vorhandene Werte; Datenlücken bleiben an den einzelnen Punkten sichtbar.", "mapDataNote")}</p>
    </main>
  );
}

function mixWithWhite(hex, intensity) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : "#7c858f";
  const weight = Math.max(0.18, Math.min(1, intensity));
  const channels = [1, 3, 5].map((offset) => Number.parseInt(safe.slice(offset, offset + 2), 16));
  return `rgb(${channels.map((channel) => Math.round(255 - ((255 - channel) * weight))).join(",")})`;
}

function UKElectionMap({ summary, locale }) {
  const [MapComponent, setMapComponent] = useState(null);
  const [selectedArea, setSelectedArea] = useState("Greater London");
  const [hoveredArea, setHoveredArea] = useState(null);
  const [mode, setMode] = useState("winner");
  const [partyId, setPartyId] = useState("201");
  const [showPointerAdvice, setShowPointerAdvice] = useState(() => (
    navigator.maxTouchPoints === 0 && window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ));
  const mapRef = useRef(null);
  const isGerman = locale === "de";
  const areas = summary?.map?.areas ?? {};
  useEffect(() => {
    let active = true;
    import("@react-map/united-kingdom").then((module) => {
      if (active) setMapComponent(() => module.default);
    }).catch(() => {
      if (active) setMapComponent(null);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setShowPointerAdvice(navigator.maxTouchPoints === 0 && media.matches);
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  const definitions = UK_PARTY_DEFINITIONS.filter((party) => party.id !== "209" && party.id !== "210" && party.id !== "211");
  const maximumPartyShare = Math.max(1, ...Object.values(areas).map((area) => area.shares?.[partyId] ?? 0));
  const colors = Object.fromEntries(Object.entries(areas).map(([name, area]) => {
    const leader = UK_MAP_PARTY_DEFINITIONS.find((party) => party.id === area.leaderId);
    if (mode === "winner") return [name, leader?.color ?? "#d8dde2"];
    const party = UK_PARTY_DEFINITIONS.find((item) => item.id === partyId);
    const value = area.shares?.[partyId] ?? 0;
    return [name, value > 0 ? mixWithWhite(party?.color, 0.38 + (0.62 * value / maximumPartyShare)) : "#edf0f2"];
  }));
  colors.Ireland = "#eef0f2";
  const displayedArea = hoveredArea ?? selectedArea;
  const selected = areas[displayedArea] ?? areas["Greater London"];
  const rankedAll = UK_MAP_PARTY_DEFINITIONS
    .map((party) => ({ ...party, value: selected?.shares?.[party.id] }))
    .filter((party) => Number.isFinite(party.value))
    .sort((a, b) => b.value - a.value);
  const ranked = mode === "party"
    ? [rankedAll.find((party) => party.id === partyId), ...rankedAll.filter((party) => party.id !== partyId)].filter(Boolean).slice(0, 5)
    : rankedAll.slice(0, 5);
  const areaFromTarget = (target) => {
    const path = target.closest?.("path[id]");
    if (!path) return null;
    return Object.keys(areas).find((name) => path.id.startsWith(`${name}-`)) ?? null;
  };
  useEffect(() => {
    if (!MapComponent || mode !== "party") return undefined;
    const frame = window.requestAnimationFrame(() => {
      const svg = mapRef.current?.querySelector("svg");
      if (!svg) return;
      svg.querySelectorAll(".uk-map-value-label").forEach((node) => node.remove());
      Object.entries(areas).forEach(([name, area]) => {
        const path = [...svg.querySelectorAll("path[id]")].find((node) => node.id.startsWith(`${name}-`));
        const value = area.shares?.[partyId];
        if (!path || !Number.isFinite(value)) return;
        const box = path.getBBox();
        if (box.width < 20 || box.height < 13 || name === "Rutland") return;
        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", String(box.x + (box.width / 2)));
        label.setAttribute("y", String(box.y + (box.height / 2) + 3));
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("class", "uk-map-value-label");
        label.textContent = `${value.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 0 })}%`;
        svg.appendChild(label);
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [MapComponent, mode, partyId, areas, locale]);
  useEffect(() => {
    const svg = mapRef.current?.querySelector("svg");
    if (!svg) return;
    svg.querySelectorAll(".uk-map-active-overlay").forEach((node) => node.remove());
    const activePath = [...svg.querySelectorAll("path[id]")].find((node) => node.id.startsWith(`${displayedArea}-`));
    if (!activePath) return;
    const overlay = activePath.cloneNode(false);
    overlay.removeAttribute("id");
    overlay.removeAttribute("style");
    overlay.setAttribute("class", "uk-map-active-overlay");
    overlay.setAttribute("fill", "none");
    overlay.setAttribute("vector-effect", "non-scaling-stroke");
    overlay.setAttribute("aria-hidden", "true");
    svg.append(overlay);
  }, [MapComponent, displayedArea, mode, partyId]);
  return (
    <section className="uk-map-card" aria-labelledby="uk-map-title">
      <div className="uk-map-heading">
        <div><p className="section-label uk-historical-label">{isGerman ? "Historisches Ergebnis · 4. Juli 2024 · keine aktuelle Umfrage" : "Historical result · 4 July 2024 · not current polling"}</p><h2 id="uk-map-title">{isGerman ? "Regionales Ergebnis der Unterhauswahl 2024" : "Regional result of the 2024 general election"}</h2><p>{isGerman ? "Amtliches Wahlergebnis nach historischen englischen Grafschaften sowie für Schottland, Wales und Nordirland." : "Official election result by historic English county, plus Scotland, Wales and Northern Ireland."} {showPointerAdvice && <span className="uk-map-pointer-advice">{isGerman ? "Fahre mit der Maus über eine Fläche, um ihre Werte zu sehen." : "Move the pointer over an area to inspect its result."}</span>}</p></div>
        <div className="uk-map-controls" aria-label={isGerman ? "Kartenansicht" : "Map view"}>
          <div className="segmented"><button className={mode === "winner" ? "selected" : ""} onClick={() => setMode("winner")}>{isGerman ? "Stärkste Partei" : "Winner"}</button><button className={mode === "party" ? "selected" : ""} onClick={() => setMode("party")}>{isGerman ? "Partei vergleichen" : "Compare party"}</button></div>
          {mode === "party" && <SelectControl label={isGerman ? "Partei" : "Party"} value={partyId} onChange={setPartyId} options={definitions.map((party) => ({ value: party.id, label: party.name }))} />}
        </div>
      </div>
      <div className="uk-map-layout">
        <div
          className="uk-map-visual"
          ref={mapRef}
          onPointerMove={(event) => setHoveredArea(areaFromTarget(event.target))}
          onPointerLeave={() => setHoveredArea(null)}
        >
          {MapComponent ? <MapComponent type="select-single" size={570} mapColor="#e7eaed" cityColors={colors} strokeColor="#ffffff" strokeWidth={1.4} selectColor={colors[selectedArea] ?? "#e7eaed"} disableHover hints={false} onSelect={(name) => name && name !== "Ireland" && areas[name] && setSelectedArea(name)} /> : <div className="map-loading">{isGerman ? "Karte wird geladen …" : "Loading map…"}</div>}
          <span className="uk-map-geography-note">{isGerman ? "Republik Irland ist nicht Teil dieser Darstellung" : "Republic of Ireland is outside this view"}</span>
        </div>
        <aside className="uk-map-detail" aria-live="polite">
          <span>{hoveredArea ? (isGerman ? "Unter dem Zeiger · Ergebnis 2024" : "Under pointer · 2024 result") : (isGerman ? "Ausgewählt · Ergebnis 2024" : "Selected · 2024 result")}</span><h3>{displayedArea}</h3><time dateTime={summary.map.electionDate}>{formatDate(summary.map.electionDate, locale, { year: true })}</time>
          <div className="uk-map-party-list">{ranked.map((party) => <div className={mode === "party" && party.id === partyId ? "focused" : ""} key={party.id}><span><i style={{ background: party.color }} />{party.name}</span><strong>{party.value.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%</strong></div>)}</div>
          <small>{isGerman ? "Stimmenanteile der Unterhauswahl 2024; keine aktuelle Umfrage." : "Vote shares at the 2024 general election; not a current poll."}</small>
        </aside>
      </div>
      <p className="uk-map-method"><Icon name="info" size={15} />{isGerman ? "Die Karte nutzt historische Grafschaftsgruppen, weil Unterhauswahlkreise Grenzen überschneiden können. Sie ist eine regionale Zusammenfassung, keine Wahlkreisprognose." : "The map uses historic county groupings because parliamentary constituencies can cross boundaries. It is a regional summary, not a constituency forecast."}</p>
      <p className="uk-map-source"><DataAttribution locale={locale} metadata={summary.metadata} includeElection electionSourceUrl={summary.metadata.electionSourceUrl} electionSourceLabel="House of Commons Library" /> · {isGerman ? "Kartengeometrie" : "Map geometry"}: <a href="https://github.com/shubhexists/react-maps" target="_blank" rel="noreferrer">@react-map/united-kingdom (MIT)</a></p>
    </section>
  );
}

function UKCountryOverview({ locale, summary }) {
  const isGerman = locale === "de";
  const mapOnly = new URLSearchParams(window.location.search).get("view") === "uk-map";
  useEffect(() => {
    const prefetch = document.createElement("link");
    prefetch.rel = "prefetch";
    prefetch.as = "fetch";
    prefetch.href = "/data/uk-westminster.json";
    prefetch.crossOrigin = "anonymous";
    document.head.append(prefetch);
    return () => prefetch.remove();
  }, []);
  return (
    <main id="top" className={`germany-country-overview uk-country-overview ${mapOnly ? "uk-map-only" : ""}`}>
      <nav className="region-breadcrumb country-breadcrumb" aria-label="Navigation">{mapOnly && <><BackButton fallback="/?country=uk" label={isGerman ? "Zurück" : "Back"} /><span>/</span></>}<strong>United Kingdom</strong></nav>
      {!mapOnly && <><section className="germany-country-hero uk-country-hero">
        <div><div className="eyebrow"><span />{isGerman ? "Westminster und vier Landesteile" : "Westminster and four nations"}</div><h1>🇬🇧 {isGerman ? "Vereinigtes Königreich im Überblick" : "United Kingdom at a glance"}</h1><p>{isGerman ? "Langfristige Westminster-Umfragen, der besondere Effekt des Mehrheitswahlrechts und regionale Wahlergebnisse – klar getrennt nach Großbritannien und dem gesamten UK." : "Long-run Westminster polling, the distinctive effect of first past the post and regional election results—clearly separating Great Britain from the whole UK."}</p></div>
      </section>
      <SinceLastVisit locale={locale} country="uk" snapshot={summary.current} partyDefinitions={UK_PARTY_DEFINITIONS} />
      <section className="overview-entry-stack" aria-label={isGerman ? "Britische Wahlseiten" : "UK election pages"}>
        <OverviewInfoWidget accent="parliament" href="/?region=uk-westminster" eyebrow="Westminster" title={isGerman ? "Unterhaus-Umfragen" : "Westminster polling"} text={isGerman ? "Mehr als 80 Jahre Umfragegeschichte, Institute, Ereignisse und aktueller gewichteter Trend." : "More than 80 years of polling history, pollsters, events and the latest weighted trend."} stats={[[isGerman ? "Umfragen" : "Polls", summary.westminster.pollCount.toLocaleString(getNumberLocale(locale))], [isGerman ? "Seit" : "Since", "1943"], [isGerman ? "Gebiet" : "Area", "Great Britain"]]} />
        <OverviewInfoWidget accent="opinion" href="/?view=uk-constituencies" eyebrow={`650 ${isGerman ? "Wahlkreise" : "constituencies"}`} title={isGerman ? "Wahlkreisfinder" : "Constituency finder"} text={isGerman ? "Postcode-Suche und amtliche Ergebnisse aller Wahlkreise bei der Unterhauswahl 2024." : "Postcode search and official results for every constituency at the 2024 general election."} stats={[[isGerman ? "Wahlkreise" : "Seats", "650"], [isGerman ? "Wahl" : "Election", "2024"], [isGerman ? "Quelle" : "Source", "UK Parliament"]]} />
      </section></>}
      <UKElectionMap summary={summary} locale={locale} />
      {!mapOnly && <p className="germany-country-note">{isGerman ? "Wichtig: Westminster-Umfragen beziehen sich üblicherweise auf Großbritannien ohne Nordirland. Die Karte zeigt dagegen das amtliche Ergebnis im gesamten Vereinigten Königreich." : "Important: Westminster polls normally cover Great Britain without Northern Ireland. The map, by contrast, presents the official result across the full United Kingdom."}</p>}
    </main>
  );
}

const LEGACY_WATCHLIST_STORAGE_KEY = "pollframe-watchlist-v1";

function watchlistStorageKey(country) {
  return `pollframe-watchlist-${["uk", "es"].includes(country) ? country : "de"}-v2`;
}

function readWatchlist(country = "de") {
  try {
    const key = watchlistStorageKey(country);
    const stored = window.localStorage.getItem(key);
    if (stored) {
      const value = JSON.parse(stored);
      return Array.isArray(value) ? value.slice(0, 30) : [];
    }
    const legacy = JSON.parse(window.localStorage.getItem(LEGACY_WATCHLIST_STORAGE_KEY) || "[]");
    const migrated = Array.isArray(legacy) ? legacy.filter((item) => (item.country ?? "de") === country).slice(0, 30) : [];
    if (migrated.length) window.localStorage.setItem(key, JSON.stringify(migrated));
    return migrated;
  } catch {
    return [];
  }
}

function writeWatchlist(country, items) {
  try {
    window.localStorage.setItem(watchlistStorageKey(country), JSON.stringify(items.slice(0, 30)));
    window.dispatchEvent(new CustomEvent("pollframe-watchlist-change", { detail: { country } }));
  } catch { /* Local-only feature remains optional. */ }
}

function watchlistIdentity(item) {
  return `${item.regionSlug}:${item.type}:${[...(item.partyIds ?? [])].sort().join(",")}:${item.mapMode ?? ""}:${item.mapPartyId ?? ""}`;
}

function defaultWatchLayout(item, index = 0) {
  if (item.layout === "tall") return "large";
  if (item.type === "coalition") return "wide";
  if (item.layout) return item.layout;
  if (item.type === "snapshot") return "wide";
  if (item.type === "map") return "large";
  if (item.type === "coalition") return index === 0 ? "large" : "wide";
  return index === 0 ? "wide" : "square";
}

function WatchlistStar({ country, regionSlug, regionName, type = "party", partyIds, label, className = "" }) {
  const isInstalled = document.documentElement.dataset.standalone === "true"
    || window.matchMedia?.("(display-mode: standalone)").matches
    || window.navigator.standalone === true;
  const candidate = { country, regionSlug, type, partyIds };
  const identity = watchlistIdentity(candidate);
  const [active, setActive] = useState(() => readWatchlist(country).some((item) => watchlistIdentity(item) === identity));
  useEffect(() => {
    const sync = (event) => {
      if (event.detail?.country && event.detail.country !== country) return;
      setActive(readWatchlist(country).some((item) => watchlistIdentity(item) === identity));
    };
    window.addEventListener("pollframe-watchlist-change", sync);
    return () => window.removeEventListener("pollframe-watchlist-change", sync);
  }, [country, identity]);
  if (!isInstalled) return null;
  const toggle = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const items = readWatchlist(country);
    const exists = items.some((item) => watchlistIdentity(item) === identity);
    const next = exists ? items.filter((item) => watchlistIdentity(item) !== identity) : [...items, {
      id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
      ...candidate,
      label: label ?? `${regionName} · ${partyIds.join(" + ")}`,
      layout: type === "party" ? "square" : "wide",
      createdAt: new Date().toISOString(),
      lastSnapshot: null,
    }];
    writeWatchlist(country, next);
    setActive(!exists);
  };
  return <button className={`watch-star ${active ? "active" : ""} ${className}`.trim()} type="button" onClick={toggle} aria-pressed={active} aria-label={active ? `Remove ${label} from Watchlist` : `Add ${label} to Watchlist`}><Icon name="star" size={18} /></button>;
}

function watchlistDefinitions(region, data) {
  const definitions = region.type === "uk-federal" ? UK_PARTY_DEFINITIONS : region.type === "spain-federal" ? SPAIN_PARTY_DEFINITIONS : PARTY_DEFINITIONS;
  const snapshot = standardPollingSnapshot(data, definitions);
  return definitions.filter((party) => Number.isFinite(snapshot?.results?.[party.id]));
}

function watchlistSnapshot(item, region, data) {
  const definitions = watchlistDefinitions(region, data);
  const current = standardPollingSnapshot(data, definitions);
  if (!current) return null;
  const values = Object.fromEntries(item.partyIds.map((id) => [id, current.results[id]]).filter(([, value]) => Number.isFinite(value)));
  const voteShare = Object.values(values).reduce((sum, value) => sum + value, 0);
  if (item.type === "snapshot") {
    const leaders = definitions.map((party) => ({ id: party.id, value: current.results[party.id] })).filter((party) => Number.isFinite(party.value)).sort((a, b) => b.value - a.value).slice(0, 5);
    return { date: current.date, leaders };
  }
  if (item.type === "map") return null;
  if (item.type === "issues") return null;
  if (item.type === "party") {
    const partyId = item.partyIds[0];
    const pollsters = data.metadata?.defaultPollsters ?? Object.keys(data.pollsters ?? {});
    const historyStart = toIso(parseDate(current.date) - (365 * DAY));
    const history = makeTrend(data.polls, pollsters, historyStart, current.date, definitions)
      .map((point) => Number(point.results[partyId]))
      .filter(Number.isFinite)
      .slice(-32);
    return { date: current.date, value: Object.values(values)[0], values, voteShare, history };
  }
  if (region.type === "uk-federal") return null;
  const totalSeats = region.baseSeats ?? 630;
  const allocation = allocateSeats(current.results, totalSeats, definitions, region.thresholdExemptPartyIds ?? []);
  const seats = allocation.parties.filter((party) => item.partyIds.includes(party.id)).reduce((sum, party) => sum + party.seats, 0);
  return { date: current.date, values, voteShare, seats, totalSeats, majority: seats >= Math.floor(totalSeats / 2) + 1 };
}

function watchlistSignals(item, snapshot, previous, region, definitions, locale) {
  if (!previous || !snapshot) return [];
  const isGerman = locale === "de";
  const signals = [];
  if (item.type === "party") {
    const party = definitions.find((entry) => entry.id === item.partyIds[0]);
    const delta = snapshot.value - previous.value;
    if (Math.abs(delta) >= 1) signals.push({ kind: "move", text: isGerman ? `${party?.name} in ${region.name}: ${delta > 0 ? "+" : ""}${delta.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })} Punkte` : `${party?.name} in ${region.name}: ${delta > 0 ? "+" : ""}${delta.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })} points` });
    if (["federal", "state"].includes(region.type) && Number.isFinite(previous.value) && Number.isFinite(snapshot.value)) {
      if (previous.value < 5 && snapshot.value >= 5) signals.push({ kind: "threshold", text: isGerman ? `${party?.name} liegt in ${region.name} jetzt bei mindestens 5 %.` : `${party?.name} is now at or above 5% in ${region.name}.` });
      if (previous.value >= 5 && snapshot.value < 5) signals.push({ kind: "threshold", text: isGerman ? `${party?.name} liegt in ${region.name} jetzt unter 5 %.` : `${party?.name} is now below 5% in ${region.name}.` });
    }
  } else if (previous.majority !== snapshot.majority) {
    signals.push({ kind: "majority", text: snapshot.majority ? (isGerman ? `${item.label} hat im Modell jetzt eine Mehrheit.` : `${item.label} now has a modelled majority.`) : (isGerman ? `${item.label} hat im Modell keine Mehrheit mehr.` : `${item.label} no longer has a modelled majority.`) });
  }
  return signals;
}

function LegacyWatchlistPage({ locale, initialCountry = "de" }) {
  const isGerman = locale === "de";
  const [items, setItems] = useState(() => readWatchlist(initialCountry));
  const [datasets, setDatasets] = useState({});
  const [regionSlug, setRegionSlug] = useState(initialCountry === "uk" ? "uk-westminster" : "bundestag");
  const [type, setType] = useState("party");
  const [partyIds, setPartyIds] = useState([]);
  const [cards, setCards] = useState([]);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [chosenLayout, setChosenLayout] = useState("square");
  const [addState, setAddState] = useState("idle");
  const [notificationState, setNotificationState] = useState(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [notificationPromptOpen, setNotificationPromptOpen] = useState(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return false;
    try { return window.localStorage.getItem(`pollframe-notification-intro-${initialCountry}`) !== "seen"; } catch { return false; }
  });
  const regions = REGION_META.filter((region) => initialCountry === "uk" ? region.type === "uk-federal" : region.type === "federal" || region.type === "state");
  const selectedRegion = regions.find((region) => region.slug === regionSlug) ?? regions[0];
  const selectedData = datasets[regionSlug];
  const selectedDefinitions = useMemo(() => selectedData ? watchlistDefinitions(selectedRegion, selectedData) : [], [selectedData, selectedRegion]);

  useBodyScrollLock(galleryOpen || notificationPromptOpen);

  useEffect(() => {
    const sync = (event) => {
      if (event.detail?.country && event.detail.country !== initialCountry) return;
      setItems(readWatchlist(initialCountry));
    };
    window.addEventListener("pollframe-watchlist-change", sync);
    return () => window.removeEventListener("pollframe-watchlist-change", sync);
  }, [initialCountry]);

  useEffect(() => {
    const slugs = [...new Set([regionSlug, ...items.map((item) => item.regionSlug)])];
    const missing = slugs.filter((slug) => !datasets[slug]);
    if (!missing.length) return undefined;
    const controller = new AbortController();
    Promise.all(missing.map((slug) => fetch(`/data/${slug}.json`, { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }).then((data) => [slug, data]))).then((entries) => setDatasets((current) => ({ ...current, ...Object.fromEntries(entries) }))).catch((error) => { if (error.name !== "AbortError") console.error("Watchlist data failed", error); });
    return () => controller.abort();
  }, [regionSlug, items, datasets]);

  useEffect(() => {
    if (!selectedDefinitions.length) return;
    setPartyIds((current) => {
      const valid = current.filter((id) => selectedDefinitions.some((party) => party.id === id));
      return valid.length ? (type === "party" ? valid.slice(0, 1) : valid) : [selectedDefinitions[0].id];
    });
  }, [selectedDefinitions, type]);

  useEffect(() => {
    const complete = items.every((item) => datasets[item.regionSlug]);
    if (!complete) return;
    const nextCards = items.map((item) => {
      const region = regions.find((entry) => entry.slug === item.regionSlug);
      const data = datasets[item.regionSlug];
      const definitions = watchlistDefinitions(region, data);
      const snapshot = watchlistSnapshot(item, region, data);
      return { item, region, definitions, snapshot, previous: item.lastSnapshot ?? null, signals: watchlistSignals(item, snapshot, item.lastSnapshot, region, definitions, locale) };
    });
    setCards(nextCards);
    const persisted = readWatchlist(initialCountry);
    const updated = persisted.map((item) => {
      const card = nextCards.find((entry) => entry.item.id === item.id);
      if (!card?.snapshot) return item;
      const { history, ...compactSnapshot } = card.snapshot;
      return { ...item, lastSnapshot: compactSnapshot };
    });
    try { window.localStorage.setItem(watchlistStorageKey(initialCountry), JSON.stringify(updated.slice(0, 30))); } catch { /* optional */ }
  }, [items, datasets, locale, initialCountry]);

  const allSignals = cards.flatMap((card) => card.signals.map((signal) => ({ ...signal, id: `${card.item.id}-${card.snapshot?.date}-${signal.kind}` })));
  useEffect(() => {
    if ("setAppBadge" in navigator) {
      if (allSignals.length) navigator.setAppBadge(allSignals.length).catch(() => {});
      else navigator.clearAppBadge?.().catch(() => {});
    }
    if (notificationState !== "granted" || !allSignals.length || !("serviceWorker" in navigator)) return;
    const fresh = allSignals.filter((signal) => {
      try {
        const key = `pollframe-notified-${signal.id}`;
        if (sessionStorage.getItem(key)) return false;
        sessionStorage.setItem(key, "1");
        return true;
      } catch { return true; }
    });
    if (!fresh.length) return;
    navigator.serviceWorker.ready.then((registration) => registration.showNotification("Pollframe Watchlist", { body: fresh.map((signal) => signal.text).join("\n"), icon: "/pollframe-app-192.png", tag: `pollframe-watchlist-${initialCountry}`, data: { url: `/?view=watchlist&country=${initialCountry}` } })).catch(() => {});
  }, [allSignals, notificationState]);

  const toggleParty = (id) => setPartyIds((current) => type === "party" ? [id] : current.includes(id) ? (current.length > 1 ? current.filter((entry) => entry !== id) : current) : [...current, id]);
  const addItem = () => {
    if (!selectedData || !partyIds.length) return;
    const names = selectedDefinitions.filter((party) => partyIds.includes(party.id)).map((party) => party.name);
    const item = { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, country: initialCountry, regionSlug, type, partyIds: type === "party" ? partyIds.slice(0, 1) : partyIds, label: type === "party" ? `${names[0]} · ${selectedRegion.name}` : `${names.join(" + ")} · ${selectedRegion.name}`, layout: chosenLayout, createdAt: new Date().toISOString(), lastSnapshot: watchlistSnapshot({ type, partyIds, regionSlug }, selectedRegion, selectedData) };
    const next = [...readWatchlist(initialCountry).filter((entry) => watchlistIdentity(entry) !== watchlistIdentity(item)), item].slice(-30);
    writeWatchlist(initialCountry, next);
    setItems(next);
    setAddState("done");
    window.setTimeout(() => { setAddState("idle"); setGalleryOpen(false); }, 700);
  };
  const removeItem = (id) => { const next = readWatchlist(initialCountry).filter((item) => item.id !== id); writeWatchlist(initialCountry, next); setItems(next); setCards((current) => current.filter((card) => card.item.id !== id)); };
  const updateItem = (id, change) => {
    const next = readWatchlist(initialCountry).map((item) => item.id === id ? { ...item, ...change } : item);
    writeWatchlist(initialCountry, next);
    setItems(next);
  };
  const moveItem = (id, direction) => {
    const next = [...readWatchlist(initialCountry)];
    const index = next.findIndex((item) => item.id === id);
    const target = Math.max(0, Math.min(next.length - 1, index + direction));
    if (index < 0 || target === index) return;
    [next[index], next[target]] = [next[target], next[index]];
    writeWatchlist(initialCountry, next);
    setItems(next);
  };
  const closeNotificationPrompt = () => {
    try { window.localStorage.setItem(`pollframe-notification-intro-${initialCountry}`, "seen"); } catch { /* optional */ }
    setNotificationPromptOpen(false);
  };
  const allowNotifications = async () => {
    closeNotificationPrompt();
    if (typeof Notification === "undefined") return;
    const permission = await Notification.requestPermission().catch(() => "default");
    setNotificationState(permission);
  };
  const layoutOptions = type === "party" ? [
    { id: "square", label: isGerman ? "Kompakt" : "Compact", shape: "1 × 1" },
    { id: "wide", label: isGerman ? "Mit Verlauf" : "With trend", shape: "2 × 1" },
    { id: "tall", label: isGerman ? "Detailliert" : "Detailed", shape: "1 × 2" },
  ] : [
    { id: "wide", label: isGerman ? "Mehrheit kompakt" : "Compact majority", shape: "2 × 1" },
    { id: "large", label: isGerman ? "Mehrheit detailliert" : "Detailed majority", shape: "2 × 2" },
  ];
  useEffect(() => {
    if (!layoutOptions.some((option) => option.id === chosenLayout)) setChosenLayout(layoutOptions[0].id);
  }, [type]);
  return (
    <main id="top" className="watchlist-page">
      <nav className="region-breadcrumb"><BackButton fallback={initialCountry === "uk" ? "/?country=uk" : "/"} label={isGerman ? "Zurück" : "Back"} /><span>/</span><strong>{initialCountry === "uk" ? "UK" : "Deutschland"}</strong></nav>
      <section className="watchlist-hero"><div><p className="section-label">{initialCountry === "uk" ? "United Kingdom" : "Deutschland"}</p><h1>Watchlist</h1></div><div className="watchlist-hero-actions">{allSignals.length > 0 && <div className="watchlist-alert-summary"><Icon name="bell" /><strong>{allSignals.length}</strong><span>{isGerman ? "neue Änderungen" : "new changes"}</span></div>}<button className="watchlist-add-button" type="button" onClick={() => setGalleryOpen(true)} aria-label={isGerman ? "Watchlist-Eintrag hinzufügen" : "Add Watchlist item"}><Icon name="plus" size={22} /></button></div></section>
      {allSignals.length > 0 && <section className="watchlist-alerts"><p className="section-label">{isGerman ? "Neu seit dem letzten Öffnen" : "New since last opened"}</p>{allSignals.map((signal) => <div key={signal.id}><Icon name={signal.kind === "majority" ? "check" : "bell"} size={17} /><span>{signal.text}</span></div>)}</section>}
      <section className="watchlist-grid" aria-label="Watchlist">{cards.length ? cards.map(({ item, region, definitions, snapshot, previous, signals }, cardIndex) => {
        const delta = item.type === "party" && previous ? snapshot.value - previous.value : previous ? snapshot.voteShare - previous.voteShare : null;
        const names = definitions.filter((party) => item.partyIds.includes(party.id));
        const layout = defaultWatchLayout(item, cardIndex);
        const layouts = item.type === "party" ? ["square", "wide", "tall"] : item.type === "snapshot" ? ["wide", "large"] : ["wide", "large"];
        const nextLayout = layouts[(layouts.indexOf(layout) + 1) % layouts.length];
        return <article className={`watch-card watch-card-${layout}`} key={item.id}><div className="watch-card-top"><span>{region.type === "uk-federal" ? "🇬🇧" : "🇩🇪"} {region.name}</span><div>{cardIndex > 0 && <button type="button" onClick={() => moveItem(item.id, -1)} aria-label={isGerman ? "Früher anzeigen" : "Move earlier"}>←</button>}<button type="button" onClick={() => updateItem(item.id, { layout: nextLayout })} aria-label={isGerman ? "Kartengröße ändern" : "Change card size"}><Icon name="sliders" size={15} /></button><button className="watch-star active" type="button" onClick={() => removeItem(item.id)} aria-label={isGerman ? `${item.label} entfernen` : `Remove ${item.label}`}><Icon name="star" size={17} /></button></div></div>{item.type === "snapshot" ? <><div className="watch-snapshot-title"><h3>{isGerman ? "Aktueller Durchschnitt" : "Current average"}</h3><time dateTime={snapshot?.date}>{snapshot?.date ? formatDate(snapshot.date, locale, { year: true }) : ""}</time></div><div className="watch-snapshot-list">{snapshot?.leaders?.map((leader) => { const party = definitions.find((entry) => entry.id === leader.id); return <span key={leader.id}><i style={{ background: party?.color }} /><b>{party?.name}</b><strong>{leader.value.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%</strong></span>; })}</div></> : <><div className="watch-card-parties">{names.map((party) => <i key={party.id} style={{ background: party.color }} />)}<h3>{names.map((party) => party.name).join(" + ")}</h3></div>{item.type === "party" ? <><div className="watch-card-value"><strong>{snapshot?.value?.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%</strong>{Number.isFinite(delta) && Math.abs(delta) >= .1 ? <span className={delta > 0 ? "up" : "down"}>{delta > 0 ? "+" : ""}{delta.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })} pp</span> : <span>{isGerman ? "unverändert" : "unchanged"}</span>}</div>{layout !== "square" && <WatchSparkline values={snapshot?.history} color={names[0]?.color} />}</> : <div className="watch-majority"><strong>{snapshot?.seats ?? "–"} / {snapshot?.totalSeats ?? region.baseSeats}</strong><span className={snapshot?.majority ? "yes" : "no"}>{snapshot?.majority ? (isGerman ? "Mehrheit" : "Majority") : (isGerman ? "Keine Mehrheit" : "No majority")}</span>{previous && snapshot?.seats !== previous.seats && <small>{snapshot.seats > previous.seats ? "+" : ""}{snapshot.seats - previous.seats} {isGerman ? "Sitze" : "seats"}</small>}</div>}<time dateTime={snapshot?.date}>{snapshot?.date ? formatDate(snapshot.date, locale, { year: true }) : ""}</time>{signals.map((signal) => <p className="watch-card-signal" key={signal.kind}>{signal.text}</p>)}</>}<a href={`/?region=${region.slug}`}>{isGerman ? "Verlauf öffnen" : "Open trend"}<span>→</span></a></article>;
      }) : <button className="watchlist-empty" type="button" onClick={() => setGalleryOpen(true)}><Icon name="plus" size={28} /><h2>{isGerman ? "Deine Watchlist ist leer" : "Your Watchlist is empty"}</h2><span>{isGerman ? "Ersten Eintrag hinzufügen" : "Add your first item"}</span></button>}</section>

      {galleryOpen && <div className="overlay modal-overlay watch-gallery-overlay" onMouseDown={(event) => event.target === event.currentTarget && setGalleryOpen(false)}><section className="watch-gallery" role="dialog" aria-modal="true" aria-labelledby="watch-gallery-title"><header><div><p className="section-label">POLLFRAME</p><h2 id="watch-gallery-title">{isGerman ? "Zur Watchlist hinzufügen" : "Add to Watchlist"}</h2></div><button className="icon-button" type="button" onClick={() => setGalleryOpen(false)} aria-label={isGerman ? "Schließen" : "Close"}><Icon name="close" /></button></header><div className="watch-gallery-stage"><div className="watch-gallery-source"><h3>{isGerman ? "1 · Bereich" : "1 · Area"}</h3><SelectControl label={isGerman ? "Parlament" : "Parliament"} value={regionSlug} onChange={setRegionSlug} options={regions.map((region) => ({ value: region.slug, label: `${region.type === "uk-federal" ? "🇬🇧" : "🇩🇪"} ${region.name === "Deutschland" ? "Bundestag" : region.name}` }))} />{initialCountry === "de" && <div className="watch-type segmented"><button className={type === "party" ? "selected" : ""} onClick={() => setType("party")}>{isGerman ? "Partei" : "Party"}</button><button className={type === "coalition" ? "selected" : ""} onClick={() => setType("coalition")}>{isGerman ? "Mehrheit" : "Majority"}</button></div>}<div className="watch-party-picker">{selectedDefinitions.map((party) => <button type="button" key={party.id} className={partyIds.includes(party.id) ? "selected" : ""} onClick={() => toggleParty(party.id)}><i style={{ background: party.color }} />{party.name}{partyIds.includes(party.id) && <Icon name="check" size={14} />}</button>)}</div></div><div className="watch-gallery-layouts"><h3>{isGerman ? "2 · Ansicht" : "2 · Style"}</h3><div>{layoutOptions.map((option) => <button type="button" key={option.id} className={chosenLayout === option.id ? "selected" : ""} onClick={() => setChosenLayout(option.id)}><span className={`watch-layout-shape shape-${option.id}`}><i /><i /><i /></span><strong>{option.label}</strong><small>{option.shape}</small></button>)}</div></div></div><footer><button className={`watch-gallery-add ${addState === "done" ? "done" : ""}`} type="button" onClick={addItem} disabled={!selectedData || !partyIds.length}><Icon name={addState === "done" ? "check" : "plus"} />{addState === "done" ? (isGerman ? "Hinzugefügt" : "Added") : (isGerman ? "Zur Watchlist hinzufügen" : "Add to Watchlist")}</button></footer></section></div>}

      {notificationPromptOpen && <div className="overlay modal-overlay notification-intro-overlay"><section className="notification-intro" role="dialog" aria-modal="true" aria-labelledby="notification-intro-title"><span className="notification-intro-icon"><Icon name="bell" size={28} /></span><h2 id="notification-intro-title">{isGerman ? "Wichtige Änderungen mitbekommen?" : "Keep up with important changes?"}</h2><p>{isGerman ? "Wenn du Pollframe öffnest, kann die App dich informieren, wenn eine beobachtete Partei die 5-%-Hürde kreuzt oder eine gespeicherte Mehrheit kippt." : "When you open Pollframe, the app can alert you if a watched party crosses a threshold or a saved majority changes."}</p><button className="primary-button" type="button" onClick={allowNotifications}>{isGerman ? "Mitteilungen erlauben" : "Allow notifications"}</button><button className="notification-later" type="button" onClick={closeNotificationPrompt}>{isGerman ? "Nicht jetzt" : "Not now"}</button></section></div>}
    </main>
  );
}

function WatchGermanyMap({ data, geometry, mode = "leader", partyId = "union", locale }) {
  if (!data || !geometry) return <div className="watch-map-loading" />;
  const party = MAP_PARTY_GROUPS.find((entry) => entry.id === partyId) ?? MAP_PARTY_GROUPS[0];
  const values = data.regions.map((region) => mapPartyValue(region, party)?.value).filter(Number.isFinite);
  const range = { min: Math.min(...values, 0), max: Math.max(...values, 1), locale, numberLocale: getNumberLocale(locale) };
  const byMapId = new Map(data.regions.map((region) => [region.mapId, region]));
  return <svg className="watch-mini-map watch-mini-map-de" viewBox={geometry.viewBox} aria-hidden="true">{geometry.locations.map((location) => {
    const region = byMapId.get(location.id);
    if (!region) return null;
    const metric = stateMapMetric(region, mode, party, range);
    const fill = metric.parties?.[0]?.color ?? metric.fill;
    return <path key={location.id} d={location.path} style={{ fill, fillOpacity: metric.opacity }} />;
  })}</svg>;
}

function WatchUKMap({ summary, MapComponent, mode = "winner", partyId = "201" }) {
  if (!summary?.map?.areas || !MapComponent) return <div className="watch-map-loading" />;
  const areas = summary.map.areas;
  const maximum = Math.max(1, ...Object.values(areas).map((area) => area.shares?.[partyId] ?? 0));
  const colors = Object.fromEntries(Object.entries(areas).map(([name, area]) => {
    const leader = UK_MAP_PARTY_DEFINITIONS.find((party) => party.id === area.leaderId);
    if (mode === "winner") return [name, leader?.color ?? "#d8dde2"];
    const party = UK_PARTY_DEFINITIONS.find((entry) => entry.id === partyId);
    const value = area.shares?.[partyId] ?? 0;
    return [name, value > 0 ? mixWithWhite(party?.color, .45 + (.55 * value / maximum)) : "#edf0f2"];
  }));
  colors.Ireland = "#edf0f2";
  return <div className="watch-mini-map watch-mini-map-uk" aria-hidden="true"><MapComponent type="select-single" size={300} mapColor="#e7eaed" cityColors={colors} strokeColor="#fff" strokeWidth={1.5} selectColor="#e7eaed" disableHover hints={false} /></div>;
}

function watchWidgetTarget(item, region, definitions, initialCountry) {
  if (item.type === "issues") return "/?country=es";
  if (item.type === "map") {
    if (initialCountry === "uk") return "/?country=uk&view=uk-map";
    if (initialCountry === "es") return "/?country=es#spain-map";
    const params = new URLSearchParams({ view: "map", mapMode: item.mapMode ?? "leader" });
    if (item.mapPartyId) params.set("mapParty", item.mapPartyId);
    return `/?${params}`;
  }
  if (item.type === "party") {
    const party = definitions.find((entry) => entry.id === item.partyIds?.[0]);
    return `/?region=${region.slug}${party?.slug ? `&party=${party.slug}` : ""}`;
  }
  if (item.type === "coalition") return `/?region=${region.slug}#projection-title`;
  return `/?region=${region.slug}`;
}

function WatchlistPage({ locale, initialCountry = "de" }) {
  const isGerman = locale === "de";
  const wl = (de, en, es) => locale === "es" ? es : isGerman ? de : en;
  const [items, setItems] = useState(() => readWatchlist(initialCountry));
  const [datasets, setDatasets] = useState({});
  const [cards, setCards] = useState([]);
  const [regionSlug, setRegionSlug] = useState(initialCountry === "uk" ? "uk-westminster" : initialCountry === "es" ? "spain-congress" : "bundestag");
  const [type, setType] = useState("party");
  const [partyIds, setPartyIds] = useState([]);
  const [chosenLayout, setChosenLayout] = useState("wide");
  const [mapMode, setMapMode] = useState(initialCountry === "uk" ? "winner" : initialCountry === "es" ? "regions" : "leader");
  const [mapPartyId, setMapPartyId] = useState(initialCountry === "uk" ? "201" : "union");
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [addState, setAddState] = useState("idle");
  const [mapAssets, setMapAssets] = useState({ data: null, geometry: null, summary: null, component: null });
  const dragId = useRef(null);
  const [notificationState, setNotificationState] = useState(() => typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  const [notificationPromptOpen, setNotificationPromptOpen] = useState(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "default") return false;
    try { return window.localStorage.getItem(`pollframe-notification-intro-${initialCountry}`) !== "seen"; } catch { return false; }
  });
  const regions = REGION_META.filter((region) => initialCountry === "uk" ? region.type === "uk-federal" : initialCountry === "es" ? region.type === "spain-federal" : region.type === "federal" || region.type === "state");
  const selectedRegion = regions.find((region) => region.slug === regionSlug) ?? regions[0];
  const selectedData = datasets[regionSlug];
  const selectedDefinitions = useMemo(() => selectedData ? watchlistDefinitions(selectedRegion, selectedData) : [], [selectedData, selectedRegion]);
  const nationalRegionSlug = initialCountry === "uk" ? "uk-westminster" : initialCountry === "es" ? "spain-congress" : "bundestag";
  useBodyScrollLock(galleryOpen || notificationPromptOpen);

  useEffect(() => {
    if (!galleryOpen) return;
    const button = document.querySelector(".watch-gallery-v3 .watch-gallery-add");
    button?.setAttribute("aria-label", isGerman ? "Zur Watchlist hinzufügen" : "Add to Watchlist");
  }, [galleryOpen, isGerman, type, chosenLayout]);

  useEffect(() => {
    const sync = (event) => {
      if (event.detail?.country && event.detail.country !== initialCountry) return;
      setItems(readWatchlist(initialCountry));
    };
    window.addEventListener("pollframe-watchlist-change", sync);
    return () => window.removeEventListener("pollframe-watchlist-change", sync);
  }, [initialCountry]);

  useEffect(() => {
    const slugs = [...new Set([regionSlug, ...items.map((item) => item.regionSlug)])];
    const missing = slugs.filter((slug) => !datasets[slug]);
    if (!missing.length) return undefined;
    const controller = new AbortController();
    Promise.all(missing.map((slug) => fetch(`/data/${slug}.json`, { signal: controller.signal }).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    }).then((data) => [slug, data]))).then((entries) => setDatasets((current) => ({ ...current, ...Object.fromEntries(entries) }))).catch((error) => { if (error.name !== "AbortError") console.error("Watchlist data failed", error); });
    return () => controller.abort();
  }, [regionSlug, items, datasets]);

  const needsMap = ["map", "issues"].includes(type) && galleryOpen || items.some((item) => ["map", "issues"].includes(item.type));
  useEffect(() => {
    if (!needsMap) return undefined;
    let active = true;
    if (initialCountry === "de") Promise.all([fetch("/state-map-data.json").then((response) => response.json()), import("@svg-maps/germany").then((module) => module.default)])
      .then(([data, geometry]) => active && setMapAssets((current) => ({ ...current, data, geometry }))).catch(() => {});
    else if (initialCountry === "uk") Promise.all([fetch("/uk-summary.json").then((response) => response.json()), import("@react-map/united-kingdom").then((module) => module.default)])
      .then(([summary, component]) => active && setMapAssets((current) => ({ ...current, summary, component }))).catch(() => {});
    else Promise.all([fetch("/data/spain-autonomies.geojson").then((response) => response.json()), fetch("/spain-summary.json").then((response) => response.json())]).then(([geometry, summary]) => active && setMapAssets((current) => ({ ...current, geometry, summary }))).catch(() => {});
    return () => { active = false; };
  }, [needsMap, initialCountry]);

  useEffect(() => {
    if (!selectedDefinitions.length) return;
    setPartyIds((current) => {
      const valid = current.filter((id) => selectedDefinitions.some((party) => party.id === id));
      if (valid.length) return type === "party" ? valid.slice(0, 1) : valid;
      return [selectedDefinitions[0].id];
    });
  }, [selectedDefinitions, type]);

  useEffect(() => {
    if (!items.every((item) => datasets[item.regionSlug])) return;
    const nextCards = items.map((item) => {
      const region = regions.find((entry) => entry.slug === item.regionSlug);
      const data = datasets[item.regionSlug];
      const definitions = watchlistDefinitions(region, data);
      const snapshot = watchlistSnapshot(item, region, data);
      return { item, region, definitions, snapshot, previous: item.lastSnapshot ?? null, signals: watchlistSignals(item, snapshot, item.lastSnapshot, region, definitions, locale) };
    });
    setCards(nextCards);
    const updated = readWatchlist(initialCountry).map((item) => {
      const card = nextCards.find((entry) => entry.item.id === item.id);
      if (!card?.snapshot) return item;
      const { history, ...lastSnapshot } = card.snapshot;
      return { ...item, lastSnapshot };
    });
    try { window.localStorage.setItem(watchlistStorageKey(initialCountry), JSON.stringify(updated.slice(0, 30))); } catch { /* local-only */ }
  }, [items, datasets, locale, initialCountry]);

  const allSignals = cards.flatMap((card) => card.signals.map((signal) => ({ ...signal, id: `${card.item.id}-${card.snapshot?.date}-${signal.kind}` })));
  useEffect(() => {
    if ("setAppBadge" in navigator) allSignals.length ? navigator.setAppBadge(allSignals.length).catch(() => {}) : navigator.clearAppBadge?.().catch(() => {});
    if (notificationState !== "granted" || !allSignals.length || !("serviceWorker" in navigator)) return;
    const fresh = allSignals.filter((signal) => {
      try { const key = `pollframe-notified-${signal.id}`; if (sessionStorage.getItem(key)) return false; sessionStorage.setItem(key, "1"); return true; } catch { return true; }
    });
    if (fresh.length) navigator.serviceWorker.ready.then((registration) => registration.showNotification("Pollframe Watchlist", { body: fresh.map((signal) => signal.text).join("\n"), icon: "/pollframe-app-192.png", tag: `pollframe-watchlist-${initialCountry}`, data: { url: `/?view=watchlist&country=${initialCountry}` } })).catch(() => {});
  }, [allSignals, notificationState]);

  const persist = (next) => { writeWatchlist(initialCountry, next); setItems(next); };
  const removeItem = (id) => persist(readWatchlist(initialCountry).filter((item) => item.id !== id));
  const updateItem = (id, change) => persist(readWatchlist(initialCountry).map((item) => item.id === id ? { ...item, ...change } : item));
  const reorderItem = (sourceId, targetId) => {
    if (!sourceId || sourceId === targetId) return;
    const next = [...readWatchlist(initialCountry)];
    const from = next.findIndex((item) => item.id === sourceId);
    const to = next.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persist(next);
  };
  const pointerMove = (event) => {
    if (!dragId.current) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-watch-id]");
    if (target?.dataset.watchId) reorderItem(dragId.current, target.dataset.watchId);
  };
  const endPointerDrag = () => { dragId.current = null; document.documentElement.classList.remove("watch-reordering"); };
  const toggleParty = (id) => setPartyIds((current) => type === "party" ? [id] : current.includes(id) ? (current.length > 1 ? current.filter((entry) => entry !== id) : current) : [...current, id]);

  const layoutOptions = type === "party" ? [
    { id: "square", label: wl("Klein", "Small", "Pequeño"), shape: "1 × 1" },
    { id: "wide", label: wl("Breit", "Wide", "Ancho"), shape: "2 × 1" },
    { id: "large", label: wl("Groß", "Large", "Grande"), shape: "2 × 2" },
  ] : type === "snapshot" ? [
    { id: "wide", label: wl("Kompakt", "Compact", "Compacto"), shape: "2 × 1" },
    { id: "large", label: wl("Alle Werte", "All values", "Todos los valores"), shape: "2 × 2" },
  ] : type === "coalition" ? [
    { id: "wide", label: isGerman ? "Breit" : "Wide", shape: "2 × 1" },
  ] : [
    { id: "wide", label: isGerman ? "Breit" : "Wide", shape: "2 × 1" },
    { id: "large", label: isGerman ? "Groß" : "Large", shape: "2 × 2" },
  ];
  useEffect(() => { if (!layoutOptions.some((option) => option.id === chosenLayout)) setChosenLayout(layoutOptions[0].id); }, [type]);
  useEffect(() => { if (type === "map" && regionSlug !== nationalRegionSlug) setRegionSlug(nationalRegionSlug); }, [type, regionSlug, nationalRegionSlug]);

  const addItem = () => {
    const needsParties = type === "party" || type === "coalition";
    if (!selectedData || needsParties && !partyIds.length) return;
    const selected = selectedDefinitions.filter((party) => partyIds.includes(party.id));
    const mapParty = initialCountry === "uk" ? UK_PARTY_DEFINITIONS.find((party) => party.id === mapPartyId) : initialCountry === "es" ? null : MAP_PARTY_GROUPS.find((party) => party.id === mapPartyId);
    const label = type === "issues" ? "España · CIS"
      : type === "snapshot" ? `${selectedRegion.name} · ${isGerman ? "Aktueller Stand" : "Current average"}`
      : type === "map" ? `${initialCountry === "uk" ? "UK" : initialCountry === "es" ? "España" : "Deutschland"} · ${initialCountry === "es" ? (locale === "es" ? "Comunidades autónomas" : "Autonomous communities") : mapMode === "party" ? mapParty?.name ?? mapParty?.short : mapMode === "growth" ? (isGerman ? "Stärkster Zuwachs" : "Largest gain") : (isGerman ? "Stärkste Partei" : "Leading party")}`
        : `${selected.map((party) => party.name).join(" + ")} · ${selectedRegion.name}`;
    const candidate = { id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`, country: initialCountry, regionSlug, type, partyIds: needsParties ? (type === "party" ? partyIds.slice(0, 1) : partyIds) : [], mapMode: type === "map" ? mapMode : undefined, mapPartyId: type === "map" && mapMode === "party" ? mapPartyId : undefined, label, layout: chosenLayout, createdAt: new Date().toISOString(), lastSnapshot: type === "map" ? null : watchlistSnapshot({ type, partyIds, regionSlug }, selectedRegion, selectedData) };
    const next = [...readWatchlist(initialCountry).filter((entry) => watchlistIdentity(entry) !== watchlistIdentity(candidate)), candidate].slice(-30);
    persist(next);
    setAddState("done");
    window.setTimeout(() => { setAddState("idle"); setGalleryOpen(false); }, 550);
  };

  const closeNotificationPrompt = () => { try { window.localStorage.setItem(`pollframe-notification-intro-${initialCountry}`, "seen"); } catch { /* optional */ } setNotificationPromptOpen(false); };
  const allowNotifications = async () => { closeNotificationPrompt(); if (typeof Notification !== "undefined") setNotificationState(await Notification.requestPermission().catch(() => "default")); };
  const typeOptions = [
    { id: "snapshot", icon: "chart", label: wl("Aktueller Stand", "Current average", "Media actual") },
    { id: "party", icon: "chart", label: wl("Partei", "Party trend", "Tendencia de partido") },
    ...(initialCountry === "es" ? [{ id: "issues", icon: "info", label: "Temas del CIS" }] : []),
    ...(initialCountry === "de" ? [{ id: "coalition", icon: "check", label: isGerman ? "Mehrheit" : "Majority" }] : []),
    { id: "map", icon: "map", label: wl("Karte", "Map", "Mapa") },
  ];
  const mapModes = initialCountry === "uk" ? [{ id: "winner", label: isGerman ? "Stärkste Partei 2024" : "2024 winner" }, { id: "party", label: isGerman ? "Partei 2024" : "Party in 2024" }]
    : initialCountry === "es" ? [{ id: "regions", label: locale === "es" ? "Comunidades autónomas" : "Autonomous communities" }]
      : [{ id: "leader", label: isGerman ? "Stärkste Partei" : "Leading party" }, { id: "party", label: isGerman ? "Partei vergleichen" : "Compare party" }, { id: "growth", label: isGerman ? "Stärkster Zuwachs" : "Largest gain" }];

  return <main id="top" className={`watchlist-page watchlist-v3 ${editMode ? "is-editing" : ""}`}>
    <nav className="region-breadcrumb"><BackButton fallback={initialCountry === "uk" ? "/?country=uk" : initialCountry === "es" ? "/?country=es" : "/"} label={locale === "es" ? "Atrás" : isGerman ? "Zurück" : "Back"} /><span>/</span><strong>{initialCountry === "uk" ? "UK" : initialCountry === "es" ? "España" : "Deutschland"}</strong></nav>
    <section className="watchlist-hero"><div><p className="section-label">{initialCountry === "uk" ? "United Kingdom" : initialCountry === "es" ? "España" : "Deutschland"}</p><h1>{wl("Watchlist", "Watchlist", "Seguimiento")}</h1></div><div className="watchlist-hero-actions">{cards.length > 0 && <button className={`watch-edit-toggle ${editMode ? "active" : ""}`} type="button" onClick={() => setEditMode((value) => !value)}><Icon name={editMode ? "check" : "sliders"} size={18} />{editMode ? wl("Fertig", "Done", "Listo") : wl("Bearbeiten", "Edit", "Editar")}</button>}<button className="watchlist-add-button" type="button" onClick={() => setGalleryOpen(true)} aria-label={wl("Watchlist-Eintrag hinzufügen", "Add Watchlist item", "Añadir elemento")}><Icon name="plus" size={22} /></button></div></section>
    {allSignals.length > 0 && <section className="watchlist-alerts"><p className="section-label">{isGerman ? "Neu seit dem letzten Öffnen" : "New since last opened"}</p>{allSignals.map((signal) => <div key={signal.id}><Icon name={signal.kind === "majority" ? "check" : "bell"} size={17} /><span>{signal.text}</span></div>)}</section>}
    <section className="watchlist-grid" aria-label="Watchlist">{cards.length ? cards.map(({ item, region, definitions, snapshot, previous }, cardIndex) => {
      const layout = defaultWatchLayout(item, cardIndex);
      const names = definitions.filter((party) => item.partyIds?.includes(party.id));
      const delta = item.type === "party" && previous && snapshot ? snapshot.value - previous.value : item.type === "coalition" && previous && snapshot ? snapshot.seats - previous.seats : null;
      const target = watchWidgetTarget(item, region, definitions, initialCountry);
      const label = item.type === "map" ? (initialCountry === "es" ? (locale === "es" ? "Comunidades autónomas" : "Autonomous communities") : item.mapMode === "party" ? (initialCountry === "uk" ? UK_PARTY_DEFINITIONS.find((party) => party.id === item.mapPartyId)?.name : MAP_PARTY_GROUPS.find((party) => party.id === item.mapPartyId)?.short) : item.mapMode === "growth" ? (isGerman ? "Stärkster Zuwachs" : "Largest gain") : (isGerman ? "Stärkste Partei" : "Leading party")) : null;
      return <article key={item.id} data-watch-id={item.id} className={`watch-card watch-card-${layout} watch-card-${item.type}`} role={!editMode ? "link" : undefined} tabIndex={!editMode ? 0 : undefined} onClick={(event) => { if (!editMode && !event.target.closest("button")) navigateInApp(target); }} onKeyDown={(event) => { if (!editMode && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); navigateInApp(target); } }} draggable={editMode} onDragStart={() => { dragId.current = item.id; }} onDragOver={(event) => { event.preventDefault(); reorderItem(dragId.current, item.id); }} onDragEnd={endPointerDrag}>
        {editMode && <div className="watch-card-editbar"><button className="watch-drag-handle" type="button" onPointerDown={(event) => { dragId.current = item.id; event.currentTarget.setPointerCapture?.(event.pointerId); document.documentElement.classList.add("watch-reordering"); }} onPointerMove={pointerMove} onPointerUp={endPointerDrag} onPointerCancel={endPointerDrag}><Icon name="grip" size={20} /><span>{isGerman ? "Ziehen" : "Drag"}</span></button><button className="watch-remove" type="button" onClick={() => removeItem(item.id)} aria-label={isGerman ? "Widget entfernen" : "Remove widget"}><Icon name="trash" size={18} /></button></div>}
        <div className="watch-card-top"><span>{region.type === "uk-federal" ? "🇬🇧" : region.type === "spain-federal" ? "🇪🇸" : "🇩🇪"} {region.name === "Deutschland" ? "Bundestag" : region.name}</span>{!editMode && <span className="watch-open-arrow">↗</span>}</div>
        {item.type === "snapshot" && <><div className="watch-snapshot-title"><h3>{isGerman ? "Aktueller Durchschnitt" : "Current average"}</h3><time dateTime={snapshot?.date}>{snapshot?.date ? formatDate(snapshot.date, locale, { year: false }) : ""}</time></div><div className="watch-snapshot-list">{snapshot?.leaders?.slice(0, layout === "large" ? 5 : 4).map((leader) => { const party = definitions.find((entry) => entry.id === leader.id); return <span key={leader.id}><i style={{ background: party?.color }} /><b>{party?.name}</b><strong>{leader.value.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%</strong></span>; })}</div></>}
        {item.type === "party" && <><div className="watch-card-parties"><i style={{ background: names[0]?.color }} /><h3>{names[0]?.name}</h3></div><div className="watch-card-value"><strong>{snapshot?.value?.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })}%</strong>{Number.isFinite(delta) && Math.abs(delta) >= .1 && <span className={delta > 0 ? "up" : "down"}>{delta > 0 ? "+" : ""}{delta.toLocaleString(getNumberLocale(locale), { maximumFractionDigits: 1 })} pp</span>}</div><WatchSparkline values={snapshot?.history} color={names[0]?.color} /></>}
        {item.type === "coalition" && <><div className="watch-card-parties">{names.map((party) => <i key={party.id} style={{ background: party.color }} />)}<h3>{names.map((party) => party.name).join(" + ")}</h3></div><div className="watch-majority"><strong>{snapshot?.seats ?? "–"}</strong><span>{isGerman ? `von ${snapshot?.totalSeats ?? region.baseSeats} Sitzen` : `of ${snapshot?.totalSeats ?? region.baseSeats} seats`}</span>{Number.isFinite(delta) && delta !== 0 && <small>{delta > 0 ? "+" : ""}{delta}</small>}</div><div className={`watch-majority-status ${snapshot?.majority ? "yes" : "no"}`}>{snapshot?.majority ? (isGerman ? "Mehrheit" : "Majority") : (isGerman ? "Keine Mehrheit" : "No majority")}</div></>}
        {item.type === "map" && <><div className="watch-map-title"><h3>{label}</h3><small>{initialCountry === "uk" ? (isGerman ? "Unterhauswahl 2024" : "2024 general election") : initialCountry === "es" ? (locale === "es" ? "Acceso territorial" : "Territorial access") : (isGerman ? "Aktuelle Landeswerte" : "Latest state values")}</small></div>{initialCountry === "de" ? <WatchGermanyMap data={mapAssets.data} geometry={mapAssets.geometry} mode={item.mapMode} partyId={item.mapPartyId} locale={locale} /> : initialCountry === "es" ? <SpainMiniMap geojson={mapAssets.geometry} /> : <WatchUKMap summary={mapAssets.summary} MapComponent={mapAssets.component} mode={item.mapMode} partyId={item.mapPartyId} />}</>}
        {item.type === "issues" && <><div className="watch-map-title"><h3>{locale === "es" ? "Qué preocupa a España" : "What concerns Spain"}</h3><small>CIS · {mapAssets.summary?.issues?.date?.slice(0, 7) ?? ""}</small></div><div className="watch-issue-list">{mapAssets.summary?.issues?.items?.map((issue) => <span key={issue.id}><i style={{ background: issue.color, width: `${Math.min(100, issue.value * 2)}%` }} /><b>{issue.label}</b><strong>{issue.value.toLocaleString(getNumberLocale(locale))}%</strong></span>)}</div></>}
        {editMode && <div className="watch-card-size-picker" aria-label={isGerman ? "Widgetgröße" : "Widget size"}>{(item.type === "party" ? ["square", "wide", "large"] : item.type === "coalition" ? ["wide"] : ["wide", "large"]).map((size) => <button key={size} className={layout === size ? "selected" : ""} type="button" onClick={() => updateItem(item.id, { layout: size })}><span className={`watch-size-icon size-${size}`} />{size === "square" ? (isGerman ? "Klein" : "Small") : size === "wide" ? (isGerman ? "Breit" : "Wide") : (isGerman ? "Groß" : "Large")}</button>)}</div>}
      </article>;
    }) : <button className="watchlist-empty" type="button" onClick={() => setGalleryOpen(true)}><Icon name="plus" size={28} /><h2>{wl("Deine Watchlist ist leer", "Your Watchlist is empty", "Tu seguimiento está vacío")}</h2><span>{wl("Widget hinzufügen", "Add a widget", "Añadir un widget")}</span></button>}</section>

    {galleryOpen && <div className="overlay modal-overlay watch-gallery-overlay" onMouseDown={(event) => event.target === event.currentTarget && setGalleryOpen(false)}><section className="watch-gallery watch-gallery-v3" role="dialog" aria-modal="true" aria-labelledby="watch-gallery-title"><header><div><p className="section-label">POLLFRAME</p><h2 id="watch-gallery-title">{wl("Widget hinzufügen", "Add widget", "Añadir widget")}</h2></div><button className="icon-button" type="button" onClick={() => setGalleryOpen(false)} aria-label={wl("Schließen", "Close", "Cerrar")}><Icon name="close" /></button></header><div className="watch-widget-types">{typeOptions.map((option) => <button type="button" key={option.id} className={type === option.id ? "selected" : ""} onClick={() => setType(option.id)}><Icon name={option.icon} size={19} /><span>{option.label}</span></button>)}</div><div className="watch-gallery-stage"><div className="watch-gallery-source">{type !== "map" && <><h3>{wl("Bereich", "Area", "Área")}</h3><SelectControl label={wl("Parlament", "Parliament", "Parlamento")} value={regionSlug} onChange={setRegionSlug} options={regions.map((region) => ({ value: region.slug, label: `${region.type === "uk-federal" ? "🇬🇧" : region.type === "spain-federal" ? "🇪🇸" : "🇩🇪"} ${region.name === "Deutschland" ? "Bundestag" : region.name}` }))} /></>}{(type === "party" || type === "coalition") && <div className="watch-party-picker">{selectedDefinitions.map((party) => <button type="button" key={party.id} className={partyIds.includes(party.id) ? "selected" : ""} onClick={() => toggleParty(party.id)}><i style={{ background: party.color }} />{party.name}{partyIds.includes(party.id) && <Icon name="check" size={14} />}</button>)}</div>}{type === "map" && <><h3>{wl("Kartenansicht", "Map view", "Vista del mapa")}</h3><div className="watch-map-mode-picker">{mapModes.map((option) => <button type="button" key={option.id} className={mapMode === option.id ? "selected" : ""} onClick={() => setMapMode(option.id)}>{option.label}</button>)}</div>{mapMode === "party" && <div className="watch-party-picker">{(initialCountry === "uk" ? UK_PARTY_DEFINITIONS.filter((party) => party.id !== "209" && party.id !== "210" && party.id !== "211") : MAP_PARTY_GROUPS.slice(0, 8)).map((party) => <button type="button" key={party.id} className={mapPartyId === party.id ? "selected" : ""} onClick={() => setMapPartyId(party.id)}><i style={{ background: party.color }} />{party.name ?? party.short}</button>)}</div>}</>}</div><div className="watch-gallery-layouts"><h3>{wl("Größe", "Size", "Tamaño")}</h3><div>{layoutOptions.map((option) => <button type="button" key={option.id} className={chosenLayout === option.id ? "selected" : ""} onClick={() => setChosenLayout(option.id)}><span className={`watch-layout-shape shape-${option.id}`}><i /><i /><i /></span><strong>{option.label}</strong><small>{option.shape}</small></button>)}</div></div></div><footer><button className={`watch-gallery-add ${addState === "done" ? "done" : ""}`} type="button" onClick={addItem} disabled={!selectedData || (type === "party" || type === "coalition") && !partyIds.length}><Icon name={addState === "done" ? "check" : "plus"} />{addState === "done" ? wl("Hinzugefügt", "Added", "Añadido") : wl("Widget hinzufügen", "Add widget", "Añadir widget")}</button></footer></section></div>}
    {notificationPromptOpen && <div className="overlay modal-overlay notification-intro-overlay"><section className="notification-intro" role="dialog" aria-modal="true" aria-labelledby="notification-intro-title"><span className="notification-intro-icon"><Icon name="bell" size={28} /></span><h2 id="notification-intro-title">{isGerman ? "Wichtige Änderungen mitbekommen?" : "Keep up with important changes?"}</h2><p>{isGerman ? "Pollframe kann dich über wichtige Änderungen deiner Watchlist informieren." : "Pollframe can alert you to important Watchlist changes."}</p><button className="primary-button" type="button" onClick={allowNotifications}>{isGerman ? "Mitteilungen erlauben" : "Allow notifications"}</button><button className="notification-later" type="button" onClick={closeNotificationPrompt}>{isGerman ? "Nicht jetzt" : "Not now"}</button></section></div>}
  </main>;
}

function WatchSparkline({ values = [], color = "var(--accent)" }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 1);
  const points = values.map((value, index) => `${(index / (values.length - 1)) * 100},${34 - (((value - min) / span) * 28)}`).join(" ");
  return <svg className="watch-sparkline" viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" /></svg>;
}

function OverviewPage({ t, locale, summary, embedMode = false, mapPage = false }) {
  const query = new URLSearchParams(window.location.search);
  const requestedMode = query.get("mapMode");
  const requestedParty = query.get("mapParty");
  const [focusedSlug, setFocusedSlug] = useState("berlin");
  const [mapData, setMapData] = useState(null);
  const [mapGeometry, setMapGeometry] = useState(null);
  const [mapMode, setMapMode] = useState(
    ["leader", "party", "growth"].includes(requestedMode) ? requestedMode : "leader",
  );
  const [mapParty, setMapParty] = useState(
    MAP_PARTY_GROUPS.some((party) => party.id === requestedParty) ? requestedParty : "union",
  );
  const [mapEmbedOpen, setMapEmbedOpen] = useState(false);
  const regions = summary?.regions ?? [];
  const states = regions.filter((region) => region.type === "state");
  const isGerman = locale === "de";
  useEffect(() => {
    let active = true;
    Promise.all([
      embedMode || mapPage
        ? fetch("/state-map-data.json").then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
          })
        : Promise.resolve(null),
      import("@svg-maps/germany").then((module) => module.default),
    ])
      .then(([data, geometry]) => {
        if (!active) return;
        setMapData(data);
        setMapGeometry(geometry);
      })
      .catch(() => {
        if (!active) return;
        setMapData(null);
        setMapGeometry(null);
      });
    return () => {
      active = false;
    };
  }, [embedMode, mapPage]);

  if (embedMode) {
    if (!mapData || !mapGeometry) return <div className="embed-loading">{isGerman ? "Kartendaten werden geladen …" : "Loading map data…"}</div>;
    return (
      <MapEmbedView
        t={t}
        locale={locale}
        data={mapData}
        mapGeometry={mapGeometry}
        mode={mapMode}
        setMode={setMapMode}
        partyId={mapParty}
        setPartyId={setMapParty}
        focusedSlug={focusedSlug}
        setFocusedSlug={setFocusedSlug}
      />
    );
  }

  if (mapPage) {
    return (
      <main id="top" className="overview-page map-detail-page">
        <nav className="region-breadcrumb" aria-label={isGerman ? "Navigation" : "Navigation"}>
          <a href="/">{isGerman ? "Übersicht" : "Overview"}</a>
          <span>/</span>
          <strong>{isGerman ? "Deutschlandkarte" : "Map of Germany"}</strong>
        </nav>
        <section className="overview-hero map-page-hero">
          <div className="eyebrow"><span />{isGerman ? "Interaktive Länderkarte" : "Interactive state map"}</div>
          <h1>{isGerman ? "Deutschland im Überblick" : "Germany at a glance"}</h1>
          <p>{isGerman
            ? "Stärkste Parteien, Parteivergleich und aktuelle Bewegungen in allen 16 Ländern – mit direktem Zugang zu jeder vollständigen Umfragereihe."
            : "Leading parties, party comparisons and current movement across all 16 states, with direct access to every complete polling series."}</p>
        </section>

        <section className="map-section polling-overview" aria-labelledby="state-map-title">
          <div className="map-section-header">
            <div>
              <p className="section-label">{isGerman ? "Länderkarte" : "State map"}</p>
              <h2 id="state-map-title">{isGerman ? "Neuester verfügbarer Stand in den Ländern" : "Latest available state-level picture"}</h2>
              <p>{isGerman
                ? "Die Standardansicht zeigt die stärkste Partei im jeweils neuesten verfügbaren Landesdurchschnitt. Die Stände unterscheiden sich je Land; für kleine Stadtstaaten werden Beschriftungen mit einer Linie nach außen geführt."
                : "The default view shows the leading party in each state’s latest available average. Dates differ by state; labels for small city states use external callouts."}</p>
            </div>
          </div>
          <GermanyPollingMap
            data={mapData}
            mapGeometry={mapGeometry}
            locale={locale}
            mode={mapMode}
            setMode={setMapMode}
            partyId={mapParty}
            setPartyId={setMapParty}
            focusedSlug={focusedSlug}
            setFocusedSlug={setFocusedSlug}
            onShare={() => setMapEmbedOpen(true)}
          />
          <p className="map-method-note">
            <Icon name="info" size={16} />
            {isGerman
              ? "Jedes Land hat einen eigenen Datenstand: je Institut zählt die jüngste veröffentlichte Umfrage innerhalb von 45 Tagen vor der letzten Landesumfrage, anschließend gleich gewichtet. Bei Auswahl nennt die Infokarte Stand und Alter; ab 90 Tagen erscheint ein zusätzlicher Hinweis. „Zuwachs“ ist eine lineare Schätzung für die 180 Tage vor dem jeweiligen Landesstand, daher zwischen Ländern nur eingeschränkt vergleichbar und keine Prognose."
              : "Each state has its own date: each pollster’s latest published poll within 45 days before that state’s final poll is equally weighted. On selection, the information card shows the date and age, with an extra notice from 90 days. “Gain” is a linear estimate for the 180 days ending at each state’s date, so cross-state comparisons are limited; it is not a forecast."}
          </p>
        </section>

        <MapAttribution locale={locale} />
        <MapEmbedModal
          open={mapEmbedOpen}
          onClose={() => setMapEmbedOpen(false)}
          t={t}
          locale={locale}
          mode={mapMode}
          partyId={mapParty}
        />
      </main>
    );
  }

  return (
    <main id="top" className="overview-page">
      <section className="overview-hero">
        <div className="eyebrow"><span />{isGerman ? "Wahlumfragen in Deutschland" : "Election polling in Germany"}</div>
        <h1>{isGerman ? "Bund und Länder im Überblick" : "Federal and state polling"}</h1>
        <p>{isGerman
          ? "Aktuelle Umfragen, langfristige Trends und einheitlich erklärte Datenqualität – vom Bundestag bis zu allen 16 Ländern."
          : "Current polls, long-term trends and consistently explained data quality—from the Bundestag to all 16 states."}</p>
      </section>

      <div className="overview-entry-stack">
        <a className="federal-entry" href="/?region=bundestag">
          <div>
            <span>{isGerman ? "Gesamtdeutschland" : "Germany"}</span>
            <h2>{isGerman ? "Umfragen zur Bundestagswahl" : "Federal election polling"}</h2>
            <p>{isGerman ? "Der vollständige Bundes-Trend mit Institutsvergleich, Ereignissen und Einbettung." : "The full national trend with pollster comparison, events and embedding."}</p>
          </div>
          {regions[0] && (
            <dl>
              <div><dt>{isGerman ? "Umfragen" : "Polls"}</dt><dd>{regions[0].pollCount.toLocaleString(getNumberLocale(locale))}</dd></div>
              <div><dt>{isGerman ? "Seit" : "Since"}</dt><dd>{new Date(parseDate(regions[0].firstDate)).getUTCFullYear()}</dd></div>
              <div><dt>{isGerman ? "Zuletzt" : "Latest"}</dt><dd>{formatDate(regions[0].latestDate, locale, { year: true })}</dd></div>
            </dl>
          )}
          <span className="entry-arrow" aria-hidden="true">→</span>
        </a>
        <a className="federal-entry map-entry" href="/?view=map">
          <div>
            <span>{isGerman ? "Interaktive Länderkarte" : "Interactive state map"}</span>
            <h2>{isGerman ? "Deutschland im Überblick" : "Germany at a glance"}</h2>
            <p>{isGerman
              ? "Stärkste Parteien, Parteivergleich und aktuelle Bewegungen in allen 16 Ländern."
              : "Leading parties, party comparisons and current movement across all 16 states."}</p>
          </div>
          <dl>
            <div><dt>{isGerman ? "Länder" : "States"}</dt><dd>16</dd></div>
            <div><dt>{isGerman ? "Ansichten" : "Views"}</dt><dd>3</dd></div>
            <div><dt>{isGerman ? "Teilen" : "Sharing"}</dt><dd>Embed</dd></div>
          </dl>
          <span className="entry-arrow" aria-hidden="true">→</span>
        </a>
      </div>
      <StateCoverageMap states={states} locale={locale} mapGeometry={mapGeometry} />
      <StateDirectory states={states} locale={locale} />
      <MapAttribution locale={locale} />
    </main>
  );
}

function LegalPage({ locale }) {
  const isGerman = locale === "de";
  return (
    <main className="legal-page" id="top">
      <a className="breadcrumb" href="/">← {isGerman ? "Zur Übersicht" : "Back to overview"}</a>
      <p className="section-label">Rechtliches</p>
      <h1>Impressum</h1>
      <section>
        <h2>Angaben gemäß § 5 DDG und § 18 MStV</h2>
        <address>
          Katharina O&apos;Connor<br />
          Kaiserallee 2b<br />
          23570 Lübeck<br />
          Deutschland
        </address>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        <p><a href="/?page=kontakt">Kontaktassistent öffnen</a></p>
      </section>
      <section>
        <h2>Verantwortlich für journalistisch-redaktionelle Inhalte</h2>
        <p>Gemäß § 18 Abs. 2 MStV:<br />Katharina O&apos;Connor, Anschrift wie oben.</p>
      </section>
    </main>
  );
}

function ContactPage({ locale }) {
  const isGerman = locale === "de";
  const categories = isGerman
    ? [
        ["daten", "Datenkorrektur"],
        ["quelle", "Quelle oder Lizenz"],
        ["presse", "Einbettung und Presse"],
        ["technik", "Technisches Problem"],
        ["sonstiges", "Sonstiges"],
      ]
    : [
        ["daten", "Data correction"],
        ["quelle", "Source or licence"],
        ["presse", "Embeds and press"],
        ["technik", "Technical issue"],
        ["sonstiges", "Other"],
      ];
  const [category, setCategory] = useState("daten");
  const [subject, setSubject] = useState("");
  const [reference, setReference] = useState("");
  const [message, setMessage] = useState("");
  const [prepared, setPrepared] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    const categoryLabel = categories.find(([id]) => id === category)?.[1] ?? categories[0][1];
    const mailSubject = `[Pollframe · ${categoryLabel}] ${subject.trim()}`;
    const body = [
      message.trim(),
      reference.trim() ? `\n${isGerman ? "Betroffene Seite oder Quelle" : "Relevant page or source"}: ${reference.trim()}` : "",
      `\n${isGerman ? "Kategorie" : "Category"}: ${categoryLabel}`,
    ].join("");
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(mailSubject)}&body=${encodeURIComponent(body)}`;
    setPrepared(true);
    window.location.assign(mailto);
  };

  return (
    <main className="legal-page contact-page" id="top">
      <a className="breadcrumb" href="/">← {isGerman ? "Zur Übersicht" : "Back to overview"}</a>
      <p className="section-label">{isGerman ? "Direkter Kontakt" : "Direct contact"}</p>
      <h1>{isGerman ? "Kontakt" : "Contact"}</h1>
      <p className="contact-lead">{isGerman
        ? "Melde Datenfehler, sende eine Quellenfrage oder frage nach einer Einbettung. Je genauer die betroffene Seite genannt ist, desto schneller lässt sich die Nachricht bearbeiten."
        : "Report a data error, ask about a source or get help with an embed. Naming the relevant page helps us handle the message more quickly."}</p>

      <div className="contact-layout">
        <form className="contact-form-card" onSubmit={handleSubmit}>
          <div className="contact-form-grid">
            <label className="contact-field">
              <span>{isGerman ? "Kategorie" : "Category"}</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)}>
                {categories.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
            <label className="contact-field">
              <span>{isGerman ? "Betreff" : "Subject"}</span>
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={120}
                required
                placeholder={isGerman ? "Kurz zusammenfassen" : "A short summary"}
              />
            </label>
            <label className="contact-field contact-field-wide">
              <span>{isGerman ? "Betroffene Seite oder Quelle" : "Relevant page or source"} <em>{isGerman ? "optional" : "optional"}</em></span>
              <input
                type="url"
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                maxLength={500}
                placeholder="https://…"
              />
            </label>
            <label className="contact-field contact-field-wide">
              <span>{isGerman ? "Nachricht" : "Message"}</span>
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                minLength={10}
                maxLength={5000}
                required
                placeholder={isGerman ? "Was sollten wir wissen?" : "What should we know?"}
              />
            </label>
          </div>
          <button className="primary-button contact-submit" type="submit">
            <Icon name="external" size={16} />
            {isGerman ? "In E-Mail-App öffnen" : "Open in email app"}
          </button>
          {prepared && (
            <p className="contact-status" role="status">{isGerman
              ? "Die E-Mail-App wurde angefragt. Die Nachricht ist erst versendet, wenn du dort auf „Senden“ drückst."
              : "Your email app was requested. The message is not sent until you press “Send” there."}</p>
          )}
        </form>

        <aside className="contact-explainer">
          <span className="contact-explainer-icon" aria-hidden="true"><Icon name="info" size={19} /></span>
          <h2>{isGerman ? "So funktioniert es" : "How it works"}</h2>
          <p>{isGerman
            ? "Dieses Formular sendet und speichert nichts auf Pollframe. Der Button öffnet lediglich dein eigenes E-Mail-Programm mit einer vorbereiteten Nachricht."
            : "This form does not send or store anything on Pollframe. The button only opens your own email app with a prepared message."}</p>
          <p>{isGerman
            ? "Prüfe die Nachricht dort und drücke anschließend auf „Senden“. Erst dann wird sie über deinen E-Mail-Anbieter an Proton Mail übertragen."
            : "Review the message there and then press “Send”. Only then is it transferred by your email provider to Proton Mail."}</p>
          <div className="contact-direct">
            <span>{isGerman ? "Direkte E-Mail" : "Direct email"}</span>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
        </aside>
      </div>
    </main>
  );
}

function PrivacyPage({ locale }) {
  const isGerman = locale === "de";
  if (!isGerman) {
    return (
      <main className="legal-page privacy-page" id="top">
        <a className="breadcrumb" href="/">← Back to overview</a>
        <p className="section-label">Legal</p>
        <h1>Privacy notice</h1>
        <p className="privacy-updated">Last updated: 7 August 2026</p>

        <section>
          <h2>1. Controller</h2>
          <address>
            Katharina O&apos;Connor<br />
            Kaiserallee 2b<br />
            23570 Lübeck<br />
            Germany
          </address>
          <p>Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
        </section>

        <section>
          <h2>2. Hosting and delivery</h2>
          <p>Pollframe is delivered through Cloudflare Workers with Static Assets, a service provided by Cloudflare, Inc. To deliver and protect the website, Cloudflare processes technical connection data. This may include the IP address, time of access, requested file, HTTP status, transferred data volume, browser and device information, and a referrer if the browser provides one.</p>
          <p>The legal basis is Article 6(1)(f) GDPR. Our legitimate interests are reliable delivery, protection against attacks and technical fault diagnosis. We do not operate our own visitor database or analyse raw access logs ourselves.</p>
          <p>Cloudflare operates a global network, so processing may also take place outside the European Economic Area. Cloudflare describes the safeguards used for these transfers in its <a href="https://www.cloudflare.com/cloudflare-customer-dpa/" target="_blank" rel="noreferrer">Data Processing Addendum</a> and <a href="https://www.cloudflare.com/policies/privacy/" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>
        </section>

        <section>
          <h2>3. App and information stored on your device</h2>
          <p>Pollframe stores settings you actively select—language, appearance, text size and reduced motion—and the latest polling snapshot shown to you in your browser’s local storage. The Watchlist is offered only when Pollframe is opened as an installed app. Its entries contain only selected parliaments and parties plus the last comparison values; they are not sent to Pollframe or synchronised between devices. The snapshot is used only to show real changes since your previous visit. If you install Pollframe or your browser supports offline use, a service worker and browser cache also retain the application files and recently loaded polling datasets.</p>
          <p>If you actively enable device alerts, your browser asks for notification permission. In the current beta, Pollframe checks Watchlist conditions when you open the app and may then show a system notification and app badge. No push subscription or notification endpoint is stored on a Pollframe server.</p>
          <p>These files remain on your device until they are replaced automatically or you remove the app or Pollframe’s website data. They are not transmitted back to Pollframe, used to identify you or combined into a visitor profile.</p>
        </section>

        <section>
          <h2>4. Cookies, audience measurement and advertising</h2>
          <p>Pollframe uses Cloudflare Web Analytics, provided by Cloudflare, Inc., to measure aggregate visits and page views and to understand referrer hosts, countries, device and browser categories, page-load performance and Core Web Vitals. We use these aggregated measurements to improve Pollframe&apos;s reach, usability and technical performance. The analytics beacon is loaded from <code>static.cloudflareinsights.com</code> and sends measurements to <code>cloudflareinsights.com</code>. It is not loaded in the dedicated journalist embed.</p>
          <p>Cloudflare states that Web Analytics does not use cookies or local storage, does not track individuals across websites and does not collect or use visitors&apos; personal data. Query strings are not logged. Pollframe does not receive IP addresses or identifiers that would allow us to recognise an individual visitor. The legal basis is Article 6(1)(f) GDPR; our legitimate interests are privacy-preserving aggregate reach measurement and improving the website.</p>
          <p>Cloudflare retains unsampled beacon data for seven days and subsequently keeps aggregated data; dashboard reports are available for up to six months. Details are provided in Cloudflare&apos;s <a href="https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/" target="_blank" rel="noreferrer">Web Analytics documentation</a>. Pollframe does not use advertising networks, sell personal data or make automated decisions about visitors.</p>
        </section>

        <section>
          <h2>5. Embedded charts and external links</h2>
          <p>Pollframe embeds load charts and maps directly from Pollframe through Cloudflare. They do not contain advertising or third-party tracking. When you follow an external source or licence link, the destination provider receives the technical data required to load its website and processes it under its own privacy notice.</p>
          <p>The UK constituency finder sends only the postcode extracted from an entered address, an outward postcode or the place term to Postcodes.io after you press “Search”. Pollframe uses the response to select the matching constituency and does not retain the search. Postcodes.io receives the technical connection data required for the request and processes it under its own <a href="https://postcodes.io/about" target="_blank" rel="noreferrer">information</a>. Constituency-name matching, including typo tolerance, remains local in your browser. Northern Ireland postcode lookup is not offered.</p>
        </section>

        <section>
          <h2>6. Contact by email</h2>
          <p>The contact assistant does not transmit entries to Pollframe or Cloudflare. It creates a prepared email and asks the browser to open your local email app. Data is transmitted only if you send the message from that app.</p>
          <p>If you contact us, your message, email address and the information you provide are processed to answer the request. Email is provided through Proton Mail. The legal basis is Article 6(1)(f) GDPR, or Article 6(1)(b) GDPR where the message concerns steps before entering into a contract. Messages are deleted when the request has been resolved unless legal retention obligations apply. Proton’s information is available in its <a href="https://proton.me/legal/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>
        </section>

        <section>
          <h2>7. Retention and recipients</h2>
          <p>Local preferences and app caches remain until they are automatically replaced or you remove them. Contact messages are kept only as long as necessary for the request or a legal obligation. Technical security and aggregate Web Analytics data processed by Cloudflare are retained as described above and under Cloudflare’s applicable policies. Data is disclosed only to the service providers named above where necessary, or where required by law.</p>
        </section>

        <section>
          <h2>8. Your rights</h2>
          <p>Subject to the legal requirements, you may request access, correction, deletion, restriction of processing and data portability, and you may object to processing based on legitimate interests. You may also lodge a complaint with a data-protection supervisory authority. Use the email address above to exercise these rights.</p>
        </section>

        <section>
          <h2>9. Changes</h2>
          <p>This notice will be updated before introducing advertising, user accounts, payments, additional analytics services or other services that process additional data.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="legal-page privacy-page" id="top">
      <a className="breadcrumb" href="/">← Zur Übersicht</a>
      <p className="section-label">Rechtliches</p>
      <h1>Datenschutzerklärung</h1>
      <p className="privacy-updated">Stand: 7. August 2026</p>

      <section>
        <h2>1. Verantwortlicher</h2>
        <address>
          Katharina O&apos;Connor<br />
          Kaiserallee 2b<br />
          23570 Lübeck<br />
          Deutschland
        </address>
        <p>E-Mail: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></p>
      </section>

      <section>
        <h2>2. Hosting und Auslieferung</h2>
        <p>Pollframe wird über Cloudflare Workers mit Static Assets, einen Dienst der Cloudflare, Inc., ausgeliefert. Für die Auslieferung und Absicherung der Website verarbeitet Cloudflare technische Verbindungsdaten. Dazu können IP-Adresse, Zeitpunkt des Zugriffs, aufgerufene Datei, HTTP-Status, übertragene Datenmenge, Browser- und Geräteangaben sowie ein vom Browser übermittelter Referrer gehören.</p>
        <p>Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO. Unsere berechtigten Interessen sind eine zuverlässige Auslieferung, der Schutz vor Angriffen und die technische Fehlerdiagnose. Wir betreiben keine eigene Besucherdatenbank und werten rohe Zugriffsprotokolle nicht selbst aus.</p>
        <p>Cloudflare betreibt ein weltweites Netzwerk, sodass eine Verarbeitung auch außerhalb des Europäischen Wirtschaftsraums stattfinden kann. Die hierfür verwendeten Schutzmaßnahmen beschreibt Cloudflare in seinem <a href="https://www.cloudflare.com/cloudflare-customer-dpa/" target="_blank" rel="noreferrer">Auftragsverarbeitungszusatz</a> und seiner <a href="https://www.cloudflare.com/policies/privacy/" target="_blank" rel="noreferrer">Datenschutzerklärung</a>.</p>
      </section>

      <section>
        <h2>3. App und auf deinem Gerät gespeicherte Informationen</h2>
        <p>Pollframe speichert von dir gewählte Einstellungen – Sprache, Darstellung, Textgröße und reduzierte Bewegung – sowie den zuletzt angezeigten Umfragestand im lokalen Speicher deines Browsers. Die Watchlist wird nur angeboten, wenn Pollframe als installierte App geöffnet ist. Ihre Einträge enthalten nur ausgewählte Parlamente und Parteien sowie die letzten Vergleichswerte; sie werden nicht an Pollframe übertragen und nicht zwischen Geräten synchronisiert. Der Stand dient nur dazu, echte Änderungen seit deinem vorherigen Besuch zu zeigen. Wenn du Pollframe installierst oder dein Browser die Offline-Nutzung unterstützt, speichern ein Service Worker und der Browser-Cache außerdem die Anwendungsdateien und zuletzt geladenen Umfragedatensätze.</p>
        <p>Wenn du Gerätehinweise aktiv einschaltest, fragt dein Browser nach der Benachrichtigungsberechtigung. In der aktuellen Beta prüft Pollframe Watchlist-Bedingungen beim Öffnen der App und kann anschließend einen Systemhinweis sowie ein App-Badge anzeigen. Auf einem Pollframe-Server wird derzeit weder ein Push-Abonnement noch ein Benachrichtigungs-Endpunkt gespeichert.</p>
        <p>Diese Dateien bleiben auf deinem Gerät, bis sie automatisch ersetzt werden oder du die App beziehungsweise die Websitedaten von Pollframe entfernst. Sie werden nicht an Pollframe zurückübermittelt, nicht zu deiner Identifizierung verwendet und nicht zu einem Besucherprofil zusammengeführt.</p>
      </section>

      <section>
        <h2>4. Cookies, Reichweitenmessung und Werbung</h2>
        <p>Pollframe verwendet Cloudflare Web Analytics von Cloudflare, Inc., um zusammengefasste Besuche und Seitenaufrufe zu messen und verweisende Websites, Länder, Geräte- und Browserkategorien, Ladezeiten sowie Core Web Vitals zu verstehen. Diese aggregierten Messwerte nutzen wir, um Reichweite, Bedienbarkeit und technische Leistung von Pollframe zu verbessern. Der Analyse-Beacon wird von <code>static.cloudflareinsights.com</code> geladen und übermittelt Messwerte an <code>cloudflareinsights.com</code>. Im gesonderten Journalisten-Embed wird er nicht geladen.</p>
        <p>Nach Angaben von Cloudflare verwendet Web Analytics weder Cookies noch lokalen Speicher, verfolgt keine einzelnen Personen über Websites hinweg und erhebt oder verwendet keine personenbezogenen Besucherdaten. URL-Abfrageparameter werden nicht protokolliert. Pollframe erhält keine IP-Adressen oder Kennungen, mit denen wir einzelne Besucher wiedererkennen könnten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unsere berechtigten Interessen sind eine datensparsame, aggregierte Reichweitenmessung und die Verbesserung der Website.</p>
        <p>Cloudflare bewahrt nicht hochgerechnete Beacon-Daten sieben Tage auf und speichert anschließend aggregierte Daten; Auswertungen stehen im Dashboard bis zu sechs Monate zur Verfügung. Einzelheiten beschreibt Cloudflare in seiner <a href="https://developers.cloudflare.com/web-analytics/data-metrics/data-origin-and-collection/" target="_blank" rel="noreferrer">Dokumentation zu Web Analytics</a>. Pollframe verwendet keine Werbenetzwerke, verkauft keine personenbezogenen Daten und trifft keine automatisierten Entscheidungen über Besucher.</p>
      </section>

      <section>
        <h2>5. Eingebettete Grafiken und externe Links</h2>
        <p>Pollframe-Embeds laden Diagramme und Karten direkt von Pollframe über Cloudflare. Sie enthalten keine Werbung und kein Drittanbieter-Tracking. Wenn du einem externen Quellen- oder Lizenzlink folgst, erhält der Zielanbieter die technisch zur Auslieferung seiner Website erforderlichen Daten und verarbeitet sie nach seiner eigenen Datenschutzerklärung.</p>
        <p>Die britische Wahlkreissuche übermittelt erst beim Klick auf „Suchen“ entweder nur den aus einer eingegebenen Adresse erkannten Postcode, ein Postcode-Gebiet oder den Ortsbegriff an Postcodes.io. Pollframe verwendet die Antwort zur Wahlkreisauswahl und speichert die Suche nicht. Postcodes.io erhält die für die Anfrage erforderlichen technischen Verbindungsdaten und verarbeitet sie nach seinen <a href="https://postcodes.io/about" target="_blank" rel="noreferrer">eigenen Angaben</a>. Wahlkreisnamen werden einschließlich der Tippfehlerkorrektur lokal im Browser abgeglichen. Für Nordirland wird keine Postleitzahlsuche angeboten.</p>
      </section>

      <section>
        <h2>6. Kontakt per E-Mail</h2>
        <p>Der Kontaktassistent überträgt Eingaben nicht an Pollframe oder Cloudflare. Er erstellt lediglich eine vorbereitete E-Mail und fordert den Browser auf, das lokale E-Mail-Programm zu öffnen. Daten werden erst übertragen, wenn du die Nachricht dort absendest.</p>
        <p>Wenn du uns kontaktierst, werden deine Nachricht, deine E-Mail-Adresse und die von dir mitgeteilten Informationen zur Bearbeitung der Anfrage verarbeitet. Der E-Mail-Dienst wird über Proton Mail bereitgestellt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, bei vorvertraglichen Anfragen Art. 6 Abs. 1 lit. b DSGVO. Nachrichten werden gelöscht, wenn die Anfrage abschließend erledigt ist, sofern keine gesetzlichen Aufbewahrungspflichten bestehen. Informationen von Proton stehen in dessen <a href="https://proton.me/legal/privacy" target="_blank" rel="noreferrer">Datenschutzerklärung</a>.</p>
      </section>

      <section>
        <h2>7. Speicherdauer und Empfänger</h2>
        <p>Lokale Einstellungen und App-Caches bleiben bestehen, bis sie automatisch ersetzt oder von dir entfernt werden. Kontaktanfragen werden nur so lange gespeichert, wie es für die Bearbeitung oder eine gesetzliche Pflicht erforderlich ist. Technische Sicherheitsdaten und aggregierte Web-Analytics-Daten bei Cloudflare werden wie oben beschrieben und nach den jeweils geltenden Richtlinien von Cloudflare gespeichert. Daten werden nur an die oben genannten Dienstleister weitergegeben, soweit dies erforderlich ist, oder wenn wir gesetzlich dazu verpflichtet sind.</p>
      </section>

      <section>
        <h2>8. Deine Rechte</h2>
        <p>Unter den gesetzlichen Voraussetzungen hast du Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung und Datenübertragbarkeit sowie ein Widerspruchsrecht gegen Verarbeitungen auf Grundlage berechtigter Interessen. Du kannst dich außerdem bei einer Datenschutzaufsichtsbehörde beschweren. Zur Ausübung deiner Rechte genügt eine Nachricht an die oben genannte E-Mail-Adresse.</p>
      </section>

      <section>
        <h2>9. Änderungen</h2>
        <p>Diese Erklärung wird vor der Einführung von Werbung, Benutzerkonten, Zahlungen, weiteren Analysediensten oder anderen Diensten aktualisiert, durch die zusätzliche Daten verarbeitet werden.</p>
      </section>
    </main>
  );
}

function LicencesPage({ locale }) {
  const isGerman = locale === "de";
  return (
    <main className="legal-page licences-page" id="top">
      <a className="breadcrumb" href="/">← {isGerman ? "Zur Übersicht" : "Back to overview"}</a>
      <p className="section-label">{isGerman ? "Nachweise" : "Notices"}</p>
      <h1>{isGerman ? "Quellen und Lizenzen" : "Sources and licences"}</h1>
      <p className="licence-lead">{isGerman
        ? "Diese Seite dokumentiert die fremden Daten, Karten und Laufzeitbibliotheken, die Pollframe öffentlich verwendet."
        : "This page documents the third-party data, map material and runtime libraries used publicly by Pollframe."}</p>

      <section className="licence-card">
        <span className="licence-kind">{isGerman ? "Datenbank" : "Database"}</span>
        <h2>{isGerman ? "Wahlumfragen: DAWUM" : "Polling data: DAWUM"}</h2>
        <p>
          {isGerman ? "Die Umfragedaten stammen aus der " : "Polling data comes from the "}
          <a href={DATA_SOURCE_URL} target="_blank" rel="noreferrer">DAWUM-Datenbank</a>
          {isGerman
            ? ". Diese abgeleitete Pollframe-Datenbank wird ebenfalls unter der "
            : ". This derivative Pollframe database is also made available under the "}
          <a href={DATA_LICENSE_URL} target="_blank" rel="noreferrer">Open Database License (ODbL) 1.0</a>
          {isGerman ? " bereitgestellt." : "."}
        </p>
        <p>{isGerman
          ? "Änderungen durch Pollframe: Beschränkung auf acht ausgewählte Institute und Daten ab 2017; Vereinheitlichung und Umbenennung von Feldern; Aufteilung nach Parlamenten; Berechnung gleich gewichteter Institutsmittel und linearer Ländertrends. Die herunterladbaren JSON-Dateien enthalten den Quellen- und Lizenzhinweis ebenfalls."
          : "Changes by Pollframe: filtering to eight selected pollsters and data from 2017; normalising and renaming fields; splitting records by parliament; calculating equally weighted pollster averages and linear state trends. Downloadable JSON files also contain the source and licence notice."}</p>
      </section>

      <section className="licence-card">
        <span className="licence-kind">{isGerman ? "Datenbank · Vereinigtes Königreich" : "Database · United Kingdom"}</span>
        <h2>UK Election Data Vault</h2>
        <p>{isGerman
          ? "Die britischen Umfragen, der gewichtete 14-Tage-Trend und die zusammengefassten Unterhauswahlergebnisse stammen aus dem "
          : "UK polls, the weighted 14-day trend and aggregated general-election results come from the "}
          <a href="https://electiondatavault.co.uk/data/" target="_blank" rel="noreferrer">UK Election Data Vault</a>. {isGerman
            ? "Der Anbieter erklärt, dass sämtliche Daten frei für kommerzielle und sonstige Zwecke verwendet werden dürfen."
            : "The provider states that all data is freely available for commercial or any other use."}
          {" "}<a href="https://electiondatavault.co.uk/about/" target="_blank" rel="noreferrer">{isGerman ? "Nutzungsangabe" : "Reuse statement"}</a>.
        </p>
        <p>{isGerman
          ? "Änderungen durch Pollframe: Auswahl von Großbritannien, Zusammenführung historischer Parteinamen, Gruppierung einzelner Umfragezeilen, Ausdünnung alter Trendstützpunkte für schnelle Grafiken und regionale Zusammenfassung der Unterhauswahl 2024. Der Standardtrend folgt der Methodik des Data Vault; die wählbaren Einzelinstitute werden von Pollframe separat verarbeitet."
          : "Changes by Pollframe: selecting Great Britain, consolidating historical party names, grouping poll rows, thinning older trend points for fast graphics and regionally aggregating the 2024 general election. The default trend follows the Data Vault methodology; selected individual pollsters are processed separately by Pollframe."}</p>
      </section>

      <section className="licence-card">
        <span className="licence-kind">{locale === "es" ? "Datos · España" : isGerman ? "Daten · Spanien" : "Data · Spain"}</span>
        <h2>{locale === "es" ? "Encuestas españolas y barómetro del CIS" : isGerman ? "Spanische Umfragen und CIS-Barometer" : "Spanish polling and CIS barometer"}</h2>
        <p>{locale === "es" ? "Las tablas nacionales actuales e históricas desde 1996 se extraen de " : isGerman ? "Die aktuellen und historischen nationalen Tabellen seit 1996 werden aus " : "Current and historical national tables since 1996 are extracted from "}<a href="https://en.wikipedia.org/wiki/Opinion_polling_for_the_next_Spanish_general_election" target="_blank" rel="noreferrer">Wikipedia contributors</a>{locale === "es" ? " con licencia CC BY-SA 4.0. Pollframe normaliza fechas y partidos, elimina estimaciones de escaños y conserva el enlace original cuando está disponible. La lista completa de páginas de archivo figura en los metadatos del conjunto de datos." : isGerman ? " unter CC BY-SA 4.0 übernommen. Pollframe vereinheitlicht Daten und Parteien, entfernt Sitzschätzungen und bewahrt nach Möglichkeit den Originalbeleg. Die vollständige Liste der Archivseiten steht in den Metadaten des Datensatzes." : " under CC BY-SA 4.0. Pollframe normalises dates and parties, removes seat estimates and preserves original citations where available. The dataset metadata lists every archive page used."} <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>. <a href="/data/spain-congress.json">JSON ↗</a></p>
        <p>{locale === "es" ? "El módulo de preocupaciones usa porcentajes publicados por el " : isGerman ? "Das Themenmodul nutzt veröffentlichte Prozentwerte des " : "The issues module uses published percentages from "}<a href="https://www.cis.es/es/w/vivienda-preocupacion-barometro-abril-2026" target="_blank" rel="noreferrer">Centro de Investigaciones Sociológicas (CIS)</a>.</p>
      </section>

      <section className="licence-card">
        <span className="licence-kind">{isGerman ? "Amtliche Daten · Vereinigtes Königreich" : "Official data · United Kingdom"}</span>
        <h2>{isGerman ? "650 Unterhauswahlkreise" : "650 Commons constituencies"}</h2>
        <p>{isGerman ? "Kandidaten-, Stimmen- und Wahlkreisergebnisse der Unterhauswahl 2024 stammen vom " : "Candidate, vote and constituency results for the 2024 general election come from the "}<a href="https://electionresults.parliament.uk/" target="_blank" rel="noreferrer">UK Parliament election results service</a>.</p>
        <p>Contains Parliamentary information licensed under the <a href="https://www.parliament.uk/site-information/copyright/open-parliament-licence/" target="_blank" rel="noreferrer">Open Parliament Licence v3.0</a>.</p>
        <p>{isGerman ? "Die freiwillige Postleitzahlsuche nutzt " : "The optional postcode finder uses "}<a href="https://postcodes.io/" target="_blank" rel="noreferrer">Postcodes.io</a>{isGerman ? " und für Großbritannien OS OpenData. Pollframe speichert die Eingabe nicht. Nordirische BT-Postleitzahlen werden wegen der gesonderten Geodatenlizenz nicht an den Dienst gesendet. " : " and OS OpenData for Great Britain. Pollframe does not retain the input. Northern Ireland BT postcodes are not sent because they require a separate geodata licence. "}Contains Ordnance Survey data © Crown copyright and database right 2025. {isGerman ? "Weitere Herkunfts- und Lizenzhinweise für Royal-Mail-, Statistik- und NRS-Daten stehen in der " : "Further provenance and licence notices for Royal Mail, statistical and NRS data are set out in the "}<a href="https://postcodes.io/docs/licences/" target="_blank" rel="noreferrer">Postcodes.io licence notice</a>.</p>
      </section>

      <section className="licence-card">
        <span className="licence-kind">{isGerman ? "Amtliche Daten" : "Official data"}</span>
        <h2>{isGerman ? "Amtliche Wahlergebnisse" : "Official election results"}</h2>
        <p>
          © <a href={ELECTION_SOURCE_URL} target="_blank" rel="noreferrer">
            {isGerman ? "Die Bundeswahlleiterin, Wiesbaden" : "Federal Returning Officer, Wiesbaden"}
          </a>. {isGerman
            ? "Pollframe verwendet Zweitstimmen-Prozentwerte der Bundestagswahlen 2017, 2021 und 2025. Die Werte wurden gekürzt, in die Pollframe-Datenstruktur übertragen und grafisch neu dargestellt."
            : "Pollframe uses second-vote percentages from the 2017, 2021 and 2025 federal elections. Values were shortened, transferred into Pollframe’s data structure and presented in a new graphic form."}
        </p>
      </section>

      <section className="licence-card">
        <span className="licence-kind">{isGerman ? "Kartografie" : "Cartography"}</span>
        <h2>{isGerman ? "Kartengeometrie" : "Map geometry"}</h2>
        <p>
          {isGerman ? "Die Deutschlandkarte basiert auf " : "The map of Germany is based on "}
          <a href={MAP_ORIGINAL_URL} target="_blank" rel="noreferrer">MapSVG</a>
          {isGerman ? " und wurde von " : " and was adapted by "}
          <a href={MAP_SOURCE_URL} target="_blank" rel="noreferrer">Victor Cazanave als @svg-maps/germany</a>
          {isGerman ? " aufbereitet. Lizenz: " : ". Licence: "}
          <a href={MAP_LICENSE_URL} target="_blank" rel="noreferrer">Creative Commons Attribution 4.0 International</a>.
        </p>
        <p>{isGerman
          ? "Vorherige Änderungen: technische Bereinigung, neue Namen und IDs, ViewBox und Sortierung. Änderungen durch Pollframe: responsive Einbindung, Einfärbung, Konturen, Beschriftungen, Callouts, Auswahlmarkierung und Verknüpfung mit Pollframe-Daten. Die Nennung bedeutet keine Unterstützung oder Empfehlung durch MapSVG oder Victor Cazanave."
          : "Earlier changes: technical clean-up, new names and IDs, a viewBox and sorting. Changes by Pollframe: responsive integration, colouring, outlines, labels, callouts, selection highlighting and linking to Pollframe data. This credit does not imply endorsement by MapSVG or Victor Cazanave."}</p>
        <p>{isGerman ? "Die interaktive UK-Karte verwendet " : "The interactive UK map uses "}<a href="https://github.com/shubhexists/react-maps" target="_blank" rel="noreferrer">@react-map/united-kingdom</a>{isGerman ? " unter der MIT-Lizenz; Pollframe färbt die Geometrie ein und verknüpft sie mit zusammengefassten Wahlergebnissen." : " under the MIT License; Pollframe colours the geometry and links it to aggregated election results."}</p>
        <p>{locale === "es" ? "El mapa de comunidades autónomas utiliza " : isGerman ? "Die Karte der autonomen Gemeinschaften verwendet " : "The autonomous-community map uses "}<a href="https://public.opendatasoft.com/explore/dataset/georef-spain-comunidad-autonoma/" target="_blank" rel="noreferrer">Opendatasoft georef Spain</a>{locale === "es" ? " con licencia CC BY 4.0; Pollframe reproyecta, simplifica visualmente y hace interactiva la geometría." : isGerman ? " unter CC BY 4.0; Pollframe projiziert die Geometrie neu und macht sie interaktiv." : " under CC BY 4.0; Pollframe reprojects the geometry and makes it interactive."}</p>
      </section>

      <section className="licence-card">
        <span className="licence-kind">{isGerman ? "Software" : "Software"}</span>
        <h2>{isGerman ? "Ausgelieferte MIT-Bibliotheken" : "Bundled MIT libraries"}</h2>
        <p>{isGerman
          ? "Die ausgelieferte Anwendung enthält React und React DOM von Meta Platforms, Inc. and affiliates, html-to-image von W.Y. sowie @react-map/united-kingdom aus dem React Map-Projekt. Sie stehen unter der MIT-Lizenz."
          : "The delivered application contains React and React DOM by Meta Platforms, Inc. and affiliates, html-to-image by W.Y., and @react-map/united-kingdom from the React Map project. They are provided under the MIT License."}</p>
        <details className="licence-disclosure">
          <summary>{isGerman ? "Copyright-Hinweise und MIT-Lizenztext anzeigen" : "Show copyright notices and MIT licence text"}</summary>
          <pre className="licence-text">{`MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.
Copyright (c) 2017-2025 W.Y.
Copyright (c) React Map contributors.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`}</pre>
        </details>
      </section>

      <section className="licence-card">
        <span className="licence-kind">{isGerman ? "Kennzeichen & Quellen" : "Names & sources"}</span>
        <h2>{isGerman ? "Markenzeichen und Ereignisquellen" : "Trade marks and event sources"}</h2>
        <p>{isGerman
          ? "Partei- und Institutsnamen werden ausschließlich zur sachlichen Bezeichnung verwendet; Pollframe verwendet keine Partei- oder Institutslogos und behauptet keine Verbindung oder Unterstützung. Die kurzen Ereignistexte sind eigenständige Zusammenfassungen. Jeder Ereignismarker verlinkt die zugehörige Quelle; bevorzugt werden amtliche, parlamentarische oder andere fachlich belastbare Veröffentlichungen."
          : "Party and pollster names are used only for factual identification; Pollframe uses no party or pollster logos and claims no affiliation or endorsement. Short event texts are original summaries. Each event marker links to its source, with official, parliamentary or otherwise authoritative publications preferred."}</p>
      </section>
    </main>
  );
}

function App() {
  const query = new URLSearchParams(window.location.search);
  const embedMode = IS_EMBED_ENTRY;
  const queryList = (key, fallback, allowed) => {
    return queryListPreference(query, key, fallback, allowed, embedMode);
  };
  const [pollData, setPollData] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [locale, setLocale] = useState(() => (
    embedMode && SUPPORTED_LOCALES.includes(query.get("lang"))
      ? query.get("lang")
      : storedPreference("opinion-poll-locale", "de", SUPPORTED_LOCALES)
  ));
  useEffect(() => {
    if (isSpainContext && !["es", "de", "en-GB"].includes(locale)) setLocale("es");
  }, [isSpainContext, locale]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [theme, setTheme] = useState(() => (
    embedMode && ["system", "light", "dark"].includes(query.get("theme"))
      ? query.get("theme")
      : storedPreference("opinion-poll-theme", "system", ["system", "light", "dark"])
  ));
  const [textSize, setTextSize] = useState(() => storedPreference("opinion-poll-text-size", "standard", ["standard", "large"]));
  const [motion, setMotion] = useState(() => storedPreference("opinion-poll-motion", "system", ["system", "reduced"]));
  const [mode, setMode] = useState(() => (
    embedMode && ["trend", "linear", "polls", "both"].includes(query.get("mode")) ? query.get("mode") : "trend"
  ));
  const [range, setRange] = useState(() => (
    embedMode && ["month", "three", "six", "ytd", "year", "two", "election", "five", "all"].includes(query.get("range"))
      ? query.get("range")
      : "all"
  ));
  const [selectedEventCategories, setSelectedEventCategories] = useState(() => queryList(
    "events",
    ["national"],
    EVENT_CATEGORIES.map((category) => category.id),
  ));
  const [selectedParties, setSelectedParties] = useState(() => queryList(
    "parties",
    ["7", "1", "4", "2", "5"],
    PARTY_DEFINITIONS.map((party) => party.id),
  ));
  const [selectedPollsters, setSelectedPollsters] = useState([]);
  const [selectedPartyDetail, setSelectedPartyDetail] = useState(() => {
    const slug = new URLSearchParams(window.location.search).get("party");
    return PARTY_DEFINITIONS.find((party) => party.slug === slug) ?? null;
  });
  const t = copy[locale];

  const selectPartyDetail = (party) => {
    setSelectedPartyDetail(party);
    const url = new URL(window.location.href);
    if (party) url.searchParams.set("party", party.slug);
    else url.searchParams.delete("party");
    window.history.replaceState({}, "", url);
  };

  useEffect(() => {
    fetch("/poll-data.json")
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        setPollData(data);
        setSelectedPollsters(queryList("pollsters", Object.keys(data.pollsters), Object.keys(data.pollsters)));
      })
      .catch(() => setLoadError(true));
  }, []);

  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale]?.language ?? "en";
    document.documentElement.dir = LOCALE_META[locale]?.direction ?? "ltr";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.text = textSize;
    document.documentElement.dataset.motion = motion;
    document.documentElement.dataset.embed = embedMode ? "true" : "false";
    try {
      window.localStorage.setItem("opinion-poll-locale", locale);
      window.localStorage.setItem("opinion-poll-theme", theme);
      window.localStorage.setItem("opinion-poll-text-size", textSize);
      window.localStorage.setItem("opinion-poll-motion", motion);
    } catch {
      // Preferences still work for the current visit when storage is unavailable.
    }
  }, [locale, theme, textSize, motion, embedMode]);

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setSettingsOpen(false);
      setEmbedOpen(false);
      setMethodOpen(false);
      selectPartyDetail(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    const closeMenusOutside = (event) => {
      const activeDetails = event.target.closest?.("details");
      document.querySelectorAll(".select-control[open], .multi-select[open], .event-key[open], .graph-info-popover[open], .header-country-menu[open], .licence-disclosure[open]").forEach((details) => {
        if (details !== activeDetails || event.target === activeDetails) details.removeAttribute("open");
      });
    };
    document.addEventListener("pointerdown", closeMenusOutside);
    return () => document.removeEventListener("pointerdown", closeMenusOutside);
  }, []);

  const latestDate = pollData?.polls.at(-1)?.date;
  const current = useMemo(() => pollData && selectedPollsters.length
    ? averageAtDate(pollData.polls, selectedPollsters, latestDate, PARTY_DEFINITIONS.map((party) => party.id))
    : { results: {}, pollsterCount: 0 }, [pollData, selectedPollsters, latestDate]);
  const previous = useMemo(() => pollData && selectedPollsters.length
    ? averageAtDate(pollData.polls, selectedPollsters, toIso(parseDate(latestDate) - (7 * DAY)), PARTY_DEFINITIONS.map((party) => party.id))
    : { results: {}, pollsterCount: 0 }, [pollData, selectedPollsters, latestDate]);
  const tendencyBaseline = useMemo(() => pollData && selectedPollsters.length
    ? averageAtDate(pollData.polls, selectedPollsters, toIso(parseDate(latestDate) - (90 * DAY)), PARTY_DEFINITIONS.map((party) => party.id))
    : { results: {}, pollsterCount: 0 }, [pollData, selectedPollsters, latestDate]);

  const toggleRequired = (setter) => (id) => setter((currentSelection) => (
    currentSelection.includes(id)
      ? currentSelection.length > 1 ? currentSelection.filter((item) => item !== id) : currentSelection
      : [...currentSelection, id]
  ));
  const toggleEventCategory = (id) => setSelectedEventCategories((currentSelection) => (
    currentSelection.includes(id)
      ? currentSelection.filter((item) => item !== id)
      : [...currentSelection, id]
  ));

  if (embedMode) {
    if (!pollData || !latestDate) return <div className="embed-loading">{loadError ? t.error : t.loading}</div>;
    return (
      <EmbedView
        t={t}
        locale={locale}
        pollData={pollData}
        latestDate={latestDate}
        selectedParties={selectedParties}
        selectedPollsters={selectedPollsters}
        selectedEventCategories={selectedEventCategories}
        mode={mode}
        range={range}
      />
    );
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="Pollframe home">
            <BrandMark />
            <span>POLLFRAME</span>
            <em>BETA</em>
          </a>
          <div className="header-actions">
            <button className="header-button info-button" onClick={() => setMethodOpen(true)} aria-label={t.dataInfo}>
              <Icon name="info" /><span>{t.info}</span>
            </button>
            <button className="header-button" onClick={() => setSettingsOpen(true)} aria-label={t.settings}>
              <Icon name="settings" /><span>{t.settings}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top">
        <section className="intro-section">
          <div className="intro-copy">
            <div className="eyebrow"><span />{t.overview}</div>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
          </div>
          {pollData && latestDate && <ResultsCard t={t} locale={locale} current={current} previous={previous} date={latestDate} />}
          {!pollData && <div className="loading-card">{loadError ? t.error : t.loading}</div>}
        </section>

        {pollData && latestDate && (
          <>
          <section className="chart-card" aria-labelledby="main-chart-heading">
            <div className="chart-heading">
              <div>
                <p className="section-label">{current.pollsterCount === 1 ? t.onePollster : t.basedOn(current.pollsterCount)}</p>
                <h2 id="main-chart-heading">{t.chartTitle}</h2>
                <p>{t.chartSubtitle}</p>
              </div>
              <div className="chart-actions">
                <button className={`secondary-button ${customizeOpen ? "active" : ""}`} onClick={() => setCustomizeOpen(!customizeOpen)} aria-expanded={customizeOpen}>
                  <Icon name="sliders" />{t.customize}
                </button>
                <button className="primary-button" onClick={() => setEmbedOpen(true)}>
                  <Icon name="share" />{t.share}
                </button>
              </div>
            </div>

            {customizeOpen && (
              <div className="customize-panel">
                <SelectControl
                  label={t.display}
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "trend", label: t.trend },
                    { value: "linear", label: t.linear },
                    { value: "polls", label: t.polls },
                    { value: "both", label: t.both },
                  ]}
                />
                <SelectControl
                  label={t.timeRange}
                  value={range}
                  onChange={setRange}
                  options={[
                    { value: "month", label: t.oneMonthLong },
                    { value: "three", label: t.threeMonths },
                    { value: "six", label: t.sixMonths },
                    { value: "ytd", label: t.yearToDate },
                    { value: "year", label: t.year },
                    { value: "two", label: t.twoYears },
                    { value: "election", label: t.sinceElection },
                    { value: "five", label: t.fiveYearsLong },
                    { value: "all", label: t.fullArchive },
                  ]}
                />
                <MultiSelect
                  label={t.pollsters}
                  summary={t.pollsterCount(selectedPollsters.length, Object.keys(pollData.pollsters).length)}
                  items={Object.entries(pollData.pollsters).map(([id, label]) => ({ id, label }))}
                  selected={selectedPollsters}
                  onToggle={toggleRequired(setSelectedPollsters)}
                />
                <MultiSelect
                  label={t.events}
                  summary={t.eventCount(selectedEventCategories.length)}
                  items={EVENT_CATEGORIES.map((category) => ({
                    id: category.id,
                    label: eventCategoryText(category, locale),
                    description: eventCategoryText(category, locale, true),
                  }))}
                  selected={selectedEventCategories}
                  onToggle={toggleEventCategory}
                />
              </div>
            )}

            <div className="party-selector" aria-label={t.parties}>
              {PARTY_DEFINITIONS.map((party) => {
                const active = selectedParties.includes(party.id);
                return (
                  <button key={party.id} className={active ? "active" : ""} onClick={() => toggleRequired(setSelectedParties)(party.id)} aria-pressed={active}>
                    <span style={{ background: party.color }} />{party.name}
                  </button>
                );
              })}
            </div>

            <PollChart
              t={t}
              locale={locale}
              selectedParties={selectedParties}
              selectedPollsters={selectedPollsters}
              selectedEventCategories={selectedEventCategories}
              mode={mode}
              range={range}
              polls={pollData.polls}
              pollsters={pollData.pollsters}
              latestDate={latestDate}
            />

            <div className="chart-footer">
              <DataAttribution locale={locale} metadata={pollData.metadata} includeElection />
              <div>
                <a href="/poll-data.json" download="pollframe-data.json">{t.raw}<Icon name="external" size={15} /></a>
                <button onClick={() => setMethodOpen(true)}>{t.methodology}<Icon name="info" size={15} /></button>
              </div>
            </div>
          </section>
          <TendencySection t={t} locale={locale} current={current} baseline={tendencyBaseline} onSelectParty={selectPartyDetail} />
          <ParliamentProjection t={t} locale={locale} current={current} />
          </>
        )}
      </main>

      <footer>
        <a className="brand small" href="#top"><BrandMark /><span>POLLFRAME</span></a>
        <p>{t.footerLine}</p>
        <nav>
          <button className="footer-action" onClick={() => setMethodOpen(true)}>{t.methodology}</button>
          {pollData && <a className="footer-action" href={DATA_SOURCE_URL} target="_blank" rel="noreferrer">{t.sourceTitle}</a>}
        </nav>
      </footer>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        locale={locale}
        setLocale={setLocale}
        t={t}
        theme={theme}
        setTheme={setTheme}
        textSize={textSize}
        setTextSize={setTextSize}
        motion={motion}
        setMotion={setMotion}
      />
      {pollData && <MethodModal open={methodOpen} onClose={() => setMethodOpen(false)} t={t} metadata={pollData.metadata} latestDate={latestDate} locale={locale} />}
      <EmbedModal
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        t={t}
        locale={locale}
        range={range}
        mode={mode}
        selectedParties={selectedParties}
        selectedPollsters={selectedPollsters}
        selectedEventCategories={selectedEventCategories}
      />
      {pollData && latestDate && (
        <PartyDetailModal
          party={selectedPartyDetail}
          onClose={() => selectPartyDetail(null)}
          t={t}
          locale={locale}
          polls={pollData.polls}
          selectedPollsters={selectedPollsters}
          latestDate={latestDate}
        />
      )}
    </>
  );
}

function RegionalApp() {
  const [, setNavigationVersion] = useState(0);
  useEffect(() => {
    const updateRoute = () => setNavigationVersion((version) => version + 1);
    window.addEventListener("popstate", updateRoute);
    return () => window.removeEventListener("popstate", updateRoute);
  }, []);
  const query = new URLSearchParams(window.location.search);
  const embedMode = IS_EMBED_ENTRY;
  const sharedView = query.get("share") === "1";
  const legalPage = !embedMode && query.get("page") === "impressum";
  const privacyPage = !embedMode && query.get("page") === "datenschutz";
  const licencesPage = !embedMode && query.get("page") === "lizenzen";
  const contactPage = !embedMode && query.get("page") === "kontakt";
  const requestedRegion = query.get("region");
  const requestedCountryParameter = query.get("country");
  const requestedCountry = requestedCountryParameter ?? (query.get("view") === "watchlist"
    ? storedPreference("pollframe-last-country", "de", ["de", "uk", "es"])
    : null);
  const retiredExpansionRoute = requestedRegion === "europawahl-deutschland"
    || ["fr", "at", "pl"].includes(requestedCountry)
    || (!embedMode && query.get("view") === "europe");
  const region = retiredExpansionRoute
    ? null
    : REGION_META.find((candidate) => candidate.slug === requestedRegion) ?? null;
  const isContentRoute = !legalPage && !privacyPage && !licencesPage && !contactPage && !region;
  const countryIndexPage = isContentRoute && !embedMode && query.get("view") === "countries";
  const requestedWatchlistPage = isContentRoute && !embedMode && !countryIndexPage && query.get("view") === "watchlist";
  const ukConstituencyPage = isContentRoute && !embedMode && !countryIndexPage && !requestedWatchlistPage && query.get("view") === "uk-constituencies";
  const requestedUkCountryPage = isContentRoute && !embedMode && !countryIndexPage && !ukConstituencyPage && requestedCountry === "uk";
  const requestedSpainCountryPage = isContentRoute && !embedMode && !countryIndexPage && !ukConstituencyPage && requestedCountry === "es";
  const spainIssuesPage = requestedSpainCountryPage && query.get("view") === "spain-issues";
  const isUKContext = (requestedWatchlistPage && requestedCountry === "uk") || ukConstituencyPage || requestedUkCountryPage || region?.type === "uk-federal";
  const isSpainContext = (requestedWatchlistPage && requestedCountry === "es") || requestedSpainCountryPage || region?.type === "spain-federal";
  const activeCountry = isUKContext ? "uk" : isSpainContext ? "es" : "de";
  const pwa = usePwaLifecycle({ disabled: embedMode, country: activeCountry });
  const watchlistPage = requestedWatchlistPage && pwa.installed;
  const ukCountryPage = requestedUkCountryPage && !watchlistPage;
  const spainCountryPage = requestedSpainCountryPage && !watchlistPage;
  const germanyStateMapPage = isContentRoute && !embedMode && !countryIndexPage && !watchlistPage && !ukCountryPage && !spainCountryPage && query.get("view") === "states";
  const mapPage = isContentRoute && !embedMode && !countryIndexPage && !watchlistPage && !ukCountryPage && !spainCountryPage && query.get("view") === "map";
  const germanyCountryPage = isContentRoute && !embedMode && !countryIndexPage && !watchlistPage && !ukConstituencyPage && !ukCountryPage && !spainCountryPage && !mapPage && !germanyStateMapPage;
  const isOverview = isContentRoute && (embedMode || mapPage);
  const queryList = (key, fallback, allowed) => {
    return queryListPreference(query, key, fallback, allowed, embedMode || sharedView);
  };

  const [pollData, setPollData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [locale, setLocale] = useState(() => (
    (embedMode || sharedView) && SUPPORTED_LOCALES.includes(query.get("lang"))
      ? query.get("lang")
      : storedPreference(isUKContext ? "pollframe-uk-locale" : isSpainContext ? "pollframe-es-locale" : "opinion-poll-locale", isUKContext ? "en-GB" : isSpainContext ? "es" : "de", SUPPORTED_LOCALES)
  ));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [theme, setTheme] = useState(() => (
    embedMode && ["system", "light", "dark"].includes(query.get("theme"))
      ? query.get("theme")
      : storedPreference("opinion-poll-theme", "system", ["system", "light", "dark"])
  ));
  const [textSize, setTextSize] = useState(() => storedPreference("opinion-poll-text-size", "standard", ["standard", "large"]));
  const [motion, setMotion] = useState(() => storedPreference("opinion-poll-motion", "system", ["system", "reduced"]));
  const [mode, setMode] = useState(() => (
    (embedMode || sharedView) && ["trend", "linear", "polls", "both"].includes(query.get("mode")) ? query.get("mode") : "trend"
  ));
  const [range, setRange] = useState(() => (
    (embedMode || sharedView) && ["month", "three", "six", "ytd", "year", "two", "election", "five", "ten", "all", "custom"].includes(query.get("range")) && !(isSpainContext && query.get("range") === "ten")
      ? query.get("range")
      : isUKContext ? "ten" : isSpainContext ? "election" : "all"
  ));
  const [customStartDate, setCustomStartDate] = useState(() => validIsoDate(query.get("from")) ? query.get("from") : "");
  const [customEndDate, setCustomEndDate] = useState(() => validIsoDate(query.get("to")) ? query.get("to") : "");
  const activeEventCategories = useMemo(
    () => (region ? regionEventCategories(region) : EVENT_CATEGORIES),
    [region],
  );
  const activeEvents = useMemo(
    () => (region ? regionEvents(region) : POLITICAL_EVENTS),
    [region],
  );
  const [selectedEventCategories, setSelectedEventCategories] = useState(() => queryList(
    "events",
    region?.type === "state" ? ["state-election"] : region?.type === "uk-federal" ? ["uk-election"] : region?.type === "spain-federal" ? ["spain-election", "spain-politics"] : ["national"],
    activeEventCategories.map((category) => category.id),
  ));
  const [selectedParties, setSelectedParties] = useState([]);
  const [selectedPollsters, setSelectedPollsters] = useState([]);
  const [selectedPartyDetail, setSelectedPartyDetail] = useState(null);
  const [showAllPartyChoices, setShowAllPartyChoices] = useState(false);
  const chartExportRef = useRef(null);
  const spainInsightsExportRef = useRef(null);

  useEffect(() => {
    if (embedMode || legalPage || privacyPage || licencesPage || contactPage || countryIndexPage) return;
    try { window.localStorage.setItem("pollframe-last-country", activeCountry); } catch { /* optional preference */ }
  }, [embedMode, legalPage, privacyPage, licencesPage, contactPage, countryIndexPage, activeCountry]);

  useEffect(() => {
    if (embedMode) return;
    const url = new URL(window.location.href);
    let changed = false;
    if (["app", "shortcut"].includes(url.searchParams.get("source"))) {
      url.searchParams.delete("source");
      changed = true;
    }
    if (url.searchParams.has("country") && !["uk", "es"].includes(url.searchParams.get("country"))) {
      url.searchParams.delete("country");
      changed = true;
    }
    if (url.searchParams.get("view") === "europe") {
      url.searchParams.delete("view");
      changed = true;
    }
    if (url.searchParams.get("region") === "europawahl-deutschland") {
      url.searchParams.delete("region");
      changed = true;
    }
    if (changed) window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [embedMode]);

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return undefined;
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const dark = theme === "dark" || (theme === "system" && systemDark.matches);
      meta.setAttribute("content", dark ? "#121416" : "#f3f3f0");
    };
    update();
    systemDark.addEventListener?.("change", update);
    return () => systemDark.removeEventListener?.("change", update);
  }, [theme]);

  const baseT = copy[locale];
  const isGerman = locale === "de";
  const t = useMemo(() => {
    if (region?.type === "uk-federal") return {
      ...baseT,
      overview: isGerman ? "Westminster · Wahlabsicht in Großbritannien" : "Westminster · Great Britain voting intention",
      title: isGerman ? "Umfragen zur britischen Unterhauswahl" : "Westminster voting intention",
      intro: isGerman
        ? "Der langfristige Verlauf für England, Schottland und Wales – mit gewichtetem Standardtrend, Institutsvergleich und Ereignissen seit 1943."
        : "The long-run picture for England, Scotland and Wales—with a weighted default trend, pollster comparison and events since 1943.",
      current: isGerman ? "Aktueller gewichteter Trend" : "Latest weighted trend",
      currentNote: isGerman ? "14-Tage-Modell des UK Election Data Vault" : "UK Election Data Vault 14-day model",
      chartTitle: isGerman ? "Entwicklung der Wahlabsicht im UK" : "UK Westminster voting-intention trend",
      chartSubtitle: isGerman
        ? "Standardmäßig der qualitätsgewichtete 14-Tage-Trend. Einzelne Institute lassen sich separat auswählen."
        : "The quality-weighted 14-day trend is shown by default. Individual pollsters can be selected separately.",
      sinceElection: isGerman ? "Seit der Unterhauswahl 2024" : "Since the 2024 general election",
      fullArchive: isGerman ? "Gesamtes Archiv · seit 1943" : "Full archive · since 1943",
      methodTitle: isGerman ? "Daten und Methodik für Großbritannien" : "Great Britain data and methodology",
      methodIntro: isGerman ? "Die nationale Umfragereihe bezieht sich auf Großbritannien – England, Schottland und Wales – und nicht auf Nordirland." : "The national polling series covers Great Britain—England, Scotland and Wales—not Northern Ireland.",
      meanTitle: isGerman ? "Gewichteter Standardtrend" : "Weighted default trend",
      meanText: isGerman ? "Der Standard ist der 14-Tage-Durchschnitt des Election Data Vault. Er berücksichtigt Institutsqualität und gewichtet politisch beauftragte Erhebungen herunter beziehungsweise schließt sie aus." : "The default is Election Data Vault's 14-day average. It accounts for pollster quality and downweights or excludes politically commissioned polls.",
      selectionTitle: isGerman ? "Vergleich einzelner Institute" : "Comparing individual pollsters",
      selectionText: isGerman ? "Bei der Auswahl einzelner Institute berechnet Pollframe wie in Deutschland aus der jeweils neuesten Umfrage jedes gewählten Instituts innerhalb von 45 Tagen einen gleich gewichteten Verlauf." : "When individual pollsters are selected, Pollframe follows the German view: each selected pollster's latest poll within 45 days receives equal weight.",
      eventSelectionTitle: isGerman ? "Ereignisse als zeitlicher Kontext" : "Events as timing context",
      eventSelectionText: isGerman ? "Unterhauswahlen, britische Politik, Krisen und Weltgeschehen können eingeblendet werden. Zeitliche Nähe ist kein Beleg für Ursache und Wirkung." : "General elections, UK politics, crises and global events can be added. Timing does not establish cause and effect.",
      limitsTitle: isGerman ? "Was die Grafik nicht zeigt" : "What the chart does not show",
      limitsText: isGerman ? "Umfragen bleiben unsichere Momentaufnahmen. Nationale Stimmenanteile sind wegen des Mehrheitswahlrechts keine Sitzprognose; regionale Unterschiede und einzelne Wahlkreise entscheiden über die 650 Sitze." : "Polls remain uncertain snapshots. Under first past the post, national vote shares are not a seat forecast; regional patterns and individual constituencies determine the 650 seats.",
      sourceTitle: isGerman ? "Quelle und kommerzielle Nutzung" : "Source and commercial reuse",
      sourceText: isGerman ? "Umfragen, gewichteter Trend und Wahlergebnisse stammen aus dem UK Election Data Vault. Der Anbieter erlaubt die Daten ausdrücklich frei für kommerzielle und sonstige Zwecke. Pollframe vereinheitlicht Parteien und Darstellung." : "Polls, the weighted trend and election results come from the UK Election Data Vault, which explicitly permits free commercial and other reuse. Pollframe normalises parties and presentation.",
    };
    if (region?.type === "spain-federal") return {
      ...baseT,
      overview: locale === "es" ? "Congreso de los Diputados · intención de voto" : isGerman ? "Abgeordnetenkongress · Wahlabsicht" : "Congress of Deputies · voting intention",
      title: locale === "es" ? "Encuestas de las elecciones generales" : isGerman ? "Umfragen zur spanischen Parlamentswahl" : "Spanish general-election polling",
      intro: locale === "es" ? "La evolución nacional desde 1996, con una media trazable, comparación de institutos y acontecimientos documentados." : isGerman ? "Der nationale Verlauf seit 1996 – mit nachvollziehbarem Durchschnitt, Institutsvergleich und belegten Ereignissen." : "The national picture since 1996, with a traceable average, pollster comparison and sourced events.",
      current: locale === "es" ? "Media actual" : isGerman ? "Aktueller Durchschnitt" : "Current average",
      chartTitle: locale === "es" ? "Evolución de la intención de voto" : isGerman ? "Entwicklung der Wahlabsicht in Spanien" : "Spanish voting-intention trend",
      sinceElection: locale === "es" ? "Desde las elecciones de 2023" : isGerman ? "Seit der Parlamentswahl 2023" : "Since the 2023 general election",
      fullArchive: locale === "es" ? "Archivo completo · desde 1996" : isGerman ? "Gesamtes Archiv · seit 1996" : "Full archive · since 1996",
      sourceTitle: locale === "es" ? "Fuente y licencia" : isGerman ? "Quelle und Lizenz" : "Source and licence",
    };
    if (region?.type !== "state") return baseT;
    const translatedState = stateLocaleOverrides(locale, region);
    return {
    ...baseT,
    overview: translatedState?.overview ?? (isGerman ? `${region.name} · Sonntagsfrage` : `${region.name} · Voting intention`),
    title: translatedState?.title ?? (isGerman ? `Umfragen zur ${region.electionName}` : `${region.name} election polling`),
    intro: translatedState?.intro ?? (isGerman
      ? `Aktuelle Werte und der langfristige Verlauf für ${region.name} – mit transparent ausgewiesener Datenlage.`
      : `Current values and the long-term trend for ${region.name}, with transparent data coverage.`),
    chartTitle: translatedState?.chartTitle ?? (isGerman ? `Entwicklung der Wahlabsicht in ${region.name}` : `Voting intention in ${region.name}`),
    sinceElection: translatedState?.sinceElection ?? (isGerman ? "Seit der letzten Landeswahl" : "Since the last state election"),
    fullArchive: translatedState?.fullArchive ?? (isGerman ? "Gesamtes Länderarchiv · seit 2017" : "Full state archive · since 2017"),
    eventSelectionText: isGerman
      ? "Landeswahlen werden für das ausgewählte Bundesland separat markiert. Bundes-, Europa- und Weltereignisse können als Vergleichsebenen eingeblendet werden. Die Markierungen zeigen zeitliche Nähe, keinen ursächlichen Zusammenhang."
      : "Elections in the selected state are marked separately. Federal, European and global events can be added as context. Markers show timing, not causation.",
    methodIntro: isGerman
      ? "Die Darstellung trennt veröffentlichte Umfragewerte und den daraus berechneten geglätteten Durchschnitt."
      : "The display separates published poll results from the smoothed average calculated from them.",
    limitsText: isGerman
      ? "Umfragen sind Momentaufnahmen mit Unsicherheit. Der Durchschnitt korrigiert derzeit weder institutsspezifische Effekte noch Stichprobenfehler. Die geglättete Linie verbindet berechnete Stützpunkte. Tendenzkarten bewerten 90-Tage-Änderungen ab ±0,4 Prozentpunkten als leicht und ab ±1,2 als deutlich. Keine Darstellung ist eine Wahlprognose."
      : "Polls are uncertain snapshots. The average does not currently adjust for pollster-specific effects or sampling error. The smoothed line connects calculated points. Tendency cards classify 90-day changes from ±0.4 percentage points as slight and from ±1.2 as clear. No display is an election forecast.",
    sourceText: isGerman
      ? "Die einzelnen Umfragen seit 2017 stammen aus der offenen DAWUM-Datenbank (ODbL 1.0). Pollframe filtert acht Institute, vereinheitlicht Felder und berechnet daraus eigene Mittelwerte und Trends. Landeswahltermine in der Ereignisebene verlinken die jeweils angegebene amtliche Quelle."
      : "Individual polls since 2017 come from the open DAWUM database (ODbL 1.0). Pollframe filters eight pollsters, normalises fields and calculates its own averages and trends. State election dates in the event layer link to the stated official source.",
    };
  }, [baseT, locale, region, isGerman]);

  useEffect(() => {
    if (legalPage || privacyPage || licencesPage || contactPage || watchlistPage) return;
    const controller = new AbortController();
    if (countryIndexPage) {
      Promise.all([
        fetch("/regions.json", { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        }),
        fetch("/uk-summary.json", { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        }),
        fetch("/spain-summary.json", { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        }),
      ]).then(([germany, uk, spain]) => setSummary({ germany, uk, spain })).catch((error) => {
        if (error.name !== "AbortError") setLoadError(true);
      });
      return () => controller.abort();
    }
    if (ukConstituencyPage) {
      Promise.all([
        fetch("/uk-summary.json", { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        }),
        fetch("/data/uk-constituencies.json", { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        }),
      ]).then(([uk, constituencies]) => setSummary({ uk, constituencies })).catch((error) => {
        if (error.name !== "AbortError") setLoadError(true);
      });
      return () => controller.abort();
    }
    if (germanyCountryPage || germanyStateMapPage) {
      Promise.all([
        fetch("/regions.json", { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        }),
        fetch("/data/bundestag.json", { signal: controller.signal }).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        }),
      ]).then(([germany, federalPolling]) => setSummary({ ...germany, federalPolling })).catch((error) => {
        if (error.name !== "AbortError") setLoadError(true);
      });
      return () => controller.abort();
    }
    if (spainCountryPage) {
      fetch("/spain-summary.json", { signal: controller.signal }).then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      }).then(setSummary).catch((error) => { if (error.name !== "AbortError") setLoadError(true); });
      return () => controller.abort();
    }
    const target = ukCountryPage
      ? "/uk-summary.json"
      : isOverview
        ? "/regions.json"
        : `/data/${region.slug}.json`;
    fetch(target, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (isOverview || germanyCountryPage || ukCountryPage || spainCountryPage) {
          setSummary(data);
          return;
        }
        setPollData(data);
        const allDefinitions = region.type === "uk-federal" ? UK_PARTY_DEFINITIONS : region.type === "spain-federal" ? SPAIN_PARTY_DEFINITIONS : PARTY_DEFINITIONS;
        const definitions = allDefinitions.filter((party) => data.parties[party.id]);
        const latestResults = data.polls.filter((poll) => poll.pollster === (data.metadata?.weightedAveragePollsterId ?? poll.pollster)).at(-1)?.results ?? data.polls.at(-1)?.results ?? {};
        const defaults = definitions
          .filter((party) => Number.isFinite(latestResults[party.id]))
          .sort((a, b) => latestResults[b.id] - latestResults[a.id])
          .slice(0, 6)
          .map((party) => party.id);
        setSelectedParties(queryList("parties", defaults, definitions.map((party) => party.id)));
        setSelectedPollsters(queryList("pollsters", data.metadata?.defaultPollsters ?? Object.keys(data.pollsters), Object.keys(data.pollsters)));
        const partySlug = query.get("party");
        setSelectedPartyDetail(definitions.find((party) => party.slug === partySlug) ?? null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(true);
      });
    return () => controller.abort();
  }, [embedMode, legalPage, privacyPage, licencesPage, contactPage, watchlistPage, isOverview, germanyCountryPage, germanyStateMapPage, countryIndexPage, ukConstituencyPage, ukCountryPage, spainCountryPage, region]);

  useEffect(() => {
    if (region?.type !== "uk-federal" || !pollData || pollData.metadata?.rawPollsLoaded) return undefined;
    const weightedId = pollData.metadata?.weightedAveragePollsterId;
    const needsArchive = customizeOpen || selectedPollsters.some((id) => id !== weightedId);
    if (!needsArchive) return undefined;
    const controller = new AbortController();
    fetch("/data/uk-westminster-polls.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((archive) => setPollData((currentData) => {
        if (!currentData || currentData.metadata?.rawPollsLoaded) return currentData;
        return {
          ...currentData,
          metadata: { ...currentData.metadata, rawPollsLoaded: true },
          polls: [...currentData.polls, ...(archive.polls ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
        };
      }))
      .catch((error) => {
        if (error.name !== "AbortError") console.error("UK poll archive failed to load", error);
      });
    return () => controller.abort();
  }, [region, pollData, customizeOpen, selectedPollsters]);

  useEffect(() => {
    document.documentElement.lang = LOCALE_META[locale]?.language ?? "en";
    document.documentElement.dir = LOCALE_META[locale]?.direction ?? "ltr";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.text = textSize;
    document.documentElement.dataset.motion = motion;
    document.documentElement.dataset.embed = embedMode ? "true" : "false";
    let title;
    let description;
    let canonicalPath = "/";
    let indexable = true;

    if (embedMode) {
      title = "Pollframe · Embed";
      description = isGerman
        ? "Einbettbare Pollframe-Grafik."
        : "Embeddable Pollframe chart.";
      canonicalPath = region ? `/?region=${encodeURIComponent(region.slug)}` : "/?view=map";
      indexable = false;
    } else if (legalPage) {
      title = "Impressum · Pollframe";
      description = isGerman
        ? "Anbieterkennzeichnung und Verantwortlichkeit für Pollframe."
        : "Provider identification and responsibility for Pollframe.";
      canonicalPath = "/?page=impressum";
      indexable = false;
    } else if (privacyPage) {
      title = isGerman ? "Datenschutz · Pollframe" : "Privacy · Pollframe";
      description = isGerman
        ? "Datenschutzerklärung von Pollframe."
        : "Pollframe privacy notice.";
      canonicalPath = "/?page=datenschutz";
      indexable = false;
    } else if (contactPage) {
      title = isGerman ? "Kontakt · Pollframe" : "Contact · Pollframe";
      description = isGerman
        ? "Kontakt zur Pollframe-Redaktion."
        : "Contact the Pollframe editorial team.";
      canonicalPath = "/?page=kontakt";
      indexable = false;
    } else if (licencesPage) {
      title = isGerman ? "Quellen und Lizenzen · Pollframe" : "Sources and licences · Pollframe";
      description = isGerman
        ? "Datenquellen, Verarbeitungsschritte und offene Lizenzen der Pollframe-Darstellungen."
        : "Data sources, processing steps and open licences used by Pollframe.";
      canonicalPath = "/?page=lizenzen";
    } else if (countryIndexPage) {
      title = isGerman ? "Land auswählen · Pollframe" : "Select a country · Pollframe";
      description = isGerman
        ? "Pollframe-Länderübersicht für Deutschland, das Vereinigte Königreich und Spanien."
        : locale === "es" ? "Países disponibles en Pollframe: Alemania, Reino Unido y España." : "Pollframe country overview for Germany, the United Kingdom and Spain.";
      canonicalPath = "/?view=countries";
    } else if (watchlistPage) {
      title = `Watchlist · Pollframe`;
      description = isGerman
        ? "Lokale Watchlist für Parteien, Schwellen und rechnerische Mehrheiten in Deutschland und Großbritannien."
        : "A local Watchlist for parties, thresholds and modelled majorities across Germany and Great Britain.";
      canonicalPath = "/?view=watchlist";
      indexable = false;
    } else if (ukConstituencyPage) {
      const selectedSeat = summary?.constituencies?.constituencies?.find((seat) => seat.slug === query.get("seat"));
      title = selectedSeat
        ? `${selectedSeat.name} · Wahlergebnis 2024 · Pollframe`
        : (isGerman ? "Britische Wahlkreisergebnisse 2024 · Pollframe" : "UK constituency results 2024 · Pollframe");
      description = isGerman
        ? "Wahlkreissuche und amtliche Ergebnisse der Unterhauswahl 2024 für alle 650 britischen Wahlkreise."
        : "Constituency search and official 2024 general-election results for all 650 UK constituencies.";
      canonicalPath = selectedSeat ? `/?view=uk-constituencies&seat=${encodeURIComponent(selectedSeat.slug)}` : "/?view=uk-constituencies";
    } else if (ukCountryPage) {
      title = isGerman ? "Vereinigtes Königreich im Überblick · Pollframe" : "United Kingdom at a glance · Pollframe";
      description = isGerman
        ? "Britische Unterhaus-Umfragen seit 1943, Stimmen und Sitze sowie regionale Ergebnisse im Überblick."
        : "UK Westminster polling since 1943, votes versus seats and regional election results.";
      canonicalPath = "/?country=uk";
    } else if (spainCountryPage) {
      title = spainIssuesPage
        ? (locale === "es" ? "Qué preocupa a España · Pollframe" : isGerman ? "Was Spanien beschäftigt · Pollframe" : "What concerns Spain · Pollframe")
        : (locale === "es" ? "España de un vistazo · Pollframe" : isGerman ? "Spanien im Überblick · Pollframe" : "Spain at a glance · Pollframe");
      description = spainIssuesPage
        ? (locale === "es" ? "Los principales problemas de España, las preocupaciones personales y la percepción económica según el barómetro del CIS." : isGerman ? "Spaniens wichtigste Probleme, persönliche Sorgen und wirtschaftliche Wahrnehmung im CIS-Barometer." : "Spain’s main national concerns, personal worries and economic perceptions in the CIS barometer.")
        : (locale === "es" ? "Encuestas nacionales desde 1996, preocupaciones públicas y comunidades autónomas." : isGerman ? "Nationale Umfragen seit 1996, öffentliche Sorgen und autonome Gemeinschaften." : "National polling since 1996, public concerns and autonomous communities.");
      canonicalPath = spainIssuesPage ? "/?country=es&view=spain-issues" : "/?country=es";
    } else if (germanyCountryPage) {
      title = isGerman ? "Deutschland im Überblick · Pollframe" : "Germany at a glance · Pollframe";
      description = isGerman
        ? "Übersicht über Bundestagswahl und alle 16 deutschen Länderansichten."
        : "Overview of the federal election and all 16 German state views.";
      canonicalPath = "/";
    } else if (germanyStateMapPage) {
      title = isGerman ? "Länderkarte · Pollframe" : "German state map · Pollframe";
      description = isGerman
        ? "Datenabdeckung und direkter Zugang zu den Umfrageseiten der 16 Bundesländer."
        : "Data coverage and direct access to polling pages for Germany's 16 states.";
      canonicalPath = "/?view=states";
      indexable = false;
    } else if (mapPage) {
      title = isGerman
        ? "Deutschland im Überblick – Länderumfragen · Pollframe"
        : "Germany at a glance – State polling · Pollframe";
      description = isGerman
        ? "Vergleiche die aktuellen Umfragedurchschnitte aller 16 Bundesländer auf einer interaktiven Deutschlandkarte."
        : "Compare current polling averages for all 16 German states on an interactive map.";
      canonicalPath = "/?view=map";
    } else if (isOverview) {
      title = isGerman
        ? "Pollframe – Wahlumfragen für Bund und Länder"
        : "Pollframe – Federal and state polling in Germany";
      description = isGerman
        ? "Aktuelle Wahlumfragen für Bundestag und Bundesländer: transparente Durchschnittswerte, langfristige Trends und rechnerische Sitzverteilungen."
        : "Current federal and state polling in Germany, with transparent averages, long-term trends and modelled seat allocations.";
    } else if (region.type === "uk-federal") {
      title = isGerman ? "Britische Unterhaus-Umfragen: aktueller Trend · Pollframe" : "UK Westminster polls: latest trend · Pollframe";
      description = isGerman
        ? "Gewichteter Trend britischer Unterhaus-Umfragen mit Archiv seit 1943, Ereignissen und Institutsvergleich."
        : "Weighted UK Westminster polling trend with history since 1943, events and pollster comparison.";
      canonicalPath = `/?region=${encodeURIComponent(region.slug)}`;
    } else if (region.type === "spain-federal") {
      title = locale === "es" ? "Encuestas electorales de España · Pollframe" : isGerman ? "Spanische Wahlumfragen · Pollframe" : "Spanish election polls · Pollframe";
      description = locale === "es" ? "Media de encuestas, evolución desde 1996, comparación temporal, acuerdo entre institutos y acontecimientos documentados." : isGerman ? "Umfragedurchschnitt und Verlauf seit 1996 mit Zeitvergleich, Institutsstreuung und belegten Ereignissen." : "Polling average and history since 1996, with time comparisons, pollster ranges and sourced events.";
      canonicalPath = `/?region=${encodeURIComponent(region.slug)}`;
    } else if (region.type === "federal") {
      title = isGerman
        ? "Bundestagswahl-Umfragen: aktueller Durchschnitt · Pollframe"
        : "German federal election polls: current average · Pollframe";
      description = isGerman
        ? "Aktueller Durchschnitt deutscher Bundestagswahl-Umfragen mit langfristigem Verlauf, Ereignissen, Institutsvergleich und Sitzmodell."
        : "Current average of German federal election polls with long-term trends, events, pollster comparison and a seat model.";
      canonicalPath = `/?region=${encodeURIComponent(region.slug)}`;
    } else {
      title = isGerman
        ? `${region.electionName}-Umfragen ${region.name}: aktueller Durchschnitt · Pollframe`
        : `${region.name} election polls: current average · Pollframe`;
      description = isGerman
        ? `Aktuelle Umfragen zur ${region.electionName} in ${region.name}: Durchschnitt, langfristiger Verlauf, Ereignisse und rechnerische Sitzverteilung.`
        : `Current election polling for ${region.name}, including averages, long-term trends, events and a modelled seat allocation.`;
      canonicalPath = `/?region=${encodeURIComponent(region.slug)}`;
    }

    updatePageMetadata({
      title,
      description,
      canonicalPath,
      locale,
      indexable,
    });
    try {
      window.localStorage.setItem(isUKContext ? "pollframe-uk-locale" : isSpainContext ? "pollframe-es-locale" : "opinion-poll-locale", locale);
      window.localStorage.setItem("opinion-poll-theme", theme);
      window.localStorage.setItem("opinion-poll-text-size", textSize);
      window.localStorage.setItem("opinion-poll-motion", motion);
    } catch {
      // Preferences remain active for this visit.
    }
  }, [locale, theme, textSize, motion, embedMode, isGerman, isOverview, legalPage, privacyPage, licencesPage, contactPage, watchlistPage, germanyCountryPage, germanyStateMapPage, countryIndexPage, ukConstituencyPage, ukCountryPage, spainCountryPage, spainIssuesPage, mapPage, region, isUKContext, isSpainContext, summary]);

  const latestDate = pollData?.polls.at(-1)?.date;
  const activePartyDefinitions = useMemo(
    () => (region?.type === "uk-federal" ? UK_PARTY_DEFINITIONS : region?.type === "spain-federal" ? SPAIN_PARTY_DEFINITIONS : PARTY_DEFINITIONS).filter((party) => pollData?.parties?.[party.id]),
    [pollData, region],
  );
  const partyIds = useMemo(
    () => activePartyDefinitions.map((party) => party.id),
    [activePartyDefinitions],
  );
  const pollsterOptions = useMemo(() => {
    if (!pollData) return [];
    const entries = Object.entries(pollData.pollsters);
    if (region?.type !== "uk-federal") return entries.map(([id, label]) => ({ id, label }));
    const ratings = pollData.metadata?.pollsterRatings ?? {};
    const weightedId = pollData.metadata?.weightedAveragePollsterId;
    return entries
      .filter(([id]) => id === weightedId || /^[ABC][+-]?$/.test(ratings[id] ?? ""))
      .map(([id, label]) => ({ id, label: ratings[id] ? `${label} · ${ratings[id]}` : label }));
  }, [pollData, region]);
  const current = useMemo(() => pollData && selectedPollsters.length
    ? averageAtDate(pollData.polls, selectedPollsters, latestDate, partyIds)
    : { results: {}, pollsterCount: 0 }, [pollData, selectedPollsters, latestDate, partyIds]);
  const previous = useMemo(() => pollData && selectedPollsters.length
    ? averageAtDate(pollData.polls, selectedPollsters, toIso(parseDate(latestDate) - (7 * DAY)), partyIds)
    : { results: {}, pollsterCount: 0 }, [pollData, selectedPollsters, latestDate, partyIds]);
  const tendencyBaseline = useMemo(() => pollData && selectedPollsters.length
    ? averageAtDate(pollData.polls, selectedPollsters, toIso(parseDate(latestDate) - (90 * DAY)), partyIds)
    : { results: {}, pollsterCount: 0 }, [pollData, selectedPollsters, latestDate, partyIds]);
  const compactPartyDefinitions = useMemo(() => {
    if (region?.type !== "spain-federal") return activePartyDefinitions;
    return activePartyDefinitions.filter((party) => selectedParties.includes(party.id) || (current.results?.[party.id] ?? 0) >= 1);
  }, [activePartyDefinitions, current.results, region, selectedParties]);
  const hiddenPartyChoiceCount = activePartyDefinitions.length - compactPartyDefinitions.length;
  const partyChoiceDefinitions = region?.type === "spain-federal" && !showAllPartyChoices ? compactPartyDefinitions : activePartyDefinitions;
  const stateElectionDates = region?.type === "state"
    ? STATE_ELECTION_DATES[region.slug] ?? []
    : region?.type === "uk-federal" ? UK_ELECTION_DATES : region?.type === "spain-federal" ? ["2023-07-23"] : [];
  const termStart = stateElectionDates.filter((date) => !latestDate || date <= latestDate).at(-1)
    ?? pollData?.polls[0]?.date
    ?? ARCHIVE_START;
  const archiveStart = pollData?.polls[0]?.date ?? ARCHIVE_START;
  const chartInfo = mainChartInfo(
    locale,
    region?.type,
    mode,
    region?.type === "uk-federal" && selectedPollsters.includes(pollData?.metadata?.weightedAveragePollsterId),
  );

  const toggleRequired = (setter) => (id) => setter((selection) => (
    selection.includes(id)
      ? selection.length > 1 ? selection.filter((item) => item !== id) : selection
      : [...selection, id]
  ));
  const togglePollster = (id) => setSelectedPollsters((selection) => {
    const weightedId = pollData?.metadata?.weightedAveragePollsterId;
    if (!weightedId) return selection.includes(id)
      ? selection.length > 1 ? selection.filter((item) => item !== id) : selection
      : [...selection, id];
    if (id === weightedId) return [weightedId];
    const withoutWeighted = selection.filter((item) => item !== weightedId);
    return withoutWeighted.includes(id)
      ? withoutWeighted.length > 1 ? withoutWeighted.filter((item) => item !== id) : withoutWeighted
      : [...withoutWeighted, id];
  });
  const toggleEventCategory = (id) => setSelectedEventCategories((selection) => (
    selection.includes(id) ? selection.filter((item) => item !== id) : [...selection, id]
  ));
  const selectPartyDetail = (party) => {
    setSelectedPartyDetail(party);
    const url = new URL(window.location.href);
    if (party) url.searchParams.set("party", party.slug);
    else url.searchParams.delete("party");
    window.history.replaceState({}, "", url);
  };

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      setSettingsOpen(false);
      setEmbedOpen(false);
      setMethodOpen(false);
      selectPartyDetail(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  useEffect(() => {
    const closeMenusOutside = (event) => {
      const activeDetails = event.target.closest?.("details");
      document.querySelectorAll(".select-control[open], .multi-select[open], .event-key[open], .graph-info-popover[open], .header-country-menu[open], .licence-disclosure[open]").forEach((details) => {
        if (details !== activeDetails || event.target === activeDetails) details.removeAttribute("open");
      });
    };
    document.addEventListener("pointerdown", closeMenusOutside);
    return () => document.removeEventListener("pointerdown", closeMenusOutside);
  }, []);

  if (embedMode && !isOverview) {
    if (!pollData || !latestDate) return <div className="embed-loading">{loadError ? t.error : t.loading}</div>;
    return (
      <EmbedView
        t={t}
        locale={locale}
        pollData={pollData}
        latestDate={latestDate}
        selectedParties={selectedParties}
        selectedPollsters={selectedPollsters}
        selectedEventCategories={selectedEventCategories}
        mode={mode}
        range={range}
        partyDefinitions={activePartyDefinitions}
        events={activeEvents}
        eventCategories={activeEventCategories}
        electionResults={["uk-federal", "spain-federal"].includes(region.type) ? pollData.metadata?.electionResults ?? {} : region.type === "federal" ? ELECTION_RESULTS : {}}
        termStart={termStart}
        archiveStart={archiveStart}
        regionSlug={region.slug}
        customStartDate={customStartDate || archiveStart}
        customEndDate={customEndDate || latestDate}
      />
    );
  }

  const settings = (
    <SettingsPanel
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      locale={locale}
      setLocale={setLocale}
      t={t}
      theme={theme}
      setTheme={setTheme}
      textSize={textSize}
      setTextSize={setTextSize}
      motion={motion}
      setMotion={setMotion}
      pwa={pwa}
      allowedLocales={isSpainContext ? ["es", "de", "en-GB"] : SUPPORTED_LOCALES}
    />
  );
  const homeHref = isUKContext ? "/?country=uk" : isSpainContext ? "/?country=es" : "/";
  const homeLabel = isUKContext ? "Pollframe United Kingdom overview" : isSpainContext ? "Pollframe España" : "Pollframe Deutschland-Übersicht";

  if (legalPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        <LegalPage locale={locale} />
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        {settings}
      </>
    );
  }
  if (privacyPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        <PrivacyPage locale={locale} />
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        {settings}
      </>
    );
  }
  if (licencesPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        <LicencesPage locale={locale} />
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        {settings}
      </>
    );
  }
  if (contactPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        <ContactPage locale={locale} />
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        {settings}
      </>
    );
  }
  if (watchlistPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref={homeHref} homeLabel={homeLabel} />
        <WatchlistPage locale={locale} initialCountry={["uk", "es"].includes(requestedCountry) ? requestedCountry : "de"} />
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref={homeHref} homeLabel={homeLabel} />
        {settings}
      </>
    );
  }
  if (countryIndexPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref="/?view=countries" homeLabel="Pollframe country selection" countryCode="all" />
        {summary ? <CountryIndexPage locale={locale} summary={summary} /> : <div className="embed-loading">{loadError ? t.error : t.loading}</div>}
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref="/?view=countries" homeLabel="Pollframe country selection" />
        {settings}
      </>
    );
  }
  if (germanyCountryPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        {summary ? <GermanyCountryOverview locale={locale} summary={summary} /> : <div className="embed-loading">{loadError ? t.error : t.loading}</div>}
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        {settings}
      </>
    );
  }
  if (germanyStateMapPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        {summary ? <GermanyCountryOverview locale={locale} summary={summary} mapOnly /> : <div className="embed-loading">{loadError ? t.error : t.loading}</div>}
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        {settings}
      </>
    );
  }
  if (ukCountryPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref={homeHref} homeLabel={homeLabel} />
        {summary ? <UKCountryOverview locale={locale} summary={summary} /> : <div className="embed-loading">{loadError ? t.error : t.loading}</div>}
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref={homeHref} homeLabel={homeLabel} />
        {settings}
      </>
    );
  }
  if (spainCountryPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref={homeHref} homeLabel={homeLabel} countryCode="es" />
        {summary ? (spainIssuesPage
          ? <SpainIssuesPage locale={locale} summary={summary} formatDate={formatDate} numberLocale={getNumberLocale(locale)} />
          : <SpainCountryOverview locale={locale} summary={summary} formatDate={formatDate} numberLocale={getNumberLocale(locale)} />) : <div className="embed-loading">{loadError ? t.error : t.loading}</div>}
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref={homeHref} homeLabel={homeLabel} sourceUrl={summary?.metadata?.sourceUrl} />
        {settings}
      </>
    );
  }
  if (ukConstituencyPage) {
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref={homeHref} homeLabel={homeLabel} />
        {summary?.constituencies ? <UKConstituencyPage locale={locale} constituencyData={summary.constituencies} /> : <div className="embed-loading">{loadError ? t.error : t.loading}</div>}
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} homeHref={homeHref} homeLabel={homeLabel} />
        {settings}
      </>
    );
  }
  if (isOverview) {
    if (embedMode) {
      return summary
        ? <OverviewPage t={t} locale={locale} summary={summary} embedMode />
        : <div className="embed-loading">{loadError ? t.error : t.loading}</div>;
    }
    return (
      <>
        <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} />
        {summary
          ? <OverviewPage t={t} locale={locale} summary={summary} mapPage={mapPage} />
          : <main><div className="loading-card overview-loading">{loadError ? t.error : t.loading}</div></main>}
        <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} sourceUrl="https://dawum.de/API/" />
        {settings}
      </>
    );
  }

  return (
    <>
      <SiteHeader t={t} locale={locale} pwa={pwa} onSettings={() => setSettingsOpen(true)} onInfo={() => setMethodOpen(true)} homeHref={homeHref} homeLabel={homeLabel} />
      <main id="top">
        <nav className="region-breadcrumb" aria-label={isGerman ? "Region" : "Region"}>
          <BackButton fallback={homeHref} label={locale === "es" ? "Atrás" : isGerman ? "Zurück" : "Back"} /><span>/</span><a href={homeHref}>{locale === "es" ? "Resumen" : isGerman ? "Übersicht" : "Overview"}</a><span>/</span><strong>{region.name}</strong>
        </nav>
        <section className={`intro-section ${region.type === "state" ? "state-intro" : ""} ${region.type === "spain-federal" ? "spain-intro" : ""}`}>
          <div className="intro-copy">
            <div className="eyebrow"><span />{t.overview}</div>
            <h1>{t.title}</h1>
            <p>{t.intro}</p>
            {pollData && region.type === "state" && (
              <div className={`coverage-banner ${current.pollsterCount >= 2 ? "adequate" : "thin"}`}>
                <Icon name="info" size={16} />
                <span>{current.pollsterCount >= 2
                  ? (isGerman ? `Aktueller Mittelwert aus ${current.pollsterCount} Instituten.` : `Current average from ${current.pollsterCount} institutes.`)
                  : (isGerman ? "Aktuell kein belastbarer Mehrinstitutsdurchschnitt: Im 45-Tage-Fenster liegt höchstens ein ausgewähltes Institut vor." : "No robust multi-pollster average at present: at most one selected institute is available within 45 days.")}</span>
              </div>
            )}
          </div>
          {pollData && latestDate && (
            <ResultsCard
              t={t}
              locale={locale}
              current={current}
              previous={previous}
              date={latestDate}
              partyDefinitions={activePartyDefinitions}
              statusLabel={region.type === "uk-federal" && selectedPollsters.includes(pollData.metadata?.weightedAveragePollsterId)
                ? (isGerman ? "Gewichteter 14-Tage-Trend" : "Weighted 14-day trend")
                : null}
              region={region}
            />
          )}
          {!pollData && <div className="loading-card">{loadError ? t.error : t.loading}</div>}
        </section>

        {pollData && latestDate && (
          <>
            <section ref={chartExportRef} className="chart-card" aria-labelledby="main-chart-heading">
              <div className="chart-heading">
                <div>
                  <p className="section-label">{region.type === "uk-federal" && selectedPollsters.includes(pollData.metadata?.weightedAveragePollsterId) ? (isGerman ? "Qualitätsgewichteter 14-Tage-Trend" : "Quality-weighted 14-day trend") : current.pollsterCount === 1 ? t.onePollster : t.basedOn(current.pollsterCount)}</p>
                  <div className="chart-title-row"><h2 id="main-chart-heading">{t.chartTitle}</h2><GraphInfoPopover locale={locale} title={chartInfo.title} paragraphs={chartInfo.paragraphs} source={region.type === "uk-federal" ? { href: "https://electiondatavault.co.uk/polling/polling-average/", label: locale === "de" ? "Methode der britischen Ausgangsreihe" : "UK source-series method" } : null} /></div>
                  <p>{t.chartSubtitle}</p>
                </div>
                <div className="chart-actions" data-export-ignore="true">
                  <button className={`secondary-button ${customizeOpen ? "active" : ""}`} onClick={() => setCustomizeOpen(!customizeOpen)} aria-expanded={customizeOpen}>
                    <Icon name="sliders" />{t.customize}
                  </button>
                  <button className="primary-button" onClick={() => setEmbedOpen(true)}>
                    <Icon name="share" />{t.share}
                  </button>
                  <PngExportButton
                    elementRef={chartExportRef}
                    filename={`pollframe-${region.slug}-${range}-${mode}`}
                    title={t.chartTitle}
                    subtitle={region.type === "federal" ? "Bundestag" : region.type === "uk-federal" ? "Westminster · United Kingdom" : region.name}
                    locale={locale}
                    t={t}
                    credit={region.type === "uk-federal" ? "UK Election Data Vault · free commercial reuse · Pollframe" : region.type === "spain-federal" ? "Wikipedia contributors · CC BY-SA 4.0 · Pollframe" : undefined}
                  />
                </div>
              </div>
              {customizeOpen && (
                <div className="customize-panel" data-export-ignore="true">
                  <SelectControl label={t.display} value={mode} onChange={setMode} options={[
                    { value: "trend", label: t.trend },
                    { value: "linear", label: t.linear },
                    { value: "polls", label: t.polls },
                    { value: "both", label: t.both },
                  ]} />
                  <SelectControl label={t.timeRange} value={range} onChange={setRange} options={[
                    { value: "month", label: t.oneMonthLong },
                    { value: "three", label: t.threeMonths },
                    { value: "six", label: t.sixMonths },
                    { value: "ytd", label: t.yearToDate },
                    { value: "year", label: t.year },
                    { value: "two", label: t.twoYears },
                    { value: "election", label: t.sinceElection },
                    { value: "five", label: t.fiveYearsLong },
                    ...(region.type === "spain-federal" ? [] : [{ value: "ten", label: isGerman ? "10 Jahre" : "10 years" }]),
                    { value: "all", label: t.fullArchive },
                    { value: "custom", label: locale === "es" ? "Periodo personalizado" : isGerman ? "Eigener Zeitraum" : "Custom dates" },
                  ]} />
                  {range === "custom" && (
                    <DateRangeSlider
                      locale={locale}
                      min={archiveStart}
                      max={latestDate}
                      start={customStartDate || archiveStart}
                      end={customEndDate || latestDate}
                      onStart={setCustomStartDate}
                      onEnd={setCustomEndDate}
                    />
                  )}
                  <MultiSelect
                    label={t.pollsters}
                    summary={t.pollsterCount(selectedPollsters.length, pollsterOptions.length)}
                    items={pollsterOptions}
                    selected={selectedPollsters}
                    onToggle={togglePollster}
                  />
                  <MultiSelect
                    label={t.events}
                    summary={t.eventCount(selectedEventCategories.length)}
                    items={activeEventCategories.map((category) => ({
                      id: category.id,
                    label: eventCategoryText(category, locale),
                    description: eventCategoryText(category, locale, true),
                    }))}
                    selected={selectedEventCategories}
                    onToggle={toggleEventCategory}
                  />
                </div>
              )}
              <div className="party-selector" aria-label={t.parties} data-export-ignore="true">
                {partyChoiceDefinitions.map((party) => {
                  const active = selectedParties.includes(party.id);
                  return (
                    <button key={party.id} className={active ? "active" : ""} onClick={() => toggleRequired(setSelectedParties)(party.id)} aria-pressed={active}>
                      <span style={{ background: party.color }} />{party.name}
                    </button>
                  );
                })}
                {region.type === "spain-federal" && hiddenPartyChoiceCount > 0 && (
                  <button className="party-selector-more" type="button" onClick={() => setShowAllPartyChoices((value) => !value)} aria-expanded={showAllPartyChoices}>
                    {showAllPartyChoices
                      ? (locale === "es" ? "Ocultar partidos menores" : isGerman ? "Kleinere Parteien ausblenden" : "Hide smaller parties")
                      : (locale === "es" ? `${hiddenPartyChoiceCount} partidos más` : isGerman ? `${hiddenPartyChoiceCount} weitere Parteien` : `${hiddenPartyChoiceCount} more parties`)}
                    <Icon name="chevron" size={14} />
                  </button>
                )}
              </div>
              <PollChart
                t={t}
                locale={locale}
                selectedParties={selectedParties}
                selectedPollsters={selectedPollsters}
                selectedEventCategories={selectedEventCategories}
                mode={mode}
                range={range}
                polls={pollData.polls}
                pollsters={pollData.pollsters}
                latestDate={latestDate}
                displayEndDate={latestDate}
                partyDefinitions={activePartyDefinitions}
                events={activeEvents}
                eventCategories={activeEventCategories}
                electionResults={["uk-federal", "spain-federal"].includes(region.type) ? pollData.metadata?.electionResults ?? {} : region.type === "federal" ? ELECTION_RESULTS : {}}
                termStart={termStart}
                archiveStart={archiveStart}
                customStartDate={customStartDate || archiveStart}
                customEndDate={customEndDate || latestDate}
              />
              <div className="chart-footer">
                <DataAttribution
                  locale={locale}
                  metadata={pollData.metadata}
                  includeElection={["federal", "uk-federal", "spain-federal"].includes(region.type)}
                  electionSourceUrl={pollData.metadata?.electionSourceUrl ?? ELECTION_SOURCE_URL}
                  electionSourceLabel={pollData.metadata?.electionSourceLabel}
                />
                <div>
                  <a href={`/data/${region.slug}.json`} download={`pollframe-${region.slug}.json`}>{t.raw}<Icon name="external" size={15} /></a>
                  <button onClick={() => setMethodOpen(true)}>{t.methodology}<Icon name="info" size={15} /></button>
                </div>
              </div>
            </section>
            {region.type === "spain-federal" && (
              <div ref={spainInsightsExportRef} className="spain-insights-export-surface">
                <SpainPollingInsights
                  locale={locale}
                  pollData={pollData}
                  current={current}
                  latestDate={latestDate}
                  selectedPollsters={selectedPollsters}
                  exportControl={(
                    <PngExportButton
                      elementRef={spainInsightsExportRef}
                      filename="pollframe-spain-what-is-changing"
                      title={locale === "es" ? "Qué está cambiando en España" : isGerman ? "Was sich in Spanien verändert" : "What is changing in Spain"}
                      subtitle="España · Congreso de los Diputados"
                      locale={locale}
                      t={t}
                      credit="Wikipedia contributors · CC BY-SA 4.0 · Pollframe"
                    />
                  )}
                />
              </div>
            )}
            <PollTable
              t={t}
              locale={locale}
              pollData={pollData}
              selectedPollsters={selectedPollsters}
              selectedParties={selectedParties}
              partyDefinitions={activePartyDefinitions}
              regionSlug={region.slug}
            />
            <TendencySection
              t={t}
              locale={locale}
              current={current}
              baseline={tendencyBaseline}
              onSelectParty={selectPartyDetail}
              partyDefinitions={activePartyDefinitions}
              region={region}
            />
            {region.type === "uk-federal"
              ? <UKVotesVsSeats locale={locale} pollData={pollData} />
              : region.type === "spain-federal"
                ? null
                : <ParliamentProjection t={t} locale={locale} current={current} region={region} partyDefinitions={activePartyDefinitions} />}
          </>
        )}
      </main>
      <SiteFooter t={t} pwa={pwa} onSettings={() => setSettingsOpen(true)} onInfo={() => setMethodOpen(true)} sourceUrl={pollData?.metadata?.sourceUrl ?? (pollData ? DATA_SOURCE_URL : null)} homeHref={homeHref} homeLabel={homeLabel} />
      {settings}
      {pollData && (
        <MethodModal
          open={methodOpen}
          onClose={() => setMethodOpen(false)}
          t={t}
          metadata={pollData.metadata}
          latestDate={latestDate}
          locale={locale}
          electionSourceUrl={region.type === "state" ? null : pollData.metadata?.electionSourceUrl ?? ELECTION_SOURCE_URL}
        />
      )}
      <EmbedModal
        open={embedOpen}
        onClose={() => setEmbedOpen(false)}
        t={t}
        locale={locale}
        range={range}
        mode={mode}
        selectedParties={selectedParties}
        selectedPollsters={selectedPollsters}
        selectedEventCategories={selectedEventCategories}
        regionSlug={region.slug}
        customStartDate={customStartDate || archiveStart}
        customEndDate={customEndDate || latestDate}
      />
      {pollData && latestDate && (
        <PartyDetailModal
          party={selectedPartyDetail}
          onClose={() => selectPartyDetail(null)}
          t={t}
          locale={locale}
          polls={pollData.polls}
          selectedPollsters={selectedPollsters}
          latestDate={latestDate}
          partyDefinitions={activePartyDefinitions}
          termStart={termStart}
          archiveStart={archiveStart}
        />
      )}
    </>
  );
}

createRoot(document.getElementById("root")).render(<RegionalApp />);
