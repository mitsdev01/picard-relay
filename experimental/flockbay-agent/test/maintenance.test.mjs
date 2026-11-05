import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {openAgentStore} from '../store.mjs';
import {makeServer} from '../server.mjs';
import {requestJson} from '../transport.mjs';
const mission=()=>({id:randomUUID(),approved:true,prompt:'inspect',mode:'inspect',maxCalls:1,minutes:1});
test('durable maintenance excludes admissions across connections and restart; IDs cannot be reused',()=>{
 const dir=mkdtempSync(join(tmpdir(),'picard-maintenance-')),path=join(dir,'db.sqlite');let a=openAgentStore(path),b=openAgentStore(path);const id=randomUUID();
 try{a.maintenance.acquire(id,'qualify release');assert.equal(b.maintenance.status().id,id);assert.throws(()=>b.create(mission()),/maintenance_active/);a.close();a=openAgentStore(path);a.recover();assert.equal(a.maintenance.status().id,id);assert.equal(a.maintenance.acquire(id,'qualify release').id,id);assert.throws(()=>a.maintenance.release(randomUUID()),/identity_conflict/);a.maintenance.release(id);assert.throws(()=>a.maintenance.acquire(id,'qualify release'),/identity_consumed/);b.create(mission());assert.throws(()=>a.maintenance.acquire(randomUUID(),'update'),/work_unresolved/);}finally{a.close();b.close();rmSync(dir,{recursive:true,force:true});}
});
test('cancelled mission with a dispatched tool still blocks maintenance; late receipt resolves it',()=>{
 const s=openAgentStore(':memory:');try{const m=mission();s.create(m);const c=s.queue(m.id,'flockbay_godot_status',{});s.take();s.cancel(m.id);assert.throws(()=>s.maintenance.acquire(randomUUID(),'update'),/work_unresolved/);s.recover();assert.throws(()=>s.maintenance.acquire(randomUUID(),'update'),/work_unresolved/);s.result(c.id,{ok:true});s.maintenance.acquire(randomUUID(),'update');assert.equal(s.take(),null);}finally{s.close();}
});
test('awaiting validation prevents update until reviewed; rejected work stays preserved',()=>{
 const s=openAgentStore(':memory:');try{const m=mission();s.create(m);s.db.prepare("UPDATE missions SET state='awaiting_validation' WHERE id=?").run(m.id);assert.throws(()=>s.maintenance.acquire(randomUUID(),'update'),/work_unresolved/);s.db.prepare("UPDATE missions SET state='rejected' WHERE id=?").run(m.id);s.maintenance.acquire(randomUUID(),'update');assert.equal(s.get(m.id).state,'rejected');assert.throws(()=>s.requestRepair(m.id,'a'.repeat(64),'fix'),/maintenance_active/);}finally{s.close();}
});
test('owner web session and worker token cannot acquire operator maintenance',async()=>{
 const store=openAgentStore(':memory:'),s=makeServer({config:{origin:'https://test',project:'game'},store,auth:async()=>true,token:'worker',model:async()=>{throw Error('no_calls');}});
 await new Promise(r=>s.listen(0,'127.0.0.1',r));try{const r=await requestJson('http://127.0.0.1:'+s.address().port+'/development/api/maintenance',{method:'POST',headers:{Origin:'https://test',Authorization:'Bearer worker'},body:{action:'acquire',id:randomUUID(),reason:'update'}});assert.equal(r.status,403);assert.equal(store.maintenance.status(),null);}finally{await new Promise(r=>s.close(r));store.close();}
});
