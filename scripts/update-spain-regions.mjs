import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { load } from "cheerio/slim";

const USER_AGENT = "PollframeDataUpdater/1.0 (regional polling coverage audit)";
const REGIONS = [
  ["01", "andalucia", "Andalucía", "Andalusia", "Andalusien", "2026_Andalusian_regional_election"],
  ["02", "aragon", "Aragón", "Aragon", "Aragonien", "2026_Aragonese_regional_election"],
  ["03", "asturias", "Asturias", "Asturias", "Asturien", "2027_Asturian_regional_election"],
  ["04", "illes-balears", "Illes Balears", "Balearic Islands", "Balearen", "Next_Balearic_regional_election"],
  ["05", "canarias", "Canarias", "Canary Islands", "Kanarische Inseln", "Next_Canarian_regional_election"],
  ["06", "cantabria", "Cantabria", "Cantabria", "Kantabrien", "2027_Cantabrian_regional_election"],
  ["07", "castilla-y-leon", "Castilla y León", "Castile and León", "Kastilien und León", "2026_Castilian-Leonese_regional_election"],
  ["08", "castilla-la-mancha", "Castilla-La Mancha", "Castilla–La Mancha", "Kastilien-La Mancha", "2027_Castilian-Manchegan_regional_election"],
  ["09", "cataluna", "Cataluña", "Catalonia", "Katalonien", "Next_Catalan_regional_election"],
  ["10", "comunitat-valenciana", "Comunitat Valenciana", "Valencian Community", "Valencianische Gemeinschaft", "Next_Valencian_regional_election"],
  ["11", "extremadura", "Extremadura", "Extremadura", "Extremadura", "2025_Extremaduran_regional_election"],
  ["12", "galicia", "Galicia", "Galicia", "Galicien", "Next_Galician_regional_election"],
  ["13", "madrid", "Comunidad de Madrid", "Community of Madrid", "Autonome Gemeinschaft Madrid", "2027_Madrilenian_regional_election"],
  ["14", "murcia", "Región de Murcia", "Region of Murcia", "Region Murcia", "2027_Murcian_regional_election"],
  ["15", "navarra", "Comunidad Foral de Navarra", "Navarre", "Navarra", "2027_Navarrese_regional_election"],
  ["16", "pais-vasco", "País Vasco", "Basque Country", "Baskenland", "Next_Basque_regional_election"],
  ["17", "la-rioja", "La Rioja", "La Rioja", "La Rioja", "2027_Riojan_regional_election"],
  ["18", "ceuta", "Ceuta", "Ceuta", "Ceuta", "2027_Ceuta_Assembly_election"],
  ["19", "melilla", "Melilla", "Melilla", "Melilla", "2027_Melilla_Assembly_election"],
].map(([code, slug, es, en, de, page]) => ({ code, slug, names: { es, en, de }, page }));

