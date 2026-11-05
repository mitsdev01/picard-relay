import {test} from 'node:test';
import assert from 'node:assert/strict';
import {releaseContext} from './release-context.mjs';
import {mkdtempSync,mkdirSync,copyFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const base={GITHUB_REPOSITORY:'bmartynowicz/picard-relay',GITHUB_REF:'refs/heads/main',GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_NUMBER:'31',GITHUB_RUN_ATTEMPT:'1'};
test('existing upstream sequence is unchanged',()=>assert.deepEqual(releaseContext(base),{sequence:31001,version:'1.0.31'}));
test('fork requires explicit publisher selection and has a distinct sequence domain',()=>{
 const fork={...base,GITHUB_REPOSITORY:'mitsdev01/picard-relay',PICARD_FORK_RELEASE:'1'};
 assert.deepEqual(releaseContext(fork),{sequence:1000031001,version:'2.0.31'});
 assert.equal(releaseContext({...fork,GITHUB_RUN_ATTEMPT:'2'}).sequence,1000031002);
 for(const change of [{PICARD_FORK_RELEASE:''},{GITHUB_REPOSITORY:'someone/picard-relay'},{GITHUB_REF:'refs/heads/test'},{GITHUB_SHA:'bad'},{GITHUB_RUN_NUMBER:'0'},{GITHUB_RUN_ATTEMPT:'1000'},{GITHUB_RUN_NUMBER:String(Number.MAX_SAFE_INTEGER)}])assert.throws(()=>releaseContext({...fork,...change}));
 assert.throws(()=>releaseContext({...base,PICARD_FORK_RELEASE:'1'}));
});
test('fork builder emits exactly the allowlisted source with bound commit and hashes',()=>{
 const dir=mkdtempSync(join(tmpdir(),'picard-fork-build-'));
 try{
  const policy=JSON.parse(readFileSync(new URL('../experimental/updater/policy.example.json',import.meta.url)));
  for(const file of ['scripts/build-release.mjs','scripts/release-context.mjs','experimental/updater/policy.example.json',...policy.allowedFiles.map(p=>'experimental/runtime-control/'+p)]){
   mkdirSync(dirname(join(dir,file)),{recursive:true});copyFileSync(new URL('../'+file,import.meta.url),join(dir,file));
  }
  const result=spawnSync(process.execPath,['scripts/build-release.mjs'],{cwd:dir,encoding:'utf8',env:{...process.env,...base,GITHUB_REPOSITORY:'mitsdev01/picard-relay',PICARD_FORK_RELEASE:'1'}});
  assert.equal(result.status,0,result.stderr);
  const manifest=JSON.parse(readFileSync(join(dir,'release-output/manifest.json'))),bundle=readFileSync(join(dir,'release-output/bundle.json'));
  assert.equal(manifest.sourceCommit,base.GITHUB_SHA);assert.equal(manifest.sequence,1000031001);
  assert.deepEqual(manifest.files.map(f=>f.path),policy.allowedFiles);
  assert.equal(manifest.bundleSha256,createHash('sha256').update(bundle).digest('hex'));
  for(const file of JSON.parse(bundle).files){const bytes=Buffer.from(file.base64,'base64'),spec=manifest.files.find(f=>f.path===file.path);assert.equal(bytes.length,spec.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),spec.sha256);}
 }finally{rmSync(dir,{recursive:true,force:true});}
});
