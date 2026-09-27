import bundledWorkerUrl from './studio-material-worker.js?worker&url';
const cache=new Map();
let queue=Promise.resolve();
let workerPolicy;
function workerSource() {
  const url=new URL(bundledWorkerUrl,import.meta.url).href;
  if(!globalThis.trustedTypes)return url;
  workerPolicy ||= trustedTypes.createPolicy('pollframe-studio-worker',{
    createScriptURL(value){if(value!==url)throw new TypeError('Unexpected Studio worker');return value;},
  });
  return workerPolicy.createScriptURL(url);
}
export function renderMaterialScene(...args) {
  const key=JSON.stringify(args);
  if(cache.has(key)) return cache.get(key);
  const task=queue.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
    if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined') {
      import('./studio-material-engine.js').then(module=>module.renderMaterialScene(...args)).then(resolve,reject);return;
    }
    const worker=new Worker(workerSource(),{type:'module'});
    const timer=setTimeout(()=>{worker.terminate();reject(new Error('3D render timed out'));},60000);
    const stop=()=>{clearTimeout(timer);worker.terminate();};
    worker.onmessage=event=>{stop();event.data.error?reject(new Error(event.data.error)):resolve(event.data.result);};
    worker.onerror=event=>{stop();reject(new Error(event.message));};
    worker.postMessage(args);
  }));
  queue=task;cache.set(key,task);task.catch(()=>cache.delete(key));
  if(cache.size>12)cache.delete(cache.keys().next().value);
  return task;
}
