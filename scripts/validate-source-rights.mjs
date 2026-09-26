import { readFile } from 'node:fs/promises';
import { canUseSource as runtimeCanUse } from '../src/source-permissions.js';
import { assertSourceUse, SOURCE_RIGHTS, USES, pollingSourceId } from '../src/source-rights.js';
import { pollReuseDetails, CC_BY_SA } from '../src/source-attribution.js';
const json = async path => JSON.parse(await readFile(path, 'utf8'));
for (const [id, entry] of Object.entries(SOURCE_RIGHTS)) {
  if (!entry.evidence.startsWith('https://') || !entry.scope || !entry.reviewed || USES.some(use => typeof entry.uses[use] !== 'boolean')) throw Error(`Incomplete rights record: ${id}`);
  if (USES.some(use => entry.uses[use] !== runtimeCanUse(id, use))) throw Error(`Runtime permission differs from documented scope: ${id}`);
}
const regions = await json('public/regions.json');
for (const file of ['public/poll-data.json', 'public/data/uk-westminster-polls.json', 'public/data/spain-congress.json', ...regions.regions.map(r => `public/data/${r.slug}.json`)]) {
  const data = await json(file);
  if (!data.polls) continue;
  for (const poll of data.polls) {
    const id = pollingSourceId(data.metadata, poll);
    for (const use of ['display','png','embed','csv','publicData']) assertSourceUse(id, use);
    const details = pollReuseDetails(data.metadata, poll);
    if (!details.license || !details.licenseUrl?.startsWith('https://') || !details.compilationUrl?.startsWith('https://')) throw Error(`Missing reuse details: ${file}`);
  }
}
const regional = await json('public/data/spain-regions.json');
for (const region of regional.regions) {
  if (region.licenseUrl !== CC_BY_SA || !region.changes || !region.sourceUrls.includes(region.sourceUrl)) throw Error(`Incomplete regional attribution: ${region.slug}`);
}
const approval = await json('public/data/approval.json');
if (approval.countries.de || approval.countries.uk) throw Error('Withheld approval data reintroduced');
console.log('Source rights: per-use permissions, CSV provenance and regional notices verified.');
