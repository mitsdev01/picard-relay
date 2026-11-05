import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {workspaceFixture,fixtureToken} from '../../../test/fixtures/workspace-fixture.mjs';
import {parseMachineClientRegistry,matchMachineClient} from '../src/admission-handler.mjs';
import {createMachineAuthenticator} from '../src/admission-runtime.mjs';

function registryFor(token,{revoked=false}={}){
 return parseMachineClientRegistry(JSON.stringify({v:1,clients:[{id:'work-laptop-coding',tokenSha256:createHash('sha256').update(token).digest('hex'),scopes:['workspace-coding'],revoked}]}));
}
test('machine registry rejects extra authority and duplicate hashes',()=>{
 const tokenSha256='a'.repeat(64),row={id:'work-laptop-coding',tokenSha256,scopes:['workspace-coding'],revoked:false};
 assert.equal(createMachineAuthenticator(''),null);
 assert.equal(createMachineAuthenticator(undefined),null);
 assert.throws(()=>createMachineAuthenticator('C:\\not-a-linux-credential'),error=>error.code==='admission_configuration_invalid');
 assert.throws(()=>parseMachineClientRegistry(JSON.stringify({v:1,clients:[row],note:'no'})),error=>error.code==='machine_clients_invalid');
 assert.throws(()=>parseMachineClientRegistry(JSON.stringify({v:1,clients:[row,{...row,id:'other-laptop'}]})),error=>error.code==='machine_clients_invalid');
 assert.equal(matchMachineClient(registryFor('B'.repeat(43),{revoked:true}),'B'.repeat(43)),null);
});
test('machine client can prepare workspace requests and cannot use owner-only routes',async()=>{
 const token=randomBytes(32).toString('base64url');
 assert.equal(token.length,43);
 let registry=registryFor(token);
 const fixture=await workspaceFixture({authenticateMachine:async value=>matchMachineClient(registry,value)});
 const machine={cookie:'',authorization:'Bearer '+token};
 try{
  assert.equal((await fixture.request('/workspace/config',{headers:machine})).status,200);
  assert.equal((await fixture.request('/workspace/config')).status,200);
  assert.equal((await fixture.request('/workspace/config',{headers:{authorization:'Bearer '+'C'.repeat(43)}})).status,401);
  assert.equal((await fixture.request('/workspace/config',{headers:{cookie:'__Host-PicardSession='+fixtureToken,authorization:'Bearer '+token}})).status,401);
  const draft=await fixture.request('/workspace/drafts',{body:fixture.brief(),headers:machine});
  assert.equal(draft.status,201);assert.equal(fixture.calls,0);
  assert.equal((await fixture.request('/workspace/history',{headers:machine})).status,403);
  assert.equal((await fixture.request('/workspace/reviews/'+'d'.repeat(64),{body:{expectedRevision:0,decision:'accepted',note:'no',resultSha256:'e'.repeat(64)},headers:machine})).status,403);
  registry=registryFor(token,{revoked:true});
  assert.equal((await fixture.request('/workspace/config',{headers:machine})).status,401);
  assert.equal((await fixture.request('/auth/setup',{body:{setupCode:'no',password:'no'},headers:machine})).handled,false);
 }finally{fixture.close();}
});
