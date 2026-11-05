import {providerDiagnostic} from './provider-diagnostics.mjs';
import http from 'node:http';
import {readFileSync,mkdirSync,lstatSync,unlinkSync,chmodSync} from 'node:fs';
import {timingSafeEqual} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {openAgentStore} from './store.mjs';
import {requestJson} from './transport.mjs';
import {allowed,pause,runMission,validateMission} from './agent.mjs';
import {createRateControl} from './rate-control.mjs';
import {validEnrollment} from './enrollment.mjs';
export function makeServer({config,store,auth,model,token,beforeModel}){
 let catalogue=[],heartbeat=0;const online=()=>Date.now()-heartbeat<20000&&catalogue.length>0;
 const sameToken=value=>{const a=Buffer.from(value||''),b=Buffer.from('Bearer '+token);return a.length===b.length&&timingSafeEqual(a,b);};
 const execute=async(name,args,id)=>{
  if(!online())throw Error('bridge_offline');const c=store.queue(id,name,args);
  while(store.get(id).state==='running'&&Date.now()<store.get(id).deadline){const row=store.command(c.id);if(row.state==='completed')return JSON.parse(row.result);await pause(250);}
  throw Error('tool_outcome_uncertain');
 };
 const trusted=new WeakSet();
 const handler=async(req,res)=>{
  const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
  try{
   const path=new URL(req.url,'http://127.0.0.1').pathname;
   const worker=path.startsWith('/development/worker/');
   if(worker){if(!sameToken(req.headers.authorization))return send(401,{error:'unauthorized'});}
   else if(!trusted.has(req)){if(!await auth(req))return send(401,{error:'Sign in at the main Picard console first.'});if(req.method!=='GET'&&req.headers.origin!==config.origin)return send(403,{error:'origin_refused'});}
   if(req.method==='GET'&&path==='/development/'){
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"});return res.end(readFileSync(new URL('./ui.html',import.meta.url)));
   }
   if(req.method==='GET'&&['/development/app.js','/development/style.css'].includes(path)){res.writeHead(200,{'Content-Type':path.endsWith('.js')?'text/javascript':'text/css','X-Content-Type-Options':'nosniff'});return res.end(readFileSync(new URL(path.endsWith('.js')?'./app.js':'./style.css',import.meta.url)));}
   if(req.method==='GET'&&path==='/development/api/status')return send(200,{integration:{protocolVersion:1,stateSchema:1},project:config.project,model:'Groq / openai/gpt-oss-20b',connected:online(),tools:catalogue.length,capabilities:{patch:true,repair:true,isolatedValidation:false,promotion:false},missions:store.list().map(m=>{const i=JSON.parse(m.input);return {id:m.id,state:m.state,calls:m.calls,created:m.created,deadline:m.deadline,input:{mode:i.mode,prompt:i.prompt,maxCalls:i.maxCalls}};})});
   if(req.method==='GET'&&/^\/development\/api\/missions\/[a-f0-9-]{36}$/.test(path)){const id=path.split('/').pop();return send(200,{mission:store.get(id),events:store.events(id),artifacts:store.artifacts(id).map(a=>({digest:a.digest,created:a.created}))});}
   const artifactMatch=path.match(/^\/development\/api\/missions\/([a-f0-9-]{36})\/artifacts\/([a-f0-9]{64})$/);
   if(req.method==='GET'&&artifactMatch)return send(200,store.artifact(artifactMatch[1],artifactMatch[2]));
   if(req.method!=='POST')return send(404,{error:'not_found'});
   let chunks=[],bytes=0;for await(const chunk of req){bytes+=chunk.length;if(bytes>1024*1024){send(413,{error:'body_too_large'});return;}chunks.push(chunk);}
   const b=JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');
   if(worker){
    if(path==='/development/worker/register'){
     if(b.project!==config.project||!Array.isArray(b.tools)||b.tools.length>120)throw Error('invalid_worker');
     catalogue=b.tools.filter(t=>allowed('build').has(t.name)&&typeof t.description==='string'&&t.inputSchema?.type==='object');
     if(!catalogue.some(t=>t.name==='flockbay_godot_status'))throw Error('missing_status_tool');heartbeat=Date.now();return send(200,{ok:true});
    }
    heartbeat=Date.now();
    if(path==='/development/worker/heartbeat')return send(200,{ok:true});
    if(path==='/development/worker/poll')return send(200,{register:!catalogue.length,command:catalogue.length?store.take():null});
    if(path==='/development/worker/result'){if(typeof b.id!=='string'||JSON.stringify(b.result).length>200000)throw Error('invalid_result');store.result(b.id,b.result);return send(200,{ok:true});}
    if(path==='/development/worker/check'){const c=store.command(b.id),m=c&&store.get(c.mission);return send(200,{allowed:!!(c?.state==='sent'&&m?.state==='running'&&m.deadline>Date.now())});}
   }
   if(path==='/development/api/missions'){
    const input=validateMission(b),previous=store.get(input.id);if(!previous&&input.mode==='build')throw Error('legacy_build_disabled_use_patch');if(!previous&&input.mode!=='patch'&&!online())throw Error('bridge_offline');
    const mission=store.create(input);if(!previous)store.event(input.id,'submitted_via',trusted.has(req)?'ssh_private_control':'owner_web_session');send(200,{id:mission.id,state:mission.state});
    if(!previous)void runMission({store,input,project:config.project,catalogue:[...catalogue],model,execute,online,beforeModel});return;
   }
   if(path==='/development/api/repair'){
    const r=store.requestRepair(b.id,b.candidateSha256,b.reason);send(200,r);
    if(r.started){store.event(b.id,'repair_requested',b.reason);const input=JSON.parse(store.get(b.id).input);void runMission({store,input,project:config.project,catalogue:[...catalogue],model,execute,online,beforeModel});}return;
   }
   if(path==='/development/api/reject')return send(200,store.reject(b.id,b.candidateSha256,b.reason));
   if(path==='/development/api/stop'){store.cancel(b.id);return send(200,{ok:true});}
   send(404,{error:'not_found'});
  }catch(e){if(!res.headersSent)send(400,{error:/^[a-z_]+$/.test(e.message)?e.message:'request_failed'});}
 };
 const server=http.createServer(handler);
 // Trust is attached to requests received on this private OS socket, never to
 // client headers, a query flag, source IP, or the public worker credential.
 const control=http.createServer((req,res)=>{
  const allowed=req.method==='GET'&&(req.url==='/development/api/status'||/^\/development\/api\/missions\/[a-f0-9-]{36}$/.test(req.url))||req.method==='POST'&&['/development/api/missions','/development/api/stop','/development/api/reject','/development/api/repair'].includes(req.url);
  if(!allowed){res.writeHead(403,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'control_route_refused'}));return;}
  trusted.add(req);void handler(req,res);
 });
 server.control=control;
 control.requestTimeout=30000;server.requestTimeout=30000;return server;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
 const token=readFileSync(config.tokenFile,'utf8').trim(),key=readFileSync(config.keyFile,'utf8').trim();
 const gate=JSON.parse(readFileSync(config.gateFile,'utf8'));
 // Validate retained account/key evidence, not the expired one-shot request grant.
 // New authority is the exact bounded mission approved by the signed-in owner.
 if(!validEnrollment(gate,key))throw Error('retained_free_enrollment_missing');
 mkdirSync(config.state,{recursive:true});const store=openAgentStore(config.state+'/agent.sqlite');store.recover();
 store.db.exec('CREATE TABLE IF NOT EXISTS provider_state(id TEXT PRIMARY KEY,value TEXT NOT NULL)');
 const rate=createRateControl({load:()=>JSON.parse(store.db.prepare("SELECT value FROM provider_state WHERE id='groq'").get()?.value||'null'),save:s=>store.db.prepare("INSERT INTO provider_state VALUES('groq',?) ON CONFLICT(id) DO UPDATE SET value=excluded.value").run(JSON.stringify(s))});
 const beforeModel=(body,id,deadline)=>rate.before(body,{deadline,active:()=>store.get(id)?.state==='running',event:message=>store.event(id,'rate_wait',message)});
 const auth=async req=>{if(!req.headers.cookie)return false;try{const r=await requestJson('http://127.0.0.1:8787/status',{headers:{Host:new URL(config.origin).host,Cookie:req.headers.cookie},timeout:5000});return r.status===200;}catch{return false;}};
 const model=async(body,deadline,id)=>{
  const r=await requestJson('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key},body,timeout:60000,signal:AbortSignal.timeout(Math.max(1,Math.min(90000,deadline-Date.now())))});
  const limits=rate.observe(r.headers,r.status);store.event(id,'rate_limits',JSON.stringify(limits));
  if(r.status===429){const message=String(r.body?.error?.message||'');const kind=/tokens per minute|\bTPM\b/i.test(message)?'tokens_per_minute':/tokens per day|\bTPD\b/i.test(message)?'tokens_per_day':/requests per minute|\bRPM\b/i.test(message)?'requests_per_minute':/requests per day|\bRPD\b/i.test(message)?'requests_per_day':'unspecified';store.event(id,'rate_limited',JSON.stringify({kind,retryAfterSeconds:Math.ceil((limits.cooldown-Date.now())/1000)}));}
  if(r.status!==200){store.event(id,'provider_error',JSON.stringify(providerDiagnostic(r.status,r.body)));throw Error('groq_http_'+r.status);}return r.body;
 };
 const service=makeServer({config,store,auth,model,token,beforeModel});
 const socket=config.state+'/control.sock';
 try{const stat=lstatSync(socket);if(!stat.isSocket()||stat.uid!==process.getuid())throw Error('control_socket_path_refused');unlinkSync(socket);}catch(e){if(e.code!=='ENOENT')throw e;}
 service.control.listen(socket,()=>{chmodSync(socket,0o600);console.log('Private Picard control socket ready.');});
 service.listen(config.port||8789,'127.0.0.1',()=>console.log('Picard Groq Flockbay agent listening on loopback.'));
}

