// Local, explicitly enrolled file transactions. The remote relay never executes code.
import * as fs from 'node:fs';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {WorkspaceError,requireThat,sha,readSource,locate,relativeFile,directory} from './trusted-files.mjs';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const terminal=new Set(['passed','rolled_back','cancelled','baseline_failed']);
const outputContract='Return only JSON: {"v":1,"edits":[{"path":"relative/path","beforeSha256":"provided full-file hash","search":"exact nonempty unique text within the supplied excerpt","replace":"replacement text"}]}. For a declared new file use {"path":"relative/path","beforeSha256":null,"create":"full UTF-8 contents"}. No other fields, commands, prose, guessed files or markdown. At most one edit per file. If context is insufficient return {"v":1,"edits":[]}. Preserve unrelated code.';
function proposalText(body){const marked=body.match(/^\[Groq \/ [^\r\n\]]+\]\r?\n([\s\S]*)$/);return marked?marked[1]:body;}
function durable(file,bytes,{exclusive=false,mode=0o600}={}) {
 const tmp=exclusive?file:file+'.'+randomUUID()+'.tmp';const fd=fs.openSync(tmp,'wx',mode);
 try{fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);}finally{fs.closeSync(fd);}
 if(!exclusive)fs.renameSync(tmp,file);
 if(process.platform!=='win32'){const d=fs.openSync(path.dirname(file),'r');try{fs.fsyncSync(d);}finally{fs.closeSync(d);}}
}
function alive(pid){try{process.kill(pid,0);return true;}catch(e){return e.code!=='ESRCH';}}
function unchanged(root,entry,expected) {const current=readSource(root,entry.path,{missing:true});requireThat((current?.sha256??null)===expected,'workspace_changed');return current;}
function atomicSource(root,entry,bytes,expected,mode) {
 unchanged(root,entry,expected);const target=locate(root,entry.path),tmp=path.join(path.dirname(target),'.picard-'+randomUUID()+'.tmp');
 try {
  durable(tmp,bytes,{exclusive:true,mode});
  unchanged(root,entry,expected); // Cooperative-writer check; not an OS sandbox/CAS.
  if(expected===null){fs.linkSync(tmp,target);fs.unlinkSync(tmp);}else fs.renameSync(tmp,target);
 } finally {if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
export function runEnrolledTest(command,root,logFile,onPid=()=>{}) {
 return new Promise(resolve=>{
  const env={};for(const key of ['PATH','Path','SystemRoot','WINDIR','COMSPEC','PATHEXT','TEMP','TMP','HOME','USERPROFILE'])if(process.env[key])env[key]=process.env[key];
  env.CI='1';const output=[];let size=0,expired=false,settled=false;
  const child=spawn(command.executable,command.args,{cwd:root,env,shell:false,windowsHide:true,detached:process.platform!=='win32',stdio:['ignore','pipe','pipe']});
  const finish=(code,error=null)=>{if(settled)return;settled=true;clearTimeout(timer);try{durable(logFile,Buffer.concat(output));}catch{error='test_log_unavailable';}resolve({id:command.id,passed:code===0&&!expired&&!error,exitCode:code,timeout:expired,error,logFile});};
  for(const stream of [child.stdout,child.stderr])stream.on('data',b=>{const keep=Math.max(0,Math.min(b.length,65536-size));if(keep){output.push(b.subarray(0,keep));size+=keep;}});
  child.once('spawn',()=>onPid(child.pid));
  const timer=setTimeout(()=>{
   expired=true;
   if(process.platform==='win32') {const killer=spawn(path.join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe'),['/PID',String(child.pid),'/T','/F'],{windowsHide:true,shell:false,stdio:'ignore'});killer.on('error',()=>child.kill());}
   else {try{process.kill(-child.pid,'SIGKILL');}catch{child.kill('SIGKILL');}}
  },command.timeoutMs);
  child.once('error',()=>finish(null,'test_start_failed'));child.once('close',code=>finish(code));
 });
}
export function createWorkspaceTasks({registry,makeClient,runTest=runEnrolledTest}) {
 function settings(id) {const r=registry(),w=r.workspaces.find(x=>x.id===id);requireThat(w,'workspace_not_enrolled');return {r,w};}
 function store(r,w){const dir=path.join(r.stateDir,w.id);if(!fs.existsSync(dir))fs.mkdirSync(dir,{mode:0o700});requireThat(directory(dir)===dir,'state_link_refused');return dir;}
 function taskFile(dir,id){requireThat(UUID.test(id??''),'task_id_invalid');return path.join(dir,id+'.json');}
 function save(dir,t){durable(taskFile(dir,t.id),JSON.stringify(t));return t;}
 function load(id,taskId) {
  const {r,w}=settings(id),dir=store(r,w),file=taskFile(dir,taskId),st=fs.lstatSync(file);
  requireThat(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size<=8*1024*1024,'task_state_invalid');
  const t=JSON.parse(fs.readFileSync(file,'utf8'));requireThat(t.id===taskId&&t.root===w.root&&t.workspaceId===id&&t.fingerprint===r.fingerprint,'workspace_enrollment_changed');
  for(const f of t.files){relativeFile(f.path);requireThat(f.before===null||sha(Buffer.from(f.before,'base64'))===f.beforeSha256,'backup_corrupt');}
  return {r,w,dir,t};
 }
 function view(t){return {taskId:t.id,requestId:t.id,workspaceId:t.workspaceId,state:t.state,files:t.files.map(f=>({path:f.path,writable:f.writable,beforeSha256:f.beforeSha256,afterSha256:f.afterSha256??null})),tests:t.tests??[],conflicts:t.conflicts??[],providerRetried:false,automaticRepair:false};}
 function unlock(dir,t){const lock=path.join(dir,'active');if(fs.existsSync(lock)&&fs.readFileSync(lock,'utf8')===t.id)fs.unlinkSync(lock);}
 async function exclusive(dir,t,fn) {
  const file=path.join(dir,'operation');let fd;
  try {fd=fs.openSync(file,'wx',0o600);fs.writeFileSync(fd,JSON.stringify({pid:process.pid,taskId:t.id}));fs.fsyncSync(fd);}
  catch(e){if(e.code==='EEXIST')throw new WorkspaceError('workspace_operation_busy');throw e;}
  finally{if(fd!==undefined)fs.closeSync(fd);}
  try{
   // Another connector process may have completed after this caller loaded t.
   requireThat(JSON.stringify(JSON.parse(fs.readFileSync(taskFile(dir,t.id),'utf8')))===JSON.stringify(t),'task_changed_reload_status');
   return await fn();
  }finally{fs.unlinkSync(file);}
 }
 function assertBaseline(w,t){for(const f of t.files)unchanged(w.root,f,f.beforeSha256);}
 function assertEnrolled(t){requireThat(registry().fingerprint===t.fingerprint,'workspace_enrollment_changed');}
 function rollback(w,dir,t) {
  t.state='recovering';save(dir,t);t.conflicts=[];
  for(const f of t.files) {
   try{
    const current=readSource(w.root,f.path,{missing:true}),hash=current?.sha256??null;
    if(hash===f.beforeSha256)continue;
    requireThat(f.writeAttempted&&f.afterSha256,'unapplied_file_changed');
    requireThat(hash===f.afterSha256,'rollback_conflict');
    if(f.before===null){unchanged(w.root,f,f.afterSha256);fs.unlinkSync(locate(w.root,f.path));}
    else atomicSource(w.root,f,Buffer.from(f.before,'base64'),f.afterSha256,f.mode);
   }catch{t.conflicts.push(f.path);}
  }
  t.state=t.conflicts.length?'recovery_required':'rolled_back';save(dir,t);if(!t.conflicts.length)unlock(dir,t);return view(t);
 }
 async function tests(w,dir,t,phase) {
  t.state=phase;save(dir,t);
  for(const command of w.testCommands) {
   assertEnrolled(t);
   // Persist an invocation boundary before starting. Crash recovery never reruns it.
   t.testInvocation={phase,id:command.id,pid:null,started:true};save(dir,t);
   const log=path.join(dir,t.id+'-'+phase+'-'+command.id+'.log');
   const result=await runTest(command,w.root,log,pid=>{t.testInvocation.pid=pid;save(dir,t);});
   t.tests.push({phase,id:command.id,passed:result.passed,exitCode:result.exitCode,timeout:result.timeout,error:result.error});
   t.testInvocation=null;save(dir,t);if(!result.passed)return false;
  }return true;
 }
 return {
  list(){const r=registry();return {workspaces:r.workspaces.map(w=>{const lock=path.join(store(r,w),'active');return {id:w.id,root:w.root,allowApply:w.allowApply,tests:w.testCommands.map(c=>c.id),activeTaskId:fs.existsSync(lock)?fs.readFileSync(lock,'utf8'):null};}),executionBoundary:'Enrolled local commands run with your account privileges, not in a sandbox.'};},
  discover({workspaceId,query}) {
   const {w}=settings(workspaceId);requireThat(typeof query==='string'&&query.length>=2&&query.length<=120,'query_invalid');
   const found=[];let examined=0,limited=false;
   const walk=(dir,prefix='')=>{for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(examined>=3000||found.length>=40){limited=true;return;}examined++;const rel=prefix+ent.name;try{relativeFile(rel);}catch{continue;}if(ent.isSymbolicLink())continue;if(ent.isDirectory()){walk(path.join(dir,ent.name),rel+'/');continue;}if(!ent.isFile())continue;try{const f=readSource(w.root,rel);const lines=f.text.split('\n');const matches=[];for(let i=0;i<lines.length&&matches.length<5;i++)if(lines[i].toLowerCase().includes(query.toLowerCase()))matches.push(i+1);if(matches.length||rel.toLowerCase().includes(query.toLowerCase()))found.push({path:rel,sha256:f.sha256,lines:matches});}catch{/* Excluded, binary and oversized files are not searched. */}}};
   walk(w.root);return {files:found,limited,examined,completeDependencyAnalysis:false,instruction:'Inspect callers, imports and tests with further searches. Select bounded excerpts explicitly; this search cannot prove all affected files were found.'};
  },
  async prepare(args) {
   const {workspaceId}=args,{r,w}=settings(workspaceId),dir=store(r,w);let t;
   if(args.taskId){requireThat(Object.keys(args).sort().join(',')==='taskId,workspaceId','recovery_arguments_invalid');t=load(workspaceId,args.taskId).t;}
   else {
    requireThat(typeof args.title==='string'&&args.title.length<=200&&args.title.trim()&&typeof args.requestText==='string'&&args.requestText.trim()&&args.requestText.length<=2800&&Array.isArray(args.files)&&args.files.length>0&&args.files.length<=8,'task_input_invalid');
    requireThat(!fs.existsSync(path.join(dir,'active')),'workspace_task_active');
    const seen=new Set(),files=args.files.map(f=>{
     requireThat(f&&typeof f.writable==='boolean'&&Object.keys(f).every(k=>['path','writable','create','startLine','endLine'].includes(k))&&!seen.has(f.path.toLowerCase()),'file_scope_invalid');seen.add(f.path.toLowerCase());
     const source=readSource(w.root,f.path,{missing:f.create===true});
     if(f.create===true)requireThat(source===null&&f.writable&&!f.startLine&&!f.endLine,'new_file_must_be_absent');else requireThat(source!==null,'file_missing');
     let excerpt='',start=0,end=0;
     if(source){const lines=source.text.split('\n'),a=f.startLine??1,b=f.endLine??lines.length;requireThat(Number.isSafeInteger(a)&&Number.isSafeInteger(b)&&a>=1&&b>=a&&b<=lines.length,'line_range_invalid');start=lines.slice(0,a-1).join('\n').length+(a>1?1:0);excerpt=lines.slice(a-1,b).join('\n');end=start+excerpt.length;}
     return {path:f.path,writable:f.writable,before:source?.base64??null,beforeSha256:source?.sha256??null,mode:source?.mode??0o644,excerpt,start,end};
    });
    requireThat(files.some(f=>f.writable),'writable_file_required');
    const context=files.map(f=>JSON.stringify({path:f.path,sha256:f.beforeSha256,writable:f.writable,...(f.before===null?{newFile:true}:{excerpt:f.excerpt})})).join('\n');
    const requestText=args.requestText+'\n\n'+outputContract;
    requireThat(context.length<=4000&&requestText.length<=4000&&Buffer.byteLength(JSON.stringify({request:requestText,context:{title:args.title,nextAction:'',latestFinding:context}}))<=12000,'context_too_large_select_smaller_excerpts');
    t={v:1,id:randomUUID(),workspaceId,root:w.root,fingerprint:r.fingerprint,state:'preparing',files,input:{title:args.title,requestText,note:context,paths:[]},tests:[]};
    durable(path.join(dir,'active'),t.id,{exclusive:true});save(dir,t);
   }
   return exclusive(dir,t,async()=>{
    requireThat(['preparing','prepared'].includes(t.state),'prepare_not_repeatable');assertBaseline(w,t);
    try{const prepared=await makeClient(w).prepare({...t.input,requestId:t.id});requireThat(!prepared.truncated,'context_truncated_refused');t.state='prepared';save(dir,t);return {...view(t),prepared};}
    catch(e){e.taskId=t.id;throw e;}
   });
  },
  async submit({workspaceId,taskId}) {
   const {w,dir,t}=load(workspaceId,taskId);return exclusive(dir,t,async()=>{
    requireThat(t.state==='prepared','submission_not_repeatable');assertBaseline(w,t);t.state='submission_attempted';save(dir,t);
    const result=await makeClient(w).submit(t.id);t.state='submitted';save(dir,t);return {...view(t),remote:result};
   });
  },
  status({workspaceId,taskId}){return view(load(workspaceId,taskId).t);},
  async collect({workspaceId,taskId}) {
   const {w,dir,t}=load(workspaceId,taskId);return exclusive(dir,t,async()=>{
    requireThat(['submitted','submission_attempted'].includes(t.state),'result_not_collectable');
    const result=await makeClient(w).result(t.id);
    if(!result.resultAvailable)return {...view(t),remote:result};
    requireThat(result.state==='completed'&&!result.truncated&&typeof result.result?.body==='string'&&sha(result.result.body)===result.result.sha256,'result_integrity_invalid');
    let proposal;try{proposal=JSON.parse(proposalText(result.result.body));}catch{throw new WorkspaceError('proposal_must_be_json');}
    requireThat(proposal?.v===1&&Object.keys(proposal).sort().join(',')==='edits,v'&&Array.isArray(proposal.edits)&&proposal.edits.length>0&&proposal.edits.length<=8,'proposal_invalid_or_insufficient_context');
    const seen=new Set();
    for(const edit of proposal.edits){
     const f=t.files.find(f=>f.path===edit.path);requireThat(f?.writable&&!seen.has(edit.path)&&edit.beforeSha256===f.beforeSha256,'proposal_outside_scope');seen.add(edit.path);
     let after;
     if(f.before===null){requireThat(Object.keys(edit).sort().join(',')==='beforeSha256,create,path'&&typeof edit.create==='string','creation_invalid');after=edit.create;}
     else {
      requireThat(Object.keys(edit).sort().join(',')==='beforeSha256,path,replace,search'&&typeof edit.search==='string'&&edit.search.length>0&&typeof edit.replace==='string','edit_invalid');
      const before=Buffer.from(f.before,'base64').toString('utf8'),at=before.indexOf(edit.search);
      requireThat(at>=f.start&&at+edit.search.length<=f.end&&before.indexOf(edit.search,at+1)===-1,'edit_anchor_not_unique_or_not_in_context');
      after=before.slice(0,at)+edit.replace+before.slice(at+edit.search.length);
     }
     requireThat(Buffer.byteLength(after)<=512*1024&&!after.includes('\0'),'output_too_large');f.after=Buffer.from(after).toString('base64');f.afterSha256=sha(Buffer.from(after));
    }
    assertBaseline(w,t);t.resultSha256=result.result.sha256;t.state='staged';save(dir,t);
    return {...view(t),edits:proposal.edits,untrustedProposal:true};
   });
  },
  async apply({workspaceId,taskId}) {
   const {w,dir,t}=load(workspaceId,taskId);requireThat(w.allowApply&&w.testCommands.length,'local_execution_not_enrolled');
   return exclusive(dir,t,async()=>{
    requireThat(t.state==='staged','apply_not_repeatable');assertBaseline(w,t);
    try{
     if(!await tests(w,dir,t,'baseline_testing')){t.state='baseline_failed';save(dir,t);unlock(dir,t);return view(t);}
     assertEnrolled(t);assertBaseline(w,t);t.state='applying';save(dir,t);
     for(const f of t.files.filter(f=>f.afterSha256)){assertEnrolled(t);requireThat(sha(Buffer.from(f.after,'base64'))===f.afterSha256,'candidate_corrupt');f.writeAttempted=true;save(dir,t);atomicSource(w.root,f,Buffer.from(f.after,'base64'),f.beforeSha256,f.mode);}
     if(!await tests(w,dir,t,'testing'))return rollback(w,dir,t);
     assertEnrolled(t);for(const f of t.files)unchanged(w.root,f,f.afterSha256??f.beforeSha256);
     t.state='passed';save(dir,t);unlock(dir,t);return view(t);
    }catch(e){if(['applying','testing'].includes(t.state))return rollback(w,dir,t);t.state='recovery_required';save(dir,t);throw e;}
   });
  },
  recover({workspaceId,taskId}) {
   const {w,dir,t}=load(workspaceId,taskId),op=path.join(dir,'operation');
   if(fs.existsSync(op)){const lock=JSON.parse(fs.readFileSync(op));requireThat(lock.taskId===taskId&&!alive(lock.pid),'operation_process_still_running');fs.unlinkSync(op);}
   requireThat(!t.testInvocation?.started,'interrupted_test_requires_operator_process_review');
   return exclusive(dir,t,async()=>{
    if(terminal.has(t.state))return view(t);
    if(['applying','testing','recovering','recovery_required'].includes(t.state))return rollback(w,dir,t);
    // No applied edits. Cancelling never deletes the relay request or renews it.
    t.state='cancelled';save(dir,t);unlock(dir,t);return view(t);
   });
  }
 };
}
