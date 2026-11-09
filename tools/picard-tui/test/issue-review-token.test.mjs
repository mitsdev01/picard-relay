import test from 'node:test';
import assert from 'node:assert';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {loadReviewConfig} from '../review-config.mjs';

const script=join(dirname(fileURLToPath(import.meta.url)),'..','issue-review-token.mjs');

test('issue-review-token writes config loadReviewConfig accepts',()=>{
 const dir=mkdtempSync(join(tmpdir(),'picard-issue-review-'));
 const clientPath=join(dir,'review-client.json');
 try{
  const r=spawnSync(process.execPath,[script,'--client',clientPath,'--coding-client-id','work-laptop-coding','--origin','https://relay.example.com'],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  assert.ok(existsSync(clientPath));
  const c=loadReviewConfig(clientPath);
  assert.equal(c.origin,'https://relay.example.com');
  assert.equal(c.codingClientId,'work-laptop-coding');
  assert.match(c.token,/^[A-Za-z0-9_-]{43}$/);
 }finally{
  rmSync(dir,{recursive:true,force:true});
 }
});

test('issue-review-token rejects origin with path',()=>{
 const dir=mkdtempSync(join(tmpdir(),'picard-issue-review-bad-'));
 const clientPath=join(dir,'review-client.json');
 try{
  const r=spawnSync(process.execPath,[script,'--client',clientPath,'--coding-client-id','work-laptop-coding','--origin','https://relay.example.com/console'],{encoding:'utf8'});
  assert.notEqual(r.status,0);
  assert.ok(!existsSync(clientPath));
 }finally{
  rmSync(dir,{recursive:true,force:true});
 }
});
