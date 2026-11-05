import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync,mkdtempSync,readFileSync,realpathSync,writeFileSync,symlinkSync,linkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash,randomBytes} from 'node:crypto';
import {workspaceFixture} from '../../../test/fixtures/workspace-fixture.mjs';
import {matchMachineClient,parseMachineClientRegistry} from '../../../experimental/runtime-control/src/admission-handler.mjs';
import {buildCodingContext} from '../context.mjs';
import {createJournal} from '../journal.mjs';
import {createCodingClient,CodingClientError} from '../client.mjs';
import {createConnector,handleMessage} from '../server.mjs';

function root(){return realpathSync(mkdtempSync(join(realpathSync(tmpdir()),'picard-coding-')));}
function relay(fixture){
 const calls=[];
 const transport=async({method,path,headers,body})=>{
  calls.push({method,path});
  const {Readable}=await import('node:stream');
  const req=Readable.from(body?[Buffer.from(body)]:[]);
  Object.assign(req,{method,url:path,headers});
  const res={writeHead(status){this.status=status;},end(text){this.text=text;}};
  const handled=await fixture.handler(req,res);
  return handled?{status:res.status,body:res.text}:{status:404,body:JSON.stringify({error:'not_registered'})};
 };
 return {calls,transport};
}
function clientFor(fixture,dir,token){
 const journalPath=join(dir,'journal');mkdirSync(journalPath);
 const journalDir=realpathSync(journalPath);
 const {calls,transport}=relay(fixture);
 const client=createCodingClient({origin:'https://fixture.invalid',token,workspaceRoot:dir,journalDir,journal:createJournal(journalDir),transport});
 return {client,calls,journalDir};
}
test('context stays inside the workspace and reports truncation',()=>{
 const dir=root();
 writeFileSync(join(dir,'helper.js'),'export const label="synthetic";\n');
 writeFileSync(join(dir,'.env'),'GROQ_API_KEY=synthetic\n');
 writeFileSync(join(dir,'notes.txt'),'-----BEGIN PRIVATE KEY-----\nsynthetic\n');
 const selected=buildCodingContext({workspaceRoot:dir,title:'Synthetic helper',requestText:'Propose a label.',paths:['helper.js']});
 assert.match(selected.context,/helper\.js/);assert.equal(selected.included.length,1);
 assert.throws(()=>buildCodingContext({workspaceRoot:dir,title:'Synthetic helper',requestText:'Propose a label.',paths:['.env']}),error=>error.code==='context_excluded');
 assert.throws(()=>buildCodingContext({workspaceRoot:dir,title:'Synthetic helper',requestText:'Propose a label.',paths:['notes.txt']}),error=>error.code==='context_excluded');
 assert.throws(()=>buildCodingContext({workspaceRoot:dir,title:'Synthetic helper',requestText:'Propose a label.',paths:['..\\outside.js']}),error=>error.code==='context_excluded');
 const huge=buildCodingContext({workspaceRoot:dir,title:'Synthetic helper',requestText:'Propose a label.',note:'x'.repeat(5000)});
 assert.equal(huge.truncated,true);assert.ok(huge.omittedCharacters>0);assert.ok(huge.context.length<=4000);assert.match(huge.context,/\[truncated\]/);
});
test('authentication failure does not submit or retry',async()=>{
 const dir=root(),token='D'.repeat(43);let posts=0;
 const client=createCodingClient({origin:'https://fixture.invalid',token,workspaceRoot:dir,journal:createJournal(join(dir,'journal')),transport:async request=>{if(request.method==='POST')posts++;return {status:401,body:JSON.stringify({error:'auth_failed'})};}});
 await assert.rejects(client.prepare({title:'Synthetic helper',requestText:'Propose a label.',note:'Public note only.'}),error=>error instanceof CodingClientError&&error.code==='auth_failed');
 assert.equal(posts,0);
});
test('interrupted preparation returns its durable identity for exact recovery',async()=>{
 const dir=root(),journal=createJournal(join(dir,'journal'));
 const client=createCodingClient({origin:'https://fixture.invalid',token:'F'.repeat(43),workspaceRoot:dir,journal,transport:async()=>{throw new CodingClientError('transport_unconfirmed');}});
 const response=await createConnector(client).call('picard_prepare_coding_request',{title:'Synthetic',requestText:'Review a synthetic helper.'});
 const error=JSON.parse(response.content[0].text);
 assert.equal(response.isError,true);assert.equal(error.error,'transport_unconfirmed');
 assert.match(error.requestId,/^[a-f0-9-]{36}$/);assert.equal(journal.load(error.requestId).state,'preparing');
 const again=await createConnector(client).call('picard_prepare_coding_request',{requestId:error.requestId,title:'Synthetic',requestText:'Review a synthetic helper.'});
 assert.equal(JSON.parse(again.content[0].text).requestId,error.requestId);
});

