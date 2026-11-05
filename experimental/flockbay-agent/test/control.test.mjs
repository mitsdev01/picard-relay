import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync,chmodSync,statSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {randomUUID} from 'node:crypto';
import {makeServer} from '../server.mjs';import {openAgentStore} from '../store.mjs';import {requestJson} from '../transport.mjs';import {controlRequest} from '../control.mjs';
test('public HTTP cannot impersonate private control with headers',async()=>{const store=openAgentStore(':memory:'),s=makeServer({config:{origin:'https://test',project:'game'},store,auth:async()=>false,token:'test',model:async()=>{throw Error('unexpected');}});await new Promise(r=>s.listen(0,'127.0.0.1',r));try{assert.equal((await requestJson('http://127.0.0.1:'+s.address().port+'/development/api/status',{headers:{'X-Picard-Control':'true','X-Forwarded-For':'127.0.0.1',Authorization:'Bearer test'}})).status,401);}finally{await new Promise(r=>s.close(r));store.close();}});
test('private OS socket shares catalogue and audited mission lifecycle',{skip:process.platform==='win32'},async()=>{
 const dir=mkdtempSync(join(tmpdir(),'picard-control-'));chmodSync(dir,0o700);const socket=join(dir,'control.sock'),store=openAgentStore(':memory:');let modelCalls=0;
 const s=makeServer({config:{origin:'https://test',project:'game'},store,auth:async()=>false,token:'test',model:async()=>{modelCalls++;return {choices:[{finish_reason:'stop',message:{content:'done'}}]};}});
 await new Promise(r=>s.listen(0,'127.0.0.1',r));await new Promise(r=>s.control.listen(socket,r));chmodSync(socket,0o600);
 try{
  assert.equal(statSync(socket).mode&0o777,0o600);
  const base='http://127.0.0.1:'+s.address().port;
  await requestJson(base+'/development/worker/register',{method:'POST',headers:{Authorization:'Bearer test'},body:{project:'game',tools:[{name:'flockbay_godot_status',description:'status',inputSchema:{type:'object'}}]}});
  assert.equal((await controlRequest(socket,{action:'status'})).connected,true);
  const mission={id:randomUUID(),prompt:'Check',mode:'inspect',maxCalls:1,minutes:1,approved:true};
  await controlRequest(socket,{action:'start',mission});await new Promise(r=>setTimeout(r,20));
  assert.equal((await controlRequest(socket,{action:'show',id:mission.id})).mission.state,'completed');
  await controlRequest(socket,{action:'start',mission});assert.equal(modelCalls,1);
  await assert.rejects(controlRequest(socket,{action:'start',mission:{...mission,prompt:'Changed'}}),/identity_conflict/);
  const second={...mission,id:randomUUID()};store.create(second);await controlRequest(socket,{action:'stop',id:second.id});assert.equal(store.get(second.id).state,'cancelled');
  await assert.rejects(controlRequest(socket,{action:'worker/register'}),/unknown_action/);
 }finally{await new Promise(r=>s.close(r));await new Promise(r=>s.control.close(r));store.close();rmSync(dir,{recursive:true});}
});
