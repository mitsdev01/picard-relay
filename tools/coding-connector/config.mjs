import {readFileSync,realpathSync,statSync} from 'node:fs';
import {isAbsolute,resolve} from 'node:path';

const TOKEN=/^[A-Za-z0-9_-]{43}$/;
function fail(code){const error=new Error(code);error.code=code;return error;}
function exact(value,keys){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===keys.join(',');}

export function loadCodingConfig(file){
 if(typeof file!=='string'||!file)throw fail('configuration_unavailable');
 let text,doc;try{text=readFileSync(file,'utf8');}catch{throw fail('configuration_unavailable');}
 if(Buffer.byteLength(text)>8192)throw fail('configuration_unavailable');
 try{doc=JSON.parse(text);}catch{throw fail('configuration_unavailable');}
 if(!exact(doc,['journalDir','origin','token','v','workspaceRoot'])||doc.v!==1||!TOKEN.test(doc.token)||/PLACEHOLDER|REPLACE_ME|example/i.test(doc.token))throw fail('configuration_unavailable');
 let origin;try{origin=new URL(doc.origin);}catch{throw fail('configuration_unavailable');}
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||origin.origin!==doc.origin)throw fail('configuration_unavailable');
 for(const dir of [doc.workspaceRoot,doc.journalDir]){if(typeof dir!=='string'||!isAbsolute(dir)||resolve(dir)!==dir)throw fail('configuration_unavailable');}
 try{if(!statSync(realpathSync(doc.workspaceRoot)).isDirectory())throw fail('configuration_unavailable');}catch(error){if(error?.code==='configuration_unavailable')throw error;throw fail('configuration_unavailable');}
 return {v:1,origin:doc.origin,token:doc.token,workspaceRoot:doc.workspaceRoot,journalDir:doc.journalDir,configFile:file};
}
