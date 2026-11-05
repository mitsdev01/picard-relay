// Durable admission barrier shared by every process using the companion ledger.
// Only the private operator socket may acquire/release it. No expiry or auto-clear.
export function maintenanceStore(db) {
 db.exec(`CREATE TABLE IF NOT EXISTS maintenance_runs(id TEXT PRIMARY KEY, reason TEXT NOT NULL, acquired INTEGER NOT NULL, released INTEGER);
 CREATE UNIQUE INDEX IF NOT EXISTS one_maintenance ON maintenance_runs((1)) WHERE released IS NULL;`);
 const status=()=>db.prepare('SELECT id,reason,acquired FROM maintenance_runs WHERE released IS NULL').get()||null;
 const assertOpen=()=>{if(status())throw Error('maintenance_active');};
 const pending=()=>({missions:db.prepare("SELECT COUNT(*) n FROM missions WHERE state IN ('running','awaiting_validation')").get().n,commands:db.prepare("SELECT COUNT(*) n FROM commands WHERE state IN ('queued','sent','uncertain')").get().n});
 const idle=()=>{const p=pending();if(p.missions||p.commands)throw Error('maintenance_work_unresolved');};
 return {status,assertOpen,pending,
  acquire(id,reason){
   if(typeof id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id)||typeof reason!=='string'||!reason.trim()||reason.length>500)throw Error('invalid_maintenance');
   db.exec('BEGIN IMMEDIATE');try{
    const prior=db.prepare('SELECT * FROM maintenance_runs WHERE id=?').get(id);
    if(prior){if(prior.released!==null||prior.reason!==reason)throw Error('maintenance_identity_consumed');db.exec('COMMIT');return status();}
    assertOpen();idle();db.prepare('INSERT INTO maintenance_runs VALUES(?,?,?,NULL)').run(id,reason,Date.now());db.exec('COMMIT');return status();
   }catch(e){db.exec('ROLLBACK');throw e;}
  },
  release(id){db.exec('BEGIN IMMEDIATE');try{if(!status()||status().id!==id)throw Error('maintenance_identity_conflict');idle();db.prepare('UPDATE maintenance_runs SET released=? WHERE id=? AND released IS NULL').run(Date.now(),id);db.exec('COMMIT');return {released:true,id};}catch(e){db.exec('ROLLBACK');throw e;}}
 };
}
