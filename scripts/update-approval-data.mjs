import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { unzipSync, strFromU8 } from "fflate";
import { load } from "cheerio/slim";
import { discoverFgwCurrentDownloads, fetchWithRetry } from "./lib/approval-sources.mjs";

const OUTPUT = resolve("public/data/approval.json");
const INCLUDE_IPSOS = process.env.POLLFRAME_INCLUDE_IPSOS === "1";
const REFRESH_CIS_APPROVAL = process.env.POLLFRAME_REFRESH_CIS_APPROVAL === "1";
const IPSOS_URL = "https://www.ipsos.com/en-uk/political-monitor-satisfaction-ratings-1997-present";
const FGW_BASE = "https://www.forschungsgruppe.de/Umfragen/Politbarometer/Langzeitentwicklung_-_Themen_im_Ueberblick";
const CIS_SERIES = [
  ["leader", "Felipe González", "PSOE", "https://www.cis.es/es/series/grado-de-confianza-en-el-presidente-del-gobierno-felipe-gonzalez-nacional-"],
  ["leader", "José María Aznar", "PP", "https://www.cis.es/es/series/grado-de-confianza-en-el-presidente-del-gobierno-jose-m-aznar-nacional-"],
  ["leader", "José Luis Rodríguez Zapatero", "PSOE", "https://www.cis.es/es/series/grado-de-confianza-en-el-presidente-del-gobierno-jose-luis-rodriguez-zapatero-nacional-"],
  ["leader", "Mariano Rajoy", "PP", "https://www.cis.es/es/series/grado-de-confianza-en-el-presidente-del-gobierno-mariano-rajoy-nacional-"],
  ["leader", "Pedro Sánchez", "PSOE", "https://www.cis.es/es/series/grado-de-confianza-en-el-presidente-del-gobierno-pedro-sanchez-iii-"],
  ["leader", "Pedro Sánchez", "PSOE", "https://www.cis.es/es/series/grado-de-confianza-en-el-presidente-del-gobierno-pedro-sanchez-solo-a-quienes-le-conocen-v-"],
  ["government", "Gobierno de España", null, "https://www.cis.es/es/series/valoracion-de-la-gestion-del-gobierno-central-nacional-"],
];

const administrations = {
  de: [
    { start: "2005-11-22", end: "2021-12-07", leader: "Angela Merkel", party: "CDU/CSU", color: "#181818" },
    { start: "2021-12-08", end: "2025-05-05", leader: "Olaf Scholz", party: "SPD", color: "#e3000f" },
    { start: "2025-05-06", end: null, leader: "Friedrich Merz", party: "CDU/CSU", color: "#181818" },
  ],
  uk: [
    { start: "1997-05-02", end: "2007-06-26", leader: "Tony Blair", party: "Labour", color: "#e4003b" },
    { start: "2007-06-27", end: "2010-05-10", leader: "Gordon Brown", party: "Labour", color: "#e4003b" },
    { start: "2010-05-11", end: "2016-07-12", leader: "David Cameron", party: "Conservative", color: "#0087dc" },
    { start: "2016-07-13", end: "2019-07-23", leader: "Theresa May", party: "Conservative", color: "#0087dc" },
    { start: "2019-07-24", end: "2022-09-05", leader: "Boris Johnson", party: "Conservative", color: "#0087dc" },
    { start: "2022-09-06", end: "2022-10-24", leader: "Liz Truss", party: "Conservative", color: "#0087dc" },
    { start: "2022-10-25", end: "2024-07-04", leader: "Rishi Sunak", party: "Conservative", color: "#0087dc" },
    { start: "2024-07-05", end: "2026-07-19", leader: "Keir Starmer", party: "Labour", color: "#e4003b" },
    { start: "2026-07-20", end: null, leader: "Andy Burnham", party: "Labour", color: "#e4003b" },
  ],
  es: [
    { start: "1982-12-02", end: "1996-05-03", leader: "Felipe González", party: "PSOE", color: "#e0272f" },
    { start: "1996-05-04", end: "2004-04-16", leader: "José María Aznar", party: "PP", color: "#1479c9" },
    { start: "2004-04-17", end: "2011-12-20", leader: "José Luis Rodríguez Zapatero", party: "PSOE", color: "#e0272f" },
    { start: "2011-12-21", end: "2018-06-01", leader: "Mariano Rajoy", party: "PP", color: "#1479c9" },
    { start: "2018-06-02", end: null, leader: "Pedro Sánchez", party: "PSOE", color: "#e0272f" },
  ],
};

const fetchResponse = fetchWithRetry;

