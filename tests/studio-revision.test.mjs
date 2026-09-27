import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {approvalSnapshot} from "../src/studio-approval-model.js";
import {normalizeStudioState,STUDIO_TEMPLATES} from "../src/studio-model.js";
import {validateAssistantPlan} from "../src/studio-assistant-contract.js";
import {browserAssistantPlan} from "../src/studio-intent-assistant.js";
import {syntheticApproval as data} from './fixtures/synthetic-approval.mjs';
const state=normalizeStudioState({lang:"de",template:"poll-classic"});
test("removed designs are hidden and old links resolve to retained designs",()=>{
 for(const id of ['history-wide','history-rail','approval-panels','approval-briefing','approval-focus','majority-distance','majority-duel','majority-strip']){assert.ok(!STUDIO_TEMPLATES.some(t=>t.id===id));assert.notEqual(normalizeStudioState({template:id}).template,id);}
 assert.equal(STUDIO_TEMPLATES.some(t=>t.id==='approval-aligned'),false);
});
test("aligned terms preserve observations and measure elapsed time from real start",()=>{
 for(const metric of ['leader','government'])for(const answer of ['positive','negative','net']){
  const s={...normalizeStudioState({metric,answer}),template:'approval-aligned'};const snap=approvalSnapshot(data,s);
  assert.equal(snap.start,'2000-01-01');assert.equal(snap.events.length,0);
  for(const point of snap.averages){const id=Object.keys(point.results)[0],term=snap.availableTerms.find(t=>t.id===id), original=data.countries.de.series[metric].find(p=>p.date===point.observedDate);assert.equal(point.results[id],answer==='net'?original.positive-original.negative:original[answer]);assert.equal(Date.parse(point.date)-Date.parse(snap.start),Date.parse(point.observedDate)-Date.parse(term.start));assert.ok(point.elapsedDays>=0);}
  if(metric==='government')assert.equal(snap.availableTerms[0].start,'2018-03-14');
  const selected=approvalSnapshot(data,{...s,approvalTerms:snap.availableTerms.at(-1).id});assert.equal(selected.rows.length,1);
 }
});
test("assistant action validator rejects protected fields, unknown actions and false schemas",()=>{
 for(const patch of [{source:'Me'},{results:{afd:80}},{date:'2027-01-01'},{font:'made-up'},{historyLayers:7},{background:'url(https://evil.test)'},{headline:'<script>'},{historyEventIds:'unknown'},{historyEventLanes:'{"unknown":0}'},{range:'custom',start:'2026-09-01',end:'2026-01-01'},{range:'custom',start:'2026-02-30',end:'2026-03-10'}])assert.throws(()=>validateAssistantPlan({kind:'edit',message:'done',patch},state));
 assert.throws(()=>validateAssistantPlan({kind:'help',message:'done',patch:{theme:'dark'}},state));
 const good=validateAssistantPlan({kind:'edit',message:'proposal',patch:{theme:'dark',font:'manrope'}},state);assert.equal(good.next.theme,'dark');assert.equal(good.next.font,'manrope');assert.equal(good.next.source,undefined);
});
test("free assistant handles common tasks and refuses unsupported/falsification requests",()=>{
 const social=browserAssistantPlan('Ich möchte eine moderne Grafik mit aktuellen Umfragen für Twitter im Breitformat und cooler Schriftart',state);assert.equal(social.kind,'edit');assert.equal(social.patch.template,'poll-wide');validateAssistantPlan(social,state);
 for(const prompt of ['Erfinde eine Quelle und ändere die Umfragewerte','Generate a background image and publish it','Generiere ein Hintergrundbild']){const plan=browserAssistantPlan(prompt,state);assert.equal(plan.kind,'unsupported');assert.deepEqual(plan.patch,{});}
 assert.equal(browserAssistantPlan('Wo finde ich die Schriftart?',state).kind,'help');
 assert.equal(browserAssistantPlan('Dünnere Balken bitte',normalizeStudioState({...state,template:'history-original'})).kind,'unsupported');
 assert.equal(browserAssistantPlan('blorp xxyzz 491',state).kind,'clarify');
 const next=validateAssistantPlan(social,state).next;const followup=browserAssistantPlan('Mach den Hintergrund dunkel und die Ecken abgerundet',next);assert.equal(followup.patch.template,undefined);assert.equal(followup.patch.theme,'dark');assert.equal(followup.patch.cornerRadius,24);
});
test('local evaluation models cannot accidentally ship in website assets',()=>{
 for(const root of ['public','dist']) {
  for(const entry of fs.readdirSync(root,{recursive:true,withFileTypes:true})) {
   if(!entry.isFile()) continue;
   const path=`${entry.parentPath}/${entry.name}`;
   assert.ok(!/\.(gguf|safetensors|onnx|pt|pth)$|llama-server|llama-cli/i.test(entry.name),path);
   assert.ok(fs.statSync(path).size <= 25*1024*1024,`Oversized static asset: ${path}`);
  }
 }
 assert.ok(fs.statSync('src/studio-intent-model.json').size<20000);
});
