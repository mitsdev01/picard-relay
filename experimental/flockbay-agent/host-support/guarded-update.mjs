// Fixed Oracle host entrypoint. Installed root-owned; no command-line inputs.
import {readFileSync,lstatSync,realpathSync,readlinkSync,writeFileSync,existsSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {createConnection} from 'node:net';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {controlRequest} from '../control.mjs';
import {codeIdentity,coordinatedUpdate} from '../release-gate.mjs';
import {requestJson} from '../transport.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const live='/opt/picard-flockbay-agent/v1',socket='/var/lib/picard-flockbay-agent/control.sock',root='/opt/picard-relay';
function trusted(file){const s=lstatSync(file);if(!s.isFile()||s.isSymbolicLink()||s.uid!==0||(s.mode&0o022)||s.size>3*1024*1024)throw Error('unsafe_operator_file');return readFileSync(file);}
function history(){const db=new DatabaseSync('/var/lib/picard-flockbay-agent/agent.sqlite',{readOnly:true});try{return sha(JSON.stringify(['missions','commands','events','patch_artifacts','patch_repairs'].map(t=>db.prepare('SELECT * FROM '+t+' ORDER BY rowid').all())));}finally{db.close();}}
export function readCoreHealth(socketPath='/run/picard-relay/control.sock'){
 return new Promise((resolve,reject)=>{
  const s=createConnection(socketPath);let data='',done=false;
  const finish=(error,value)=>{if(done)return;done=true;s.destroy();error?reject(error):resolve(value);};
  s.setTimeout(5000,()=>finish(Error('core_health_timeout')));
  s.on('error',error=>finish(error));
  s.on('end',()=>finish(Error('core_health_incomplete')));
  s.on('connect',()=>s.write('{"v":1,"action":"health"}\n'));
  s.on('data',b=>{
   data+=b;if(data.length>16384)return finish(Error('core_health_oversized'));
   if(data.includes('\n')){try{finish(null,JSON.parse(data));}catch{finish(Error('core_health_invalid'));}}
  });
 });
}
export async function main(){
 if(process.getuid?.()!==0||process.argv.length!==2)throw Error('fixed_operator_entrypoint_required');
 for(const dir of ['/opt','/opt/picard-relay','/opt/picard-flockbay-agent',live,'/etc/picard-updater']){const s=lstatSync(dir);if(!s.isDirectory()||s.isSymbolicLink()||s.uid!==0||(s.mode&0o022)||realpathSync(dir)!==dir)throw Error('unsafe_host_directory');}
 if(existsSync('/var/lib/picard-updater/HOLD')||existsSync('/var/lib/picard-relay/STOP')||existsSync(root+'/pending.json'))throw Error('operator_hold_present');
 const {loadAdministratorPolicy,applyPreparedUpdate}=await import('/usr/local/lib/picard-updater/updater.mjs');
 const {decodeEnvelope}=await import('/usr/local/lib/picard-updater/pull.mjs');
 const policy=await loadAdministratorPolicy('/etc/picard-updater/policy.json',0);
 if(policy.source!=='https://raw.githubusercontent.com/mitsdev01/picard-relay/release-feed/releases/stable.json'||policy.signatureMode!=='sigstore'||policy.enabled!==true)throw Error('updater_enrollment_mismatch');
 const file='/var/lib/picard-updater-inbox/stable.json',st=lstatSync(file);
 if(!st.isFile()||st.isSymbolicLink()||st.size>3*1024*1024)throw Error('unsafe_inbox');
 const packet=decodeEnvelope(readFileSync(file),policy,Date.now()),releaseHash=sha(packet.manifestBytes);
 const qualification=JSON.parse(trusted('/etc/picard-updater/compatibility.json'));
 const config=JSON.parse(trusted('/etc/picard-flockbay-agent/config.json'));
 const beforeCore=await readCoreHealth();
 if(!beforeCore.serviceReady||!beforeCore.resultRecoveryReady||beforeCore.busy||beforeCore.unresolvedInvoking)throw Error('core_unready');
 const observe=async()=>{const s=await controlRequest(socket,{action:'status'});return{releaseHash,companionHash:codeIdentity(live).sha256,workerHash:s.workerHash,project:s.project,connected:s.connected,protocolVersion:s.integration.protocolVersion,stateSchema:s.integration.stateSchema,maintenanceId:s.maintenance?.id,historyHash:history()};};
 const id=randomUUID();
 const result=await coordinatedUpdate({now:Date.now,policy:async()=>qualification,observe,
  acquire:()=>controlRequest(socket,{action:'maintenance-acquire',id,reason:'Qualified signed core update '+releaseHash}),
  install:async()=>{if(readlinkSync(root+'/current')==='releases/'+releaseHash)return;await applyPreparedUpdate({policy,...packet});},
  verify:async()=>{const s=await observe(),h=await readCoreHealth();const headers={Host:new URL(config.origin).host};
   const core=await requestJson('http://127.0.0.1:8787/status',{headers,timeout:5000});
   const companion=await requestJson('http://127.0.0.1:8789/development/api/status',{headers,timeout:5000});
   return{...s,installedReleaseHash:h.releaseHash,webAuthPassed:core.status===401&&companion.status===401,coreReady:h.serviceReady===true&&h.resultRecoveryReady===true&&h.busy===false&&h.unresolvedInvoking===0&&JSON.stringify(h.ledgerStateCounts)===JSON.stringify(beforeCore.ledgerStateCounts)};
  },release:id=>controlRequest(socket,{action:'maintenance-release',id})});
 console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{
 const code=/^[a-z_]+$/.test(e.message)?e.message:'guarded_update_failed';
 // Unknown or unavailable workers defer checks without consuming an update.
 // A held maintenance barrier itself is durable evidence and never cleared here.
 writeFileSync('/var/lib/picard-updater/last-guard-result.json',JSON.stringify({ok:false,code,at:new Date().toISOString()}),{mode:0o600});
 console.error(JSON.stringify({ok:false,code}));process.exitCode=1;
});
