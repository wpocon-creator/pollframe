import { assertSourceUse, pollingSourceId } from './source-permissions.js';

export const CC_BY_SA = 'https://creativecommons.org/licenses/by-sa/4.0/';
export const REGION_CHANGES = 'Pollframe normalises dates/parties and calculates summaries. Original poll sources remain linked per row.';
export function regionalAttribution(region) {
  return { rightsSource: 'wikipedia', source: 'Wikipedia contributors', sourceUrl: region.sourceUrl,
    sourceUrls: [...new Set([region.sourceUrl, ...(region.sourceUrls ?? []), ...(region.sourceCheck?.urls ?? [])].filter(Boolean))],
    license: 'CC BY-SA 4.0', licenseUrl: CC_BY_SA, changes: REGION_CHANGES };
}
export function pollReuseDetails(metadata, poll) {
  const id = pollingSourceId(metadata, poll);
  assertSourceUse(id, 'csv');
  const wiki = id === 'wikipedia';
  return { source: wiki ? 'Wikipedia contributors' : metadata.source,
    compilationUrl: poll.compilationUrl ?? metadata.sourceUrl,
    license: wiki ? 'CC BY-SA 4.0' : metadata.license,
    licenseUrl: wiki ? CC_BY_SA : metadata.licenseUrl,
    changes: wiki ? metadata.supplementarySource?.changes ?? metadata.changes ?? REGION_CHANGES : metadata.changes ?? '',
  };
}

// Linkless image credits must remain meaningful after an image leaves the site.
// Keep original study/date context and add short, resolvable source/licence URIs.
export function publicationCredit(credit = 'Pollframe', locale = 'en-GB') {
  const own = locale === 'de' ? 'eigene Darstellung/Berechnung' : locale === 'es' ? 'representación/cálculo propios' : 'own presentation/calculation';
  const lines = [];
  if (/DAWUM|dawum\.de/i.test(credit)) lines.push('Daten von dawum.de (Open Database License: odbl.dawum.de)');
  if (/Wikipedia|Electograph/i.test(credit)) lines.push(`Wikipedia contributors · CC BY-SA 4.0: creativecommons.org/licenses/by-sa/4.0 · ${own}`);
  if (/Election Data Vault/i.test(credit)) lines.push('UK Election Data Vault · electiondatavault.co.uk/about');
  if (/UK Parliament|Open Parliament Licence/i.test(credit)) lines.push('Contains Parliamentary information licensed under the Open Parliament Licence v3.0.');
  if (/Sachsen-Anhalt/i.test(credit)) lines.push(`Statistisches Landesamt Sachsen-Anhalt, Halle (Saale) 2026 · govdata.de/dl-de/by-2-0 · ${own}`);
  if (/Bundeswahlleiterin|Federal Returning Officer/i.test(credit)) lines.push(`Die Bundeswahlleiterin, Wiesbaden · bundeswahlleiterin.de · ${own}`);
  if (/MapSVG|svg-maps/i.test(credit)) lines.push(`MapSVG / Victor Cazanave · CC BY 4.0: creativecommons.org/licenses/by/4.0 · ${own}`);
  if (/\bCIS\b|Investigaciones Sociol/i.test(credit)) lines.push(`${credit.replace(/\s*·\s*Pollframe\s*$/i, '')} · cis.es · ${own}`);
  if (!lines.length) lines.push(credit);
  lines.push('Pollframe · pollframe.com/sources');
  return [...new Set(lines)].join('\n');
}
