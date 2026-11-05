import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createWorkspaceTasks,runEnrolledTest} from '../workspace-tasks.mjs';
import {loadRegistry,readSource,sha} from '../trusted-files.mjs';

function fixture(t,options={}) {
 const base=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'picard-trusted-'))),root=path.join(base,'project'),stateDir=path.join(base,'private');
 fs.mkdirSync(root);fs.mkdirSync(stateDir,{mode:0o700});fs.writeFileSync(path.join(root,'badge.js'),'export const label = "New audit";\n');
 const file=path.join(base,'workspaces.json'),config={v:1,stateDir,workspaces:[{id:'easyjob',root,allowApply:true,testCommands:[{id:'unit',executable:process.execPath,args:['-e','process.exit(0)'],timeoutMs:1000}]}]};
 fs.writeFileSync(file,JSON.stringify(config),{mode:0o600});let remoteInput,body,submitCalls=0,prepareCalls=0,testCalls=0;
 const client={prepare:async input=>{prepareCalls++;remoteInput=input;return {requestId:input.requestId,truncated:false};},submit:async()=>{submitCalls++;return {state:'queued'};},result:async()=>({state:'completed',resultAvailable:true,truncated:false,result:{body,sha256:sha(body)}})};
 const agent=createWorkspaceTasks({registry:()=>loadRegistry(file),makeClient:()=>client,runTest:options.runTest??(async()=>{testCalls++;return {passed:!(options.failPost&&testCalls>1),exitCode:options.failPost&&testCalls>1?1:0,timeout:false,error:null};})});
 t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 return {base,root,stateDir,file,config,agent,client,get counts(){return {submitCalls,prepareCalls,testCalls};},get input(){return remoteInput;},set body(value){body=typeof value==='string'?value:JSON.stringify(value);}};
}
async function prepared(f,files=[{path:'badge.js',writable:true}]) {const p=await f.agent.prepare({workspaceId:'easyjob',title:'Count badge',requestText:'Show the count of new audits.',files});return {workspaceId:'easyjob',taskId:p.taskId};}
async function staged(f,edits=null,files){const args=await prepared(f,files);await f.agent.submit(args);f.body={v:1,edits:edits??[{path:'badge.js',beforeSha256:sha(fs.readFileSync(path.join(f.root,'badge.js'))),search:'"New audit"',replace:'"1 new audit"'}]};await f.agent.collect(args);return args;}
const read=f=>fs.readFileSync(path.join(f.root,'badge.js'),'utf8');

