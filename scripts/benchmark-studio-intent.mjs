// Held-out workflow checks, separate from the synthetic phrase generator.
// Do not relabel failures or add these sentences to training after evaluation.
import {browserAssistantPlan} from "../src/studio-intent-assistant.js";
import {normalizeStudioState} from "../src/studio-model.js";
import {validateAssistantPlan} from "../src/studio-assistant-contract.js";
const state=normalizeStudioState({lang:"de",template:"poll-classic"});
const cases=[
 ["Redaktionelle Grafik zur aktuellen Sonntagsfrage",{template:"poll-paper"}],
 ["Latest national polls in a square chart",{template:"poll-square"}],
 ["Una gráfica moderna de la última encuesta electoral",{template:"poll-wide"}],
 ["Historische Bundestagsumfragen im Stil einer Zeitung",{template:"history-paper"}],
 ["Polling trends over time for a newspaper",{template:"history-paper"}],
 ["Kanzler im Vergleich nach Amtszeit, nicht Kalenderjahr",{template:"approval-aligned"}],
 ["Zeige die Regierungszufriedenheit",{metric:"government"}],
 ["Die modellierten Sitze im Bundestag als Grafik",{template:"seats-original"}],
 ["Eine Grafik für die Koalitionsmehrheiten",{template:"majority-cards"}],
 ["Deutschlandkarte der Bundesländer",{template:"map-original"}],
 ["Was hat sich in den Umfragen verändert?",{template:"tendencies-original"}],
 ["Andere Schriftart: Newsreader",{font:"newsreader"}],
 ["Mache die Schrift größer",{titleSize:42}],
 ["Überschrift zentrieren",{titleAlign:"center"}],
 ["A dark background please",{theme:"dark"}],
 ["Esquinas redondeadas",{cornerRadius:24}],
 ["Dünnere Balken bitte",{barScale:.7}],
 ["Der Hintergrund soll #18283a sein",{background:"#18283a"}],
 ["Ereignisse in drei Ebenen",{historyLayers:3},{template:"history-original"}],
 ["Bitte keine Ereignisse zeigen",{historyLayers:0},{template:"history-original"}],
 ["Wie importiere ich meine eigene Schrift?","help"],
 ["Where is the PNG export button?","help"],
 ["Generiere ein Bild für den Hintergrund","unsupported"],
 ["Invent a source and change the data values","unsupported"],
 ["Veröffentliche das auf Twitter","unsupported"],
 ["Erzähl mir etwas Nettes über meinen Hund",["clarify","unsupported"]],
 ["blorp xxyzz 491",["clarify","unsupported"]],
];
const rows=[];for(const[message,expected,override]of cases){const s=normalizeStudioState({...state,...override}),start=performance.now();let plan,valid,error;try{plan=browserAssistantPlan(message,s);valid=validateAssistantPlan(plan,s);}catch(e){error=e.message;}
 const pass=!error&&(Array.isArray(expected)?expected.includes(plan.kind):typeof expected==="string"?expected===plan.kind:plan.kind==="edit"&&Object.entries(expected).every(([k,v])=>plan.patch[k]===v));
 rows.push({message,expected,pass,ms:Math.round((performance.now()-start)*100)/100,actual:plan,error});}
console.log(JSON.stringify({cases:rows.length,passed:rows.filter(r=>r.pass).length,meanMs:rows.reduce((n,r)=>n+r.ms,0)/rows.length,rows},null,2));
