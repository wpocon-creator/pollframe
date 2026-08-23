import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const TRUSTED_SOURCE_URL = "https://dawum.de/API/";
const TRUSTED_LICENSE_URL = "https://opendatacommons.org/licenses/odbl/1-0/";
const MAX_JSON_BYTES = 5 * 1024 * 1024;
const errors = [];
const addError = (message) => {
  if (errors.length < 40) errors.push(message);
};

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value, maxLength = 100) {
  return (
    typeof value === "string"
    && value.length > 0
    && value.length <= maxLength
    && !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

function realIsoDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

const containsWithheldSource = (value) => /\b(?:ipsos|mori)\b/i.test(JSON.stringify(value));

async function readJson(relativePath) {
  const path = resolve(relativePath);
  const file = await stat(path);
  if (!file.isFile() || file.size > MAX_JSON_BYTES) {
    throw new Error(`${relativePath} is not a regular JSON file below ${MAX_JSON_BYTES} bytes`);
  }
  const parsed = JSON.parse(await readFile(path, "utf8"));
  if (!isRecord(parsed)) throw new Error(`${relativePath} does not contain a JSON object`);
  return parsed;
}

function validateMetadata(metadata, prefix) {
  if (metadata?.source !== "dawum.de") addError(`${prefix} source is not dawum.de`);
  if (metadata?.sourceUrl !== TRUSTED_SOURCE_URL) addError(`${prefix} source URL is not trusted`);
  if (metadata?.license !== "ODC-ODbL") addError(`${prefix} database license is not ODC-ODbL`);
  if (metadata?.licenseUrl !== TRUSTED_LICENSE_URL) addError(`${prefix} license URL is not trusted`);
  if (!Number.isFinite(Date.parse(metadata?.databaseUpdated))) addError(`${prefix} database timestamp is invalid`);
  if (!Number.isFinite(Date.parse(metadata?.generatedAt))) addError(`${prefix} generation timestamp is invalid`);
  if (!safeText(metadata?.derivativeDatabaseNotice, 300)) addError(`${prefix} derivative database notice is missing`);
  if (!safeText(metadata?.changes, 300)) addError(`${prefix} transformation notice is missing`);
}

const summary = await readJson("public/regions.json");
const stateMap = await readJson("public/state-map-data.json");
validateMetadata(summary.metadata, "summary");
validateMetadata(stateMap.metadata, "state map");
if (!Array.isArray(summary.regions) || summary.regions.length !== 17) {
  addError("summary must contain Germany and all 16 states");
}
if (!Array.isArray(stateMap.regions) || stateMap.regions.length !== 16) {
  addError("state map snapshot must contain all 16 states");
}

for (const region of summary.regions ?? []) {
  if (!safeText(region.name, 100) || !/^[a-z0-9-]{2,40}$/.test(region.slug ?? "")) {
    addError("summary contains an unsafe region identity");
    continue;
  }
  const data = await readJson(`public/data/${region.slug}.json`);
  const prefix = region.name;
  validateMetadata(data.metadata, prefix);
  if (data.metadata?.region?.slug !== region.slug) addError(`${prefix}: region metadata mismatch`);
  if (!Array.isArray(data.polls)) addError(`${prefix}: polls is not an array`);
  if (!isRecord(data.pollsters)) addError(`${prefix}: pollsters map is missing`);
  if (!isRecord(data.parties)) addError(`${prefix}: parties map is missing`);
  if (!Array.isArray(data.polls)) continue;
  if (data.polls.length > 10_000) addError(`${prefix}: archive is unexpectedly large`);

  for (const [id, name] of Object.entries(data.pollsters ?? {})) {
    if (!/^\d{1,4}$/.test(id) || !safeText(name, 100)) addError(`${prefix}: unsafe pollster metadata`);
    if (containsWithheldSource(name)) addError(`${prefix}: withheld pollster is still published`);
  }
  for (const [id, name] of Object.entries(data.parties ?? {})) {
    if (!/^\d{1,4}$/.test(id) || !safeText(name, 40)) addError(`${prefix}: unsafe party metadata`);
  }

  const minimum = region.type === "federal" ? 2_000 : 15;
  if (data.polls.length < minimum) addError(`${prefix}: archive contains only ${data.polls.length} polls`);
  if (data.polls.length !== region.pollCount) addError(`${prefix}: summary poll count differs`);

  let previousDate = "";
  for (const [index, poll] of data.polls.entries()) {
    const label = `${prefix} poll ${index + 1}`;
    if (!realIsoDate(poll.date)) addError(`${label} has an invalid publication date`);
    if (poll.date < previousDate) addError(`${label} is out of chronological order`);
    previousDate = poll.date;
    if (!data.pollsters?.[poll.pollster]) addError(`${label} uses unknown pollster ${poll.pollster}`);
    if (
      !Array.isArray(poll.fieldwork)
      || poll.fieldwork.length !== 2
      || poll.fieldwork.some((date) => !realIsoDate(date))
    ) {
      addError(`${label} has invalid fieldwork dates`);
    } else if (poll.fieldwork[0] > poll.fieldwork[1] || poll.fieldwork[1] > poll.date) {
      addError(`${label} has implausible fieldwork dates`);
    }
    if (poll.sample !== null && (!Number.isInteger(poll.sample) || poll.sample < 100 || poll.sample > 10_000_000)) {
      addError(`${label} has an implausible sample size`);
    }
    if (!safeText(poll.method, 100)) addError(`${label} has unsafe method metadata`);
    const entries = Object.entries(poll.results ?? {});
    if (entries.length < 5 || entries.length > 50) addError(`${label} has an invalid number of party results`);
    for (const [partyId, value] of entries) {
      if (!/^\d{1,4}$/.test(partyId)) addError(`${label} uses an invalid party ID`);
      if (!data.parties?.[partyId]) addError(`${label} uses unknown party ${partyId}`);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        addError(`${label} has an invalid result for party ${partyId}`);
      }
    }
    const total = entries.reduce((sum, [, value]) => sum + value, 0);
    if (total < 94 || total > 103) addError(`${label} has an implausible result total of ${total}`);
  }
  if (data.polls[0]?.date !== region.firstDate || data.polls.at(-1)?.date !== region.latestDate) {
    addError(`${prefix}: summary date range differs`);
  }
}

const federal = await readJson("public/poll-data.json");
if (federal.metadata?.region?.slug !== "bundestag") {
  addError("legacy federal data file does not contain Bundestag data");
}

const uk = await readJson("public/data/uk-westminster.json");
const ukRaw = await readJson("public/data/uk-westminster-polls.json");
const ukSummary = await readJson("public/uk-summary.json");
if (uk.metadata?.source !== "UK Election Data Vault") addError("UK source identity is invalid");
if (uk.metadata?.sourceUrl !== "https://electiondatavault.co.uk/data/") addError("UK source URL is invalid");
if (uk.metadata?.licenseUrl !== "https://electiondatavault.co.uk/about/") addError("UK reuse statement URL is invalid");
if (uk.metadata?.region?.slug !== "uk-westminster") addError("UK region metadata is invalid");
if (!Array.isArray(uk.polls) || uk.polls.length < 500 || uk.polls.length > 6_000) addError("UK weighted archive size is implausible");
if (!Array.isArray(ukRaw.polls) || ukRaw.polls.length < 4_000 || ukRaw.polls.length > 10_000) addError("UK individual-poll archive size is implausible");
if (!isRecord(uk.pollsters) || !isRecord(uk.parties)) addError("UK metadata maps are missing");
if (containsWithheldSource(uk) || containsWithheldSource(ukRaw)) addError("UK polling files still contain identifiable withheld-source polls");
if (!Array.isArray(uk.metadata?.defaultPollsters) || uk.metadata.defaultPollsters[0] !== uk.metadata.weightedAveragePollsterId) addError("UK weighted default is not configured");
let previousUkDate = "";
const combinedUkPolls = [...(uk.polls ?? []), ...(ukRaw.polls ?? [])].sort((a, b) => a.date.localeCompare(b.date));
for (const [index, poll] of combinedUkPolls.entries()) {
  const label = `UK poll ${index + 1}`;
  if (!realIsoDate(poll.date) || poll.date < previousUkDate) addError(`${label} date is invalid or unordered`);
  previousUkDate = poll.date;
  if (!uk.pollsters[poll.pollster]) addError(`${label} uses an unknown pollster`);
  if (!Array.isArray(poll.fieldwork) || poll.fieldwork.length !== 2 || poll.fieldwork.some((date) => !realIsoDate(date))) addError(`${label} fieldwork is invalid`);
  if (poll.sample !== null && (!Number.isInteger(poll.sample) || poll.sample < 100 || poll.sample > 10_000_000)) addError(`${label} sample is implausible`);
  if (!safeText(poll.method, 160)) addError(`${label} method is unsafe`);
  const values = Object.values(poll.results ?? {});
  if (values.length < 2 || values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) addError(`${label} results are invalid`);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total < 75 || total > 112) addError(`${label} result total is implausible: ${total}`);
}
if (ukSummary.westminster?.latestDate !== uk.polls.at(-1)?.date || ukSummary.westminster?.firstDate !== uk.polls[0]?.date) addError("UK summary date range differs");
if (!isRecord(ukSummary.map?.areas) || Object.keys(ukSummary.map.areas).length < 40) addError("UK regional map data is incomplete");
if ("issuesIndex" in ukSummary || "personalIssues" in ukSummary || "economicPerceptions" in ukSummary || containsWithheldSource(ukSummary)) addError("UK summary still publishes withheld direct survey modules");

