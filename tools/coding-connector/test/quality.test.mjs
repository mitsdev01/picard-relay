import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync,realpathSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {buildCodingContext} from '../context.mjs';
import {compileTaskContract,requireCompleteContext} from '../task-contract.mjs';
import {createCodingClient} from '../client.mjs';
import {createConnector} from '../server.mjs';
import {createJournal} from '../journal.mjs';
import {prepareQualityTask,scoreQualityResult,summarizeQualityResults} from '../../quality-eval.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
function root(t){const dir=realpathSync(mkdtempSync(join(tmpdir(),'picard-quality-')));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
const base={title:'Review',requestText:'Review this source.'};
const contract={acceptanceCriteria:['Keep the exception.','Explain what remains untested.'],constraints:['Use supplied facts only.']};

test('coverage distinguishes selected paths from material actually retained',t=>{
 const dir=root(t);writeFileSync(join(dir,'first.js'),'x'.repeat(5000));writeFileSync(join(dir,'last.js'),'critical exception');
 const r=buildCodingContext({...base,workspaceRoot:dir,paths:['first.js','last.js']});
 assert.equal(r.truncated,true);assert.deepEqual(r.included,[]);assert.deepEqual(r.coverage.map(c=>c.status),['partial','omitted']);
 assert.equal(r.omittedCharacters,('File: first.js\n'+'x'.repeat(5000)+'\n\nFile: last.js\ncritical exception').length-(r.context.length-'\n[truncated]'.length));
 assert.throws(()=>requireCompleteContext(r),e=>e.code==='context_truncated_refused'&&e.preparation.coverage[1].status==='omitted');
});
test('range after the old 32KiB cap is preserved exactly with full-file hash',t=>{
 const dir=root(t),text=('irrelevant\r\n').repeat(4000)+'function target(){return "é😀";}\r\n';writeFileSync(join(dir,'large.js'),text);
 const r=buildCodingContext({...base,workspaceRoot:dir,paths:[{path:'large.js',startLine:4001,endLine:4001}]});
 assert.equal(r.truncated,false);assert.equal(r.context,`File: large.js (lines 4001-4001, sha256 ${hash(text)})\nfunction target(){return "é😀";}\r`);
 assert.equal(r.coverage[0].sourceSha256,hash(readFileSync(join(dir,'large.js'))));assert.equal(r.coverage[0].status,'complete');
});
test('exact ranges reject invalid bounds and retain path protections',t=>{
 const dir=root(t);writeFileSync(join(dir,'a.js'),'a\nb');writeFileSync(join(dir,'.env'),'SECRET');
 for(const range of [{path:'a.js',startLine:0,endLine:1},{path:'a.js',startLine:1,endLine:3},{path:'a.js',startLine:2,endLine:1},{path:'a.js',startLine:1,endLine:1,extra:true}])assert.throws(()=>buildCodingContext({...base,workspaceRoot:dir,paths:[range]}),e=>e.code==='line_range_invalid');
 for(const path of ['.env','../a.js'])assert.throws(()=>buildCodingContext({...base,workspaceRoot:dir,paths:[{path,startLine:1,endLine:1}]}),e=>e.code==='context_excluded');
});
test('file cap, binary input and private-key header beyond first 512 bytes fail closed',t=>{
 const dir=root(t);
 for(const [name,data,code] of [['large','x'.repeat(2*1024*1024+1),'context_file_too_large'],['binary','abc\0def','context_excluded'],['key','x'.repeat(600)+'\n-----BEGIN PRIVATE KEY-----\n','context_excluded'],['utf8',Buffer.from([255]),'context_excluded']]){
  writeFileSync(join(dir,name),data);assert.throws(()=>buildCodingContext({...base,workspaceRoot:dir,paths:[name]}),e=>e.code===code);
 }
});
test('source that discusses private-key markers is not mistaken for a PEM file',t=>{
 const dir=root(t);writeFileSync(join(dir,'validator.js'),"const marker = 'BEGIN PRIVATE KEY';\n");
 assert.equal(buildCodingContext({...base,workspaceRoot:dir,paths:['validator.js']}).truncated,false);
});
test('UTF-8 byte budget is honored without breaking surrogate pairs',t=>{
 const r=buildCodingContext({...base,requestText:'中'.repeat(3000),workspaceRoot:root(t),note:'😀'.repeat(2000)});
 assert.equal(r.truncated,true);assert.ok(r.requestBytes<=12000);assert.ok(r.context.length<=4000);assert.equal(r.context.isWellFormed(),true);
});
test('contract preserves criteria and constraints and is bounded before transport',()=>{
 const text=compileTaskContract('Review.',contract);assert.match(text,/1\. Keep the exception\./);assert.match(text,/Use supplied facts only/);
 assert.equal(compileTaskContract('Review.'),'Review.');
 for(const value of [{},{acceptanceCriteria:[]},{...contract,model:'other'},{...contract,constraints:null},{acceptanceCriteria:[' ']}])assert.throws(()=>compileTaskContract('Review.',value),e=>e.code==='task_contract_invalid');
 assert.throws(()=>compileTaskContract('x'.repeat(3900),contract),e=>e.code==='task_contract_too_large');
});
test('legacy preparation rejects lost evidence before journal or network writes and exposes coverage',async t=>{
 const dir=root(t);writeFileSync(join(dir,'a.js'),'x'.repeat(5000));let calls=0,creates=0;
 const client=createCodingClient({origin:'https://fixture.invalid',token:'synthetic',workspaceRoot:dir,journal:{load(){return null;},create(){creates++;}},transport:async()=>{calls++;throw Error('unexpected');}});
 const r=await createConnector(client).call('picard_prepare_coding_request',{...base,paths:['a.js']});
 const body=JSON.parse(r.content[0].text);assert.equal(body.error,'context_truncated_refused');assert.equal(body.preparation.coverage[0].status,'partial');assert.equal(calls,0);assert.equal(creates,0);
});
test('MCP advertises selected ranges and task contracts',()=>{
 const schema=createConnector({}).tools()[0].inputSchema;
 assert.equal(schema.properties.paths.items.oneOf.length,2);assert.ok(schema.properties.contract.required.includes('acceptanceCriteria'));
});

test('changes outside an excerpt alter the frozen request source identity',t=>{
 const dir=root(t),file=join(dir,'a.js'),args={...base,workspaceRoot:dir,paths:[{path:'a.js',startLine:2,endLine:2}]};
 writeFileSync(file,'first\nselected');const before=buildCodingContext(args);writeFileSync(file,'changed\nselected');
 const after=buildCodingContext(args);assert.notEqual(before.context,after.context);assert.notEqual(before.coverage[0].sourceSha256,after.coverage[0].sourceSha256);
});

function evaluation(t){
 const prepared=prepareQualityTask({id:'exceptions',...base,contract,note:'An expired session must be rejected, even when the user exists.',checks:[{id:'format',kind:'json'}]},root(t));
 const body='{"decision":"reject","untested":true}';
 const record={inputSha256:prepared.inputSha256,variant:'candidate',model:'fixture',effort:'none',deliveryState:'completed',finishReason:'stop',body,bodySha256:hash(body),totalTokens:20};
 const review={inputSha256:prepared.inputSha256,bodySha256:record.bodySha256,reviewer:'fixture reviewer',judgments:prepared.criteria.map(c=>({criterionId:c.id,status:'pass',evidence:'Synthetic fixture verdict; not a live model evaluation.'}))};
 return {prepared,record,review};
}
test('format success cannot certify semantic quality without all reviewed criteria',t=>{
 const {prepared,record,review}=evaluation(t);
 assert.equal(scoreQualityResult(prepared,record).qualityStatus,'needs_review');
 assert.equal(scoreQualityResult(prepared,record,{...review,judgments:review.judgments.slice(0,1)}).qualityStatus,'needs_review');
 const score=scoreQualityResult(prepared,record,review);assert.equal(score.qualityStatus,'reviewed_pass');assert.equal(score.ownerAccepted,false);
});
test('integrity and review binding refuse tampered tasks, answers and stale reviews',t=>{
 const {prepared,record,review}=evaluation(t);
 assert.throws(()=>scoreQualityResult({...prepared,criteria:[]},record),/prepared_integrity_invalid/);
 assert.throws(()=>scoreQualityResult(prepared,{...record,body:'changed'}),/result_integrity_invalid/);
 assert.throws(()=>scoreQualityResult(prepared,{...record,inputSha256:'0'.repeat(64)}),/result_input_mismatch/);
 assert.throws(()=>scoreQualityResult(prepared,record,{...review,bodySha256:'0'.repeat(64)}),/review_binding_invalid/);
});
for(const state of ['failed','uncertain','incomplete'])test(state+' remains in evaluation despite favorable review',t=>{
 const {prepared,record,review}=evaluation(t);assert.equal(scoreQualityResult(prepared,{...record,deliveryState:state},review).qualityStatus,state);
});
test('length, partial marker and connector truncation never count as a pass',t=>{
 const {prepared,record,review}=evaluation(t);
 for(const patch of [{finishReason:'length'},{truncated:true}])assert.equal(scoreQualityResult(prepared,{...record,...patch},review).qualityStatus,'incomplete');
 const body='[Incomplete response: the output limit was reached. This is a partial answer.]\n{}';
 assert.equal(scoreQualityResult(prepared,{...record,body,bodySha256:hash(body)}).qualityStatus,'incomplete');
});
test('unknown finish reason, semantic failure and malformed JSON are distinguished',t=>{
 const {prepared,record,review}=evaluation(t);
 assert.equal(scoreQualityResult(prepared,{...record,finishReason:'unknown'},review).qualityStatus,'needs_review');
 assert.equal(scoreQualityResult(prepared,record,{...review,judgments:review.judgments.map(j=>({...j,status:'fail'}))}).qualityStatus,'failed');
 const body='{bad';assert.equal(scoreQualityResult(prepared,{...record,body,bodySha256:hash(body)}).qualityStatus,'failed');
});
test('missing body, duplicate judgments and empty review evidence cannot pass',t=>{
 const {prepared,record,review}=evaluation(t);
 assert.equal(scoreQualityResult(prepared,{...record,body:null,bodySha256:null}).qualityStatus,'failed');
 assert.throws(()=>scoreQualityResult(prepared,record,{...review,judgments:[review.judgments[0],review.judgments[0]]}),/review_invalid/);
 assert.throws(()=>scoreQualityResult(prepared,record,{...review,judgments:[{...review.judgments[0],evidence:''}]}),/review_evidence_required/);
});
test('summary retains unsuccessful attempts and marks unknown usage incomplete',t=>{
 const {prepared,record,review}=evaluation(t),good=scoreQualityResult(prepared,record,review);
 const failed=scoreQualityResult(prepared,{...record,deliveryState:'uncertain',totalTokens:null});
 const r=summarizeQualityResults([good,failed]).groups[0];assert.equal(r.attempts,2);assert.equal(r.reviewedPassRate,0.5);assert.equal(r.usageComplete,false);assert.equal(r.knownTotalTokens,20);
});
test('offline CLI prepares, scores, summarizes and refuses overwriting evidence',t=>{
 const dir=root(t),cli=fileURLToPath(new URL('../../quality-eval.mjs',import.meta.url));
 const task=join(dir,'task.json'),preparedFile=join(dir,'prepared.json'),resultFile=join(dir,'result.json'),reviewFile=join(dir,'review.json'),scoreFile=join(dir,'score.json'),scoresFile=join(dir,'scores.json'),summaryFile=join(dir,'summary.json');
 writeFileSync(task,JSON.stringify({id:'cli',...base,contract,note:'Synthetic source evidence.'}));
 const run=args=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:10000});
 const prepareArgs=['prepare','--task',task,'--workspace',dir,'--out',preparedFile];
 assert.equal(run(prepareArgs).status,0);const original=readFileSync(preparedFile,'utf8');assert.equal(run(prepareArgs).status,1);assert.equal(readFileSync(preparedFile,'utf8'),original);
 const p=JSON.parse(original),body='Synthetic proposal';
 writeFileSync(resultFile,JSON.stringify({inputSha256:p.inputSha256,variant:'fixture',model:'fixture',effort:'none',body,bodySha256:hash(body),deliveryState:'completed',finishReason:'stop'}));
 writeFileSync(reviewFile,JSON.stringify({inputSha256:p.inputSha256,bodySha256:hash(body),reviewer:'fixture',judgments:p.criteria.map(c=>({criterionId:c.id,status:'pass',evidence:'Fixture-only judgment.'}))}));
 assert.equal(run(['score','--prepared',preparedFile,'--result',resultFile,'--review',reviewFile,'--out',scoreFile]).status,0);
 const score=JSON.parse(readFileSync(scoreFile));assert.equal(score.qualityStatus,'reviewed_pass');writeFileSync(scoresFile,JSON.stringify([score]));
 assert.equal(run(['summarize','--scores',scoresFile,'--out',summaryFile]).status,0);assert.equal(JSON.parse(readFileSync(summaryFile)).groups[0].attempts,1);
});
test('frozen connector input reconstructs exact payload without whitespace loss',t=>{
 const dir=root(t);writeFileSync(join(dir,'a.js'),'export const x=1;\n');
 const p=prepareQualityTask({id:'roundtrip',...base,contract,paths:['a.js'],note:' reviewed facts '},dir);
 const r=buildCodingContext({...p.connectorInput,workspaceRoot:dir});assert.equal(r.context,p.payload.context);assert.equal(p.connectorInput.requestText,p.payload.requestText);
});
