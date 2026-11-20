// Selected workspace context only. This module never executes file contents.
import {closeSync,constants,fstatSync,lstatSync,openSync,readSync,realpathSync} from 'node:fs';
import {basename,isAbsolute,relative,resolve} from 'node:path';
import {createHash} from 'node:crypto';

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
 const selections=[];
 for(const selection of paths){
  const ranged=typeof selection!=='string';
  if(ranged&&(!selection||Array.isArray(selection)||Object.keys(selection).sort().join(',')!=='endLine,path,startLine'||!Number.isSafeInteger(selection.startLine)||!Number.isSafeInteger(selection.endLine)||selection.startLine<1||selection.endLine<selection.startLine))throw contextError('line_range_invalid');
  const rel=ranged?selection.path:selection;
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
  let opened,buf;let n=0;
  try{
   opened=openSync(fileReal,constants.O_RDONLY|(constants.O_NOFOLLOW??0));
   const info=fstatSync(opened);
   if(!info.isFile()||info.nlink!==1||info.dev!==listed.dev||info.ino!==listed.ino||realpathSync(abs)!==fileReal)throw contextError('context_excluded');
   if(info.size>2*1024*1024)throw contextError('context_file_too_large');
   buf=Buffer.alloc(info.size);
   while(n<buf.length){const count=readSync(opened,buf,n,buf.length-n,n);if(!count)throw contextError('context_excluded');n+=count;}
   const after=fstatSync(opened);
   if(after.size!==info.size||after.mtimeMs!==info.mtimeMs||after.ctimeMs!==info.ctimeMs||realpathSync(abs)!==fileReal)throw contextError('context_excluded');
  }
  catch(error){if(['context_excluded','context_file_too_large'].includes(error?.code))throw error;throw contextError('context_excluded');}
  finally{if(opened!==undefined)closeSync(opened);}
  let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(buf);}catch{throw contextError('context_excluded');}
  if(text.includes('\0'))throw contextError('context_excluded');
  if(/(?:^|\r?\n)-----BEGIN (?:(?:OPENSSH|RSA|EC|DSA|ENCRYPTED) )?PRIVATE KEY-----[ \t]*(?:\r?\n|$)/.test(text.replace(/^\uFEFF/,'')))throw contextError('context_excluded');
  const lines=text.split('\n');
  if(ranged&&selection.endLine>lines.length)throw contextError('line_range_invalid');
  const startLine=ranged?selection.startLine:1,endLine=ranged?selection.endLine:lines.length;
  if(ranged)text=lines.slice(startLine-1,endLine).join('\n');
  const sourceSha256=createHash('sha256').update(buf).digest('hex');
  const part='File: '+segments.join('/')+(ranged?` (lines ${startLine}-${endLine}, sha256 ${sourceSha256})`:'')+'\n'+text;
  const start=parts.length?parts.join('\n\n').length+2:0;
  selections.push({path:segments.join('/'),startLine,endLine,sourceSha256,selectedCharacters:text.length,start,end:start+part.length});
  parts.push(part);
 }
 const original=parts.join('\n\n');let context=original,truncated=false,omittedCharacters=0;
 const marker='\n[truncated]';
 if(context.length>4000||!fits(title,requestText,context)){
  truncated=true;let low=0,high=Math.min(original.length,4000-marker.length);
  if(!fits(title,requestText,marker))throw contextError('request_too_large');
  while(low<high){const mid=Math.ceil((low+high)/2);if(fits(title,requestText,original.slice(0,mid)+marker))low=mid;else high=mid-1;}
  if(low>0&&/[\uD800-\uDBFF]/.test(original[low-1]))low--;
  omittedCharacters=original.length-low;context=original.slice(0,low)+marker;
 }
 if(context.length>4000||!fits(title,requestText,context))throw contextError('request_too_large');
 const retained=original.length-omittedCharacters;
 const coverage=selections.map(({start,end,...selection})=>({...selection,status:end<=retained?'complete':start>=retained?'omitted':'partial'}));
 const included=coverage.filter(item=>item.status==='complete').map(item=>item.path);
 return {context,truncated,omittedCharacters,included,coverage,contextCharacters:context.length,requestBytes:Buffer.byteLength(JSON.stringify({request:requestText,context:{title,nextAction:'',latestFinding:context}}))};
}
