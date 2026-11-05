import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {runMission} from '../agent.mjs';import {openAgentStore} from '../store.mjs';import {fitContext} from '../context-budget.mjs';
test('bounded read edit check flow retains progress through compaction and executes each mutation once',async()=>{
 const store=openAgentStore(':memory:'),input={id:randomUUID(),approved:true,mode:'build',prompt:'Change only objective and test. Read prerequisites; run tests.',maxCalls:24,minutes:1};store.create(input);
 const tools=['flockbay_godot_status','flockbay_script_read','flockbay_guide','flockbay_script_write','flockbay_script_errors','flockbay_run_headless'].map(name=>({name,description:'Tool',inputSchema:{type:'object',properties:{}}}));
 const steps=[['flockbay_godot_status',{}],['flockbay_script_read',{path:'res://AGENTS.md'}],['flockbay_script_read',{path:'res://GAME-BRIEF.md'}],['flockbay_script_read',{path:'res://objective.gd'}],['read_result',{id:'call4',search:'TARGET'}],['flockbay_script_read',{path:'res://test.gd'}],['flockbay_guide',{name:'godot_craft'}],['find_tools',{query:'flockbay_script_write'}],['flockbay_script_write',{path:'res://objective.gd',content:'new objective'}],['flockbay_script_write',{path:'res://test.gd',content:'new test'}],['find_tools',{query:'flockbay_script_errors'}],['flockbay_script_errors',{}],['find_tools',{query:'flockbay_run_headless'}],['flockbay_run_headless',{scene:'res://test.tscn',seconds:30}]];
 let turn=0,archived=0,writes=[];
 await runMission({store,input,project:'game',catalogue:tools,online:()=>true,beforeModel:async body=>{const fit=fitContext(body,8000);archived+=fit.archived;body.messages=fit.messages;},model:async body=>{
  if(turn>=4){assert.match(body.messages[0].content,/res:\/\/AGENTS.md/);assert.match(body.messages[0].content,/call4/);}
  if(turn===steps.length)return {choices:[{finish_reason:'stop',message:{content:'Fixture flow completed'}}]};
  const [name,args]=steps[turn++];return {choices:[{finish_reason:'tool_calls',message:{tool_calls:[{id:'call'+turn,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]};
 },execute:async(name,args)=>{if(name==='flockbay_script_write'){writes.push(args.path);return {content:[{type:'text',text:'Saved'}]};}return {content:[{type:'text',text:name==='flockbay_run_headless'?'Exit 0; PASS':('x'.repeat(5000)+'TARGET source')}]};}});
 assert.equal(store.get(input.id).state,'completed',store.get(input.id).result);assert.ok(archived>0);assert.deepEqual(writes,['res://objective.gd','res://test.gd']);store.close();
});
