import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {workspaceFixture,fixtureToken} from '../../../test/fixtures/workspace-fixture.mjs';
import {parseMachineClientRegistry,parseMachineReviewClientRegistry,matchMachineClient} from '../src/admission-handler.mjs';
import {createMachineAuthenticator} from '../src/admission-runtime.mjs';

function registryFor(token,{revoked=false}={}){
 return parseMachineClientRegistry(JSON.stringify({v:1,clients:[{id:'work-laptop-coding',tokenSha256:createHash('sha256').update(token).digest('hex'),scopes:['workspace-coding'],revoked}]}));
}
function reviewRegistryFor(token,codingClientId,{revoked=false}={}){
 return parseMachineReviewClientRegistry(JSON.stringify({v:1,clients:[{id:'work-laptop-review',tokenSha256:createHash('sha256').update(token).digest('hex'),scopes:['workspace-review'],codingClientId,revoked}]}));
}
test('Linux registry requires exact 0600 and rechecks revocation and file safety',{skip:process.platform!=='linux'},()=>{
 const dir=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'machine-registry-')),file=path.join(dir,'clients.json');
 const token=randomBytes(32).toString('base64url');
 const doc={v:1,clients:[{id:'laptop',tokenSha256:createHash('sha256').update(token).digest('hex'),scopes:['workspace-coding'],revoked:false}]};
 fs.writeFileSync(file,JSON.stringify(doc),{mode:0o600});
 return (async()=>{
  try{
   const auth=createMachineAuthenticator(file);assert.equal((await auth(token)).id,'laptop');
   doc.clients[0].revoked=true;fs.writeFileSync(file,JSON.stringify(doc));assert.equal(await auth(token),null);
   fs.chmodSync(file,0o640);assert.throws(()=>createMachineAuthenticator(file));assert.equal(await auth(token),null);
   fs.chmodSync(file,0o600);fs.symlinkSync(file,path.join(dir,'link'));assert.throws(()=>createMachineAuthenticator(path.join(dir,'link')));
   fs.unlinkSync(file);assert.equal(await auth(token),null);
  }finally{fs.rmSync(dir,{recursive:true,force:true});}
 })();
});
 test('review registry rejects invalid rows',()=>{
  const tokenSha256='a'.repeat(64),row={id:'r1',tokenSha256,scopes:['workspace-review'],codingClientId:'work-laptop-coding',revoked:false};
  assert.throws(()=>parseMachineReviewClientRegistry(JSON.stringify({v:1,clients:[row],note:'no'})),error=>error.code==='machine_clients_invalid');
  assert.throws(()=>parseMachineReviewClientRegistry(JSON.stringify({v:1,clients:[{...row,scopes:['workspace-coding']}]})),error=>error.code==='machine_clients_invalid');
 });
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

