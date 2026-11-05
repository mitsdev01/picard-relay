import {fitContext,estimateTokens} from './context-budget.mjs';
export {estimateTokens} from './context-budget.mjs';
// Groq documents request headers as daily quota and token headers as per-minute.
export function durationMs(value){
 if(typeof value!=='string')return 0;
 if(/^\d+(\.\d+)?$/.test(value))return Number(value)*1000;
 const parts=[...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h|d)/g)];
 if(parts.map(x=>x[0]).join('')!==value)return 0;
 return parts.reduce((sum,m)=>sum+Number(m[1])*({ms:1,s:1000,m:60000,h:3600000,d:86400000}[m[2]]),0);
}

export function createRateControl({load,save,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}){
 let state=load()||{};
 return {
  snapshot:()=>({...state}),
  observe(headers,status){
   const at=now();state.lastRequest=at;
   for(const [header,key] of [['x-ratelimit-limit-tokens','limit'],['x-ratelimit-remaining-tokens','remaining'],['x-ratelimit-remaining-requests','requests']]){
    if(/^\d+(\.\d+)?$/.test(headers[header]||''))state[key]=Number(headers[header]);
   }
   if(headers['x-ratelimit-reset-tokens'])state.tokenReset=at+durationMs(headers['x-ratelimit-reset-tokens'])+1500;
   if(headers['x-ratelimit-reset-requests'])state.requestReset=at+durationMs(headers['x-ratelimit-reset-requests'])+1500;
   if(status===429)state.cooldown=at+Math.max(60000,durationMs(headers['retry-after']))+1500;
   save(state);return {...state};
  },
  async before(body,{deadline,active,event}){
   const contextLimit=32768, minuteLimit=state.limit||8000;
   // Context capacity and quota are independent. Never compact a patch contract.
   const initial=estimateTokens(body);if(initial>contextLimit)throw Error('model_context_too_large');
   if(body.response_format && initial>minuteLimit)throw Error('request_exceeds_minute_quota');
   const limit=minuteLimit; const fitted=body.response_format?{messages:body.messages,archived:0,before:initial,after:initial}:fitContext(body,limit); body.messages=fitted.messages; if(fitted.archived)event(`Context compacted: ${fitted.archived} old exchanges archived; estimate ${fitted.before} -> ${fitted.after} tokens. Full receipts retained.`); const tokens=fitted.after;
   if(tokens>limit)throw Error(`rate_context_too_large:${tokens}:${limit}`);
   let until=Math.max(state.cooldown||0,(state.lastRequest||0)+2100);
   if(state.requests===0)until=Math.max(until,state.requestReset||now()+86400000);
   if(state.remaining!==undefined&&tokens>state.remaining)until=Math.max(until,state.tokenReset||((state.lastRequest||now())+61500));
   if(until>=deadline)throw Error('rate_wait_exceeds_mission_deadline');
   if(until>now())event(`Waiting ${Math.ceil((until-now())/1000)} seconds before the next Groq call; estimated request budget ${tokens} tokens. No request has been sent.`);
   while(now()<until){if(!active())throw Error('mission_stopped');await sleep(Math.min(500,until-now()));}
   if(!active()||now()>=deadline)throw Error('mission_stopped');
  }
 };
}
