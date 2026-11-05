import test from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,mkdtempSync,rmSync} from 'node:fs';import {join} from 'node:path';import {tmpdir} from 'node:os';import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';import {createServer} from 'node:net';
import {readCoreHealth} from '../host-support/guarded-update.mjs';
test('every host JavaScript entrypoint parses without executing production operations',()=>{
 const root=fileURLToPath(new URL('../host-support/',import.meta.url));
 for(const f of readdirSync(root).filter(f=>f.endsWith('.mjs'))){const r=spawnSync(process.execPath,['--check',join(root,f)],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);}
});
test('core health socket handles complete, malformed and prematurely closed responses',{skip:process.platform==='win32'},async()=>{
 const dir=mkdtempSync(join(tmpdir(),'picard-health-')),socket=join(dir,'s');
 try{for(const data of ['{"serviceReady":true}\n','invalid\n','{']){
  const server=createServer(s=>s.once('data',()=>s.end(data)));await new Promise(r=>server.listen(socket,r));
  try{if(data.startsWith('{"'))assert.equal((await readCoreHealth(socket)).serviceReady,true);else await assert.rejects(readCoreHealth(socket),/core_health_(invalid|incomplete)/);}finally{await new Promise(r=>server.close(r));}
 }}finally{rmSync(dir,{recursive:true,force:true});}
});