test('machine identity binds drafts durably and excludes owner and other-client work',async()=>{
 const tokens=[randomBytes(32).toString('base64url'),randomBytes(32).toString('base64url')];
 let revoked=false;
 const f=await workspaceFixture({realMarkers:false,authenticateMachine:async token=>revoked?null:tokens.includes(token)?{id:'laptop-'+tokens.indexOf(token),scope:'workspace-coding'}:null});
 const headers=i=>({cookie:'',authorization:'Bearer '+tokens[i]});
 try{
  const owner=await f.prepare();
  for(const i of [0,1]){
   assert.equal((await f.request('/workspace/drafts/'+owner.payload.requestId,{headers:headers(i)})).status,404);
   assert.equal((await f.request('/workspace/requests/'+owner.payload.eventId,{headers:headers(i)})).status,404);
   assert.equal((await f.request('/workspace/approvals',{headers:headers(i),body:{requestId:owner.payload.requestId}})).status,404);
   assert.equal((await f.request('/workspace/requests',{headers:headers(i),body:{requestId:owner.payload.requestId,nonce:'no',draftSha256:owner.draftSha256,approve:true}})).status,404);
  }
  const brief=f.brief(),created=await f.request('/workspace/drafts',{headers:headers(0),body:brief}),d=created.body.draft;
  assert.equal(created.status,201);assert.equal(f.store.getWorkspaceClient(brief.requestId),'laptop-0');
  f.restart();
  assert.equal((await f.request('/workspace/drafts/'+brief.requestId,{headers:headers(0)})).status,200);
  assert.equal((await f.request('/workspace/drafts/'+brief.requestId,{headers:headers(1)})).status,404);
  assert.equal((await f.request('/workspace/drafts',{headers:headers(1),body:brief})).status,404);
  assert.equal((await f.request('/workspace/approvals',{headers:headers(1),body:{requestId:brief.requestId}})).status,404);
  f.advance(61000); // Separate the negative probes from the shared POST budget.
  const proof=(await f.request('/workspace/approvals',{headers:headers(0),body:{requestId:brief.requestId}})).body;
  const body={requestId:brief.requestId,nonce:proof.nonce,draftSha256:d.draftSha256,approve:true};
  assert.equal((await f.request('/workspace/requests',{headers:headers(1),body})).status,404);
  assert.equal((await f.request('/workspace/requests',{headers:headers(0),body})).status,201);
  await f.dispatcher.runOnce(); // Synthetic adapter only; no network.
  const ownerRead=await f.request('/workspace/requests/'+d.payload.eventId);
  assert.equal((await f.request('/workspace/reviews/'+d.payload.eventId,{body:{expectedRevision:0,decision:'accepted',note:'OWNER_PRIVATE_REVIEW',resultSha256:ownerRead.body.result.sha256}})).status,200);
  assert.equal((await f.request('/workspace/grades/'+d.payload.eventId,{body:{expectedRevision:0,score:4,note:'OWNER_PRIVATE_GRADE',resultSha256:ownerRead.body.result.sha256}})).status,200);
  const machineRead=await f.request('/workspace/requests/'+d.payload.eventId,{headers:headers(0)});
  assert.equal(machineRead.status,200);assert.equal(machineRead.body.resultAvailable,true);
  assert.equal('grade' in machineRead.body,false);assert.equal(JSON.stringify(machineRead.body).includes('OWNER_PRIVATE_GRADE'),false);
  assert.equal((await f.request('/workspace/grades/'+d.payload.eventId,{headers:headers(0),body:{}})).status,403);
  assert.equal('review' in machineRead.body,false);assert.equal(JSON.stringify(machineRead.body).includes('OWNER_PRIVATE_REVIEW'),false);
  assert.equal((await f.request('/workspace/requests/'+d.payload.eventId,{headers:headers(1)})).status,404);
  assert.equal((await f.request('/workspace/requests/'+'d'.repeat(64),{headers:headers(0)})).status,404);
  const config=(await f.request('/workspace/config',{headers:headers(0)})).body;
  for(const key of ['training','progress','usage','setup'])assert.equal(key in config,false);
  for(const route of ['/workspace/history','/workspace/history?cursor=abc'])assert.equal((await f.request(route,{headers:headers(0)})).status,403);
  assert.equal((await f.request('/workspace/reviews/'+d.payload.eventId,{headers:headers(0),body:{}})).status,403);
  revoked=true;assert.equal((await f.request('/workspace/requests/'+d.payload.eventId,{headers:headers(0)})).status,401);
  assert.equal((await f.request('/workspace/requests/'+d.payload.eventId)).status,200);
  assert.equal(f.calls,1);
 }finally{f.close();}
});

test('workspace-review bearer may read result with reviews and post accept when bound to coding client',async()=>{
 const coding=randomBytes(32).toString('base64url'),review=randomBytes(32).toString('base64url');
 let regCoding=registryFor(coding),regReview=reviewRegistryFor(review,'work-laptop-coding');
 const authenticateMachine=async t=>matchMachineClient(regCoding,t)??matchMachineClient(regReview,t);
 const f=await workspaceFixture({realMarkers:false,authenticateMachine});
 const h={cookie:'',authorization:'Bearer '+coding};
 const hReview={cookie:'',authorization:'Bearer '+review};
 try{
  const brief=f.brief(),created=await f.request('/workspace/drafts',{headers:h,body:brief});
  assert.equal(created.status,201);
  f.advance(61000);
  const proof=(await f.request('/workspace/approvals',{headers:h,body:{requestId:brief.requestId}})).body;
  const d=created.body.draft;
  assert.equal((await f.request('/workspace/requests',{headers:h,body:{requestId:brief.requestId,nonce:proof.nonce,draftSha256:d.draftSha256,approve:true}})).status,201);
  await f.dispatcher.runOnce();
  const ref=d.payload.eventId;
  const pre=(await f.request('/workspace/requests/'+ref,{headers:hReview})).body;
  assert.equal(pre.review?.revision>=0,true);assert.equal('grade' in pre,false);
  assert.equal((await f.request('/workspace/grades/'+ref,{headers:hReview,body:{}})).status,403);
  const ownerFirst=(await f.request('/workspace/requests/'+ref)).body;
  assert.equal((await f.request('/workspace/reviews/'+ref,{body:{expectedRevision:0,decision:'accepted',note:'owner',resultSha256:ownerFirst.result.sha256}})).status,200);
  const afterOwner=(await f.request('/workspace/requests/'+ref,{headers:hReview})).body;
  assert.equal(afterOwner.review.latest.decision,'accepted');
  assert.equal((await f.request('/workspace/reviews/'+ref,{headers:hReview,body:{expectedRevision:afterOwner.review.revision,decision:'changes_requested',note:'tui',resultSha256:afterOwner.result.sha256}})).status,200);
  assert.equal((await f.request('/workspace/drafts',{headers:hReview,body:brief})).status,403);
  regReview=reviewRegistryFor(review,'other');assert.equal((await f.request('/workspace/requests/'+ref,{headers:hReview})).status,404);
 }finally{f.close();}
});
