// Workspace client for one exact coding request. It never executes a proposal.
import https from 'node:https';
import {randomUUID} from 'node:crypto';
import {buildCodingContext} from './context.mjs';

const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const PURPOSES=new Set(['public-source-review','sanitized-source-proposal']);
const REMOTE=new Set(['auth_failed','request_invalid','request_too_large','approval_invalid','approval_expired','draft_conflict','not_registered','admission_blocked','queue_capacity','workspace_unavailable','configuration_unavailable']);
export class CodingClientError extends Error{constructor(code){super(code);this.name='CodingClientError';this.code=code;}}
const fail=code=>{throw new CodingClientError(code);};
const text=(value,max)=>typeof value==='string'&&value.trim().length>0&&value.length<=max;

export function createHttpsTransport(origin){
 const base=new URL(origin);
 return({method,path,headers,body})=>new Promise((resolve,reject)=>{
  if(typeof path!=='string'||!path.startsWith('/')||path.includes('://')){reject(new CodingClientError('transport_rejected'));return;}
  const req=https.request({protocol:'https:',hostname:base.hostname,port:base.port||443,servername:base.hostname,method,path,headers,rejectUnauthorized:true,timeout:15000,agent:false},res=>{
   if(res.statusCode>=300&&res.statusCode<400){res.resume();reject(new CodingClientError('redirect_rejected'));return;}
   const chunks=[];let size=0;let failed=false;
   res.on('data',chunk=>{if(failed)return;size+=chunk.length;if(size>65536){failed=true;res.destroy();reject(new CodingClientError('response_too_large'));return;}chunks.push(chunk);});
   res.on('end',()=>{if(!failed)resolve({status:res.statusCode,body:Buffer.concat(chunks).toString('utf8')});});
  });
  req.on('timeout',()=>req.destroy(new CodingClientError('transport_unconfirmed')));
  req.on('error',error=>{if(error instanceof CodingClientError)reject(error);else reject(new CodingClientError('transport_unconfirmed'));});
  if(body)req.write(body);req.end();
 });
}

function originOf(value){
 let origin;try{origin=new URL(value);}catch{fail('configuration_unavailable');}
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||origin.origin!==value)fail('configuration_unavailable');
 return origin;
}
function sameInput(record,input){
 const saved=record?.input;
 return !!saved&&saved.title===input.title&&saved.requestText===input.requestText&&saved.context===input.context&&saved.purpose===input.purpose&&saved.taskId===input.taskId;
}
function remoteCode(body){return REMOTE.has(body?.error)?body.error:'remote_rejected';}

