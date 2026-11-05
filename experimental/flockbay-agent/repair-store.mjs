import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
export function patchHistory(db,assertOpen=()=>{}){
 db.exec(`CREATE TABLE IF NOT EXISTS patch_artifacts(mission TEXT NOT NULL,digest TEXT NOT NULL,artifact TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(mission,digest));
 CREATE TABLE IF NOT EXISTS patch_repairs(request TEXT PRIMARY KEY,mission TEXT NOT NULL,digest TEXT NOT NULL,feedback TEXT NOT NULL,created INTEGER NOT NULL);`);
 return {
  keep(id,result){const artifact=JSON.parse(result),digest=hash(JSON.stringify(artifact.files));db.prepare('INSERT OR IGNORE INTO patch_artifacts VALUES(?,?,?,?)').run(id,digest,result,Date.now());return digest;},
  artifact(id,digest){const row=db.prepare('SELECT artifact FROM patch_artifacts WHERE mission=? AND digest=?').get(id,digest);if(!row)throw Error('artifact_unknown');return JSON.parse(row.artifact);},
  artifacts(id){return db.prepare('SELECT digest,artifact,created FROM patch_artifacts WHERE mission=? ORDER BY created').all(id);},
  feedback(id){return db.prepare('SELECT feedback FROM patch_repairs WHERE mission=? ORDER BY created DESC,rowid DESC LIMIT 1').get(id)?.feedback||'';},
  repair(id,digest,reason){
   if(typeof reason!=='string'||!reason.trim()||reason.length>2000||!/^[a-f0-9]{64}$/.test(digest||''))throw Error('invalid_review');
   const request=hash(JSON.stringify({id,digest,reason}));
   db.exec('BEGIN IMMEDIATE');
   try{
    if(db.prepare('SELECT request FROM patch_repairs WHERE request=?').get(request)){db.exec('COMMIT');return {started:false,id};}
    assertOpen();
    const m=db.prepare('SELECT * FROM missions WHERE id=?').get(id);
    if(!m||m.state!=='awaiting_validation')throw Error('candidate_not_reviewable');
    const input=JSON.parse(m.input),artifact=JSON.parse(m.result);
    if(input.mode!=='patch'||hash(JSON.stringify(artifact.files))!==digest)throw Error('candidate_conflict');
    if(m.deadline<=Date.now())throw Error('mission_deadline_expired');
    if(m.calls>=Math.min(input.maxCalls,1+input.contract.maxRepairs))throw Error('repair_budget_exhausted');
    if(db.prepare("SELECT id FROM missions WHERE state='running'").get())throw Error('mission_already_running');
    db.prepare('INSERT OR IGNORE INTO patch_artifacts VALUES(?,?,?,?)').run(id,digest,m.result,Date.now());
    const feedback=JSON.stringify({review:reason,previousProposal:artifact.proposal});
    db.prepare('INSERT INTO patch_repairs VALUES(?,?,?,?,?)').run(request,id,digest,feedback,Date.now());
    db.prepare("UPDATE missions SET state='running' WHERE id=?").run(id);
    db.exec('COMMIT');return {started:true,id};
   }catch(e){db.exec('ROLLBACK');throw e;}
  }
 };
}
