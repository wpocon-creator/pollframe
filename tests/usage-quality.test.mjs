import test from 'node:test';
import assert from 'node:assert/strict';
import {observeUsage} from '../src/usage-quality.js';
import {excludeAnalyticsRequest} from '../worker/analytics-quality.js';

function harness(){
  let time=0,next=0;
  const timers=new Map(),listeners=new Map(),sent=[];
  const doc={visibilityState:'visible',addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:name=>listeners.delete(name)};
  const win={performance:{now:()=>time},setTimeout:(fn,delay)=>{timers.set(++next,{fn,at:time+delay});return next;},clearTimeout:id=>timers.delete(id)};
  const stop=observeUsage(event=>sent.push(event),doc,win);
  const advance=ms=>{time+=ms;for(const[id,timer]of timers)if(timer.at<=time){timers.delete(id);timer.fn();}};
  return {sent,stop,advance,listeners,timers,interact:(trusted=true)=>listeners.get('pointerup')?.({isTrusted:trusted}),visibility:visible=>{doc.visibilityState=visible?'visible':'hidden';listeners.get('visibilitychange')?.();}};
}
test('one minute alone is not a qualified read; synthetic interactions do not count',()=>{
  const h=harness();h.interact(false);h.advance(60000);
  assert.deepEqual(h.sent,['engaged_60_seconds']);h.interact();h.interact();h.advance(120000);
  assert.deepEqual(h.sent,['engaged_60_seconds','qualified_read_60_seconds']);
  h.stop();assert.equal(h.listeners.size,0);assert.equal(h.timers.size,0);
});
test('hidden time and hidden interactions are excluded, keyboard/mouse data never leaves memory',()=>{
  const h=harness();h.advance(30000);h.visibility(false);h.interact();h.advance(600000);assert.deepEqual(h.sent,[]);
  h.visibility(true);h.advance(30000);assert.deepEqual(h.sent,['engaged_60_seconds']);
  h.listeners.get('keydown')({isTrusted:true,key:'private text',clientX:23});
  assert.deepEqual(h.sent,['engaged_60_seconds','qualified_read_60_seconds']);h.stop();
});
test('known automation and configured internal addresses are excluded without storing them',()=>{
  const req=ua=>new Request('https://pollframe.com/api/analytics',{headers:{'user-agent':ua,'cf-connecting-ip':'192.0.2.1'}});
  for(const ua of ['Googlebot/2.1','HeadlessChrome/120','PollframeInternalAudit/1.0','curl/8.0'])assert.equal(excludeAnalyticsRequest(req(ua)),true);
  for(const ua of ['Unknown','Mozilla/5.0 Firefox/140',''])assert.equal(excludeAnalyticsRequest(req(ua)),false);
  assert.equal(excludeAnalyticsRequest(req('Firefox'),{ANALYTICS_EXCLUDED_IPS:'192.0.2.1, 192.0.2.2'}),true);
  assert.equal(excludeAnalyticsRequest(req('Firefox'),{ANALYTICS_EXCLUDED_IPS:'192.0.2.2'}),false);
});