const spain = await readJson("public/data/spain-congress.json");
const spainSummary = await readJson("public/spain-summary.json");
const spainMap = await readJson("public/data/spain-autonomies.geojson");
const spainRegions = await readJson("public/data/spain-regions.json");
if (spain.metadata?.source !== "Wikipedia contributors · cited polling organisations") addError("Spain source identity is invalid");
if (spain.metadata?.license !== "CC BY-SA 4.0" || spain.metadata?.licenseUrl !== "https://creativecommons.org/licenses/by-sa/4.0/") addError("Spain reuse licence is invalid");
if (spain.metadata?.region?.slug !== "spain-congress") addError("Spain region metadata is invalid");
if (!Array.isArray(spain.polls) || spain.polls.length < 3_000 || spain.polls.length > 5_000) addError("Spain polling archive size is implausible");
if (spain.polls?.[0]?.date > "1997-01-01") addError("Spain historical archive does not reach the 1996–2000 cycle");
if (!Array.isArray(spain.metadata?.archiveSourceUrls) || spain.metadata.archiveSourceUrls.length < 10) addError("Spain archive source attribution is incomplete");
if (!isRecord(spain.pollsters) || Object.keys(spain.pollsters).length < 10 || !isRecord(spain.parties)) addError("Spain metadata maps are incomplete");
if (containsWithheldSource(spain)) addError("Spain national polling file still contains withheld-source polls");
if (containsWithheldSource(spainRegions)) addError("Spain regional polling file still contains withheld-source polls");
let previousSpainDate = "";
for (const [index, poll] of (spain.polls ?? []).entries()) {
  const label = `Spain poll ${index + 1}`;
  if (!realIsoDate(poll.date) || poll.date < previousSpainDate) addError(`${label} date is invalid or unordered`);
  previousSpainDate = poll.date;
  if (!spain.pollsters[poll.pollster]) addError(`${label} uses an unknown pollster`);
  if (!Array.isArray(poll.fieldwork) || poll.fieldwork.length !== 2 || poll.fieldwork.some((date) => !realIsoDate(date)) || poll.fieldwork[0] > poll.fieldwork[1]) addError(`${label} fieldwork is invalid`);
  if (poll.sample !== null && (!Number.isInteger(poll.sample) || poll.sample < 100 || poll.sample > 10_000_000)) addError(`${label} sample is implausible`);
  if (!safeText(poll.method, 160)) addError(`${label} method is unsafe`);
  if (typeof poll.sourceUrl !== "string" || !/^https?:\/\//.test(poll.sourceUrl)) addError(`${label} source URL is missing`);
  const values = Object.values(poll.results ?? {});
  if (values.length < 4 || values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) addError(`${label} results are invalid`);
  const total = values.reduce((sum, value) => sum + value, 0);
  if (total < 65 || total > 105) addError(`${label} result total is implausible: ${total}`);
}
if (spainSummary.congress?.latestDate !== spain.polls.at(-1)?.date || spainSummary.congress?.firstDate !== spain.polls[0]?.date) addError("Spain summary date range differs");
if (spainSummary.congress?.lastElection?.date !== "2023-07-23" || !isRecord(spainSummary.congress?.lastElection?.results) || spainSummary.congress.lastElection.results["401"] !== spain.metadata?.electionResults?.["2023-07-23"]?.["401"]) addError("Spain comparison baseline is missing or inconsistent");
if (!Array.isArray(spainSummary.issues?.items) || spainSummary.issues.items.length < 3 || !/^https:\/\/www\.cis\.es\//.test(spainSummary.issues?.sourceUrl ?? "")) addError("Spain CIS issue snapshot is incomplete");
if (spainMap.type !== "FeatureCollection" || !Array.isArray(spainMap.features) || spainMap.features.length < 19) addError("Spain autonomous-community map is incomplete");
const approval = await readJson("public/data/approval.json");
if (approval.countries?.uk || containsWithheldSource(approval)) addError("approval data still contains the withheld UK series");
for (const country of ["de", "es"]) {
  const dataset = approval.countries?.[country];
  if (!dataset || !Array.isArray(dataset.administrations) || !/^https:\/\//.test(dataset.source?.href ?? "") || !safeText(dataset.questions?.government, 300) || !safeText(dataset.questions?.leader, 300)) addError(`${country}: approval metadata is incomplete`);
  for (const metric of ["government", "leader"]) {
    const points = dataset?.series?.[metric];
    if (!Array.isArray(points) || points.length < (country === "de" && metric === "government" ? 100 : 120)) {
      addError(`${country}/${metric}: approval series is too short`);
      continue;
    }
    let previousDate = "";
    const dates = new Set();
    for (const point of points) {
      if (!realIsoDate(point.date) || point.date < previousDate || !Number.isFinite(point.positive) || point.positive < 0 || point.positive > 100 || (point.negative !== null && (!Number.isFinite(point.negative) || point.negative < 0 || point.negative > 100)) || !safeText(point.leader, 100)) addError(`${country}/${metric}: invalid approval point at ${point.date ?? "unknown"}`);
      if (dates.has(point.date)) addError(`${country}/${metric}: duplicate approval point at ${point.date}`);
      dates.add(point.date);
      if (point.date > new Date().toISOString().slice(0, 10)) addError(`${country}/${metric}: future approval point at ${point.date}`);
      if (Number.isFinite(point.negative) && point.positive + point.negative > 100.01) addError(`${country}/${metric}: answer shares exceed 100 at ${point.date}`);
      previousDate = point.date;
    }
  }
}
if (approval.countries?.de?.series?.leader?.at(-1)?.date < "2026-07-31") addError("German approval update regressed behind the verified July 2026 release");
if (!Array.isArray(approval.events) || approval.events.length < 8) addError("approval event context is too sparse");
for (const event of approval.events ?? []) {
  if (!realIsoDate(event.date) || !["de", "es"].includes(event.country) || !safeText(event.labelEn, 160) || !safeText(event.labelDe, 160) || !safeText(event.labelEs, 160) || !/^https:\/\//.test(event.source ?? "")) addError(`invalid approval event at ${event.date ?? "unknown"}`);
}
for (const region of stateMap.regions ?? []) {
  if (
    !/^[a-z]{2}$/.test(region.mapId ?? "")
    || !/^[a-z0-9-]{2,40}$/.test(region.slug ?? "")
    || !realIsoDate(region.latestDate)
    || !safeText(region.name, 100)
  ) {
    addError(`state map entry ${region.name ?? "unknown"} is incomplete`);
  }
  if (!region.current?.instituteCount || !Object.keys(region.current?.results ?? {}).length) {
    addError(`${region.name}: state map current average is missing`);
  }
  for (const [partyId, value] of Object.entries(region.current?.results ?? {})) {
    if (!/^\d{1,4}$/.test(partyId) || !Number.isFinite(value) || value < 0 || value > 100) {
      addError(`${region.name}: state map contains an invalid current result`);
    }
  }
  for (const [partyId, value] of Object.entries(region.movement?.results ?? {})) {
    if (!/^\d{1,4}$/.test(partyId) || !Number.isFinite(value) || value < -100 || value > 100) {
      addError(`${region.name}: state map contains an invalid movement result`);
    }
  }
}
if (errors.length) {
  throw new Error(`Polling data validation failed:\n- ${errors.join("\n- ")}`);
}
console.log(
  `Validated ${summary.regions.length} regions and ${
    summary.regions.reduce((sum, region) => sum + region.pollCount, 0)
  } German polls, ${combinedUkPolls.length} UK records and ${spain.polls.length} Spanish polls`,
);