test('workspace selected independently of connector repo; exact context, no silent truncation',async t=>{
 const f=fixture(t),args=await prepared(f);assert.match(f.input.note,/New audit/);assert.match(f.input.note,/sha256/);assert.equal(f.counts.submitCalls,0);assert.equal(f.agent.list().workspaces[0].root,f.root);
 await f.agent.recover(args);fs.writeFileSync(path.join(f.root,'large.js'),'x'.repeat(5000));
 await assert.rejects(prepared(f,[{path:'large.js',writable:true}]),e=>e.code==='context_too_large_select_smaller_excerpts');assert.equal(f.counts.prepareCalls,1);
});
test('successful transaction preserves initial dirty bytes in backup and runs both test phases',async t=>{
 const f=fixture(t);fs.appendFileSync(path.join(f.root,'badge.js'),'// existing uncommitted work\n');const original=read(f);const args=await staged(f);
 const result=await f.agent.apply(args);assert.equal(result.state,'passed');assert.equal(f.counts.testCalls,2);assert.match(read(f),/1 new audit/);assert.match(read(f),/existing uncommitted/);
 const saved=JSON.parse(fs.readFileSync(path.join(f.stateDir,'easyjob',args.taskId+'.json')));assert.equal(Buffer.from(saved.files[0].before,'base64').toString(),original);
 await assert.rejects(f.agent.apply(args),e=>e.code==='apply_not_repeatable');assert.equal(f.counts.submitCalls,1);
});
test('failed post-change test restores byte-exact original with no retry',async t=>{
 const f=fixture(t,{failPost:true});fs.writeFileSync(path.join(f.root,'badge.js'),Buffer.from('\ufeffexport const label = "New audit";\r\n'));
 const original=fs.readFileSync(path.join(f.root,'badge.js')),args=await staged(f),result=await f.agent.apply(args);
 assert.equal(result.state,'rolled_back');assert.deepEqual(fs.readFileSync(path.join(f.root,'badge.js')),original);assert.equal(f.counts.testCalls,2);assert.equal(f.counts.submitCalls,1);
});
test('baseline failure leaves source unchanged and never applies candidate',async t=>{
 const f=fixture(t,{runTest:async()=>({passed:false,exitCode:1})}),original=read(f),args=await staged(f);
 assert.equal((await f.agent.apply(args)).state,'baseline_failed');assert.equal(read(f),original);
});
test('rejects invented files, read-only files, wrong hashes and ambiguous anchors',async t=>{
 for(const variant of ['invented','readonly','wronghash','ambiguous']) {
  const f=fixture(t);if(variant==='ambiguous')fs.appendFileSync(path.join(f.root,'badge.js'),'// "New audit"\n');fs.writeFileSync(path.join(f.root,'types.js'),'const value=1;');
  const args=await prepared(f,[{path:'badge.js',writable:true},{path:'types.js',writable:false}]);await f.agent.submit(args);
  f.body={v:1,edits:[{path:variant==='invented'?'imaginary.js':variant==='readonly'?'types.js':'badge.js',beforeSha256:variant==='wronghash'?'0'.repeat(64):sha(fs.readFileSync(path.join(f.root,'badge.js'))),search:'"New audit"',replace:'"count"'}]};
  await assert.rejects(f.agent.collect(args));assert.match(read(f),/New audit/);
 }
});
test('only exact unique anchors within selected excerpts may change',async t=>{
 const f=fixture(t);fs.writeFileSync(path.join(f.root,'badge.js'),'first\nsecond\nthird\n');const args=await prepared(f,[{path:'badge.js',writable:true,startLine:2,endLine:2}]);assert.ok(!f.input.note.includes('third'));
 await f.agent.submit(args);f.body={v:1,edits:[{path:'badge.js',beforeSha256:sha(fs.readFileSync(path.join(f.root,'badge.js'))),search:'third',replace:'changed'}]};await assert.rejects(f.agent.collect(args),e=>e.code==='edit_anchor_not_unique_or_not_in_context');
});
test('concurrent user changes before submission or application are preserved',async t=>{
 const f=fixture(t),args=await prepared(f);fs.appendFileSync(path.join(f.root,'badge.js'),'// Cursor edit');await assert.rejects(f.agent.submit(args),e=>e.code==='workspace_changed');assert.equal(f.counts.submitCalls,0);
 const other=fixture(t),otherArgs=await staged(other);fs.appendFileSync(path.join(other.root,'badge.js'),'// Cursor edit');await assert.rejects(other.agent.apply(otherArgs),e=>e.code==='workspace_changed');assert.match(read(other),/Cursor edit/);
});
test('rollback never overwrites a concurrent edit made during tests',async t=>{
 let f,n=0;f=fixture(t,{runTest:async()=>{if(++n===2)fs.writeFileSync(path.join(f.root,'badge.js'),'user newer version');return {passed:n===1,exitCode:n===1?0:1};}});const args=await staged(f),result=await f.agent.apply(args);
 assert.equal(result.state,'recovery_required');assert.deepEqual(result.conflicts,['badge.js']);assert.equal(read(f),'user newer version');
});
test('new files require declaration and are removed on failed checks',async t=>{
 const f=fixture(t,{failPost:true}),args=await staged(f,[{path:'new.js',beforeSha256:null,create:'export const count=1;'}],[{path:'badge.js',writable:false},{path:'new.js',writable:true,create:true}]);
 assert.equal((await f.agent.apply(args)).state,'rolled_back');assert.equal(fs.existsSync(path.join(f.root,'new.js')),false);
});
test('missing parent creation, traversal, secrets, hardlinks and directory junctions are rejected',async t=>{
 const f=fixture(t);fs.mkdirSync(path.join(f.root,'secrets'));fs.writeFileSync(path.join(f.root,'secrets','data.js'),'private');fs.linkSync(path.join(f.root,'badge.js'),path.join(f.root,'alias.js'));
 fs.symlinkSync(path.join(f.root,'secrets'),path.join(f.root,'linked'),process.platform==='win32'?'junction':'dir');
 for(const rel of ['../outside.js','secrets/data.js','linked/data.js','alias.js','.env','file.js:stream','CON.js'])assert.throws(()=>readSource(f.root,rel));
 await assert.rejects(prepared(f,[{path:'missing/new.js',writable:true,create:true}]));
});
test('registry cannot overlap state, enroll duplicate roots or apply without tests',t=>{
 const f=fixture(t);f.config.stateDir=f.root;fs.writeFileSync(f.file,JSON.stringify(f.config));assert.throws(()=>loadRegistry(f.file),e=>e.code==='state_must_be_outside_workspace');
 f.config.stateDir=f.stateDir;f.config.workspaces[0].testCommands=[];fs.writeFileSync(f.file,JSON.stringify(f.config));assert.throws(()=>loadRegistry(f.file),e=>e.code==='enrolled_tests_required');
});
test('preparation interruption returns same task identity and recovers without another task',async t=>{
 const f=fixture(t);const original=f.client.prepare;f.client.prepare=async()=>{throw Error('transport');};let taskId;
 try{await prepared(f);}catch(e){taskId=e.taskId;}assert.ok(taskId);
 f.client.prepare=original;const result=await f.agent.prepare({workspaceId:'easyjob',taskId});assert.equal(result.taskId,taskId);assert.equal(result.state,'prepared');
});
test('submission interruption cannot be retried; result retrieval remains available',async t=>{
 const f=fixture(t),args=await prepared(f);f.client.submit=async()=>{throw Error('uncertain');};await assert.rejects(f.agent.submit(args));await assert.rejects(f.agent.submit(args),e=>e.code==='submission_not_repeatable');assert.equal(f.agent.status(args).state,'submission_attempted');
});
test('interrupted partial write recovers originals without running tests',async t=>{
 const f=fixture(t),args=await staged(f),file=path.join(f.stateDir,'easyjob',args.taskId+'.json'),saved=JSON.parse(fs.readFileSync(file));saved.state='applying';saved.files[0].writeAttempted=true;fs.writeFileSync(file,JSON.stringify(saved));fs.writeFileSync(path.join(f.root,'badge.js'),Buffer.from(saved.files[0].after,'base64'));
 assert.equal((await f.agent.recover(args)).state,'rolled_back');assert.match(read(f),/New audit/);assert.equal(f.counts.testCalls,0);
});
test('interrupted tests require process review, never automatically rerun',async t=>{
 const f=fixture(t),args=await staged(f),file=path.join(f.stateDir,'easyjob',args.taskId+'.json'),saved=JSON.parse(fs.readFileSync(file));saved.state='testing';saved.testInvocation={started:true,pid:123};fs.writeFileSync(file,JSON.stringify(saved));assert.throws(()=>f.agent.recover(args),e=>e.code==='interrupted_test_requires_operator_process_review');
});
test('real enrolled process runner has fixed argv, bounded timeout and no connector token environment',async t=>{
 const f=fixture(t);process.env.PICARD_TEST_SECRET='must-not-inherit';t.after(()=>delete process.env.PICARD_TEST_SECRET);
 const good=await runEnrolledTest({id:'unit',executable:process.execPath,args:['-e','if(process.env.PICARD_TEST_SECRET)process.exit(9);console.log("passed")'],timeoutMs:2000},f.root,path.join(f.stateDir,'test.log'));assert.equal(good.passed,true);assert.match(fs.readFileSync(good.logFile,'utf8'),/passed/);
 const bad=await runEnrolledTest({id:'timeout',executable:process.execPath,args:['-e','setInterval(()=>{},100)'],timeoutMs:200},f.root,path.join(f.stateDir,'timeout.log'));assert.equal(bad.passed,false);assert.equal(bad.timeout,true);
});
test('MCP exposes optional workspace tools only with enrollment and rejects caller-supplied commands',t=>{
 const f=fixture(t),config=path.join(f.base,'client.json'),journalDir=path.join(f.base,'legacy-journal');fs.mkdirSync(journalDir);
 fs.writeFileSync(config,JSON.stringify({v:1,origin:'https://fixture.invalid',token:'Q'.repeat(43),workspaceRoot:f.root,journalDir}));
 const calls=[{jsonrpc:'2.0',id:1,method:'tools/list'},{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'picard_workspaces',arguments:{}}},{jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'picard_workspace_apply',arguments:{workspaceId:'easyjob',taskId:'bad',command:'calc.exe'}}}];
 const result=spawnSync(process.execPath,[fileURLToPath(new URL('../server.mjs',import.meta.url))],{input:calls.map(x=>JSON.stringify(x)).join('\n')+'\n',encoding:'utf8',env:{...process.env,PICARD_CODING_CONFIG:config,PICARD_WORKSPACES_FILE:f.file},timeout:5000});
 assert.equal(result.status,0,result.stderr);const messages=result.stdout.trim().split('\n').map(x=>JSON.parse(x));
 assert.equal(messages.find(x=>x.id===1).result.tools.length,12);assert.equal(JSON.parse(messages.find(x=>x.id===2).result.content[0].text).workspaces[0].root,f.root);assert.equal(messages.find(x=>x.id===3).result.isError,true);assert.ok(!result.stdout.includes('Q'.repeat(43)));
});
test('changed enrollment refuses stale tasks and readonly context changes block clean rollback claims',async t=>{
 const f=fixture(t),args=await staged(f);f.config.workspaces[0].allowApply=false;fs.writeFileSync(f.file,JSON.stringify(f.config));await assert.rejects(f.agent.apply(args),e=>e.code==='workspace_enrollment_changed');assert.match(read(f),/New audit/);
 let g,n=0;g=fixture(t,{runTest:async()=>{if(++n===2)fs.writeFileSync(path.join(g.root,'types.js'),'concurrent change');return {passed:n===1,exitCode:n===1?0:1};}});fs.writeFileSync(path.join(g.root,'types.js'),'const count=0;');const b=await staged(g,null,[{path:'badge.js',writable:true},{path:'types.js',writable:false}]);
 const r=await g.agent.apply(b);assert.equal(r.state,'recovery_required');assert.deepEqual(r.conflicts,['types.js']);assert.match(read(g),/New audit/);assert.equal(fs.readFileSync(path.join(g.root,'types.js'),'utf8'),'concurrent change');
});
test('only one task and one operation may own a workspace',async t=>{
 const f=fixture(t),args=await staged(f);await assert.rejects(prepared(f),e=>e.code==='workspace_task_active');
 fs.writeFileSync(path.join(f.stateDir,'easyjob','operation'),JSON.stringify({pid:process.pid,taskId:args.taskId}));await assert.rejects(f.agent.apply(args),e=>e.code==='workspace_operation_busy');assert.throws(()=>f.agent.recover(args),e=>e.code==='operation_process_still_running');assert.match(read(f),/New audit/);
});
