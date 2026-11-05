// Receipt metadata, never model-authored claims of successful implementation.
export class ProgressIndex {
 constructor(){this.entries=new Map();}
 record(id,name,args,result){
  if(name==='find_tools')return;
  const target=String(args?.path||args?.scene||args?.name||'').slice(0,180);
  this.entries.set(name+' '+target,{tool:name,target,resultId:id,outcome:result?.isError?'tool_error':'returned; inspect cached result for details'});
 }
 text(){return '\nCompleted tool calls (receipt metadata, not proof of task success). Do not restart completed prerequisite reads. Use read_result with resultId to recover contents, including earlier pages. Writes must be checked, not repeated.\n'+JSON.stringify([...this.entries.values()].slice(-12));}
}
