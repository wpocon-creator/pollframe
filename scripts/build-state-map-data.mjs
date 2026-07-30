import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const DAY = 86_400_000;
const MAP_PARTY_IDS = new Set(["1", "2", "3", "4", "5", "7", "8", "10", "14", "23", "101", "102"]);

function parseDate(date) {
  return Date.parse(`${date}T12:00:00Z`);
}

function averageAtDate(data, date, windowDays = 45) {
  const target = parseDate(date);
  const cutoff = target - (windowDays * DAY);
  const latestByPollster = new Map();

  for (const poll of data.polls) {
    const pollDate = parseDate(poll.date);
    if (pollDate > target || pollDate < cutoff) continue;
    const previous = latestByPollster.get(poll.pollster);
    if (!previous || poll.date > previous.date) latestByPollster.set(poll.pollster, poll);
  }

  const results = {};
  for (const partyId of Object.keys(data.parties)) {
    if (!MAP_PARTY_IDS.has(partyId)) continue;
    const values = [...latestByPollster.values()]
      .map((poll) => poll.results[partyId])
      .filter(Number.isFinite);
    if (values.length) {
      results[partyId] = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
    }
  }
  return { instituteCount: latestByPollster.size, results };
}

function estimateMovement(data, latestDate, windowDays = 180) {
  const end = parseDate(latestDate);
  const start = end - (windowDays * DAY);
  const polls = data.polls.filter((poll) => parseDate(poll.date) >= start);
  const dateCount = new Set(polls.map((poll) => poll.date)).size;
  if (dateCount < 2) return { observationCount: polls.length, dateCount, results: {} };

  const results = {};
  for (const partyId of Object.keys(data.parties)) {
    if (!MAP_PARTY_IDS.has(partyId)) continue;
    const points = polls
      .map((poll) => ({ x: (parseDate(poll.date) - start) / DAY, y: poll.results[partyId] }))
      .filter((point) => Number.isFinite(point.y));
    if (points.length < 2) continue;
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + ((point.x - meanX) ** 2), 0);
    if (!denominator) continue;
    const slope = points.reduce(
      (sum, point) => sum + ((point.x - meanX) * (point.y - meanY)),
      0,
    ) / denominator;
    results[partyId] = Number((slope * windowDays).toFixed(2));
  }
  return { observationCount: polls.length, dateCount, results };
}

export function createStateMapData(regionData, metadata) {
  return {
    metadata: {
      source: metadata.source,
      sourceUrl: metadata.sourceUrl,
      license: metadata.license,
      licenseUrl: metadata.licenseUrl,
      databaseUpdated: metadata.databaseUpdated,
      generatedAt: metadata.generatedAt,
      derivativeDatabaseNotice: metadata.derivativeDatabaseNotice,
      changes: metadata.changes,
      currentWindowDays: 45,
      movementWindowDays: 180,
      movementMethod: "Linear trend across published polls in the 180 days ending on each state's latest poll.",
    },
    regions: regionData
      .filter((data) => data.metadata.region.type === "state")
      .map((data) => {
        const latestDate = data.polls.at(-1).date;
        return {
          ...data.metadata.region,
          latestDate,
          parties: Object.fromEntries(
            Object.entries(data.parties).filter(([partyId]) => MAP_PARTY_IDS.has(partyId)),
          ),
          current: averageAtDate(data, latestDate),
          movement: estimateMovement(data, latestDate),
        };
      }),
  };
}

async function buildFromPublicFiles() {
  const summary = JSON.parse(await readFile(resolve("public/regions.json"), "utf8"));
  const regionData = await Promise.all(
    summary.regions
      .filter((region) => region.type === "state")
      .map((region) => readFile(resolve(`public/data/${region.slug}.json`), "utf8").then(JSON.parse)),
  );
  const output = createStateMapData(regionData, summary.metadata);
  await writeFile(resolve("public/state-map-data.json"), `${JSON.stringify(output)}\n`, "utf8");
  console.log(`Built state map snapshot for ${output.regions.length} states`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await buildFromPublicFiles();
}
