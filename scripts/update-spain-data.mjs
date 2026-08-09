import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { load } from "cheerio/slim";

const WIKIPEDIA_PAGE = "Opinion_polling_for_the_next_Spanish_general_election";
const WIKIPEDIA_URL = `https://en.wikipedia.org/wiki/${WIKIPEDIA_PAGE}`;
const WIKIPEDIA_ARCHIVE_PAGES = [
  { page: "Opinion_polling_for_the_2000_Spanish_general_election", electionYear: 2000, tableCount: 1 },
  { page: "Opinion_polling_for_the_2004_Spanish_general_election", electionYear: 2004, tableCount: 1 },
  { page: "Opinion_polling_for_the_2008_Spanish_general_election", electionYear: 2008, tableCount: 1 },
  { page: "Opinion_polling_for_the_2011_Spanish_general_election", electionYear: 2011, tableCount: 1 },
  { page: "Opinion_polling_for_the_2015_Spanish_general_election", electionYear: 2015, tableCount: 5 },
  { page: "Opinion_polling_for_the_2016_Spanish_general_election", electionYear: 2016, tableCount: 1 },
  { page: "Opinion_polling_for_the_April_2019_Spanish_general_election", electionYear: 2019, tableCount: 4 },
  { page: "Opinion_polling_for_the_November_2019_Spanish_general_election", electionYear: 2019, tableCount: 1 },
  { page: "Nationwide_opinion_polling_for_the_2023_Spanish_general_election_(2019%E2%80%932021)", electionYear: 2021, tableCount: 3 },
  { page: "Nationwide_opinion_polling_for_the_2023_Spanish_general_election_(2022)", electionYear: 2022, tableCount: 1 },
  { page: "Opinion_polling_for_the_2023_Spanish_general_election", electionYear: 2023, tableCount: 3 },
];
const MAP_URL = "https://public.opendatasoft.com/api/explore/v2.1/catalog/datasets/georef-spain-comunidad-autonoma/exports/geojson?lang=en&timezone=Europe%2FMadrid";
const USER_AGENT = "PollframeDataUpdater/1.0 (public polling visualisation)";
const MAX_RESPONSE_BYTES = 15 * 1024 * 1024;

// Once an election is called, set SPAIN_ELECTION_DATE=YYYY-MM-DD in the
// updater workflow. Article 69.7 LOREG prohibits publishing/reproducing polls
// during the five days before voting; the updater then leaves the last legal
// snapshot untouched instead of fetching or writing a newer one.
const configuredElectionDate = process.env.SPAIN_ELECTION_DATE;
if (configuredElectionDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(configuredElectionDate)) throw new Error("SPAIN_ELECTION_DATE must use YYYY-MM-DD");
  const today = new Date().toISOString().slice(0, 10);
  const blackoutStart = new Date(Date.parse(`${configuredElectionDate}T00:00:00Z`) - (5 * 86_400_000)).toISOString().slice(0, 10);
  if (today >= blackoutStart && today <= configuredElectionDate) {
    console.log(`Spain: polling update skipped during the LOREG publication blackout (${blackoutStart}–${configuredElectionDate})`);
    process.exit(0);
  }
}

const PARTY_IDS = {
  PP: "401",
  PSOE: "402",
  Vox: "403",
  Sumar: "404",
  Podemos: "405",
  ERC: "406",
  Junts: "407",
  "EH Bildu": "408",
  PNV: "409",
  BNG: "410",
  CCa: "411",
  UPN: "412",
  "Adelante Andalucia": "413",
  SALF: "414",
  "Alianca.cat": "415",
  Other: "416",
  Ciudadanos: "417",
  IU: "418",
  UPyD: "419",
  "CiU / CDC": "420",
  Compromis: "421",
  CUP: "422",
  "Mas Pais": "423",
  PACMA: "424",
};
const PARTY_LABELS = Object.fromEntries(Object.entries(PARTY_IDS).map(([name, id]) => [id, name]));
PARTY_LABELS[PARTY_IDS.Podemos] = "Podemos / UP";
const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function clean(value) {
  return String(value ?? "").replace(/\[[^\]]*]/g, "").replace(/\s+/g, " ").trim();
}

