import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,utimes,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const exec=promisify(execFile);
const script=await readFile(new URL('../run_wahlbild.sh',import.meta.url),'utf8');

async function fixture(t,{stale=false,ready=true,noOpen=false,development=false,browserFails=false,chrome=false}={}){
  const root=await mkdtemp(join(tmpdir(),'pollframe-launcher-test-'));
  t.after(()=>rm(root,{recursive:true,force:true}));
  for(const dir of ['src','public','dist','bin'])await mkdir(join(root,dir));
  for(const file of ['index.html','embed.html','package.json','package-lock.json','vite.config.js','src/example.js']){
    await writeFile(join(root,file),'fixture');await utimes(join(root,file),1000,1000);
  }
  for(const dir of ['src','public'])await utimes(join(root,dir),1000,1000);
  await writeFile(join(root,'dist/index.html'),'fixture');await utimes(join(root,'dist/index.html'),2000,2000);
  if(stale)await utimes(join(root,'src/example.js'),3000,3000);
  await writeFile(join(root,'run_wahlbild.sh'),script);
  const log=join(root,'calls');
  const stubs={
    curl:ready?`printf '<title>Pollframe – preview</title>${development?'<script src="/@vite/client"></script>':''}'`:'exit 7',
    node:'printf "22 12\\n"',
    npm:'printf "npm %s\\n" "$*" >> "$TEST_CALLS"; exit 12',
    'xdg-open':'printf "browser %s\\n" "$*" >> "$TEST_CALLS"; '+(browserFails?'echo "Broken browser" >&2; exit 4':'exit 0'),
  };
  if(chrome)stubs['google-chrome-stable']=stubs['google-chrome']='printf "chrome %s\\n" "$*" >> "$TEST_CALLS"';
  for(const [name,body]of Object.entries(stubs))await writeFile(join(root,'bin',name),'#!/bin/bash\n'+body+'\n',{mode:0o755});
  const env={...process.env,PATH:join(root,'bin')+':/usr/bin:/bin',XDG_CACHE_HOME:join(root,'cache'),POLLFRAME_LOCAL_BROWSER:chrome?'':'default',TEST_CALLS:log,WAHLBILD_NO_OPEN:noOpen?'1':'0'};
  return {root,log,env};
}
test('an already-running preview still opens the default browser, detached from its terminal',async t=>{
  const f=await fixture(t);const result=await exec('/bin/bash',[join(f.root,'run_wahlbild.sh')],{env:f.env,timeout:6000});
  assert.match(result.stdout,/responding/);assert.equal(await readFile(f.log,'utf8'),'browser http://127.0.0.1:4173/\n');
  assert.match(script,/nohup setsid xdg-open/);assert.doesNotMatch(script,/already running/);
});
test('opening an existing server does not block on production build checks',async t=>{
  const f=await fixture(t,{stale:true,noOpen:true});await exec('/bin/bash',[join(f.root,'run_wahlbild.sh')],{env:f.env,timeout:6000});
  await assert.rejects(readFile(f.log,'utf8'),{code:'ENOENT'});
});
test('startup failures preserve their exit code and never silently select another port',async t=>{
  const f=await fixture(t,{ready:false,noOpen:true});
  await assert.rejects(exec('/bin/bash',[join(f.root,'run_wahlbild.sh')],{env:f.env,timeout:6000}),error=>error.code===12);
  assert.match(await readFile(f.log,'utf8'),/--port 4173 --strictPort/);
});
test('a running development server opens immediately without rebuilding stale output',async t=>{
  const f=await fixture(t,{stale:true,development:true});
  await exec('/bin/bash',[join(f.root,'run_wahlbild.sh')],{env:f.env,timeout:6000});
  assert.equal(await readFile(f.log,'utf8'),'browser http://127.0.0.1:4173/\n');
});
test('a failed browser handoff is reported as failure, not a successful launch',async t=>{
  const f=await fixture(t,{browserFails:true});
  await assert.rejects(exec('/bin/bash',[join(f.root,'run_wahlbild.sh')],{env:f.env,timeout:6000}),error=>error.code===1&&/Broken browser/.test(error.stdout)&&/could not open/.test(error.stdout));
});
test('server is detached, binds loopback only and releases the startup lock in the child',()=>{
  assert.match(script,/nohup setsid npm run dev/);
  assert.match(script,/--host 127\.0\.0\.1 --port "\$PORT" --strictPort/);
  assert.match(script,/9>&- &/);
  assert.equal((script.match(/trap .* EXIT/g)||[]).length,1,'failure trap must not be replaced');
});
test('installed Chrome bypasses the broken default-browser recovery path without changing defaults',async t=>{
  const f=await fixture(t,{chrome:true});
  await exec('/bin/bash',[join(f.root,'run_wahlbild.sh')],{env:f.env,timeout:6000});
  assert.equal(await readFile(f.log,'utf8'),'chrome --new-window http://127.0.0.1:4173/\n');
  assert.doesNotMatch(script,/xdg-settings set|xdg-mime default/);
});
