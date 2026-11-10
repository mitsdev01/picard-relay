import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUpstreamNotice,readPublicSource} from '../src/https-fetch.mjs';
import {createConsoleHandler,CONSOLE_HTML} from '../src/oracle-service.mjs';
import {runInNewContext} from 'node:vm';
const installed='a'.repeat(40),upstream='b'.repeat(40),fork='c'.repeat(40),base='d'.repeat(40);
const comparison=(ahead_by=1,behind_by=0)=>({status:ahead_by?behind_by?'diverged':'ahead':behind_by?'behind':'identical',ahead_by,behind_by,merge_base_commit:{sha:base}});
const settle=()=>new Promise(r=>setImmediate(r));
function fixture({behind=1,ahead=1}={}){
 let time=1000000,calls=0,fail=false;
 const notice=createUpstreamNotice({now:()=>time,read:async(path,signal)=>{
  calls++;assert(signal instanceof AbortSignal);if(fail)throw Error('private_error');
  if(path.endsWith('/git/ref/heads/main'))return {object:{type:'commit',sha:path.includes('bmartynowicz')?upstream:fork}};
  assert(path.startsWith('repos/mitsdev01/picard-relay/compare/'));assert(path.endsWith('?per_page=1&page=2'));
  return path.includes(installed+'...')?comparison(ahead):comparison(3,behind);
 }});
 return {notice,calls:()=>calls,advance:()=>{time+=600001;},fail:()=>{fail=true;}};
}
test('bounded single-flight cached checks distinguish upstream and deployment work',async()=>{
 for(const [behind,ahead,state] of [[1,1,'upstream_available'],[1,0,'upstream_available'],[0,1,'deployment_pending'],[0,0,'current']]){
  const f=fixture({behind,ahead});assert.equal(f.notice.read(installed).state,'checking');
  for(let n=0;n<20;n++)f.notice.read(installed);
  await settle();const r=f.notice.read(installed);assert.equal(r.state,state);assert.equal(r.deploymentPending,ahead>0);assert.equal(r.incorporated,base);assert.equal(f.calls(),5);
 }
});
test('failed refresh retains last success time but never claims current',async()=>{
 const f=fixture({behind:0,ahead:0});f.notice.read(installed);await settle();const first=f.notice.read(installed);
 f.advance();f.fail();assert.equal(f.notice.read(installed).state,'checking');await settle();const result=f.notice.read(installed);
 assert.equal(result.state,'unavailable');assert.equal(result.checkedAt,first.checkedAt);assert(!JSON.stringify(result).includes('private_error'));
 const calls=f.calls();f.notice.read(installed);assert.equal(f.calls(),calls);
});
test('unverified installed identity makes no GitHub calls',()=>{
 const f=fixture();for(const sha of [null,undefined,'main','../secret','a'.repeat(39)])assert.equal(f.notice.read(sha).state,'unavailable');assert.equal(f.calls(),0);
});
test('malformed comparison, missing ancestry and force-pushed fork fail closed',async()=>{
 for(const value of [{},comparison(0,1),comparison(1,1),{...comparison(),ahead_by:-1},{...comparison(),status:'identical'}]){
  const n=createUpstreamNotice({read:async p=>p.endsWith('git/ref/heads/main')?{object:{type:'commit',sha:fork}}:value});n.read(installed);await settle();assert.equal(n.read(installed).state,'unavailable');
 }
});
test('transport refuses caller-controlled endpoints before any network',async()=>{
 for(const p of ['https://evil.invalid','repos/evil/repo/commits/main','repos/mitsdev01/picard-relay/commits/main?token=secret','repos/mitsdev01/picard-relay/compare/main...main'])await assert.rejects(readPublicSource(p),/source_path_refused/);
});
test('only owner-authenticated status can trigger source reads; bearer and public shell cannot',async()=>{
 let calls=0;const h=createConsoleHandler({enabled:true,html:CONSOLE_HTML,origins:['https://fixture.invalid'],auth:{authenticate:t=>t==='x'.repeat(43)},getSnapshot:()=>({release:{sourceCommit:installed}}),upstream:{read:s=>{assert.equal(s,installed);calls++;return {state:'checking'};}}});
 const send=async(url,cookie,authorization)=>{const res={writeHead(s){this.status=s;},end(b){this.body=b;}};await h({method:'GET',url,headers:{host:'fixture.invalid',cookie,authorization}},res);return res;};
 assert.equal((await send('/')).status,200);assert.equal((await send('/status',undefined,'Bearer secret')).status,401);assert.equal(calls,0);
 assert.equal((await send('/status','__Host-PicardSession='+'x'.repeat(43))).status,200);assert.equal(calls,1);
});
test('notice UI renders safe links, stale/unavailable states and clears private details',()=>{
 const script=CONSOLE_HTML.match(/let upstreamPrompt='';[\s\S]*?\n\$\('upstream-copy'\)\.addEventListener[^\n]+/)[0];
 const els=new Map();const $=id=>{if(!els.has(id))els.set(id,{textContent:'',hidden:false,removeAttribute(k){delete this[k];},addEventListener(){}});return els.get(id);};
 const context={$,Date,navigator:{clipboard:{}},value:{v:1,state:'upstream_available',checkedAt:Date.now(),installed,incorporated:base,fork,upstream,upstreamPending:true,deploymentPending:true}};
 runInNewContext(script+';renderUpstream(value)',context);
 assert.match($('upstream-state').textContent,/gated review/);assert.equal($('upstream-link').href,'https://github.com/bmartynowicz/picard-relay/compare/'+base+'...'+upstream);assert.equal($('upstream-copy').disabled,false);
 for(const change of [{state:'unavailable'},{checkedAt:Date.now()-900001},{upstream:'javascript:alert(1)'}]){context.value={...context.value,...change};runInNewContext('renderUpstream(value)',context);assert.equal($('upstream-copy').disabled,true);assert.equal($('upstream-link').href,undefined);}
 runInNewContext('renderUpstream()',context);assert.equal($('upstream-installed').textContent,'Unknown');
});