const PALETTE = ["#1479c9", "#e0272f", "#63a62f", "#e05a9d", "#f0a500", "#6d3b87", "#19a7a0", "#8a939c"];
const clean = (value) => String(value ?? "").replace(/\[[^\]]*]/g, "").replace(/\s+/g, " ").trim();
const safeNumber = (value) => {
  const text = clean(value).replace(",", ".");
  if (/^\d+(?:\.\d+)?\s*[–—-]\s*\d/.test(text)) return null;
  const match = text.match(/^\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
};
const iso = (year, month, day) => {
  const value = new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
  return value.startsWith(String(year)) ? value : null;
};
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseDate(value, fallbackYear) {
  const text = clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[–—]/g, "-");
  const match = text.match(/(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})(?!.*20\d{2})/i) ?? text.match(/(\d{1,2})\s+([A-Za-z]{3,9})(?!.*\d)/i);
  if (!match) return null;
  const month = MONTHS[match[2].slice(0, 3).toLowerCase()];
  return Number.isInteger(month) ? iso(Number(match[3] ?? fallbackYear), month, Number(match[1])) : null;
}
async function wiki(page) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await fetch(`https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json&formatversion=2`, { headers: { "Api-User-Agent": USER_AGENT } });
    if (response.status === 429 || response.status >= 500) {
      if (attempt === 4) {
        const fallback = await fetch(`https://en.wikipedia.org/wiki/${page}?action=render`, { headers: { "User-Agent": USER_AGENT } });
        if (fallback.ok) return load(await fallback.text());
        throw new Error(`HTTP ${response.status}`);
      }
      await new Promise((resolveWait) => setTimeout(resolveWait, attempt * 4_000));
      continue;
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload?.parse?.text) throw new Error(payload?.error?.info ?? "missing page HTML");
    return load(payload.parse.text);
  }
  throw new Error("unavailable");
}
function rowSource($, row, fallback) {
  const id = $(row).find("sup.reference a").first().attr("href");
  const href = id?.startsWith("#") ? $(id).find("a.external").first().attr("href") : null;
  try { return href ? new URL(href, fallback).href : fallback; } catch { return fallback; }
}
function partyName($, cell) {
  return clean($(cell).find("img").attr("alt") || $(cell).find("a").attr("title") || $(cell).text()).replace(/\b(?:vote|seats?)\b/gi, "").replace(/%/g, "").trim();
}
function partyColor(name, fallbackIndex) {
  if (/people'?s party|\bPP\b/i.test(name)) return "#1479c9";
  if (/socialist|\bPSOE|\bPSC\b/i.test(name)) return "#e0272f";
  if (/\bVox\b/i.test(name)) return "#63a62f";
  if (/\bUPN\b|navarrese people/i.test(name)) return "#283b78";
  if (/\bPNV\b|basque nationalist/i.test(name)) return "#008c5a";
  if (/eh\s*bildu/i.test(name)) return "#79a82b";
  if (/coalici[oó]n canaria|\bCCa\b/i.test(name)) return "#e5bd16";
  if (/\bBNG\b|galician nationalist/i.test(name)) return "#63b6d8";
  if (/comprom[ií]s/i.test(name)) return "#e58b20";
  if (/m[aá]s madrid/i.test(name)) return "#18a78b";
  if (/\bPRC\b|regionalist party of cantabria/i.test(name)) return "#7c983d";
  if (/\bCHA\b|chunta aragonesista/i.test(name)) return "#6f4a8e";
  if (/\bERC\b|republican left/i.test(name)) return "#f0a500";
  if (/ciudadanos|\bCs\b/i.test(name)) return "#eb6f19";
  if (/sumar|comú|podemos|izquierda unida|\bIU\b/i.test(name)) return /podemos/i.test(name) ? "#6d3b87" : "#e05a9d";
  if (/junts|together/i.test(name)) return "#19a7a0";
  return PALETTE[fallbackIndex % PALETTE.length];
}
function electionSeats($, cell) {
  const clone = $(cell).clone();
  clone.find("sup.reference").remove();
  clone.find("br").replaceWith("|");
  const parts = clone.text().split("|").map(clean).filter(Boolean);
  for (const part of parts.slice(1)) {
    const match = part.match(/^\s*(\d{1,3})\s*$/);
    if (match) return Number(match[1]);
  }
  return null;
}
function parseRegion(region, $) {
  const sourceUrl = `https://en.wikipedia.org/wiki/${region.page}`;
  // Several pages repeat every fieldwork row in a second table containing raw
  // vote intention. Pollframe uses the headline vote estimate (the table with
  // the turnout column), so mixing both would double-count polls and scramble
  // the election result when the two tables share the same date.
  const tables = $("table.wikitable").filter((_, table) => {
    const heading = clean($(table).find("tr").first().text());
    return /Polling firm/i.test(heading) && /Turnout/i.test(heading);
  }).toArray();
  const parties = new Map();
  const polls = [];
  const elections = [];
  for (const table of tables) {
    const header = $(table).find("tr").first().children("th,td").toArray();
    const columns = [];
    header.forEach((cell, index) => {
      if (index < 4 || index >= header.length - 1) return;
      const name = partyName($, cell);
      if (!name || /lead|others|blank|abst/i.test(name)) return;
      const id = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36);
      if (id) { columns.push([index, id]); if (!parties.has(id)) parties.set(id, { id, name, color: partyColor(name, parties.size) }); }
    });
    $(table).find("tr").slice(2).each((_, row) => {
      const cells = $(row).children("td").toArray();
      if (cells.length < 6) return;
      const pollster = clean($(cells[0]).clone().find("sup").remove().end().text());
      if (/ipsos/i.test(pollster)) return;
      const yearHint = Number(clean($(cells[1]).text()).match(/20\d{2}/)?.[0] ?? new Date().getUTCFullYear());
      const date = parseDate($(cells[1]).text(), yearHint);
      if (!date || date > new Date().toISOString().slice(0, 10)) return;
      const results = {}; const seats = {};
      for (const [column, id] of columns) {
        const value = safeNumber($(cells[column]).text());
        if (Number.isFinite(value)) results[id] = value;
        const seatCount = electionSeats($, cells[column]);
        if (Number.isInteger(seatCount)) seats[id] = seatCount;
      }
      if (Object.keys(results).length < 2) return;
      const item = { date, pollster, sample: Number(clean($(cells[2]).text()).replace(/\D/g, "")) || null, results, sourceUrl: rowSource($, row, sourceUrl) };
      if (Object.keys(seats).length) item.seats = seats;
      if (/(?:regional|assembly) election/i.test(pollster)) elections.push(item);
      else if (!/election|projection|scenario/i.test(pollster)) polls.push(item);
    });
  }
  const unique = [...new Map(polls.map((poll) => [`${poll.date}|${poll.pollster}|${JSON.stringify(poll.results)}`, poll])).values()].sort((a, b) => a.date.localeCompare(b.date));
  elections.sort((a, b) => a.date.localeCompare(b.date));
  const lastElection = elections.at(-1) ?? null;
  const postElection = lastElection ? unique.filter((poll) => poll.date > lastElection.date) : unique;
  const latest = postElection.at(-1) ?? unique.at(-1) ?? null;
  const currentWindow = latest ? postElection.filter((poll) => Date.parse(`${poll.date}T00:00:00Z`) >= Date.parse(`${latest.date}T00:00:00Z`) - 180 * 86_400_000) : [];
  const latestByPollster = new Map(currentWindow.map((poll) => [poll.pollster, poll]));
  const current = {};
  for (const party of parties.values()) {
    const values = [...latestByPollster.values()].map((poll) => poll.results[party.id]).filter(Number.isFinite);
    if (values.length) current[party.id] = Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
  }
  const pollsters = new Set(unique.map((poll) => poll.pollster));
  const generatedTime = Date.now();
  const recentPolls = postElection.filter((poll) => generatedTime - Date.parse(`${poll.date}T00:00:00Z`) <= 365 * 86_400_000);
  const recentMonths = new Set(recentPolls.map((poll) => poll.date.slice(0, 7))).size;
  const recentDates = [...new Set(postElection.map((poll) => poll.date))].sort().slice(-6);
  const recentGaps = recentDates.slice(1).map((date, index) => Math.round((Date.parse(date) - Date.parse(recentDates[index])) / 86_400_000));
  const latestAgeDays = latest ? Math.max(0, Math.floor((generatedTime - Date.parse(`${latest.date}T00:00:00Z`)) / 86_400_000)) : null;
  const trendEligible = postElection.length >= 8 && recentMonths >= 4 && latestAgeDays <= 120 && recentGaps.every((gap) => gap <= 120);
  const status = trendEligible ? "useful" : postElection.length >= 2 ? "limited" : "archive";
  return { ...region, sourceUrl, sourceLicense: "Wikipedia contributors · CC BY-SA 4.0; original poll sources linked per row", parties: [...parties.values()], polls: unique, lastElection, current: latest ? { date: latest.date, pollCount: latestByPollster.size, results: current } : null, coverage: { status, trendEligible, usablePolls: unique.length, postElectionPolls: postElection.length, pollsLast12Months: recentPolls.length, activeMonthsLast12Months: recentMonths, maxRecentGapDays: recentGaps.length ? Math.max(...recentGaps) : null, pollsterCount: pollsters.size, firstDate: unique[0]?.date ?? null, latestDate: unique.at(-1)?.date ?? null } };
}

