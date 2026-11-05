import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {releaseContext} from './release-context.mjs';
export function publishFork({env,bytes,gh}){
 if(env.PICARD_FORK_RELEASE!=='1')throw Error('fork_required');
 releaseContext(env);
 const repo='repos/mitsdev01/picard-relay',branch='release-feed';
 const missing=e=>String(e.stderr??'').includes('(HTTP 404)');
 try{gh(['api',repo+'/git/ref/heads/'+branch]);}
 catch(e){if(!missing(e))throw e;gh(['api','--method','POST',repo+'/git/refs','--input','-'],{ref:'refs/heads/'+branch,sha:env.GITHUB_SHA});}
 const endpoint=repo+'/contents/releases/stable.json';let sha;
 try{sha=JSON.parse(gh(['api',endpoint+'?ref='+branch])).sha;if(typeof sha!=='string'||!/^[a-f0-9]{40}$/.test(sha))throw Error('publication_blob_invalid');}
 catch(e){if(!missing(e))throw e;}
 gh(['api','--method','PUT',endpoint,'--input','-'],{message:'Publish signed Picard source release',branch,content:bytes.toString('base64'),...(sha?{sha}:{})});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)publishFork({env:process.env,bytes:readFileSync('release-output/stable.json'),gh:(args,body)=>execFileSync('gh',args,{encoding:'utf8',input:body?JSON.stringify(body):undefined})});
