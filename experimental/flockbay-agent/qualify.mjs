// Run in an isolated source checkout, never against a live database.
import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {codeIdentity} from './release-gate.mjs';
const root=resolve(fileURLToPath(new URL('../../',import.meta.url))),out=resolve(process.argv[2]||'');
if(process.platform!=='linux'||process.versions.node.split('.')[0]!=='24'||!process.argv[2])throw Error('linux_node24_and_new_output_directory_required');
// Fixture-created directories must not inherit a host login's group-write mask.
process.umask(0o022);
mkdirSync(out,{mode:0o700});
const envelope=JSON.parse(readFileSync(join(root,'releases/stable.json'))),manifest=Buffer.from(envelope.manifest,'base64');
const published=JSON.parse(manifest),allowed=JSON.parse(readFileSync(join(root,'experimental/updater/policy.example.json'))).allowedFiles;
if(published.files.length!==allowed.length||new Set(published.files.map(f=>f.path)).size!==allowed.length)throw Error('published_file_set_mismatch');
for(const f of published.files){if(!allowed.includes(f.path))throw Error('published_path_refused');const b=readFileSync(join(root,'experimental/runtime-control',f.path));if(b.length!==f.bytes||createHash('sha256').update(b).digest('hex')!==f.sha256)throw Error('tested_source_differs_from_publication');}
const beforeCode=codeIdentity(join(root,'experimental/flockbay-agent')).sha256;
const specs=[
 ['updater','npm',['--prefix','experimental/updater','test']],
 ['runtime','npm',['--prefix','experimental/runtime-control','test']],
 ['socket','npm',['--prefix','experimental/runtime-control','run','test:socket']],
 ['docs','npm',['run','docs:check']],
 ['companion','npm',['--prefix','experimental/flockbay-agent','test']],
 ['companion-jitless','npm',['--prefix','experimental/flockbay-agent','run','test:jitless']],
 ['recovery','python3',['-m','unittest','discover','-s','experimental/flockbay-agent/private-recovery','-p','test_*.py']],
 ['web-auth',process.execPath,['--test','experimental/runtime-control/test/console.test.mjs','experimental/runtime-control/test/owner-updates.test.mjs']]
];
const checks=[];
for(const [id,command,args] of specs){
 const result=spawnSync(command,args,{cwd:root,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024,shell:false});
 const log=(result.stdout||'')+(result.stderr||'')+(result.error?'\nrunner_error:'+result.error.code:'');
 writeFileSync(join(out,id+'.log'),log,{flag:'wx',mode:0o600});
 const check={id,passed:result.status===0&&!result.error,exitCode:result.status??1,evidenceSha256:createHash('sha256').update(log).digest('hex')};checks.push(check);console.log(JSON.stringify(check));
}
if(codeIdentity(join(root,'experimental/flockbay-agent')).sha256!==beforeCode)throw Error('source_changed_during_qualification');
const report={v:1,platform:'linux',nodeMajor:24,releaseHash:createHash('sha256').update(manifest).digest('hex'),sourceCommit:JSON.parse(manifest).sourceCommit,companionHash:codeIdentity(join(root,'experimental/flockbay-agent')).sha256,checks,scope:'Synthetic Linux source qualification. Host/browser acceptance and operator enrollment are separate.'};
writeFileSync(join(out,'report.json'),JSON.stringify(report,null,2),{flag:'wx',mode:0o600});if(checks.some(c=>!c.passed))process.exitCode=1;
