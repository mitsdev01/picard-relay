import test from 'node:test';
import assert from 'node:assert';
import {buildReviewBody} from '../review-body.mjs';

test('buildReviewBody prefixes test ids and caps note',()=>{
 const b=buildReviewBody({
  expectedRevision:2,
  decision:'accepted',
  note:'Looks good.',
  resultSha256:'abc',
  testCommandIds:['unit','lint']
 });
 assert.equal(b.decision,'accepted');
 assert.equal(b.expectedRevision,2);
 assert.equal(b.resultSha256,'abc');
 assert.ok(b.note.startsWith('Operator review. Tests: unit, lint.'));
 assert.ok(b.note.includes('Looks good.'));
 assert.ok(b.note.length<=2000);
});

test('buildReviewBody defaults accepted and empty tests',()=>{
 const b=buildReviewBody({expectedRevision:0,decision:'bogus',note:'x',resultSha256:'h'});
 assert.equal(b.decision,'accepted');
 assert.ok(b.note.startsWith('Operator review. '));
});