function decodeXml(value = "") {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function parseXlsx(buffer) {
  const zip = unzipSync(new Uint8Array(buffer));
  const sheet = strFromU8(zip["xl/worksheets/sheet1.xml"]);
  const sharedXml = zip["xl/sharedStrings.xml"] ? strFromU8(zip["xl/sharedStrings.xml"]) : "";
  const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => decodeXml([...match[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((part) => part[1]).join("")));
  return [...sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
    const row = {};
    for (const cell of rowMatch[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const reference = cell[1].match(/\br="([A-Z]+)\d+"/)?.[1];
      const raw = cell[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (!reference || raw == null) continue;
      row[reference] = /\bt="s"/.test(cell[1]) ? shared[Number(raw)] : Number(raw);
    }
    return row;
  });
}

function excelDate(serial) {
  return new Date(Date.UTC(1899, 11, 30) + (serial * 86_400_000)).toISOString().slice(0, 10);
}

async function germanSeries(url, leader = null, party = null) {
  const rows = parseXlsx(await (await fetchResponse(url)).arrayBuffer());
  return rows.map((row) => {
    const entries = Object.entries(row).sort(([a], [b]) => a.localeCompare(b));
    const dateAt = entries.findIndex(([, value]) => Number.isFinite(value) && value > 30_000 && value < 60_000);
    const positive = entries[dateAt + 1]?.[1];
    const negative = entries[dateAt + 2]?.[1];
    return dateAt >= 0 && Number.isFinite(positive)
      ? { date: excelDate(entries[dateAt][1]), positive, negative: Number.isFinite(negative) ? negative : null, leader, party }
      : null;
  }).filter(Boolean);
}

function dedupe(points) {
  return [...new Map(points.sort((a, b) => a.date.localeCompare(b.date)).map((point) => [`${point.date}:${point.leader ?? ""}`, point])).values()];
}

function administrationAt(country, date) {
  return administrations[country].find((term) => date >= term.start && (!term.end || date <= term.end)) ?? administrations[country].at(-1);
}

const MONTHS = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
function parseIpsosDate(value, fallbackYear) {
  const text = value.toLowerCase().replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
  const year = Number(text.match(/\b(19|20)\d{2}\b/)?.[0] ?? fallbackYear);
  const monthMatches = [...text.matchAll(new RegExp(`\\b(${Object.keys(MONTHS).join("|")})\\b`, "g"))];
  if (!year || !monthMatches.length) return null;
  const lastMonth = monthMatches.at(-1);
  const month = MONTHS[lastMonth[1]];
  const after = text.slice(lastMonth.index + lastMonth[0].length).match(/^\s*(?:-\s*)?(\d{1,2})/);
  const before = text.slice(0, lastMonth.index).match(/(\d{1,2})\s*$/);
  const day = Number(after?.[1] ?? before?.[1]);
  if (!day) return null;
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
}

async function ukSeries() {
  const html = await (await fetchResponse(IPSOS_URL)).text();
  const $ = load(html);
  const government = [];
  const leader = [];
  $("table").each((_, table) => {
    const heading = $(table).find("tr").first().find("th,td").first().text().trim();
    const fallbackYear = Number(heading.match(/\b(19|20)\d{2}\b/)?.[0]);
    if (!fallbackYear) return;
    $(table).find("tr").each((__, row) => {
      const cells = $(row).find("th,td").map((___, cell) => $(cell).text().replace(/\s+/g, " ").trim()).get();
      const date = parseIpsosDate(cells[0] ?? "", fallbackYear);
      const values = cells.slice(1).map((value) => /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : null);
      if (!date || !Number.isFinite(values[0]) || !Number.isFinite(values[2])) return;
      const term = administrationAt("uk", date);
      government.push({ date, positive: values[0], negative: values[1], leader: term.leader, party: term.party });
      leader.push({ date, positive: values[2], negative: values[3], leader: term.leader, party: term.party });
    });
  });
  const additions = [
    // Ipsos' combined 2019–2022 table is structurally different from the
    // annual tables and has occasionally disappeared from the parsed output.
    // Keep the first Johnson measurements explicitly so a refresh cannot
    // silently move the beginning of his premiership to March 2020.
    ["2019-07-30", 18, 75, 31, 38],
    ["2019-09-16", 14, 81, 37, 55],
    ["2019-10-28", 19, 74, 46, 44],
    ["2019-12-04", 23, 72, 36, 56],
    ["2020-02-03", 40, 50, 47, 44],
    ["2025-06-25", 16, 76, 19, 73],
    ["2025-09-04", 12, 82, 13, 79],
    ["2025-11-05", 11, 82, 13, 79],
    // Ipsos Political Monitor, fieldwork 25–30 June 2026. These are the
    // comparable satisfaction questions; later favourability/"good plan"
    // questions are deliberately not mixed into this series.
    ["2026-06-30", 14, 78, 17, 76],
  ];
  for (const [date, gp, gn, lp, ln] of additions) {
    const term = administrationAt("uk", date);
    government.push({ date, positive: gp, negative: gn, leader: term.leader, party: term.party });
    leader.push({ date, positive: lp, negative: ln, leader: term.leader, party: term.party });
  }
  return { government: dedupe(government), leader: dedupe(leader) };
}

function decimal(value) {
  const number = Number(String(value ?? "").replace(/[()%]/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

async function spanishSeries(existing) {
  let playwright;
  try { playwright = await import("playwright"); } catch { return existing; }
  const browserOptions = { headless: true };
  if (process.env.POLLFRAME_CHROME_PATH) browserOptions.executablePath = process.env.POLLFRAME_CHROME_PATH;
  let browser;
  try {
    browser = await playwright.chromium.launch(browserOptions);
    const context = await browser.newContext({ locale: "es-ES" });
    const government = [];
    const leader = [];
    for (const [metric, person, party, url] of CIS_SERIES) {
      const page = await context.newPage();
      const responsePromise = page.waitForResponse((response) => /\/ws\/v2\/api\/cis\/serie\/\d+/.test(response.url()) && response.status() === 200, { timeout: 75_000 });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
      const response = await responsePromise;
      const payload = await response.json();
      const rows = payload?.ficha?.serie_temporal ?? [];
      const labels = payload?.ficha?.filas ?? [];
      const positiveIndexes = labels.map((label, index) => /^(mucha|bastante|muy buena|buena|bien)/i.test(label) ? index : -1).filter((index) => index >= 0).slice(0, 2);
      const negativeIndexes = labels.map((label, index) => /^(poca|ninguna|muy mala|mala|mal)/i.test(label) ? index : -1).filter((index) => index >= 0).slice(-2);
      for (const row of rows) {
        const [month, year] = String(row.fecha).split("-").map(Number);
        if (!month || !year) continue;
        const point = {
          date: `${year}-${String(month).padStart(2, "0")}-15`,
          positive: positiveIndexes.reduce((sum, index) => sum + (decimal(row.datos?.[index]) ?? 0), 0),
          negative: negativeIndexes.reduce((sum, index) => sum + (decimal(row.datos?.[index]) ?? 0), 0),
          leader: person,
          party,
        };
        (metric === "leader" ? leader : government).push(point);
      }
      await page.close();
    }
    return { government: dedupe(government), leader: dedupe(leader) };
  } catch (error) {
    console.warn(`Spain approval series retained from last valid snapshot: ${error.message}`);
    return existing;
  } finally {
    await browser?.close();
  }
}

const existing = await readFile(OUTPUT, "utf8").then(JSON.parse).catch(() => null);
const fgwPoliticsUrl = `${FGW_BASE}/Politik_II/`;
const fgwCurrentDownloads = discoverFgwCurrentDownloads(
  await (await fetchResponse(fgwPoliticsUrl)).text(),
  fgwPoliticsUrl,
);
const deGovernment = dedupe([
  ...await germanSeries(`${FGW_BASE}/Politik-Archiv/Legislatur_2017_-_2021/Arbeit_BR_2021.xlsx`),
  ...await germanSeries(`${FGW_BASE}/Politik-Archiv/Legislatur_2021_-_2025/5_Arbeit_BR.xlsx`),
  ...await germanSeries(fgwCurrentDownloads.government),
].map((point) => { const term = administrationAt("de", point.date); return { ...point, leader: term.leader, party: term.party }; }));
const deLeader = dedupe([
  ...await germanSeries(`${FGW_BASE}/Politik-Archiv/Legislatur_2017_-_2021/Arbeit_Merkel_2021.xlsx`, "Angela Merkel", "CDU/CSU"),
  ...await germanSeries(`${FGW_BASE}/Politik-Archiv/Legislatur_2021_-_2025/11_Arbeit_Scholz.xlsx`, "Olaf Scholz", "SPD"),
  ...await germanSeries(fgwCurrentDownloads.leader, "Friedrich Merz", "CDU/CSU"),
]);
const uk = INCLUDE_IPSOS ? await ukSeries() : null;
const esRaw = REFRESH_CIS_APPROVAL
  ? await spanishSeries(existing?.countries?.es?.series ?? { government: [], leader: [] })
  : existing?.countries?.es?.series ?? { government: [], leader: [] };
const es = {
  ...esRaw,
  government: esRaw.government.map((point) => { const term = administrationAt("es", point.date); return { ...point, leader: term.leader, party: term.party }; }),
};

const output = {
  generatedAt: new Date().toISOString(),
  countries: {
    de: {
      label: "Deutschland", flag: "🇩🇪", administrations: administrations.de,
      questions: {
        government: "Die Bundesregierung macht ihre Arbeit eher gut oder eher schlecht?",
        leader: "Macht der Bundeskanzler seine Arbeit eher gut oder eher schlecht?",
      },
      source: { label: "Forschungsgruppe Wahlen · Politbarometer", href: `${FGW_BASE}/Politik_II/` },
      notes: ["Positive Bewertung (‘eher gut’), nicht Wahlabsicht.", "Die Zeitreihe wird direkt aus den offiziellen XLSX-Dateien aktualisiert."],
      series: { government: deGovernment, leader: deLeader },
    },
    ...(uk ? { uk: {
      label: "United Kingdom", flag: "🇬🇧", administrations: administrations.uk,
      questions: {
        government: "Are you satisfied or dissatisfied with the way the Government is running the country?",
        leader: "Are you satisfied or dissatisfied with the way the Prime Minister is doing their job?",
      },
      source: { label: "Ipsos Political Monitor", href: IPSOS_URL },
      notes: ["Positive value is the share answering ‘satisfied’.", "Ipsos changed from face-to-face to telephone interviewing in June 2008; later surveys also use online KnowledgePanel samples."],
      series: uk,
    } } : {}),
    es: {
      label: "España", flag: "🇪🇸", administrations: administrations.es,
      questions: {
        government: "¿Cómo calificaría la gestión que está haciendo el Gobierno central?",
        leader: "¿Le inspira mucha, bastante, poca o ninguna confianza el presidente del Gobierno?",
      },
      source: { label: "Centro de Investigaciones Sociológicas · Series", href: CIS_SERIES.at(-2)[3] },
      notes: ["La valoración positiva suma ‘muy buena’ + ‘buena’; la confianza positiva suma ‘mucha’ + ‘bastante’.", "La serie comparable de gestión del Gobierno termina en marzo de 2020. No se prolonga con una pregunta distinta.", "La serie de Pedro Sánchez tiene un cambio de ponderación en diciembre de 2023."],
      series: es,
    },
  },
  events: [
    { date: "2008-06-01", country: "uk", labelDe: "Ipsos stellt auf Telefoninterviews um", labelEn: "Ipsos changes to telephone interviewing", labelEs: "Ipsos cambia a entrevistas telefónicas", source: IPSOS_URL },
    { date: "2016-06-23", country: "uk", labelDe: "Brexit-Referendum", labelEn: "EU referendum", labelEs: "Referéndum del Brexit", source: "https://www.electoralcommission.org.uk/research-reports-and-data/our-reports-and-data-past-elections-and-referendums/eu-referendum" },
    { date: "2019-12-12", country: "uk", labelDe: "Unterhauswahl 2019", labelEn: "2019 general election", labelEs: "Elecciones generales de 2019", source: "https://commonslibrary.parliament.uk/research-briefings/cbp-8749/" },
    { date: "2020-03-23", country: "uk", labelDe: "Erster Covid-Lockdown", labelEn: "First Covid lockdown", labelEs: "Primer confinamiento por covid", source: "https://www.gov.uk/government/speeches/pm-address-to-the-nation-on-coronavirus-23-march-2020" },
    { date: "2022-05-25", country: "uk", labelDe: "Sue-Gray-Bericht zu Partygate", labelEn: "Sue Gray report on Partygate", labelEs: "Informe Sue Gray sobre Partygate", source: "https://www.gov.uk/government/publications/findings-of-the-second-permanent-secretarys-investigation-into-alleged-gatherings-on-government-premises-during-covid-restrictions" },
    { date: "2022-09-23", country: "uk", labelDe: "Mini-Budget der Regierung Truss", labelEn: "Truss government mini-budget", labelEs: "Mini-presupuesto del Gobierno Truss", source: "https://commonslibrary.parliament.uk/research-briefings/cbp-9649/" },
    { date: "2024-07-04", country: "uk", labelDe: "Unterhauswahl 2024", labelEn: "2024 general election", labelEs: "Elecciones generales de 2024", source: "https://commonslibrary.parliament.uk/research-briefings/cbp-10009/" },
    { date: "2024-07-29", country: "uk", labelDe: "Winter Fuel Payment wird begrenzt", labelEn: "Winter Fuel Payment becomes means-tested", labelEs: "Limitación de la ayuda de calefacción", source: "https://www.gov.uk/government/news/chancellor-i-will-take-the-difficult-decisions-to-restore-economic-stability" },
    { date: "2024-10-30", country: "uk", labelDe: "Herbsthaushalt 2024", labelEn: "Autumn Budget 2024", labelEs: "Presupuesto de otoño de 2024", source: "https://www.gov.uk/government/publications/autumn-budget-2024" },
    { date: "2026-07-20", country: "uk", labelDe: "Andy Burnham wird Premierminister", labelEn: "Andy Burnham becomes Prime Minister", labelEs: "Andy Burnham se convierte en primer ministro", source: "https://www.gov.uk/government/speeches/andy-burnhams-first-speech-as-prime-minister-20-july-2026" },
    { date: "2021-09-26", country: "de", labelDe: "Bundestagswahl 2021", labelEn: "2021 federal election", labelEs: "Elecciones federales de 2021", source: "https://www.bundeswahlleiterin.de/bundestagswahlen/2021/ergebnisse.html" },
    { date: "2022-02-24", country: "de", labelDe: "Russland greift die Ukraine an", labelEn: "Russia invades Ukraine", labelEs: "Rusia invade Ucrania", source: "https://www.bundestag.de/dokumente/textarchiv/2022/kw09-de-regierungserklaerung-882630" },
    { date: "2024-11-06", country: "de", labelDe: "Bruch der Ampelkoalition", labelEn: "Collapse of the traffic-light coalition", labelEs: "Ruptura de la coalición semáforo", source: "https://www.bundesregierung.de/breg-de/aktuelles/statement-des-bundeskanzlers-2319062" },
    { date: "2025-02-23", country: "de", labelDe: "Bundestagswahl 2025", labelEn: "2025 federal election", labelEs: "Elecciones federales de 2025", source: "https://www.bundeswahlleiterin.de/bundestagswahlen/2025/ergebnisse.html" },
    { date: "2025-05-06", country: "de", labelDe: "Friedrich Merz wird Bundeskanzler", labelEn: "Friedrich Merz becomes Chancellor", labelEs: "Friedrich Merz se convierte en canciller", source: "https://www.bundestag.de/dokumente/textarchiv/2025/kw19-de-kanzlerwahl-1062470" },
    { date: "2018-06-02", country: "es", labelDe: "Pedro Sánchez wird Ministerpräsident", labelEn: "Pedro Sánchez becomes Prime Minister", labelEs: "Pedro Sánchez se convierte en presidente", source: "https://www.lamoncloa.gob.es/presidente/actividades/Paginas/2018/020618-sanchezpromesa.aspx" },
    { date: "2019-11-10", country: "es", labelDe: "Parlamentswahl 2019", labelEn: "2019 general election", labelEs: "Elecciones generales de 2019", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/area-de-descargas/" },
    { date: "2020-03-14", country: "es", labelDe: "Covid-Ausnahmezustand", labelEn: "Covid state of alarm", labelEs: "Estado de alarma por covid", source: "https://www.boe.es/buscar/doc.php?id=BOE-A-2020-3692" },
    { date: "2023-07-23", country: "es", labelDe: "Parlamentswahl 2023", labelEn: "2023 general election", labelEs: "Elecciones generales de 2023", source: "https://infoelectoral.interior.gob.es/es/elecciones-celebradas/area-de-descargas/" },
    { date: "2023-12-01", country: "es", labelDe: "CIS ergänzt Bildung in der Gewichtung", labelEn: "CIS adds education to weighting", labelEs: "El CIS añade educación a la ponderación", source: CIS_SERIES.at(-2)[3] },
  ].filter((event) => INCLUDE_IPSOS || event.country !== "uk"),
};

for (const [country, data] of Object.entries(output.countries)) {
  for (const metric of ["government", "leader"]) {
    if (!data.series[metric].length) throw new Error(`${country}/${metric}: no approval data`);
    if (data.series[metric].some((point) => !/^\d{4}-\d{2}-\d{2}$/.test(point.date) || point.positive < 0 || point.positive > 100)) throw new Error(`${country}/${metric}: invalid point`);
  }
}

await writeFile(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Approval: DE ${deGovernment.length}/${deLeader.length}, UK ${uk ? `${uk.government.length}/${uk.leader.length}` : "withheld"}, ES ${es.government.length}/${es.leader.length}`);
