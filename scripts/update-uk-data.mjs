import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SOURCES = {
  polls: "https://storage.googleapis.com/election-data-vault-charts/downloads/opinion_polls_raw.csv",
  averages: "https://storage.googleapis.com/election-data-vault-charts/downloads/polling_averages.csv",
  elections: "https://storage.googleapis.com/election-data-vault-charts/downloads/general_election_summary.csv",
  ratings: "https://storage.googleapis.com/election-data-vault-charts/downloads/pollster_ratings.csv",
  constituencies: "https://electionresults.parliament.uk/general-elections/6/candidacies.csv",
};
const LOCAL = {
  polls: "/tmp/pollframe-uk-polls.csv",
  averages: "/tmp/pollframe-uk-polling-averages.csv",
  elections: "/tmp/pollframe-uk-election-summary.csv",
  ratings: "/tmp/pollframe-uk-pollster-ratings.csv",
  constituencies: "/tmp/pollframe-uk-candidacies.csv",
};
const PARTY_IDS = {
  Labour: "201",
  "Green Party": "202",
  SNP: "203",
  "Plaid Cymru": "204",
  "Liberal Democrats": "205",
  Conservative: "206",
  "Reform UK": "207",
  "UK Independence Party (UKIP)": "208",
  Other: "209",
  "Change UK - The Independent Group": "210",
  "Social Democratic Party": "211",
};
const PARTY_LABELS = {
  "201": "Labour", "202": "Green", "203": "SNP", "204": "Plaid Cymru",
  "205": "Liberal Democrats", "206": "Conservative", "207": "Reform UK",
  "208": "UKIP", "209": "Other", "210": "Change UK", "211": "SDP",
};
const MAP_ONLY_PARTY_IDS = {
  "Sinn Féin": "301", DUP: "302", "Democratic Unionist Party": "302",
  Alliance: "303", "Alliance Party": "303", "Ulster Unionist Party": "304", UUP: "304",
  SDLP: "305", "Social Democratic and Labour Party": "305", TUV: "306",
  "Traditional Unionist Voice": "306", "Traditional Unionist Voice - TUV": "306",
};
const OFFICIAL_PARTY_IDS = {
  Labour: "201",
  "Green Party": "202",
  "Scottish National Party": "203",
  "Plaid Cymru": "204",
  "Liberal Democrat": "205",
  Conservative: "206",
  "Reform UK": "207",
  "UK Independence Party": "208",
  "Sinn Féin": "301",
  "Democratic Unionist Party": "302",
  Alliance: "303",
  "Ulster Unionist Party": "304",
  "Social Democratic & Labour Party": "305",
  "Traditional Unionist Voice": "306",
};
const ELECTION_DATES = {
  1945: "1945-07-05", 1950: "1950-02-23", 1951: "1951-10-25", 1955: "1955-05-26",
  1959: "1959-10-08", 1964: "1964-10-15", 1966: "1966-03-31", 1970: "1970-06-18",
  1974: "1974-10-10", 1979: "1979-05-03", 1983: "1983-06-09", 1987: "1987-06-11",
  1992: "1992-04-09", 1997: "1997-05-01", 2001: "2001-06-07", 2005: "2005-05-05",
  2010: "2010-05-06", 2015: "2015-05-07", 2017: "2017-06-08", 2019: "2019-12-12",
  2024: "2024-07-04",
};
const MAP_GROUPS = {
  Yorkshire: ["East Riding of Yorkshire", "North Yorkshire", "South Yorkshire", "West Yorkshire"],
  Sussex: ["East Sussex", "West Sussex"],
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.replace(/\r$/, ""));
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += character;
  }
  if (field || row.length) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift();
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

async function load(key) {
  if (process.argv.includes("--local")) return readFile(LOCAL[key], "utf8");
  const response = await fetch(SOURCES[key], { headers: { "user-agent": "Pollframe data updater/1.0" } });
  if (!response.ok) throw new Error(`${key}: HTTP ${response.status}`);
  return response.text();
}

function mappedParty(name) {
  return PARTY_IDS[name] ?? "209";
}

function mappedMapParty(name) {
  return MAP_ONLY_PARTY_IDS[name] ?? mappedParty(name);
}

function consolidate(rows, partyNameKey, valueKey) {
  const results = {};
  for (const row of rows) {
    const partyId = mappedParty(row[partyNameKey]);
    const value = Number(row[valueKey]);
    if (Number.isFinite(value)) results[partyId] = (results[partyId] ?? 0) + value;
  }
  return Object.fromEntries(Object.entries(results).map(([id, value]) => [id, Number(value.toFixed(2))]));
}

