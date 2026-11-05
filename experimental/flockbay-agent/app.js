const $=id=>document.getElementById(id);
let draft=null,selected=null,current=null,busy=false,refreshing=false;
async function api(path,body){const r=await fetch('/development/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const data=await r.json();if(!r.ok)throw Error(data.error);return data;}
const messages={mission_deadline_expired:'This mission’s deadline has expired. No repair was sent.',repair_budget_exhausted:'This mission has no repair calls remaining.',candidate_conflict:'This candidate changed. Refresh and review the current version.',mission_already_running:'Another mission is running.',request_exceeds_minute_quota:'This source package exceeds the current request quota. No request was sent.',legacy_build_disabled_use_patch:'Direct game edits are disabled. Prepare a scoped patch instead.'};
function fail(e){$('error').textContent=messages[e.message]||e.message;}
function prepare(m){
 if(busy)throw Error('Wait for the current submission.');
 draft={...m,approved:true};
 $('summary').textContent=m.prompt+'\n\n'+m.mode+' • '+m.maxCalls+' calls • '+m.minutes+' minutes'+(m.contract?'\nWritable files: '+m.contract.files.filter(f=>f.writable).map(f=>f.path).join(', ')+'\nRequired checks: '+m.contract.checks.join(', ')+'\nMaximum repairs: '+m.contract.maxRepairs:'');
 $('sourceReview').textContent=m.contract?m.contract.files.map(f=>f.path+'\nSHA-256 '+f.sha256+'\n'+f.content).join('\n\n'):'Inspection uses read-only tools on the pinned game.';
 $('approval').hidden=false;$('error').textContent='';
}
$('form').onsubmit=e=>{e.preventDefault();try{prepare({id:crypto.randomUUID(),prompt:$('prompt').value,mode:'inspect',maxCalls:Number($('calls').value),minutes:Number($('minutes').value)});}catch(e){fail(e);}};
$('missionFile').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>256000)throw Error('Mission file is too large.');const m=JSON.parse(await file.text());if(m.mode!=='patch'||!Array.isArray(m.contract?.files)||!Array.isArray(m.contract?.checks))throw Error('Choose a prepared patch mission JSON.');prepare(m);}catch(e){fail(e);}};
$('back').onclick=()=>{if(busy)return;draft=null;$('approval').hidden=true;};
$('start').onclick=async()=>{if(busy||!draft)return;busy=true;$('start').disabled=true;try{const r=await api('missions',draft);selected=r.id;draft=null;$('approval').hidden=true;$('error').textContent='';}catch(e){fail(e);}finally{busy=false;$('start').disabled=false;await refresh();}};
$('stop').onclick=async()=>{try{await api('stop',{id:selected});await refresh();}catch(e){fail(e);}};
async function digest(files){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(files))))].map(x=>x.toString(16).padStart(2,'0')).join('');}
async function review(action){if(busy||!current||current.mission.id!==selected)return;const reason=$('reason').value.trim();if(!reason){fail(Error('Enter your review feedback first.'));return;}busy=true;$('repair').disabled=true;$('reject').disabled=true;try{const a=JSON.parse(current.mission.result);await api(action,{id:selected,candidateSha256:await digest(a.files),reason});$('reason').value='';$('error').textContent='';}catch(e){fail(e);}finally{busy=false;await refresh();}}
$('repair').onclick=()=>review('repair');$('reject').onclick=()=>review('reject');
function display(d){
 current=d;const m=d.mission;$('history').replaceChildren();for(const a of d.artifacts||[]){const link=document.createElement('a');link.href='/development/api/missions/'+m.id+'/artifacts/'+a.digest;link.download='candidate-'+a.digest+'.json';link.textContent='Download candidate '+a.digest.slice(0,12)+' • '+new Date(a.created).toLocaleString();const p=document.createElement('p');p.append(link);$('history').append(p);}$('stop').hidden=m?.state!=='running';$('changes').replaceChildren();$('reviewActions').hidden=true;
 let artifact;try{artifact=JSON.parse(m?.result);}catch{}
 if(artifact?.files){
  $('detail').textContent=m.state+' • '+m.calls+' calls\n'+artifact.proposal.summary+'\nNot applied to the game.\n'+(artifact.acceptance?.reason||'');
  for(const edit of artifact.proposal.edits){const section=document.createElement('details');section.open=true;const title=document.createElement('summary');title.textContent=edit.path;section.append(title);for(const [label,text] of [['Before',edit.old],['Proposed',edit.replacement]]){const h=document.createElement('h3');h.textContent=label;const p=document.createElement('pre');p.textContent=text;section.append(h,p);}$('changes').append(section);}
  if(m.state==='awaiting_validation'){const i=JSON.parse(m.input),remaining=Math.max(0,Math.min(i.maxCalls,1+i.contract.maxRepairs)-m.calls);$('reviewActions').hidden=false;$('repairBudget').textContent=remaining+' repair call(s) remaining. Deadline: '+new Date(m.deadline).toLocaleString();$('repair').disabled=busy||remaining===0||Date.now()>=m.deadline;$('reject').disabled=busy;}
 }else $('detail').textContent=(m?.state||'')+'\n'+(m?.result||'Working…');
 $('events').textContent=d.events.map(e=>new Date(e.at).toLocaleTimeString()+' '+e.kind+'\n'+e.text).join('\n\n');
}
async function refresh(){if(refreshing)return;refreshing=true;try{const s=await api('status');$('status').textContent=s.model+' • '+(s.connected?'Flockbay connected':'Local bridge offline');$('project').textContent=s.project;$('review').disabled=!s.connected||s.missions.some(m=>m.state==='running');$('missions').replaceChildren();for(const m of s.missions){const b=document.createElement('button');b.textContent=m.state+' • '+m.calls+'/'+m.input.maxCalls+' calls • '+m.input.prompt.slice(0,100);b.onclick=()=>{selected=m.id;current=null;refresh();};$('missions').append(b);}if(selected){const id=selected,d=await api('missions/'+id);if(id===selected)display(d);}}catch(e){fail(e);}finally{refreshing=false;}}
refresh();setInterval(refresh,3000);
