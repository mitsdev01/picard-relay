import test from 'node:test';
import assert from 'node:assert';
import {writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {readRelayEventIdFromJournal} from '../workspace-ops.mjs';

const REF='a'.repeat(64);

test('readRelayEventIdFromJournal reads eventId from ledger file',()=>{
 const base=mkdtempSync(join(tmpdir(),'picard-tui-journal-'));
 try{
  const stateDir=join(base,'state');
  const repo=join(base,'repo');
  mkdirSync(stateDir,{recursive:true});
  mkdirSync(repo,{recursive:true});
  const registryPath=join(base,'workspaces.json');
  writeFileSync(registryPath,JSON.stringify({
   v:1,
   stateDir,
   workspaces:[{id:'w1',root:repo,allowApply:false,testCommands:[]}]
  }));
  const codingPath=join(base,'coding.json');
  const token=randomBytes(32).toString('base64url');
  assert.equal(token.length,43);
  mkdirSync(join(stateDir,'legacy'),{recursive:true});
  writeFileSync(codingPath,JSON.stringify({
   v:1,
   origin:'https://relay.example.com',
   token,
   workspaceRoot:repo,
   journalDir:join(stateDir,'legacy')
  }));
  const journalDir=join(stateDir,'w1','relay-journal');
  mkdirSync(journalDir,{recursive:true});
  const taskId='00000000-0000-4000-8000-000000000001';
  writeFileSync(join(journalDir,taskId+'.json'),JSON.stringify({
   v:1,
   requestId:taskId,
   revision:1,
   state:'prepared',
   eventId:REF,
   draftSha256:null,
   submission:null,
   updatedAt:new Date().toISOString()
  }));
  const got=readRelayEventIdFromJournal(registryPath,codingPath,'w1',taskId);
  assert.equal(got,REF);
 }finally{
  rmSync(base,{recursive:true,force:true});
 }
});