function consolidateMap(rows, partyNameKey, valueKey) {
  const results = {};
  for (const row of rows) {
    const partyId = mappedMapParty(row[partyNameKey]);
    const value = Number(row[valueKey]);
    if (Number.isFinite(value)) results[partyId] = (results[partyId] ?? 0) + value;
  }
  return Object.fromEntries(Object.entries(results).map(([id, value]) => [id, Number(value.toFixed(2))]));
}

function latestByDate(rows) {
  return rows.slice().sort((a, b) => a.date.localeCompare(b.date));
}

const [rawPollRows, averageRows, electionRows, ratingRows, constituencyRows] = await Promise.all(
  ["polls", "averages", "elections", "ratings", "constituencies"].map(async (key) => parseCsv(await load(key))),
);
const generatedAt = new Date().toISOString();
const sourceMetadata = {
  source: "UK Election Data Vault",
  sourceUrl: "https://electiondatavault.co.uk/data/",
  license: "Free commercial reuse",
  licenseUrl: "https://electiondatavault.co.uk/about/",
  generatedAt,
  derivativeDatabaseNotice: "Pollframe normalises, groups and republishes selected Election Data Vault fields.",
  changes: "Great Britain rows selected; party names consolidated; weighted series and individual polls combined.",
};

const averageGroups = new Map();
for (const row of averageRows) {
  if (row.country_name !== "Great Britain" || !PARTY_IDS[row.party_name]) continue;
  if (!averageGroups.has(row.date)) averageGroups.set(row.date, []);
  averageGroups.get(row.date).push(row);
}
const allWeightedPolls = [...averageGroups.entries()].map(([date, rows]) => ({
  date,
  fieldwork: [date, date],
  sample: null,
  pollster: "9000",
  method: "Election Data Vault reliability-weighted 14-day average",
  results: consolidate(rows, "party_name", "voting_intention"),
  synthetic: true,
  sourceUrl: "https://electiondatavault.co.uk/polling/polling-average/",
})).sort((a, b) => a.date.localeCompare(b.date));
// Daily points add download and SVG work without adding visible information to
// an 80-year chart. Preserve the full recent series and use deterministic
// weekly/monthly endpoints farther back.
const historicalBuckets = new Map();
for (const poll of allWeightedPolls) {
  const date = new Date(`${poll.date}T00:00:00Z`);
  const year = date.getUTCFullYear();
  const bucket = year >= 2020
    ? poll.date
    : year >= 2000
      ? `${year}-w${Math.floor((date.getTime() - Date.UTC(year, 0, 1)) / (7 * 86_400_000))}`
      : poll.date.slice(0, 7);
  historicalBuckets.set(bucket, poll);
}
const weightedPolls = [...historicalBuckets.values()].sort((a, b) => a.date.localeCompare(b.date));

const rawGroups = new Map();
for (const row of rawPollRows) {
  if (row.country_name !== "Great Britain" || !PARTY_IDS[row.party_name]) continue;
  const key = [row.start_date, row.end_date, row.pollster_name, row.poll_series, row.client, row.sample_size].join("|");
  if (!rawGroups.has(key)) rawGroups.set(key, []);
  rawGroups.get(key).push(row);
}
const pollsterNames = [...new Set([...rawGroups.values()].map((rows) => rows[0].pollster_name))].sort();
const pollsterIds = Object.fromEntries(pollsterNames.map((name, index) => [name, String(index + 1)]));
const individualPolls = [...rawGroups.values()].map((rows) => {
  const first = rows[0];
  const sample = Number(first.sample_size);
  return {
    date: first.end_date,
    fieldwork: [first.start_date, first.end_date],
    sample: Number.isInteger(sample) && sample > 0 ? sample : null,
    pollster: pollsterIds[first.pollster_name],
    method: [first.poll_series, first.client && `client: ${first.client}`].filter(Boolean).join(" · ") || "Published voting-intention poll",
    results: consolidate(rows, "party_name", "voting_intention"),
    sourceUrl: "https://electiondatavault.co.uk/polling/",
  };
}).filter((poll) => {
  const total = Object.values(poll.results).reduce((sum, value) => sum + value, 0);
  return poll.date >= "2000-01-01"
    && total >= 80
    && total <= 110
    && Object.values(poll.results).every((value) => value >= 0 && value <= 100);
});
const polls = latestByDate([...weightedPolls, ...individualPolls]);
const databaseUpdated = `${polls.at(-1).date}T00:00:00.000Z`;

