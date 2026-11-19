import {readFileSync,writeFileSync} from 'node:fs';
import {applyPasswordExtension} from './extension.mjs';
const target=new URL('../../experimental/runtime-control/src/oracle-service.mjs',import.meta.url);
const source=readFileSync(target,'utf8').replaceAll('\r\n','\n');
const output=applyPasswordExtension(source);
if(process.argv.includes('--check')){if(output!==source)throw Error('Owner password extension missing: run node tools/owner-password/build.mjs');}
else writeFileSync(target,output);
