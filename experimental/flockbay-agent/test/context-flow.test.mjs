import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {ResultPages} from '../result-pages.mjs';import {runMission} from '../agent.mjs';import {openAgentStore} from '../store.mjs';import {fitContext} from '../context-budget.mjs';
test('large result pages are complete, searchable and never execute tools',()=>{const p=new ResultPages(),r={content:[{text:'x'.repeat(12000)+'func _rest_blocker\nlast'}]};let page=JSON.parse(p.put('one',r)),all=page.text;while(page.next!==null){page=JSON.parse(p.read({id:'one',offset:page.next}));all+=page.text;}assert.deepEqual(JSON.parse(all),r);assert.match(JSON.parse(p.read({id:'one',search:'func _rest_blocker'})).text,/func _rest_blocker/);assert.equal(JSON.parse(p.read({id:'missing'})).error,'unknown_result');assert.equal(JSON.parse(p.read({id:'one',offset:-1})).error,'invalid_offset');});
test('fuzzy discovery does not accumulate schemas; exact activation replaces extras and pages remain available',async()=>{
 const s=openAgentStore(':memory:'),i={id:randomUUID(),approved:true,mode:'build',prompt:'Bounded test',maxCalls:10,minutes:1};s.create(i);
 const tool=name=>({name,description:'Tool',inputSchema:{type:'object',properties:{}}});
 const huge={...tool('flockbay_play'),inputSchema:{type:'object',properties:Object.fromEntries(Array.from({length:1000},(_,i)=>['property'+i,{type:'string'}]))}};
 const names=['flockbay_godot_status','flockbay_script_read','flockbay_script_write','flockbay_script_errors'];let turn=0,executed=[];
 const steps=[['find_tools',{query:'flockbay'}],['flockbay_script_read',{}],['read_result',{id:'c2',search:'TAIL'}],['find_tools',{query:'flockbay_script_write'}],['find_tools',{query:'flockbay_script_errors'}]];
 await runMission({store:s,input:i,project:'game',catalogue:[huge,...names.map(tool)],online:()=>true,beforeModel:async b=>{b.messages=fitContext(b,8000).messages;},model:async b=>{
  turn++;assert.ok(!b.tools.some(t=>t.function.name==='flockbay_play'));
  if(turn===4)assert.match(b.messages.at(-1).content,/TAIL/);
  if(turn===5)assert.ok(b.tools.some(t=>t.function.name==='flockbay_script_write'));
  if(turn===6){assert.ok(!b.tools.some(t=>t.function.name==='flockbay_script_write'));assert.ok(b.tools.some(t=>t.function.name==='flockbay_script_errors'));return {choices:[{finish_reason:'stop',message:{content:'done'}}]};}
  const [name,args]=steps[turn-1];return {choices:[{finish_reason:'tool_calls',message:{tool_calls:[{id:'c'+turn,type:'function',function:{name,arguments:JSON.stringify(args)}}]}}]};
 },execute:async name=>{executed.push(name);return {content:[{type:'text',text:'x'.repeat(16000)+'TAIL'}]};}});
 assert.equal(s.get(i.id).state,'completed',s.get(i.id).result);assert.deepEqual(executed,['flockbay_script_read']);s.close();
});