const requestedSlug = process.argv[2] ?? null;
const selectedRegions = requestedSlug ? REGIONS.filter((region) => region.slug === requestedSlug) : REGIONS;
if (requestedSlug && !selectedRegions.length) throw new Error(`Unknown region slug: ${requestedSlug}`);
const previous = requestedSlug ? JSON.parse(await readFile(resolve("public/data/spain-regions.json"), "utf8")) : null;
const regions = previous ? [...previous.regions] : [];
for (const region of selectedRegions) {
  try {
    const $ = await wiki(region.page);
    const parsed = parseRegion(region, $);
    const previousIndex = regions.findIndex((item) => item.slug === region.slug);
    if (previousIndex >= 0) regions.splice(previousIndex, 1, parsed); else regions.push(parsed);
    console.log(`${region.names.es}: ${parsed.coverage.usablePolls} polls (${parsed.coverage.status})`);
  } catch (error) {
    console.warn(`${region.names.es}: ${error.message}`);
    if (!previous) regions.push({ ...region, sourceUrl: `https://en.wikipedia.org/wiki/${region.page}`, parties: [], polls: [], lastElection: null, current: null, coverage: { status: "unavailable", usablePolls: 0, postElectionPolls: 0, pollsterCount: 0, firstDate: null, latestDate: null } });
  }
  await new Promise((resolveWait) => setTimeout(resolveWait, 1_500));
}
regions.sort((a, b) => a.code.localeCompare(b.code));
const output = { metadata: { generatedAt: new Date().toISOString(), methodology: "Headline vote estimates from the cited regional polling tables (raw vote-intention duplicates are excluded); the current snapshot averages each pollster's latest post-election poll within 180 days of the latest poll." }, regions };
await writeFile(resolve("public/data/spain-regions.json"), `${JSON.stringify(output)}\n`);
console.log(`Spain regions: wrote ${regions.length} pages and ${regions.reduce((sum, region) => sum + region.polls.length, 0)} polls`);