function ascii(value) {
  return clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ç/gi, "c");
}

function safeUrl(value) {
  if (!value) return null;
  const url = new URL(value, "https://en.wikipedia.org");
  return ["http:", "https:"].includes(url.protocol) ? url.href : null;
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      headers: { "Api-User-Agent": USER_AGENT, Accept: "application/json,text/plain,*/*" },
      signal: controller.signal,
      redirect: "error",
    });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_RESPONSE_BYTES) throw new Error(`${url}: response is too large`);
    const text = await response.text();
    if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES) throw new Error(`${url}: response is too large`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function isoDate(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function parseFieldwork(value, fallbackYear) {
  const text = ascii(value).replace(/[–—]/g, "-");
  const parts = text.split("-").map((part) => part.trim());
  const endMatch = parts.at(-1)?.match(/(\d{1,2})\s+([A-Za-z]{3,9})(?:\s+(\d{4}))?/);
  if (!endMatch) return null;
  const endMonth = MONTHS[endMatch[2].slice(0, 3).toLowerCase()];
  const endYear = Number(endMatch[3] ?? fallbackYear);
  const end = isoDate(endYear, endMonth, Number(endMatch[1]));
  if (!end) return null;
  const startMatch = parts[0]?.match(/(\d{1,2})(?:\s+([A-Za-z]{3,9}))?(?:\s+(\d{4}))?/);
  if (!startMatch) return [end, end];
  const startMonth = MONTHS[(startMatch[2] ?? endMatch[2]).slice(0, 3).toLowerCase()];
  let startYear = Number(startMatch[3] ?? endYear);
  if (!startMatch[3] && startMonth > endMonth) startYear -= 1;
  const start = isoDate(startYear, startMonth, Number(startMatch[1]));
  return start && start <= end ? [start, end] : [end, end];
}

function partyFromHeader($, cell) {
  const name = ascii($(cell).find("img").attr("alt") || $(cell).find("a").attr("title") || $(cell).text());
  const aliases = [
    [/^People's Party|^PP$/i, "PP"], [/Spanish Socialist|^PSOE$/i, "PSOE"], [/^Vox$/i, "Vox"],
    [/^Sumar/i, "Sumar"], [/^Podemos|Unidas Podemos|Unidos Podemos/i, "Podemos"], [/Republican Left|^ERC(?:\b|[–-])/i, "ERC"],
    [/Together for Catalonia|^Junts$|^JxCat$/i, "Junts"], [/EH Bildu/i, "EH Bildu"],
    [/Basque Nationalist|^PNV$/i, "PNV"], [/Galician Nationalist|^BNG$/i, "BNG"],
    [/Canarian Coalition|^CCa$/i, "CCa"], [/Navarrese|^UPN$/i, "UPN"],
    [/Adelante Andalucia/i, "Adelante Andalucia"], [/Se Acabo La Fiesta|^SALF$/i, "SALF"],
    [/Catalan Alliance|Alianca\.cat/i, "Alianca.cat"],
    [/^Cs$|^C's$|Ciudadanos/i, "Ciudadanos"], [/^IU(?:\b|[–-])|United Left/i, "IU"],
    [/^UPyD$|Union, Progress and Democracy/i, "UPyD"],
    [/^CiU$|Convergence and Union|^PDeCAT$|^DiL$|Democracy and Freedom/i, "CiU / CDC"],
    [/Compromis/i, "Compromis"], [/^CUP$/i, "CUP"], [/Mas Pais/i, "Mas Pais"], [/^PACMA$/i, "PACMA"],
  ];
  return PARTY_IDS[aliases.find(([pattern]) => pattern.test(name))?.[1]] ?? null;
}

function numericVote($, cell) {
  const clone = $(cell).clone();
  clone.find("span,small,sup").remove();
  const match = clean(clone.text()).replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function pollsterIdentity(value) {
  const raw = clean(value);
  const organisation = raw.split("/")[0].replace(/\s*\([^)]*\)\s*$/, "").trim();
  const aliases = {
    "EM-Analytics": "EM-Analytics", InvyMark: "Invymark", SocioMétrica: "Sociométrica",
    "Opina 360": "Opina360", "Simple Lógica": "Simple Lógica",
  };
  return aliases[organisation] ?? organisation;
}

function sourceForRow($, row, pageUrl) {
  const reference = $(row).find("sup.reference a").first().attr("href");
  if (!reference?.startsWith("#")) return pageUrl;
  const note = $(reference);
  const external = note.find("a.external").first().attr("href");
  return safeUrl(external) ?? pageUrl;
}

const polls = [];
const pollsterNames = new Set();
const archiveSources = [];

function parsePollingTable($, table, year, pageUrl) {
  const headerCells = $(table).find("tr").first().children("th,td").toArray();
  const partyColumns = new Map();
  headerCells.forEach((cell, index) => {
    const partyId = partyFromHeader($, cell);
    if (partyId) partyColumns.set(index, partyId);
  });
  $(table).find("tr").slice(2).each((_, row) => {
    const cells = $(row).children("td").toArray();
    if (cells.length < 8) return;
    const pollsterLabel = clean($(cells[0]).clone().find("sup").remove().end().text()).slice(0, 100);
    const pollster = pollsterIdentity(pollsterLabel);
    if (!pollster || /election|referendum|^Sumar$/i.test(pollster)) return;
    const fieldwork = parseFieldwork($(cells[1]).text(), year);
    if (!fieldwork || fieldwork[1] > new Date().toISOString().slice(0, 10)) return;
    const sampleText = clean($(cells[2]).text()).replace(/[^\d]/g, "");
    const sample = Number(sampleText);
    const results = {};
    for (const [column, partyId] of partyColumns) {
      const value = numericVote($, cells[column]);
      if (Number.isFinite(value)) results[partyId] = value;
    }
    const total = Object.values(results).reduce((sum, value) => sum + value, 0);
    if (Object.keys(results).length < 4 || total < 65 || total > 105) return;
    pollsterNames.add(pollster);
    polls.push({
      date: fieldwork[1],
      fieldwork,
      sample: Number.isInteger(sample) && sample >= 100 ? sample : null,
      pollster,
      method: pollsterLabel === pollster ? "Published national voting-intention poll" : `Published national voting-intention poll · ${pollsterLabel}`,
      results,
      sourceUrl: sourceForRow($, row, pageUrl),
    });
  });
}

function yearForTable($, table, fallbackYear) {
  const label = $(table).prevAll("div").map((_, node) => clean($(node).text())).get()
    .find((value) => /^(?:19|20)\d{2}(?:\b|\s|\()/i.test(value));
  const year = Number(label?.match(/(?:19|20)\d{2}/)?.[0] ?? fallbackYear);
  return Number.isInteger(year) ? year : fallbackYear;
}

async function fetchWikipediaPage(page, attempts = 4) {
  const apiUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${page}&prop=text&format=json&formatversion=2`;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const body = await fetchText(apiUrl);
    try {
      const payload = JSON.parse(body);
      if (typeof payload?.parse?.text !== "string") throw new Error("missing rendered HTML");
      return load(payload.parse.text);
    } catch (error) {
      if (attempt === attempts) throw new Error(`${page}: invalid Wikipedia API response (${error.message})`);
      await new Promise((resolveWait) => setTimeout(resolveWait, attempt * 2_000));
    }
  }
  throw new Error(`${page}: unavailable`);
}

const currentPage = await fetchWikipediaPage(WIKIPEDIA_PAGE);
currentPage("table.wikitable").slice(0, 4).each((tableIndex, table) => {
  const year = yearForTable(currentPage, table, tableIndex === 0 ? new Date().getUTCFullYear() : NaN);
  if (Number.isInteger(year)) parsePollingTable(currentPage, table, year, WIKIPEDIA_URL);
});
archiveSources.push(WIKIPEDIA_URL);

for (const { page, electionYear, tableCount } of WIKIPEDIA_ARCHIVE_PAGES) {
  await new Promise((resolveWait) => setTimeout(resolveWait, 800));
  const pageUrl = `https://en.wikipedia.org/wiki/${page}`;
  const $ = await fetchWikipediaPage(page);
  const nationalTables = $("table.wikitable").filter((_, table) => /Polling firm/i.test($(table).find("tr").first().text())).slice(0, tableCount);
  if (nationalTables.length !== tableCount) throw new Error(`${page}: expected ${tableCount} national polling tables, found ${nationalTables.length}`);
  nationalTables.each((_, table) => parsePollingTable($, table, yearForTable($, table, electionYear), pageUrl));
  archiveSources.push(pageUrl);
}

const sortedNames = [...pollsterNames].sort((a, b) => a.localeCompare(b, "es"));
const pollsterIds = Object.fromEntries(sortedNames.map((name, index) => [name, String(index + 1)]));
const deduplicated = new Map();
for (const poll of polls) {
  poll.pollster = pollsterIds[poll.pollster];
  const key = `${poll.date}|${poll.pollster}|${JSON.stringify(poll.results)}`;
  deduplicated.set(key, poll);
}
const cleanPolls = [...deduplicated.values()].sort((a, b) => a.date.localeCompare(b.date) || a.pollster.localeCompare(b.pollster));
if (cleanPolls.length < 1_500) throw new Error(`Only ${cleanPolls.length} valid Spain polls parsed`);

const now = new Date().toISOString();
const pollData = {
  metadata: {
    source: "Wikipedia contributors · cited polling organisations",
    sourceUrl: WIKIPEDIA_URL,
    archiveSourceUrls: archiveSources,
    license: "CC BY-SA 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    databaseUpdated: `${cleanPolls.at(-1).date}T00:00:00.000Z`,
    generatedAt: now,
    derivativeDatabaseNotice: "Pollframe extracts and normalises cited Spanish voting-intention tables and links each row to its original publication where available.",
    changes: "Dates normalised to ISO format; seat ranges removed; successor-party series kept separate except Podemos/UP; invalid and future rows rejected.",
    attribution: "Wikipedia contributors, Spanish general-election polling archive pages, CC BY-SA 4.0; individual poll publications remain linked per row.",
    region: { slug: "spain-congress", name: "España", type: "spain-federal" },
    geographyNote: "National voting intention for elections to the Congreso de los Diputados.",
    defaultPollsters: Object.values(pollsterIds),
    publicationBlackoutDays: 5,
    publicationBlackoutSource: "https://www.boe.es/buscar/act.php?id=BOE-A-1985-11672#a69",
    electionResults: {
      "2000-03-12": { "401": 44.5, "402": 34.2, "418": 5.5, "420": 4.2, "409": 1.5, "406": 0.8, "410": 0.8, "416": 8.5 },
      "2004-03-14": { "401": 37.7, "402": 42.6, "418": 5.0, "420": 3.2, "406": 2.5, "409": 1.6, "410": 0.8, "416": 6.6 },
      "2008-03-09": { "401": 39.9, "402": 43.9, "418": 3.8, "420": 3.0, "409": 1.2, "406": 1.2, "410": 0.8, "419": 1.2, "416": 5.0 },
      "2011-11-20": { "401": 44.6, "402": 28.8, "418": 6.9, "420": 4.2, "419": 4.7, "409": 1.3, "406": 1.1, "410": 0.8, "416": 7.6 },
      "2015-12-20": { "401": 28.7, "402": 22.0, "405": 20.7, "417": 13.9, "418": 3.7, "406": 2.4, "420": 2.3, "409": 1.2, "408": 0.9, "416": 4.2 },
      "2016-06-26": { "401": 33.0, "402": 22.6, "405": 21.2, "417": 13.1, "406": 2.6, "420": 2.0, "409": 1.2, "408": 0.8, "416": 3.5 },
      "2019-04-28": { "401": 16.7, "402": 28.7, "403": 10.3, "405": 14.3, "417": 15.9, "406": 3.9, "420": 1.9, "409": 1.5, "408": 1.0, "416": 4.8 },
      "2019-11-10": { "401": 20.8, "402": 28.0, "403": 15.1, "405": 12.9, "406": 3.6, "407": 2.2, "408": 1.1, "409": 1.6, "410": 0.5, "411": 0.5, "412": 0.5, "416": 13.2 },
      "2023-07-23": { "401": 33.1, "402": 31.7, "403": 12.4, "404": 12.3, "406": 1.9, "407": 1.6, "408": 1.4, "409": 1.1, "410": 0.6, "411": 0.5, "412": 0.2, "416": 3.2 },
    },
    electionSourceUrl: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/procesos-electorales/",
    electionSourceLabel: "Ministerio del Interior",
  },
  pollsters: Object.fromEntries(Object.entries(pollsterIds).map(([name, id]) => [id, name])),
  parties: PARTY_LABELS,
  polls: cleanPolls,
};

const latestDate = cleanPolls.at(-1).date;
const latestPollsters = new Map();
for (const poll of cleanPolls.filter((item) => item.date >= new Date(Date.parse(`${latestDate}T00:00:00Z`) - 45 * 86_400_000).toISOString().slice(0, 10))) {
  latestPollsters.set(poll.pollster, poll);
}
const currentResults = {};
for (const partyId of Object.keys(PARTY_LABELS)) {
  const values = [...latestPollsters.values()].map((poll) => poll.results[partyId]).filter(Number.isFinite);
  if (values.length) currentResults[partyId] = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}
const summary = {
  metadata: {
    source: pollData.metadata.source,
    sourceUrl: WIKIPEDIA_URL,
    license: pollData.metadata.license,
    licenseUrl: pollData.metadata.licenseUrl,
    generatedAt: now,
  },
  congress: {
    pollCount: cleanPolls.length,
    firstDate: cleanPolls[0].date,
    latestDate,
    pollsterCount: sortedNames.length,
    current: { date: latestDate, instituteCount: latestPollsters.size, results: currentResults },
    lastElection: {
      date: "2023-07-23",
      sourceUrl: pollData.metadata.electionSourceUrl,
      results: pollData.metadata.electionResults["2023-07-23"],
    },
  },
  issues: {
    date: "2026-04-01",
    source: "CIS April 2026 barometer",
    sourceUrl: "https://www.cis.es/es/w/vivienda-preocupacion-barometro-abril-2026",
    question: "Principales problemas de España · respuesta espontánea, hasta tres menciones",
    items: [
      { id: "housing", label: "Vivienda", value: 41.3, color: "#805ad5" },
      { id: "economy", label: "Crisis económica", value: 24.9, color: "#dd6b20" },
      { id: "jobs", label: "Calidad del empleo", value: 19.2, color: "#2b6cb0" },
    ],
    note: "Los porcentajes no suman 100: cada persona podía mencionar hasta tres problemas.",
  },
};

let mapData = null;
try {
  mapData = JSON.parse(await fetchText(MAP_URL));
  if (mapData?.type !== "FeatureCollection" || !Array.isArray(mapData.features) || mapData.features.length < 17) {
    throw new Error("Autonomous-community map is incomplete");
  }
  mapData.attribution = {
    source: "BDLJE · Instituto Geográfico Nacional via Opendatasoft georef",
    sourceUrl: "https://public.opendatasoft.com/explore/dataset/georef-spain-comunidad-autonoma/",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    generatedAt: now,
  };
} catch (error) {
  console.warn(`Spain map was not updated: ${error.message}`);
}

await writeFile(resolve("public/data/spain-congress.json"), `${JSON.stringify(pollData)}\n`);
await writeFile(resolve("public/spain-summary.json"), `${JSON.stringify(summary)}\n`);
if (mapData) await writeFile(resolve("public/data/spain-autonomies.geojson"), `${JSON.stringify(mapData)}\n`);
console.log(`Spain: wrote ${cleanPolls.length} polls from ${sortedNames.length} organisations (${cleanPolls[0].date} to ${latestDate})`);
