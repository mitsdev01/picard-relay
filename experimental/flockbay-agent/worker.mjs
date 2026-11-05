import {readFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {DatabaseSync} from 'node:sqlite';
import {requestJson} from './transport.mjs';
import {allowed,pause} from './agent.mjs';
import {validateFlockbay} from './policy.mjs';
import {verifyProjectStatus} from './guard.mjs';
const config=JSON.parse(readFileSync(process.argv[2],'utf8'));
const connection=validateFlockbay(config.connection),origin=new URL(config.origin);
if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.username||origin.password)throw Error('invalid_origin');
mkdirSync(config.state,{recursive:true});
const db=new DatabaseSync(config.state+'/worker.sqlite');
db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS calls(id TEXT PRIMARY KEY,state TEXT,result TEXT);');
const token=readFileSync(config.tokenFile,'utf8').trim();
const headers={Authorization:'Bearer '+token};
const child=spawn(connection.command,connection.args,{env:{...process.env,...connection.env},stdio:['pipe','pipe','pipe'],windowsHide:true});
let seq=0;const pending=new Map();
child.stderr.on('data',()=>{}); // Never persist descriptor or upstream diagnostic secrets.
child.on('exit',()=>{for(const p of pending.values())p.reject(Error('MCP exited; outcome uncertain'));pending.clear();});
createInterface({input:child.stdout}).on('line',line=>{try{const m=JSON.parse(line),p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(Error('MCP error; outcome uncertain')):p.resolve(m.result);}}catch{}});
function rpc(method,params){return new Promise((resolve,reject)=>{const id=++seq,timer=setTimeout(()=>{pending.delete(id);reject(Error('MCP timeout; outcome uncertain'));},600000);pending.set(id,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}
await rpc('initialize',{protocolVersion:'2025-06-18',capabilities:{},clientInfo:{name:'picard-live-flockbay',version:'1.0.0'}});
child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
let tools=[],cursor;do{const page=await rpc('tools/list',cursor?{cursor}:{});tools.push(...page.tools);cursor=page.nextCursor;}while(cursor);
tools=tools.filter(t=>allowed('build').has(t.name));
async function guard(){return verifyProjectStatus(await rpc('tools/call',{name:'flockbay_godot_status',arguments:{}}),config.project);}
function clean(r){return {isError:Boolean(r.isError),content:(r.content||[]).filter(x=>x.type==='text').map(x=>({type:'text',text:String(x.text).slice(0,120000),truncated:String(x.text).length>120000})),imagesOmitted:(r.content||[]).filter(x=>x.type==='image').length};}
async function post(route,body){const r=await requestJson(new URL('development/worker/'+route,origin),{method:'POST',headers,body,timeout:15000});if(r.status!==200)throw Error('relay_http_'+r.status);return r.body;}
await guard();
let registered=false,heartbeatPending=false;
const heartbeatTimer=setInterval(async()=>{if(!registered||heartbeatPending)return;heartbeatPending=true;try{await post('heartbeat',{});}catch{registered=false;}finally{heartbeatPending=false;}},5000);heartbeatTimer.unref();
console.log('Picard live Flockbay bridge started; pinned project verified.');
try{while(true){
 try{
  if(!registered){await post('register',{project:config.project,tools});registered=true;}
  // Redeliver only durable results, never repeat a tool invocation.
  for(const r of db.prepare("SELECT * FROM calls WHERE state IN ('invoked','ready')").all()){
   const result=r.result?JSON.parse(r.result):{uncertain:true,isError:true,content:[{type:'text',text:'Worker restarted during tool invocation. Inspect the game before retrying.'}]};
   await post('result',{id:r.id,result});db.prepare("UPDATE calls SET state='delivered' WHERE id=?").run(r.id);
  }
  const reply=await post('poll',{});if(reply.register){registered=false;continue;}const c=reply.command;
  if(!c){await pause(2000);continue;}
  if(db.prepare('SELECT id FROM calls WHERE id=?').get(c.id))throw Error('duplicate command refused');
  db.prepare("INSERT INTO calls VALUES(?,'invoked',NULL)").run(c.id);
  let result;
  try{
   if(!allowed(c.mode).has(c.name)||!['inspect','build'].includes(c.mode)||Date.now()>=c.deadline)throw Error('tool scope or deadline refused');
   const status=await guard();
   // Recheck cancellation after the read-only project guard, immediately before dispatch.
   const valid=await post('check',{id:c.id});if(!valid.allowed)throw Error('mission stopped before dispatch');
   result=clean(c.name==='flockbay_godot_status'?status:await rpc('tools/call',{name:c.name,arguments:c.args}));
  }catch(e){result={isError:true,uncertain:/uncertain/i.test(e.message),content:[{type:'text',text:e.message}]};}
  db.prepare("UPDATE calls SET state='ready',result=? WHERE id=?").run(JSON.stringify(result),c.id);
 }catch{registered=false;console.log('Relay unavailable or delivery pending; reconnecting without repeating tool calls.');await pause(5000);}
}}finally{clearInterval(heartbeatTimer);child.kill();db.close();}
