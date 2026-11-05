import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,relative,isAbsolute,sep} from 'node:path';
import {hashText} from './patch-workflow.mjs';
// Explicit source files only. Never recursively enumerate a project or follow links.
export function collectContext(root,requests){
 const base=realpathSync(root);let bytes=0;const seen=new Set();
 if(!Array.isArray(requests)||!requests.length||requests.length>12)throw Error('invalid_source_requests');
 return requests.map(r=>{
  if(!r||Object.keys(r).some(k=>!['path','start','end'].includes(k))||typeof r.path!=='string'||!/^res:\/\/(?:(?:scripts|tests)\/[A-Za-z0-9_/-]+\.gd|AGENTS\.md|GAME-BRIEF\.md)$/.test(r.path)||r.path.includes('..')||seen.has(r.path.toLowerCase()))throw Error('source_scope_refused');
  seen.add(r.path.toLowerCase());const parts=r.path.slice(6).split('/');let target=base;
  for(const part of parts){if(!part)throw Error('source_scope_refused');target=resolve(target,part);if(lstatSync(target).isSymbolicLink())throw Error('source_link_refused');}
  const rel=relative(base,realpathSync(target));if(isAbsolute(rel)||rel==='..'||rel.startsWith('..'+sep)||!lstatSync(target).isFile()||lstatSync(target).size>256000)throw Error('source_scope_refused');
  const content=readFileSync(target,'utf8'),lines=content.split(/\r?\n/),start=r.start??1,end=r.end??lines.length;
  if(!Number.isInteger(start)||!Number.isInteger(end)||start<1||end<start||end>lines.length)throw Error('invalid_source_range');
  const text=lines.slice(start-1,end).join('\n');bytes+=Buffer.byteLength(text);if(bytes>48000)throw Error('source_budget_exceeded');
  return {path:r.path,sourceSha256:hashText(content),start,end,totalLines:lines.length,complete:start===1&&end===lines.length,text};
 });
}
