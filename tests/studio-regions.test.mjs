import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDIO_DATASETS,searchStudioRegions,studioRegionPatch} from '../src/studio-regions.js';
import {normalizeStudioState,studioEmbedParams,studioHref} from '../src/studio-model.js';
import {GERMAN_REGION_IDS,isGermanRegion} from '../src/german-region-ids.js';

test('lightweight publishing-region validation stays in sync with the catalogue',()=>{
  assert.deepEqual([...GERMAN_REGION_IDS].sort(),STUDIO_DATASETS.map(([id])=>id).sort());
  assert.equal(isGermanRegion('berlin'),true);
  for(const id of ['uk-westminster','spain-congress','invented'])assert.equal(isGermanRegion(id),false);
});

test('all sixteen states survive recipe, link and source-embed normalization',()=>{
  assert.equal(STUDIO_DATASETS.length,17);
  for(const [region] of STUDIO_DATASETS){
    const state=normalizeStudioState({region,template:'poll-classic',currentBasis:'average',pollsters:'1,5'});
    assert.equal(state.region,region);
    assert.equal(studioEmbedParams(state,{source:true}).get('region'),region);
    assert.equal(studioEmbedParams(state,{source:true}).get('studioAverage'),'1');
    const params=new URL(studioHref({context:state}),'https://pollframe.com').searchParams;
    assert.equal(normalizeStudioState(Object.fromEntries(params)).region,region);
  }
  assert.equal(normalizeStudioState({region:'invented'}).region,'bundestag');
});
test('regional search preserves style terms, handles typos, aliases and compound names',()=>{
  for(const [query,region,rest] of [
    ['moden history Berlni','berlin','moden history'],
    ['Bavria simple','bayern','simple'],
    ['Sachsen-Anhalt modern','sachsen-anhalt','modern'],
    ['Baden Würtemberg','baden-wuerttemberg',''],
    ['lower saxony detailed','niedersachsen','detailed'],
    ['NRW historical','nordrhein-westfalen','historical'],
    ['Berlín moderno','berlin','moderno'],
    ['federal simple','bundestag','simple'],
  ])assert.deepEqual(searchStudioRegions(query),{regions:[region],query:rest});
  assert.deepEqual(searchStudioRegions('Berlin Hamburg'),{regions:['berlin','hamburg'],query:''});
  assert.deepEqual(searchStudioRegions('modern detailed'),{regions:[],query:'modern detailed'});
});
test('changing a dataset clears stale party, institute and coalition selections',()=>{
  const next=normalizeStudioState({...normalizeStudioState({region:'berlin',pollsters:'16',parties:'101',range:'five'}),...studioRegionPatch('bayern')});
  assert.equal(next.region,'bayern');
  assert.equal(next.pollsters,null);
  assert.equal(next.parties,null);
  assert.equal(next.coalition,null);
  assert.equal(next.range,'five');
  assert.equal(next.party,'csu');
});
