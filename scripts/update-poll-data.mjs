import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createStateMapData } from "./build-state-map-data.mjs";

const TRUSTED_REMOTE_SOURCE = "https://api.dawum.de/";
const TRUSTED_SOURCE_URL = "https://dawum.de/API/";
const TRUSTED_LICENSE_URL = "https://opendatacommons.org/licenses/odbl/1-0/";
const DERIVATIVE_NOTICE = "Derived from the dawum.de election polling database. This derivative Pollframe database is made available under the Open Database License (ODbL) 1.0.";
const DERIVATIVE_CHANGES = "Filtered to seven selected institutes and records from 2017; fields normalised and renamed; records split by parliament; Pollframe averages and state movements calculated separately. Polls from a rights-pending source are temporarily excluded.";
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const MAX_SURVEYS = 100_000;
const MAX_RESULTS_PER_SURVEY = 50;

const argumentsList = process.argv.slice(2);
const sourceLocation = argumentsList.find((argument) => !argument.startsWith("--"))
  ?? TRUSTED_REMOTE_SOURCE;
const forceUpdate = argumentsList.includes("--force");
const checkOnly = argumentsList.includes("--check-only");
const isRemoteSource = /^https?:\/\//i.test(sourceLocation);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeText(value, label, maxLength = 100) {
  if (
    typeof value !== "string"
    || !value.length
    || value.length > maxLength
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new Error(`${label} is not a safe text value`);
  }
  return value;
}

function isoDate(value, label) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} is not an ISO date`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} is not a real calendar date`);
  }
  return value;
}

