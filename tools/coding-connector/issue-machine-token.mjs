// Writes a laptop token outside the repository and a hash-only registry.
// The raw token is never printed.
import {mkdirSync,writeFileSync,existsSync,realpathSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';

function arg(name){
 const index=process.argv.indexOf(name);
 const value=index>=0?process.argv[index+1]:'';
 if(!value||value.startsWith('--'))throw new Error('argument_required');
 return resolve(value);
}
const originArg=process.argv[process.argv.indexOf('--origin')+1];
let parsed;try{parsed=new URL(originArg);}catch{throw new Error('origin_invalid');}
if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.pathname!=='/'||parsed.search||parsed.hash)throw new Error('origin_invalid');
const origin=parsed.origin;
const clientPath=arg('--client'),registryPath=arg('--registry'),workspaceRoot=arg('--workspace'),journalDir=arg('--journal');
if(existsSync(clientPath)||existsSync(registryPath))throw new Error('refusing_to_overwrite');
const token=randomBytes(32).toString('base64url');
if(!/^[A-Za-z0-9_-]{43}$/.test(token))throw new Error('token_unavailable');
const tokenSha256=createHash('sha256').update(token).digest('hex');
const client={v:1,origin,token,workspaceRoot:realpathSync(workspaceRoot),journalDir};
const registry={v:1,clients:[{id:'work-laptop-coding',tokenSha256,scopes:['workspace-coding'],revoked:false}]};
mkdirSync(dirname(clientPath),{recursive:true});mkdirSync(dirname(registryPath),{recursive:true});mkdirSync(journalDir,{recursive:true});
writeFileSync(clientPath,JSON.stringify(client,null,2)+'\n',{mode:0o600,flag:'wx'});
writeFileSync(registryPath,JSON.stringify(registry,null,2)+'\n',{mode:0o600,flag:'wx'});
process.stdout.write(JSON.stringify({clientPath,registryPath,clientId:'work-laptop-coding',tokenSha256,tokenPrinted:false})+'\n');
