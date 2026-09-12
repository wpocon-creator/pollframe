import {load} from 'cheerio/slim';
import {createHash} from 'node:crypto';

const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const clean=value=>String(value).replace(/\s+/g,' ').trim();
const plain=value=>clean(value).normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
export const CIS_LICENSE='https://www.cis.es/es/aviso-legal';
export function cisUrl(value,base='https://www.cis.es/') {
  const url=new URL(value,base);
  if(url.protocol!=='https:'||url.hostname!=='www.cis.es'||url.username||url.password)throw Error('Untrusted CIS URL');
  return url.href;
}
export function cisStudyCandidates(now=new Date()) {
  return Array.from({length:12},(_,i)=>{const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-i,1));return `https://www.cis.es/es/estudios/barometro-de-${MONTHS[d.getUTCMonth()]}-${d.getUTCFullYear()}`;});
}
export function cisStudyLinks(html,url) {
  const $=load(html);const links={};
  for(const node of $('a[href]').toArray()) {
    const text=plain($(node).text()),href=$(node).attr('href');
    if(/resultados pdf/.test(text))links.results=cisUrl(href,url);
    if(/ficha tecnica/.test(text))links.technical=cisUrl(href,url);
  }
  if(!links.results||!links.technical)throw Error('CIS study lacks full results or technical sheet');
  const title=clean($('title').text());
  if(!/bar[oó]metro de/i.test(title))throw Error('Not a CIS monthly barometer');
  return {...links,title};
}

