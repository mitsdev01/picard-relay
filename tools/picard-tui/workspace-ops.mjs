import path from 'node:path';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createWorkspaceTasks} from '../coding-connector/workspace-tasks.mjs';
import {loadRegistry} from '../coding-connector/trusted-files.mjs';
import {loadCodingConfig} from '../coding-connector/config.mjs';
import {createJournal} from '../coding-connector/journal.mjs';
import {createCodingClient,createHttpsTransport} from '../coding-connector/client.mjs';

const scriptDir=path.dirname(fileURLToPath(import.meta.url));
const connectorRoot=path.resolve(scriptDir,'..');

export function createTuiWorkspaceAgent(codingConfigPath,registryFile){
 const config=loadCodingConfig(codingConfigPath);
 const excluded=[connectorRoot,path.resolve(config.configFile),path.resolve(registryFile)];
 return createWorkspaceTasks({
  registry:()=>loadRegistry(registryFile,{excluded}),
  makeClient:w=>{
   const r=loadRegistry(registryFile,{excluded});
   const journalDir=path.join(r.stateDir,w.id,'relay-journal');
   return createCodingClient({origin:config.origin,token:config.token,workspaceRoot:w.root,journalDir:r.stateDir,deniedFiles:[config.configFile,registryFile],journal:createJournal(journalDir),transport:createHttpsTransport(config.origin)});
  }
 });
}

const REF=/^[a-f0-9]{64}$/;
function firstLedgerRef(doc){
 if(!doc||typeof doc!=='object')return null;
 const candidates=[doc.eventId,doc.ref,doc.relayRef,doc.payload?.eventId];
 for(const c of candidates){if(typeof c==='string'&&REF.test(c))return c;}
 return null;
}

/** Ledger ref (64-char hex event id) from the connector journal for this task; used for GET/POST /workspace/requests|reviews/<ref>. */
export function readRelayEventIdFromJournal(registryFile,codingConfigPath,workspaceId,taskId){
 const config=loadCodingConfig(codingConfigPath);
 const r=loadRegistry(registryFile,{excluded:[connectorRoot,path.resolve(config.configFile),path.resolve(registryFile)]});
 const journalDir=path.join(r.stateDir,workspaceId,'relay-journal');
 const journalPath=path.join(journalDir,taskId+'.json');
 if(!existsSync(journalPath))return null;
 let doc;try{doc=JSON.parse(readFileSync(journalPath,'utf8'));}catch{return null;}
 return firstLedgerRef(doc);
}
