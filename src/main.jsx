import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
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
  const openGraphLocale = locale === "de" ? "de_DE" : locale === "en-US" ? "en_US" : "en_GB";
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

const STATE_EVENT_CATEGORY = {
  id: "state-election",
  de: "Landeswahlen",
  en: "State elections",
  deDescription: "Wahlen zum jeweiligen Landesparlament",
  enDescription: "Elections to the respective state parliament",
};

function regionEvents(region) {
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
  if (region.type === "federal") return EVENT_CATEGORIES;
  return [
    STATE_EVENT_CATEGORY,
    ...EVENT_CATEGORIES.filter((category) => (
      ["national", "germany", "europe", "global"].includes(category.id)
    )),
  ];
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
    display: "Darstellung",
    trend: "Geglätteter Trend",
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
    display: "Display",
    trend: "Smoothed trend",
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

function Icon({ name, size = 20 }) {
  const paths = {
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.42 1.42-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.04 1.56V20h-2v-.08A1.7 1.7 0 0 0 12.34 18a1.7 1.7 0 0 0-1.88.34l-.06.06-1.42-1.42.06-.06A1.7 1.7 0 0 0 9.38 15a1.7 1.7 0 0 0-1.56-1.04H7.7v-2h.12a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.88l-.06-.06L10.4 7.56l.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 13.4 6.4V6.3h2v.1a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.42 1.42-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.04h.08v2h-.08A1.7 1.7 0 0 0 19.4 15Z" /></>,
    sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
    share: <><circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>,
    download: <><path d="M12 4v11M8 11l4 4 4-4" /><path d="M5 20h14" /></>,
    external: <><path d="M14 5h5v5M19 5l-8 8" /><path d="M17 13v5H6V7h5" /></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
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
  return locale === "de" ? "de-DE" : locale;
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

function makeTrend(polls, pollsterIds, startDate, endDate, partyDefinitions = PARTY_DEFINITIONS) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const dates = [startDate];
  let cursor = start + (14 * DAY);
  while (cursor < end) {
    dates.push(toIso(cursor));
    cursor += 14 * DAY;
  }
  if (dates.at(-1) !== endDate) dates.push(endDate);

  return makeAverageSeries(
    polls,
    pollsterIds,
    dates,
    partyDefinitions.map((party) => party.id),
  );
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
  const pointerFrameRef = useRef(0);
  const pendingPointerRef = useRef(null);

  useEffect(() => () => {
    if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current);
  }, []);

  const endTime = parseDate(displayEndDate);
  const startTime = getRangeStart(range, endTime, termStart, archiveStart);
  const startDate = toIso(startTime);
  const rawPointsVisible = mode === "polls" || mode === "both";
  const linesVisible = mode === "trend" || mode === "both";
  const selectedPollsterSet = useMemo(() => new Set(selectedPollsters), [selectedPollsters]);
  const selectedPartySet = useMemo(() => new Set(selectedParties), [selectedParties]);
  const partyIds = useMemo(() => partyDefinitions.map((party) => party.id), [partyDefinitions]);
  const trend = useMemo(
    () => (linesVisible
      ? makeTrend(polls, selectedPollsters, startDate, latestDate, partyDefinitions)
      : []),
    [linesVisible, polls, selectedPollsters, startDate, latestDate, partyDefinitions],
  );
  const visiblePolls = useMemo(
    () => (rawPointsVisible ? polls.filter((poll) => (
        selectedPollsterSet.has(poll.pollster)
        && parseDate(poll.date) >= startTime
        && parseDate(poll.date) <= endTime
      )) : []),
    [rawPointsVisible, polls, selectedPollsterSet, startTime, endTime],
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
    ...(rawPointsVisible ? averagePoints.flatMap((point) => activeParties.map((party) => point.results[party.id])) : []),
    ...(linesVisible ? visibleElections.flatMap((election) => activeParties.map((party) => election.results[party.id])) : []),
  ].filter(Number.isFinite)), [trend, activeParties, rawPointsVisible, averagePoints, linesVisible, visibleElections]);
  const x = (date) => left + ((parseDate(date) - startTime) / Math.max(endTime - startTime, 1)) * innerW;
  const maxEventLabels = range === "all" ? 8 : range === "five" ? 10 : 12;
  const labeledEventIds = useMemo(() => new Set(
    [...visibleEvents]
      .sort((a, b) => (
        (EVENT_LABEL_PRIORITY.get(a.id) ?? 2) - (EVENT_LABEL_PRIORITY.get(b.id) ?? 2)
        || parseDate(b.date) - parseDate(a.date)
      ))
      .slice(0, maxEventLabels)
      .map((event) => event.id),
  ), [visibleEvents, maxEventLabels]);
  const { eventMarkers, eventLaneCount } = useMemo(() => {
    const laneEnds = [];
    const markers = visibleEvents.map((event) => {
      const markerX = x(event.date);
      const label = locale === "de" ? event.shortDe : event.shortEn;
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
  const endLabels = useMemo(() => {
    const labels = activeParties
      .map((party) => {
        let point = null;
        for (let index = trend.length - 1; index >= 0; index -= 1) {
          if (Number.isFinite(trend[index].results[party.id])) {
            point = trend[index];
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
  }, [activeParties, trend, top, yAxis.min, yAxis.max]);
  const inspectionSeries = rawPointsVisible ? averagePoints : trend;
  const updateInspection = ({ node, clientX, clientY }) => {
    if (!inspectionSeries.length) {
      setCursor((current) => (current === null ? current : null));
      return;
    }
    const bounds = node.getBoundingClientRect();
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
    const nearestPoint = inspectionSeries[nearestDateIndex(inspectionSeries, targetTime)];
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
        pollster: t.basedOn(nearestPoint.pollsterCount),
      },
    };
    setCursor((current) => (
      current?.date === nextCursor.date && current.nearest.party.id === nextCursor.nearest.party.id
        ? current
        : nextCursor
    ));
  };
  const inspectChart = (event) => {
    pendingPointerRef.current = {
      node: event.currentTarget,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    if (pointerFrameRef.current) return;
    pointerFrameRef.current = window.requestAnimationFrame(() => {
      pointerFrameRef.current = 0;
      if (pendingPointerRef.current) updateInspection(pendingPointerRef.current);
    });
  };
  const inspection = hover ?? cursor?.nearest ?? null;

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
            onPointerMove={inspectChart}
            onPointerDown={inspectChart}
            onPointerLeave={(event) => {
              if (event.pointerType === "touch") return;
              pendingPointerRef.current = null;
              if (pointerFrameRef.current) {
                window.cancelAnimationFrame(pointerFrameRef.current);
                pointerFrameRef.current = 0;
              }
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
                className={`event-marker event-${event.category}`}
                tabIndex="0"
                role="button"
                aria-label={`${formatDate(event.date, locale, { year: true })} · ${locale === "de" ? event.de : event.en}`}
                onMouseEnter={() => setHoverEvent(event)}
                onMouseLeave={() => setHoverEvent(null)}
                onFocus={() => setHoverEvent(event)}
                onBlur={() => setHoverEvent(null)}
              >
                <title>{`${formatDate(event.date, locale, { year: true })} · ${locale === "de" ? event.de : event.en}`}</title>
                <line x1={event.markerX} x2={event.markerX} y1={event.showLabel ? labelY + 24 : margin.top} y2={height - margin.bottom} />
                {event.showLabel && (
                  <>
                    <rect className="event-label-bg" x={event.labelCenter - (event.labelWidth / 2)} y={labelY} width={event.labelWidth} height="24" rx="6" />
                    <text className="event-label-text" x={event.labelCenter} y={labelY + 16} textAnchor="middle">{event.label}</text>
                  </>
                )}
                <circle className="event-anchor" cx={event.markerX} cy={margin.top} r="3.5" />
              </g>
            );
          })}
          {inspection && (
            <line
              className="chart-cursor-line"
              x1={x(inspection.date)}
              x2={x(inspection.date)}
              y1={margin.top}
              y2={height - margin.bottom}
            />
          )}
          {activeParties.map((party) => (
            <g key={party.id}>
              {linesVisible && trendPaths.get(party.id) && (
                <>
                  <path d={trendPaths.get(party.id)} className="series-halo" />
                  <path d={trendPaths.get(party.id)} className="series-line" style={{ stroke: party.color }} />
                </>
              )}
              {rawPointsVisible && averagePaths.get(party.id) && (
                <>
                  <path d={averagePaths.get(party.id)} className="average-series-halo" />
                  <path d={averagePaths.get(party.id)} className="average-series-line" style={{ stroke: party.color }} />
                </>
              )}
              {rawPointsVisible && averagePointPaths.get(party.id) && (
                <path
                  d={averagePointPaths.get(party.id)}
                  className="average-series-points"
                  style={{ stroke: party.color }}
                  strokeWidth={averagePointStroke}
                  aria-hidden="true"
                />
              )}
              {linesVisible && visibleElections.map((election) => {
                const value = election.results[party.id];
                if (!Number.isFinite(value)) return null;
                const sourceLabel = locale === "de" ? "Amtliches Wahlergebnis" : "Official election result";
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
          {linesVisible && endLabels.map(({ party, point, value, labelY }) => (
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
              cx={x(cursor.date)}
              cy={y(value)}
              r={cursor.nearest.party.id === party.id ? 5 : 3.5}
              fill={party.color}
            />
          ))}
          {tickDates.map((date, index) => (
            <text key={date} x={x(date)} y={height - 20} textAnchor={index === 0 ? "start" : index === 4 ? "end" : "middle"} className="axis-label">
              {range === "all"
                ? new Date(parseDate(date)).getUTCFullYear()
                : formatDate(date, locale, { year: index === 0 || index === 4 })}
            </text>
          ))}
          {inspection && (
            <g
              className="chart-tooltip"
              transform={`translate(${
                x(inspection.date) > width - 282 ? x(inspection.date) - 258 : x(inspection.date) + 15
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
        {hoverEvent && (
          <aside className={`event-hover-card event-${hoverEvent.category}`} aria-live="polite">
            <div>
              <span>{locale === "de"
                ? eventCategories.find((category) => category.id === hoverEvent.category)?.de
                : eventCategories.find((category) => category.id === hoverEvent.category)?.en}</span>
              <time dateTime={hoverEvent.date}>{formatDate(hoverEvent.date, locale, { year: true })}</time>
            </div>
            <strong>{locale === "de" ? hoverEvent.de : hoverEvent.en}</strong>
            <p>{locale === "de" ? hoverEvent.detailDe : hoverEvent.detailEn}</p>
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
                    <strong>{locale === "de" ? event.de : event.en}</strong>
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

function ResultsCard({ t, locale, current, previous, date, partyDefinitions = PARTY_DEFINITIONS }) {
  const numberLocale = getNumberLocale(locale);
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
        <span className="status-dot"><i /> {t.basedOn(current.pollsterCount)}</span>
      </div>
      <div className="result-list">
        {rows.map((party) => (
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
      <div className="results-note"><Icon name="info" size={16} /><span>{t.compared}</span></div>
    </section>
  );
}

function TendencySection({ t, locale, current, baseline, onSelectParty, partyDefinitions = PARTY_DEFINITIONS }) {
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
          <button
            type="button"
            className="tendency-card"
            key={party.id}
            onClick={() => onSelectParty(party)}
            aria-label={t.openParty(party.name)}
          >
            <div className="tendency-party">
              <span style={{ background: party.color }} />
              <strong>{party.name}</strong>
              <b>{party.value.toLocaleString(numberLocale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</b>
            </div>
            <div className={`tendency-status ${party.direction}`}>{party.status}</div>
            <p>{Number.isFinite(party.delta) ? t.percentagePoints90(party.delta) : t.tendencyUnavailable}</p>
            <span className="tendency-open" aria-hidden="true">↗</span>
          </button>
        ))}
      </div>
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

        <div className="coalition-list">
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
              </div>
            );
          })}
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
  const pointerFrameRef = useRef(0);
  const pendingPointerRef = useRef(null);
  useEffect(() => setPeriod("year"), [party?.id]);
  useEffect(() => () => {
    if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current);
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

  const width = 920;
  const height = 350;
  const margin = { top: 28, right: 30, bottom: 48, left: 48 };
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
  const tickDates = useMemo(
    () => Array.from({ length: 4 }, (_, index) => toIso(parseDate(startDate) + ((endTime - parseDate(startDate)) * index / 3))),
    [startDate, endTime],
  );
  if (!party) return null;

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
            <h2 id="party-detail-title"><span style={{ background: party.color }} />{t.partyDetailTitle(party.name)}</h2>
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
              <div><span>{t.currentValue}</span><strong>{formatValue(last.value)}</strong></div>
              <div><span>{t.changeInPeriod}</span><strong className={delta > 0 ? "positive" : delta < 0 ? "negative" : ""}>{signed(delta, t.ppShort)}</strong><small>{t.versusPeriodStart}</small></div>
              <div><span>{t.relativeChange}</span><strong className={relative > 0 ? "positive" : relative < 0 ? "negative" : ""}>{signed(relative, "%")}</strong><small>{t.versusPeriodStart}</small></div>
              <div><span>{t.periodHigh}</span><strong>{formatValue(high)}</strong></div>
              <div><span>{t.periodLow}</span><strong>{formatValue(low)}</strong></div>
            </div>
            <div className="party-detail-chart">
              <svg
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
                  <text key={date} x={x(date)} y={height - 16} textAnchor={index === 0 ? "start" : index === 3 ? "end" : "middle"} className="axis-label">
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
}) {
  if (!open) return null;
  const languages = [
    { id: "de", label: "Deutsch", region: "Deutschland" },
    { id: "en-GB", label: "English", region: "United Kingdom" },
    { id: "en-US", label: "English", region: "United States" },
  ];
  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="side-panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="panel-header">
          <h2 id="settings-title">{t.settingsTitle}</h2>
          <button className="icon-button" onClick={onClose} aria-label={t.close}><Icon name="close" /></button>
        </div>
        <section className="setting-section">
          <h3>{t.language}</h3>
          <p>{t.languageHelp}</p>
          <div className="language-list">
            {languages.map((language) => (
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
            <a href={DATA_SOURCE_URL} target="_blank" rel="noreferrer">dawum.de <Icon name="external" size={14} /></a>
            <a href={DATA_LICENSE_URL} target="_blank" rel="noreferrer">{metadata.license} <Icon name="external" size={14} /></a>
            {electionSourceUrl && (
              <a href={electionSourceUrl} target="_blank" rel="noreferrer">{t.electionSource}: {locale === "de" ? "Die Bundeswahlleiterin, Wiesbaden" : "Federal Returning Officer, Wiesbaden"} <Icon name="external" size={14} /></a>
            )}
          </div>
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
  return (
    <span className="data-attribution">
      {isGerman ? "Daten von" : "Data from"}{" "}
      <a href={DATA_SOURCE_URL} target="_blank" rel="noreferrer">dawum.de</a>{" "}
      (<a href={DATA_LICENSE_URL} target="_blank" rel="noreferrer">ODbL 1.0</a>)
      {metadata?.databaseUpdated && <> · {isGerman ? "Stand" : "updated"} {formatDate(metadata.databaseUpdated.slice(0, 10), locale, { year: true })}</>}
      {includeElection && (
        <> · {isGerman ? "Wahlergebnisse" : "Election results"}:{" "}
          <a href={electionSourceUrl} target="_blank" rel="noreferrer">{electionSourceLabel ?? (isGerman ? "Die Bundeswahlleiterin, Wiesbaden" : "Federal Returning Officer, Wiesbaden")}</a>
          {" "}({isGerman ? "gekürzt und neu dargestellt" : "shortened and newly presented"})
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

function buildEmbedUrl({ locale, theme, range, mode, selectedParties, selectedPollsters, selectedEventCategories, regionSlug }) {
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
  return url.toString();
}

function buildShareUrl({ locale, range, mode, selectedParties, selectedPollsters, selectedEventCategories, regionSlug }) {
  const url = new URL("/", window.location.origin);
  url.searchParams.set("region", regionSlug);
  url.searchParams.set("share", "1");
  url.searchParams.set("lang", locale);
  url.searchParams.set("range", range);
  url.searchParams.set("mode", mode);
  url.searchParams.set("parties", selectedParties.join(","));
  url.searchParams.set("pollsters", selectedPollsters.join(","));
  url.searchParams.set("events", selectedEventCategories.join(","));
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

function buildDawumPollUrl(regionSlug, poll) {
  const regionPath = DAWUM_REGION_PATHS[regionSlug];
  const pollsterPath = DAWUM_POLLSTER_PATHS[poll.pollster];
  if (!regionPath || !pollsterPath || !/^\d{4}-\d{2}-\d{2}$/.test(poll.date)) return DATA_SOURCE_URL;
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
      buildDawumPollUrl(regionSlug, poll),
      "ODbL 1.0",
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

function PollTable({ t, locale, pollData, selectedPollsters, selectedParties, partyDefinitions, regionSlug }) {
  const [visibleCount, setVisibleCount] = useState(12);
  const numberLocale = getNumberLocale(locale);
  const polls = useMemo(() => pollData.polls
    .filter((poll) => selectedPollsters.includes(poll.pollster))
    .slice()
    .reverse(), [pollData, selectedPollsters]);
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
                <td><a href={buildDawumPollUrl(regionSlug, poll)} target="_blank" rel="noreferrer">{t.openSource}<Icon name="external" size={13} /></a></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
        <div className="poll-card-list">
          {visiblePolls.map((poll, index) => (
            <article key={`${poll.date}-${poll.pollster}-card-${index}`}>
              <header><div><time dateTime={poll.date}>{formatDate(poll.date, locale, { year: true })}</time><strong>{pollData.pollsters[poll.pollster]}</strong></div><a href={buildDawumPollUrl(regionSlug, poll)} target="_blank" rel="noreferrer" aria-label={`${t.openSource}: ${pollData.pollsters[poll.pollster]}`}><Icon name="external" size={16} /></a></header>
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
}) {
  const [embedTheme, setEmbedTheme] = useState("light");
  const [embedHeight, setEmbedHeight] = useState("standard");
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
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
      />
      <footer className="embed-footer">
        <DataAttribution
          locale={locale}
          metadata={pollData.metadata}
          includeElection={regionSlug === "bundestag"}
          electionSourceUrl={ELECTION_SOURCE_URL}
        />
        <a href={`/?region=${regionSlug}`} target="_blank" rel="noreferrer">Interaktiv öffnen <Icon name="external" size={13} /></a>
      </footer>
    </main>
  );
}

function SiteHeader({ t, onSettings, onInfo }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        <a className="brand" href="/?country=de" aria-label="Pollframe Deutschland-Übersicht">
          <BrandMark />
          <span>POLLFRAME</span>
          <em>BETA</em>
        </a>
        <div className="header-actions">
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
    </header>
  );
}

function SiteFooter({ t, onInfo, sourceUrl }) {
  return (
    <footer>
      <a className="brand small" href="/?country=de" aria-label="Pollframe Deutschland-Übersicht"><BrandMark /><span>POLLFRAME</span></a>
      <p>{t.footerLine}</p>
      <nav>
        {onInfo && <button className="footer-action" onClick={onInfo}>{t.methodology}</button>}
        {sourceUrl && <a className="footer-action" href={sourceUrl} target="_blank" rel="noreferrer">{t.sourceTitle}</a>}
        <a className="footer-action" href="/?page=datenschutz">{t.privacy}</a>
        <a className="footer-action" href="/?page=lizenzen">{t.licences}</a>
        <a className="footer-action" href="/?page=impressum">Impressum</a>
        <a className="footer-action" href="/?page=kontakt">{t.contact}</a>
      </nav>
    </footer>
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
  const [focusedSlug, setFocusedSlug] = useState("berlin");
  const focused = states.find((region) => region.slug === focusedSlug) ?? states[0];
  const coverageLabel = (coverage) => ({
    good: isGerman ? "Gute Datenreihe" : "Good series",
    fair: isGerman ? "Brauchbar, aber dünner" : "Usable, but thinner",
    limited: isGerman ? "Begrenzte Datenreihe" : "Limited series",
  }[coverage]);
  const byMapId = new Map(states.map((region) => [region.mapId, region]));

  return (
    <section id="laenderkarte" className="map-section" aria-labelledby="coverage-map-title">
      <div className="map-copy">
        <p className="section-label">{isGerman ? "Datenabdeckung" : "Data coverage"}</p>
        <h2 id="coverage-map-title">{isGerman ? "Länderkarte" : "State map"}</h2>
        <p>{isGerman
          ? "Wähle ein Bundesland, um seine vollständige Umfragereihe zu öffnen. Die Einfärbung zeigt, wie dicht die verfügbare Datenreihe ist."
          : "Choose a state to open its complete polling series. Colour intensity indicates how dense the available series is."}</p>
        {focused && (
          <a className="map-selection" href={`/?region=${focused.slug}`}>
            <span className={`coverage-dot ${focused.coverage}`} />
            <div>
              <strong>{focused.name}</strong>
              <small>{focused.pollCount} {isGerman ? "Umfragen" : "polls"} · {formatDate(focused.latestDate, locale, { year: true })}</small>
            </div>
            <span className="entry-arrow" aria-hidden="true">→</span>
          </a>
        )}
        <div className="map-legend" aria-label={isGerman ? "Datenabdeckung" : "Data coverage"}>
          {["good", "fair", "limited"].map((coverage) => (
            <span key={coverage}><i className={coverage} />{coverageLabel(coverage)}</span>
          ))}
        </div>
      </div>
      <div className="germany-map-wrap">
        {mapGeometry ? (
        <svg className="germany-map" viewBox={mapGeometry.viewBox} role="img" aria-label={isGerman ? "Datenabdeckung nach Bundesland" : "Polling coverage by state"}>
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
                  <title>{region.name} · {coverageLabel(region.coverage)} · {region.pollCount} {isGerman ? "Umfragen" : "polls"}</title>
                </path>
              </a>
            );
          })}
        </svg>
        ) : <div className="map-data-loading">{isGerman ? "Karte wird geladen …" : "Loading map…"}</div>}
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
  const isGerman = locale === "de";
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
    ? (isGerman ? "Stärkste Partei im jeweils neuesten Landesdurchschnitt" : "Leading party in each state’s latest average")
    : mode === "growth"
      ? (isGerman ? "Stärkster geschätzter Zuwachs" : "Largest estimated gain")
      : `${mapPartyFullName(selectedParty, locale)} ${isGerman ? "im Ländervergleich" : "across the states"}`;
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
    return <div className="map-data-loading">{isGerman ? "Länderdaten werden geladen …" : "Loading state data…"}</div>;
  }

  const mapViewOptions = [
    { value: "leader", label: isGerman ? "Stärkste Partei" : "Leading party" },
    { value: "party", label: isGerman ? "Partei vergleichen" : "Compare party" },
    { value: "growth", label: isGerman ? "Stärkster Zuwachs" : "Largest gain" },
  ];

  return (
    <div className={`poll-map-module ${embed ? "embedded" : ""}`}>
      <div className="poll-map-actions">
        <button
          className={`secondary-button ${customizeOpen ? "active" : ""}`}
          onClick={() => setCustomizeOpen(!customizeOpen)}
          aria-expanded={customizeOpen}
        >
          <Icon name="sliders" />{isGerman ? "Karte anpassen" : "Customize map"}
        </button>
        {onShare && (
          <button className="primary-button map-share-button" onClick={onShare}>
            <Icon name="share" />{isGerman ? "Karte einbetten" : "Embed map"}
          </button>
        )}
      </div>

      {customizeOpen && (
        <div className="customize-panel map-customize-panel">
          <div className="map-view-controls">
            <span className="map-control-label">{isGerman ? "Was soll die Karte zeigen?" : "What should the map show?"}</span>
            <div className="map-view-options" role="radiogroup" aria-label={isGerman ? "Kartenansicht" : "Map view"}>
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
                <span className="map-control-label">{isGerman ? "Partei auswählen" : "Choose a party"}</span>
                <div className="map-party-options" role="radiogroup" aria-label={isGerman ? "Partei auswählen" : "Choose a party"}>
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
          <p className="section-label">{mode === "growth" ? (isGerman ? "Trend · 180 Tage" : "Trend · 180 days") : (isGerman ? "Neuester Landesdurchschnitt" : "Latest state average")}</p>
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
              <span>{isGerman ? "Ausgewählt" : "Selected"}</span>
              <span aria-hidden="true">→</span>
            </div>
            <strong>{focused.name}</strong>
            {isStale(focused) && (
              <span className="map-stale-badge">
                {isGerman ? `Älterer Stand · ${ageInDays(focused)} Tage` : `Older data · ${ageInDays(focused)} days`}
              </span>
            )}
            <div className="poll-map-focus-value">
              {focusedMetric.parties[0] && <i style={{ background: focusedMetric.parties[0].color }} />}
              <span>{focusedMetric.label}</span>
              <b>{focusedMetric.valueLabel}</b>
            </div>
            <dl>
              <div><dt>{isGerman ? "Stand" : "Latest"}</dt><dd>{formatDate(focused.latestDate, locale, { year: true })}</dd></div>
              <div><dt>{isGerman ? "Institute im Mittel" : "Pollsters in average"}</dt><dd>{focused.current.instituteCount}</dd></div>
            </dl>
            <small>{mode === "growth"
              ? (isGerman
                ? `${focused.movement.observationCount} Umfragen auf einer linearen 180-Tage-Trendlinie; bei zu wenigen Daten keine Einfärbung.`
                : `${focused.movement.observationCount} polls in a linear 180-day trend; no colour where data is insufficient.`)
              : (isGerman
                ? "Je Institut zählt die jüngste Umfrage innerhalb von 45 Tagen gleich."
                : "Each pollster’s latest poll within 45 days receives equal weight.")}</small>
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

function GermanyCountryOverview({ locale, summary }) {
  const isGerman = locale === "de";
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
  return (
    <main id="top" className="germany-country-overview">
      <nav className="region-breadcrumb" aria-label="Navigation"><strong>{isGerman ? "Deutschland" : "Germany"}</strong></nav>
      <section className="germany-country-hero">
        <div><div className="eyebrow"><span />{isGerman ? "Bundestag und Länder" : "Federal and state elections"}</div><h1>🇩🇪 {isGerman ? "Deutschland im Überblick" : "Germany at a glance"}</h1><p>{isGerman ? "Bundesweite Wahlen oben, die 16 Länder in der großen Karte darunter. Jede Karte führt zu einer vollständigen Informationsseite." : "National elections first, with all 16 states in the main map below. Every card leads to a complete information page."}</p></div>
        <div className="overview-profile-badge"><span>{isGerman ? "Länderübersicht" : "Country overview"}</span><strong>Deutschland</strong><small>{isGerman ? "Laufende Umfragen · historische Reihen" : "Current polls · historical series"}</small></div>
      </section>
      <section className="overview-entry-stack" aria-label={isGerman ? "Wahlen und Karten in Deutschland" : "Elections and maps in Germany"}>
        <OverviewInfoWidget accent="parliament" href="/?region=bundestag" eyebrow={isGerman ? "Nationale Ebene" : "National level"} title={isGerman ? "Bundestagswahl" : "Federal election"} text={isGerman ? "Aktueller Durchschnitt, langfristiger Trend, Institute, Ereignisse und Sitzmodell." : "Current average, long-term trend, pollsters, events and seat model."} stats={[[isGerman ? "Umfragen" : "Polls", federal?.pollCount?.toLocaleString(isGerman ? "de-DE" : "en-GB") ?? "–"], [isGerman ? "Seit" : "Since", federal?.firstDate ? new Date(parseDate(federal.firstDate)).getUTCFullYear() : "–"], [isGerman ? "Zuletzt" : "Latest", federal ? formatDate(federal.latestDate, locale, { year: true }) : "–"]]} />
        <OverviewInfoWidget accent="opinion" href="/?view=map" eyebrow={isGerman ? "Vergleich der Länder" : "State comparison"} title={isGerman ? "Deutschland im Überblick" : "Germany at a glance"} text={isGerman ? "Parteistärken und Bewegungen auf einer anpassbaren Karte über alle 16 Länder vergleichen." : "Compare party strength and movement across all 16 states on a customisable map."} stats={[[isGerman ? "Länder" : "States", "16"], [isGerman ? "Ansichten" : "Views", "3"], [isGerman ? "Teilen" : "Sharing", "Embed"]]} />
      </section>
      {states.length > 0 && <StateCoverageMap states={states} locale={locale} mapGeometry={mapGeometry} />}
      <p className="germany-country-note">{isGerman ? "Länderkarte und jede Länderansicht verwenden ausschließlich vorhandene Werte; Datenlücken bleiben an den einzelnen Punkten sichtbar." : "The state map and every state page use available values only; data gaps remain visible at individual points."}</p>
    </main>
  );
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
        <p className="privacy-updated">Last updated: 1 August 2026</p>

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
          <h2>3. Settings stored on your device</h2>
          <p>Pollframe stores only settings you actively select—language, light or dark appearance, text size and reduced motion—in your browser’s local storage. They remain on the device until you delete the website data in your browser. They are not used to identify you and are not combined into a visitor profile.</p>
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
        </section>

        <section>
          <h2>6. Contact by email</h2>
          <p>The contact assistant does not transmit entries to Pollframe or Cloudflare. It creates a prepared email and asks the browser to open your local email app. Data is transmitted only if you send the message from that app.</p>
          <p>If you contact us, your message, email address and the information you provide are processed to answer the request. Email is provided through Proton Mail. The legal basis is Article 6(1)(f) GDPR, or Article 6(1)(b) GDPR where the message concerns steps before entering into a contract. Messages are deleted when the request has been resolved unless legal retention obligations apply. Proton’s information is available in its <a href="https://proton.me/legal/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</p>
        </section>

        <section>
          <h2>7. Retention and recipients</h2>
          <p>Local preferences remain until you remove them. Contact messages are kept only as long as necessary for the request or a legal obligation. Technical security and aggregate Web Analytics data processed by Cloudflare are retained as described above and under Cloudflare’s applicable policies. Data is disclosed only to the service providers named above where necessary, or where required by law.</p>
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
      <p className="privacy-updated">Stand: 1. August 2026</p>

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
        <h2>3. Auf deinem Gerät gespeicherte Einstellungen</h2>
        <p>Pollframe speichert ausschließlich von dir gewählte Einstellungen – Sprache, helle oder dunkle Darstellung, Textgröße und reduzierte Bewegung – im lokalen Speicher deines Browsers. Sie bleiben auf deinem Gerät, bis du die Websitedaten im Browser löschst. Sie werden nicht zu deiner Identifizierung verwendet und nicht zu einem Besucherprofil zusammengeführt.</p>
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
      </section>

      <section>
        <h2>6. Kontakt per E-Mail</h2>
        <p>Der Kontaktassistent überträgt Eingaben nicht an Pollframe oder Cloudflare. Er erstellt lediglich eine vorbereitete E-Mail und fordert den Browser auf, das lokale E-Mail-Programm zu öffnen. Daten werden erst übertragen, wenn du die Nachricht dort absendest.</p>
        <p>Wenn du uns kontaktierst, werden deine Nachricht, deine E-Mail-Adresse und die von dir mitgeteilten Informationen zur Bearbeitung der Anfrage verarbeitet. Der E-Mail-Dienst wird über Proton Mail bereitgestellt. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO, bei vorvertraglichen Anfragen Art. 6 Abs. 1 lit. b DSGVO. Nachrichten werden gelöscht, wenn die Anfrage abschließend erledigt ist, sofern keine gesetzlichen Aufbewahrungspflichten bestehen. Informationen von Proton stehen in dessen <a href="https://proton.me/legal/privacy" target="_blank" rel="noreferrer">Datenschutzerklärung</a>.</p>
      </section>

      <section>
        <h2>7. Speicherdauer und Empfänger</h2>
        <p>Lokale Einstellungen bleiben bis zu ihrer Löschung bestehen. Kontaktanfragen werden nur so lange gespeichert, wie es für die Bearbeitung oder eine gesetzliche Pflicht erforderlich ist. Technische Sicherheitsdaten und aggregierte Web-Analytics-Daten bei Cloudflare werden wie oben beschrieben und nach den jeweils geltenden Richtlinien von Cloudflare gespeichert. Daten werden nur an die oben genannten Dienstleister weitergegeben, soweit dies erforderlich ist, oder wenn wir gesetzlich dazu verpflichtet sind.</p>
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
      </section>

      <section className="licence-card">
        <span className="licence-kind">{isGerman ? "Software" : "Software"}</span>
        <h2>React und React DOM</h2>
        <p>{isGerman
          ? "Die ausgelieferte Anwendung enthält React und React DOM von Meta Platforms, Inc. and affiliates unter der MIT-Lizenz."
          : "The delivered application contains React and React DOM by Meta Platforms, Inc. and affiliates under the MIT License."}</p>
        <details className="licence-disclosure">
          <summary>{isGerman ? "Vollständigen MIT-Lizenztext anzeigen" : "Show the full MIT licence text"}</summary>
          <pre className="licence-text">{`MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

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
          ? "Partei- und Institutsnamen werden ausschließlich zur sachlichen Bezeichnung verwendet; Pollframe verwendet keine Partei- oder Institutslogos und behauptet keine Verbindung oder Unterstützung. Die kurzen Ereignistexte sind eigenständige Zusammenfassungen. Jeder Ereignismarker verlinkt die zugehörige amtliche oder primäre Quelle."
          : "Party and pollster names are used only for factual identification; Pollframe uses no party or pollster logos and claims no affiliation or endorsement. Short event texts are original summaries. Each event marker links to its official or primary source."}</p>
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
    embedMode && ["de", "en-GB", "en-US"].includes(query.get("lang"))
      ? query.get("lang")
      : storedPreference("opinion-poll-locale", "de", ["de", "en-GB", "en-US"])
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
    embedMode && ["trend", "polls", "both"].includes(query.get("mode")) ? query.get("mode") : "trend"
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
    document.documentElement.lang = locale === "de" ? "de" : "en";
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
                    label: locale === "de" ? category.de : category.en,
                    description: locale === "de" ? category.deDescription : category.enDescription,
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
  const query = new URLSearchParams(window.location.search);
  const embedMode = IS_EMBED_ENTRY;
  const sharedView = query.get("share") === "1";
  const legalPage = !embedMode && query.get("page") === "impressum";
  const privacyPage = !embedMode && query.get("page") === "datenschutz";
  const licencesPage = !embedMode && query.get("page") === "lizenzen";
  const contactPage = !embedMode && query.get("page") === "kontakt";
  const requestedRegion = query.get("region");
  const requestedCountry = query.get("country");
  const retiredExpansionRoute = requestedRegion === "europawahl-deutschland"
    || ["fr", "at", "pl"].includes(requestedCountry)
    || (!embedMode && query.get("view") === "europe");
  const region = retiredExpansionRoute
    ? null
    : REGION_META.find((candidate) => candidate.slug === requestedRegion) ?? null;
  const germanyCountryPage = !embedMode && (requestedCountry === "de" || retiredExpansionRoute);
  const isOverview = !legalPage && !privacyPage && !licencesPage && !contactPage && !region && !germanyCountryPage;
  const mapPage = isOverview && !embedMode && query.get("view") === "map";
  const queryList = (key, fallback, allowed) => {
    return queryListPreference(query, key, fallback, allowed, embedMode || sharedView);
  };

  const [pollData, setPollData] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [locale, setLocale] = useState(() => (
    (embedMode || sharedView) && ["de", "en-GB", "en-US"].includes(query.get("lang"))
      ? query.get("lang")
      : storedPreference("opinion-poll-locale", "de", ["de", "en-GB", "en-US"])
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
    (embedMode || sharedView) && ["trend", "polls", "both"].includes(query.get("mode")) ? query.get("mode") : "trend"
  ));
  const [range, setRange] = useState(() => (
    (embedMode || sharedView) && ["month", "three", "six", "ytd", "year", "two", "election", "five", "all"].includes(query.get("range"))
      ? query.get("range")
      : "all"
  ));
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
    region?.type === "state" ? ["state-election"] : ["national"],
    activeEventCategories.map((category) => category.id),
  ));
  const [selectedParties, setSelectedParties] = useState([]);
  const [selectedPollsters, setSelectedPollsters] = useState([]);
  const [selectedPartyDetail, setSelectedPartyDetail] = useState(null);

  const baseT = copy[locale];
  const isGerman = locale === "de";
  const t = useMemo(() => (region?.type === "state" ? {
    ...baseT,
    overview: `${region.name} · Sonntagsfrage`,
    title: isGerman ? `Umfragen zur ${region.electionName}` : `${region.name} election polling`,
    intro: isGerman
      ? `Aktuelle Werte und der langfristige Verlauf für ${region.name} – mit transparent ausgewiesener Datenlage.`
      : `Current values and the long-term trend for ${region.name}, with transparent data coverage.`,
    chartTitle: isGerman ? `Entwicklung der Wahlabsicht in ${region.name}` : `Voting intention in ${region.name}`,
    sinceElection: isGerman ? "Seit der letzten Landeswahl" : "Since the last state election",
    fullArchive: isGerman ? "Gesamtes Länderarchiv · seit 2017" : "Full state archive · since 2017",
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
  } : baseT), [baseT, region, isGerman]);

  useEffect(() => {
    if (legalPage || privacyPage || licencesPage || contactPage) return;
    const controller = new AbortController();
    const target = isOverview || germanyCountryPage ? "/regions.json" : `/data/${region.slug}.json`;
    fetch(target, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((data) => {
        if (isOverview || germanyCountryPage) {
          setSummary(data);
          return;
        }
        setPollData(data);
        const definitions = PARTY_DEFINITIONS.filter((party) => data.parties[party.id]);
        const latestResults = data.polls.at(-1)?.results ?? {};
        const defaults = definitions
          .filter((party) => Number.isFinite(latestResults[party.id]))
          .sort((a, b) => latestResults[b.id] - latestResults[a.id])
          .slice(0, 6)
          .map((party) => party.id);
        setSelectedParties(queryList("parties", defaults, definitions.map((party) => party.id)));
        setSelectedPollsters(queryList("pollsters", Object.keys(data.pollsters), Object.keys(data.pollsters)));
        const partySlug = query.get("party");
        setSelectedPartyDetail(definitions.find((party) => party.slug === partySlug) ?? null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setLoadError(true);
      });
    return () => controller.abort();
  }, [embedMode, legalPage, privacyPage, licencesPage, contactPage, isOverview, germanyCountryPage, region]);

  useEffect(() => {
    document.documentElement.lang = isGerman ? "de" : "en";
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
    } else if (germanyCountryPage) {
      title = isGerman ? "Deutschland im Überblick · Pollframe" : "Germany at a glance · Pollframe";
      description = isGerman
        ? "Übersicht über Bundestagswahl und alle 16 deutschen Länderansichten."
        : "Overview of the federal election and all 16 German state views.";
      canonicalPath = "/?country=de";
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
      window.localStorage.setItem("opinion-poll-locale", locale);
      window.localStorage.setItem("opinion-poll-theme", theme);
      window.localStorage.setItem("opinion-poll-text-size", textSize);
      window.localStorage.setItem("opinion-poll-motion", motion);
    } catch {
      // Preferences remain active for this visit.
    }
  }, [locale, theme, textSize, motion, embedMode, isGerman, isOverview, legalPage, privacyPage, licencesPage, contactPage, germanyCountryPage, mapPage, region]);

  const latestDate = pollData?.polls.at(-1)?.date;
  const activePartyDefinitions = useMemo(
    () => PARTY_DEFINITIONS.filter((party) => pollData?.parties?.[party.id]),
    [pollData],
  );
  const partyIds = useMemo(
    () => activePartyDefinitions.map((party) => party.id),
    [activePartyDefinitions],
  );
  const current = useMemo(() => pollData && selectedPollsters.length
    ? averageAtDate(pollData.polls, selectedPollsters, latestDate, partyIds)
    : { results: {}, pollsterCount: 0 }, [pollData, selectedPollsters, latestDate, partyIds]);
  const previous = useMemo(() => pollData && selectedPollsters.length
    ? averageAtDate(pollData.polls, selectedPollsters, toIso(parseDate(latestDate) - (7 * DAY)), partyIds)
    : { results: {}, pollsterCount: 0 }, [pollData, selectedPollsters, latestDate, partyIds]);
  const tendencyBaseline = useMemo(() => pollData && selectedPollsters.length
    ? averageAtDate(pollData.polls, selectedPollsters, toIso(parseDate(latestDate) - (90 * DAY)), partyIds)
    : { results: {}, pollsterCount: 0 }, [pollData, selectedPollsters, latestDate, partyIds]);
  const stateElectionDates = region?.type === "state"
    ? STATE_ELECTION_DATES[region.slug] ?? []
    : [];
  const termStart = stateElectionDates.filter((date) => !latestDate || date <= latestDate).at(-1)
    ?? pollData?.polls[0]?.date
    ?? ARCHIVE_START;
  const archiveStart = pollData?.polls[0]?.date ?? ARCHIVE_START;

  const toggleRequired = (setter) => (id) => setter((selection) => (
    selection.includes(id)
      ? selection.length > 1 ? selection.filter((item) => item !== id) : selection
      : [...selection, id]
  ));
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
        electionResults={region.type === "federal" ? ELECTION_RESULTS : {}}
        termStart={termStart}
        archiveStart={archiveStart}
        regionSlug={region.slug}
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
    />
  );

  if (legalPage) {
    return (
      <>
        <SiteHeader t={t} onSettings={() => setSettingsOpen(true)} />
        <LegalPage locale={locale} />
        <SiteFooter t={t} />
        {settings}
      </>
    );
  }
  if (privacyPage) {
    return (
      <>
        <SiteHeader t={t} onSettings={() => setSettingsOpen(true)} />
        <PrivacyPage locale={locale} />
        <SiteFooter t={t} />
        {settings}
      </>
    );
  }
  if (licencesPage) {
    return (
      <>
        <SiteHeader t={t} onSettings={() => setSettingsOpen(true)} />
        <LicencesPage locale={locale} />
        <SiteFooter t={t} />
        {settings}
      </>
    );
  }
  if (contactPage) {
    return (
      <>
        <SiteHeader t={t} onSettings={() => setSettingsOpen(true)} />
        <ContactPage locale={locale} />
        <SiteFooter t={t} />
        {settings}
      </>
    );
  }
  if (germanyCountryPage) {
    return (
      <>
        <SiteHeader t={t} onSettings={() => setSettingsOpen(true)} />
        {summary ? <GermanyCountryOverview locale={locale} summary={summary} /> : <div className="embed-loading">{loadError ? t.error : t.loading}</div>}
        <SiteFooter t={t} />
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
        <SiteHeader t={t} onSettings={() => setSettingsOpen(true)} />
        {summary
          ? <OverviewPage t={t} locale={locale} summary={summary} mapPage={mapPage} />
          : <main><div className="loading-card overview-loading">{loadError ? t.error : t.loading}</div></main>}
        <SiteFooter t={t} sourceUrl="https://dawum.de/API/" />
        {settings}
      </>
    );
  }

  return (
    <>
      <SiteHeader t={t} onSettings={() => setSettingsOpen(true)} onInfo={() => setMethodOpen(true)} />
      <main id="top">
        <nav className="region-breadcrumb" aria-label={isGerman ? "Region" : "Region"}>
          <a href="/">{isGerman ? "Übersicht" : "Overview"}</a><span>/</span><strong>{region.name}</strong>
        </nav>
        <section className={`intro-section ${region.type === "state" ? "state-intro" : ""}`}>
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
            <ResultsCard t={t} locale={locale} current={current} previous={previous} date={latestDate} partyDefinitions={activePartyDefinitions} />
          )}
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
                  <SelectControl label={t.display} value={mode} onChange={setMode} options={[
                    { value: "trend", label: t.trend },
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
                    { value: "all", label: t.fullArchive },
                  ]} />
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
                    items={activeEventCategories.map((category) => ({
                      id: category.id,
                      label: isGerman ? category.de : category.en,
                      description: isGerman ? category.deDescription : category.enDescription,
                    }))}
                    selected={selectedEventCategories}
                    onToggle={toggleEventCategory}
                  />
                </div>
              )}
              <div className="party-selector" aria-label={t.parties}>
                {activePartyDefinitions.map((party) => {
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
                displayEndDate={latestDate}
                partyDefinitions={activePartyDefinitions}
                events={activeEvents}
                eventCategories={activeEventCategories}
                electionResults={region.type === "federal" ? ELECTION_RESULTS : {}}
                termStart={termStart}
                archiveStart={archiveStart}
              />
              <div className="chart-footer">
                <DataAttribution
                  locale={locale}
                  metadata={pollData.metadata}
                  includeElection={region.type === "federal"}
                  electionSourceUrl={ELECTION_SOURCE_URL}
                />
                <div>
                  <a href={`/data/${region.slug}.json`} download={`pollframe-${region.slug}.json`}>{t.raw}<Icon name="external" size={15} /></a>
                  <button onClick={() => setMethodOpen(true)}>{t.methodology}<Icon name="info" size={15} /></button>
                </div>
              </div>
            </section>
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
            />
            <ParliamentProjection
              t={t}
              locale={locale}
              current={current}
              region={region}
              partyDefinitions={activePartyDefinitions}
            />
          </>
        )}
      </main>
      <SiteFooter t={t} onInfo={() => setMethodOpen(true)} sourceUrl={pollData ? DATA_SOURCE_URL : null} />
      {settings}
      {pollData && (
        <MethodModal
          open={methodOpen}
          onClose={() => setMethodOpen(false)}
          t={t}
          metadata={pollData.metadata}
          latestDate={latestDate}
          locale={locale}
          electionSourceUrl={region.type === "state" ? null : ELECTION_SOURCE_URL}
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
