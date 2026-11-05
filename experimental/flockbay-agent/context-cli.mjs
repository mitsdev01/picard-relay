import {readFileSync,writeFileSync} from 'node:fs';
import {collectContext} from './source-context.mjs';
const [root,requestFile,out,...extra]=process.argv.slice(2);
try{if(!root||!requestFile||!out||extra.length)throw Error('Usage: context-cli.mjs PROJECT REQUESTS.json OUTPUT.json');const result=collectContext(root,JSON.parse(readFileSync(requestFile,'utf8')));writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({files:result.length,out,uploaded:false}));}catch(e){console.error(e.message);process.exitCode=1;}
