import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareForkTrust} from './prepare-fork-trust.mjs';
const files=Object.fromEntries(['fetch-release.mjs','run-once.mjs','sigstore-verifier.mjs','pull.mjs'].map(n=>[n,readFileSync(new URL('../experimental/updater/'+n,import.meta.url),'utf8')]));
files['policy.json']=readFileSync(new URL('../experimental/updater/policy.example.json',import.meta.url),'utf8');
files['guarded-update.mjs']="if(policy.source!=='https://raw.githubusercontent.com/bmartynowicz/picard-relay/main/releases/stable.json'||policy.signatureMode!=='sigstore'||policy.enabled!==true)throw Error('updater_enrollment_mismatch');";
test('staging changes only exact feed and signing pins',()=>{
 const out=prepareForkTrust(files);
 for(const n of Object.keys(files).filter(n=>n!=='pull.mjs'))assert.equal(out[n].replaceAll('mitsdev01/picard-relay/release-feed/releases','bmartynowicz/picard-relay/main/releases').replaceAll('mitsdev01/picard-relay','bmartynowicz/picard-relay').replace('/sign-fork-release.yml@','/sign-release.yml@'),files[n]);
 assert.match(out['sigstore-verifier.mjs'],/sign-fork-release.yml@refs\/heads\/main/);
 assert.deepEqual(JSON.parse(out['policy.json']).allowedFiles,JSON.parse(files['policy.json']).allowedFiles);
});
test('prepared downloader permits only the exact fork feed exception',async()=>{
 const source=prepareForkTrust(files)['pull.mjs'].split('// Native HTTPS')[0].replace(/^import .*;\r?\n/gm,'');
 const {releaseUrl}=await import('data:text/javascript,'+encodeURIComponent(source));
 assert.equal(releaseUrl('https://raw.githubusercontent.com/mitsdev01/picard-relay/release-feed/releases/stable.json').hostname,'raw.githubusercontent.com');
 for(const url of ['https://raw.githubusercontent.com/other/picard-relay/release-feed/releases/stable.json','https://evil.example/mitsdev01/picard-relay/release-feed/releases/stable.json','https://raw.githubusercontent.com/mitsdev01/picard-relay/release-feed/releases/stable.json?x=1'])assert.throws(()=>releaseUrl(url));
});
test('prepared verifier pins fork main workflow, issuer and exact source commit',async()=>{
 const {verifierArgs}=await import('data:text/javascript,'+encodeURIComponent(prepareForkTrust(files)['sigstore-verifier.mjs']));
 const args=verifierArgs('/tmp/manifest','/tmp/proof','c'.repeat(40));
 for(const expected of ['https://github.com/mitsdev01/picard-relay/.github/workflows/sign-fork-release.yml@refs/heads/main','https://token.actions.githubusercontent.com','mitsdev01/picard-relay','refs/heads/main','c'.repeat(40),'--trusted-root'])assert.ok(args.includes(expected));
 assert.equal(args.some(a=>a.includes('bmartynowicz')||a.includes('insecure')||a.includes('regexp')),false);
 assert.throws(()=>verifierArgs('/tmp/manifest','/tmp/proof','bad'));
});
test('unexpected source, repeat migration and unsigned policy fail closed',()=>{
 assert.throws(()=>prepareForkTrust({...files,extra:'x'}));
 assert.throws(()=>prepareForkTrust({...files,'guarded-update.mjs':'unexpected'}));
 assert.throws(()=>prepareForkTrust(prepareForkTrust(files)));
 assert.throws(()=>prepareForkTrust({...files,'policy.json':files['policy.json'].replace('sigstore','none')}));
});
