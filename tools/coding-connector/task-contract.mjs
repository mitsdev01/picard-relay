// Local prompt compilation only. No inference, approval or execution.
export const taskContractSchema={type:'object',additionalProperties:false,required:['acceptanceCriteria'],properties:{
 acceptanceCriteria:{type:'array',minItems:1,maxItems:12,items:{type:'string',minLength:1,maxLength:300}},
 constraints:{type:'array',maxItems:12,items:{type:'string',minLength:1,maxLength:300}}
}};
export const selectionSchema={oneOf:[{type:'string',minLength:1,maxLength:240},{type:'object',additionalProperties:false,required:['path','startLine','endLine'],properties:{path:{type:'string',minLength:1,maxLength:240},startLine:{type:'integer',minimum:1},endLine:{type:'integer',minimum:1}}}]};

export function compileTaskContract(requestText,contract,maxLength=4000){
 const fail=code=>{throw Object.assign(new Error(code),{code});};
 if(typeof requestText!=='string'||!requestText.trim())fail('request_invalid');
 if(contract!==undefined){
  if(!contract||Array.isArray(contract)||typeof contract!=='object'||Object.keys(contract).some(k=>!['acceptanceCriteria','constraints'].includes(k)))fail('task_contract_invalid');
  for(const [key,min] of [['acceptanceCriteria',1],['constraints',0]]){
   const list=key==='constraints'&&!Object.hasOwn(contract,key)?[]:contract[key];
   if(!Array.isArray(list)||list.length<min||list.length>12||list.some(s=>typeof s!=='string'||!s.trim()||s.length>300))fail('task_contract_invalid');
  }
  requestText=requestText.trim()+'\n\nAcceptance criteria:\n'+contract.acceptanceCriteria.map((s,i)=>`${i+1}. ${s.trim()}`).join('\n')
   +(contract.constraints?.length?'\n\nConstraints:\n'+contract.constraints.map(s=>'- '+s.trim()).join('\n'):'')
   +'\n\nUse the supplied evidence. If it is insufficient, report what is missing using the required output format. Do not invent source facts or claim unperformed checks.';
 }
 if(requestText.length>maxLength)fail('task_contract_too_large');
 return requestText;
}

export function requireCompleteContext(built){
 if(built.truncated)throw Object.assign(new Error('context_truncated_refused'),{code:'context_truncated_refused',preparation:{coverage:built.coverage,omittedCharacters:built.omittedCharacters,contextCharacters:built.contextCharacters,requestBytes:built.requestBytes}});
 return built;
}
