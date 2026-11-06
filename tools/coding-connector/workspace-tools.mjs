import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadRegistry,WorkspaceError} from './trusted-files.mjs';
import {createWorkspaceTasks} from './workspace-tasks.mjs';
import {createCodingClient,createHttpsTransport,CodingClientError} from './client.mjs';
import {createJournal} from './journal.mjs';
const id={type:'string',pattern:'^[a-z][a-z0-9-]{0,47}$'},task={type:'string',format:'uuid'};
const schema=(properties,required)=>({type:'object',additionalProperties:false,properties,required});
const bound=schema({workspaceId:id,taskId:task},['workspaceId','taskId']);
export const WORKSPACE_TOOLS=[
 {name:'picard_workspaces',description:'List locally enrolled trusted workspaces and test names. Enrollment is an owner-edited private file, never a model-selected path. No network or execution.',inputSchema:schema({},[])},
 {name:'picard_workspace_discover',description:'Search source paths and matching line numbers in an enrolled workspace. Bounded discovery is not complete dependency analysis. Follow callers/imports/tests and select exact excerpts before preparing a task.',inputSchema:schema({workspaceId:id,query:{type:'string',minLength:2,maxLength:120}},['workspaceId','query'])},
 {name:'picard_workspace_prepare',description:'Back up exact selected file versions and prepare one inert relay draft with actual excerpts. No provider call or edits. Files outside scope, links, secrets and oversized context are rejected, never silently truncated. Reuse taskId alone with workspaceId after a preparation error. Only explicitly writable files may change; creation must be declared.',inputSchema:schema({workspaceId:id,taskId:task,title:{type:'string',maxLength:200},requestText:{type:'string',maxLength:2800},files:{type:'array',minItems:1,maxItems:8,items:schema({path:{type:'string'},writable:{type:'boolean'},create:{type:'boolean'},startLine:{type:'integer',minimum:1},endLine:{type:'integer',minimum:1}},['path','writable'])}},['workspaceId'])},
 {name:'picard_workspace_submit',description:'Approve and submit the prepared task once, only within the user-authorized task. May cause one Groq call. Requires unchanged file snapshots. No automatic resubmission, renewal or repair. After uncertainty, collect the same task.',inputSchema:bound},
 {name:'picard_workspace_status',description:'Read the durable local task state, file hashes and test outcomes. No provider call and no source changes.',inputSchema:bound},
 {name:'picard_workspace_collect',description:'Read the saved relay result and stage validated exact-anchor edits. Reject invented files, mismatched hashes, edits outside supplied excerpts and malformed output. Returns the proposed edits for inspection. Does not apply or execute them.',inputSchema:bound},
 {name:'picard_workspace_apply',description:'For the authorized task in an apply-enabled workspace: run owner-enrolled baseline tests, apply only validated staged edits, run the same tests, and restore unchanged candidate files if checks fail. Commands run under the local user account, not a sandbox. Concurrent edits are preserved as recovery conflicts. No provider call or automatic retry.',inputSchema:bound},
 {name:'picard_workspace_recover',description:'Cancel an unapplied task or recover a failed/interrupted file transaction from verified backups. Never reruns tests or provider requests. Refuses a running operation or an interrupted test requiring process review; preserves files whose contents changed after Picard edits.',inputSchema:bound},
 {name:'picard_workspace_handoff',description:'For one authorized task in the open Cursor window: verify sessionRoot matches the enrolled workspace root, prepare and submit once, then finish collect and apply locally without blocking this call. Requires allowApply and either explicit paths or one discover query that yields 1-8 unambiguous files. Poll picard_workspace_status; no second submit.',inputSchema:schema({workspaceId:id,sessionRoot:{type:'string',minLength:1},title:{type:'string',maxLength:200},requestText:{type:'string',maxLength:2800},paths:{type:'array',minItems:1,maxItems:8,items:{type:'string',minLength:1,maxLength:240}},query:{type:'string',minLength:2,maxLength:120}},['workspaceId','sessionRoot','title','requestText'])}
];
const methods={picard_workspaces:'list',picard_workspace_discover:'discover',picard_workspace_prepare:'prepare',picard_workspace_submit:'submit',picard_workspace_status:'status',picard_workspace_collect:'collect',picard_workspace_apply:'apply',picard_workspace_recover:'recover',picard_workspace_handoff:'handoff'};
export function createWorkspaceToolHandler(config,registryFile){
 const connectorRoot=path.resolve(fileURLToPath(new URL('../../',import.meta.url)));
 const registry=()=>loadRegistry(registryFile,{excluded:[connectorRoot,path.resolve(config.configFile),path.resolve(config.journalDir)]});
 registry(); // Config errors disable the extension, never fall back to another root.
 const agent=createWorkspaceTasks({registry,makeClient:w=>{
  const r=registry(),journalDir=path.join(r.stateDir,w.id,'relay-journal');
  return createCodingClient({origin:config.origin,token:config.token,workspaceRoot:w.root,journalDir:r.stateDir,deniedFiles:[config.configFile,registryFile],journal:createJournal(journalDir),transport:createHttpsTransport(config.origin)});
 }});
 return {
  tools:()=>WORKSPACE_TOOLS,
  async call(name,args){
   const spec=WORKSPACE_TOOLS.find(t=>t.name===name);
   const result=(body,isError=false)=>({content:[{type:'text',text:JSON.stringify(body)}],isError});
   if(!spec||!args||Array.isArray(args)||typeof args!=='object'||Object.keys(args).some(k=>!Object.hasOwn(spec.inputSchema.properties,k))||spec.inputSchema.required.some(k=>!Object.hasOwn(args,k)))return result({error:'request_invalid'},true);
   try{return result(await agent[methods[name]](args));}
   catch(e){return result({error:e instanceof WorkspaceError||e instanceof CodingClientError?e.code:'workspace_operation_failed',...(e.taskId?{taskId:e.taskId,requestId:e.taskId}:{}),providerRetried:false},true);}
  }
 };
}
