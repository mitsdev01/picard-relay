/**
 * Build the POST /workspace/reviews/<ref> body after apply; note lists enrolled test ids (no logs).
 */
export function buildReviewBody({expectedRevision,decision,note,resultSha256,testCommandIds=[]}){
 const safeDecision=decision==='changes_requested'?'changes_requested':'accepted';
 const ids=Array.isArray(testCommandIds)?testCommandIds.filter(id=>typeof id==='string'&&id.length>0):[];
 const prefix=ids.length?'Operator review. Tests: '+ids.join(', ')+'. ':'Operator review. ';
 const merged=(prefix+(note||'').trim()).trim().slice(0,2000);
 return {
  expectedRevision:Number.isFinite(expectedRevision)?Math.trunc(expectedRevision):0,
  decision:safeDecision,
  note:merged,
  resultSha256:typeof resultSha256==='string'?resultSha256:''
 };
}
