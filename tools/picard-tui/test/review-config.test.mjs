import test from 'node:test';
import assert from 'node:assert';
import {writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes} from 'node:crypto';
import {loadReviewConfig} from '../review-config.mjs';

test('loadReviewConfig accepts minimal valid laptop file',()=>{
 const dir=mkdtempSync(join(tmpdir(),'picard-review-cfg-'));
 const p=join(dir,'review.json');
 try{
  const token=randomBytes(32).toString('base64url');
  assert.equal(token.length,43);
  writeFileSync(p,JSON.stringify({
   v:1,
   origin:'https://relay.example.com',
   token,
   codingClientId:'work-laptop-coding'
  }));
  const c=loadReviewConfig(p);
  assert.equal(c.origin,'https://relay.example.com');
  assert.equal(c.codingClientId,'work-laptop-coding');
 }finally{
  rmSync(dir,{recursive:true,force:true});
 }
});

test('loadReviewConfig rejects extra fields',()=>{
 const dir=mkdtempSync(join(tmpdir(),'picard-review-bad-'));
 const p=join(dir,'review.json');
 try{
  const token=randomBytes(32).toString('base64url');
  writeFileSync(p,JSON.stringify({
   v:1,
   origin:'https://relay.example.com',
   token,
   codingClientId:'work-laptop-coding',
   extra:'no'
  }));
  assert.throws(()=>loadReviewConfig(p),/review_configuration_unavailable/);
 }finally{
  rmSync(dir,{recursive:true,force:true});
 }
});
