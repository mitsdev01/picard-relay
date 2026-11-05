import test from 'node:test';import assert from 'node:assert/strict';
import {qualifyRelease,requiredChecks,coordinatedUpdate} from '../release-gate.mjs';
const h='a'.repeat(64),b='b'.repeat(64),w='c'.repeat(64),now=1000;
const observation={releaseHash:h,companionHash:b,workerHash:w,project:'test-game',connected:true,protocolVersion:1,stateSchema:1,historyHash:'history'};
const policy=()=>({v:1,enabled:true,releases:[{...observation,qualifiedAt:900,expiresAt:2000,platform:'linux',nodeMajor:24,checks:requiredChecks.map(id=>({id,passed:true,exitCode:0,evidenceSha256:h}))}]});
test('gate requires exact release, companion, worker, project and all evidence',()=>{
 assert.ok(qualifyRelease(policy(),observation,now));
 for(const field of ['releaseHash','companionHash','workerHash','project'])assert.throws(()=>qualifyRelease(policy(),{...observation,[field]:field==='project'?'other':'f'.repeat(64)},now),/not_qualified/);
 for(const change of [p=>p.enabled=false,p=>p.releases[0].checks.pop(),p=>p.releases[0].checks[0].passed=false,p=>p.releases[0].expiresAt=999,p=>p.releases[0].platform='win32']){const p=policy();change(p);assert.throws(()=>qualifyRelease(p,observation,now));}
});
test('all update entrypoints share qualification, lock, install, verify, release order',async()=>{
 const events=[];let locked=false;
 const d={now:()=>now,policy:async()=>policy(),observe:async()=>({...observation,maintenanceId:locked?'lock':null}),acquire:async()=>{events.push('lock');locked=true;return {id:'lock'};},install:async()=>events.push('install'),verify:async()=>({...observation,installedReleaseHash:h,maintenanceId:'lock',webAuthPassed:true,coreReady:true}),release:async()=>events.push('release')};
 assert.equal((await coordinatedUpdate(d)).state,'verified');assert.deepEqual(events,['lock','install','release']);
});
test('failed installation or changed post-state never unlocks or retries',async()=>{
 for(const kind of ['install','history','auth','worker']){let installs=0,releases=0,locked=false;const d={now:()=>now,policy:async()=>policy(),observe:async()=>({...observation,maintenanceId:locked?'lock':null}),acquire:async()=>{locked=true;return{id:'lock'};},install:async()=>{installs++;if(kind==='install')throw Error('failed');},verify:async()=>({...observation,installedReleaseHash:h,maintenanceId:'lock',webAuthPassed:kind!=='auth',coreReady:true,...(kind==='history'?{historyHash:'changed'}:{}),...(kind==='worker'?{workerHash:h}:{})}),release:async()=>releases++};await assert.rejects(coordinatedUpdate(d));assert.equal(installs,1);assert.equal(releases,0);assert.equal(locked,true);}
});
test('unqualified candidate never locks or installs',async()=>{let invoked=false;await assert.rejects(coordinatedUpdate({now:()=>now,observe:async()=>observation,policy:async()=>({v:1,enabled:false}),acquire:async()=>{invoked=true;}}),/not_enrolled/);assert.equal(invoked,false);});
