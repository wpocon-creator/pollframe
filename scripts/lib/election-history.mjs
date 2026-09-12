export function validateElectionHistory(value){
  if(!value)return null;
  if(value.date!=='2026-09-06'||!['provisional','final'].includes(value.status)||!Number.isFinite(Date.parse(value.publishedAt))||value.sourceUrl!=='https://wahlergebnisse.sachsen-anhalt.de/wahlen/lt26/erg_land.html'||value.license!=='dl-de/by-2-0'||value.licenseUrl!=='https://www.govdata.de/dl-de/by-2-0')throw Error('Invalid official election provenance');
  const values=Object.values(value.results||{});
  if(values.length<5||values.some(n=>!Number.isFinite(n)||n<0||n>100)||values.reduce((a,b)=>a+b,0)>100.5)throw Error('Invalid official election shares');
  return value;
}
