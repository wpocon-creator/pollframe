import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export function freshnessRecord(id, date, {now = new Date(), maxAgeDays = 14, archive = false} = {}) {
  if (archive) return {id, date: date || null, status: 'archive', ageDays: null};
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? Date.parse(date + 'T00:00:00Z') : NaN;
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0,10) !== date) return {id, date: date || null, status: 'missing', ageDays: null};
  const ageDays = Math.floor((now.getTime() - parsed) / 86400000);
  return {id, date, ageDays, maxAgeDays, status: ageDays < 0 ? 'future' : ageDays > maxAgeDays ? 'stale' : 'current'};
}
const latest = rows => rows?.map(row => row.date).filter(Boolean).sort().at(-1);

export async function collectDataFreshness(root = 'public', now = new Date()) {
  const read = path => readFile(resolve(root, path), 'utf8').then(JSON.parse);
  const records = [];
  async function source(id, file, inspect) {
    try { await inspect(await read(file)); }
    catch (error) { records.push({id, status: 'missing', date: null, reason: error.message}); }
  }
  for (const [id, file] of [['de', 'poll-data.json'], ['uk', 'data/uk-westminster.json'], ['es', 'data/spain-congress.json']]) {
    await source(id, file, data => records.push(freshnessRecord(id, latest(data.polls), {now, maxAgeDays: 14})));
  }
  await source('es/issues', 'spain-summary.json', data => {
    const row = freshnessRecord('es/issues', data.issues?.fieldwork?.[1], {now, maxAgeDays: 75});
    row.updateMode = data.issues?.updateMode;
    if (row.updateMode !== 'automatic-official-cis') row.status = 'manual-snapshot';
    records.push(row);
  });
  await source('approval', 'data/approval.json', data => {
    for (const metric of ['government', 'leader']) records.push(freshnessRecord(`de/approval/${metric}`, latest(data.countries?.de?.series?.[metric]), {now, maxAgeDays: 45}));
    // UK Ipsos is withheld and Spanish approval is an intentional archive.
    // Neither is presented as an actively updated current series.
  });
  await source('de/regions', 'regions.json', async data => {
    for (const region of data.regions.filter(region => region.type === 'state')) {
      await source(`de/${region.slug}`, `data/${region.slug}.json`, data => records.push(freshnessRecord(`de/${region.slug}`, latest(data.polls), {now, maxAgeDays: 120})));
    }
  });
  await source('es/regions', 'data/spain-regions.json', data => {
    for (const region of data.regions) {
      const row = freshnessRecord(`es/${region.slug}`, region.coverage?.latestDate, {now, maxAgeDays: 120});
      row.coverage = region.coverage?.status;
      row.currentDate = region.current?.date || null;
      row.sourceCheck = region.sourceCheck?.status || 'not-recorded';
      records.push(row);
    }
  });
  return records;
}
