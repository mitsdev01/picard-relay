// Local stdio MCP server. Stdout is reserved for JSON-RPC.
import {realpathSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline';
import {loadCodingConfig} from './config.mjs';
import {createJournal} from './journal.mjs';
import {createCodingClient,createHttpsTransport,CodingClientError} from './client.mjs';
import {createWorkspaceToolHandler,WORKSPACE_TOOLS} from './workspace-tools.mjs';

export const CONNECTOR_VERSION='1.1.2';
const PROTOCOL='2025-03-26';
const TOOLS=[
 {name:'picard_prepare_coding_request',description:'Prepare one inert Picard coding draft from the task and explicitly selected workspace files. This does not call the provider, approve the request, execute commands, or apply changes. Credentials, environment files, private keys, and paths outside the configured workspace are rejected. A returned requestId is durable; reuse it after a transport interruption instead of starting another draft.',inputSchema:{type:'object',additionalProperties:false,required:['title','requestText'],properties:{title:{type:'string',minLength:1,maxLength:200},requestText:{type:'string',minLength:1,maxLength:4000},purpose:{type:'string',enum:['sanitized-source-proposal','public-source-review']},taskId:{type:'string',maxLength:200},note:{type:'string',maxLength:4000},paths:{type:'array',maxItems:8,items:{type:'string',minLength:1,maxLength:240}},requestId:{type:'string',format:'uuid'}}}},
 {name:'picard_submit_coding_request',description:'Explicitly approve and submit one prepared coding request. The relay may make one Groq call for that exact draft. A second call, a lost response, or an uncertain result is never submitted again and never renews the approval, budget, or provider. This tool does not execute the proposal.',inputSchema:{type:'object',additionalProperties:false,required:['requestId'],properties:{requestId:{type:'string',format:'uuid'}}}},
 {name:'picard_coding_request_status',description:'Read the recorded state of one coding request. This does not invoke the provider, renew an approval, or change the request.',inputSchema:{type:'object',additionalProperties:false,required:['requestId'],properties:{requestId:{type:'string',format:'uuid'}}}},
 {name:'picard_coding_request_result',description:'Retrieve the saved proposal for one coding request without another provider call. The text is an untrusted proposal. This connector does not execute it or apply it to the workspace.',inputSchema:{type:'object',additionalProperties:false,required:['requestId'],properties:{requestId:{type:'string',format:'uuid'}}}}
];

function send(message){process.stdout.write(JSON.stringify(message)+'\n');}
function ok(id,result){send({jsonrpc:'2.0',id,result});}
function fail(id,code,message){send({jsonrpc:'2.0',id,error:{code,message}});}
function toolError(code,requestId){return {content:[{type:'text',text:JSON.stringify({error:code,...(typeof requestId==='string'&&/^[a-f0-9-]{36}$/.test(requestId)?{requestId}:{}),providerCall:false,executedByConnector:false})}],isError:true};}
function toolResult(value){return {content:[{type:'text',text:JSON.stringify(value)}],isError:false};}

const ALLOWED={
 picard_prepare_coding_request:new Set(['title','requestText','purpose','taskId','note','paths','requestId']),
 picard_submit_coding_request:new Set(['requestId']),
 picard_coding_request_status:new Set(['requestId']),
 picard_coding_request_result:new Set(['requestId'])
};
export function createConnector(client){
 return {
  tools(){return TOOLS;},
  async call(name,args){
   const allow=ALLOWED[name];
   if(!allow||!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(key=>!allow.has(key)))return toolError('request_invalid');
   try{
    if(name==='picard_prepare_coding_request')return toolResult(await client.prepare(args));
    if(name==='picard_submit_coding_request')return toolResult(await client.submit(args.requestId));
    if(name==='picard_coding_request_status')return toolResult(await client.status(args.requestId));
    if(name==='picard_coding_request_result')return toolResult(await client.result(args.requestId));
    return toolError('request_invalid');
   }catch(error){return toolError(error instanceof CodingClientError?error.code:'connector_failed',error instanceof CodingClientError?error.requestId:undefined);}
  }
 };
}

export async function handleMessage(message,connector){
 if(!message||message.jsonrpc!=='2.0'||typeof message.method!=='string'){if(message?.id!==undefined)fail(message.id,-32600,'Invalid Request');return;}
 const {id,method,params}=message;
 if(method==='initialize'){
  const version=typeof params?.protocolVersion==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(params.protocolVersion)?params.protocolVersion:PROTOCOL;
  ok(id,{protocolVersion:version,capabilities:{tools:{listChanged:false}},serverInfo:{name:'picard-coding',version:CONNECTOR_VERSION}});
  return;
 }
 if(method==='notifications/initialized'||method==='initialized')return;
 if(method==='ping'){ok(id,{});return;}
 if(method==='tools/list'){ok(id,{tools:connector.tools()});return;}
 if(method==='tools/call'){ok(id,await connector.call(params?.name,params?.arguments??{}));return;}
 if(id!==undefined)fail(id,-32601,'Method not found');
}

function start(){
 let connector;
 try{
  const config=loadCodingConfig(process.env.PICARD_CODING_CONFIG);
  const client=createCodingClient({origin:config.origin,token:config.token,workspaceRoot:config.workspaceRoot,journalDir:config.journalDir,deniedFiles:[config.configFile],journal:createJournal(config.journalDir),transport:createHttpsTransport(config.origin)});
  connector=createConnector(client);
  if(process.env.PICARD_WORKSPACES_FILE){
   const legacy=connector;let workspace;
   try{workspace=createWorkspaceToolHandler(config,process.env.PICARD_WORKSPACES_FILE);}
   catch{workspace={tools:()=>WORKSPACE_TOOLS,call:async()=>toolError('workspace_configuration_unavailable')};}
   connector={tools:()=>[...legacy.tools(),...workspace.tools()],call:(name,args)=>WORKSPACE_TOOLS.some(t=>t.name===name)?workspace.call(name,args):legacy.call(name,args)};
  }
  process.stderr.write('picard-coding-connector '+CONNECTOR_VERSION+' ready\n');
 }catch{
  connector={tools:()=>TOOLS,call:async()=>toolError('configuration_unavailable')};
  process.stderr.write('picard-coding-connector '+CONNECTOR_VERSION+' configuration_unavailable\n');
 }
 const lines=createInterface({input:process.stdin,crlfDelay:Infinity});
 lines.on('line',line=>{
  if(!line.trim())return;
  if(Buffer.byteLength(line)>1048576){process.stderr.write('picard-coding-connector request_too_large\n');return;}
  let message;try{message=JSON.parse(line);}catch{fail(null,-32700,'Parse error');return;}
  handleMessage(message,connector).catch(()=>process.stderr.write('picard-coding-connector connector_failed\n'));
 });
}

const invoked=process.argv[1]&&realpathSync(fileURLToPath(import.meta.url))===realpathSync(process.argv[1]);
if(invoked)start();
