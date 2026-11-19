import {readFileSync,writeFileSync} from 'node:fs';
const sources=['./captain.mjs','./tricorder.mjs'].map(path=>new URL(path,import.meta.url)),target=new URL('../../experimental/runtime-control/src/admission-ui.mjs',import.meta.url);
const marker='// BEGIN GENERATED CAPTAIN THEME';
const existing=readFileSync(target,'utf8').replaceAll('\r\n','\n');
// Theme sources import each other for tests; the bundle is one module, so imports are dropped.
const compiled=sources.map(source=>readFileSync(source,'utf8').replaceAll('\r\n','\n').replace(/^import .*\n/gm,'').replaceAll('export ','').trimEnd()).join('\n\n');
const expected=existing.split(marker)[0].trimEnd()+'\n\n'+marker+'\n'+compiled+'\n';
if(process.argv.includes('--check')){if(existing!==expected)throw Error('Captain theme bundle is stale: run node tools/console-theme/build.mjs');}
else writeFileSync(target,expected);