async function parseLimitedResponse(response) {
  if (!response.ok) throw new Error(`DAWUM request failed with HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!/^application\/json(?:;|$)/i.test(contentType)) {
    throw new Error(`DAWUM returned an unexpected content type: ${contentType || "missing"}`);
  }
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_SOURCE_BYTES) {
    throw new Error(`DAWUM response is too large: ${declaredLength} bytes`);
  }
  if (!response.body) throw new Error("DAWUM response has no body");

  const chunks = [];
  const reader = response.body.getReader();
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new Error(`DAWUM response exceeds ${MAX_SOURCE_BYTES} bytes`);
    }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks, total).toString("utf8"));
}

async function loadSource() {
  if (isRemoteSource) {
    if (sourceLocation !== TRUSTED_REMOTE_SOURCE) {
      throw new Error(`Remote polling source is not allowlisted: ${sourceLocation}`);
    }
    const response = await fetch(TRUSTED_REMOTE_SOURCE, {
      headers: { Accept: "application/json" },
      redirect: "error",
      signal: AbortSignal.timeout(30_000),
    });
    return parseLimitedResponse(response);
  }

  const localPath = resolve(sourceLocation);
  const file = await stat(localPath);
  if (!file.isFile() || file.size > MAX_SOURCE_BYTES) {
    throw new Error(`Local polling source is not a regular file below ${MAX_SOURCE_BYTES} bytes`);
  }
  return JSON.parse(await readFile(localPath, "utf8"));
}

const source = await loadSource();

const includedInstituteIds = new Set(["1", "2", "3", "5", "6", "9", "13"]);
const REGION_CONFIG = [
  { id: "0", slug: "bundestag", mapId: null, type: "federal", name: "Deutschland", parliament: "Bundestag" },
  { id: "1", slug: "baden-wuerttemberg", mapId: "bw", type: "state", name: "Baden-Württemberg", parliament: "Landtag" },
  { id: "2", slug: "bayern", mapId: "by", type: "state", name: "Bayern", parliament: "Landtag" },
  { id: "3", slug: "berlin", mapId: "be", type: "state", name: "Berlin", parliament: "Abgeordnetenhaus" },
  { id: "4", slug: "brandenburg", mapId: "bb", type: "state", name: "Brandenburg", parliament: "Landtag" },
  { id: "5", slug: "bremen", mapId: "hb", type: "state", name: "Bremen", parliament: "Bürgerschaft" },
  { id: "6", slug: "hamburg", mapId: "hh", type: "state", name: "Hamburg", parliament: "Bürgerschaft" },
  { id: "7", slug: "hessen", mapId: "he", type: "state", name: "Hessen", parliament: "Landtag" },
  { id: "8", slug: "mecklenburg-vorpommern", mapId: "mv", type: "state", name: "Mecklenburg-Vorpommern", parliament: "Landtag" },
  { id: "9", slug: "niedersachsen", mapId: "ni", type: "state", name: "Niedersachsen", parliament: "Landtag" },
  { id: "10", slug: "nordrhein-westfalen", mapId: "nw", type: "state", name: "Nordrhein-Westfalen", parliament: "Landtag" },
  { id: "11", slug: "rheinland-pfalz", mapId: "rp", type: "state", name: "Rheinland-Pfalz", parliament: "Landtag" },
  { id: "12", slug: "saarland", mapId: "sl", type: "state", name: "Saarland", parliament: "Landtag" },
  { id: "13", slug: "sachsen", mapId: "sn", type: "state", name: "Sachsen", parliament: "Landtag" },
  { id: "14", slug: "sachsen-anhalt", mapId: "st", type: "state", name: "Sachsen-Anhalt", parliament: "Landtag" },
  { id: "15", slug: "schleswig-holstein", mapId: "sh", type: "state", name: "Schleswig-Holstein", parliament: "Landtag" },
  { id: "16", slug: "thueringen", mapId: "th", type: "state", name: "Thüringen", parliament: "Landtag" },
];

for (const key of ["Database", "Surveys", "Institutes", "Methods", "Parties"]) {
  if (!isRecord(source[key])) {
    throw new Error(`DAWUM response is missing the ${key} block`);
  }
}
const sourceSurveys = Object.values(source.Surveys);
if (sourceSurveys.length > MAX_SURVEYS) {
  throw new Error(`DAWUM response contains too many surveys: ${sourceSurveys.length}`);
}
if (source.Database.License?.Shortcut !== "ODC-ODbL") {
  throw new Error(`Unexpected database license: ${source.Database.License?.Shortcut ?? "missing"}`);
}
safeText(source.Database.Last_Update, "Database.Last_Update", 64);
if (!Number.isFinite(Date.parse(source.Database.Last_Update))) {
  throw new Error("Database.Last_Update is not a valid timestamp");
}
for (const id of includedInstituteIds) {
  safeText(source.Institutes[id]?.Name, `Institute ${id}`, 100);
}

const generatedAt = new Date().toISOString();
const databaseReferenceDate = new Date(source.Database.Last_Update ?? generatedAt);
const referenceTime = Number.isFinite(databaseReferenceDate.getTime())
  ? databaseReferenceDate.getTime()
  : Date.now();

function makeRegionData(region) {
  const regionSurveys = sourceSurveys
    .filter((survey) => (
      isRecord(survey)
      && survey.Parliament_ID === region.id
      && survey.Date >= "2017-01-01"
      && includedInstituteIds.has(survey.Institute_ID)
    ))
    .sort((a, b) => a.Date.localeCompare(b.Date));
  for (const [index, survey] of regionSurveys.entries()) {
    const label = `${region.name} source survey ${index + 1}`;
    isoDate(survey.Date, `${label} publication date`);
    if (!isRecord(survey.Survey_Period)) throw new Error(`${label} has no fieldwork period`);
    const fieldworkStart = isoDate(survey.Survey_Period.Date_Start, `${label} fieldwork start`);
    const fieldworkEnd = isoDate(survey.Survey_Period.Date_End, `${label} fieldwork end`);
    if (fieldworkStart > fieldworkEnd || fieldworkEnd > survey.Date) {
      throw new Error(`${label} has an implausible fieldwork period`);
    }
    if (!/^\d{1,4}$/.test(survey.Institute_ID)) throw new Error(`${label} has an invalid institute ID`);
    if (!/^\d{1,4}$/.test(survey.Method_ID)) throw new Error(`${label} has an invalid method ID`);
    if (!isRecord(survey.Results)) throw new Error(`${label} has no results object`);
    const results = Object.entries(survey.Results);
    if (results.length < 5 || results.length > MAX_RESULTS_PER_SURVEY) {
      throw new Error(`${label} has an invalid number of results`);
    }
    for (const [partyId, rawValue] of results) {
      const value = Number(rawValue);
      if (!/^\d{1,4}$/.test(partyId) || !Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error(`${label} has an invalid result for party ${partyId}`);
      }
    }
    const resultTotal = results.reduce((sum, [, rawValue]) => sum + Number(rawValue), 0);
    if (resultTotal < 94 || resultTotal > 103) {
      throw new Error(`${label} has an implausible result total of ${resultTotal}`);
    }
    const sample = Number(survey.Surveyed_Persons);
    if (survey.Surveyed_Persons && (!Number.isInteger(sample) || sample < 100 || sample > 10_000_000)) {
      throw new Error(`${label} has an implausible sample size`);
    }
    const methodName = source.Methods[survey.Method_ID]?.Name;
    if (methodName !== undefined) safeText(methodName, `${label} method`, 100);
  }
  const partyIds = new Set(regionSurveys.flatMap((survey) => Object.keys(survey.Results)));
  const pollsterIds = new Set(regionSurveys.map((survey) => survey.Institute_ID));
  const polls = regionSurveys.map((survey) => ({
    date: survey.Date,
    fieldwork: [survey.Survey_Period.Date_Start, survey.Survey_Period.Date_End],
    sample: Number(survey.Surveyed_Persons) || null,
    pollster: survey.Institute_ID,
    method: source.Methods[survey.Method_ID]?.Name ?? "Unknown",
    results: Object.fromEntries(
      Object.entries(survey.Results).map(([partyId, value]) => [partyId, Number(value)]),
    ),
  }));

  const minimum = region.type === "federal" ? 2_000 : 15;
  if (polls.length < minimum) {
    throw new Error(`${region.name} archive unexpectedly contains only ${polls.length} polls`);
  }

  return {
    metadata: {
      source: "dawum.de",
      sourceUrl: TRUSTED_SOURCE_URL,
      license: source.Database.License.Shortcut,
      licenseUrl: TRUSTED_LICENSE_URL,
      databaseUpdated: source.Database.Last_Update,
      generatedAt,
      derivativeDatabaseNotice: DERIVATIVE_NOTICE,
      changes: DERIVATIVE_CHANGES,
      inclusionRule: "Seven established institutes with published fieldwork and sample metadata. The reusable DAWUM archive begins in 2017.",
      region,
    },
    pollsters: Object.fromEntries([...pollsterIds].map((id) => [
      id,
      safeText(source.Institutes[id].Name, `Institute ${id}`, 100),
    ])),
    parties: Object.fromEntries([...partyIds].map((id) => [
      id,
      source.Parties[id]?.Shortcut
        ? safeText(source.Parties[id].Shortcut, `Party ${id}`, 40)
        : id,
    ])),
    polls,
  };
}

function summarize(data) {
  const currentCutoff = new Date(referenceTime - (45 * 86_400_000)).toISOString().slice(0, 10);
  const currentPolls = data.polls.filter((poll) => poll.date >= currentCutoff);
  const pollCount = data.polls.length;
  return {
    ...data.metadata.region,
    pollCount,
    firstDate: data.polls[0].date,
    latestDate: data.polls.at(-1).date,
    currentPollCount: currentPolls.length,
    currentInstituteCount: new Set(currentPolls.map((poll) => poll.pollster)).size,
    coverage: pollCount >= 45 ? "good" : pollCount >= 25 ? "fair" : "limited",
  };
}

const comparable = (data) => {
  if (!data?.metadata) return data;
  const { generatedAt: _generatedAt, databaseUpdated: _databaseUpdated, ...stableMetadata } = data.metadata;
  return { ...data, metadata: stableMetadata };
};

async function writeJsonIfChanged(targetPath, output) {
  let existing = null;
  try {
    existing = JSON.parse(await readFile(targetPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (!forceUpdate && existing && JSON.stringify(comparable(existing)) === JSON.stringify(comparable(output))) {
    return false;
  }
  const temporaryPath = `${targetPath}.next`;
  await writeFile(temporaryPath, `${JSON.stringify(output)}\n`, "utf8");
  await rename(temporaryPath, targetPath);
  return true;
}

const regionData = REGION_CONFIG.map(makeRegionData);
const latestFederalDate = regionData[0].polls.at(-1).date;
const latestAgeDays = (Date.now() - Date.parse(`${latestFederalDate}T00:00:00Z`)) / 86_400_000;
if (isRemoteSource && (latestAgeDays < -2 || latestAgeDays > 45)) {
  throw new Error(`Latest selected federal poll has an implausible age: ${latestFederalDate}`);
}
if (checkOnly) {
  console.log(`Validated trusted DAWUM source through ${latestFederalDate}; no files written`);
  process.exit(0);
}

await mkdir(resolve("public/data"), { recursive: true });
let changedFiles = 0;
for (const data of regionData) {
  changedFiles += Number(await writeJsonIfChanged(
    resolve(`public/data/${data.metadata.region.slug}.json`),
    data,
  ));
}
changedFiles += Number(await writeJsonIfChanged(resolve("public/poll-data.json"), regionData[0]));
const summary = {
  metadata: {
    source: "dawum.de",
    sourceUrl: TRUSTED_SOURCE_URL,
    license: source.Database.License.Shortcut,
    licenseUrl: TRUSTED_LICENSE_URL,
    databaseUpdated: source.Database.Last_Update,
    generatedAt,
    derivativeDatabaseNotice: DERIVATIVE_NOTICE,
    changes: DERIVATIVE_CHANGES,
  },
  regions: regionData.map(summarize),
};
changedFiles += Number(await writeJsonIfChanged(resolve("public/regions.json"), summary));
changedFiles += Number(await writeJsonIfChanged(
  resolve("public/state-map-data.json"),
  createStateMapData(regionData, summary.metadata),
));

console.log(
  changedFiles
    ? `Updated ${changedFiles} data files for Germany and all 16 states`
    : `Already current: Germany and all 16 states through ${latestFederalDate}`,
);
