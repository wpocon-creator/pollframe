import {normalizeSearch,searchDistance} from './studio-search-core.js';

export const STUDIO_DATASETS = [
  ['bundestag','Deutschland · Bundestag','Germany · Bundestag','Alemania · Bundestag','deutschland germany german federal bund bundestag alemania'],
  ['baden-wuerttemberg','Baden-Württemberg','Baden-Württemberg','Baden-Wurtemberg','bw baden wurttemberg baden wuerttemberg'],
  ['bayern','Bayern','Bavaria','Baviera','bavaria baviera'],
  ['berlin','Berlin','Berlin','Berlín',''],
  ['brandenburg','Brandenburg','Brandenburg','Brandeburgo','brandeburgo'],
  ['bremen','Bremen','Bremen','Bremen',''],
  ['hamburg','Hamburg','Hamburg','Hamburgo','hamburgo'],
  ['hessen','Hessen','Hesse','Hesse','hesse'],
  ['mecklenburg-vorpommern','Mecklenburg-Vorpommern','Mecklenburg-Western Pomerania','Mecklemburgo-Pomerania Occidental','mv mecklenburg western pomerania'],
  ['niedersachsen','Niedersachsen','Lower Saxony','Baja Sajonia','lower saxony baja sajonia'],
  ['nordrhein-westfalen','Nordrhein-Westfalen','North Rhine-Westphalia','Renania del Norte-Westfalia','nrw north rhine westphalia'],
  ['rheinland-pfalz','Rheinland-Pfalz','Rhineland-Palatinate','Renania-Palatinado','rhineland palatinate'],
  ['saarland','Saarland','Saarland','Sarre','sarre'],
  ['sachsen','Sachsen','Saxony','Sajonia','saxony sajonia'],
  ['sachsen-anhalt','Sachsen-Anhalt','Saxony-Anhalt','Sajonia-Anhalt','saxony anhalt'],
  ['schleswig-holstein','Schleswig-Holstein','Schleswig-Holstein','Schleswig-Holstein',''],
  ['thueringen','Thüringen','Thuringia','Turingia','thuringia turingia'],
];
export const studioRegionName=(id,lang='de')=>{
  const row=STUDIO_DATASETS.find(r=>r[0]===id)||STUDIO_DATASETS[0];
  return row[lang==='de'?1:lang==='es'?3:2];
};
export const studioRegionPatch=region=>({region,pollsters:null,parties:null,coalition:null,party:region==='bayern'?'csu':region==='bundestag'?'union':'cdu'});
const shortNames = {
  'baden-wuerttemberg':['bw'], 'nordrhein-westfalen':['nrw'],
  'mecklenburg-vorpommern':['mv','mecklenburg','meckpomm'],
  'schleswig-holstein':['sh'], 'rheinland-pfalz':['rlp'],
};
const regionAliases = STUDIO_DATASETS.map(row=>({
  region:row[0],
  aliases:[...new Set([row[0],row[1],row[2],row[3],...(row[0]==='bundestag'?row[4].split(' '):[]),...(shortNames[row[0]]||[])].map(normalizeSearch).filter(Boolean))],
}));

// Match phrases before single words, so Sachsen-Anhalt never becomes Sachsen.
// Ambiguous fuzzy matches never silently change the dataset. Entirely local.
export function searchStudioRegions(query){
  const tokens=normalizeSearch(query).slice(0,160).split(' ').filter(Boolean);
  const matches=[];
  for(let start=0;start<tokens.length;start++){
    const hits=[];
    for(let length=Math.min(5,tokens.length-start);length>=1;length--){
      const phrase=tokens.slice(start,start+length).join(' ');
      for(const {region,aliases} of regionAliases){
        for(const alias of aliases){
          const distance=phrase===alias?0:phrase.length>=4&&alias.length>=4?searchDistance(phrase,alias):3;
          if(distance>(phrase.length>8?2:1))continue;
          hits.push({region,start,length,score:length*10-distance*2});
        }
      }
    }
    hits.sort((a,b)=>b.score-a.score);
    const best=hits[0];
    if(best&&!hits.some(h=>h.region!==best.region&&h.score===best.score)){
      matches.push(best);start+=best.length-1;
    }
  }
  const used=new Set(matches.flatMap(m=>Array.from({length:m.length},(_,i)=>m.start+i)));
  return {regions:[...new Set(matches.map(m=>m.region))],query:tokens.filter((_,i)=>!used.has(i)).join(' ')};
}
