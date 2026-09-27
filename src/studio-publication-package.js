import { zipSync, strToU8 } from "fflate";
import { normalizeStudioState, isPausedStudioRequest } from "./studio-model.js";
import { publicationSources, unsupportedStudioDataset } from "./studio-publication-policy.js";
export async function publicationPackage({
  snapshot,
  state,
  note,
  caption = "",
  render,
  loadCalculator = () => import("./poll-history-calculator.js?raw").then(m => m.default),
}) {
  if (unsupportedStudioDataset(state) || isPausedStudioRequest(state) || snapshot?.kind === 'approval' || snapshot?.reuse?.status === 'permission-unconfirmed')
    throw Error('This dataset is withheld from publication');
  const image = await render();
  if (!image?.blob?.size) throw Error("No publication image");
  const createdAt = new Date().toISOString();
  const files = {
    "graphic.png": new Uint8Array(await image.blob.arrayBuffer()),
    "data.json": strToU8(JSON.stringify({ createdAt, snapshot }, null, 2)),
    "settings.json": strToU8(
      JSON.stringify(
        {
          type: "pollframe-publication",
          version: 1,
          createdAt,
          settings: normalizeStudioState(state),
        },
        null,
        2,
      ),
    ),
    "sources.txt": strToU8(note),
    "caption.txt": strToU8(caption),
    "LICENCES.txt": strToU8([
      'Dataset attribution and reuse terms (not a licence for unrelated source-site text or logos)',
      ...publicationSources(snapshot,state).map(item=>`${item.label}: ${item.url}`),
      `Data supplier: ${snapshot.source || 'See sources.txt'}`,
      `Source record: ${snapshot.sourceUrl || 'See sources.txt'}`,
      'Pollframe changes: selected records and parties, normalised fields, calculated averages/trends or seat-model values where identified.',
      ...(/dawum/i.test(snapshot.source || '') ? ['The supplied DAWUM-derived database is available under ODbL 1.0.'] : []),
      ...(snapshot.kind === 'map' ? ['Map geometry retains its separate CC BY 4.0 attribution.'] : []),
    ].join('\n')),
    "README.txt": strToU8(
      state.lang === "es"
        ? "Registro de publicación de Pollframe\n\nEl PNG y data.json conservan el estado de esta exportación. Una inserción normal de Pollframe vuelve a cargar los datos disponibles y no queda congelada. settings.json contiene los ajustes de presentación, no una URL de datos inmutable. data.json incluye las series o la instantánea representadas; latestCalculation, cuando existe, documenta la última media con igual peso por instituto y los pesos por partido, no todos los cálculos históricos. Siguen siendo aplicables las fuentes y licencias. Las tipografías y fondos locales no se incluyen como archivos separados. Conserva el PNG como registro de esta representación.\n"
        : state.lang === "de"
          ? "Pollframe-Publikationsbeleg\n\nPNG und data.json halten den Stand dieser Ausgabe fest. Ein normales Pollframe-Embed lädt verfügbare Daten erneut und ist nicht eingefroren. settings.json enthält Darstellungsoptionen, keine unveränderliche Datenadresse. data.json enthält die gezeichneten Reihen bzw. den Datenstand; latestCalculation dokumentiert, sofern vorhanden, den letzten gleichgewichteten Institutsdurchschnitt und die Gewichte je Partei, nicht jede historische Berechnung. Quellen und Lizenzen gelten weiterhin. Lokale Schrift- und Hintergrunddateien sind nicht separat enthalten. Bewahre das PNG als Beleg dieser Darstellung auf.\n"
          : "Pollframe publication record\n\nThe PNG and data.json freeze this export. An ordinary Pollframe embed reloads available data and is not frozen. settings.json records presentation settings, not an immutable dataset URL. data.json contains the plotted series/snapshot; latestCalculation, where present, documents the last equal-institute average and its per-party weights, not every historical calculation. Sources and licences remain applicable. Local custom fonts/background files are not bundled separately. Retain the PNG as the authoritative record of this rendering.\n",
    ),
  };
  if (snapshot.start && snapshot.end && Array.isArray(snapshot.trend)) {
    const { selectStudioEvents } = await import('./studio-event-selection.js');
    const { candidates, elections } = selectStudioEvents(snapshot, normalizeStudioState(state));
    // Preserve the editorial source record as well as poll data. Pixel placement
    // remains evidenced by graphic.png; some candidates are compact markers.
    files['events.json'] = strToU8(JSON.stringify({
      note: 'Editorial context, not evidence of causation. Layout and inclusion choices are recorded in settings.json; graphic.png records the visible labels.',
      candidates, elections,
    }, null, 2));
  }
  if (snapshot.calculationInputs) {
    files["inputs.json"] = strToU8(JSON.stringify(snapshot.calculationInputs, null, 2));
    files["calculator.mjs"] = strToU8(await loadCalculator());
    files["verify.mjs"] = strToU8(`import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {makeTrend,makeAverageSeries,POLL_CALCULATOR_VERSION} from './calculator.mjs';
const read = async name => JSON.parse(await readFile(new URL(name,import.meta.url),'utf8'));
const input = await read('inputs.json');
const {snapshot} = await read('data.json');
assert.equal(input.version,POLL_CALCULATOR_VERSION);
const trend = makeTrend(input.polls,input.selectedPollsters,input.start,input.end,input.parties,input.smoothingDays);
const averages = makeAverageSeries(input.polls,input.selectedPollsters,input.averageDates,input.parties.map(p=>p.id));
assert.deepEqual(trend,snapshot.trend);
assert.deepEqual(averages,snapshot.averages);
console.log('Verified every trend and average support point against the archived inputs.');
`);
    const extra = state.lang === "de"
      ? "\nHistorische Reproduktion: inputs.json enthält sämtliche benötigten Umfragen (einschließlich des 45-Tage-Vorlaufs) in ihrer ursprünglichen Reihenfolge. calculator.mjs ist der für diese Ausgabe verwendete Rechencode. Mit Node.js: node verify.mjs. Das prüft alle Trend- und Durchschnittspunkte, einschließlich Glättung und Endpunktkorrektur; nicht die Pixelgestaltung. manifest.json enthält SHA-256-Prüfsummen zur Integritätskontrolle, keine Echtheitsgarantie.\n"
      : state.lang === "es"
        ? "\nReproducción histórica: inputs.json incluye todas las encuestas necesarias, incluidos los 45 días anteriores, en su orden original. calculator.mjs contiene el código utilizado. Con Node.js: node verify.mjs. Verifica todos los puntos de tendencia y medias, incluido el suavizado y el ajuste final; no la apariencia de los píxeles. manifest.json contiene sumas SHA-256 para verificar la integridad, no la autenticidad.\n"
        : "\nHistorical replay: inputs.json contains every required poll, including the 45-day lookback, in original order. calculator.mjs is the calculation code used for this export. With Node.js: node verify.mjs. This checks every trend and average support point, including smoothing and endpoint correction, not pixel styling. manifest.json contains SHA-256 checksums for integrity, not proof of authenticity.\n";
    files["README.txt"] = strToU8(new TextDecoder().decode(files["README.txt"]) + extra);
  }
  const hashes = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([name,bytes]) => [name,
    Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)), b=>b.toString(16).padStart(2,"0")).join("")
  ])));
  files["manifest.json"] = strToU8(JSON.stringify({algorithm:"SHA-256",files:hashes},null,2));
  return new Blob([zipSync(files, { level: 3 })], { type: "application/zip" });
}
