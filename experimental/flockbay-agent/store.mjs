import {patchHistory} from './repair-store.mjs';
import {DatabaseSync} from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
export const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function openAgentStore(path) {
  const db=new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS missions(id TEXT PRIMARY KEY,input TEXT NOT NULL,state TEXT NOT NULL,calls INTEGER NOT NULL DEFAULT 0,result TEXT NOT NULL DEFAULT '',created INTEGER NOT NULL,deadline INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS commands(id TEXT PRIMARY KEY,mission TEXT NOT NULL,payload TEXT NOT NULL,state TEXT NOT NULL,result TEXT,result_hash TEXT);
    CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,mission TEXT NOT NULL,kind TEXT NOT NULL,text TEXT NOT NULL,at INTEGER NOT NULL);`);
  const history=patchHistory(db);
  const get=id=>db.prepare('SELECT * FROM missions WHERE id=?').get(id);
  const active=()=>db.prepare("SELECT * FROM missions WHERE state='running'").get();
  const event=(id,kind,text)=>db.prepare('INSERT INTO events(mission,kind,text,at) VALUES(?,?,?,?)').run(id,kind,String(text).slice(0,16000),Date.now());
  return {db,get,active,event,artifacts:history.artifacts,artifact:history.artifact,repairFeedback:history.feedback,requestRepair:history.repair,
    recover(){db.exec("UPDATE missions SET state='uncertain',result='Server restarted during a mission. Do not replay; inspect recorded calls and the game.' WHERE state='running'; UPDATE commands SET state='uncertain' WHERE state IN ('queued','sent');");},
    create(input){
      const existing=get(input.id);if(existing){if(existing.input!==JSON.stringify(input))throw Error('request_identity_conflict');return existing;}
      if(active())throw Error('mission_already_running');
      if(db.prepare('SELECT COUNT(*) n FROM missions').get().n>=1000)throw Error('history_full');
      db.prepare("INSERT INTO missions(id,input,state,created,deadline) VALUES(?,?,'running',?,?)").run(input.id,JSON.stringify(input),Date.now(),Date.now()+input.minutes*60000);
      event(input.id,'approved',`Exact mission approved: ${input.mode}; at most ${input.maxCalls} Groq calls; ${input.minutes} minutes.`);return get(input.id);
    },
    finish(id,state,result){if(state==='awaiting_validation'&&get(id)?.state==='running')history.keep(id,result);db.prepare("UPDATE missions SET state=?,result=? WHERE id=? AND state='running'").run(state,result,id);},
    reserveCall(id){const m=get(id);if(!m||m.state!=='running'||m.deadline<=Date.now()||m.calls>=JSON.parse(m.input).maxCalls)throw Error('mission_limit');db.prepare('UPDATE missions SET calls=calls+1 WHERE id=?').run(id);event(id,'model',`Groq call ${m.calls+1} reserved before network I/O`);},
    queue(id,name,args){const command={id:randomUUID(),mission:id,name,args};db.prepare("INSERT INTO commands(id,mission,payload,state) VALUES(?,?,?,'queued')").run(command.id,id,JSON.stringify(command));event(id,'tool_requested',name);return command;},
    take(){
      const c=db.prepare("SELECT c.* FROM commands c JOIN missions m ON m.id=c.mission WHERE c.state='queued' AND m.state='running' AND m.deadline>? ORDER BY c.rowid LIMIT 1").get(Date.now());
      if(!c)return null;
      db.prepare("UPDATE commands SET state='sent' WHERE id=? AND state='queued'").run(c.id);
      const m=get(c.mission),input=JSON.parse(m.input);
      return {...JSON.parse(c.payload),mode:input.mode,deadline:m.deadline};
    },
    command:id=>db.prepare('SELECT * FROM commands WHERE id=?').get(id),
    result(id,result){const c=db.prepare('SELECT * FROM commands WHERE id=?').get(id);if(!c)throw Error('command_unknown');const hash=digest(result);if(c.result_hash){if(c.result_hash!==hash)throw Error('result_conflict');return;}if(!['sent','uncertain'].includes(c.state))throw Error('command_not_sent');db.prepare("UPDATE commands SET result=?,result_hash=?,state='completed' WHERE id=?").run(JSON.stringify(result),hash,id);event(c.mission,'tool_result',JSON.stringify({name:JSON.parse(c.payload).name,...result}));},
    reject(id,candidateSha256,reason){
      const m=get(id);if(!m||m.state!=='awaiting_validation')throw Error('candidate_not_reviewable');
      const artifact=JSON.parse(m.result);
      const hash=createHash('sha256').update(JSON.stringify(artifact.files)).digest('hex');
      if(hash!==candidateSha256)throw Error('candidate_conflict');
      if(typeof reason!=='string'||!reason.trim()||reason.length>2000)throw Error('invalid_review');
      artifact.acceptance={accepted:false,reason};artifact.phase='rejected';
      db.prepare("UPDATE missions SET state='rejected',result=? WHERE id=? AND state='awaiting_validation'").run(JSON.stringify(artifact),id);
      event(id,'review_rejected',reason);return {state:'rejected'};
    },
    cancel(id){if(!get(id))throw Error('mission_unknown');db.prepare("UPDATE missions SET state='cancelled',result='Stopped. Already dispatched tool calls may finish; existing edits remain.' WHERE id=? AND state='running'").run(id);db.prepare("UPDATE commands SET state='cancelled' WHERE mission=? AND state='queued'").run(id);event(id,'stopped','No further model calls or tools will be dispatched.');},
    list:()=>db.prepare('SELECT id,input,state,calls,result,created,deadline FROM missions ORDER BY created DESC LIMIT 100').all(),
    events:id=>db.prepare('SELECT * FROM events WHERE mission=? ORDER BY seq').all(id),
    close:()=>db.close(),
  };
}
