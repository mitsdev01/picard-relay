// Read-only host probe. No provider calls, no updates, no state repair.
import {pathToFileURL} from 'node:url';
import {controlRequest} from './control.mjs';
export function assessCompatibility(status,{requireIdle=false,requireWorker=false}={}){
 const problems=[];
 if(status?.integration?.protocolVersion!==1)problems.push('unsupported_control_protocol');
 if(status?.integration?.stateSchema!==1)problems.push('unsupported_state_schema');
 if(typeof status?.project!=='string'||!status.project||!Array.isArray(status?.missions))problems.push('invalid_status');
 const busy=Array.isArray(status?.missions)&&status.missions.some(m=>m.state==='running');
 if(requireIdle&&busy)problems.push('mission_running_do_not_restart');
 if(requireWorker&&status?.connected!==true)problems.push('local_worker_offline');
 return {ok:problems.length===0,problems,integration:status?.integration,project:status?.project,workerConnected:status?.connected===true,busy:!!busy,noProviderCalls:true,scope:'Point-in-time companion compatibility only; not an updater lock, authenticated-web check, or game acceptance test.'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{const args=process.argv.slice(2);if(args.some(a=>!['--require-idle','--require-worker'].includes(a)))throw Error('invalid_options');const status=await controlRequest('/var/lib/picard-flockbay-agent/control.sock',{action:'status'});const r=assessCompatibility(status,{requireIdle:args.includes('--require-idle'),requireWorker:args.includes('--require-worker')});console.log(JSON.stringify(r,null,2));if(!r.ok)process.exitCode=1;}catch(e){console.error(JSON.stringify({ok:false,error:e.message,noProviderCalls:true}));process.exitCode=1;}
}
