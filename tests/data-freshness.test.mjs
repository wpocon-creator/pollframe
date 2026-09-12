import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCisIssues,cisStudyCandidates,cisStudyLinks,cisUrl,fetchCis} from '../scripts/lib/cis-issues.mjs';
import {freshnessRecord,collectDataFreshness} from '../scripts/lib/data-freshness.mjs';
import {includesInstitute} from '../scripts/lib/institute-coverage.mjs';
import {regionalElectionLink,validateRegionalRefresh} from '../scripts/lib/regional-source-health.mjs';

// Official CIS study 3571, extracted excerpts; reusable with attribution under
// https://www.cis.es/es/aviso-legal. See DATA_UPDATE_FIXES_2026-09-12.md for URLs.
const results=await readFile(new URL('./fixtures/cis-july-2026-results.txt',import.meta.url),'utf8');
const technical=await readFile(new URL('./fixtures/cis-july-2026-technical.txt',import.meta.url),'utf8');
const options={sourceUrl:'https://www.cis.es/es/estudios/barometro-de-julio-2026',studyUrl:'https://www.cis.es/results.pdf',technicalUrl:'https://www.cis.es/technical.pdf',checkedAt:'2026-09-12T00:00:00Z'};
test('official CIS totals, all seven answers, sample and technical-sheet fieldwork are imported',()=>{
  const issue=parseCisIssues(results,technical,options);
  assert.equal(issue.study,'3571');assert.equal(issue.interviews,4020);
  assert.deepEqual(issue.fieldwork,['2026-07-01','2026-07-06']);
  assert.equal(issue.items[0].value,43);assert.notEqual(issue.items[0].value,23.3);
  assert.equal(issue.personal[0].value,26.9);
  assert.equal(issue.items.length,53);assert.equal(issue.personal.length,53);
  assert.equal(issue.economy.personal.good,63.3);assert.equal(issue.economy.country.good,33.8);
  assert.equal(Object.keys(issue.economy.country).length,7);
  assert.match(issue.personal.find(row=>row.id==='youth').label,/jóvenes$/);
});
test('changing question numbers does not select an unrelated question',()=>{
  const issue=parseCisIssues(results.replaceAll('Pregunta 11','Pregunta 21').replaceAll('Pregunta 12','Pregunta 22'),technical,options);
  assert.equal(issue.questionIds.personalEconomy,'21');assert.equal(issue.economy.country.veryGood,4.5);
});
test('changed tables fail rather than producing apparently fresh incomplete data',()=>{
  assert.throws(()=>parseCisIssues(results.replace('La vivienda 23,3 13,1 6,6 43,0','La vivienda 23,3 13,1 6,6 99,0'),technical,options),/TOTAL/);
  assert.throws(()=>parseCisIssues(results.replaceAll('TOTAL','Sum'),technical,options),/table missing/);
  assert.throws(()=>parseCisIssues(results.replace('Buena 63,3','Buena missing'),technical,options),/distribution/);
  assert.throws(()=>parseCisIssues(results,technical.replace('4.020','unknown'),options),/sample/);
  assert.throws(()=>parseCisIssues(results,technical.replace('3571','3572'),options),/mismatch/);
  assert.throws(()=>parseCisIssues(results,technical,{...options,checkedAt:'2026-07-01T00:00:00Z'}),/fieldwork/);
});
test('monthly discovery crosses years and never trusts unrelated documents',()=>{
  assert.match(cisStudyCandidates(new Date('2026-01-15T00:00:00Z'))[1],/diciembre-2025$/);
  assert.throws(()=>cisUrl('https://www.cis.es.evil.test/x'),/Untrusted/);
  assert.throws(()=>cisStudyLinks('<title>Barómetro de julio</title>',options.sourceUrl),/lacks/);
});
test('missing monthly pages are distinguishable from real server failure and oversized responses',async()=>{
  assert.equal(await fetchCis(options.sourceUrl,{allowMissing:true,fetchImpl:async()=>new Response('',{status:404})}),null);
  await assert.rejects(fetchCis(options.sourceUrl,{allowMissing:true,fetchImpl:async()=>new Response('',{status:503})}),/503/);
  await assert.rejects(fetchCis(options.sourceUrl,{maxBytes:2,fetchImpl:async()=>new Response('123')}),/too large/);
});
test('fresh fetch timestamps cannot disguise stale observations',()=>{
  const now=new Date('2026-09-12T12:00:00Z');
  assert.equal(freshnessRecord('a','2026-04-10',{now}).status,'stale');
  assert.equal(freshnessRecord('a','2026-09-11',{now}).ageDays,1);
  assert.equal(freshnessRecord('a','2026-02-31',{now}).status,'missing');
  assert.equal(freshnessRecord('a','2026-09-13',{now}).status,'future');
  assert.equal(freshnessRecord('a','2020-01-01',{now,archive:true}).status,'archive');
});
test('new institutes are confined to states; Ipsos stays excluded',()=>{
  for(const id of ['4','16']){assert.equal(includesInstitute('state',id),true);assert.equal(includesInstitute('federal',id),false);}
  assert.equal(includesInstitute('state','8'),false);
});
test('regional follow-up links must be the same election family on Wikipedia',()=>{
  const page='2026_Andalusian_regional_election';
  assert.equal(regionalElectionLink('/wiki/Next_Andalusian_regional_election',page),'Next_Andalusian_regional_election');
  for(const url of ['/wiki/Next_Catalan_regional_election','https://evil.test/wiki/Next_Andalusian_regional_election','/wiki/Next_Andalusian_regional_election?redlink=1'])assert.equal(regionalElectionLink(url,page),null);
});
test('empty, truncated and date-regressed regional refreshes preserve the previous snapshot',()=>{
  const old={polls:Array(10).fill({}),parties:[{}],coverage:{latestDate:'2026-09-01'},lastElection:{date:'2026-05-17'}};
  assert.throws(()=>validateRegionalRefresh({...old,polls:[]},old),/No usable/);
  assert.throws(()=>validateRegionalRefresh({...old,polls:Array(5).fill({})},old),/disappeared/);
  assert.throws(()=>validateRegionalRefresh({...old,coverage:{latestDate:'2026-01-01'}},old),/backwards/);
  assert.throws(()=>validateRegionalRefresh({...old,lastElection:null},old),/election disappeared/);
  assert.equal(validateRegionalRefresh(old,old),old);
});
test('freshness audit covers all active national series and 35 regions',async()=>{
  const rows=await collectDataFreshness();
  assert.equal(rows.length,41);
  assert.equal(rows.some(row=>row.status==='missing'),false);
  assert.ok(rows.find(row=>row.id==='de/bayern').date >= '2026-08-14');
});
