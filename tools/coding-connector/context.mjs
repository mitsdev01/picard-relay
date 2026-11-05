// Selected workspace context only. This module never executes file contents.
import {closeSync,constants,fstatSync,lstatSync,openSync,readSync,realpathSync} from 'node:fs';
import {basename,isAbsolute,relative,resolve} from 'node:path';

const DENY_SEGMENTS=new Set(['.git','.ssh','.gnupg','.aws','.azure','node_modules','credentials','secrets','.picard']);
const DENY_NAMES=new Set(['.env','credentials.json','secrets.json','auth-state.json','id_rsa','id_dsa','id_ecdsa','id_ed25519','known_hosts','cookies.txt']);
const DENY_EXTENSIONS=new Set(['.pem','.key','.p12','.pfx','.kdbx','.ppk']);

export function contextError(code){const error=new Error(code);error.code=code;return error;}

function inside(rootReal,targetReal){
 const rel=relative(rootReal,targetReal);
 return rel!==''&&!rel.startsWith('..')&&!isAbsolute(rel);
}
function deniedName(name){
 const lower=name.toLowerCase();
 const dot=lower.lastIndexOf('.');
 const ext=dot>0?lower.slice(dot):'';
 return lower==='.env'||lower.startsWith('.env.')||DENY_NAMES.has(lower)||DENY_EXTENSIONS.has(ext);
}
function fits(title,requestText,context){
 return Buffer.byteLength(JSON.stringify({request:requestText,context:{title,nextAction:'',latestFinding:context}}))<=12000;
}

export function buildCodingContext({workspaceRoot,journalDir=null,deniedFiles=[],paths=[],note='',title,requestText}={}){
 if(typeof workspaceRoot!=='string'||typeof title!=='string'||typeof requestText!=='string'||typeof note!=='string'||!Array.isArray(paths)||paths.length>8)throw contextError('request_invalid');
 if(!fits(title,requestText,''))throw contextError('request_too_large');
 let rootReal;try{rootReal=realpathSync(workspaceRoot);}catch{throw contextError('workspace_unavailable');}
 let journalReal=null;if(journalDir){try{journalReal=realpathSync(journalDir);}catch{journalReal=null;}}
 const deniedReal=new Set();
 for(const file of deniedFiles){try{deniedReal.add(realpathSync(file));}catch{/* A missing local secret path cannot be selected. */}}
 const parts=[];if(note.trim())parts.push(note.trim());
 const included=[];
 for(const rel of paths){
  if(typeof rel!=='string'||!rel||rel.length>240||rel.includes('\0')||rel.includes(':'))throw contextError('context_excluded');
  const segments=rel.split(/[\\/]+/);
  if(segments.some(part=>!part||part==='.'||part==='..'||DENY_SEGMENTS.has(part.toLowerCase())))throw contextError('context_excluded');
  if(deniedName(basename(rel)))throw contextError('context_excluded');
  const abs=resolve(rootReal,rel);
  let listed,fileReal;
  try{
   // Reject links in every component, including Windows directory junctions.
   let component=rootReal;
   for(const segment of segments){component=resolve(component,segment);if(lstatSync(component).isSymbolicLink())throw contextError('context_excluded');}
   listed=lstatSync(abs);fileReal=realpathSync(abs);
  }catch{throw contextError('context_excluded');}
  if(!listed.isFile()||listed.nlink!==1)throw contextError('context_excluded');
  if(!inside(rootReal,fileReal)||journalReal&&(fileReal===journalReal||inside(journalReal,fileReal))||deniedReal.has(fileReal))throw contextError('context_excluded');
  const resolvedParts=relative(rootReal,fileReal).split(/[\\/]+/);
  if(resolvedParts.some(part=>DENY_SEGMENTS.has(part.toLowerCase()))||deniedName(basename(fileReal)))throw contextError('context_excluded');
  let opened;const buf=Buffer.alloc(32768);let n=0;
  try{
   opened=openSync(fileReal,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
   const info=fstatSync(opened);
   if(!info.isFile()||info.nlink!==1||info.dev!==listed.dev||info.ino!==listed.ino||realpathSync(abs)!==fileReal)throw contextError('context_excluded');
   n=readSync(opened,buf,0,buf.length,0);
   const after=fstatSync(opened);
   if(after.size!==info.size||after.mtimeMs!==info.mtimeMs||after.ctimeMs!==info.ctimeMs||realpathSync(abs)!==fileReal)throw contextError('context_excluded');
  }
  catch(error){if(error?.code==='context_excluded')throw error;throw contextError('context_excluded');}
  finally{if(opened!==undefined)closeSync(opened);}
  const sample=buf.subarray(0,Math.min(n,512)).toString('utf8');
  if(sample.includes('BEGIN PRIVATE KEY')||sample.includes('BEGIN OPENSSH PRIVATE KEY')||sample.includes('BEGIN RSA PRIVATE KEY'))throw contextError('context_excluded');
  let text=buf.subarray(0,n).toString('utf8');
  if(n===buf.length)text+='\n[file read capped]';
  parts.push('File: '+segments.join('/')+'\n'+text);
  included.push(segments.join('/'));
 }
 let context=parts.join('\n\n'),truncated=false,omittedCharacters=0;
 const marker='\n[truncated]';
 while(context.length>4000||!fits(title,requestText,context)){
  if(context.length<=marker.length)throw contextError('request_too_large');
  truncated=true;
  const next=Math.max(0,Math.min(context.length-1,4000-marker.length));
  omittedCharacters+=context.length-next;
  context=context.slice(0,next)+marker;
 }
 if(context.length>4000||!fits(title,requestText,context))throw contextError('request_too_large');
 return {context,truncated,omittedCharacters,included};
}
