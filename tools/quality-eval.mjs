// Offline preparation and scoring. Never invokes a model, executes output or approves work.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,realpathSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {buildCodingContext} from './coding-connector/context.mjs';
import {compileTaskContract,requireCompleteContext} from './coding-connector/task-contract.mjs';

const hash=value=>createHash('sha256').update(value).digest('hex');
const digest=value=>hash(JSON.stringify(value));
const requireThat=(ok,code)=>{if(!ok)throw Object.assign(new Error(code),{code});};
const label=s=>typeof s==='string'&&s.trim().length>0&&s.length<=200;
const hashString=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const readJson=file=>{const s=statSync(file);requireThat(s.isFile()&&s.size<=2*1024*1024,'evaluation_file_too_large');const b=readFileSync(file);requireThat(b.length<=2*1024*1024,'evaluation_file_too_large');return JSON.parse(b.toString('utf8'));};

export function prepareQualityTask(task,workspaceRoot){
 requireThat(task&&label(task.id)&&label(task.title)&&task.contract,'task_invalid');
 const requestText=compileTaskContract(task.requestText,task.contract);
 const built=requireCompleteContext(buildCodingContext({workspaceRoot,title:task.title,requestText,paths:task.paths??[],note:task.note??''}));
 const checks=task.checks??[];
 requireThat(Array.isArray(checks)&&checks.length<=24,'checks_invalid');
 const ids=new Set();
 for(const check of checks){
  requireThat(check&&label(check.id)&&!ids.has(check.id)&&Object.keys(check).every(k=>['id','kind','value'].includes(k))&&['includes','excludes','json'].includes(check.kind),'checks_invalid');ids.add(check.id);
  requireThat(check.kind==='json'?check.value===undefined:typeof check.value==='string'&&check.value.length>0&&check.value.length<=500,'checks_invalid');
 }
 const payload={title:task.title.trim(),requestText:requestText.trim(),context:built.context,purpose:'sanitized-source-proposal'};
 const connectorInput={title:payload.title,requestText:payload.requestText,note:task.note??'',paths:task.paths??[],purpose:payload.purpose};
 const manifest={v:1,caseId:task.id,payload,connectorInput,inputSha256:digest(payload),coverage:built.coverage,
  criteria:task.contract.acceptanceCriteria.map((text,i)=>({id:'C'+(i+1),text:text.trim()})),checks};
 return {...manifest,manifestSha256:digest(manifest),providerCall:false};
}

function validatePrepared(prepared){
 requireThat(prepared&&prepared.v===1,'prepared_invalid');
 const {manifestSha256,providerCall,...manifest}=prepared;
 requireThat(providerCall===false&&hashString(manifestSha256)&&digest(manifest)===manifestSha256&&digest(prepared.payload)===prepared.inputSha256,'prepared_integrity_invalid');
 requireThat(Array.isArray(prepared.criteria)&&prepared.criteria.length>0&&Array.isArray(prepared.checks),'prepared_invalid');
}

export function scoreQualityResult(prepared,record,review=null){
 validatePrepared(prepared);
 requireThat(record&&record.inputSha256===prepared.inputSha256&&label(record.variant)&&label(record.model)&&label(record.effort),'result_input_mismatch');
 requireThat(['completed','failed','uncertain','incomplete'].includes(record.deliveryState),'delivery_state_invalid');
 const hasBody=typeof record.body==='string';
 requireThat(hasBody?hashString(record.bodySha256)&&hash(record.body)===record.bodySha256:record.body===null&&record.bodySha256===null,'result_integrity_invalid');
 requireThat(record.finishReason===null||['stop','length','unknown'].includes(record.finishReason),'finish_reason_invalid');
 const incomplete=record.deliveryState==='incomplete'||record.finishReason==='length'||record.truncated===true||(hasBody&&/^\[Incomplete response:/m.test(record.body));
 const body=hasBody?record.body.replace(/^\[Groq \/ [^\r\n\]]+\]\r?\n/,''):'';
 const mechanical=prepared.checks.map(check=>{
  let passed=false;
  if(hasBody){if(check.kind==='json'){try{JSON.parse(body);passed=true;}catch{/* Malformed output remains failed. */}}
   else passed=check.kind==='includes'?body.includes(check.value):!body.includes(check.value);}
  return {id:check.id,passed};
 });
 let judgments=[];
 if(review!==null){
  requireThat(review&&review.inputSha256===prepared.inputSha256&&review.bodySha256===record.bodySha256&&label(review.reviewer)&&Array.isArray(review.judgments),'review_binding_invalid');
  const seen=new Set();
  for(const judgment of review.judgments){
   requireThat(judgment&&prepared.criteria.some(c=>c.id===judgment.criterionId)&&!seen.has(judgment.criterionId)&&['pass','fail','untested'].includes(judgment.status),'review_invalid');
   requireThat(typeof judgment.evidence==='string'&&judgment.evidence.trim().length>0&&judgment.evidence.length<=2000,'review_evidence_required');seen.add(judgment.criterionId);
  }
  judgments=review.judgments;
 }
 const criteria=prepared.criteria.map(c=>({id:c.id,status:judgments.find(j=>j.criterionId===c.id)?.status??'untested'}));
 let qualityStatus='needs_review';
 if(record.deliveryState==='failed'||record.deliveryState==='uncertain')qualityStatus=record.deliveryState;
 else if(incomplete)qualityStatus='incomplete';
 else if(!hasBody||!body.trim()||mechanical.some(c=>!c.passed)||criteria.some(c=>c.status==='fail'))qualityStatus='failed';
 else if(record.finishReason==='stop'&&criteria.every(c=>c.status==='pass'))qualityStatus='reviewed_pass';
 const numeric=k=>{const value=record[k];requireThat(value===undefined||value===null||Number.isFinite(value)&&value>=0,'usage_invalid');return value??null;};
 return {v:1,caseId:prepared.caseId,inputSha256:prepared.inputSha256,manifestSha256:prepared.manifestSha256,bodySha256:record.bodySha256,
  variant:record.variant,model:record.model,effort:record.effort,deliveryState:record.deliveryState,qualityStatus,mechanical,criteria,
  latencyMs:numeric('latencyMs'),totalTokens:numeric('totalTokens'),corrections:numeric('corrections'),
  evidenceScope:'offline caller-supplied result and review; provider provenance not authenticated',ownerAccepted:false,providerCall:false};
}

