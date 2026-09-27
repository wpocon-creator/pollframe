// An engagement proxy, not a visitor ID or a bot verdict. Keep only elapsed
// visible time and one interaction boolean in this page's memory; send no
// keys, coordinates, URLs, event sequences or device information.
export function observeUsage(emit,doc=document,win=window){
  let visibleSince=doc.visibilityState==='visible'?win.performance.now():null;
  let elapsed=0,interacted=false,read=false,qualified=false,timer;
  const events=['pointerup','keydown','wheel','click'];
  const duration=()=>elapsed+(visibleSince===null?0:win.performance.now()-visibleSince);
  const check=()=>{
    if(visibleSince===null||duration()<60000)return;
    if(!read){read=true;emit('engaged_60_seconds');}
    if(interacted&&!qualified){qualified=true;emit('qualified_read_60_seconds');}
  };
  const schedule=()=>{
    win.clearTimeout(timer);
    if(visibleSince!==null&&!read)timer=win.setTimeout(check,Math.max(0,60000-duration()));
  };
  const visibility=()=>{
    if(visibleSince!==null)elapsed+=win.performance.now()-visibleSince;
    visibleSince=doc.visibilityState==='visible'?win.performance.now():null;
    check();schedule();
  };
  const interaction=event=>{
    if(event.isTrusted && doc.visibilityState==='visible'){interacted=true;check();}
  };
  doc.addEventListener('visibilitychange',visibility);
  for(const type of events)doc.addEventListener(type,interaction,{passive:true});
  schedule();
  return()=>{
    win.clearTimeout(timer);doc.removeEventListener('visibilitychange',visibility);
    for(const type of events)doc.removeEventListener(type,interaction);
  };
}