// Group PDF text by actual baseline, retaining the order of percentage columns.
// Never infer a TOTAL from one of the three individual mention columns.
export async function cisPdfText(buffer) {
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc=await getDocument({data:new Uint8Array(buffer),useSystemFonts:true,isEvalSupported:false}).promise;
  try {
    if(doc.numPages>150)throw Error('CIS PDF too long');
    const pages=[];
    for(let p=1;p<=doc.numPages;p++) {
      const content=await (await doc.getPage(p)).getTextContent();const lines=[];
      for(const item of content.items.filter(i=>i.str?.trim()).sort((a,b)=>b.transform[5]-a.transform[5]||a.transform[4]-b.transform[4])) {
        let row=lines.find(line=>Math.abs(line.y-item.transform[5])<2);
        if(!row){row={y:item.transform[5],items:[]};lines.push(row);}row.items.push(item);
      }
      pages.push(lines.map(line=>line.items.sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(' ')).join('\n'));
    }
    return pages.join('\n');
  }finally{await doc.destroy();}
}
const TOPICS=[
  ['housing',/^la vivienda$/,'#805ad5'],['economy',/crisis economica|problemas de indole economica/,'#dd6b20'],
  ['jobs',/calidad del empleo/,'#2b6cb0'],['immigration',/^la inmigracion$/,'#3f8c78'],['unemployment',/^el paro$/,'#9b6b43'],
  ['politics',/^los problemas politicos en general/,'#64748b'],['health',/^la sanidad$/,'#278a78'],
  ['government',/^el gobierno y partidos/,'#8662a8'],['politicians',/mal comportamiento de los/,'#7c6f64'],
  ['youth',/problemas relacionados con la juventud/,'#4b86b4'],['corruption',/corrupcion y el fraude/,'#a15c55'],
  ['extremism',/^los extremismos/,'#6f617e'],['insecurity',/inseguridad ciudadana/,'#b0783c'],
  ['education',/^la educacion$/,'#4279a3'],
];
const number=value=>value==='-'?0:Number(value.replace(',','.'));
function questionBlocks(text) {
  const chunks=text.split(/\bPregunta\s+([A-Z]?\d+[a-zA-Z]*)\s*\n/g),blocks=[];
  for(let i=1;i<chunks.length;i+=2)blocks.push({id:chunks[i],text:chunks[i+1].replace(/^.*(?:Estudio nº|Pág\s*\d).*$/gm,'')});
  return blocks;
}
function economy(block) {
  if(!block)throw Error('CIS economic question missing');
  const keys={'muy buena':'veryGood',buena:'good',regular:'regular',mala:'bad','muy mala':'veryBad','n.s.':'dontKnow','n.c.':'noAnswer'};
  const result={};
  for(const row of block.text.split('\n')) {
    const m=clean(row).match(/^(?:\(NO LEER\)\s*)?(Muy buena|Buena|Regular|Mala|Muy mala|N\.S\.|N\.C\.)\s+(\d+,\d+|-)$/i);
    if(m)result[keys[plain(m[1])]]=number(m[2]);
  }
  const total=Object.values(result).reduce((a,b)=>a+b,0);
  if(Object.keys(result).length!==7||Math.abs(total-100)>.6)throw Error(`Invalid CIS economic distribution (${total})`);
  return result;
}
function concerns(block) {
  if(!block||!/TOTAL/.test(block.text)||!/MULTIRRESPUESTA/.test(block.text))throw Error('CIS combined concern table missing');
  const rows=[];
  for(const line of block.text.split('\n')) {
    const m=clean(line).match(/^(.+?)\s+(\d+,\d+|-)\s+(\d+,\d+|-)\s+(\d+,\d+|-)\s+(\d+,\d+|-)$/);
    if(!m) {
      // The source wraps long labels below their percentage row.
      if(rows.length && /^[a-záéíóúñ]/.test(clean(line)) && !/^(problema|el orden|la tabla)\b/i.test(clean(line))) rows.at(-1).label += ' ' + clean(line);
      continue;
    }
    if(/^\(N\)|^n\.s\.|^n\.c\.|^ninguno/i.test(m[1]))continue;
    const parts=m.slice(2).map(number);
    if(parts.some(n=>!Number.isFinite(n)||n<0||n>100)||Math.abs(parts[0]+parts[1]+parts[2]-parts[3])>.31)throw Error('Invalid CIS concern TOTAL');
    const label=m[1],topic=TOPICS.find(([,pattern])=>pattern.test(plain(label)));
    rows.push({id:topic?.[0]||'cis-'+createHash('sha256').update(plain(label)).digest('hex').slice(0,12),label,value:parts[3],color:topic?.[2]||'#64748b'});
  }
  if(rows.length<20||!rows.some(r=>r.id==='housing')||new Set(rows.map(r=>r.id)).size!==rows.length)throw Error('Incomplete or duplicate CIS concerns');
  return rows.filter(row=>!/^n\.s\.|^n\.c\.|^ninguno/i.test(row.label)).sort((a,b)=>b.value-a.value);
}
function iso(year,month,day) {
  const date=new Date(Date.UTC(Number(year),MONTHS.indexOf(plain(month)),Number(day)));
  if(date.getUTCFullYear()!==Number(year)||date.getUTCDate()!==Number(day)||date.getUTCMonth()!==MONTHS.indexOf(plain(month)))throw Error('Invalid CIS fieldwork date');
  return date.toISOString().slice(0,10);
}
export function parseCisIssues(resultText,technicalText,{sourceUrl,studyUrl,technicalUrl,checkedAt=new Date().toISOString(),sourceUpdatedAt=null}) {
  const study=resultText.match(/Estudio\s+n[º°o]\s*(\d{4})/i)?.[1];
  if(!study||!new RegExp(`CIS\\s+N[º°o]\\s*${study}`,'i').test(technicalText))throw Error('CIS study and technical sheet mismatch');
  const sample=technicalText.match(/Realizada:\s*([\d.]+)\s+entrevistas/i)?.[1];
  const interviews=Number(sample?.replaceAll('.',''));if(!Number.isInteger(interviews)||interviews<1000||interviews>20000)throw Error('Invalid CIS sample');
  const field=technicalText.match(/Del\s+(\d{1,2})(?:\s+de\s+(\w+))?\s+al\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if(!field)throw Error('CIS fieldwork missing');
  const fieldwork=[iso(field[5],field[2]||field[4],field[1]),iso(field[5],field[4],field[3])];
  if(fieldwork[0]>fieldwork[1]||fieldwork[1]>checkedAt.slice(0,10))throw Error('Implausible CIS fieldwork');
  const blocks=questionBlocks(resultText);
  const personalEconomy=blocks.find(b=>/situacion economica personal/.test(plain(b.text)));
  const countryEconomy=blocks.find(b=>/situacion economica general de espana/.test(plain(b.text)));
  const national=blocks.find(b=>/principal problema que existe actualmente en espana/.test(plain(b.text))&&/TOTAL/.test(b.text));
  const personal=blocks.find(b=>/problema que a ud\.? personalmente le afecta/.test(plain(b.text).replaceAll(',',''))&&/TOTAL/.test(b.text));
  return {date:fieldwork[1],dateType:'fieldwork',source:'Centro de Investigaciones Sociológicas',sourceUrl:cisUrl(sourceUrl),studyUrl:cisUrl(studyUrl),technicalUrl:cisUrl(technicalUrl),study,interviews,fieldwork,checkedAt,sourceUpdatedAt,licenseUrl:CIS_LICENSE,updateMode:'automatic-official-cis',question:national?.text.split('\n').slice(0,3).map(clean).join(' '),questionIds:{national:national?.id,personal:personal?.id,personalEconomy:personalEconomy?.id,countryEconomy:countryEconomy?.id},items:concerns(national),personal:concerns(personal),economy:{personal:economy(personalEconomy),country:economy(countryEconomy)},note:'Respuesta espontánea, hasta tres menciones. Fuente: Centro de Investigaciones Sociológicas. Presentación de Pollframe, sin respaldo del CIS.'};
}

export async function fetchCis(url,{fetchImpl=fetch,allowMissing=false,maxBytes=8*1024*1024}={}) {
  const response=await fetchImpl(cisUrl(url),{redirect:'error',signal:AbortSignal.timeout(25000),headers:{'User-Agent':'PollframeDataUpdater/1.0 (official public survey tables)'}});
  if(allowMissing&&response.status===404)return null;
  if(!response.ok)throw Error(`CIS HTTP ${response.status}`);
  const reader=response.body.getReader(),chunks=[];let size=0;
  for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw Error('CIS response too large');}chunks.push(Buffer.from(value));}
  return {buffer:Buffer.concat(chunks),lastModified:response.headers.get('last-modified')};
}
export async function latestCisIssues({now=new Date(),fetchImpl=fetch}={}) {
  for(const sourceUrl of cisStudyCandidates(now)) {
    const page=await fetchCis(sourceUrl,{fetchImpl,allowMissing:true});if(!page)continue;
    // Fail on a changed latest study instead of silently falling back to April.
    const links=cisStudyLinks(page.buffer.toString('utf8'),sourceUrl);
    const [results,technical]=await Promise.all([fetchCis(links.results,{fetchImpl}),fetchCis(links.technical,{fetchImpl})]);
    return parseCisIssues(await cisPdfText(results.buffer),await cisPdfText(technical.buffer),{sourceUrl,studyUrl:links.results,technicalUrl:links.technical,checkedAt:now.toISOString(),sourceUpdatedAt:results.lastModified});
  }
  throw Error('No official CIS monthly study found in the last 12 months');
}