export function createCodingClient({origin,token,journal,transport,workspaceRoot,journalDir=null,deniedFiles=[],now=()=>Date.now()}={}){
 if(typeof token!=='string'||typeof transport!=='function'||typeof journal?.load!=='function')fail('configuration_unavailable');
 const base=originOf(origin),host=base.host;
 const mark=(record,patch)=>{const next={...record,...patch,revision:record.revision+1,updatedAt:new Date(now()).toISOString()};return journal.save(next);};
 async function call(method,path,body){
  const headers={accept:'application/json',host,origin,authorization:'Bearer '+token};
  let raw;if(body!==undefined){raw=JSON.stringify(body);if(Buffer.byteLength(raw)>24576)fail('request_too_large');headers['content-type']='application/json';}
  let response;try{response=await transport({method,path,headers,body:raw});}catch(error){if(error instanceof CodingClientError)throw error;fail('transport_unconfirmed');}
  if(!response||!Number.isInteger(response.status)||typeof response.body!=='string'||Buffer.byteLength(response.body)>65536)fail('response_invalid');
  if(response.status>=300&&response.status<400)fail('redirect_rejected');
  let parsed;try{parsed=JSON.parse(response.body);}catch{fail('response_invalid');}
  if(response.status===401||response.status===403||parsed?.error==='auth_failed')fail('auth_failed');
  return {status:response.status,body:parsed};
 }
 async function limits(){
  const response=await call('GET','/workspace/config');
  const value=response.body?.limits;
  if(response.status!==200||response.body?.v!==1||response.body.provider!=='Groq'||response.body.model!=='openai/gpt-oss-20b'||value?.maxCalls!==1||value.maxOutputTokens!==4096||value.tools!==false||value.retries!==0||value.paidFallback!==false)fail('response_invalid');
  return {provider:response.body.provider,model:response.body.model,ready:response.body.ready===true,blockingCode:response.body.ready===true?null:response.body.blockingCode??'configuration_unavailable',limits:value,measuredTokens:null,billedUsd:null,liveBillingVerified:false};
 }
 function project(record,body){
  const baseView={requestId:record.requestId,eventId:record.eventId,localState:record.state,submission:record.submission,providerCall:false,executedByConnector:false};
  if(body?.draft)return {...baseView,state:body.state,registered:body.registered===true,resultAvailable:false,result:null};
  return {...baseView,state:body?.state??'unknown',registered:body?.state!==undefined,resultAvailable:body?.resultAvailable===true,result:body?.resultAvailable===true?{kind:body.result.kind,sha256:body.result.sha256,body:body.result.body}:null,reasonCode:body?.reasonCode??null,provenance:body?.provenance??null};
 }
 async function read(record){
  if(typeof record.eventId!=='string')fail('not_prepared');
  const response=await call('GET','/workspace/requests/'+record.eventId);
  if(response.status!==200)fail(remoteCode(response.body));
  return project(record,response.body);
 }
 function normalize(input){
  if(!input||typeof input!=='object'||Array.isArray(input))fail('request_invalid');
  const purpose=input.purpose??'sanitized-source-proposal',taskId=input.taskId??'',paths=input.paths??[],note=input.note??'';
  if(input.requestId!==undefined&&!UUID.test(input.requestId)||!text(input.title,200)||!input.title.trim()||!text(input.requestText,4000)||!input.requestText.trim()||typeof taskId!=='string'||taskId.length>200||!PURPOSES.has(purpose)||typeof note!=='string'||note.length>4000)fail('request_invalid');
  let built;try{built=buildCodingContext({workspaceRoot,journalDir,deniedFiles,paths,note,title:input.title.trim(),requestText:input.requestText.trim()});}
  catch(error){fail(error?.code==='context_excluded'||error?.code==='request_too_large'||error?.code==='workspace_unavailable'?error.code:'request_invalid');}
  return {requestId:input.requestId,title:input.title.trim(),requestText:input.requestText.trim(),context:built.context,purpose,taskId,truncated:built.truncated,omittedCharacters:built.omittedCharacters,included:built.included};
 }
 function wire(input){return {requestId:input.requestId,taskId:input.taskId,title:input.title,requestText:input.requestText,context:input.context,purpose:input.purpose};}
 function acceptDraft(record,body){
  const draft=body?.draft;if(!draft||draft.payload?.requestId!==record.requestId||!/^[a-f0-9]{64}$/.test(draft.payload?.eventId??'')||!/^[a-f0-9]{64}$/.test(draft.draftSha256??''))fail('response_invalid');
  return mark(record,{state:'prepared',eventId:draft.payload.eventId,draftSha256:draft.draftSha256,submission:null,input:{...record.input,context:draft.payload.context.latestFinding}});
 }
 return {
  async prepare(input){
   const normalized=normalize(input??{});
   const requestId=normalized.requestId??randomUUID();
   let record=journal.load(requestId);
   const stored={title:normalized.title,requestText:normalized.requestText,context:normalized.context,purpose:normalized.purpose,taskId:normalized.taskId};
   if(record&&!sameInput(record,stored))fail('draft_conflict');
   if(!record)record=journal.create({v:1,requestId,revision:1,state:'preparing',input:stored,eventId:null,draftSha256:null,submission:null,updatedAt:new Date(now()).toISOString()});
   const providerLimits=await limits();
   if(record.state!=='preparing')return {requestId,eventId:record.eventId,state:record.state,recovered:true,providerCall:false,executedByConnector:false,truncated:normalized.truncated,omittedCharacters:normalized.omittedCharacters,included:normalized.included,payload:wire({...stored,requestId}),...providerLimits};
   const existing=await call('GET','/workspace/drafts/'+requestId);
   if(existing.status===200)record=acceptDraft(record,existing.body);
   else if(existing.status===404&&existing.body?.error==='not_registered'){
    const posted=await call('POST','/workspace/drafts',wire({...stored,requestId}));
    if(posted.status!==201)fail(remoteCode(posted.body));
    record=acceptDraft(record,posted.body);
   }else fail(remoteCode(existing.body));
   return {requestId,eventId:record.eventId,state:'prepared',recovered:false,providerCall:false,executedByConnector:false,truncated:normalized.truncated,omittedCharacters:normalized.omittedCharacters,included:normalized.included,payload:wire({...record.input,requestId}),...providerLimits};
  },
  async submit(requestId){
   if(!UUID.test(requestId??''))fail('request_invalid');
   const record=journal.load(requestId);if(!record)fail('not_prepared');
   if(record.state==='preparing')fail('draft_unconfirmed');
   if(record.state!=='prepared'){const view=await read(record);return {...view,submission:'not_repeated',recovered:true};}
   const approval=await call('POST','/workspace/approvals',{requestId});
   if(approval.status===200&&approval.body?.existing===true){const saved=mark(record,{state:'submitted',submission:'not_repeated'});const view=await read(saved);return {...view,submission:'not_repeated',recovered:true};}
   if(approval.status!==200||typeof approval.body?.nonce!=='string'||approval.body.draftSha256!==record.draftSha256)fail(approval.body?.error?remoteCode(approval.body):'approval_invalid');
   const attempted=mark(record,{state:'invocation_attempted',submission:'sent_once'});
   let posted;try{posted=await call('POST','/workspace/requests',{requestId,nonce:approval.body.nonce,draftSha256:record.draftSha256,approve:true});}
   catch(error){mark(attempted,{state:'submit_unconfirmed',submission:'unconfirmed'});throw error;}
   if(![200,201].includes(posted.status)||posted.body?.error){mark(attempted,{state:'submit_unconfirmed',submission:'unconfirmed'});fail(remoteCode(posted.body));}
   const saved=mark(attempted,{state:'submitted',submission:'sent_once'});
   const view=await read(saved);
   return {...view,submission:'sent_once',recovered:false,relayAcceptedSubmission:true};
  },
  async status(requestId){
   if(!UUID.test(requestId??''))fail('request_invalid');
   const record=journal.load(requestId);if(!record?.eventId)fail('not_prepared');
   return {...await read(record),...await limits()};
  },
  async result(requestId){
   const view=await this.status(requestId);
   let body=view.result?.body??null,truncated=false;
   if(typeof body==='string'&&body.length>16000){body=body.slice(0,16000)+'\n[truncated]';truncated=true;}
   return {...view,truncated,untrustedProposal:true,executedByConnector:false,result:view.result&&body!==null?{...view.result,body}:null};
  }
 };
}
