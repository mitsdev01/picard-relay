import {Buffer} from 'node:buffer';

export function estimateTokens(body){return Math.ceil(Buffer.byteLength(JSON.stringify({messages:body.messages,tools:body.tools,response_format:body.response_format}),'utf8')/3)+body.max_completion_tokens+128;}

// Compact only completed old exchanges. Never split a tool-call/result group,
// rewrite the owner's prompt, or drop the latest result. Full receipts stay in SQLite.
export function fitContext(body,limit){
 const messages=structuredClone(body.messages);
 const groups=[];
 for(let i=2;i<messages.length;){
  const start=i++;
  if(messages[start].tool_calls)while(i<messages.length&&messages[i].role==='tool')i++;
  groups.push(messages.slice(start,i));
 }
 const candidate={...body,messages:[...messages.slice(0,2),...groups.flat()]};
 const before=estimateTokens(candidate);let archived=0;
 while(estimateTokens(candidate)>limit&&groups.length>1){
  groups.shift();archived++;
  candidate.messages=[...messages.slice(0,2),{role:'assistant',content:`${archived} earlier completed exchange(s) omitted from model context; full tool receipts remain in the audit ledger. Do not infer success or repeat a write from this notice. Re-read current state when needed.`},...groups.flat()];
 }
 if(estimateTokens(candidate)>limit)throw Error(`rate_context_too_large:${estimateTokens(candidate)}:${limit}`);
 return {messages:candidate.messages,archived,before,after:estimateTokens(candidate)};
}
