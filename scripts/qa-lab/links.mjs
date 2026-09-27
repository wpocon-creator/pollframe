import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {collectDataFreshness} from '../lib/data-freshness.mjs';
const out='test-results/qa-lab';await mkdir(out,{recursive:true});const start=performance.now();
const samples=[];
for(const file of ['public/data/bundestag.json','public/data/berlin.json','public/data/bayern.json','public/data/uk-westminster.json','public/spain-summary.json','public/data/spain-congress.json']){
 const data=JSON.parse(await readFile(file,'utf8'));const urls=[];
 function walk(x){if(!x||typeof x!=='object')return;for(const[k,v]of Object.entries(x)){if(typeof v==='string'&&/^https:\/\//.test(v)&&/source|url|license|method|technical/i.test(k))urls.push(v);else if(typeof v==='object'&&!['polls','rows','results','parties'].includes(k))walk(v);}}
 walk(data);for(const url of [...new Set(urls)].slice(0,4))if(!samples.some(x=>x.url===url))samples.push({file,url});
}
// Small, sequential, public read-only requests. No admin routes or scanning.
const allowed=['dawum.de','opendatacommons.org','cis.es','yougov.co.uk','en.wikipedia.org','en.wikipedia.org','electionpolling.co.uk','survation.com','electoralcalculus.co.uk','wikipedia.org'];
const results=[];for(const sample of samples.slice(0,14)){
 const u=new URL(sample.url);if(u.username||u.password||!allowed.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))){results.push({...sample,status:'not-probed',reason:'outside explicit host allowlist'});continue;}
 try{const r=await fetch(u,{signal:AbortSignal.timeout(12000),redirect:'follow',headers:{'User-Agent':'Pollframe source-link verification (read-only)','Range':'bytes=0-20000'}});let bytes=0,body='';const reader=r.body?.getReader();while(reader){const{done,value}=await reader.read();if(done)break;bytes+=value.length;body+=new TextDecoder().decode(value);if(bytes>=100000){await reader.cancel();break;}}
  const title=body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g,' ').trim();results.push({...sample,status:r.status,finalUrl:r.url,title,contentType:r.headers.get('content-type'),interpretation:[403,429].includes(r.status)?'access restriction; not proof of broken link':r.status>=400?'needs review':'reachable; content relevance still needs review'});
 }catch(e){results.push({...sample,status:'unresolved',error:e.message});}
 console.log(JSON.stringify(results.at(-1)));await new Promise(r=>setTimeout(r,250));
}
await writeFile(out+'/sources.json',JSON.stringify({seconds:(performance.now()-start)/1000,links:results,localFreshness:await collectDataFreshness()},null,2));
