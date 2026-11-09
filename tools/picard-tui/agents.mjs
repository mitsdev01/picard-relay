import {spawn,spawnSync} from 'node:child_process';
import {createTuiWorkspaceAgent} from './workspace-ops.mjs';
import {writeFileSync,mkdirSync,rmSync,existsSync,renameSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

const scriptDir=dirname(fileURLToPath(import.meta.url));
const repoRoot=dirname(dirname(scriptDir));

/**
 * Windows: `where` often returns `agent.cmd`. Node cannot exec `.cmd` directly (EINVAL). Use the
 * documented form `spawn('cmd.exe', ['/c', 'my.bat', ...args])` — one argv token for the script, no
 * shell:true and no manual quoting (avoids DEP0190 and `'\"…cmd\"' is not recognized`).
 * @see https://nodejs.org/api/child_process.html#spawning-bat-and-cmd-files-on-windows
 */
const normAgentArg=s=>String(s).replace(/\r?\n/g,' ').replace(/\s+/g,' ').trim();

function win32CmdSpawnArgs(executable,args){
 return['/d','/c',executable,...args.map(normAgentArg)];
}

function spawnSyncUserCommand(executable,args,options={}){
 if(process.platform==='win32'&&/\.(cmd|bat)$/i.test(executable)){
  const comspec=process.env.ComSpec||'cmd.exe';
  return spawnSync(comspec,win32CmdSpawnArgs(executable,args),{windowsHide:true,...options});
 }
 return spawnSync(executable,args,{windowsHide:true,...options});
}

/**
 * Kill a spawned CLI process and its children. On Windows, `child.pid` is often `cmd.exe`; a bare kill
 * can leave `node ... agent.js` running so the TUI heartbeats forever.
 */
export function killAgentProcessTree(child){
 if(!child||typeof child.pid!=='number'||child.pid<=0)return;
 try{
  if(process.platform==='win32'){
   const tk=join(process.env.SystemRoot||'C:\\Windows','System32','taskkill.exe');
   spawn(tk,['/PID',String(child.pid),'/T','/F'],{stdio:'ignore',windowsHide:true,shell:false});
  }else{
   try{process.kill(-child.pid,'SIGTERM');}catch{child.kill('SIGTERM');}
  }
 }catch{}
}

const normPathKey=s=>String(s).replace(/\\/g,'/').toLowerCase();

/**
 * Async spawn matching spawnSyncUserCommand (Windows .cmd via cmd.exe). Does not block the event loop,
 * so the TUI can print heartbeats while `agent -p` runs.
 */
function spawnUserCommandAsync(executable,args,options={}){
 const{stdio,onSpawn,killCtx,...rest}=options;
 const merged={windowsHide:true,...rest,stdio:stdio||['ignore','pipe','pipe']};
 const ctx=killCtx&&typeof killCtx==='object'?killCtx:{child:null,killedEarly:false};
 return new Promise(resolve=>{
  let child;
  if(process.platform==='win32'&&/\.(cmd|bat)$/i.test(executable)){
   const comspec=process.env.ComSpec||'cmd.exe';
   child=spawn(comspec,win32CmdSpawnArgs(executable,args),merged);
  }else{
   child=spawn(executable,args,merged);
  }
  ctx.child=child;
  if(typeof onSpawn==='function')child.once('spawn',()=>{try{onSpawn(child);}catch{}});
  let stdout='';
  let stderr='';
  const cap=merged.maxBuffer??8*1024*1024;
  const push=(buf,target)=>{
   const s=buf.toString();
   if(target.length+s.length>cap){
    const rest=Math.max(0,cap-target.length);
    const out=rest>0?target+s.slice(0,rest):target;
    ctx.killedEarly=true;
    killAgentProcessTree(child);
    return out+'\n[truncated]\n';
   }
   return target+s;
  };
  child.stdout?.on('data',d=>{stdout=push(d,stdout);});
  child.stderr?.on('data',d=>{stderr=push(d,stderr);});
  child.on('error',err=>{resolve({status:-1,stdout,stderr,error:err,signal:null,killedEarly:ctx.killedEarly});});
  child.on('close',(code,signal)=>{
   let status=code;
   if(status===null||status===undefined){
    if(signal)status=signal==='SIGTERM'?143:128;
    else status=-1;
   }
   resolve({status,stdout,stderr,error:null,signal,killedEarly:ctx.killedEarly});
  });
 });
}

/** When Cursor CLI prints auth errors, return operator-facing lines (else null). */
export function cursorAuthHint(stderr){
 const t=typeof stderr==='string'?stderr:'';
 if(!/Authentication required|agent login|CURSOR_API_KEY/i.test(t))return null;
 return [
  'Cursor CLI is not authenticated for this account.',
  'In a normal terminal run:  agent login',
  'Or set environment variable CURSOR_API_KEY (Cursor dashboard), then run the TUI again.',
  'Picard never stores that key in mcp.json or the workspace.'
 ];
}

export function which(name){
 const r=spawnSync(process.platform==='win32'?'where':'which',[name],{encoding:'utf8'});
 if(r.status!==0)return null;
 return r.stdout.trim().split(/\r?\n/)[0]||null;
}

export function codexReadOnlyMcpSupported(executable){
 const r=spawnSyncUserCommand(executable,['exec','--help'],{encoding:'utf8',maxBuffer:256*1024});
 const text=(r.stdout||'')+(r.stderr||'');
 if(!text.trim())return true;
 if(/dangerously-bypass-approvals-and-sandbox/i.test(text))return false;
 return true;
}

/** Non-null message when codex is on PATH but must not be offered (fail-closed). */
export function codexUnsupportedMessage(){
 const codex=which('codex');
 if(!codex||codexReadOnlyMcpSupported(codex))return null;
 return 'Codex is installed but its help indicates MCP in read-only mode needs --dangerously-bypass-approvals-and-sandbox; Picard will not use that.';
}

export function detectAgents(){
 const agent=which('agent');
 const codex=which('codex');
 const claude=which('claude');
 const opts=[];
 if(agent)opts.push({kind:'cursor',executable:agent});
 if(codex&&codexReadOnlyMcpSupported(codex))opts.push({kind:'codex',executable:codex});
 if(claude)opts.push({kind:'claude',executable:claude});
 return opts;
}

export function connectorServerPath(){
 return join(repoRoot,'tools','coding-connector','server.mjs');
}

export function buildMcpServers({nodeExe,codingConfigPath,workspacesPath}){
 return {
  'picard-coding':{
   type:'stdio',
   command:nodeExe,
   args:[connectorServerPath()],
   env:{
    PICARD_CODING_CONFIG:codingConfigPath,
    PICARD_WORKSPACES_FILE:workspacesPath
   }
  }
 };
}

const PICARD_WORKSPACE_TOOL_LIST=[
 'picard_workspaces',
 'picard_workspace_discover',
 'picard_workspace_prepare',
 'picard_workspace_submit',
 'picard_workspace_status',
 'picard_workspace_collect',
 'picard_workspace_apply',
 'picard_workspace_recover',
 'picard_workspace_handoff'
];

const SAFETY='Do not run shell commands or edit files directly. Use only the listed Picard MCP tools. Do not approve unrelated tools.';

export function buildMissionPrompt({workspaceId,title,missionText}){
 return [
  'You are assisting with one Picard trusted-workspace coding mission.',
  SAFETY,
  '',
  'Workspace enrollment id: '+workspaceId,
  'Mission title: '+title,
  'Operator request:',
  missionText,
  '',
  'Required sequence:',
  '1) Call picard_workspaces. Confirm the workspace id exists.',
  '2) Call picard_workspace_discover with a short query derived from the request to find candidate files (or choose files you already know are relevant).',
  '3) Call picard_workspace_prepare with workspaceId, a new title and requestText that restate the mission, and a files array: writable targets with path, writable:true, and line-bounded excerpts using startLine and endLine; read-only context with writable:false.',
  '4) Call picard_workspace_submit with the same workspaceId and taskId returned from prepare.',
  '5) Poll picard_workspace_status until state is no longer submitted or submission_attempted; then call picard_workspace_collect with the same workspaceId and taskId.',
  '6) Stop and report the taskId and a one-line summary. Do not call picard_workspace_apply.',
  '',
  'Picard workspace tool names: '+PICARD_WORKSPACE_TOOL_LIST.join(',')
 ].join('\n');
}

function writeTempDir(baseName,fn){
 const dir=join(repoRoot,'tools','picard-tui','.tmp',baseName+'-'+randomUUID());
 mkdirSync(dir,{recursive:true});
 try{return fn(dir);}
 finally{
  try{rmSync(dir,{recursive:true,force:true});}catch{}
 }
}

/** Normalize spawnSync: status null means signal or spawn failure; surface r.error in stderr. */
export function agentSpawnResult(r){
 if(!r)return {status:-1,stdout:'',stderr:'spawnSync returned no result',spawnError:new Error('spawn_failed')};
 const err=r.error;
 let stderr=r.stderr||'';
 if(err){
  const msg=err.message||String(err.code||'spawn_error');
  stderr=stderr?stderr+'\n'+msg:msg;
 }
 let status=r.status;
 if(status===null){
  if(r.signal)status=r.signal==='SIGTERM'?143:128;
  else if(err)status=-1;
  else status=-1;
 }
 return {status,stdout:r.stdout||'',stderr,spawnError:err||null};
}

/**
 * True when agent stdout shows the mission never obtained a relay task (no prepare/submit to wait for).
 * Used to skip long connector polls that would otherwise run until timeout.
 */
export function agentOutputImpliesNoRelayTask(stdout){
 const t=typeof stdout==='string'?stdout:'';
 if(!t.trim())return false;
 if(/\*\*taskId:\*\*\s*none/i.test(t))return true;
 if(/taskId:\s*none/i.test(t)&&/prepare\s+never\s+ran|not\s+available|did\s+not\s+start/i.test(t))return true;
 if(/prepare\s+never\s+ran/i.test(t))return true;
 if(/picard_workspaces\s+is\s+not\s+callable/i.test(t))return true;
 if(/picard-coding[^\n]{0,120}tools\s+are\s+not/i.test(t))return true;
 if(/picard_workspaces[^\n]{0,200}reject/i.test(t))return true;
 if(/reject(?:ed)?[^\n]{0,120}picard_workspaces/i.test(t))return true;
 return false;
}

function cursorPrintUsesApproveMcps(){
 const v=process.env.PICARD_TUI_CURSOR_APPROVE_MCPS;
 if(v===undefined||v==='')return true;
 return !/^(0|false|no|off)$/i.test(String(v).trim());
}

function cursorPrintUsesAutoReview(){
 const v=process.env.PICARD_TUI_CURSOR_AUTO_REVIEW;
 if(v===undefined||v==='')return true;
 return !/^(0|false|no|off)$/i.test(String(v).trim());
}

function cursorPrintUsesYolo(){
 const v=process.env.PICARD_TUI_CURSOR_YOLO;
 if(v===undefined||v==='')return false;
 return /^(1|true|yes|on)$/i.test(String(v).trim());
}

function cursorPrintHeartbeatMs(){
 const v=process.env.PICARD_TUI_CURSOR_PRINT_HEARTBEAT_MS;
 if(v===undefined||v==='')return 5000;
 const n=Number(String(v).trim());
 return Number.isFinite(n)&&n>=1000?n:5000;
}

function cursorPrintPollLocalMs(){
 const v=process.env.PICARD_TUI_CURSOR_PRINT_POLL_MS;
 if(v===undefined||v==='')return 2000;
 const n=Number(String(v).trim());
 return Number.isFinite(n)&&n>=500?n:2000;
}

function cursorPrintKillDelayMs(){
 const v=process.env.PICARD_TUI_CURSOR_PRINT_KILL_DELAY_MS;
 if(v===undefined||v==='')return 1500;
 const n=Number(String(v).trim());
 return Number.isFinite(n)&&n>=0?n:1500;
}

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

const LOCAL_TERMINAL=new Set(['passed','rolled_back','cancelled','baseline_failed','recovery_required']);

/**
 * While `agent -p` runs, poll local task state (read-only status). Do not call collect here: collect
 * shares the same exclusive lock with the agent's MCP collect; a parallel collect throws
 * workspace_changed and can wedge the run. When local state is staged or terminal, kill the Cursor
 * tree so the TUI can collect exactly once in settleAfterAgent.
 */
async function runCursorPrintWithWatch({
 executable,
 workspaceRoot,
 workspaceId,
 codingConfigPath,
 workspacesPath,
 printArgs,
 missionPrompt,
 log,
 killCtx
}){
 const ops=createTuiWorkspaceAgent(codingConfigPath,workspacesPath);
 const pollMs=cursorPrintPollLocalMs();
 const killDelay=cursorPrintKillDelayMs();
 let lastState=null;
 const killAfter=(msg)=>{
  if(killCtx.killedEarly||!killCtx.child)return;
  killCtx.killedEarly=true;
  log(msg);
  const delay=killDelay;
  if(delay<=0)killAgentProcessTree(killCtx.child);
  else setTimeout(()=>killAgentProcessTree(killCtx.child),delay);
 };
 void(async()=>{
  while(!killCtx.killedEarly&&killCtx.child){
   try{
    const list=ops.list();
    const ent=list.workspaces?.find(w=>w.id===workspaceId);
    const tid=ent?.activeTaskId;
    const wsKey=normPathKey(workspaceRoot);
    if(!tid){
     await sleep(pollMs);
     continue;
    }
    const st=ops.status({workspaceId,taskId:tid});
    if(st.root&&normPathKey(st.root)!==wsKey){
     await sleep(pollMs);
     continue;
    }
    if(st.state!==lastState){
     lastState=st.state;
     log('[picard-tui] Local task '+tid.slice(0,8)+'... state: '+st.state+'\n');
    }
    if(st.state==='staged'){
     killAfter(
      '[picard-tui] Local task is staged (edits ready). Stopping Cursor agent so the TUI can continue.\n'
     );
     break;
    }
    if(LOCAL_TERMINAL.has(st.state)){
     killAfter(
      '[picard-tui] Local task finished with state '+st.state+'. Stopping Cursor agent.\n'
     );
     break;
    }
   }catch{
    /* registry or status races */
   }
   await sleep(pollMs);
  }
 })();
 return spawnUserCommandAsync(executable,[...printArgs,missionPrompt],{
  cwd:workspaceRoot,
  env:{...process.env},
  maxBuffer:8*1024*1024,
  killCtx
 });
}

/**
 * Run the selected agent once; returns {status,stdout,stderr}.
 * Caller passes workspace root; Cursor uses .cursor/mcp.json there (restored after).
 */
export async function runAgent({kind,executable,workspaceRoot,nodeExe,codingConfigPath,workspacesPath,missionPrompt,onLog,workspaceId}){
 const log=s=>{if(typeof onLog==='function')onLog(s);};
 const mcpDoc={mcpServers:buildMcpServers({nodeExe,codingConfigPath,workspacesPath})};

 if(kind==='cursor'){
  const cursorDir=join(workspaceRoot,'.cursor');
  const mcpPath=join(cursorDir,'mcp.json');
  let backup=null;
  try{
   mkdirSync(cursorDir,{recursive:true});
   if(existsSync(mcpPath)){
    backup=join(cursorDir,'mcp.json.picard-tui-backup-'+randomUUID());
    renameSync(mcpPath,backup);
   }
   writeFileSync(mcpPath,JSON.stringify(mcpDoc,null,2),'utf8');
   log('Wrote temporary '+mcpPath+' (restored after run).\n');
   // Cursor CLI: approve list (`enable`) and attach stdio MCP for `--print` (`mcp login`).
   log('Running: agent mcp enable picard-coding (approve list; can take a few seconds)...\n');
   const enable=spawnSyncUserCommand(executable,['mcp','enable','picard-coding'],{
    encoding:'utf8',
    cwd:workspaceRoot,
    env:{...process.env},
    maxBuffer:512*1024
   });
   const en=agentSpawnResult(enable);
   log('Running: agent mcp login picard-coding (attach stdio MCP for headless session)...\n');
   const login=spawnSyncUserCommand(executable,['mcp','login','picard-coding'],{
    encoding:'utf8',
    cwd:workspaceRoot,
    env:{...process.env},
    maxBuffer:512*1024,
    input:'\n'
   });
   const lo=agentSpawnResult(login);
   const printArgs=['-p','--trust'];
   if(cursorPrintUsesApproveMcps())printArgs.push('--approve-mcps');
   if(cursorPrintUsesAutoReview())printArgs.push('--auto-review');
   if(cursorPrintUsesYolo())printArgs.push('--yolo');
   printArgs.push('--workspace',workspaceRoot);
   const printShown=
    'agent '+printArgs.map(x=>(x===workspaceRoot?'<root>':x)).join(' ')+' <mission>';
   log('Running: '+printShown+' (may take minutes; heartbeats every ~'+Math.round(cursorPrintHeartbeatMs()/1000)+'s while agent runs)...\n');
   const preludeParts=[];
   preludeParts.push(
    en.status===0
     ?'[picard-tui] agent mcp enable picard-coding: ok'
     :'[picard-tui] agent mcp enable picard-coding failed (exit '+en.status+'): '+(en.stderr||en.stdout||'').trim()
   );
   preludeParts.push(
    lo.status===0
     ?'[picard-tui] agent mcp login picard-coding: ok'
     :'[picard-tui] agent mcp login picard-coding failed (exit '+lo.status+'): '+(lo.stderr||lo.stdout||'').trim()
   );
   const prelude=preludeParts.join('\n')+'\n';
   const killCtx={child:null,killedEarly:false};
   const start=Date.now();
   let hbTick=0;
   const hbMs=cursorPrintHeartbeatMs();
   const heartbeat=setInterval(()=>{
    if(killCtx.killedEarly){clearInterval(heartbeat);return;}
    hbTick+=1;
    const sec=Math.round((Date.now()-start)/1000);
    log('[picard-tui] agent -p still running... ~'+sec+'s elapsed (heartbeat '+hbTick+')\n');
   },hbMs);
   let r;
   try{
    if(typeof workspaceId==='string'&&workspaceId.trim())
     r=await runCursorPrintWithWatch({
      executable,
      workspaceRoot,
      workspaceId:workspaceId.trim(),
      codingConfigPath,
      workspacesPath,
      printArgs,
      missionPrompt,
      log,
      killCtx
     });
    else
     r=await spawnUserCommandAsync(executable,[...printArgs,missionPrompt],{
      cwd:workspaceRoot,
      env:{...process.env},
      maxBuffer:8*1024*1024,
      killCtx
     });
   }finally{
    clearInterval(heartbeat);
   }
   const out=agentSpawnResult(r);
   let merged=prelude+out.stdout;
   if(r.killedEarly)
    merged+=
     '\n[picard-tui] Cursor agent was stopped early: local workspace task advanced while `agent -p` was still running (relay may already be complete). Continuing in the TUI.\n';
   const errPre=(en.status!==0?en.stderr+'\n':'')+(lo.status!==0?lo.stderr+'\n':'');
   return {...out,stdout:merged,stderr:errPre+out.stderr};
  }finally{
   try{
    if(backup){renameSync(backup,mcpPath);}
    else if(existsSync(mcpPath))rmSync(mcpPath,{force:true});
   }catch{}
  }
 }

 if(kind==='claude'){
  return writeTempDir('claude-mcp',dir=>{
   const mcpPath=join(dir,'mcp.json');
   writeFileSync(mcpPath,JSON.stringify(mcpDoc,null,2),'utf8');
   const allowed=PICARD_WORKSPACE_TOOL_LIST.join(',');
   const r=spawnSyncUserCommand(executable,['--print','--strict-mcp-config','--allowedTools',allowed,'--mcp-config',mcpPath,missionPrompt],{
    encoding:'utf8',
    cwd:workspaceRoot,
    env:{...process.env},
    maxBuffer:8*1024*1024
   });
   return agentSpawnResult(r);
  });
 }

 if(kind==='codex'){
  return writeTempDir('codex-home',dir=>{
   const cfgPath=join(dir,'config.toml');
   const nodeEsc=nodeExe.replace(/\\/g,'\\\\');
   const srvEsc=connectorServerPath().replace(/\\/g,'\\\\');
   const confEsc=codingConfigPath.replace(/\\/g,'\\\\');
   const wsEsc=workspacesPath.replace(/\\/g,'\\\\');
   const lines=[
    '[mcp_servers.picard-coding]',
    'command = "'+nodeEsc+'"',
    'args = ["'+srvEsc+'"]',
    'default_tools_approval_mode = "approve"',
    '',
    '[mcp_servers.picard-coding.env]',
    'PICARD_CODING_CONFIG = "'+confEsc+'"',
    'PICARD_WORKSPACES_FILE = "'+wsEsc+'"'
   ];
   writeFileSync(cfgPath,lines.join('\n'),'utf8');
   const r=spawnSyncUserCommand(executable,['exec','-s','read-only','--strict-config','--skip-git-repo-check',missionPrompt],{
    encoding:'utf8',
    cwd:workspaceRoot,
    env:{...process.env,CODEX_HOME:dir},
    maxBuffer:8*1024*1024
   });
   return agentSpawnResult(r);
  });
 }

 throw new Error('agent_kind_unsupported');
}