// Every attempt is retained; unknown usage is never counted as zero.
export function summarizeQualityResults(results){
 requireThat(Array.isArray(results)&&results.length>0&&results.length<=10000,'results_invalid');
 const groups=new Map();
 for(const r of results){
  requireThat(r?.v===1&&label(r.variant)&&label(r.model)&&label(r.effort)&&['reviewed_pass','failed','uncertain','incomplete','needs_review'].includes(r.qualityStatus),'score_invalid');
  const key=JSON.stringify([r.variant,r.model,r.effort]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);
 }
 return {v:1,providerCall:false,groups:[...groups.values()].map(rows=>({variant:rows[0].variant,model:rows[0].model,effort:rows[0].effort,
  attempts:rows.length,reviewedPasses:rows.filter(r=>r.qualityStatus==='reviewed_pass').length,
  reviewedPassRate:rows.filter(r=>r.qualityStatus==='reviewed_pass').length/rows.length,
  statuses:Object.fromEntries(['reviewed_pass','failed','uncertain','incomplete','needs_review'].map(s=>[s,rows.filter(r=>r.qualityStatus===s).length])),
  usageComplete:rows.every(r=>typeof r.totalTokens==='number'&&Number.isFinite(r.totalTokens)&&r.totalTokens>=0),
  knownTotalTokens:rows.reduce((n,r)=>n+(typeof r.totalTokens==='number'&&Number.isFinite(r.totalTokens)&&r.totalTokens>=0?r.totalTokens:0),0)
 })),limitation:'Descriptive counts only. Match task sets, source snapshots and budgets before comparing variants; no causal quality or savings claim.'};
}

function main(args){
 const [command,...rest]=args,options={};
 requireThat(rest.length%2===0,'usage');
 for(let i=0;i<rest.length;i+=2){requireThat(rest[i].startsWith('--')&&!Object.hasOwn(options,rest[i]),'usage');options[rest[i]]=rest[i+1];}
 const allowed={prepare:['--task','--workspace','--out'],score:['--prepared','--result','--review','--out'],summarize:['--scores','--out']}[command];
 requireThat(allowed&&Object.keys(options).every(k=>allowed.includes(k))&&options['--out'],'usage');
 let result;
 if(command==='prepare'){requireThat(options['--task']&&options['--workspace'],'usage');result=prepareQualityTask(readJson(options['--task']),realpathSync(options['--workspace']));}
 else if(command==='score'){requireThat(options['--prepared']&&options['--result'],'usage');result=scoreQualityResult(readJson(options['--prepared']),readJson(options['--result']),options['--review']?readJson(options['--review']):null);}
 else{requireThat(options['--scores'],'usage');result=summarizeQualityResults(readJson(options['--scores']));}
 writeFileSync(options['--out'],JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
 console.log(JSON.stringify({written:true,providerCall:false,qualityStatus:result.qualityStatus??null}));
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===realpathSync(process.argv[1])){
 try{main(process.argv.slice(2));}catch(e){console.error(JSON.stringify({error:e.code??'evaluation_failed',providerCall:false}));process.exitCode=1;}
}