const electionResults = {};
const electionSeats2024 = {};
for (const [year, date] of Object.entries(ELECTION_DATES)) {
  const rows = electionRows.filter((row) => row.election_year === year && row.geography === "GB" && row.geography_name === "Great Britain");
  if (!rows.length) continue;
  electionResults[date] = consolidate(rows, "party_name", "perc_share");
  if (year === "2024") {
    for (const row of rows) {
      const id = mappedParty(row.party_name);
      electionSeats2024[id] = (electionSeats2024[id] ?? 0) + (Number(row.seats) || 0);
    }
  }
}
const ukElectionRows2024 = electionRows.filter((row) => row.election_year === "2024" && row.geography === "UK" && row.geography_name === "United Kingdom");
const ukElectionVotes2024 = consolidate(ukElectionRows2024, "party_name", "perc_share");
const ukElectionSeats2024 = {};
for (const row of ukElectionRows2024) {
  const id = mappedParty(row.party_name);
  ukElectionSeats2024[id] = (ukElectionSeats2024[id] ?? 0) + (Number(row.seats) || 0);
}

const ratings = Object.fromEntries(ratingRows
  .filter((row) => row.country_name === "Great Britain" && row.next_election_year === "2029")
  .map((row) => [pollsterIds[row.pollster_name], row.pollster_grade])
  .filter(([id]) => id));
const pollData = {
  metadata: {
    ...sourceMetadata,
    databaseUpdated,
    region: { slug: "uk-westminster", name: "Great Britain", type: "uk-federal" },
    geographyNote: "Westminster voting-intention polling covers Great Britain (England, Scotland and Wales), not Northern Ireland.",
    defaultPollsters: ["9000"],
    weightedAveragePollsterId: "9000",
    pollsterRatings: ratings,
    electionResults,
    electionSourceUrl: "https://commonslibrary.parliament.uk/research-briefings/cbp-10009/",
    electionSourceLabel: "House of Commons Library",
    election2024: {
      votes: Object.keys(ukElectionVotes2024).length ? ukElectionVotes2024 : electionResults["2024-07-04"],
      seats: Object.keys(ukElectionSeats2024).length ? ukElectionSeats2024 : electionSeats2024,
      totalSeats: 650,
      gbVotes: electionResults["2024-07-04"],
    },
  },
  pollsters: { "9000": "Poll of polls · weighted trend", ...Object.fromEntries(pollsterNames.map((name) => [pollsterIds[name], name])) },
  parties: PARTY_LABELS,
  polls: weightedPolls,
};
const rawPollData = {
  metadata: {
    source: sourceMetadata.source,
    sourceUrl: sourceMetadata.sourceUrl,
    license: sourceMetadata.license,
    licenseUrl: sourceMetadata.licenseUrl,
    generatedAt,
  },
  polls: individualPolls,
};

function aggregateElectionArea(names) {
  const rows = electionRows.filter((row) => row.election_year === "2024" && row.geography === "County" && names.includes(row.geography_name));
  const votes = {};
  let total = 0;
  for (const row of rows) {
    const value = Number(row.votes) || 0;
    const id = mappedParty(row.party_name);
    votes[id] = (votes[id] ?? 0) + value;
    total += value;
  }
  const shares = Object.fromEntries(Object.entries(votes).map(([id, value]) => [id, Number(((value / total) * 100).toFixed(1))]));
  const leaderId = Object.entries(shares).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { shares, leaderId, totalVotes: total };
}
const mapNames = [
  "Bedfordshire", "Berkshire", "Buckinghamshire", "Cheshire", "Cambridgeshire", "Cornwall", "Cumbria",
  "Derbyshire", "Durham", "Dorset", "Devon", "Essex", "Gloucestershire", "Greater London", "Hampshire",
  "Herefordshire", "Hertfordshire", "Kent", "Lancashire", "Leicestershire", "Lincolnshire", "Northamptonshire",
  "Northumberland", "Norfolk", "Nottinghamshire", "Oxfordshire", "Rutland", "Suffolk", "Somerset", "Shropshire",
  "Surrey", "Staffordshire", "Wiltshire", "Worcestershire", "Warwickshire", "Yorkshire", "Sussex",
];
const areas = Object.fromEntries(mapNames.map((name) => [name, aggregateElectionArea(MAP_GROUPS[name] ?? [name])]));
for (const countryName of ["Scotland", "Wales", "Northern Ireland"]) {
  const rows = electionRows.filter((row) => row.election_year === "2024" && row.geography === "country" && row.geography_name === countryName);
  const shares = consolidateMap(rows, "party_name", "perc_share");
  const leaderId = Object.entries(shares).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  areas[countryName] = { shares, leaderId, totalVotes: rows.reduce((sum, row) => sum + (Number(row.votes) || 0), 0) };
}

