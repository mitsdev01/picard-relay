// Writes laptop review bearer token and a hash-only registry row shape for the host operator.
// The raw token is never printed.
import {mkdirSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';

function arg(name){
 const index=process.argv.indexOf(name);
 const value=index>=0?process.argv[index+1]:'';
 if(!value||value.startsWith('--'))throw new Error('argument_required');
 return resolve(value);
}
const clientPath=arg('--client'),codingClientId=process.argv[process.argv.indexOf('--coding-client-id')+1];
if(!codingClientId||codingClientId.startsWith('--'))throw new Error('argument_required');
if(!/^[a-z0-9-]{1,50}$/.test(codingClientId))throw new Error('coding_client_id_invalid');
const originRaw=process.argv[process.argv.indexOf('--origin')+1];
if(!originRaw||originRaw.startsWith('--'))throw new Error('argument_required');
let originUrl;try{originUrl=new URL(originRaw);}catch{throw new Error('origin_invalid');}
if(originUrl.protocol!=='https:'||originUrl.username||originUrl.password||originUrl.pathname!=='/'||originUrl.search||originUrl.hash||originUrl.origin!==originRaw)throw new Error('origin_invalid');
const token=randomBytes(32).toString('base64url');
if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('token_unavailable');
const tokenSha256=createHash('sha256').update(token).digest('hex');
const doc={v:1,origin:originRaw,token,codingClientId};
if(existsSync(clientPath))throw new Error('refusing_to_overwrite');
mkdirSync(dirname(clientPath),{recursive:true});
writeFileSync(clientPath,JSON.stringify(doc,null,2)+'\n',{mode:0o600,flag:'wx'});
process.stdout.write(JSON.stringify({clientPath,clientId:'work-laptop-review',tokenSha256,codingClientId,origin:originRaw,hostRegistryRow:{id:'work-laptop-review',tokenSha256,scopes:['workspace-review'],codingClientId,revoked:false},tokenPrinted:false})+'\n');
