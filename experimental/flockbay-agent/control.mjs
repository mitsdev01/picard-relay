// Host-side client. Invoked through existing SSH; input is JSON on stdin.
import http from 'node:http';
import {pathToFileURL} from 'node:url';
import {validateMission} from './agent.mjs';
export async function controlRequest(socket,command){
 const {action,id,mission}=command;
 if(!['status','show','events','start','stop','reject','repair'].includes(action))throw Error('unknown_action');
 if(['show','events','stop','reject','repair'].includes(action)&&!/^[a-f0-9-]{36}$/.test(id||''))throw Error('invalid_id');
 if(action==='start')validateMission(mission);
 const path=action==='status'?'/development/api/status':['show','events'].includes(action)?'/development/api/missions/'+id:action==='start'?'/development/api/missions':action==='repair'?'/development/api/repair':action==='reject'?'/development/api/reject':'/development/api/stop';
 const body=action==='start'?JSON.stringify(mission):['reject','repair'].includes(action)?JSON.stringify({id,candidateSha256:command.candidateSha256,reason:command.reason}):action==='stop'?JSON.stringify({id}):null;
 const result=await new Promise((resolve,reject)=>{
  const req=http.request({socketPath:socket,path,method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}:{}},res=>{
   let chunks=[],bytes=0;res.on('data',c=>{bytes+=c.length;if(bytes>4*1024*1024){res.destroy(Error('response_too_large'));return;}chunks.push(c);});res.on('error',reject);res.on('end',()=>{try{const data=JSON.parse(Buffer.concat(chunks).toString());if(res.statusCode!==200)throw Error(data.error||'control_failed');resolve(data);}catch(e){reject(e);}});
  });req.on('error',reject);req.setTimeout(20000,()=>req.destroy(Error('control_timeout_check_existing_id_before_resubmitting')));req.end(body);
 });
 if(action==='status')return {...result,missions:result.missions.map(m=>({id:m.id,state:m.state,calls:m.calls,maxCalls:m.input.maxCalls,mode:m.input.mode,created:m.created}))};
 if(action==='show')return {mission:result.mission&&{...result.mission,input:JSON.parse(result.mission.input)},artifacts:result.artifacts,events:result.events.filter(e=>e.kind!=='tool_result').slice(-30)};
 return result;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{let parts=[],bytes=0;for await(const c of process.stdin){bytes+=c.length;if(bytes>256000)throw Error('input_too_large');parts.push(c);}const command=JSON.parse(Buffer.concat(parts).toString());console.log(JSON.stringify(await controlRequest('/var/lib/picard-flockbay-agent/control.sock',command),null,2));}
 catch(e){console.error(JSON.stringify({error:e.message}));process.exitCode=1;}
}
