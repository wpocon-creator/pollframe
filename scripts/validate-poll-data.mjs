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
  } polls`,
);
