import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareForkTrust} from './prepare-fork-trust.mjs';
const files=Object.fromEntries(['fetch-release.mjs','run-once.mjs','sigstore-verifier.mjs'].map(n=>[n,readFileSync(new URL('../experimental/updater/'+n,import.meta.url),'utf8')]));
files['policy.json']=readFileSync(new URL('../experimental/updater/policy.example.json',import.meta.url),'utf8');
files['guarded-update.mjs']="if(policy.source!=='https://raw.githubusercontent.com/bmartynowicz/picard-relay/main/releases/stable.json'||policy.signatureMode!=='sigstore'||policy.enabled!==true)throw Error('updater_enrollment_mismatch');";
test('staging changes only exact feed and signing pins',()=>{
 const out=prepareForkTrust(files);
 for(const n of Object.keys(files))assert.equal(out[n].replaceAll('mitsdev01/picard-relay','bmartynowicz/picard-relay').replace('/sign-fork-release.yml@','/sign-release.yml@'),files[n]);
 assert.match(out['sigstore-verifier.mjs'],/sign-fork-release.yml@refs\/heads\/main/);
 assert.deepEqual(JSON.parse(out['policy.json']).allowedFiles,JSON.parse(files['policy.json']).allowedFiles);
});
test('unexpected source, repeat migration and unsigned policy fail closed',()=>{
 assert.throws(()=>prepareForkTrust({...files,extra:'x'}));
 assert.throws(()=>prepareForkTrust({...files,'guarded-update.mjs':'unexpected'}));
 assert.throws(()=>prepareForkTrust(prepareForkTrust(files)));
 assert.throws(()=>prepareForkTrust({...files,'policy.json':files['policy.json'].replace('sigstore','none')}));
});