test('context rejects secret directory junctions, file symlinks and hard-link aliases',()=>{
 const dir=root();mkdirSync(join(dir,'secrets'));writeFileSync(join(dir,'secrets','settings.json'),'SYNTHETIC_SECRET');
 symlinkSync(join(dir,'secrets'),join(dir,'ordinary'),process.platform==='win32'?'junction':'dir');
 const input={workspaceRoot:dir,title:'Synthetic',requestText:'Review selected code.'};
 assert.throws(()=>buildCodingContext({...input,paths:['ordinary/settings.json']}),e=>e.code==='context_excluded');
 linkSync(join(dir,'secrets','settings.json'),join(dir,'ordinary.json'));
 assert.throws(()=>buildCodingContext({...input,paths:['ordinary.json']}),e=>e.code==='context_excluded');
 if(process.platform!=='win32'){
  symlinkSync(join(dir,'secrets','settings.json'),join(dir,'alias.json'));
  assert.throws(()=>buildCodingContext({...input,paths:['alias.json']}),e=>e.code==='context_excluded');
 }
});
test('one submission survives interruption and a second submit does not call the provider again',async()=>{
 const token=randomBytes(32).toString('base64url');
 const registry=parseMachineClientRegistry(JSON.stringify({v:1,clients:[{id:'work-laptop-coding',tokenSha256:createHash('sha256').update(token).digest('hex'),scopes:['workspace-coding'],revoked:false}]}));
 const fixture=await workspaceFixture({authenticateMachine:async value=>matchMachineClient(registry,value)});
 const dir=root();writeFileSync(join(dir,'status.js'),'export function statusLabel(state){return state;}\n');
 const first=clientFor(fixture,dir,token);
 try{
  const prepared=await first.client.prepare({title:'Synthetic status label',requestText:'Propose a tiny pure status-label helper. Include one focused equality check.',paths:['status.js']});
  assert.equal(prepared.providerCall,false);assert.equal(prepared.limits.maxCalls,1);assert.equal(prepared.limits.maxOutputTokens,4096);assert.equal(prepared.limits.tools,false);assert.equal(fixture.calls,0);
  assert.equal(first.calls.filter(call=>call.method==='POST'&&call.path==='/workspace/requests').length,0);
  const submitted=await first.client.submit(prepared.requestId);
  assert.equal(submitted.submission,'sent_once');assert.equal(submitted.relayAcceptedSubmission,true);assert.equal(fixture.calls,0);
  assert.equal((await fixture.dispatcher.runOnce()).status,'completed');assert.equal(fixture.calls,1);
  const again=await first.client.submit(prepared.requestId);
  assert.equal(again.submission,'not_repeated');assert.equal(fixture.calls,1);
  const recovered=createCodingClient({origin:'https://fixture.invalid',token,workspaceRoot:dir,journalDir:first.journalDir,journal:createJournal(first.journalDir),transport:relay(fixture).transport});
  const result=await recovered.result(prepared.requestId);
  assert.equal(result.untrustedProposal,true);assert.equal(result.executedByConnector,false);assert.equal(result.resultAvailable,true);assert.match(result.result.body,/statusLabel/);assert.equal(fixture.calls,1);
  assert.equal(first.calls.filter(call=>call.path==='/workspace/requests'&&call.method==='POST').length,1);
 }finally{fixture.close();}
});
test('a lost submission response is not posted again',async()=>{
 const token=randomBytes(32).toString('base64url');
 const registry=parseMachineClientRegistry(JSON.stringify({v:1,clients:[{id:'work-laptop-coding',tokenSha256:createHash('sha256').update(token).digest('hex'),scopes:['workspace-coding'],revoked:false}]}));
 const fixture=await workspaceFixture({authenticateMachine:async value=>matchMachineClient(registry,value)});
 const dir=root();
 const {transport,calls}=relay(fixture);let lost=false;
 const flaky=async request=>{
  if(request.method==='POST'&&request.path==='/workspace/requests'){lost=true;throw new CodingClientError('transport_unconfirmed');}
  if(lost&&request.method==='POST')throw new Error('unexpected_resubmit');
  return transport(request);
 };
 const client=createCodingClient({origin:'https://fixture.invalid',token,workspaceRoot:dir,journal:createJournal(join(dir,'journal')),transport:flaky});
 try{
  const prepared=await client.prepare({title:'Synthetic status label',requestText:'Propose a tiny pure helper.',note:'Synthetic note only.'});
  await assert.rejects(client.submit(prepared.requestId),error=>error.code==='transport_unconfirmed');
  const status=await client.status(prepared.requestId);
  assert.equal(status.submission,'unconfirmed');assert.equal(fixture.calls,0);
  assert.equal(calls.filter(call=>call.path==='/workspace/requests'&&call.method==='POST').length,0);
 }finally{fixture.close();}
});
test('connector source does not execute proposals',()=>{
 for(const name of ['../server.mjs','../client.mjs','../context.mjs','../journal.mjs','../config.mjs']){
  const text=readFileSync(fileURLToPath(new URL(name,import.meta.url)),'utf8');
  assert.equal(text.includes('child_process'),false);assert.equal(text.includes('execSync'),false);assert.equal(text.includes('spawn('),false);
 }
});
test('MCP initialization, discovery and argument validation stay on stdout',async()=>{
 const dir=root(),token='E'.repeat(43),journalDir=join(dir,'journal');mkdirSync(journalDir);
 const config=join(dir,'coding-client.json');
 writeFileSync(config,JSON.stringify({v:1,origin:'https://fixture.invalid',token,workspaceRoot:dir,journalDir:realpathSync(journalDir)}));
 const server=fileURLToPath(new URL('../server.mjs',import.meta.url));
 const child=spawn(process.execPath,[server],{env:{...process.env,PICARD_CODING_CONFIG:config},stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='';
 child.stdout.on('data',chunk=>{stdout+=chunk;});child.stderr.on('data',chunk=>{stderr+=chunk;});
 const pending=[];
 const ready=()=>new Promise(resolve=>{
  const check=()=>{const index=stdout.indexOf('\n');if(index<0){child.stdout.once('data',check);return;}const line=stdout.slice(0,index);stdout=stdout.slice(index+1);resolve(JSON.parse(line));};
  if(stdout.includes('\n'))check();else child.stdout.once('data',check);
  pending.push(resolve);
 });
 const send=async message=>{const response=ready();child.stdin.write(JSON.stringify(message)+'\n');return response;};
 try{
  const init=await send({jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'synthetic',version:'0'}}});
  assert.equal(init.result.serverInfo.name,'picard-coding');assert.equal(init.result.serverInfo.version,'1.0.0');assert.deepEqual(init.result.capabilities.tools,{listChanged:false});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
  const listed=await send({jsonrpc:'2.0',id:2,method:'tools/list'});
  assert.deepEqual(listed.result.tools.map(tool=>tool.name),['picard_prepare_coding_request','picard_submit_coding_request','picard_coding_request_status','picard_coding_request_result']);
  const invalid=await send({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'picard_prepare_coding_request',arguments:{title:'Synthetic',requestText:'Propose a label.',command:'calc.exe'}}});
  assert.equal(invalid.result.isError,true);assert.equal(JSON.parse(invalid.result.content[0].text).error,'request_invalid');
  assert.equal(stdout.includes(token),false);assert.equal(stderr.includes(token),false);assert.match(stderr,/picard-coding-connector 1\.0\.0 ready/);
 }finally{child.kill();await new Promise(resolve=>child.once('exit',resolve));}
});