const summary = {
  metadata: { ...sourceMetadata, databaseUpdated, electionSourceUrl: "https://commonslibrary.parliament.uk/research-briefings/cbp-10009/" },
  westminster: { firstDate: polls[0].date, latestDate: polls.at(-1).date, pollCount: individualPolls.length, trendPointCount: weightedPolls.length },
  current: weightedPolls.at(-1),
  election2024: {
    votes: Object.keys(ukElectionVotes2024).length ? ukElectionVotes2024 : electionResults["2024-07-04"],
    seats: Object.keys(ukElectionSeats2024).length ? ukElectionSeats2024 : electionSeats2024,
    totalSeats: 650,
    gbVotes: electionResults["2024-07-04"],
    gbSeats: electionSeats2024,
  },
  map: { electionDate: "2024-07-04", areas },
};

function slugify(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const constituencyGroups = new Map();
for (const row of constituencyRows) {
  const code = row["Constituency geographic code"];
  const name = row["Constituency name"];
  if (!code || !name) continue;
  if (!constituencyGroups.has(code)) constituencyGroups.set(code, []);
  constituencyGroups.get(code).push(row);
}
const constituencies = [...constituencyGroups.entries()].map(([code, rows]) => {
  const first = rows[0];
  const resultMap = new Map();
  for (const row of rows) {
    const partyId = OFFICIAL_PARTY_IDS[row["Main party name"]] ?? "209";
    const existing = resultMap.get(partyId) ?? { votes: 0, share: 0 };
    existing.votes += Number(row["Candidate vote count"]) || 0;
    existing.share += (Number(row["Candidate vote share"]) || 0) * 100;
    resultMap.set(partyId, existing);
  }
  const winnerRow = rows.find((row) => row["Candidate result position"] === "1") ?? rows[0];
  const winnerPartyId = OFFICIAL_PARTY_IDS[winnerRow["Main party name"]] ?? "209";
  return {
    code,
    slug: slugify(first["Constituency name"]),
    name: first["Constituency name"],
    country: first["Country name"],
    region: first["English region name"] || first["Country name"],
    electorate: Number(first.Electorate) || null,
    validVotes: Number(first["Election valid vote count"]) || null,
    winner: {
      partyId: winnerPartyId,
      candidate: [winnerRow["Candidate given name"], winnerRow["Candidate family name"]].filter(Boolean).join(" "),
      majority: Number(winnerRow.Majority) || null,
    },
    results: Object.fromEntries([...resultMap.entries()].map(([partyId, value]) => [partyId, {
      votes: value.votes,
      share: Number(value.share.toFixed(2)),
    }])),
    sourceUrl: first["Election URL"],
  };
}).sort((a, b) => a.name.localeCompare(b.name, "en-GB"));
const constituencyData = {
  metadata: {
    source: "UK Parliament election results",
    sourceUrl: "https://electionresults.parliament.uk/general-elections/6",
    license: "Open Parliament Licence",
    licenseUrl: "https://www.parliament.uk/site-information/copyright/open-parliament-licence/",
    electionDate: "2024-07-04",
    generatedAt,
  },
  constituencies,
};

await Promise.all([
  writeFile(resolve("public/data/uk-westminster.json"), `${JSON.stringify(pollData)}\n`),
  writeFile(resolve("public/data/uk-westminster-polls.json"), `${JSON.stringify(rawPollData)}\n`),
  writeFile(resolve("public/uk-summary.json"), `${JSON.stringify(summary)}\n`),
  writeFile(resolve("public/data/uk-constituencies.json"), `${JSON.stringify(constituencyData)}\n`),
]);
console.log(`Wrote ${individualPolls.length} individual polls, ${weightedPolls.length} trend points, ${Object.keys(areas).length} map areas and ${constituencies.length} constituencies.`);
