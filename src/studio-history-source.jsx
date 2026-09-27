import React, {useEffect,useMemo,useRef,useState} from 'react';
import {studioEmbedParams} from './studio-model.js';
import {withHistorySmoothing} from './studio-smoothing.js';
import {studioRegionName} from './studio-regions.js';

// Reuse the actual polling calculator; visual changes never recalculate data.
export function useHistorySnapshot(state,enabled) {
  const frame=useRef(null),cache=useRef(new Map());
  const [result,setResult]=useState({}),[retry,setRetry]=useState(0);
  const params=studioEmbedParams({...state,template:'history-original'},{source:true});
  params.set('studioHistorySource','1');params.set('mode','both');
  // Retrieve all series/categories once; presentation selections are local.
  params.delete('parties');params.set('events','national,germany,europe,global');
  // Whether events existed in the incoming URL must not change cache identity.
  // URLSearchParams.set preserves insertion order: pinning the first event used
  // to move this key, reload the frame and unmount the open event catalogue.
  params.sort();
  const key=params.toString();
  useEffect(()=>{
    if(!enabled||cache.current.has(key))return;
    let cancelled=false,timer;const started=Date.now();
    const inspect=()=>{
      if(cancelled)return;
      const raw=frame.current?.contentDocument?.querySelector('[data-studio-history]')?.dataset.studioHistory;
      if(raw)try{
        const data=JSON.parse(raw);
        if(!Array.isArray(data.trend)||!Array.isArray(data.rows)||!data.start||!data.end)throw Error('snapshot');
        if(cache.current.size>=8)cache.current.delete(cache.current.keys().next().value);
        cache.current.set(key,data);setResult({key,data});return;
      }catch{}
      if(Date.now()-started>25000){setResult({key,error:true});return;}
      timer=setTimeout(inspect,150);
    };inspect();return()=>{cancelled=true;clearTimeout(timer);};
  },[key,enabled,retry]);
  const raw=cache.current.get(key)||(result.key===key?result.data:null);
  const data=useMemo(()=>raw?{...withHistorySmoothing(raw,state),region:studioRegionName(state.region,state.lang),regionSlug:state.region}:null,[raw,state.historySmoothing,state.lang,state.region]);
  return {data,error:result.key===key&&result.error,retry:()=>setRetry(n=>n+1),
    frame:enabled&&!cache.current.has(key)?<iframe ref={frame} key={`${key}:${retry}`} className="studio-snapshot-frame" src={`/embed.html?${key}`} title="Pollframe historical source" tabIndex={-1} aria-hidden="true" inert=""/>:null};
}
