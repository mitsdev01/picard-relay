// Local operator policy, not model output and not a replacement for Sigstore.
// The privileged host wrapper must read this policy from root-owned storage.
import {createHash} from 'node:crypto';
import {lstatSync,readdirSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const sha=b=>createHash('sha256').update(b).digest('hex');
const hash=h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h);
export const requiredChecks=['updater','runtime','socket','docs','companion','companion-jitless','recovery','web-auth'];
export function codeIdentity(root){
 const files=[];
 function walk(dir,prefix=''){
  const s=lstatSync(dir);if(!s.isDirectory()||s.isSymbolicLink())throw Error('code_directory_unsafe');
  for(const name of readdirSync(dir).sort()){
   const path=join(dir,name),relative=prefix+name,st=lstatSync(path);
   if(st.isSymbolicLink())throw Error('code_link_refused');
   if(st.isDirectory()){if(name==='test'||name==='__pycache__')continue;walk(path,relative+'/');}
   else if(st.isFile()&&!name.startsWith('test_')&&/\.(mjs|js|html|css|ps1|py|sh)$/i.test(name))files.push({path:relative,sha256:sha(readFileSync(path))});
  }
 }
 walk(root);if(!files.length)throw Error('empty_code_identity');return {sha256:sha(JSON.stringify(files)),files};
}
export function qualifyRelease(policy,observed,now=Date.now()){
 if(policy?.v!==1||policy.enabled!==true||!Array.isArray(policy.releases))throw Error('release_gate_not_enrolled');
 if(!hash(observed.releaseHash)||!hash(observed.companionHash)||!hash(observed.workerHash)||typeof observed.project!=='string'||!observed.project)throw Error('release_identity_invalid');
 const matches=policy.releases.filter(r=>r.releaseHash===observed.releaseHash&&r.companionHash===observed.companionHash&&r.workerHash===observed.workerHash&&r.project===observed.project);
 if(matches.length!==1)throw Error('release_not_qualified');const r=matches[0];
 if(r.protocolVersion!==1||r.stateSchema!==1||!Number.isSafeInteger(r.expiresAt)||r.expiresAt<=now||r.expiresAt>now+31*86400000||!Number.isSafeInteger(r.qualifiedAt)||r.qualifiedAt>now||r.qualifiedAt<0||r.qualifiedAt>=r.expiresAt)throw Error('qualification_expired_or_invalid');
 if(!Array.isArray(r.checks)||r.checks.length!==requiredChecks.length||!requiredChecks.every(id=>r.checks.filter(c=>c.id===id&&c.passed===true&&c.exitCode===0&&hash(c.evidenceSha256)).length===1))throw Error('qualification_checks_missing');
 if(r.platform!=='linux'||r.nodeMajor!==24)throw Error('qualification_platform_invalid');
 return r;
}
export async function coordinatedUpdate(d){
 // The same function is used for manual/button/timer entrypoints. Every failure
 // after acquire retains the durable barrier for explicit operator recovery.
 const before=await d.observe();qualifyRelease(await d.policy(),before,d.now());
 if(before.connected!==true||before.protocolVersion!==1||before.stateSchema!==1)throw Error('companion_unready');
 const lock=await d.acquire();
 const locked=await d.observe();
 if(locked.maintenanceId!==lock.id||locked.companionHash!==before.companionHash||locked.workerHash!==before.workerHash||locked.project!==before.project||locked.releaseHash!==before.releaseHash)throw Error('update_identity_changed');
 await d.install();
 const after=await d.verify();
 if(after.installedReleaseHash!==before.releaseHash||after.companionHash!==before.companionHash||after.workerHash!==before.workerHash||after.project!==before.project||after.maintenanceId!==lock.id||after.historyHash!==before.historyHash||after.webAuthPassed!==true||after.coreReady!==true||after.connected!==true)throw Error('post_update_verification_failed');
 await d.release(lock.id);
 return {state:'verified',releaseHash:before.releaseHash,noProviderCalls:true};
}
