import * as fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
export const sha = b => createHash('sha256').update(b).digest('hex');
export class WorkspaceError extends Error { constructor(code) { super(code); this.code=code; } }
export function requireThat(value,code) { if(!value) throw new WorkspaceError(code); }
export const inside=(root,target)=>{const r=path.relative(root,target);return r!==''&&!r.startsWith('..')&&!path.isAbsolute(r);};
export function directory(dir) {
 requireThat(typeof dir==='string'&&path.isAbsolute(dir)&&path.resolve(dir)===dir,'absolute_directory_required');
 let cursor=path.parse(dir).root;
 for(const part of path.relative(cursor,dir).split(path.sep).filter(Boolean)) {
  cursor=path.join(cursor,part);const st=fs.lstatSync(cursor);
  requireThat(st.isDirectory()&&!st.isSymbolicLink(),'directory_link_refused');
 }
 return fs.realpathSync(dir);
}
const forbidden=new Set(['.git','.ssh','.aws','.azure','.gnupg','.codex','.cursor','.agents','node_modules','secrets','credentials','.picard','dist','build','coverage']);
export function relativeFile(rel) {
 requireThat(typeof rel==='string'&&rel.length>0&&rel.length<=240&&!rel.includes('\\')&&!rel.includes(':')&&!rel.includes('\0')&&!path.isAbsolute(rel),'path_refused');
 const parts=rel.split('/');
 requireThat(parts.every(p=>p&&p!=='.'&&p!=='..'&&!/[. ]$/.test(p)&&!forbidden.has(p.toLowerCase())&&!/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(p)),'path_refused');
 const name=parts.at(-1);
 requireThat(!/^\.env(?:\.|$)/i.test(name)&&!/^id_(rsa|dsa|ecdsa|ed25519)/i.test(name)&&!/(?:^|[-_.])(credentials|secrets|cookies|auth-state)(?:[-_.]|$)/i.test(name)&&! /\.(pem|key|p12|pfx|ppk|kdbx)$/i.test(name),'path_refused');
 return rel;
}
export function locate(root,rel) {
 relativeFile(rel);requireThat(directory(root)===root,'workspace_moved');
 let current=root;const parts=rel.split('/');
 for(const part of parts.slice(0,-1)) {current=path.join(current,part);const st=fs.lstatSync(current);requireThat(st.isDirectory()&&!st.isSymbolicLink(),'path_refused');}
 const target=path.join(current,parts.at(-1));requireThat(inside(root,target),'path_refused');return target;
}
export function readSource(root,rel,{missing=false}={}) {
 const target=locate(root,rel);let st;
 try{st=fs.lstatSync(target);}catch(e){if(e.code==='ENOENT'&&missing)return null;throw e;}
 requireThat(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size<=512*1024,'file_refused');
 const fd=fs.openSync(target,fs.constants.O_RDONLY|(fs.constants.O_NOFOLLOW??0));let bytes;
 try {const before=fs.fstatSync(fd);requireThat(before.ino===st.ino&&before.dev===st.dev&&before.nlink===1,'file_changed');bytes=fs.readFileSync(fd);const after=fs.fstatSync(fd);requireThat(before.size===after.size&&before.mtimeMs===after.mtimeMs&&before.ctimeMs===after.ctimeMs&&bytes.length<=512*1024,'file_changed');}
 finally {fs.closeSync(fd);}
 let text;try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{throw new WorkspaceError('text_file_required');}
 requireThat(!text.includes('\0')&&!/-----BEGIN [^-]*PRIVATE KEY-----|\bgsk_[A-Za-z0-9]{20,}|\bghp_[A-Za-z0-9]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}/.test(text),'sensitive_content_refused');
 return {sha256:sha(bytes),base64:bytes.toString('base64'),text,mode:st.mode&0o777};
}
export function loadRegistry(file,{excluded=[]}={}) {
 const st=fs.lstatSync(file);requireThat(st.isFile()&&!st.isSymbolicLink()&&st.nlink===1&&st.size<=65536,'registry_invalid');
 if(process.platform!=='win32')requireThat((st.mode&0o077)===0&&st.uid===process.getuid(),'registry_must_be_private');
 const doc=JSON.parse(fs.readFileSync(file,'utf8'));
 requireThat(doc?.v===1&&Array.isArray(doc.workspaces)&&doc.workspaces.length>0&&doc.workspaces.length<=16&&Object.keys(doc).sort().join(',')==='stateDir,v,workspaces','registry_invalid');
 const stateDir=directory(doc.stateDir),ids=new Set(),roots=[];
 const workspaces=doc.workspaces.map(w=>{
  requireThat(w&&Object.keys(w).sort().join(',')==='allowApply,id,root,testCommands'&&/^[a-z][a-z0-9-]{0,47}$/.test(w.id)&&!ids.has(w.id)&&typeof w.allowApply==='boolean'&&Array.isArray(w.testCommands)&&w.testCommands.length<=8,'registry_invalid');ids.add(w.id);
  const root=directory(w.root);
  requireThat(root!==stateDir&&!inside(root,stateDir)&&!inside(stateDir,root)&&!inside(root,path.resolve(file)),'state_must_be_outside_workspace');
  for(const p of excluded)requireThat(root!==p&&!inside(root,p)&&!inside(p,root),'connector_or_credentials_overlap');
  requireThat(roots.every(p=>root!==p&&!inside(root,p)&&!inside(p,root)),'overlapping_workspaces');roots.push(root);
  const names=new Set();
  for(const c of w.testCommands) {
   requireThat(c&&Object.keys(c).sort().join(',')==='args,executable,id,timeoutMs'&&/^[a-z][a-z0-9-]{0,47}$/.test(c.id)&&!names.has(c.id)&&path.isAbsolute(c.executable)&&Array.isArray(c.args)&&c.args.length<=32&&c.args.every(a=>typeof a==='string'&&a.length<=4096&&!a.includes('\0'))&&Number.isSafeInteger(c.timeoutMs)&&c.timeoutMs>=100&&c.timeoutMs<=300000,'test_command_invalid');names.add(c.id);
   requireThat(!/\.(cmd|bat)$/i.test(c.executable),'use_node_or_powershell_executable');
   const exec=fs.lstatSync(c.executable);requireThat(exec.isFile()&&!exec.isSymbolicLink()&&!inside(root,c.executable),'test_executable_invalid');
  }
  requireThat(!w.allowApply||w.testCommands.length>0,'enrolled_tests_required');
  return {...w,root};
 });
 return {stateDir,workspaces,fingerprint:sha(JSON.stringify({stateDir,workspaces}))};
}
