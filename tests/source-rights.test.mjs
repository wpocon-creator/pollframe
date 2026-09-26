import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { canUseSource, assertSourceUse, USES, SOURCE_RIGHTS } from '../src/source-rights.js';
import { pollReuseDetails, regionalAttribution, publicationCredit, CC_BY_SA } from '../src/source-attribution.js';
import { DEFAULT_FEDERAL_INSTITUTES, DEFAULT_REGIONAL_INSTITUTES, includesInstitute } from '../scripts/lib/institute-coverage.mjs';

test('permissions are explicit per use; unknown sources and withheld archives fail closed', () => {
  for (const id of ['fgw-direct','ipsos-direct','unknown']) for (const use of USES) {
    assert.equal(canUseSource(id, use), false);
    assert.throws(() => assertSourceUse(id, use));
  }
  assert.equal(canUseSource('dawum','imagined-permission'),false);
  assert.ok(Object.isFrozen(SOURCE_RIGHTS.dawum.uses));
  assert.equal(canUseSource('dawum','paidProduct'),true);
});
test('mixed UK CSV uses row-specific licence and compilation, never the parent blanket', () => {
  const metadata={source:'UK Election Data Vault',sourceUrl:'https://electiondatavault.co.uk/data/',license:'Free commercial reuse',licenseUrl:'https://electiondatavault.co.uk/about/', supplementarySource:{changes:'Normalised dates'}};
  const result=pollReuseDetails(metadata,{compilationUrl:'https://en.wikipedia.org/wiki/Example',sourceUrl:'https://yougov.co.uk/poll',license:'CC BY-SA 4.0'});
  assert.equal(result.licenseUrl,CC_BY_SA);
  assert.equal(result.compilationUrl,'https://en.wikipedia.org/wiki/Example');
  assert.equal(result.source,'Wikipedia contributors');
  assert.equal(result.changes,'Normalised dates');
  assert.equal(pollReuseDetails(metadata,{}).license,'Free commercial reuse');
  assert.throws(()=>pollReuseDetails({rightsSource:'fgw-direct'},{}));
  assert.throws(()=>pollReuseDetails({rightsSource:'fgw-direct'},{compilationUrl:'https://en.wikipedia.org/wiki/Example'}));
  assert.throws(()=>pollReuseDetails({},{compilationUrl:'https://unlicensed.example/table',license:'CC BY-SA 4.0'}));
});
test('regional receipt retains old and successor archives, without inventing data dates', () => {
  const region={sourceUrl:'https://en.wikipedia.org/wiki/Old',sourceCheck:{urls:['https://en.wikipedia.org/wiki/Old','https://en.wikipedia.org/wiki/New']}};
  const receipt=regionalAttribution(region);
  assert.equal(receipt.sourceUrls.length,2);
  assert.equal(receipt.licenseUrl,CC_BY_SA);
  assert.equal(receipt.generatedAt,undefined);
});
test('image credits survive detached PNGs for all current source families', () => {
  assert.match(publicationCredit('DAWUM · ODbL 1.0'),/dawum\.de.*odbl\.dawum\.de/);
  assert.match(publicationCredit('Wikipedia contributors'),/creativecommons.org\/licenses\/by-sa\/4.0/);
  assert.match(publicationCredit('UK Parliament'),/Contains Parliamentary information licensed under the Open Parliament Licence v3.0/);
  assert.match(publicationCredit('MapSVG'),/Victor Cazanave/);
  assert.match(publicationCredit('Statistisches Landesamt Sachsen-Anhalt','de'),/eigene Darstellung/);
  for(const locale of ['de','en-GB','en-US','es']) assert.match(publicationCredit('CIS · study 123',locale),/study 123/);
});
test('expanded institute options preserve default averages and keep pending source excluded', () => {
  assert.equal(DEFAULT_FEDERAL_INSTITUTES.length,7);
  assert.equal(DEFAULT_REGIONAL_INSTITUTES.length,9);
  for(const id of ['4','16','22']) assert.equal(includesInstitute('federal',id),true);
  for(const type of ['federal','state']) assert.equal(includesInstitute(type,'17'),false);
});
test('preview and image share the same mandatory attribution renderer', async () => {
  const source=await readFile(new URL('../src/png-export.jsx',import.meta.url),'utf8');
  assert.match(source,/creditNode.textContent = publicationCredit\(credit, locale\)/);
  assert.ok(source.match(/createExportSurface\(/g).length>=3);
});
