// Metadata-only migration; never change poll values or pretend data is newer.
import { readFile, writeFile } from 'node:fs/promises';
import { regionalAttribution, CC_BY_SA, REGION_CHANGES } from '../src/source-attribution.js';
import { SOURCE_RIGHTS, assertSourceUse } from '../src/source-rights.js';
const path = 'public/data/spain-regions.json';
const regions = JSON.parse(await readFile(path, 'utf8'));
for (const region of regions.regions) Object.assign(region, regionalAttribution(region));
Object.assign(regions.metadata, { rightsSource: 'wikipedia', source: 'Wikipedia contributors', license: 'CC BY-SA 4.0', licenseUrl: CC_BY_SA, changes: REGION_CHANGES, sourceUrls: [...new Set(regions.regions.flatMap(r => r.sourceUrls))] });
await writeFile(path, JSON.stringify(regions) + '\n');
const receipt = { reviewed: '2026-09-26', scope: 'Numerical datasets used by the published site. Each original poll reference is retained in its dataset. Permissions are use-specific; linked terms and attribution conditions apply.', rights: SOURCE_RIGHTS, datasets: [] };
for (const [file, id] of [
  ['poll-data.json','dawum'], ['state-map-data.json','dawum'], ['data/uk-westminster-polls.json','vault'], ['data/uk-constituencies.json','parliament'], ['data/spain-congress.json','wikipedia'], ['data/spain-regions.json','wikipedia'], ['data/election-st2026.json','sachsen-anhalt'],
]) {
  assertSourceUse(id, 'publicData');
  const data = JSON.parse(await readFile(`public/${file}`, 'utf8'));
  receipt.datasets.push({ file: `/${file}`, rightsSource: id, metadata: data.metadata ?? { sourceUrl: data.sourceUrl, license: data.license, licenseUrl: data.licenseUrl } });
}
const { issues } = JSON.parse(await readFile('public/spain-summary.json', 'utf8'));
receipt.datasets.push({ file: '/spain-summary.json', section: 'issues', rightsSource: 'cis', metadata: { source: 'Centro de Investigaciones Sociológicas', study: issues.study, sourceUrl: issues.sourceUrl, studyUrl: issues.studyUrl, fieldwork: issues.fieldwork, licenseUrl: SOURCE_RIGHTS.cis.evidence, changes: 'Published aggregate percentages selected, sorted and presented in Pollframe charts.' } });
await writeFile('public/data/source-receipt.json', JSON.stringify(receipt, null, 2) + '\n');
