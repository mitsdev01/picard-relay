import {test} from 'node:test';import assert from 'node:assert/strict';
import {publishFork} from './publish-fork.mjs';
const env={PICARD_FORK_RELEASE:'1',GITHUB_REPOSITORY:'mitsdev01/picard-relay',GITHUB_REF:'refs/heads/main',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_NUMBER:'1',GITHUB_RUN_ATTEMPT:'1'};
test('publication writes only the separate feed branch with optimistic blob identity',()=>{
 const calls=[];publishFork({env,bytes:Buffer.from('fixture'),gh:(args,body)=>{calls.push({args,body});return JSON.stringify({sha:'b'.repeat(40)});}});
 assert.match(calls[1].args[1],/\?ref=release-feed$/);assert.equal(calls[2].body.branch,'release-feed');assert.equal(calls[2].body.sha,'b'.repeat(40));assert.equal(calls.length,3);
});
test('first publication creates feed at tested commit; permissions failures never become missing files',()=>{
 const calls=[];publishFork({env,bytes:Buffer.from('fixture'),gh:(args,body)=>{calls.push({args,body});if(args[1]!=='--method')throw Object.assign(Error('missing'),{stderr:'Not Found (HTTP 404)'});return '{}';}});
 assert.deepEqual(calls[1].body,{ref:'refs/heads/release-feed',sha:env.GITHUB_SHA});assert.equal(calls.at(-1).body.branch,'release-feed');
 assert.throws(()=>publishFork({env,bytes:Buffer.from('fixture'),gh:()=>{throw Object.assign(Error('denied'),{stderr:'Forbidden (HTTP 403)'});}}),/denied/);
 assert.throws(()=>publishFork({env:{...env,GITHUB_REF:'refs/heads/other'},bytes:Buffer.from('fixture'),gh:()=>assert.fail()}));
});
