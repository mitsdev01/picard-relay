import {readFileSync,writeFileSync} from 'node:fs';
const source=new URL('./captain.mjs',import.meta.url),target=new URL('../../experimental/runtime-control/src/admission-ui.mjs',import.meta.url);
const marker='// BEGIN GENERATED CAPTAIN THEME';
const existing=readFileSync(target,'utf8').replaceAll('\r\n','\n');
const compiled=readFileSync(source,'utf8').replaceAll('\r\n','\n').replaceAll('export ','');
const expected=existing.split(marker)[0].trimEnd()+'\n\n'+marker+'\n'+compiled.trimEnd()+'\n';
if(process.argv.includes('--check')){if(existing!==expected)throw Error('Captain theme bundle is stale: run node tools/console-theme/build.mjs');}
else writeFileSync(target,expected);
