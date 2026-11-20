// Compose the owner workspace only when server-side admission is enabled.
// No external library, resource, credential, HTML interpolation of private data.
export function admissionConsoleHtml(base,{activationEnabled=false,workspaceEnabled=false,publicTestEnabled=false,theme='standard'}={}){
 if(activationEnabled!==true)return base;
 if(publicTestEnabled===true){if(base.split('<h2>Updater</h2>').length!==2)throw Error('admission_document_invalid');base=base.replace('<h2>Updater</h2>','<h2>Public trial</h2><p><a href="/public-test/manage">Manage test allowance →</a></p><h2>Updater</h2>');}
 if(workspaceEnabled===true)return workspaceConsoleHtml(base,{theme});
 const replace=(old,value)=>{if(base.split(old).length!==2)throw Error('admission_document_invalid');base=base.replace(old,value);};
 replace('<button id="nav-groq"','<button id="nav-requests" type="button" aria-controls="view-requests"><span class="nav-index" aria-hidden="true">03</span>Requests</button><button id="nav-groq"');
 replace('03</span>Groq','04</span>Groq');replace('04</span>System','05</span>System');
 replace('const views=[\'overview\',\'jobs\',\'groq\',\'system\'];',"const views=['overview','jobs','requests','groq','system'];");
 replace("if(focus)$('heading-'+view).focus?.();","if(focus)$('heading-'+view).focus?.();if(view==='requests'&&authenticated)void loadAdmissionCatalogue();");
 replace('<p id="detail-reason"></p>','<p id="detail-reason"></p><button id="job-open-result" type="button" hidden>Open saved result</button>');
 replace("function inspectJob(row){","function inspectJob(row){\n $('job-open-result').hidden=!(row?.state==='completed'&&row.resultAvailable);");
 replace('function clearPrivate(){','function clearPrivate(){\n clearAdmission();');
 replace('This console cannot submit or approve a request.','Use Requests to approve one exact enrolled input.');
 replace('</style>',String.raw`
.admission-workspace{display:grid;grid-template-columns:minmax(190px,1fr) minmax(0,2fr);gap:32px;align-items:start}.admission-choice{padding:18px 0;border-bottom:1px solid var(--line,#35413f)}.admission-review{border-left:1px solid var(--line,#35413f);padding-left:28px;min-width:0}.admission-review pre{white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 ui-monospace,monospace;max-height:420px;overflow:auto}.admission-review label{display:block;margin:18px 0 8px}.admission-actions{display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin:24px 0}.admission-result{margin-top:32px;border-top:1px solid var(--line,#35413f);padding-top:24px}.admission-result pre{max-height:600px}.admission-workspace select{width:100%;max-width:100%;min-height:44px}.admission-approve{min-height:44px}.admission-review p{overflow-wrap:anywhere}@media(max-width:720px){.admission-workspace{grid-template-columns:1fr;gap:20px}.admission-review{border-left:0;padding-left:0}.admission-review pre{max-height:none;overflow:visible}.admission-result pre{max-height:none}}
.admission-prompt{margin:20px 0}.admission-prompt summary,.admission-result summary{cursor:pointer;padding:10px 0;color:var(--accent)}.admission-result pre{font-size:13px}.result-text{margin:20px 0;overflow-wrap:anywhere}.result-text p,.result-text pre,.result-text h3{margin:14px 0}.result-text pre{background:var(--side);padding:16px;white-space:pre-wrap}.result-table{overflow-x:auto;max-width:100%;margin:18px 0}.result-table table{border-collapse:collapse;min-width:100%;font-size:14px}.result-table th,.result-table td{border:1px solid var(--line);padding:10px;text-align:left;vertical-align:top}.result-table th{background:var(--side)}
.result-review{border-left:2px solid var(--accent);padding:14px 16px;background:#dec38707;margin:18px 0;font-size:14px;overflow-wrap:anywhere}.result-review h3{font-size:16px}.result-review p{margin-top:10px}.result-review a{color:var(--accent);text-decoration:underline}
</style>`);
 replace('<section id="view-groq"',String.raw`<section id="view-requests" aria-labelledby="heading-requests" hidden>
<div class="view-head"><div><h1 id="heading-requests" tabindex="-1">Requests</h1><p>Review approved console requests and their saved results.</p></div><button id="admission-refresh" type="button">Refresh requests</button></div>
<p id="admission-capability" class="blocking" role="status">Availability not checked.</p>
<p id="admission-notice" role="status" aria-live="polite">Not checked</p>
<div class="admission-workspace"><div class="admission-choice"><label for="admission-entry">Approved inputs</label><select id="admission-entry"><option value="">Choose an input</option></select><p class="muted">Groq only. Free-only enrollment, $0 budget, 512 output tokens, one call. No tools, retries or paid fallback.</p></div>
<div class="admission-review"><h2 id="admission-title">Choose an input to review</h2><p id="admission-identity" class="full-ref muted"></p><details class="admission-prompt" open><summary>Exact input</summary><pre id="admission-input"></pre></details><p id="admission-context" class="muted"></p><label for="admission-slot">Request slot</label><select id="admission-slot"><option value="">Choose a slot</option></select>
<div class="admission-actions"><button id="admission-approve" class="admission-approve" type="button" disabled>Approve and queue</button><button id="admission-check" type="button" disabled>Check saved result</button></div><p id="admission-state" role="status" aria-live="polite">No request selected.</p>
<div id="admission-result" class="admission-result" hidden><h2>Saved result</h2><aside id="admission-review-note" class="result-review" aria-labelledby="admission-review-heading" hidden><h3 id="admission-review-heading">Reviewed correction</h3><p class="muted">Axiom review · November 3, 2026</p><p>The original 5-of-10 example does not cover the exact boundary. Use ("Name", 10, 10) → "0 characters remaining." for that case.</p><p><a href="https://github.com/bmartynowicz/picard-relay/blob/fb0d442c1713a4aa2f287eb46dd9b1a1882ad167/examples/form-limit-regression-cases.json" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Reviewed regression cases</a></p><p>The original response below is preserved. These are reviewed examples; the broader Board form feature remains open.</p></aside><div id="admission-formatted" class="result-text"></div><details><summary>Original saved text</summary><pre id="admission-output"></pre></details><p class="muted">Text proposal only. Nothing here has been executed.</p></div></div></div></section>
<section id="view-groq"`);
 replace('motion();void boot();',ADMISSION_SCRIPT+'\nmotion();void boot();');
 return base;
}

// Bind the review to one immutable proposal, never to a task title or future call.

export function workspaceConsoleHtml(base,{theme='standard'}={}){
 if(!['standard','captain','tricorder','captain-mobile'].includes(theme))throw Error('unknown_console_theme');
 const replace=(from,to)=>{if(base.split(from).length!==2)throw Error('workspace_document_invalid');base=base.replace(from,to);};
 replace('<button id="nav-groq"','<button id="nav-requests" type="button" aria-controls="view-requests"><span class="nav-index" aria-hidden="true">03</span>Requests</button><button id="nav-groq"');
 replace('03</span>Groq','04</span>Groq');replace('04</span>System','05</span>System');
 replace("const views=['overview','jobs','groq','system'];","const views=['overview','jobs','requests','groq','system'];");
 replace("if(focus)$('heading-'+view).focus?.();","if(focus)$('heading-'+view).focus?.();if(view==='requests'&&authenticated)void loadWorkspace();else workSchedule();updateNextActions();");
 replace('function clearPrivate(){','function clearPrivate(){\n clearWorkspace();');
 replace('function renderHUD(){','function renderHUD(){\n renderRoute();');
 replace('function motion(){',"function motion(){ $('request-sheet').dataset.motion=paused||preference.matches?'off':'on';");
 replace('This console cannot submit or approve a request.','Create a request, review its limits, and approve one call.');
 replace('<p id="detail-reason"></p>','<p id="detail-reason"></p><button id="workspace-open-job" type="button" hidden>Open request</button>');
 replace('function inspectJob(row){',"function inspectJob(row){\n $('workspace-open-job').hidden=!row;");
 replace("request('/jobs'+","request('/workspace/history'+");
 replace('return {ref:row.ref,state:row.state,createdAt:time(row.createdAt)',"return {title:typeof row.title==='string'&&row.title.length<=200?row.title:'Untitled request',ref:row.ref,state:row.state,createdAt:time(row.createdAt)");
 replace("identity.textContent=row.ref.slice(0,12);","identity.textContent=row.title||row.ref.slice(0,12);");
 replace("ref.textContent=row.ref.slice(0,12);","ref.textContent=row.title||row.ref.slice(0,12);");
 replace('<section id="view-groq"',WORKSPACE_MARKUP+'\n<section id="view-groq"');
 replace('<button id="jobs-refresh"','<div class="view-actions"><button id="next-jobs" class="request-primary" type="button" hidden>New request</button><button id="jobs-refresh"');
 replace('Refresh jobs</button></div>','Refresh jobs</button></div></div>');
 for(const view of ['groq','system'])replace('<h1 id="heading-'+view+'" tabindex="-1">'+(view==='groq'?'Groq':'System')+'</h1></div></div>','<h1 id="heading-'+view+'" tabindex="-1">'+(view==='groq'?'Groq':'System')+'</h1></div><button id="next-'+view+'" class="request-primary" type="button" hidden>New request</button></div>');
 replace('<div class="signal">',TRAINING_MARKUP+'\n<div class="signal">');
 operationsLayout(replace);
 replace('aria-label="Documentation and account" title="Documentation and account"','aria-label="Settings" title="Settings"');
 replace('<button class="logout"','<button id="walkthrough-replay" type="button" hidden>Replay walkthrough</button><button class="logout"');
 replace(' showGroq(data);'," showGroq(data);$('walkthrough-replay').hidden=false;if(!workConfigAttempted)void workLoadConfig().catch(()=>{});else renderTraining();");
 replace('<button id="walkthrough-replay"','<label class="appearance-choice" for="console-appearance">Appearance<select id="console-appearance"><option value="admiral">Admiral</option><option value="captain">Engineering</option></select></label><p id="appearance-notice" role="status"></p><div id="appearance-confirm" hidden><button id="appearance-continue" type="button">Discard text and switch</button><button id="appearance-cancel" type="button">Keep editing</button></div><button id="walkthrough-replay"');
 replace('</style>',WORKSPACE_STYLE+OPERATIONS_STYLE+'\n.appearance-choice{display:grid;gap:6px;padding:10px 12px;font-size:12px}.appearance-choice select{width:100%;min-height:36px;color:var(--text);background:var(--bg);border:1px solid var(--line);border-radius:6px;padding:6px}#appearance-notice:empty{display:none}#appearance-notice{max-width:230px;padding:8px 12px;font-size:12px}\n</style>');
 replace('motion();void boot();',WORKSPACE_SCRIPT()+'\nmotion();void boot();');
 base=base.replace('renderWorkspaceResult(workResult);}workNotice(workFresh?', 'renderWorkspaceResult(workResult);revealWindshieldResult(ref);}workNotice(workFresh?');
 return theme==='captain'?captainConsoleHtml(base):theme==='standard'?base:tricorderConsoleHtml(base,{forced:theme==='tricorder'});
}

// Operations layout shared by every appearance: routing, actionable counters,
// job inspector, provider lead, system statuses and technical details. Only
// presentation of already-observed state; no new request or approval path.
function operationsLayout(replace){
 replace('<h1 id="heading-overview" tabindex="-1">Overview</h1></div></div>','<h1 id="heading-overview" tabindex="-1">Overview</h1></div></div>'+ROUTE_MARKUP);
 for(const [label,id] of [['Queued','queued'],['Running','invoking'],['Completed','completed'],['Uncertain','uncertain'],['Failed','failed']])replace('<dt>'+label+'</dt><dd id="'+id+'" class="unknown">-</dd>','<dt>'+label+'</dt><dd id="'+id+'" class="unknown">-</dd><button id="open-count-'+id+'" class="count-open" type="button" data-filter="'+id+'" hidden>Show '+label.toLowerCase()+' jobs</button>');
 replace('<option value="completed">Completed</option></select>','<option value="completed">Completed</option><option value="queued">Queued</option><option value="invoking">Running</option><option value="uncertain">Uncertain</option><option value="failed">Failed</option></select>');
 replace("filter==='completed'&&row.state==='completed';","filter==='completed'&&row.state==='completed'||filter==='queued'&&row.state==='queued'||filter==='invoking'&&['claimed','invoking'].includes(row.state)||filter===row.state&&['uncertain','failed'].includes(row.state);");
 replace('for(const state of states)renderCounter($(state),data.jobs[state],previous?.jobs[state]);',"for(const state of states)renderCounter($(state),data.jobs[state],previous?.jobs[state]);for(const state of states)$('open-count-'+state).hidden=!(data.jobs[state]>0);systemStatus('runtime',[summary.tone,summary.label]);");
 replace("selectedRef=null;$('navigation').hidden=true;","selectedRef=null;$('navigation').hidden=true;for(const state of states)$('open-count-'+state).hidden=true;");
 // Jobs: titled inspector with a close control (a drawer on narrow screens);
 // keyboard focus stays on the same job while live refresh repaints the list.
 replace('<aside class="job-inspector" aria-label="Selected job"><h2>Job details</h2>','<aside class="job-inspector" aria-label="Selected job"><div class="inspector-head"><h2>Job details</h2><button id="inspector-close" type="button" hidden>Close details</button></div>');
 replace('<div id="job-details" hidden><dl class="metadata">','<div id="job-details" hidden><h3 id="detail-title" class="detail-title"></h3><dl class="metadata">');
 // Outcome first; identity and detailed timestamps beneath it.
 const jobIdentity='<dt>Reference</dt><dd class="full-ref" id="detail-ref" tabindex="-1">-</dd>',times='<dt>Created</dt><dd id="detail-created">-</dd><dt>Updated</dt><dd id="detail-updated">-</dd>';
 replace(jobIdentity,'');replace(times,'');
 replace('<button id="workspace-open-job" type="button" hidden>Open request</button>','<button id="workspace-open-job" type="button" hidden>Open request</button><dl class="metadata detail-identity">'+jobIdentity+times+'</dl>');
 replace("function inspectJob(row){\n $('workspace-open-job').hidden=!row;","function inspectJob(row){\n $('workspace-open-job').hidden=!row;$('inspector-close').hidden=!row;$('detail-title').textContent=row?row.title||'Untitled request':'';$('detail-state').dataset.state=row?.state??'';$('private').dataset.inspecting=String(!!row);");
 replace("state.className='job-state';state.textContent=row.state;","state.className='job-state';state.dataset.state=row.state;state.textContent=row.state;");
 replace("state.className='activity-state';state.textContent=row.state;","state.className='activity-state';state.dataset.state=row.state;state.textContent=row.state;");
 replace("button.type='button';button.className='job-row';","button.type='button';button.className='job-row';button.dataset.ref=row.ref;");
 replace(" $('jobs-list').replaceChildren();$('jobs-empty')"," const keepFocus=document.activeElement?.closest?.('#jobs-list')?document.activeElement.dataset.ref:null;$('jobs-list').replaceChildren();$('jobs-empty')");
 replace(' inspectJob(jobRows.find(row=>row.ref===selectedRef)??null);for(const listId',` if(keepFocus)$('jobs-list').querySelector('[data-ref="'+keepFocus+'"]')?.focus({preventScroll:true});inspectJob(jobRows.find(row=>row.ref===selectedRef)??null);paintGroqLast();renderRoute();for(const listId`);
 // Groq: availability, model and last call first; outcomes link to Jobs.
 replace('<p id="groq-blocking" class="blocking">No verified observation.</p>','<p id="groq-blocking" class="blocking">No verified observation.</p><dl class="groq-lead"><div><dt>Model</dt><dd>openai/gpt-oss-20b</dd></div><div><dt>Last recorded job</dt><dd id="groq-last">No recorded job in loaded history</dd></div></dl><button id="groq-last-open" type="button" hidden>Open job</button>');
 replace('<h2>Live relay activity</h2>','<h2>Recent relay jobs</h2>');
 replace('<dl class="readiness"><div><dt>Queued</dt><dd id="groq-queued">','<dl class="readiness" hidden><div><dt>Queued</dt><dd id="groq-queued">');
 // System: one status per area; identities and fingerprints under Technical details.
 const identity='<dt>Version</dt><dd id="runtime-version">Not checked</dd><dt>Sequence</dt><dd id="runtime-sequence">Not checked</dd><dt>Source commit</dt><dd id="source-commit" class="full-ref">Not checked</dd>';
 const fingerprint='<div class="technical"><h2>Release fingerprint</h2><p class="subtle">Identifies the runtime observation. Service health alone does not verify an update.</p><p class="fingerprint" id="fingerprint">No verified observation</p></div>';
 const sources='<dl class="policy"><dt>Installed source</dt><dd id="upstream-installed">Unknown</dd><dt>Last incorporated</dt><dd id="upstream-incorporated">Unknown</dd><dt>Fork main</dt><dd id="upstream-fork">Unknown</dd><dt>Brian’s main</dt><dd id="upstream-latest">Unknown</dd><dt>Last successful check</dt><dd id="upstream-checked">Not checked</dd></dl>';
 const explanation='<p id="updater-explanation" class="subtle updater-explanation" role="status">No verified updater observation.</p>';
 replace(identity,'');replace(fingerprint,'');replace(explanation,'');
 replace(sources,'<dl class="policy"><dt>Last successful check</dt><dd id="upstream-checked">Not checked</dd></dl>');
 replace('<h2>Runtime</h2>','<h2>Runtime</h2><p id="system-runtime-status" class="system-status" data-tone="unknown">Not checked</p>');
 replace('<h2>Updater</h2>','<h2>Updater</h2><p id="system-updater-status" class="system-status" data-tone="unknown">Not checked</p>'+explanation);
 replace('<h2 id="upstream-heading">Brian’s upstream</h2>','<h2 id="upstream-heading">Brian’s upstream</h2><p id="system-upstream-status" class="system-status" data-tone="unknown">Not checked</p>');
 replace('<div class="system-account-actions">','<details class="technical-details"><summary>Technical details</summary><h2>Runtime identity</h2><dl class="policy">'+identity+'</dl><h2>Source identities</h2>'+sources.replace('<dt>Last successful check</dt><dd id="upstream-checked">Not checked</dd>','')+fingerprint+'</details><div class="system-account-actions">');
 replace("$('updater-explanation').textContent=updaterReasons[reason];","$('updater-explanation').textContent=updaterReasons[reason];systemStatus('updater',reason==='activity_not_connected'?['warn','Updater feed not installed']:state==='enabled'?['good','Reporting · updates enabled']:state==='held'?['bad','On hold · operator review needed']:state==='error'?['bad','Updater error']:state==='disabled'?['warn','Updates disabled']:['unknown','Status unknown']);");
 replace(":'Unable to check upstream';",":'Unable to check upstream';systemStatus('upstream',valid&&value.state==='checking'?['unknown','Checking']:!ready?['bad','Upstream check failed']:value.state==='current'?['good','Caught up']:['warn',value.state==='upstream_available'?'Changes available · gated review required':'Deployment pending']);");
 // Savings: never show a missing measurement as zero.
 replace("headline.textContent=unavailable?'Rolling savings unavailable':'Rolling savings not yet measured';","$('codex-savings').dataset.savings=unavailable||usage?.state==='unavailable'?'unavailable':usage?.state==='ready'?'awaiting':'disconnected';headline.textContent=unavailable?'Rolling savings unavailable':usage?.state==='unavailable'?'Usage unavailable':usage?.state==='ready'?'Awaiting usage':'Connect Codex';");
 replace('headline.textContent=rolling.savedCredits===0?',"$('codex-savings').dataset.savings='measured';headline.textContent=rolling.savedCredits===0?");
}

const WORK_RANKS=[['Commander',5],['Captain',25],['Admiral',100]];
// Request routing: the path a request actually takes. The current stage is
// derived only from observed workspace and job state (renderRoute).
const ROUTE_MARKUP=String.raw`<section class="route-map" aria-labelledby="route-heading"><div class="route-head"><h2 id="route-heading">Request routing</h2><p id="route-status" role="status" aria-live="polite">Not checked</p></div>
<ol class="route-stages" aria-label="Request path, not a connectivity indicator"><li id="route-stage-client" data-stage="client"><span>Coding client</span><small>Writes the request</small></li><li id="route-stage-approval" data-stage="approval"><span>Your approval</span><small>Before any provider call</small></li><li id="route-stage-relay" data-stage="relay"><span>Picard Relay</span><small>Queues one approved call</small></li><li id="route-stage-provider" data-stage="provider"><span>Groq</span><small>Runs the call once</small></li><li id="route-stage-review" data-stage="review"><span>Your review</span><small>After the result returns</small></li></ol>
<button id="route-open" type="button" hidden>Open job</button></section>`;
const OPERATIONS_STYLE=String.raw`
.route-map{margin:0 0 28px;padding:0 0 22px;border-bottom:1px solid var(--line)}.route-head{display:flex;justify-content:space-between;align-items:baseline;gap:8px 16px;flex-wrap:wrap}.route-head h2{font-size:16px}#route-status{margin:0;color:var(--muted);font-size:14px}.route-stages{display:flex;flex-wrap:wrap;gap:8px;list-style:none;padding:0;margin:14px 0}.route-stages li{flex:1 1 120px;padding:10px 12px;border:1px solid var(--line);border-radius:6px;color:var(--muted);font-size:12px}.route-stages span{display:block;color:var(--text);font-size:14px;font-weight:600}.route-stages [aria-current=step]{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}.console:is([data-route-phase=failed],[data-route-phase=uncertain],[data-route-phase=unknown],[data-route-phase=blocked],[data-route-phase=cancelled]) .route-stages [aria-current=step]{border-color:var(--warn);box-shadow:inset 0 0 0 1px var(--warn)}
.counts>div{position:relative}.count-open{position:absolute;inset:0;width:100%;height:100%;margin:0;padding:0;border:0;border-radius:inherit;background:none;color:transparent;font-size:0;cursor:pointer}.count-open:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.inspector-head{display:flex;justify-content:space-between;align-items:center;gap:8px}.detail-title{margin:4px 0 12px;font-size:17px;overflow-wrap:anywhere}
.groq-lead{display:flex;flex-wrap:wrap;gap:12px 32px;margin:16px 0}.groq-lead dt{color:var(--muted);font-size:12px}.groq-lead dd{margin:2px 0 0}
.system-status{margin:4px 0 12px;font-size:13px;color:var(--muted)}.system-status[data-tone=good]{color:var(--good)}.system-status[data-tone=warn],.system-status[data-tone=bad]{color:var(--warn)}.technical-details{margin-top:28px}.technical-details summary{cursor:pointer;padding:8px 0;color:var(--muted)}
.request-summary{display:grid;gap:10px;margin:14px 0}.request-summary dt{color:var(--muted);font-size:12px}.request-summary dd{margin:2px 0 0;color:var(--text)}.request-call-note{margin:16px 0 0;font-size:13px;color:var(--warn)}.request-call-note:has(+.request-actions #request-approve[hidden]){display:none}
@media(max-width:700px){.job-inspector:has(#job-details:not([hidden])){position:fixed;inset:auto 0 0;z-index:30;max-height:72vh;overflow:auto;padding:16px;background:var(--surface);border-top:1px solid var(--line);box-shadow:0 -12px 32px #000a}}
`;
const TRAINING_MARKUP=String.raw`<section class="training" aria-labelledby="training-heading">
<div class="training-heading"><h2 id="training-heading">Your progress</h2><strong id="training-title">Checking progress</strong></div>
<p id="training-next" class="muted">Your existing work counts.</p>
<progress id="training-progress" max="3" value="0" aria-label="Training progress not checked" hidden></progress><p id="training-remaining" class="muted" hidden></p>
<ol class="training-steps" aria-label="Training milestones"><li id="training-setup">Setup</li><li id="training-result">First result</li><li id="training-review">Review</li></ol>
<button id="training-action" type="button" disabled>Check progress</button>
<details id="first-run-walkthrough" hidden><summary id="walkthrough-heading">First request walkthrough</summary><ol>
<li>In <strong>Requests</strong>, choose <strong>A checklist</strong> and add notes you can share with Groq.</li>
<li>Select <strong>Review request</strong>. Check the exact input, then approve one call.</li>
<li>Open the saved answer and accept it or request changes to earn Lieutenant.</li>
</ol></details>
<details><summary>Rank guide</summary><dl class="rank-guide">
<dt>Cadet</dt><dd>Sign in to check setup and history.</dd>
<dt>Ensign</dt><dd>Finish setup to send a request and review its answer.</dd>
<dt>Lieutenant</dt><dd>Review a saved answer to unlock more templates, context, task links and code exports.</dd>
${WORK_RANKS.map(([rank,count])=>'<dt>'+rank+'</dt><dd>'+count+' completed results.</dd>').join('')}
</dl></details></section>`;

const WORKSPACE_STYLE=String.raw`
.training details{margin-top:12px;font-size:13px}.training summary{cursor:pointer;color:var(--accent);width:fit-content;padding:6px 0}
.training details ol{padding-inline-start:24px;line-height:1.7;margin:6px 0}.rank-guide{display:grid;grid-template-columns:auto minmax(0,1fr);gap:6px 12px;margin:6px 0}.rank-guide dt{font-weight:600}.rank-guide dd{margin:0;color:var(--muted)}
.view-actions{display:flex;gap:8px;flex-wrap:wrap}.view-actions button{font-size:13px}.training{padding:0 0 24px;margin:0 0 4px}.training-heading{display:flex;align-items:baseline;justify-content:space-between;gap:16px}.training-heading h2{font-size:16px;font-weight:550}.training-heading strong{color:var(--accent);font-size:14px}.training>p{margin-top:8px;max-width:65ch}.training progress{display:block;appearance:none;width:100%;height:3px;border:0;background:var(--line);accent-color:var(--accent);margin:16px 0}.training progress::-webkit-progress-bar{background:var(--line)}.training progress::-webkit-progress-value{background:var(--accent)}.training progress::-moz-progress-bar{background:var(--accent)}.training-steps{display:flex;gap:24px;flex-wrap:wrap;list-style:none;padding:0;margin:14px 0;color:var(--muted);font-size:12px}.training-steps li:before{content:"◇";margin-right:6px}.training-steps [data-earned="true"]{color:var(--accent)}.training-steps [data-earned="true"]:before{content:"◆"}.training #training-action{font-size:13px}.advanced-locked{font-size:12px;color:var(--muted);margin-top:18px}.request-tools,.request-actions,.result-tools{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.request-tools{margin-bottom:24px}.request-tools .muted{margin-left:auto}.request-actions{margin-top:24px}.request-primary{background:var(--accent);color:var(--bg);border-color:var(--accent);font-weight:600}.request-primary:hover:not(:disabled){background:#e8d2a6;color:var(--bg)}.request-grid{display:grid;grid-template-columns:minmax(0,1fr) 240px;gap:36px;align-items:start}.request-form{max-width:760px}.request-form label,.request-review-form label{display:block;margin:20px 0 7px;font-size:14px;font-weight:550}.request-form input,.request-form textarea,.request-form select,.request-review-form textarea{width:100%;max-width:100%;border:1px solid var(--line);border-radius:4px;background:var(--side);color:var(--text);padding:10px 12px;font:inherit;min-height:44px}.request-form textarea,.request-review-form textarea{resize:vertical;line-height:1.65}.request-form textarea:focus,.request-review-form textarea:focus{outline:2px solid var(--accent);outline-offset:3px}.request-form .field-note{display:flex;justify-content:space-between;gap:10px;margin-top:6px;font-size:12px;color:var(--muted)}.request-form details{margin-top:18px}.request-form summary{cursor:pointer;color:var(--muted);padding:8px 0}.request-aside{border-left:1px solid var(--line);padding-left:24px;font-size:13px;line-height:1.65}.request-aside h2{font-size:15px}.request-aside p{margin-top:12px;color:var(--muted)}.request-aside summary{cursor:pointer;color:var(--accent);padding:10px 0}.request-aside li{margin:8px 0}.request-aside strong{color:var(--text);font-weight:500}.request-status{min-height:24px;color:var(--muted);margin:12px 0 24px;font-size:13px;overflow-wrap:anywhere}.request-status[data-tone="warn"]{color:var(--warn)}.request-sheet{max-width:1040px;min-width:0;animation:request-reveal 160ms ease-out}.request-sheet h2{font-size:25px;overflow-wrap:anywhere}.request-steps{display:flex;list-style:none;padding:0;margin:0 0 28px;border-bottom:1px solid var(--line);gap:28px;color:var(--muted);font-size:13px}.request-steps li{padding:0 0 12px}.request-steps li[aria-current="step"]{color:var(--accent);border-bottom:2px solid var(--accent)}.request-state-line{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:16px}.request-state-label{font-size:13px;text-transform:uppercase;letter-spacing:.09em;color:var(--accent)}.request-observed{font-size:12px;color:var(--muted)}.request-exact{margin:24px 0}.request-exact h3{margin-bottom:8px;color:var(--muted)}.request-exact pre,.request-original{white-space:pre-wrap;overflow-wrap:anywhere;font:14px/1.7 ui-monospace,Consolas,monospace;margin:0}.request-limit-list{display:flex;gap:12px 28px;flex-wrap:wrap;margin:24px 0;padding:18px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:13px}.request-limit-list dt{color:var(--muted);margin-bottom:3px}.request-limit-list dd{margin:0}.request-caution{font-size:13px;color:var(--muted);max-width:76ch;line-height:1.7}.request-result{margin:32px 0}.request-output{font-size:15px;line-height:1.75;overflow-wrap:anywhere}.request-output p,.request-output h3{margin:14px 0}.request-output ul,.request-output ol{padding-left:24px}.request-output .code-output{margin:20px 0;background:var(--side)}.code-output header{padding:10px 14px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:12px;color:var(--muted)}.code-output button{padding:5px 10px;font-size:12px}.code-output pre{margin:0;padding:18px;white-space:pre-wrap;overflow-wrap:anywhere;font:13px/1.7 ui-monospace,Consolas,monospace}.request-table{max-width:100%;overflow:auto}.request-table table{border-collapse:collapse;width:100%;font-size:13px}.request-table td,.request-table th{border-bottom:1px solid var(--line);padding:10px;text-align:left;vertical-align:top}.request-provenance{margin:24px 0;font-size:12px;color:var(--muted);overflow-wrap:anywhere}.request-provenance summary,.request-result details summary{padding:10px 0;cursor:pointer;color:var(--muted)}.request-provenance dl{display:grid;grid-template-columns:140px minmax(0,1fr);gap:8px 16px}.request-provenance dd{margin:0;font-family:ui-monospace,Consolas,monospace}.request-review-form{border-top:1px solid var(--line);padding-top:24px;margin-top:32px}.request-review-form h3{font-size:18px}.request-review-form p{font-size:13px;color:var(--muted);margin:8px 0}.request-review-form textarea{max-width:760px}.request-review-form select{min-height:44px;max-width:100%}.request-review-form>details{margin-top:18px}.request-review-history{font-size:13px;margin:20px 0;padding-left:20px;overflow-wrap:anywhere}.request-review-history li{margin:10px 0;white-space:pre-wrap}.request-review-summary{color:var(--accent)!important}.request-correction{border-left:2px solid var(--accent);padding:14px 18px;margin:20px 0;font-size:13px}.request-correction p{margin:8px 0}.commissioning{display:flex;align-items:center;gap:12px;margin-top:24px;padding-top:20px;border-top:1px solid var(--line)}.commission-seal{font-size:26px;color:var(--muted);width:34px;flex:none;text-align:center}.commissioning strong{font-size:14px}.commissioning p{margin-top:3px;font-size:12px}.commissioning[data-earned="true"] .commission-seal,.commissioning[data-earned="true"] strong{color:var(--accent)}.request-setup{border-top:1px solid var(--line);margin-top:28px;padding-top:20px}.request-setup ul{padding-left:18px}.request-setup a{color:var(--accent)}.request-empty-illustration{width:100%;height:auto;max-width:230px;margin:14px 0;color:var(--accent)}.request-sheet[data-motion="off"]{animation:none}@keyframes request-reveal{from{opacity:.6;transform:translateY(5px)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.request-sheet{animation:none}}@media(max-width:1000px){.request-grid{grid-template-columns:minmax(0,1fr);gap:28px}.request-aside{border-left:0;border-top:1px solid var(--line);padding:24px 0 0;max-width:760px}.request-empty-illustration{display:none}}@media(max-width:520px){.request-steps{gap:15px;font-size:12px}.request-limit-list{gap:14px 20px}.request-tools .muted{margin-left:0;width:100%}.request-state-line{align-items:flex-start;flex-direction:column}.request-provenance dl{grid-template-columns:1fr;gap:3px}.request-provenance dd{margin-bottom:10px}.request-actions button{min-height:44px}.request-form .field-note{font-size:11px}}
`;

const WORKSPACE_MARKUP=String.raw`<section id="view-requests" aria-labelledby="heading-requests" hidden>
<div class="view-head"><div><h1 id="heading-requests" tabindex="-1">Requests</h1></div></div>
<div class="request-tools"><button id="request-new" type="button">New request</button><button id="request-refresh" type="button">Refresh</button><span id="request-provider" class="muted">Checking provider…</span></div>
<p id="request-notice" class="request-status" role="status" aria-live="polite"></p>
<div id="request-compose" class="request-grid">
<form id="request-form" class="request-form">
<label for="request-template">Start with</label><select id="request-template"><option value="custom">A blank request</option><option value="checklist">A checklist</option><option id="request-template-code" value="code" disabled>A code proposal · Lieutenant</option><option id="request-template-review" value="review" disabled>A review · Lieutenant</option><option value="explain">An explanation</option></select>
<label for="request-title">Task title</label><input id="request-title" maxlength="200" required autocomplete="off" placeholder="What are you working on?"><div class="field-note"><span></span><span id="request-title-count">0 / 200</span></div>
<label for="request-text">What should Picard do?</label><textarea id="request-text" rows="7" maxlength="4000" required placeholder="Describe the result you need and what a good answer should include."></textarea><div class="field-note"><span></span><span id="request-text-count">0 / 4,000</span></div>
<div id="request-advanced" hidden><details id="request-context-details"><summary>Add context or a task reference</summary><label for="request-context">Supporting context</label><textarea id="request-context" rows="4" maxlength="4000" placeholder="Constraints, relevant text, or a short source excerpt."></textarea><div class="field-note"><span>Only include information you intend to send to Groq.</span><span id="request-context-count">0 / 4,000</span></div><label for="request-task">Task reference (optional)</label><input id="request-task" maxlength="200" autocomplete="off" placeholder="An existing task-board task ID"><p class="field-note">Links this request to the task ID. Review decisions stay in Picard.</p><label for="request-purpose">Type of work</label><select id="request-purpose"><option value="sanitized-source-proposal">Draft or propose</option><option value="public-source-review">Review public material</option></select></details></div><p id="advanced-locked" class="advanced-locked">Review a saved answer to unlock context and task links.</p>
<div class="request-actions"><button id="request-prepare" class="request-primary" type="submit">Review request</button></div><p class="request-caution">Reviewing does not call Groq. Approve the exact input next.</p>
</form>
<aside class="request-aside"><h2>One call. Saved result.</h2><svg class="request-empty-illustration" viewBox="0 0 230 100" role="img" aria-label="An approved request travels to the provider, then becomes a saved result"><path d="M25 50H205" stroke="currentColor" opacity=".35" fill="none"/><g fill="var(--side)" stroke="currentColor"><rect x="6" y="29" width="42" height="42" rx="4"/><circle cx="115" cy="50" r="23"/><rect x="184" y="29" width="40" height="42" rx="4"/></g><g fill="none" stroke="currentColor" stroke-width="2"><path d="m18 49 6 6 12-13M106 43h18m-18 7h13m-13 7h18m72-15h16m-16 8h16m-16 8h10"/></g></svg><dl class="request-summary" aria-label="Request summary"><div><dt>Model</dt><dd>Groq · openai/gpt-oss-20b</dd></div><div><dt>Attached context</dt><dd id="request-summary-context">None attached</dd></div><div><dt>Limits</dt><dd>One call · up to 4,096 output tokens · no tools or automatic retries</dd></div></dl><p>Free-plan enrollment; live billing and quota are unknown.</p><div id="commissioning" class="commissioning" data-earned="false"><span class="commission-seal" aria-hidden="true">✦</span><div><strong id="commission-title">Cadet</strong><p id="commission-note">Finish setup to earn Ensign.</p></div></div><details class="request-setup"><summary>Setup status</summary><ul id="request-setup-list"></ul><a href="https://github.com/bmartynowicz/picard-relay/blob/main/docs/V1.md" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer">Workflow guide ↗</a></details></aside>
</div>
<article id="request-sheet" class="request-sheet" hidden aria-labelledby="request-sheet-title">
<ol class="request-steps" aria-label="Request progress"><li id="request-step-review">01 · Review</li><li id="request-step-run">02 · Run</li><li id="request-step-result">03 · Result</li></ol>
<div class="request-state-line"><span id="request-state" class="request-state-label"></span><span id="request-observed" class="request-observed"></span></div><h2 id="request-sheet-title" tabindex="-1"></h2><p id="request-next" class="request-status"></p>
<div id="request-exact" class="request-exact"><h3>Exact input</h3><pre id="request-exact-text"></pre><div id="request-exact-context-wrap" hidden><h3>Supporting context</h3><pre id="request-exact-context"></pre></div></div>
<dl id="request-limits" class="request-limit-list"></dl><p id="request-cost" class="request-caution"></p><p class="request-call-note">Approving sends this exact input to Groq once. Nothing is sent before you approve.</p>
<div class="request-actions"><button id="request-approve" class="request-primary" type="button" hidden>Approve one call</button><button id="request-edit" type="button" hidden>Edit brief</button><button id="request-check" type="button">Check saved status</button></div>
<section id="request-result" class="request-result" hidden aria-label="Saved result"><div class="result-tools"><button id="request-copy" type="button">Copy answer</button><button id="request-download" type="button">Download answer</button><button id="request-handoff" type="button">Download handoff</button></div><aside id="request-correction" class="request-correction" hidden><strong>Reviewed correction · November 3, 2026</strong><p>The original 5-of-10 example misses the exact boundary. Use ("Name", 10, 10) → "0 characters remaining." for that case.</p><p>The original answer is preserved below.</p></aside><div id="request-output" class="request-output"></div><details><summary>Original saved text</summary><pre id="request-original" class="request-original" tabindex="0"></pre></details>
<div class="request-review-form"><h3>Your review</h3><p id="request-review-summary" class="request-review-summary">Not reviewed.</p><p>Your review will not run another call.</p><label for="request-review-note">Review note (optional)</label><textarea id="request-review-note" rows="3" maxlength="2000"></textarea><div class="request-actions"><button id="request-accept" type="button">Accept result</button><button id="request-changes" type="button">Request changes</button></div><details id="request-review-details" hidden><summary>Review history</summary><ol id="request-review-history" class="request-review-history"></ol></details>
<details id="request-grade-details"><summary>Quality · <span id="request-grade-summary">Ungraded</span></summary><label for="request-grade-score">Score</label><select id="request-grade-score"><option value="">Choose a score</option><option value="1">1 · Poor</option><option value="2">2 · Needs work</option><option value="3">3 · Useful</option><option value="4">4 · Good</option><option value="5">5 · Excellent</option></select><label for="request-grade-note">Quality note (optional)</label><textarea id="request-grade-note" rows="2" maxlength="500"></textarea><div class="request-actions"><button id="request-grade-save" type="button">Save grade</button></div><p class="muted">Grades do not accept an answer or earn rank.</p><details id="request-grade-history-details" hidden><summary>Grade history</summary><ol id="request-grade-history" class="request-review-history"></ol></details></details></div></section>
<details class="request-provenance"><summary>Request details and provenance</summary><dl id="request-provenance"></dl></details>
</article>
</section>`;

// Trim generated-code indentation to retain the fixed console/preview byte cap.
const WORKSPACE_SCRIPT=()=>String.raw`
const workspaceCorrection=${JSON.stringify(REVIEWED_REGRESSION_RESULT)};
const workRanks=${JSON.stringify(WORK_RANKS)};
let walkthroughReviewed;
let workConfigAttempted=false,workConfigFlight=null,workGraduated=false,workProgress=null;
let workConfig=null,workDraft=null,workResult=null,workRef=null,workBusy=false,workGeneration=0,workTimer=null,workRead=null,workFresh=false,workDraftId=null,workHandoff='';
const workControllers=new Set(),workDownloads=new Set();
const workFields=['request-title','request-text','request-context','request-task'];
const appearance=$('console-appearance');
const currentAppearance=['captain','tricorder'].includes($('console-surface').dataset.consoleTheme)?$('console-surface').dataset.consoleTheme:'admiral';
appearance.value=currentAppearance;
let pendingAppearance=null;
const applyAppearance=next=>{
 if(workBusy){$('appearance-notice').textContent='Wait for the current request operation to finish before switching appearance.';return;}
 document.cookie='PicardAppearance='+next+'; Path=/; Max-Age=31536000; SameSite=Strict'+(location.protocol==='https:'?'; Secure':'');
 const preferences=document.cookie.split(';').map(s=>s.trim()).filter(s=>s.startsWith('PicardAppearance='));
 if(preferences.length!==1||preferences[0]!=='PicardAppearance='+next){$('appearance-notice').textContent='Allow site preference cookies to switch appearance.';return;}
 location.reload();
};
appearance.addEventListener('change',()=>{
 const next=appearance.value;appearance.value=currentAppearance;
 pendingAppearance=null;$('appearance-confirm').hidden=true;$('appearance-notice').textContent='';
 if(!['admiral','captain','tricorder'].includes(next)||next===currentAppearance)return;
 if(workBusy){$('appearance-notice').textContent='Wait for the current request operation to finish before switching appearance.';return;}
 const unsaved=[...document.querySelectorAll('input,textarea')].some(el=>!el.disabled&&el.type!=='hidden'&&el.type!=='checkbox'&&el.type!=='radio'&&el.getClientRects().length&&el.value);
 if(unsaved){pendingAppearance=next;$('appearance-notice').textContent='Switching reloads this page and discards unsaved text. Saved requests and results are kept.';$('appearance-confirm').hidden=false;return;}
 applyAppearance(next);
});
$('appearance-continue').addEventListener('click',()=>{if(pendingAppearance)applyAppearance(pendingAppearance);});
$('appearance-cancel').addEventListener('click',()=>{pendingAppearance=null;$('appearance-confirm').hidden=true;$('appearance-notice').textContent='';});

function stopWorkspacePoll(){clearTimeout(workTimer);workTimer=null;}
function workNotice(text,warn=false){$('request-notice').textContent=text;$('request-notice').dataset.tone=warn?'warn':'';}
function renderWorkHandoff(){$('request-state').textContent=workHandoff==='saved'?'Approval saved':'Handoff unconfirmed';$('request-next').textContent='Check saved status for this exact request.';}
// Ranks teach the interface; they never grant provider or execution authority.
function rememberProgress(c){
 const age=Date.now()-Date.parse(c?.observedAt),t=c?.training,s=c?.setup;
 if(!c||!Number.isFinite(age)||age< -5000||age>=60000||t?.v!==1||typeof t.hasSavedResult!=='boolean'||typeof t.hasReviewedResult!=='boolean'||t.hasReviewedResult&&!t.hasSavedResult||!s||['ownerAuthentication','durableStorage','providerEnrollment'].some(k=>typeof s[k]!=='boolean'))return;
 const p=c.progress,completedWork=p?.v===2&&Number.isSafeInteger(p.completedWork)&&p.completedWork>=0&&p.completedWork<=100&&typeof p.atLeast==='boolean'&&p.atLeast===(p.completedWork===100)?p.completedWork:null;
 workProgress={reviewed:workProgress?.reviewed===true||t.hasReviewedResult,saved:workProgress?.saved===true||t.hasSavedResult,setup:workProgress?.setup===true||s.ownerAuthentication&&s.durableStorage&&s.providerEnrollment||t.hasSavedResult,completedWork};
}
function trainingState(){
 if(!workProgress)return null;
 const current=workFresh&&workResult?.resultAvailable===true,reviewed=workProgress.reviewed||workGraduated||current&&workResult.review.revision>0,saved=workProgress.saved||reviewed||current,setup=workProgress.setup||saved;
 const n=workProgress.completedWork,rank=reviewed?(workRanks.findLast(([,count])=>n>=count)?.[0]??'Lieutenant'):setup?'Ensign':'Cadet';
 return {rank,completedWork:n,setup,saved,reviewed,step:reviewed?3:saved?2:setup?1:0};
}
function workAdvanced(){return trainingState()?.reviewed===true;}
function clearTraining(){
 renderRoute();
 $('training-remaining').hidden=true;$('training-remaining').textContent='';
 for(const view of ['jobs','groq','system']){$('next-'+view).hidden=true;$('next-'+view).disabled=true;}
 $('training-rank').textContent='';$('training-rank').hidden=true;delete $('logo-wrap').dataset.rank;
 $('training-title').textContent='Progress not checked';$('training-next').textContent='Refresh to check your progress.';$('training-progress').hidden=true;$('training-progress').value=0;$('training-progress').setAttribute('aria-label','Training progress not checked');$('training-action').disabled=true;
 for(const id of ['training-setup','training-result','training-review']){$(id).dataset.earned='false';$(id).setAttribute('aria-label','Milestone not checked');}
 $('commissioning').dataset.earned='false';$('commission-title').textContent='Cadet';$('commission-note').textContent='Check setup to earn your first rank.';$('request-advanced').hidden=true;$('advanced-locked').hidden=false;
}
function renderTraining(){
 renderRoute();
 const t=trainingState();if(!t){clearTraining();return;}
 if(t.reviewed!==walkthroughReviewed){
  const guide=$('first-run-walkthrough');
  if(!t.reviewed){guide.hidden=false;guide.open=true;}
  else if(walkthroughReviewed===false){
   if(guide.contains?.(document.activeElement))$('training-action').focus?.();
   guide.open=false;guide.hidden=true;
  }
  walkthroughReviewed=t.reviewed;
 }
 const copy=t.reviewed?['Lieutenant earned','Advanced tools unlocked: code templates, context, task links and code/handoff exports.','Use advanced tools']:t.saved?['Ensign','Review a saved answer to earn Lieutenant and unlock advanced tools.','Review your first result']:t.setup?['Welcome aboard, Ensign','Setup complete. Complete and review your first request to unlock advanced tools.','Start your first request']:['Cadet','Finish setup to earn Ensign and unlock your first request.','Check setup'];
 if(t.reviewed){const n=t.completedWork,next=workRanks.find(([,count])=>n<count);copy[0]=t.rank+(t.rank==='Lieutenant'?' earned':'');copy[1]=n===null?'Work milestones unavailable.':next?n+' completed '+(n===1?'result':'results')+' · '+(next[1]-n)+' to '+next[0]+'.':'100+ completed results. Admiral earned.';}
 $('training-remaining').hidden=true;$('training-remaining').textContent='';
 if($('console-surface').dataset.consoleTheme==='captain'&&t.reviewed){
  copy[0]=t.rank;const n=t.completedWork;
  if(n!==null&&n<100){const next=n<5?['Commander',5]:n<25?['Captain',25]:['Admiral',100];copy[1]='Next rank: '+next[0];$('training-remaining').textContent=(next[1]-n)+' more completed '+(next[1]-n===1?'result':'results')+' to advance';$('training-remaining').hidden=false;}
 }
 $('training-rank').textContent=t.rank;$('training-rank').hidden=false;$('logo-wrap').dataset.rank=t.rank.toLowerCase();$('training-title').textContent=copy[0];$('training-next').textContent=copy[1];$('training-action').textContent=nextActionState()?.label??copy[2];$('training-action').disabled=workBusy;
 const n=t.completedWork,floor=n>=100?100:n>=25?25:n>=5?5:0,ceiling=n>=100?100:n>=25?100:n>=5?25:5;
 $('training-progress').hidden=t.reviewed&&n===null;$('training-progress').max=t.reviewed?(n>=100?1:ceiling-floor):3;$('training-progress').value=t.reviewed?(n>=100?1:n===null?0:n-floor):t.step;$('training-progress').setAttribute('aria-label',t.reviewed?(n===null?'Work milestones unavailable':n>=100?'Admiral · 100 or more completed results':t.rank+' · '+n+' completed results · '+(ceiling-n)+' to next rank'):t.rank+' · '+t.step+' of 3 training steps complete');
 for(const [id,label,earned]of [['training-setup','Setup',t.setup],['training-result','First result',t.saved],['training-review','Review',t.reviewed]]){$(id).dataset.earned=String(earned);$(id).setAttribute('aria-label',label+' · '+(earned?'complete':'next'));}
 $('commissioning').dataset.earned=String(t.setup);$('commission-title').textContent=t.rank;$('commission-note').textContent=t.reviewed?'Advanced tools unlocked.':t.setup?'First rank earned. Welcome aboard.':'Finish setup to earn Ensign.';$('request-advanced').hidden=!t.reviewed;$('advanced-locked').hidden=t.reviewed;updateNextActions();
}
function nextActionState(){
 const t=trainingState();
 if(workDraft)return {kind:'current',label:'Review draft'};
 if(workRef&&(!workResult?.resultAvailable||!workResult.review.latest))return {kind:'current',label:workResult?.resultAvailable?'Review result':'View request'};
 if(!workRef&&workFields.some(id=>$(id).value.trim()))return {kind:'continue',label:'Continue request'};
 if(!t)return null;
 return {kind:!t.setup?'setup':t.saved&&!t.reviewed?'review':'new',label:!t.setup?'Finish setup':t.saved&&!t.reviewed?'Review result':t.reviewed?'New request':'Create request'};
}
function updateNextActions(){const action=nextActionState();for(const view of ['jobs','groq','system']){const button=$('next-'+view);button.hidden=!action;button.disabled=workBusy||!action;if(action)button.textContent=action.label;}const hud=$('hud-next');hud.hidden=!action;hud.disabled=workBusy||!action;if(action)hud.textContent=action.label;}
function trainingAction(){
 if(workBusy)return;const action=nextActionState();if(!action)return;
 if(action.kind==='current'){workNavigate(workRef);showView('requests');return;}
 if(action.kind==='continue'){preferredRoute={view:'requests',ref:null};showView('requests');$('request-title').focus?.();return;}
 if(action.kind==='review'){const ref=workProgress?.reviewRef??jobRows.find(row=>row.state==='completed'&&row.resultAvailable)?.ref;if(ref){workNavigate(ref);showView('requests');}else{$('jobs-filter').value='completed';showView('jobs');paintJobs();}return;}
 showView('requests');if(action.kind==='setup'){$('request-setup-list').closest?.('details')?.setAttribute('open','');return;}newWorkspaceRequest();if(workAdvanced())$('request-context-details').open=true;
}
function clearWorkspace(){
 walkthroughReviewed=undefined;$('first-run-walkthrough').open=false;$('first-run-walkthrough').hidden=true;$('walkthrough-replay').hidden=true;
 clearTraining();workConfigAttempted=false;workConfigFlight=null;workGraduated=false;workProgress=null;
 workGeneration++;stopWorkspacePoll();for(const c of workControllers)c.abort();workControllers.clear();workRead=null;for(const url of workDownloads)URL.revokeObjectURL(url);workDownloads.clear();workConfig=null;workDraft=null;workResult=null;workRef=null;workDraftId=null;workBusy=false;workFresh=false;workHandoff='';
 for(const id of [...workFields,'request-review-note','request-grade-score','request-grade-note'])$(id).value='';
 for(const id of ['request-exact-text','request-exact-context','request-original','request-sheet-title','request-next','request-state','request-observed','request-review-summary'])$(id).textContent='';
 for(const id of ['request-output','request-provenance','request-review-history','request-grade-history','request-limits','request-setup-list'])$(id).replaceChildren();
 $('request-grade-summary').textContent='Ungraded';$('request-grade-details').open=false;$('request-grade-history-details').hidden=true;
 $('request-sheet').hidden=true;$('request-compose').hidden=false;$('request-result').hidden=true;$('request-correction').hidden=true;$('request-review-details').hidden=true;$('request-provider').textContent='Provider not checked.';workNotice('');workCounts();workButtons();
}
async function workRequest(path,body,controller=new AbortController()){
 const generation=workGeneration;workControllers.add(controller);const timer=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
  if(response.status===401||response.status===403){showAuth('login','Please sign in to view your requests.');throw Error('auth');}
  const value=await response.json();if(controller.signal.aborted||generation!==workGeneration||!authenticated)throw Error('aborted');if(!response.ok){const e=Error('workspace');e.status=response.status;e.code=value?.error;throw e;}return value;
 }finally{clearTimeout(timer);workControllers.delete(controller);}
}
function workCounts(){for(const [id,max]of [['request-title',200],['request-text',4000],['request-context',4000]])$(id+'-count').textContent=$(id).value.length.toLocaleString()+' / '+max.toLocaleString();
 const context=$('request-context').value.trim().length,task=$('request-task').value.trim();
 $('request-summary-context').textContent=[context?'Supporting context · '+context.toLocaleString()+' characters':'',task?'Task '+task:''].filter(Boolean).join(' · ')||'None attached';}
// Where the observed request sits on the routing map, and what "Open" reaches.
var routeTarget=null;
function routeStage(phase){
 if(workDraft&&phase==='review')return {stage:'approval',target:{kind:'request',ref:workRef}};
 if(['blocked','cancelled','unknown'].includes(phase))return {stage:'',target:workRef?{kind:'request',ref:workRef}:null};
 if(workResult&&phase!=='unknown')return {stage:phase==='queued'||phase==='claimed'?'relay':phase==='completed'?'review':'provider',target:{kind:'request',ref:workRef},label:phase==='completed'&&workResult.resultAvailable&&!workResult.review?.latest?'Result saved · waiting for your review':''};
 if(['queued','claimed','invoking'].includes(phase)){const row=jobRows.find(r=>r.state===phase)??jobRows.find(r=>['queued','claimed','invoking'].includes(r.state));return {stage:phase==='invoking'?'provider':'relay',target:row?{kind:'job',ref:row.ref}:null};}
 if(phase==='idle'&&nextActionState()?.kind==='review'){const ref=workProgress?.reviewRef??jobRows.find(r=>r.state==='completed'&&r.resultAvailable)?.ref;if(ref)return {stage:'review',target:{kind:'request',ref},label:'Result saved · waiting for your review'};}
 return {stage:'',target:null};
}
function renderRoute(){
 const root=$('console-surface'),caption=$('route-status');let phase='idle',label='Ready for work';
 // Saved Stealth preferences can render the HUD before workspace state initializes.
 if(!authenticated){root.dataset.routePhase='unknown';paintRoute('',null);caption.textContent='Sign in to check activity';return;}
 const age=Date.now()-Date.parse(workResult?.observedAt),fresh=workFresh&&age>=-5000&&age<60000;
 if(!authenticated){phase='unknown';label='Sign in to check activity';}
 else if(workHandoff){phase='unknown';label=workHandoff==='saved'?'Approval saved · check saved status':'Submission unconfirmed · check saved status';}
 else if(workResult){phase=fresh?workResult.state:'unknown';label='Selected request · '+(fresh?workResult.state:'status unavailable');}
 else if(workDraft){phase=workFresh?'review':'unknown';label=workFresh?'Draft ready for your review · no provider call':'Draft status unavailable';}
 else{const age=Date.now()-Date.parse(latest?.observedAt),j=latest?.jobs;if(statusFailed||!j||age< -5000||age>=60000||!Number.isFinite(age)){phase='unknown';label='Relay activity unavailable';}else if(j.invoking>0){phase='invoking';label='Relay activity · '+j.invoking+' provider call(s) active';}else if(j.claimed>0||j.queued>0){phase=j.claimed>0?'claimed':'queued';label='Relay activity · work '+phase;}}
 const route=routeStage(phase);if(route.label)label=route.label;
 root.dataset.routePhase=phase;paintRoute(route.stage,route.target);if(caption.textContent!==label)caption.textContent=label;
}
function paintRoute(stage,target){
 $('console-surface').dataset.routeStage=stage;routeTarget=target;
 for(const name of ['client','approval','relay','provider','review']){const li=$('route-stage-'+name);if(name===stage)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');}
 const open=$('route-open');open.hidden=!target;open.textContent=target?.kind==='job'?'Open job':stage==='review'?'Review result':'Open request';
}
function openJobRow(ref){selectedRef=ref;preferredRoute={view:'jobs',ref};writeRoute();showView('jobs',false);paintJobs();$('detail-ref').focus?.({preventScroll:true});}
$('route-open').addEventListener('click',e=>{const target=routeTarget;if(!target||workBusy)return;activateWorkspaceControl(e.currentTarget,()=>{if(target.kind==='job')openJobRow(target.ref);else if(target.ref){workNavigate(target.ref);showView('requests');}else showView('requests');});});
for(const state of states)$('open-count-'+state).addEventListener('click',e=>openJobReadout(state,e.currentTarget));
$('inspector-close').addEventListener('click',()=>{const ref=selectedRef;selectedRef=null;preferredRoute={view:'jobs',ref:null};writeRoute(true);paintJobs();$('jobs-list').querySelector?.('[data-ref="'+ref+'"]')?.focus();});
function paintGroqLast(){
 const row=jobRows.find(r=>!['queued','claimed'].includes(r.state)),open=$('groq-last-open');
 $('groq-last').textContent=row?({invoking:'Running now',completed:'Completed',failed:'Failed',uncertain:'Uncertain',blocked:'Blocked',cancelled:'Cancelled',unknown:'Unknown'})[row.state]+' · '+formatTime(row.updatedAt):'No recorded job in loaded history';
 $('groq-last').dataset.state=row?.state??'';open.hidden=!row;open.dataset.ref=row?.ref??'';
}
$('groq-last-open').addEventListener('click',e=>{const ref=e.currentTarget.dataset.ref;if(ref)openJobRow(ref);});
function systemStatus(name,[tone,text]){const el=$('system-'+name+'-status');el.dataset.tone=tone;el.textContent=text;}
function workButtons(){
 renderRoute();
 const configCurrent=workConfig&&Date.now()-Date.parse(workConfig.observedAt)<60000&&Date.now()-Date.parse(workConfig.observedAt)>=-5000;
 if(workConfig&&!configCurrent)$('request-provider').textContent='Availability needs a fresh check. Select Refresh.';
 for(const id of ['request-prepare','request-edit','request-new','request-refresh','request-check','request-accept','request-changes'])$(id).disabled=workBusy;
 $('request-approve').disabled=workBusy||!workFresh||!configCurrent||workConfig?.ready!==true||!workDraft||workHandoff||workDraft.approval.expiresAt<=Date.now();
 for(const id of ['request-accept','request-changes'])$(id).disabled=workBusy||!workFresh||!workResult?.resultAvailable;
 $('request-grade-save').disabled=workBusy||!workFresh||!workResult?.resultAvailable||!workResult?.grade||!['1','2','3','4','5'].includes($('request-grade-score').value);
 for(const id of ['request-copy','request-download','request-handoff'])$(id).disabled=!workResult?.resultAvailable;
 $('request-check').disabled=workBusy||!workRef;
 for(const id of [...workFields,'request-template','request-purpose','request-review-note','request-grade-score','request-grade-note'])$(id).disabled=workBusy;
 const t=trainingState(),advanced=t?.reviewed===true;$('request-prepare').disabled=workBusy||!t?.setup;$('training-action').disabled=workBusy||!t;
 for(const id of ['request-context','request-task','request-purpose','request-template-code','request-template-review'])$(id).disabled=workBusy||!advanced;
 for(const id of ['request-template-code','request-template-review','request-context-details','request-handoff'])$(id).hidden=!advanced;
 $('request-handoff').disabled=workBusy||!workResult?.resultAvailable||!advanced;updateNextActions();
}
function workPair(root,label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(value);root.append(dt,dd);}
function workLoadConfig(){
 if(workConfigFlight)return workConfigFlight;workConfigAttempted=true;const generation=workGeneration;
 workConfigFlight=fetchWorkConfig().finally(()=>{if(generation===workGeneration)workConfigFlight=null;});return workConfigFlight;
}
async function fetchWorkConfig(){
 const generation=workGeneration;
 try{const c=await workRequest('/workspace/config');if(c?.v!==1||c.enabled!==true||typeof c.ready!=='boolean'||c.model!=='openai/gpt-oss-20b'||c.limits?.maxCalls!==1||c.limits.maxOutputTokens!==4096||!Number.isFinite(Date.parse(c.observedAt)))throw Error('config');workConfig=c;rememberProgress(c);renderTraining();
  $('request-provider').textContent='Groq · '+c.model+' · '+(c.ready?'Ready':availabilityReasons[c.blockingCode]||'Unavailable for new work');
  const root=$('request-setup-list');root.replaceChildren();for(const [label,ok]of [['Owner sign-in',c.setup?.ownerAuthentication],['Durable job storage',c.setup?.durableStorage],['Provider enrollment',c.setup?.providerEnrollment]]){const li=document.createElement('li');li.textContent=label+': '+(ok===true?'ready':'needs attention');root.append(li);}const li=document.createElement('li');li.textContent='Backups: managed by your host operator';root.append(li);
 }catch(e){if(generation!==workGeneration)throw e;workConfig=null;renderTraining();$('request-provider').textContent='Current provider availability unknown.';throw e;}finally{if(generation===workGeneration)workButtons();}
}
function workNavigate(ref,replace=false){workRef=ref;preferredRoute={view:'requests',ref};writeRoute(replace);}
function newWorkspaceRequest(){
 if(workBusy)return;stopWorkspacePoll();workRead?.abort();workRead=null;workDraft=null;workResult=null;workRef=null;workDraftId=null;workFresh=false;workHandoff='';
 for(const id of [...workFields,'request-review-note','request-grade-score','request-grade-note'])$(id).value='';$('request-grade-details').open=false;$('request-template').value='custom';$('request-purpose').value='sanitized-source-proposal';$('request-context-details').open=false;
 $('request-sheet').hidden=true;$('request-compose').hidden=false;$('request-result').hidden=true;$('request-output').replaceChildren();$('request-original').textContent='';workNavigate(null);workNotice('');workCounts();workButtons();$('request-title').focus?.();
}
function workSchedule(){stopWorkspacePoll();if(!authenticated||!['requests','overview'].includes(activeView)||document.visibilityState==='hidden')return;const active=['queued','claimed','invoking'].includes(workResult?.state);workTimer=setTimeout(async()=>{workButtons();if(!workBusy&&(!workConfig||Date.now()-Date.parse(workConfig.observedAt)>=15000)){try{await workLoadConfig();}catch{}}if(active&&!workBusy)await readWorkspaceRequest();else if(workDraft)renderWorkspaceDraft(workDraft);workSchedule();},active?2000:15000);}
function workSteps(step){for(const name of ['review','run','result'])$('request-step-'+name).setAttribute('aria-current',name===step?'step':'false');$('request-sheet').dataset.motion=paused||preference.matches?'off':'on';}
function workShowSheet(){ $('request-compose').hidden=true;$('request-sheet').hidden=false; }
function renderWorkspaceDraft(d){
 $('request-cost').hidden=false;
 const expired=d.approval.expiresAt<=Date.now();workShowSheet();workSteps('review');$('request-sheet-title').textContent=d.payload.context.title;$('request-state').textContent=expired?'Draft expired':'Ready for your approval';$('request-next').textContent=expired?'Edit the brief to prepare a new request. This draft cannot run.':'Check the exact text and limits. Approval queues this request once.';
 $('request-exact-text').textContent=d.payload.request.text;$('request-exact-context').textContent=d.payload.context.latestFinding;$('request-exact-context-wrap').hidden=!d.payload.context.latestFinding;$('request-result').hidden=true;$('request-approve').hidden=expired;$('request-edit').hidden=false;
 $('request-observed').textContent='Approval expires '+formatTime(d.approval.expiresAt);const root=$('request-limits');root.replaceChildren();for(const [k,v]of [['Provider','Groq · openai/gpt-oss-20b'],['Calls','1'],['Output ceiling','4,096 tokens'],['Execution','Text proposal only']])workPair(root,k,v);
 $('request-cost').textContent='Retained Free-plan enrollment. Live billing and remaining quota are unknown. No tools, automatic retries, model substitution or paid fallback.';
 const meta=$('request-provenance');meta.replaceChildren();for(const [k,v]of [['Request',d.payload.eventId],['Task reference',d.payload.taskId],['Input SHA-256',d.approval.inputSha256],['Draft SHA-256',d.draftSha256],['Created',formatTime(d.approval.issuedAt)]])workPair(meta,k,v);workButtons();if(workHandoff)renderWorkHandoff();
}
function projectWorkspace(value,ref){
 if(value?.v!==1||value.ref!==ref||!['queued','claimed','invoking','completed','failed','blocked','cancelled','uncertain'].includes(value.state)||typeof value.resultAvailable!=='boolean'||typeof value.request?.title!=='string'||typeof value.request?.text!=='string'||typeof value.request?.context!=='string'||!Number.isFinite(Date.parse(value.observedAt))||typeof value.provenance?.model!=='string'||!Number.isSafeInteger(value.review?.revision)||!Array.isArray(value.review.history)||value.review.history.length>100)throw Error('result');
 if(value.resultAvailable&&(value.state!=='completed'||typeof value.result?.body!=='string'||value.result.body.length>16000||!/^[a-f0-9]{64}$/.test(value.result.sha256??'')))throw Error('result');
 const grade=value.grade;if(grade!==undefined&&grade!==null&&(!Number.isSafeInteger(grade?.revision)||grade.revision<0||grade.revision>100||!Array.isArray(grade.history)||grade.history.length!==grade.revision||grade.history.some((g,i)=>g.ref!==ref||g.revision!==i+1||!Number.isInteger(g.score)||g.score<1||g.score>5||typeof g.note!=='string'||g.note.length>500||!['owner','client'].includes(g.reviewer?.kind)||g.reviewer.kind==='client'&&typeof g.reviewer.keyId!=='string'||g.resultSha256!==value.result?.sha256||!Number.isSafeInteger(g.recordedAt))||JSON.stringify(grade.latest)!==JSON.stringify(grade.history.at(-1)??null)))throw Error('grade');
 return {...value,grade:grade??null};
}
const workNextActions={queued:['Approval saved · queued','Provider not started. Follow this saved request.'],claimed:['Preparing','Claimed by the relay; provider handoff is not confirmed.'],invoking:['Running','Handoff recorded; remote acceptance is not confirmed. Check saved status, never resend.'],completed:['Completed','Ready for your review.'],uncertain:['Outcome unknown','This request is spent. Check saved status or ask your operator; do not resend.'],failed:['Failed','This request failed and is spent. Review the reason; no automatic retry.'],blocked:['Blocked','New execution is blocked. Check the reason; saved answers remain readable.'],cancelled:['Cancelled','No replacement request was created.']};
function renderWorkspaceResult(v){
 $('request-cost').hidden=true;
 if(workProgress&&workFresh&&v.resultAvailable){workProgress.saved=true;workProgress.setup=true;workProgress.reviewed=workProgress.reviewed||v.review.revision>0;if(!workProgress.reviewed)workProgress.reviewRef=v.ref;}
 renderTraining();
 workShowSheet();workSteps(v.state==='completed'?'result':'run');$('request-state').textContent=v.state==='completed'?'Completed · '+(v.review.latest?.decision==='accepted'?'accepted':v.review.latest?.decision==='changes_requested'?'changes requested':'awaiting your review'):workNextActions[v.state][0];
 $('request-sheet-title').textContent=v.request.title;$('request-next').textContent=workNextActions[v.state][1]+(v.state==='failed'||v.state==='blocked'?' '+(reasons[v.reasonCode]||'Recorded reason unavailable.'):'');$('request-observed').textContent='Observed '+formatTime(Date.parse(v.observedAt));$('request-exact-text').textContent=v.request.text;$('request-exact-context').textContent=v.request.context;$('request-exact-context-wrap').hidden=!v.request.context;$('request-approve').hidden=true;$('request-edit').hidden=true;
 $('request-limits').replaceChildren();for(const [k,val]of [['Provider',v.provenance.model],['Calls','1'],['Output ceiling',v.provenance.maxOutputTokens+' tokens'],['Source',v.provenance.source]])workPair($('request-limits'),k,val);
 const providerUsage=v.provenance?.providerUsage;
 const usageText=providerUsage&&[providerUsage.inputTokens,providerUsage.outputTokens,providerUsage.totalTokens].every(n=>Number.isSafeInteger(n)&&n>=0)&&providerUsage.inputTokens+providerUsage.outputTokens===providerUsage.totalTokens
  ?providerUsage.inputTokens.toLocaleString()+' input + '+providerUsage.outputTokens.toLocaleString()+' output = '+providerUsage.totalTokens.toLocaleString()+' provider tokens. Billed cost was not supplied.'
  :'Usage tokens and billed cost were not recorded. The configured ceiling is not measured usage.';
 $('request-cost').textContent=usageText+' No automatic retry or paid fallback.';
 const meta=$('request-provenance');meta.replaceChildren();for(const [k,val]of [['Request',v.ref],['Task reference',v.request.taskId],['Input SHA-256',v.provenance.inputSha256],['Payload SHA-256',v.provenance.payloadSha256],['Approved',formatTime(v.provenance.approvedAt)],['Expiry',formatTime(v.provenance.expiresAt)],['Result SHA-256',v.result?.sha256??'No saved result'],['Usage and cost',usageText+' No automatic retry or paid fallback.']])workPair(meta,k,val);
 $('request-result').hidden=!v.resultAvailable;
 if(v.resultAvailable){$('request-original').textContent=v.result.body;renderWorkspaceText(v.result.body);$('request-correction').hidden=!(v.ref===workspaceCorrection.ref&&v.provenance.inputSha256===workspaceCorrection.inputSha256&&v.result.body===workspaceCorrection.body);renderWorkspaceReview(v.review);renderWorkspaceGrade(v.grade);}else{$('request-output').replaceChildren();$('request-original').textContent='';$('request-correction').hidden=true;}
 workButtons();
}
function renderWorkspaceReview(review){
 $('request-review-summary').textContent=review.latest?(review.latest.decision==='accepted'?'Accepted':'Changes requested')+' · '+formatTime(review.latest.recordedAt):'Not reviewed.';
 $('request-review-details').hidden=review.history.length===0;const root=$('request-review-history');root.replaceChildren();for(const r of [...review.history].reverse()){const li=document.createElement('li');li.textContent=(r.decision==='accepted'?'Accepted':'Changes requested')+' · '+formatTime(r.recordedAt)+(r.note?'\n'+r.note:'');root.append(li);}
}
function renderWorkspaceGrade(grade){
 const label=g=>g.score+'/5 · '+(g.reviewer.kind==='owner'?'Owner':'Signed client · '+g.reviewer.keyId);
 $('request-grade-summary').textContent=grade?.latest?label(grade.latest):grade?'Ungraded':'Unavailable';
 $('request-grade-history-details').hidden=!grade?.history.length;const root=$('request-grade-history');root.replaceChildren();
 for(const g of [...(grade?.history??[])].reverse()){const li=document.createElement('li');li.textContent=label(g)+' · '+formatTime(g.recordedAt)+(g.note?'\n'+g.note:'');root.append(li);}
}
async function loadWorkspace(){
 if(!authenticated||workBusy)return;const generation=workGeneration;
 try{await workLoadConfig();if(generation!==workGeneration)return;const ref=preferredRoute.view==='requests'?preferredRoute.ref:null;if(ref){if(workRef!==ref){workRead?.abort();workRead=null;workDraft=null;workResult=null;workFresh=false;workRef=ref;}await readWorkspaceRequest();}else if(!workDraft&&!workResult){$('request-compose').hidden=false;$('request-sheet').hidden=true;workNotice('');}}
 catch{if(generation===workGeneration&&authenticated)workNotice('Availability could not be checked. Saved results can still be read with Check saved status.',true);if(workRef)await readWorkspaceRequest();}finally{workSchedule();}
}
async function prepareWorkspace(event){
 event.preventDefault();if(workBusy)return;const training=trainingState();if(!training?.setup){workNotice('Complete setup before preparing your first request.',true);return;}if(!workAdvanced()&&($('request-context').value||$('request-task').value||$('request-purpose').value==='public-source-review')){workNotice('Review a saved answer to unlock context and task links.',true);return;}if(!$('request-title').value.trim()||!$('request-text').value.trim()){workNotice('Enter a title and a request.',true);return;}
 workBusy=true;workButtons();const generation=workGeneration;workDraftId=workDraftId??crypto.randomUUID();
 const body={requestId:workDraftId,taskId:$('request-task').value,title:$('request-title').value,requestText:$('request-text').value,context:$('request-context').value,purpose:$('request-purpose').value};
 try{const value=await workRequest('/workspace/drafts',body);if(generation!==workGeneration)return;workDraft=value.draft;workResult=null;workFresh=true;workHandoff='';workNavigate(workDraft.payload.eventId);renderWorkspaceDraft(workDraft);workNotice('Draft saved. No provider call has been made.');$('request-sheet-title').focus?.();await workLoadConfig();}
 catch(e){if(generation===workGeneration&&authenticated)workNotice(e.code==='request_too_large'?'The combined input is too large. Shorten the request or context.':e.code==='draft_conflict'?'This draft ID already belongs to different input. Edit the brief and prepare a new draft.':'Draft saving was not confirmed. Review request again to recover the same draft; no provider call was made.',true);}
 finally{if(generation===workGeneration){workBusy=false;workButtons();workSchedule();}}
}
async function readWorkspaceRequest(){
 if(!authenticated||!workRef||workRead)return;const ref=workRef,generation=workGeneration,controller=new AbortController();workRead=controller;
 if(workResult?.ref!==ref){$('request-grade-score').value='';$('request-grade-note').value='';$('request-grade-details').open=false;}
 try{const v=await workRequest('/workspace/requests/'+ref,undefined,controller);if(generation!==workGeneration||ref!==workRef)return;const age=Date.now()-Date.parse(v.observedAt);workFresh=Number.isFinite(age)&&age>=-5000&&age<60000;
  if(v.draft){if(v.draft.payload?.eventId!==ref||workHandoff==='saved')throw Error('draft');workHandoff='';workDraft=v.draft;workResult=null;renderWorkspaceDraft(workDraft);}else{const next=projectWorkspace(v,ref);workHandoff='';if(workResult?.ref===ref&&workResult.result?.sha256===next.result?.sha256){if(workResult.review.revision>next.review.revision)next.review=workResult.review;if(workResult.grade&&next.grade&&workResult.grade.revision>next.grade.revision)next.grade=workResult.grade;}workResult=next;workDraft=null;renderWorkspaceResult(workResult);}workNotice(workFresh?'Saved status checked. No request was resubmitted.':'The observation time is stale or ahead of this browser. Refresh and check the host clock before approving or reviewing.',!workFresh);
 }catch(e){if(generation===workGeneration&&ref===workRef&&authenticated){workFresh=false;workNotice(e.status===404?'No request is available at this link for this owner.':'Current request status is unknown. The last observation is preserved. Checking status never resubmits work.',true);}}
 finally{if(workRead===controller)workRead=null;workButtons();workSchedule();}
}
async function approveWorkspace(){
 if($('request-approve').disabled||!workDraft)return;const draft=workDraft,generation=workGeneration;workBusy=true;workButtons();
 try{await workLoadConfig();if(!workConfig?.ready)throw Error('unavailable');const proof=await workRequest('/workspace/approvals',{requestId:draft.payload.requestId});
  if(proof.ref!==draft.payload.eventId)throw Error('approval');if(!proof.existing){if(proof.draftSha256!==draft.draftSha256||!/^[A-Za-z0-9_-]{43}$/.test(proof.nonce??''))throw Error('approval');await workRequest('/workspace/requests',{requestId:draft.payload.requestId,nonce:proof.nonce,draftSha256:draft.draftSha256,approve:true});}
  if(generation===workGeneration){workHandoff='saved';renderWorkHandoff();await readWorkspaceRequest();if(workFresh)workNotice('Registered once. Following the saved request.');}
 }catch{if(generation===workGeneration&&authenticated){workHandoff='unknown';workFresh=false;renderWorkHandoff();workNotice('Submission was not confirmed. Check saved status to recover this exact request. No retry or replacement was sent.',true);}}
 finally{if(generation===workGeneration){workBusy=false;workButtons();workSchedule();}}
}
function editWorkspace(){
 if(workBusy||!workDraft)return;stopWorkspacePoll();const d=workDraft;$('request-title').value=d.payload.context.title;$('request-text').value=d.payload.request.text;$('request-context').value=d.payload.context.latestFinding;$('request-task').value=d.payload.taskId.startsWith('console:')?'':d.payload.taskId;$('request-purpose').value=d.approval.purpose;workDraft=null;workResult=null;workDraftId=null;workFresh=false;workNavigate(null);$('request-sheet').hidden=true;$('request-compose').hidden=false;workNotice('Edit the brief, then prepare a new draft for review. The earlier draft remains unchanged.');workCounts();workButtons();$('request-text').focus?.();
}
function workDownload(name,text,type='text/plain;charset=utf-8'){
 const url=URL.createObjectURL(new Blob([text],{type}));workDownloads.add(url);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>{URL.revokeObjectURL(url);workDownloads.delete(url);},1000);
}
function workInline(root,text){for(const part of text.split(/(\x60[^\x60\n]+\x60|\*\*[^*\n]+\*\*)/g)){const code=part.startsWith('\x60')&&part.endsWith('\x60'),bold=part.startsWith('**')&&part.endsWith('**'),n=document.createElement(code?'code':bold?'strong':'span');n.textContent=code?part.slice(1,-1):bold?part.slice(2,-2):part;root.append(n);}}
function renderWorkspaceText(text){
 const root=$('request-output');root.replaceChildren();const lines=text.split(/\r?\n/);let i=0,block=0;const cells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());
 while(i<lines.length){const line=lines[i++];if(!line.trim())continue;const fence=/^\s*\x60{3}([a-zA-Z0-9_-]*)/.exec(line);
  if(fence){const chunk=[];while(i<lines.length&&!/^\s*\x60{3}/.test(lines[i]))chunk.push(lines[i++]);if(i<lines.length)i++;const body=chunk.join('\n'),wrap=document.createElement('div'),header=document.createElement('header'),label=document.createElement('span'),button=document.createElement('button'),pre=document.createElement('pre'),code=document.createElement('code'),index=++block;wrap.className='code-output';label.textContent=fence[1]||'Code proposal';button.type='button';button.textContent='Download code';button.setAttribute('aria-label','Download code block '+index);const ext=({javascript:'js',js:'js',typescript:'ts',ts:'ts',python:'py',py:'py',json:'json',css:'css',html:'html',sql:'sql',bash:'sh',sh:'sh'})[fence[1].toLowerCase()]||'txt';button.hidden=!workAdvanced();button.disabled=!workAdvanced();button.addEventListener('click',()=>{if(workAdvanced())workDownload('picard-'+workRef.slice(0,12)+'-'+index+'.'+ext,body);});header.append(label,button);code.textContent=body;pre.append(code);wrap.append(header,pre);root.append(wrap);continue;}
  if(line.includes('|')&&i<lines.length&&cells(lines[i]).every(c=>/^:?-{3,}:?$/.test(c))){const wrap=document.createElement('div'),table=document.createElement('table');wrap.className='request-table';const row=(values,head)=>{const tr=document.createElement('tr');for(const value of values){const cell=document.createElement(head?'th':'td');if(head)cell.setAttribute('scope','col');workInline(cell,value);tr.append(cell);}table.append(tr);};row(cells(line),true);i++;while(i<lines.length&&lines[i].includes('|'))row(cells(lines[i++]),false);wrap.append(table);root.append(wrap);continue;}
  const heading=/^#{1,6}\s+(.+)$/.exec(line),bullet=/^\s*[-*]\s+(.+)$/.exec(line),n=document.createElement(heading?'h3':bullet?'p':'p');workInline(n,heading?heading[1]:bullet?'• '+bullet[1]:line);root.append(n);
 }
}
async function saveWorkspaceReview(decision){
 if(workBusy||!workFresh||!workResult?.resultAvailable)return;const result=workResult,generation=workGeneration,note=$('request-review-note').value;workBusy=true;workButtons();
 try{const v=await workRequest('/workspace/reviews/'+result.ref,{expectedRevision:result.review.revision,decision,note,resultSha256:result.result.sha256});if(generation!==workGeneration||workRef!==result.ref||workResult?.result?.sha256!==result.result.sha256)return;if(v.review.revision>=workResult.review.revision)workResult={...workResult,review:v.review};workGraduated=true;renderTraining();$('request-review-note').value='';renderWorkspaceResult(workResult);workNotice('Review saved. The original answer is unchanged.');
  // A saved review changes earned credit. Drain an older config read before a fresh one.
  if(workProgress)workProgress.completedWork=null;renderTraining();
  try{if(workConfigFlight)await workConfigFlight.catch(()=>{});if(generation===workGeneration)await workLoadConfig();}catch{if(generation===workGeneration){if(workProgress)workProgress.completedWork=null;renderTraining();workNotice('Review saved. Work milestones could not be refreshed.',true);}}
}
 catch(e){if(generation===workGeneration&&authenticated)workNotice(e.code==='review_conflict'?'Another review was saved. Check saved status before reviewing again.':'Review saving was not confirmed. Check saved status to recover it; no provider call was made.',true);}
 finally{if(generation===workGeneration){workBusy=false;workButtons();}}
}
async function saveWorkspaceGrade(){
 if($('request-grade-save').disabled||workBusy||!workFresh||!workResult?.resultAvailable||!workResult.grade)return;
 const result=workResult,generation=workGeneration,score=Number($('request-grade-score').value),note=$('request-grade-note').value;workBusy=true;workButtons();
 try{const v=await workRequest('/workspace/grades/'+result.ref,{expectedRevision:result.grade.revision,score,note,resultSha256:result.result.sha256});if(generation!==workGeneration||workRef!==result.ref||workResult?.result?.sha256!==result.result.sha256)return;
  const next=projectWorkspace({...workResult,grade:v.grade},result.ref);if(next.grade.revision>=workResult.grade.revision)workResult=next;$('request-grade-score').value='';$('request-grade-note').value='';renderWorkspaceResult(workResult);workNotice('Grade saved.');
 }catch(e){if(generation===workGeneration&&authenticated)workNotice(e.code==='grade_conflict'?'Another grade was saved. Check saved status before grading again.':'Grade saving was not confirmed. Check saved status to recover it.',true);}
 finally{if(generation===workGeneration){workBusy=false;workButtons();}}
}
$('training-action').addEventListener('click',trainingAction);for(const view of ['jobs','groq','system'])$('next-'+view).addEventListener('click',trainingAction);
$('walkthrough-replay').addEventListener('click',()=>{
 if(!authenticated)return;
 $('console-tools').open=false;showView('overview',false);renderTraining();
 const guide=$('first-run-walkthrough');guide.hidden=false;guide.open=true;$('walkthrough-heading').focus?.();
});
$('request-form').addEventListener('submit',prepareWorkspace);$('request-new').addEventListener('click',newWorkspaceRequest);$('request-edit').addEventListener('click',editWorkspace);$('request-approve').addEventListener('click',approveWorkspace);$('request-check').addEventListener('click',readWorkspaceRequest);$('request-refresh').addEventListener('click',loadWorkspace);
for(const id of workFields)$(id).addEventListener('input',()=>{workDraftId=null;workCounts();});
$('request-template').addEventListener('change',()=>{if(['code','review'].includes($('request-template').value)&&!workAdvanced()){$('request-template').value='custom';return;}const templates={checklist:'Turn the notes below into a short checklist. Put the next action first and flag blockers. Use only the details in my notes.\n\nNotes:\n',code:'Propose a small implementation for the following requirement. Include the code, assumptions, and focused verification steps.\n\nRequirement:\n',review:'Review the following public material. Identify specific problems, explain their impact, and suggest corrections.\n\nMaterial:\n',explain:'Explain the following topic in plain language. Include one concrete example and the main limitations.\n\nTopic:\n'};const text=templates[$('request-template').value];if(text)$('request-text').value=text;$('request-purpose').value=$('request-template').value==='review'?'public-source-review':'sanitized-source-proposal';workDraftId=null;workCounts();});
$('workspace-open-job').addEventListener('click',()=>{if(selectedRef){workRef=selectedRef;preferredRoute={view:'requests',ref:selectedRef};writeRoute();showView('requests');}});
$('request-copy').addEventListener('click',async()=>{if(!workResult?.resultAvailable)return;try{await navigator.clipboard.writeText(workResult.result.body);workNotice('Answer copied.');}catch{workNotice('Copy is unavailable in this browser. Use Download answer or select Original saved text.',true);}});
$('request-download').addEventListener('click',()=>{if(workResult?.resultAvailable)workDownload('picard-'+workRef.slice(0,12)+'.md',workResult.result.body);});
$('request-handoff').addEventListener('click',()=>{if(workResult?.resultAvailable&&workAdvanced())workDownload('picard-'+workRef.slice(0,12)+'.json',JSON.stringify({schemaVersion:1,product:'Picard Relay',exportedAt:new Date().toISOString(),...workResult,limitations:['Generated proposal; not executed','Usage and billed cost unknown','Review is local to Picard; no Board acceptance implied']},null,2),'application/json;charset=utf-8');});
$('request-accept').addEventListener('click',()=>saveWorkspaceReview('accepted'));$('request-changes').addEventListener('click',()=>saveWorkspaceReview('changes_requested'));
$('request-grade-score').addEventListener('change',workButtons);$('request-grade-save').addEventListener('click',saveWorkspaceGrade);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stopWorkspacePoll();else if(authenticated&&activeView==='requests')void loadWorkspace();});
`.replace(/^[ \t]+/gm,'');

export const REVIEWED_REGRESSION_RESULT=Object.freeze({"body":"[Groq / openai/gpt-oss-20b]\n**Regression‑test table**\n\n| Input (label, used, limit) | Expected output |\n|---|---|\n| (\"Name\", 5, 10) | \"5 characters remaining.\" |\n| (\"Title\", 11, 10) | \"Title: 1 characters over the limit.\" |\n| (\"\", 0, 10) | \"Check this field.\" |\n| (\"Description\", \"five\", 10) | \"Check this field.\" |\n\nAll outputs follow the specification: blank label, invalid number, boundary, and one over.","entryId":"board-form-limits","inputSha256":"4c6707ce9ec428b6ab064c3508493eb7648c3a89ab92ea15e20236bfd3313da5","ref":"4ad59fcf6c082664d8c175aafd974af48be313aa8d5e9aa6e8d0a85d1ae5d5f8"});

export const ADMISSION_SCRIPT=String.raw`
const reviewedRegressionResult=${JSON.stringify(REVIEWED_REGRESSION_RESULT)};
let admissionData=null,admissionEntry=null,admissionSlot=null,admissionBusy=false,admissionGeneration=0,admissionPoll=null,admissionPollUntil=0,admissionRead=null,admissionReadVersion=0;
const admissionControllers=new Set();
const admissionStates=['available','queued','claimed','invoking','completed','failed','blocked','cancelled','uncertain','unknown'];
function clearAdmission(){
 admissionGeneration++;cancelAdmissionRead();admissionPollUntil=0;for(const c of admissionControllers)c.abort();admissionControllers.clear();admissionData=null;admissionEntry=null;admissionSlot=null;admissionBusy=false;
 for(const id of ['admission-input','admission-context','admission-output','admission-state','admission-identity','admission-capability'])$(id).textContent='';$('admission-formatted').replaceChildren();$('admission-title').textContent='Choose an input to review';$('admission-notice').textContent='Not checked';$('admission-result').hidden=true;$('admission-review-note').hidden=true;
 for(const id of ['admission-entry','admission-slot']){$(id).replaceChildren();$(id).value='';}for(const id of ['admission-approve','admission-check'])$(id).disabled=true;
}
function admissionMessage(text){if(authenticated)$('admission-notice').textContent=text;}
function admissionCanonical(value){return JSON.stringify(Object.fromEntries(Object.keys(value).sort().map(k=>[k,value[k]])));}
async function admissionRequest(path,body,{controller=new AbortController()}={}){
 const generation=admissionGeneration;admissionControllers.add(controller);const timer=setTimeout(()=>controller.abort(),8000);
 try{const response=await fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:controller.signal,...(body===undefined?{}:{headers:{'Content-Type':'application/json'},body:admissionCanonical(body)})});
  if(response.status===401||response.status===403){showAuth('login','Please sign in to view private requests.');throw Error('auth');}
  const value=await response.json();if(controller.signal.aborted||generation!==admissionGeneration||!authenticated)throw Error('aborted');if(!response.ok){const e=Error('request');e.status=response.status;throw e;}return value;
 }finally{clearTimeout(timer);admissionControllers.delete(controller);}
}
function admissionProject(data){
 if(!data||data.v!==1||!['enabled','synthetic-integration-only'].includes(data.mode)||typeof data.admissionReady!=='boolean'||!Array.isArray(data.entries)||data.entries.length>8||!/^[a-f0-9]{64}$/.test(data.catalogueSha256??''))throw Error('catalogue');
 const entries=[],ids=new Set(),refs=new Set();let total=0;
 for(const e of data.entries){if(!/^[a-z0-9-]{1,50}$/.test(e?.entryId??'')||ids.has(e.entryId)||typeof e.requestText!=='string'||!e.requestText||e.requestText.length>4000||!/^[a-f0-9]{64}$/.test(e.inputSha256??'')||!e.taskContext||['title','nextAction','latestFinding'].some(k=>typeof e.taskContext[k]!=='string')||!Array.isArray(e.slots))throw Error('catalogue');ids.add(e.entryId);
  const slots=[];for(const s of e.slots){if(++total>8||!/^[a-z0-9-]{1,50}$/.test(s?.slotId??'')||!/^[a-f0-9]{64}$/.test(s.ref??'')||refs.has(s.ref)||!admissionStates.includes(s.state))throw Error('catalogue');refs.add(s.ref);slots.push({slotId:s.slotId,ref:s.ref,state:s.state});}
  entries.push({entryId:e.entryId,requestText:e.requestText,inputSha256:e.inputSha256,taskContext:{title:e.taskContext.title,nextAction:e.taskContext.nextAction,latestFinding:e.taskContext.latestFinding},slots});
 }
 return {entries,admissionReady:data.admissionReady,mode:data.mode,blockingCode:Object.hasOwn(availabilityReasons,data.blockingCode)?data.blockingCode:'unknown',legacyReviewRequired:data.blockingCode==='legacy_review_required'};
}
function admissionCapability(){if(!authenticated)return;const d=admissionData,available=d?.entries.some(e=>e.slots.some(s=>s.state==='available'&&s.statusKnown!==false));$('admission-capability').hidden=!!d&&d.admissionReady&&!available;$('admission-capability').textContent=!d?'Availability not checked.':d.admissionReady?(available?'New requests available. Approval queues one call.':'Saved requests'):(availabilityReasons[d.blockingCode]||availabilityReasons.unknown);}
function admissionSelection(){if(!authenticated||!admissionSlot)return;preferredRoute={view:'requests',ref:admissionSlot.ref};writeRoute(true);}
function admissionOption(value,text){const node=document.createElement('option');node.value=value;node.textContent=text;return node;}
function admissionButtons(){const available=authenticated&&!admissionBusy&&!admissionRead&&admissionData?.admissionReady===true&&admissionSlot?.state==='available'&&admissionSlot.statusKnown!==false;$('admission-approve').disabled=!available;$('admission-check').disabled=!authenticated||admissionBusy||!!admissionRead||!admissionSlot;for(const id of ['admission-entry','admission-slot','admission-refresh'])$(id).disabled=admissionBusy;}
function cancelAdmissionRead(){admissionReadVersion++;if(admissionRead)admissionRead.controller.abort();admissionRead=null;clearTimeout(admissionPoll);admissionPoll=null;}
function selectAdmissionSlot(){
 cancelAdmissionRead();admissionSlot=admissionEntry?.slots.find(s=>s.slotId===$('admission-slot').value)??null;$('admission-result').hidden=true;$('admission-review-note').hidden=true;$('admission-output').textContent='';$('admission-formatted').replaceChildren();admissionSelection();$('admission-state').textContent=admissionSlot?(admissionSlot.statusKnown===false?'Current status unknown. Last observed: '+admissionSlot.state+'.':'State: '+admissionSlot.state):'No request selected.';admissionButtons();
}
function selectAdmissionEntry(){
 admissionEntry=admissionData?.entries.find(e=>e.entryId===$('admission-entry').value)??null;$('admission-title').textContent=admissionEntry?admissionLabel(admissionEntry):'Choose an input to review';$('admission-input').textContent=admissionEntry?.requestText??'';$('admission-identity').textContent=admissionEntry?'Input: '+admissionEntry.entryId+' · SHA-256 '+admissionEntry.inputSha256:'';$('admission-context').textContent=admissionEntry?[admissionEntry.taskContext.nextAction,admissionEntry.taskContext.latestFinding].filter(Boolean).join('\n'):'';
 $('admission-slot').replaceChildren(...(admissionEntry?.slots??[]).map(s=>admissionOption(s.slotId,s.slotId+' — '+s.state)));$('admission-slot').value=(admissionEntry?.slots.find(s=>s.ref===preferredRoute.ref)??admissionEntry?.slots[0])?.slotId??'';selectAdmissionSlot();
}
function admissionLabel(entry){const labels={'manual-form-limits':'Manual · validation function','board-form-limits':'Task board · regression cases'},label=Object.hasOwn(labels,entry.entryId)?labels[entry.entryId]:entry.entryId.replace(/-/g,' ');return label+' — '+entry.taskContext.title;}
async function openAdmissionResult(ref){preferredRoute={view:'requests',ref};writeRoute();showView('requests');}
$('job-open-result').addEventListener('click',()=>{const row=jobRows.find(r=>r.ref===selectedRef);if(row?.state==='completed'&&row.resultAvailable)void openAdmissionResult(row.ref);});
async function loadAdmissionCatalogue(){
 if(!authenticated||admissionBusy)return;cancelAdmissionRead();admissionBusy=true;admissionButtons();const generation=admissionGeneration;
  try{const data=admissionProject(await admissionRequest('/request-catalogue'));if(generation!==admissionGeneration)return;admissionData=data;$('admission-entry').replaceChildren(...data.entries.map(e=>admissionOption(e.entryId,admissionLabel(e))));const requestedRef=preferredRoute.view==='requests'?preferredRoute.ref:null,target=data.entries.find(e=>e.slots.some(s=>s.ref===requestedRef));$('admission-entry').value=target?.entryId??(requestedRef?'':data.entries[0]?.entryId??'');selectAdmissionEntry();admissionCapability();if(target&&admissionSlot)void readAdmissionResult();admissionMessage(requestedRef&&!target?'This result is not in the current enrolled catalogue. Select an input to inspect a different saved result.':data.legacyReviewRequired?'Historical job evidence needs review before new work. Saved results can still be checked.':!data.entries.length?'No approved requests are enrolled.':data.admissionReady?'Review the exact input before approving one call.':'New requests are unavailable. Saved results can still be checked.');}
 catch{if(generation===admissionGeneration&&authenticated){admissionMessage(admissionData?'Requests could not be checked. Showing the previous observation; current availability is unknown.':'Requests could not be checked.');if(admissionData)admissionData.admissionReady=false;$('admission-capability').hidden=false;$('admission-capability').textContent='Current availability unknown. Refresh requests before approving work.';}}
 finally{if(generation===admissionGeneration){admissionBusy=false;admissionButtons();}}
}
function readAdmissionResult({poll=false}={}){
 if(!authenticated||!admissionSlot)return Promise.resolve();if(admissionRead)return admissionRead.promise;
 clearTimeout(admissionPoll);admissionPoll=null;const generation=admissionGeneration,slot=admissionSlot,ref=slot.ref,version=++admissionReadVersion,controller=new AbortController();
 const current=()=>generation===admissionGeneration&&version===admissionReadVersion&&slot===admissionSlot;
 const read={controller,promise:null};admissionRead=read;admissionButtons();
 read.promise=(async()=>{try{const value=await admissionRequest('/requests/'+ref,undefined,{controller});if(!current())return;if(value?.v!==1||value.ref!==ref||!admissionStates.includes(value.state)||typeof value.resultAvailable!=='boolean')throw Error('result');
   if(value.state==='completed'&&value.resultAvailable&&(typeof value.result?.body!=='string'||value.result.body.length>16000||!['information','question'].includes(value.result.kind)))throw Error('result');
   if(['completed','failed','blocked','cancelled','uncertain'].includes(slot.state)&&value.state!==slot.state)throw Error('state_regression');
   slot.state=value.state;slot.statusKnown=true;$('admission-state').textContent=value.state==='uncertain'?'Uncertain. This request is spent. Do not retry it.':value.state==='failed'&&value.reasonCode==='output_incomplete'?'Output incomplete. This request is spent. Do not retry it.':'State: '+value.state;
   if(value.state==='completed'&&value.resultAvailable){$('admission-output').textContent=value.result.body;renderAdmissionText(value.result.body);$('admission-review-note').hidden=!(admissionEntry.entryId===reviewedRegressionResult.entryId&&admissionEntry.inputSha256===reviewedRegressionResult.inputSha256&&ref===reviewedRegressionResult.ref&&value.result.body===reviewedRegressionResult.body);$('admission-result').hidden=false;}
   admissionCapability();admissionMessage(value.state==='completed'?'Saved result ready.':'Saved status checked. No request was resubmitted.');
   if(poll&&['queued','claimed','invoking'].includes(value.state)&&Date.now()<admissionPollUntil&&document.visibilityState!=='hidden')admissionPoll=setTimeout(()=>{if(current()&&authenticated&&Date.now()<admissionPollUntil)void readAdmissionResult({poll:true});},2000);
  }catch{if(current()){slot.statusKnown=false;$('admission-state').textContent='Current status unknown. Last observed: '+slot.state+'.';admissionMessage('Saved status could not be checked. Current status is unknown; showing the last observation. No request will be resubmitted.');}}
  finally{if(current()&&admissionRead===read){admissionRead=null;admissionButtons();}}
 })();return read.promise;
}
function appendResultInline(parent,text){
 const parts=text.split(/(\x60[^\x60\n]+\x60|\*\*[^*\n]+\*\*)/g);for(const part of parts){const code=part.startsWith('\x60')&&part.endsWith('\x60'),strong=part.startsWith('**')&&part.endsWith('**'),node=document.createElement(code?'code':strong?'strong':'span');node.textContent=code?part.slice(1,-1):strong?part.slice(2,-2):part;parent.append(node);}
}
function renderAdmissionText(text){
 const root=$('admission-formatted');root.replaceChildren();const lines=text.split(/\r?\n/);let i=0;
 const cells=line=>line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(c=>c.trim());
 while(i<lines.length){let line=lines[i++];if(!line.trim())continue;
  if(/^\s*\x60{3}/.test(line)){const pre=document.createElement('pre'),code=document.createElement('code'),body=[];while(i<lines.length&&!/^\s*\x60{3}/.test(lines[i]))body.push(lines[i++]);if(i<lines.length)i++;code.textContent=body.join('\n');pre.append(code);root.append(pre);continue;}
  if(line.includes('|')&&i<lines.length&&cells(lines[i]).every(c=>/^:?-{3,}:?$/.test(c))){const wrap=document.createElement('div'),table=document.createElement('table');wrap.className='result-table';const row=(values,header)=>{const tr=document.createElement('tr');for(const value of values){const cell=document.createElement(header?'th':'td');if(header)cell.setAttribute('scope','col');appendResultInline(cell,value);tr.append(cell);}table.append(tr);};row(cells(line),true);i++;while(i<lines.length&&lines[i].includes('|'))row(cells(lines[i++]),false);wrap.append(table);root.append(wrap);continue;}
  const heading=/^#{1,6}\s+(.+)$/.exec(line),node=document.createElement(heading?'h3':'p');appendResultInline(node,heading?heading[1]:line);root.append(node);
 }
}
async function approveAdmission(){
 if($('admission-approve').disabled||!admissionEntry||!admissionSlot)return;admissionBusy=true;admissionButtons();const generation=admissionGeneration,entry=admissionEntry,slot=admissionSlot;
 try{const proof=await admissionRequest('/request-approvals',{entryId:entry.entryId,slotId:slot.slotId});
  if(proof.existing===true){slot.state=proof.state;await readAdmissionResult();return;}
  if(proof.entryId!==entry.entryId||proof.slotId!==slot.slotId||proof.approvedInputSha256!==entry.inputSha256||!/^[A-Za-z0-9_-]{43}$/.test(proof.nonce??''))throw Error('approval');
  const receipt=await admissionRequest('/requests',{entryId:entry.entryId,slotId:slot.slotId,nonce:proof.nonce,approvedInputSha256:entry.inputSha256,approve:true});if(generation!==admissionGeneration)return;
  if(receipt.ref!==slot.ref||!admissionStates.includes(receipt.state))throw Error('receipt');slot.state=receipt.state;$('admission-state').textContent='State: '+receipt.state;admissionMessage('Registered once. Following this request; it will not be resubmitted.');admissionPollUntil=Date.now()+60000;await readAdmissionResult({poll:true});
 }catch{if(generation===admissionGeneration){slot.state='unknown';admissionMessage('Submission was not confirmed. Check this slot’s saved status. No retry or replacement was sent.');}}
 finally{if(generation===admissionGeneration){admissionBusy=false;admissionButtons();}}
}
$('admission-entry').addEventListener('change',selectAdmissionEntry);$('admission-slot').addEventListener('change',selectAdmissionSlot);$('admission-refresh').addEventListener('click',loadAdmissionCatalogue);$('admission-approve').addEventListener('click',approveAdmission);$('admission-check').addEventListener('click',()=>{if(!$('admission-check').disabled)return readAdmissionResult();});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){clearTimeout(admissionPoll);admissionPoll=null;}});
`;

// BEGIN GENERATED CAPTAIN THEME
// Source-only theme compiler. The generated function is bundled into the existing
// signed admission-ui module; there is no runtime import or host-side injection.
// Captain "LCARS 47": a flat Okuda-grammar presentation. Everything below is static
// markup and CSS keyed off state attributes the shared application already sets.
function captainConsoleHtml(html){
 const replace=(from,to)=>{if(html.split(from).length!==2)throw Error('captain_theme_contract_changed');html=html.replace(from,to);};
 for(const id of ['console-surface','logo-wrap','navigation','private','heading-overview','health-heading','training-progress','activity-list','hud-instruments'])if(html.split('id="'+id+'"').length!==2)throw Error('captain_theme_contract_changed');
 replace('class="console"','class="console captain" data-console-theme="captain"');
 // Presentation only, after the existing login AND status validation succeed.
 // Fail compilation if upstream changes this authentication completion point.
 replace("await status();}\n catch(error){showAuth(setup", "await status();"+CAPTAIN_LOGIN_REVEAL+"}\n catch(error){showAuth(setup");
 // Clear private state first; closing is visual and never delays revocation.
 replace('clearPrivate();clearInputs();authMode=mode;', 'clearPrivate();clearInputs();'+CAPTAIN_AUTH_CLOSE+'authMode=mode;');
 // Navigation keys leave the warp core screen; registered first so it closes before the view changes.
 replace(CAPTAIN_NAV_ANCHOR, ()=>CAPTAIN_CORE_CLOSE+CAPTAIN_NAV_ANCHOR);
 replace('<span id="refresh-label">','<svg class="captain-refresh-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 10a8 8 0 0 0-14-4L3 9m0-5v5h5M4 14a8 8 0 0 0 14 4l3-3m0 5v-5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span id="refresh-label">');
 const utilities=html.match(/<div class="console-utilities">[\s\S]*?<p class="sidebar-foot">MAKE IT SO\.<\/p>/)?.[0];
 if(!utilities)throw Error('captain_theme_contract_changed');
 replace(utilities,'<div class="captain-sidebar-rank">'+captainCodes()+'<span class="captain-pips" aria-hidden="true">● ●</span><p>YOUR COMMISSION</p></div>');
 const rank='<small id="training-rank" hidden></small>';
 replace(rank,'<small class="captain-brand-subtitle">LCARS 47 · Engineering</small>');
 replace('<p>YOUR COMMISSION</p>','<p>YOUR COMMISSION</p>'+rank);
 replace('<div class="captain-sidebar-rank">','<div class="captain-access-panel"><p class="captain-access-label">OWNER ACCESS</p><h2>Command authorization required</h2><p>Sign in to take the conn.</p><div class="captain-access-trace" aria-hidden="true"><span></span><span></span><span></span></div><div class="captain-access-foot"><p>YOUR PRIVATE CONSOLE<small>Jobs · Requests · Relay status</small></p></div></div><div class="captain-sidebar-rank">');
 replace('<div class="workspace"','<header class="captain-topbar"><div class="captain-rail" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><span class="captain-breadcrumb">PICARD RELAY / <span>CONSOLE</span></span><details class="captain-core"><summary class="captain-condition" title="Show warp core status" aria-label="Warp core status"><b aria-hidden="true"></b></summary></details>'+utilities.replace('<p class="sidebar-foot">MAKE IT SO.</p>','')+'</header><div class="workspace"');
 const cockpitButton=html.match(/<button id="cockpit-toggle"[\s\S]*?<\/button>/)?.[0];
 const glassControls=html.match(/<div class="folding-glass"[\s\S]*?<\/label><\/div><\/div><\/div>/)?.[0];
 if(!cockpitButton||!glassControls)throw Error('captain_theme_contract_changed');
 replace(cockpitButton,'');
 replace('<div id="refresh-control"',cockpitButton+'<div id="refresh-control"');
 replace(glassControls,'');
 replace('<div class="console-menu">','<div class="console-menu">'+glassControls);
 html=menuIcons(html,'captain_theme_contract_changed');
 const action='<button id="training-action" type="button" disabled>Check progress</button>';
 replace(action,'');
 // Overview signature line and title; the shared routing map becomes the main card.
 const route=html.match(/<section class="route-map"[\s\S]*?<\/section>/)?.[0];
 if(!route)throw Error('captain_theme_contract_changed');
 replace(route,'');
 replace('<h1 id="heading-overview" tabindex="-1">Overview</h1></div></div>','<p class="captain-eyebrow">You have the conn</p><h1 id="heading-overview" tabindex="-1">Relay operations</h1></div>'+action+'</div>');
 replace('<div class="signal">','<div class="captain-status">'+route+'<div class="signal">');
 replace('<p id="blocking"','</div><p id="blocking"');
 replace('<div class="section-title"><h2>Recent activity','<div class="captain-activity"><div class="section-title"><h2>Recent activity');
 replace('aria-label="Recent activity"></ul>','aria-label="Recent activity"></ul></div>');
 const scene=html.match(/<div id="space-scene" class="space-scene"[\s\S]*?<\/svg><\/div>/)?.[0];
 if(!scene)throw Error('captain_theme_contract_changed');
 replace(scene,'');
 replace('<div class="workspace" id="cockpit-glass" tabindex="0" aria-label="Space view; arrow keys look around">','<div class="workspace" id="cockpit-glass" tabindex="0" aria-label="Space view; arrow keys look around"><div class="captain-window">'+captainSpaceScene()+'<div class="captain-doors" aria-hidden="true"><span></span><span></span></div><div class="core-screen"><div class="core-rail" aria-hidden="true"><span>Warp propulsion · core 01</span><i></i><i></i><i></i></div><div><p class="core-kicker">Warp core status · online</p><p class="core-cond">Condition: </p><dl class="core-readouts"><dt>Matter flow</dt><dd>Normal</dd><dt>Antimatter flow</dt><dd>Normal</dd><dt>M/A intermix ratio</dt><dd>1:1</dd><dt>Relay service</dt><dd class="core-health"></dd><dt>Relay cycle</dt><dd class="core-phase"></dd><dt>Plasma stream</dt><dd class="core-plasma"></dd><dt>Dilithium matrix</dt><dd>100.00%</dd><dt class="core-x">Phase inducer</dt><dd class="core-x">Fwd flow</dd><dt class="core-x">Injector status</dt><dd class="core-x">Nominal</dd><dt class="core-x">Containment field</dt><dd class="core-x">100.00%</dd><dt class="core-x">Coolant temp</dt><dd class="core-x">212 K</dd><dt class="core-x">Antimatter reserve</dt><dd class="core-x">87.40%</dd><dt class="core-x">Core frequency</dt><dd class="core-x">9.42 GHz</dd><dt>Warp field output</dt><dd>22 Cochrane</dd></dl><p class="core-hint">Select the warp core again to return.</p></div><div class="core-column" aria-hidden="true"><div class="core-tube"><i></i><i></i><i></i><i></i><i></i></div></div><div class="core-keys" aria-hidden="true"><span data-code="47-1701">Telemetry</span><span data-code="60-2008">Diagnostic</span><span data-code="73-2315">Intermix ctrl</span><span data-code="86-2622">Int core startup</span><span data-code="99-2929">Forcefield sys</span><span data-code="112-3236">Plasma vent</span><span data-code="125-3543">Emerg shutdown</span><span data-code="138-3850">Emerg core eject</span></div></div>');
 replace('<footer class="footer">','</div><footer class="footer">');
 replace('<option value="captain">Engineering</option>',TRICORDER_OPTION);
 // Shared rules for elements this compiler removes can never match here; drop them.
 // A class used inside :is()/:not()/:has() keeps its selector. Fail if one returns.
 const markup=html.replace(/<style>[\s\S]*?<\/style>/g,'');
 if(REMOVED_CLASSES.some(name=>markup.includes(name)))throw Error('captain_theme_contract_changed');
 const removed=selector=>REMOVED_CLASSES.some(name=>new RegExp('\\.'+name+'(?![\\w-])').test(selector.replace(/\([^()]*(\([^()]*\)[^()]*)*\)/g,'')));
 html=html.replace(/<style>([\s\S]*?)<\/style>/,(_,css)=>'<style>'+filterCss(css,selector=>!removed(selector))+'</style>');
 replace('</style>',CAPTAIN_STYLE+'\n</style>');
 // These attributes only ever hold "true" or "false" (markup literals, or the shared
 // script assigning String(boolean)), so [x^=t] matches exactly what [x=true] does,
 // with the same specificity and fewer bytes. Stop if any other assignment appears.
 for(const name of ['cockpit','stealth','starfield','hudExpanded'])if(markup.split('dataset.'+name+'=').length!==markup.split('dataset.'+name+'=String(').length)throw Error('captain_theme_contract_changed');
 if(/data-(cockpit|stealth|starfield|hud-expanded)="(?!true"|false")|setAttribute\(['"]data-(cockpit|stealth|starfield|hud-expanded)/.test(markup))throw Error('captain_theme_contract_changed');
 html=html.replace(/<style>([\s\S]*?)<\/style>/,(_,css)=>'<style>'+css.replace(/\[data-(cockpit|stealth|starfield|hud-expanded)="?true"?\]/g,'[data-$1^=t]')+'</style>');
 return compactStyles(html);
}

// Whitespace before ":" is kept as one space: in selectors such as
// "[data-stealth=true] :is(...)" it is a descendant combinator, not padding.
function compactStyles(html){
 const keepStrings=(css,pattern,fn)=>css.replace(new RegExp(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|/.source+pattern.source,'g'),(token,...groups)=>token.startsWith('"')||token.startsWith("'")?token:fn(token,...groups));
 const compact=css=>{
  css=keepStrings(css,/\/\*[\s\S]*?\*\//,()=>'');
  css=keepStrings(css,/\s*([{};,])\s*|:\s+|\s+/,(token,punctuation)=>punctuation??(token[0]===':'?':':' '));
  return mergeBlocks(keepStrings(css,/;}/,()=>'}').trim());
 };
 return html.replace(/<style>([\s\S]*?)<\/style>/g,(_,css)=>'<style>'+compact(css)+'</style>');
}

// Scanning helpers for compact CSS. Quoted strings are skipped whole.
const skipQuoted=(s,j)=>{const q=s[j++];while(j<s.length&&s[j]!==q)j+=s[j]==='\\'?2:1;return j;};
const closing=(s,j,open,close)=>{for(let depth=0;j<s.length;j++){const c=s[j];if(c==='"'||c==="'")j=skipQuoted(s,j);else if(c===open)depth++;else if(c===close&&!--depth)return j;}return s.length;};
// [prelude, body|null] pairs at the top level of a block body.
function cssItems(css){
 const items=[];let i=0;
 while(i<css.length){
  let j=i;
  for(let depth=0;j<css.length;j++){const c=css[j];if(c==='"'||c==="'")j=skipQuoted(css,j);else if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(!depth&&(c==='{'||c===';'||c==='}'))break;}
  if(css[j]==='{'){const end=closing(css,j,'{','}');items.push([css.slice(i,j),css.slice(j+1,end)]);i=end+1;}
  else{items.push([css.slice(i,j),null]);i=j+1;}
 }
 return items.filter(([prelude,body])=>body!==null||prelude);
}

// Merge only adjacent identical blocks. Do not reorder rules: specificity,
// importance, logical properties and nested selectors can affect the cascade.
function mergeBlocks(css){
 const out=[];
 for(let [prelude,body] of cssItems(css)){
  const group=/^@(media|supports)/.test(prelude);
  if(body!==null&&group)body=mergeBlocks(body);
  const last=out.at(-1);
  const flat=body!==null&&!prelude.startsWith('@')&&cssItems(body).every(([,b])=>b===null)&&last&&cssItems(last[1]??'').every(([,b])=>b===null);
  const target=(group||flat)&&last?.[0]===prelude&&last[1]!==null?out.length-1:-1;
  if(target<0){out.push([prelude,body]);continue;}
  const earlier=out[target][1];
  if(group){out[target][1]=mergeBlocks(earlier+body);continue;}
  out[target][1]=earlier+(earlier?';':'')+body;
 }
 return serialize(out).replace(/;$/,'');
}
const serialize=items=>items.map(([prelude,body],k)=>body!==null?prelude+'{'+body+'}':prelude+(k<items.length-1?';':'')).join('');

const REMOVED_CLASSES=['sidebar-foot','motto','hud-numbers','display-rail','display-modes','display-effects','folding-glass-arc'];

const CAPTAIN_LOGIN_REVEAL="if(authenticated){cockpitFlags|=1;hudExpanded=true;starClicks=0;syncCockpit();}";
const CAPTAIN_AUTH_CLOSE="cockpitFlags&=~1;hudExpanded=false;starClicks=0;syncCockpit();";
const CAPTAIN_NAV_ANCHOR="for(const view of views)$('nav-'+view).addEventListener('click',e=>openDeckView(view,e.currentTarget));";
const CAPTAIN_CORE_CLOSE="for(const view of views)$('nav-'+view).addEventListener('click',()=>document.querySelector('.captain-core')?.removeAttribute('open'));";

// Settings-menu icons, shared with the tricorder. Geometry simplified from Lucide
// (ISC licence): log-out, pause, hat-glasses, workflow, file-text, external-link, rss,
// users-collaboration, galaxy, rotate-ccw, file-chart-line.
// Decorative only; every control keeps its own text or aria-label as its name.
// #motion rewrites its own text, so its icon sits beside it in a .menu-tool row.
const icon=d=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>';
function menuIcons(html,error){
 const replace=(from,to)=>{if(html.split(from).length!==2)throw Error(error);html=html.replace(from,to);};
 const motion=html.match(/<button id="motion"[^>]*>[^<]*<\/button>/)?.[0];
 if(!motion)throw Error(error);
 replace(motion,'<span class="menu-tool">'+motion.replace('<button ','<button class="tool" ')+icon('M5 3h5v18H5zm9 0h5v18h-5z')+'</span>');
 replace('hidden>Workspace</button>','hidden>'+icon('M13 3a9 9 0 0 1 7.5 6.1M13 22a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2M3 12a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2M3.9 15.9a9 9 0 0 0 5.2 4.6M15 14a2 2 0 1 0 4 0 2 2 0 1 0-4 0M5 4a2 2 0 1 0 4 0 2 2 0 1 0-4 0')+'Workspace</button>');
 replace('hidden>Stars</button>','hidden>'+icon('M16 15.1a5 6.5 28 0 0-8-6.2 5 6.5 28 0 0 8 6.2A11.9 7.3-61 0 1 4 7M17 21h.01M7 3h.01M8 8.9a11.9 7.3-61 0 1 12 8.1M12 12h.01')+'Stars</button>');
 replace('hidden>Replay walkthrough</button>','hidden>'+icon('M3 12a9 9 0 1 0 9-9 9.8 9.8 0 0 0-6.7 2.7L3 8M3 3v5h5')+'Replay walkthrough</button>');
 replace('<button id="workspace-toggle"','<button class="tool" id="workspace-toggle"');
 replace('<button id="stars-toggle"','<button class="tool" id="stars-toggle"');
 replace('<button id="walkthrough-replay"','<button class="tool" id="walkthrough-replay"');
 replace('<button id="windshield-restore" type="button" hidden>Show windshield readout</button>','<button class="tool" id="windshield-restore" type="button" hidden>'+icon('M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2zM14 2v6h6m-4 5-3.5 3.5-2-2L8 17')+'Windshield readout</button>');
 replace('<button id="stealth-mode"','<button class="tool" id="stealth-mode"');
 replace('<button id="stealth-auto-toggle"','<button class="tool" id="stealth-auto-toggle"');
 replace('class="documentation"','class="documentation tool"');
 replace('<button id="feedback-open"','<button class="tool" id="feedback-open"');
 replace('<span id="stealth-label">',icon('M14 18a2 2 0 0 0-4 0m9-7-2-6.4a2 2 0 0 0-2.8-1.2L12 4H8.5a2 2 0 0 0-1.9 1.5L5 11M2 11h20M4 18a3 3 0 1 0 6 0 3 3 0 1 0-6 0m10 0a3 3 0 1 0 6 0 3 3 0 1 0-6 0')+'<span id="stealth-label">');
 replace('<span aria-hidden="true">▸</span> Auto',icon('M3 3h8v8H3zm10 10h8v8h-8zM7 11v4a2 2 0 0 0 2 2h4')+'Auto');
 replace('Documentation <span aria-hidden="true">↗</span>',icon('M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l6 6v12a2 2 0 0 1-2 2zM14 2v6h6M10 9H8m8 4H8m8 4H8')+'Documentation');
 replace('<button class="logout" id="logout" type="button" hidden>Sign out</button>','<button class="logout tool" id="logout" type="button" hidden>'+icon('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9')+'Sign out</button>');
 replace('hidden>Feedback</button>','hidden>'+icon('M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M4 19a1 1 0 1 0 2 0 1 1 0 1 0-2 0')+'Feedback</button>');
 return html;
}

// Deterministic decoration shared by the scenery and the readout block.
function lcg(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

// Decorative LCARS number block. Fixed at build time; never a reading of anything.
function captainCodes(){
 const random=lcg(4701);
 return '<div class="captain-codes" aria-hidden="true">'+Array.from({length:16},()=>'<span>'+String(Math.floor(random()*10**(2+Math.floor(random()*4)))).padStart(2,'0')+'</span>').join('')+'</div>';
}

// Decorative, deterministic scenery. No provider, network asset or live telemetry.
function captainSpaceScene(){
 const random=lcg(1701);
 const layers=[0,1,2].map(layer=>{
  // Stars sorted left to right as short relative moves; "h0" draws a round-capped dot.
  let x=0,y=0;
  const points=Array.from({length:[57,30,22][layer]},()=>[Math.round(random()*1200),Math.round(random()*800)]).sort((a,b)=>a[0]-b[0]).map(([px,py],i)=>{const step=i?`m${px-x}${py-y<0?'':' '}${py-y}h0`:`M${px} ${py}h0`;x=px;y=py;return step;}).join('');
  return `<svg ${layer<2?`id="space-plane-${layer}"`:""} class="captain-stars captain-stars-${layer}" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice"><path d="${points}" fill="none" stroke="${['#b1c5df','#e7f2ff','#fff3d8'][layer]}" stroke-width="${[.7,1.1,1.7][layer]}" stroke-linecap="round"/></svg>`;
 }).join('');
 return '<div id="space-scene" class="space-scene captain-observation" aria-hidden="true">'+layers+'<div class="captain-planet"></div><div class="captain-warp"></div><div class="captain-window-trim"><span>Main viewer · visual</span></div></div>';
}

const CAPTAIN_STYLE=String.raw`
/* ---------- Tokens. Flat colour, condensed type, black field. ---------- */
body:has(.console.captain:not([data-stealth=true])){margin:0;background:#000}
.console.captain:not([data-stealth=true]){--o:#ff9966;--g:#ffcc66;--p:#ffaa90;--l:#cc99cc;--v:#9977aa;
 --b:#9999ff;--s:#99ccff;--t:#ddaa77;--r:#dd6688;--x:#e64a3c;
 --frame-a:#b8475f;--frame-b:#9b5f97;--body:system-ui,"Segoe UI",Roboto,sans-serif;--cond:#7fe0a8;--cond-text:"WARP CORE STABLE";--core-cond:"NORMAL";
 --bg:#000;--side:#000;--surface:#0b0910;--line:#2a2233;--text:#ffe2c4;--muted:#b9a6b8;--accent:var(--g);--good:#7fe0a8;--warn:var(--g);
 --f:Antonio,"Bahnschrift","Arial Narrow","Roboto Condensed","Helvetica Neue",sans-serif;
 --rail:232px;--elbow:190px;
 width:100%;max-width:none;min-width:0;background:#000;color:var(--text);
 font-family:var(--f);font-stretch:condensed;font-size:16px}
.console.captain:not([data-stealth=true]){
 & h1,& h2,& h3{text-transform:uppercase;letter-spacing:.05em;font-weight:500}
 & h1{font-size:clamp(34px,3.3vw,58px);line-height:1;color:var(--o)}
 & h2{font-size:22px;color:var(--o)}
 & h3{font-size:16px;color:var(--l)}
 *:is(dt,label,.job-columns){text-transform:uppercase;letter-spacing:.09em;color:var(--l);font-size:13px}
 & summary{color:var(--s);text-transform:uppercase;letter-spacing:.07em;cursor:pointer}
 & a{color:var(--s)}
 *:is(.muted,.subtle,.scope-note){color:var(--muted)}
 *:is(.request-output,.request-exact,.request-correction,.info-panel,.request-review-history),#private :is(p,li,input,textarea,.job-ref,.job-time,.activity-ref,.detail-title,.metadata dd,.policy dd,.request-summary dd,.groq-lead dd):not(.captain-eyebrow,.route-stages li,.system-status,#detail-state){font-family:var(--body);font-stretch:normal;letter-spacing:normal;text-transform:none}
 #private :is(.job-ref,.activity-ref,.detail-title,#route-status,.metadata dd,.groq-lead dd){font-size:15px}
 & pre:not(.logo){font-family:ui-monospace,Consolas,monospace}
}
/* Buttons are LCARS pills. Low specificity keeps shared component rules in charge. */
:where(.console.captain:not([data-stealth=true])) button{border:0;border-radius:999px;background:var(--p);color:#000;padding:7px 20px 5px;min-height:40px;font:500 16px/1.15 var(--f);font-stretch:condensed;text-transform:uppercase;letter-spacing:.07em;text-align:right;box-shadow:none}
:where(.console.captain:not([data-stealth=true])) button:hover:not(:disabled):not(:where(.job-row,.logo-wrap,#windshield-work,#windshield-dismiss,.count-open)){background:var(--g);color:#000;border-color:transparent}
.console.captain:not([data-stealth=true]){
 & button:focus-visible,& summary:focus-visible{outline:3px solid var(--s);outline-offset:3px}
 *:is(.view-actions,.request-tools,.request-actions,.result-tools,.update-actions) button+button{background:var(--b)}
 .request-primary{background:var(--o)}
 *:is(#logout,#request-changes){background:var(--r)}
 *:is(input:not([type=checkbox]):not([type=radio]),textarea,select){background:#0b0910;color:var(--text);border:0;border-left:12px solid var(--v);border-radius:14px 0 0 14px;padding:10px 12px;font:16px/1.4 system-ui,"Segoe UI",sans-serif}
 *:is(input,textarea,select):focus-visible{outline:2px solid var(--g);outline-offset:2px;border-left-color:var(--g)}
}
/* ---------- The frame: elbows, rails and the block column. ---------- */
@media(min-width:901px){
 body:has(.console.captain:not([data-stealth=true])){height:100dvh;display:flex;flex-direction:column;overflow:hidden}
 body:has(.console.captain:not([data-stealth=true]))>.preview-banner{flex:none}
 .console.captain,.console.captain[data-cockpit=true]{display:grid;grid-template-columns:var(--rail) minmax(0,1fr);grid-template-rows:auto minmax(0,1fr);flex:1;min-height:0;height:auto}
 .console.captain:not([data-stealth=true]){
  .sidebar{grid-column:1;grid-row:1/3;height:100%;min-height:0;overflow:auto;scrollbar-width:none;flex-direction:column}
  .captain-topbar{grid-column:2;grid-row:1}
  .workspace{grid-column:2;grid-row:2;height:100%}
  .sidebar:after{content:"PICARD · 1701";flex:none;display:flex;align-items:flex-end;justify-content:flex-end;height:118px;padding:0 14px 32px;background:var(--frame-b);border-radius:0 0 0 96px;color:#000;font-size:13px;letter-spacing:.16em}
 }
}
.console.captain:not([data-stealth=true]){
 .sidebar{position:relative;top:auto;z-index:2;display:flex;align-items:stretch;gap:5px;padding:0;background:#000;border:0;border-radius:0;box-shadow:none}
 .brand{position:relative;flex:none;display:flex;flex-direction:column;align-items:flex-end;justify-content:flex-end;gap:0;min-height:var(--elbow);margin:0;padding:12px 14px 10px;background:var(--frame-a);border:0;border-radius:96px 0 0 0;box-shadow:none;color:#000;text-align:right}
 .brand p{font-size:24px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:#000;white-space:nowrap}
 .brand small,#recognition{color:#000;font-size:12px;letter-spacing:.16em;text-transform:uppercase}
 .logo-wrap{position:absolute;left:28px;top:30px;display:grid;place-items:center;width:88px;height:88px;min-height:0;padding:0;background:#000;border-radius:50%;box-shadow:inset 0 0 0 4px #000,inset 0 0 0 6px #ffffff22}
 .rank-logo{width:56px;height:68px}
 & nav{display:flex;flex-direction:column;gap:5px;width:auto;margin:0;padding:0;background:none;border:0;border-radius:0;box-shadow:none}
 & nav:before,& nav:after{display:none}
 & nav button{--c:var(--p);position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:8px;width:100%;min-width:0;min-height:60px;padding:7px 14px 6px 12px;border:0;border-radius:0!important;background:var(--c);color:#000;font-size:20px;letter-spacing:.09em;text-align:right;box-shadow:none;transition:filter .15s}
 & nav button:nth-child(2){--c:var(--b)}
 & nav button:nth-child(3){--c:var(--l)}
 & nav button:nth-child(4){--c:var(--t)}
 & nav button:nth-child(5){--c:var(--s)}
 & nav button:hover:not(:disabled){background:var(--c);color:#000;filter:brightness(1.16)}
 & nav button[aria-current=page]{background:#ffe9c2;color:#000;box-shadow:inset 10px 0 var(--g)}
 & nav button[aria-current=page]:before{content:"";position:absolute;left:24px;bottom:11px;width:26px;height:10px;border-radius:5px;background:#000}
 & nav .nav-index{align-self:flex-start;width:auto;font:500 13px/1 var(--f);color:#000;opacity:.72;background:none;box-shadow:none;text-shadow:none;letter-spacing:.06em}
 & nav button:nth-child(1) .nav-index:after{content:"-1701"}
 & nav button:nth-child(2) .nav-index:after{content:"-2552"}
 & nav button:nth-child(3) .nav-index:after{content:"-3189"}
 & nav button:nth-child(4) .nav-index:after{content:"-4407"}
 & nav button:nth-child(5) .nav-index:after{content:"-5096"}
 .captain-sidebar-rank{flex:1 0 auto;min-height:92px;display:flex;flex-direction:column;justify-content:flex-end;align-items:flex-end;margin:0;padding:10px 14px;background:#000;color:var(--b);border:0;border-left:12px solid var(--r);border-radius:0;text-align:right}
 .captain-sidebar-rank p{margin:0;font-size:12px;letter-spacing:.18em}
 .captain-sidebar-rank #training-rank{font-size:21px;letter-spacing:.14em;text-transform:uppercase;color:var(--o)}
 .captain-pips{font-size:0;line-height:0;margin-bottom:6px}
 &:has(#logo-wrap[data-rank=cadet]) .captain-pips{visibility:hidden}
}
/* Top rail with the inner elbow fillet, title, readout block and controls. */
.console.captain:not([data-stealth=true]){
 .captain-topbar{position:relative;z-index:3;display:grid;grid-template-columns:minmax(0,1fr) auto auto;grid-template-rows:24px minmax(58px,auto);align-items:center;column-gap:18px;margin:0;padding:0 0 0 0;background:#000;border:0;border-radius:0}
 .captain-topbar:before{content:"";position:absolute;left:0;top:24px;width:32px;height:32px;background:radial-gradient(circle at 100% 100%,#0000 31.5px,var(--frame-a) 32px);pointer-events:none}
}
.captain-rail{grid-column:1/-1;grid-row:1;align-self:stretch;display:flex;gap:5px}
.captain-rail i{flex:0 0 6%;background:var(--l)}
.captain-rail i:nth-child(1){flex:1;background:var(--frame-a)}
.captain-rail i:nth-child(2){flex-basis:13%;background:var(--b)}
.captain-rail i:nth-child(3){flex-basis:3%;background:var(--g)}
.captain-rail i:nth-child(5){flex:0 0 64px;border-radius:0 12px 12px 0;background:var(--frame-a)}
.console.captain:not([data-stealth=true]){
 .captain-breadcrumb{grid-row:2;grid-column:1;padding:0 0 0 48px;font-size:30px;line-height:1;letter-spacing:.08em;color:var(--o);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .captain-breadcrumb>span{font-size:0}
 .captain-breadcrumb>span:after{content:"CONSOLE";font-size:30px;color:var(--g)}
 &:has(#nav-overview[aria-current=page]) .captain-breadcrumb>span:after{content:"OVERVIEW"}
 &:has(#nav-jobs[aria-current=page]) .captain-breadcrumb>span:after{content:"JOBS"}
 &:has(#nav-requests[aria-current=page]) .captain-breadcrumb>span:after{content:"REQUESTS"}
 &:has(#nav-groq[aria-current=page]) .captain-breadcrumb>span:after{content:"GROQ"}
 &:has(#nav-system[aria-current=page]) .captain-breadcrumb>span:after{content:"SYSTEM"}
 &:has(#auth:not([hidden])) .captain-breadcrumb{display:none}
}
.captain-codes{display:grid;grid-template-columns:repeat(4,auto);gap:1px 10px;margin:0 auto auto 0;font-size:13px;line-height:1.3;color:var(--s);text-align:right;font-variant-numeric:tabular-nums}
.captain-codes span:nth-child(3n+2){color:var(--r)}
.captain-codes span:nth-child(7n){color:var(--g)}
.captain[data-motion=on] .captain-codes span:nth-child(3n+1){animation:captain-blink 3.1s steps(1) infinite}
.captain[data-motion=on] .captain-codes span:nth-child(5n+3){animation:captain-blink 2.3s steps(1) -1.2s infinite}
/* Warp core: plasma rings around a reaction chamber. The middle layer holds a
   glow at each injector; shrinking it to the centre draws both pulses inward
   while the chamber swells to meet them.
   Casing and label carry the existing condition colour. */
.captain-condition{grid-row:2;grid-column:2;display:flex;align-items:center;gap:10px}
.captain-condition:after{content:var(--cond-text);color:var(--cond);font-size:14px;letter-spacing:.14em;white-space:nowrap}
.captain-condition b{width:110px;height:20px;border:2px solid var(--cond);border-radius:10px;background:radial-gradient(#dff 15%,#4af 35%,#0000 65%) 50%/16px 100% no-repeat,linear-gradient(90deg,#aef,#0000 20% 80%,#aef) 50%/100% 100% no-repeat,repeating-linear-gradient(90deg,#27c 0 4px,#012 0 7px)}
.captain[data-motion=on] .captain-condition b{animation:warp 1.6s ease-in infinite}
@keyframes warp{to{background-size:40px 100%,0 100%,auto;box-shadow:0 0 10px #4af}}
.captain-core{grid-row:2;grid-column:2;min-width:0}
.captain-core>summary{list-style:none;cursor:pointer;padding:2px 4px;border-radius:12px}
.captain-core>summary::-webkit-details-marker{display:none}
.captain-core>summary:hover b,.captain-core[open]>summary b{box-shadow:0 0 12px #4af}
.captain-core>summary:focus-visible{outline:2px solid var(--g);outline-offset:3px}
.core-screen{display:none}
.console.captain:not([data-stealth=true]):has(.captain-core[open]):not(:has(#auth:not([hidden]))){
 .folding-shell{display:none}
 .core-screen{display:grid}
}
.console.captain:not([data-stealth=true]){
 .core-screen{position:relative;z-index:6;box-sizing:border-box;grid-template-columns:minmax(0,max-content) minmax(0,1fr) minmax(150px,210px);grid-template-rows:auto minmax(0,1fr);align-items:center;gap:24px 48px;min-height:100%;padding:24px 44px 24px 32px;background:#000;border-left:28px solid var(--b);border-top:12px solid var(--b);border-bottom:12px solid var(--b);border-radius:52px 0 0 52px;text-transform:uppercase}
 &[data-cockpit=true] .core-screen{position:absolute;inset:16px 16px 152px;min-height:0;overflow:auto;box-shadow:0 0 0 5px #000}
 .core-screen p{margin:0}
 .core-rail{grid-column:1/-1;display:flex;gap:5px;height:22px}
 .core-rail span{padding:2px 14px 0;border-radius:11px 0 0 11px;background:var(--o);color:#000;font-size:14px;line-height:20px;letter-spacing:.14em;white-space:nowrap}
 .core-rail i{flex:1;background:var(--b)}
 .core-rail i:nth-child(3){flex:0 0 56px;background:var(--g)}
 .core-rail i:nth-child(4){flex:0 0 110px;border-radius:0 11px 11px 0;background:var(--l)}
 .core-keys{display:flex;flex-direction:column;gap:5px;align-self:stretch}
 .core-keys span{--c:var(--b);flex:1;display:flex;align-items:flex-end;justify-content:flex-end;min-height:34px;padding:4px 12px 3px;background:var(--c);color:#000;font-size:15px;letter-spacing:.06em;text-align:right}
 .core-keys span:before{content:attr(data-code);margin-right:auto;align-self:flex-start;font-size:11px;opacity:.7}
 .core-keys span:first-child{border-radius:20px 0 0 0}
 .core-keys span:nth-child(2){--c:#ffe9c2}
 .core-keys span:nth-child(3){--c:var(--l)}
 .core-keys span:nth-child(4){--c:var(--o)}
 .core-keys span:nth-child(5){--c:#ffe9c2}
 .core-keys span:nth-child(6){--c:var(--t)}
 .core-keys span:nth-child(7){--c:var(--b)}
 .core-keys span:last-child{--c:var(--x);border-radius:0 0 0 20px}
 .core-kicker{color:var(--o);font-size:clamp(20px,min(2.3vw,4.4vh,5cqh),52px);letter-spacing:.05em}
 .core-cond{margin:2px 0 14px!important;color:#fff;font-size:clamp(28px,min(3.6vw,7vh,8cqh),92px);line-height:1}
 .core-cond:after{content:var(--core-cond);color:var(--cond)}
 .core-readouts{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:0 48px;margin:0;font-size:clamp(14px,min(1.3vw,2.6vh,3.1cqh),32px);line-height:1.3;letter-spacing:.04em}
 .core-readouts dt{color:var(--g);font-size:inherit;letter-spacing:inherit}
 .core-readouts dd{margin:0;color:var(--o);text-align:right}
 .core-readouts .core-x{display:none}
 .core-health:after{content:"NORMAL"}
 &:has(#health-heading:not([data-tone=good])) .core-health:after{content:"DEGRADED"}
 .core-phase:after{content:"STANDBY"}
 &[data-route-phase=idle] .core-phase:after{content:"READY"}
 &:is([data-route-phase=queued],[data-route-phase=claimed],[data-route-phase=invoking]) .core-phase:after{content:"ENGAGED"}
 &:is([data-route-phase=failed],[data-route-phase=blocked],[data-route-phase=cancelled]) .core-phase:after{content:"STOPPED"}
 &:is([data-route-phase=uncertain],[data-route-phase=unknown]) .core-phase:after{content:"UNVERIFIED"}
 .core-plasma:after{content:"CONST"}
 &[data-motion=off] .core-plasma:after{content:"HELD"}
 .core-hint{margin-top:14px!important;color:var(--muted);font:clamp(14px,min(.8vw,1.7vh),18px) var(--body);text-transform:none}
 .core-column{position:relative;display:flex;justify-content:center;justify-self:center;align-self:stretch;min-height:300px;padding:0 40px}
 .core-column:before,.core-column:after{content:"";position:absolute;top:7%;bottom:7%;width:22px;border:5px solid var(--b);background:repeating-linear-gradient(180deg,var(--b) 0 2px,#0000 0 16px) 100% 0/9px 100% no-repeat}
 .core-column:before{left:0;border-right:0;border-radius:18px 0 0 18px}
 .core-column:after{right:0;border-left:0;border-radius:0 18px 18px 0;background-position:0 0}
 .core-tube{display:grid;grid-template-rows:9% 1fr 13% 1fr 9%;width:clamp(156px,26cqh,300px)}
 .core-tube i{margin:0 18px;background:linear-gradient(90deg,#0000 47%,#000 0 53%,#0000 0),linear-gradient(#0000,#fffa 50%,#0000) 0 -70%/100% 34% no-repeat,linear-gradient(90deg,#0007,#0000 30% 70%,#0007),linear-gradient(var(--a) 70%,var(--d) 0) 0 0/100% 10px}
 .core-tube i:nth-child(2){--a:#8cf;--d:#1d3a63}
 .core-tube i:nth-child(4){--a:#f66;--d:#5a1616}
 .core-tube :is(i:nth-child(1),i:nth-child(3),i:nth-child(5)){margin:0;background:repeating-linear-gradient(#0000 0 7px,#0006 0 9px),linear-gradient(90deg,#33363c,#9a9fa8 45%,#44474e)}
 .core-tube i:nth-child(1){margin:0 9px;border-radius:44% 44% 6px 6px/70% 70% 6px 6px}
 .core-tube i:nth-child(5){margin:0 9px;border-radius:6px 6px 44% 44%/6px 6px 70% 70%}
 .core-tube i:nth-child(3){border-radius:12px}
}
.captain[data-motion=on] .core-tube i:nth-child(2){animation:core-flow 1.6s linear infinite}
.captain[data-motion=on] .core-tube i:nth-child(4){animation:core-flow 1.6s linear infinite reverse}
.captain[data-motion=on] .core-tube i:nth-child(3){animation:core-pulse 1.6s ease-in infinite}
.captain[data-motion=on] .core-keys span:nth-child(2){animation:captain-blink 3.1s steps(1) infinite}
@keyframes core-flow{from{background-position:0 0,0 -70%,0 0,0 0}to{background-position:0 0,0 170%,0 0,0 10px}}
@keyframes core-pulse{80%{filter:brightness(1.7);box-shadow:0 0 26px #9cf}}
@media(min-width:901px){.console.captain:not([data-stealth=true]){.core-screen{container-type:size;overflow:auto}&:not([data-cockpit=true]) .core-screen{height:100%;min-height:520px}}}
@container (min-height:470px){.console.captain:not([data-stealth=true]) .core-readouts .core-x{display:block}}
@media(max-width:900px){.console.captain:not([data-stealth=true]){.core-screen{gap:16px;padding:18px 12px 18px 16px;border-left-width:14px;border-top-width:8px;border-bottom-width:8px;border-radius:32px 0 0 32px}&[data-cockpit=true] .core-screen{inset:8px 8px 200px}.core-column{min-height:240px;padding:0 18px}.core-column:before,.core-column:after{width:14px;border-width:4px}.core-tube{width:112px}.core-tube i{margin:0 10px}.core-screen{grid-template-columns:minmax(0,1fr) auto;grid-template-rows:none;align-content:start}.core-keys{grid-column:1/-1;flex-flow:row wrap}.core-keys span{flex:1 1 22%;min-height:40px;font-size:13px}.core-keys span:is(:first-child,:last-child){border-radius:0}.core-rail i:nth-child(4){flex-basis:40px}}}
.console.captain:not([data-stealth=true]){
 &:has(#auth:not([hidden])) .captain-condition{display:none}
 .captain-topbar .console-utilities{grid-row:2;grid-column:3;display:flex;align-items:center;gap:6px;margin:0;padding:0 18px 0 0;background:none;border:0;box-shadow:none}
 #cockpit-toggle{background:var(--l)}
 .refresh-control{position:relative;padding:0}
 .refresh{display:inline-flex;align-items:center;gap:8px;min-height:40px;padding:6px 18px 4px;border:0;border-radius:999px;background:var(--s);color:#000;font-size:16px}
 .refresh:hover:not(:disabled){background:var(--g);color:#000}
}
.captain-refresh-icon{width:17px;height:17px;flex:none}
.console.captain:not([data-stealth=true]){
 .live-feed{position:static;transform:none;color:#00000099;font:500 11px/1 var(--f);letter-spacing:.08em}
 .live-feed:before{width:6px;height:6px}
 .captain-topbar .console-tools{position:absolute;top:0;right:0;z-index:4}
 .console-tools summary{position:relative;display:grid;place-items:center;width:64px;min-width:0;height:24px;min-height:24px;padding:0 0 3px;border-radius:0 12px 12px 0;background:var(--frame-a);color:#000;font-size:20px;line-height:1}
 .console-tools summary:after{content:"";position:absolute;inset:-10px 0;}
 .console-tools summary:hover,.console-tools[open] summary{background:var(--g);color:#000}
}
/* Settings menu as a bracketed LCARS panel: compact icon rows with hover tips. */
.console.captain:not([data-stealth=true]){
 .console-menu{display:flex;flex-direction:column;align-items:stretch;gap:2px;min-width:250px;padding:10px 10px 12px;background:#000;border:0;border-left:18px solid var(--l);border-top:6px solid var(--l);border-bottom:6px solid var(--l);border-radius:30px 0 0 30px;box-shadow:0 16px 40px #000d}
 .console-menu :is(.folding-glass,.folding-side,.auto-instrument){display:contents}
 /* Stealth and its Auto setting share one split row; the setting opens below. */
 .console-menu .folding-side+.folding-side{display:flex;flex-wrap:wrap;align-self:stretch;padding:0}
 #stealth-mode{flex:1;width:auto;border-radius:999px 0 0 999px}
 #stealth-auto-toggle{width:auto;gap:6px;border-left:1px solid #99f6;border-radius:0 999px 999px 0}
 .menu-tool{display:flex;align-items:center}
 .menu-tool svg{order:-1;margin:0 -26px 0 10px;position:relative;pointer-events:none}
 #motion:disabled+svg{opacity:.55}
 .console-menu svg{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:var(--o)}
 .console-menu .tool{display:flex;align-items:center;gap:10px;width:100%;min-height:30px;padding:3px 10px 1px;border-radius:999px;background:none;box-shadow:none;color:var(--b);font-size:14px;text-decoration:none;text-transform:uppercase;letter-spacing:.07em}
 #motion{padding-left:36px}
 /* Appearance first, then the tools; Sign out stays last. */
 :is(.appearance-choice,#appearance-notice,#appearance-confirm){order:-1}
 .tool:hover{background:var(--b);color:#000}
 .console-menu :is(.menu-tool:hover svg,:hover>svg){color:#000}
 .console-menu [aria-pressed=true]{color:var(--g)}
 .console-menu kbd{display:none}
 #stealth-settings{position:static;flex-basis:100%;display:grid;gap:4px;padding:2px 10px 6px 36px;color:var(--b);font-size:13px}
 :where(.console-menu button:not(.tool)){display:flex;justify-content:flex-end;width:100%;min-height:30px;margin-top:4px;padding:4px 14px 2px;border-radius:999px;background:var(--b);color:#000;text-transform:uppercase;letter-spacing:.07em}
 .console-menu #logout{margin-top:6px;background:none;color:var(--r)}
 .console-menu #logout:hover{background:var(--r);color:#000}
 :where(.console-menu button:not(.tool)):hover{background:var(--g)}
 .appearance-choice{display:grid;gap:4px;margin-bottom:6px}
 :is(#console-tools,#private) select{min-height:34px;padding:3px 12px 1px;border:1px solid #99f6;border-radius:999px;background:#000;color:var(--b);font:14px var(--f);text-transform:uppercase;letter-spacing:.07em}
 :is(#private,#auth) :is(input:not([type=checkbox]):not([type=radio]),textarea){padding:10px 16px;border:1px solid #99f6;border-radius:22px;background:#000}
 :is(#private,#auth) :is(input,textarea):focus-visible{border-color:var(--g);outline-offset:3px}
 /* Tips sit left of the panel, level with the hovered or focused row. */
 #motion{--tip:"Pause or resume animation"}
 #stealth-mode{--tip:"Switch to a plain console. Shortcut: Alt+Shift+S"}
 #stealth-auto-toggle{--tip:"Auto stealth: turn on when hidden or idle"}
 .documentation{--tip:"Open the documentation in a new tab"}
 #feedback-open{--tip:"Send feedback about Picard Relay"}
 #workspace-toggle{--tip:"Show the LCARS workspace"}
 #stars-toggle{--tip:"Show or hide the starfield"}
 #walkthrough-replay{--tip:"Replay the walkthrough"}
 #windshield-restore{--tip:"Show the status readout on the windshield again"}
 #logout{--tip:"Sign out of this console"}
 .tool:is(:hover,:focus-visible):after{content:var(--tip);position:absolute;right:calc(100% + 26px);z-index:9;white-space:nowrap;padding:5px 12px 3px;border-radius:999px;background:var(--g);color:#000;font-size:12px;text-transform:none;pointer-events:none}
}
/* Footer rail and the lower elbow fillet. */
.console.captain:not([data-stealth=true]){
 .footer{position:relative;flex:none;order:initial;display:flex;justify-content:flex-end;align-items:flex-end;height:58px;margin:0;padding:0;border:0;align-self:stretch;inset:auto}
 .footer:before{content:"";position:absolute;left:0;right:60px;bottom:0;height:24px;background:linear-gradient(90deg,var(--frame-b) 0 44%,#000 0 calc(44% + 5px),var(--b) 0 57%,#000 0 calc(57% + 5px),var(--o) 0 62%,#000 0 calc(62% + 5px),var(--l) 0)}
 .footer:after{content:"";position:absolute;left:0;bottom:24px;width:32px;height:32px;background:radial-gradient(circle at 100% 0,#0000 31.5px,var(--frame-b) 32px);pointer-events:none}
 .console-info summary{width:55px;height:24px;min-height:0;border-radius:0 12px 12px 0;background:var(--frame-b);color:#000}
 .console-info summary span{border-color:#000;width:16px;height:16px;font-size:11px}
 .info-panel{background:#000;border:0;border-left:14px solid var(--v);border-radius:22px 0 0 22px;box-shadow:0 12px 30px #000c}
}
/* ---------- Viewing window, scenery and the bridge doors. ---------- */
.console.captain:not([data-stealth=true]){
 .workspace,&[data-cockpit=true] .workspace{position:relative;z-index:1;display:flex;flex-direction:column;width:auto;max-width:none;min-width:0;min-height:0;margin:0;padding:0;background:transparent;border:0;border-radius:0;box-shadow:none}
/* Window and panels share the Engineering scope, so later scoped rules win by order. */
 .captain-window{position:relative;isolation:isolate;flex:1;min-height:0;margin:12px 18px 6px 26px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--v) #000}
 #private{position:relative;z-index:2;padding:0 6px 30px 0;background:#000;border:0;box-shadow:none}
 &:not([data-cockpit=true]) #private{min-height:100%}
 &[data-cockpit=true] .captain-window{overflow:hidden;background:#02040a;border-radius:30px}
 .space-scene{display:block;position:absolute;inset:0;overflow:hidden;z-index:0;background:radial-gradient(ellipse at 64% 36%,#3b335429,#0000 48%),radial-gradient(ellipse at 28% 65%,#163a502e,#0000 60%),#03050b}
}
.captain-stars{position:absolute;inset:-5%;width:110%;height:110%;opacity:.85;transform-origin:center;animation:none}
.captain-stars-1{opacity:.9}
.captain-stars-2{opacity:1}
.captain[data-starfield=true][data-motion=on] .captain-stars{animation:captain-drift 100s ease-in-out infinite alternate}
.captain[data-starfield=true][data-motion=on] .captain-stars-1{animation-duration:70s;animation-direction:alternate-reverse}
.captain[data-starfield=true][data-motion=on] .captain-stars-2{animation-duration:50s}
.captain-planet{position:absolute;width:clamp(280px,46vw,720px);aspect-ratio:1;right:-11%;bottom:-46%;border-radius:50%;background:radial-gradient(circle at 29% 17%,#e3e8da8c,#0000 23%),radial-gradient(ellipse at 35% 24%,#7d9fb0 0,#2d4b63 24%,#122038 43%,#040710 64%);box-shadow:-3px -3px 3px #b2d8e7aa,-8px -6px 22px #5083a355,-25px -18px 75px #30547433,inset -65px -40px 90px #010207;transform:rotate(-18deg)}
.captain-window-trim{position:absolute;inset:44px 48px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none}
.captain-window-trim span{padding:3px 12px 1px;border-radius:999px;background:#ff996633;color:#ffcc99;font-size:12px;letter-spacing:.2em;text-transform:uppercase}
.captain[data-hud-expanded=true] .captain-window-trim{visibility:hidden}
/* Warp-in on arrival: streaks scale out from the viewer centre, then the field settles. */
.captain-warp{position:absolute;inset:-35%;opacity:0;pointer-events:none;background:repeating-conic-gradient(from 2deg,#0000 0 2.4deg,#e4eeff 2.7deg 2.95deg,#0000 3.2deg 6.4deg);-webkit-mask:radial-gradient(circle,#0000 5%,#000 20%,#0000 60%);mask:radial-gradient(circle,#0000 5%,#000 20%,#0000 60%)}
.captain[data-starfield=true][data-motion=on][data-cockpit=true] .captain-warp{animation:captain-warp 1.7s cubic-bezier(.2,.65,.3,1) .3s both}
@keyframes captain-warp{0%{opacity:0;transform:scale(.25) rotate(0)}22%{opacity:.95}100%{opacity:0;transform:scale(2.4) rotate(4deg)}}
@keyframes captain-drift{from{transform:translate3d(-1%,.5%,0)}to{transform:translate3d(1.5%,-1%,0)}}
/* Doors: two panels part with a short unlock hitch, then slide clear. They sit above
   the cockpit panels while moving, so the deck is revealed rather than faded in. */
.console.captain:not([data-stealth=true]){
 .captain-doors{position:absolute;inset:0;z-index:1;display:flex;overflow:hidden;pointer-events:none;transition:z-index 0s 950ms}
 .captain-doors span{position:relative;width:50%;height:100%;background:linear-gradient(#0000 0 17%,#00000040 0 17.3%,#0000 0 82.7%,#00000040 0 83%),linear-gradient(90deg,#2a242d,#48404a 72%,#3c343f);box-shadow:inset -4px 0 #0f0c11,inset -6px 0 #ffffff14;transition:transform 950ms cubic-bezier(.7,0,.3,1);transition-timing-function:linear(0,.05 15%,.06 30%,.5 62%,.9 84%,1)}
 .captain-doors span:last-child{background:linear-gradient(#0000 0 17%,#00000040 0 17.3%,#0000 0 82.7%,#00000040 0 83%),linear-gradient(270deg,#2a242d,#48404a 72%,#3c343f);box-shadow:inset 4px 0 #0f0c11,inset 6px 0 #ffffff14}
 .captain-doors span:before{content:"";position:absolute;left:0;right:18px;top:calc(50% - 10px);height:20px;border-radius:0 10px 10px 0;background:var(--frame-a);box-shadow:0 0 0 6px #000}
 .captain-doors span:last-child:before{left:18px;right:0;border-radius:10px 0 0 10px;background:var(--l)}
 .captain-doors span:after{content:"DECK 01";position:absolute;top:30px;right:30px;padding:4px 14px 2px;border-radius:999px;background:var(--p);color:#000;font-size:14px;letter-spacing:.16em}
 .captain-doors span:last-child:after{content:"MAIN BRIDGE";left:30px;right:auto;background:var(--b)}
 &:has(#auth:not([hidden])) .captain-doors span:after{content:"ACCESS";background:var(--x)}
 &:has(#auth:not([hidden])) .captain-doors span:last-child:after{content:"RESTRICTED"}
 &[data-cockpit=true] .captain-doors span:after{content:"ACCESS";background:var(--good)}
 &[data-cockpit=true] .captain-doors span:last-child:after{content:"GRANTED"}
}
.captain[data-cockpit=true] .captain-doors span:first-child{transform:translateX(-101%)}
.captain[data-cockpit=true] .captain-doors span:last-child{transform:translateX(101%)}
.console.captain:not([data-stealth=true]){
 &[data-cockpit=true] .captain-doors{z-index:6;transition:none}
 &[data-cockpit=true] .space-scene{z-index:3}
 &[data-motion=on][data-cockpit=false] .space-scene{transition:z-index 0s 1150ms}
 &[data-motion=on][data-cockpit=false] .captain-doors span{transition-delay:200ms}
 &[data-cockpit=false] .captain-doors{z-index:1;opacity:0}
 &[data-motion=on][data-cockpit=false] .captain-doors{transition:z-index 0s 2100ms,opacity .9s ease-in-out 1150ms}
 &:has(#auth:not([hidden])) .captain-doors{opacity:1}
}
/* ---------- Cockpit deck: lower console, reading panel, windshield readout. ---------- */
.console.captain:not([data-stealth=true]){
 .folding-crown,.folding-glass-arc,.folding-arc{display:none}
 &:not([data-cockpit=true]) .cockpit-dash{display:none}
 &[data-cockpit=true] .cockpit-dash{position:absolute;left:0;right:0;bottom:0;z-index:5;display:block;width:auto;min-height:0;margin:0;padding:16px;background:transparent;border:0;border-radius:0}
 .cockpit-dash .hud-instruments{position:relative;inset:auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px 22px;width:100%;min-height:86px;margin:0;padding:10px 24px;background:#000e;border:0;border-left:32px solid var(--o);border-right:32px solid var(--l);border-radius:44px;box-shadow:0 0 0 5px #000}
 [data-arc-control],[data-arc-control]>button{translate:none;rotate:none}
 .hud-instruments button{min-height:52px}
 .hud-instruments span,.hud-instruments small{font-size:12px;letter-spacing:.14em;color:var(--l);text-transform:uppercase}
 .hud-instruments #hud-ready{padding-left:16px}
 .hud-instruments #hud-ready:before{border-left:6px solid var(--good);border-radius:3px;top:10px;bottom:10px}
 .hud-instruments #hud-ready strong{color:var(--good);font-size:18px;text-transform:uppercase;letter-spacing:.06em}
 .hud-instruments .hud-numeral{font:500 44px/1 var(--f);font-stretch:condensed;letter-spacing:.02em;color:var(--g);text-shadow:none}
 .hud-instruments #hud-progress{min-height:40px;padding:6px 18px 4px;border:0;border-radius:999px;background:var(--b);color:#000;font-size:15px}
 .hud-instruments #hud-next{min-height:44px;padding:8px 22px 6px;border:0;border-radius:999px;background:var(--o);color:#000;font-size:17px;box-shadow:none}
 .hud-instruments *:is(#hud-progress,#hud-next):hover:not(:disabled){background:var(--g);color:#000}
 &[data-cockpit=true] .power-details{background:#000;border:0;border-left:14px solid var(--l);border-radius:22px 0 0 22px}
}
.console.captain[data-cockpit=true] .folding-shell{position:absolute;inset:16px 16px 152px;width:auto;max-width:none;z-index:5;background:#000e;border:0;border-left:28px solid var(--b);border-top:12px solid var(--b);border-bottom:12px solid var(--b);border-radius:52px 0 0 52px;box-shadow:0 0 0 5px #000;transform-origin:center}
.console.captain:not([data-stealth=true]){
 &[data-cockpit=true] .folding-shell:before{display:none}
 &[data-cockpit=true] .folding-shell #private{position:relative;z-index:0;inset:auto;transform:none;width:100%;max-width:none;max-height:100%;height:100%;overflow:auto;border:0;padding:16px 62px 20px 22px;background:transparent}
 &[data-cockpit=true] .folding-shell #hud-close{top:10px;right:10px;width:auto;min-width:48px;min-height:32px;padding:0 14px 2px;border-radius:999px;background:var(--r);color:#000;font-size:22px;line-height:1;text-align:center}
 &[data-cockpit=true]{
  #view-overview{grid-template-columns:minmax(0,1.7fr) 1fr 1.2fr;grid-template-rows:max-content minmax(max-content,1fr) repeat(3,max-content);gap:11px 16px}
  #view-overview>.training{grid-column:2}
  #view-overview>.captain-activity{grid-area:2/3;contain:size}
  #view-overview>#codex-savings{grid-area:5/1/6/-1;display:flex;flex-wrap:wrap;align-items:center;gap:0 20px}
  #codex-savings-headline{font-size:22px}
  .view-head{padding-bottom:10px}
  .view-head h1{font-size:24px}
  *:is(.captain-eyebrow,.captain-intro,#training-action){display:none}
  .counts dd{font-size:32px}
  .readiness{grid-column:1/-1;grid-template-columns:repeat(4,minmax(0,1fr))}
 }
 .windshield-track{position:absolute;inset:0;z-index:5;pointer-events:none}
 #windshield-readout{background:#000d;border-left:14px solid var(--g);border-radius:22px 0 0 22px}
 #windshield-readout:before,#windshield-readout:after{display:none}
 #windshield-state{color:var(--g);font:500 12px/1.4 var(--f);letter-spacing:.16em}
 #windshield-title{font-size:19px;text-transform:uppercase;letter-spacing:.05em}
 #windshield-dismiss{border-left:0;color:var(--l)}
}
/* ---------- Panels: LCARS brackets with cut-in titles. ---------- */
.console.captain:not([data-stealth=true]){
 #view-overview{display:grid;grid-template-columns:minmax(0,1.9fr) minmax(300px,1fr);grid-template-rows:max-content max-content auto max-content minmax(150px,1fr);gap:18px 20px;height:100%}
 #view-overview>.blocking{grid-row:3}
 #view-overview>.counts{grid-row:4}
 &:not([data-cockpit=true]) #view-overview:has(#blocking[hidden]){grid-template-rows:max-content max-content 0 max-content minmax(150px,1fr);row-gap:9px}
 &:not([data-cockpit=true]) #view-overview:has(#blocking[hidden])>*:is(.captain-status,#codex-savings,.captain-activity,.training){margin-top:9px}
 #view-overview>.captain-activity{grid-column:1;grid-row:5;display:flex;flex-direction:column;min-height:0}
 #view-overview>#codex-savings{grid-column:2;grid-row:2}
 .captain-activity .activity{flex:1;min-height:0;overflow:auto}
 &:not([data-cockpit=true]) .folding-shell{position:relative;z-index:2;min-height:100%;background:#000}
 &:not([data-cockpit=true]) .folding-shell:has(#view-overview:not([hidden])){height:100%}
 &:not([data-cockpit=true]) #private:has(#view-overview:not([hidden])){height:100%;overflow:auto}
 .view-head h1{font-size:clamp(28px,2.6vw,44px)}
 #view-overview>*{grid-column:1/-1;margin:0}
 #view-overview>.view-head{grid-row:1}
 :is(#view-jobs,#view-requests,#view-groq)>.view-head{margin-bottom:18px}
 #view-overview>.captain-status{grid-column:1;grid-row:2}
 #view-overview>.training{grid-column:2;grid-row:5}
 *:where(.captain-status,.training,.captain-activity,#codex-savings){--pc:var(--o)}
 *:is(.captain-status,.training,.captain-activity,#codex-savings){position:relative;margin:0;padding:18px 18px 12px 16px;background:#000;border:0;border-left:16px solid var(--pc);border-top:6px solid var(--pc);border-bottom:6px solid var(--pc);border-radius:28px 0 0 28px;box-shadow:none}
 .training{--pc:var(--l)}
 .captain-activity{--pc:var(--b)}
 #codex-savings{--pc:var(--t)}
 *:is(.captain-card-title,.training-heading h2,.section-title h2,#codex-savings-title){position:absolute;top:-14px;right:20px;display:block;margin:0;padding:0 8px;background:#000;color:var(--pc);font-size:18px;line-height:22px;letter-spacing:.09em}
 *:is(.captain-card-title,.training-heading h2,.section-title h2,#codex-savings-title):before,*:is(.captain-card-title,.training-heading h2,.section-title h2):after{display:none}
 .view-head{position:relative;display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:12px;margin:0;padding:0 0 14px;border:0;border-radius:0;min-height:0}
 .view-head>div{flex:1;min-width:0}
 .view-head:after{content:"";position:absolute;left:0;right:0;bottom:0;height:6px;border-radius:3px;background:linear-gradient(90deg,var(--o) 0 9%,#000 0 calc(9% + 5px),var(--v) 0 71%,#000 0 calc(71% + 5px),var(--g) 0 79%,#000 0 calc(79% + 5px),var(--b) 0)}
 .captain-eyebrow{margin:0 0 4px;color:var(--g);font-size:13px;letter-spacing:.24em;text-transform:uppercase}
 .captain-intro{margin-top:4px;color:var(--text);font-size:15px}
 #training-action{display:inline-flex;align-items:center;gap:14px;flex-shrink:0;min-height:44px;padding:8px 20px 6px 26px;border-radius:22px;background:var(--o);font-size:17px;white-space:nowrap}
 #training-action:after{content:"";width:22px;height:16px;background:#000;clip-path:polygon(0 40%,70% 40%,70% 0,100% 50%,70% 100%,70% 60%,0 60%)}
 .captain-status{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:24px;align-content:start}
 .signal{grid-column:1;display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;padding:0 0 10px;border:0}
 .signal h2{display:inline-block;padding:4px 14px 2px;border-radius:999px;background:var(--v);color:#000;font-size:16px;letter-spacing:.07em}
 .signal h2:before{display:none}
 .signal h2[data-tone=good]{background:var(--good)}
 .signal h2[data-tone=warn]{background:var(--g)}
 #checked{font-size:13px;color:var(--muted)}
 .readiness{grid-column:1;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;margin:0}
 .captain-status .readiness>div{padding-left:10px;border-left:5px solid var(--v)}
 .readiness dd{margin-top:2px;font-size:15px;color:var(--text);text-transform:uppercase;letter-spacing:.04em}
 .captain-status{grid-template-columns:max-content minmax(0,1fr);gap:10px 22px;align-items:center}
 .captain-status .signal{flex-direction:column;align-items:flex-start;gap:4px;padding:0}
 .captain-status .readiness{grid-column:2;grid-template-columns:repeat(4,minmax(0,1fr))}
 .route-map{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px 16px;margin:0;padding:0;border:0}
 .route-head{display:block}
 .route-head h2{position:absolute;top:-14px;right:20px;margin:0;padding:0 8px;background:#000;color:var(--pc);font-size:18px;line-height:22px;letter-spacing:.09em}
 #route-status{margin:0;color:var(--text)}
 &[data-route-phase=idle] #route-status{display:none}
 &:is([data-route-phase=unknown],[data-route-phase=uncertain]) #route-status{color:var(--g)}
 &:is([data-route-phase=failed],[data-route-phase=blocked],[data-route-phase=cancelled]) #route-status{color:var(--r)}
 #route-open{grid-area:1/2;min-height:34px;padding:5px 16px 3px;background:var(--o)}
 .route-stages{grid-column:1/-1;position:relative;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0 12px;margin:6px 0 0;padding:0 0 24px;list-style:none}
 .route-stages:before{content:"";position:absolute;left:10%;right:10%;top:22px;height:4px;background:#3b2f46}
 .route-stages:after{content:"";position:absolute;left:10%;right:10%;bottom:6px;height:16px;border:3px solid var(--l);border-top:0;border-radius:0 0 14px 14px;opacity:.55}
 .route-stages li{position:relative;display:grid;justify-items:center;align-content:start;gap:6px;min-width:0;padding:0;border:0;text-align:center;font:13px/1.3 var(--body);color:var(--muted)}
 .route-stages span{display:grid;place-items:center;width:100%;min-height:42px;padding:5px 6px 3px;border-radius:999px;background:var(--c,var(--b));color:#000;font:500 15px/1.05 var(--f);font-stretch:condensed;letter-spacing:.07em;text-transform:uppercase;transition:opacity .3s,box-shadow .3s}
 [data-stage=approval]{--c:var(--s)}
 [data-stage=relay]{--c:var(--o)}
 [data-stage=provider]{--c:var(--l)}
 [data-stage=review]{--c:var(--g)}
 .route-stages:has([aria-current]) li:not([aria-current]) span{opacity:.4}
 .route-stages [aria-current] span{box-shadow:0 0 0 3px #000,0 0 0 6px var(--text)}
 .route-stages [aria-current] small{color:var(--text)}
 &:is([data-route-phase=failed],[data-route-phase=blocked],[data-route-phase=cancelled]) .route-stages [aria-current] span{background:var(--r);box-shadow:0 0 0 3px #000,0 0 0 6px var(--r)}
 &:is([data-route-phase=uncertain],[data-route-phase=unknown]) .route-stages [aria-current] span{background:repeating-linear-gradient(135deg,var(--g) 0 10px,#c79a3b 0 20px)}
 &[data-motion=on]:is([data-route-phase=queued],[data-route-phase=claimed],[data-route-phase=invoking]) .route-stages [aria-current] span{animation:route-pulse 1.6s ease-in-out infinite}
}
@keyframes route-pulse{50%{box-shadow:0 0 0 3px #000,0 0 0 6px var(--g),0 0 22px var(--g)}}
.console.captain:not([data-stealth=true]){
 #codex-savings[data-savings=disconnected] #codex-savings-headline{color:var(--s)}
 #codex-savings:is([data-savings=awaiting],[data-savings=unavailable]) #codex-savings-headline{color:var(--muted)}
 .counts>div:has(dd[aria-label="0"]) dt{background:#2a2233;color:var(--muted)}
 .counts dd[aria-label="0"]{color:#5d5068}
 .counts>div:has(.count-open:not([hidden])):hover dt{filter:brightness(1.15)}
 *:is(.job-state,.activity-state,#detail-state){--c:var(--v)}
 *:is(.job-state,.activity-state,#detail-state):is([data-state=queued]){--c:var(--b)}
 *:is(.job-state,.activity-state,#detail-state):is([data-state=claimed],[data-state=invoking]){--c:var(--s)}
 *:is(.job-state,.activity-state,#detail-state):is([data-state=completed]){--c:var(--good)}
 *:is(.job-state,.activity-state,#detail-state):is([data-state=uncertain],[data-state=unknown]){--c:var(--g)}
 *:is(.job-state,.activity-state,#detail-state):is([data-state=failed],[data-state=blocked],[data-state=cancelled]){--c:var(--r)}
 *:is(.job-state,.activity-state,#detail-state)[data-state]{justify-self:start;width:max-content;padding:3px 12px 1px;border-radius:999px;background:var(--c);color:#000;font:500 13px/1.3 var(--f);font-stretch:condensed;letter-spacing:.1em;text-transform:uppercase}
}
.console.captain:not([data-stealth=true]){
 .training-heading{display:block}
 .training-heading strong{display:block;margin:2px 0 6px;font-size:clamp(24px,2vw,34px);font-weight:500;line-height:1.1;letter-spacing:.06em;text-transform:uppercase;color:var(--g)}
 #training-next,#training-remaining{margin:0;font-size:14px;color:var(--text)}
 .training progress{display:block;width:100%;height:14px;margin:8px 0 6px;border:0;border-radius:0;background:#2e2438;-webkit-mask:repeating-linear-gradient(90deg,#000 0 calc(20% - 5px),#0000 0 20%);mask:repeating-linear-gradient(90deg,#000 0 calc(20% - 5px),#0000 0 20%)}
 .training progress::-webkit-progress-bar{background:#2e2438}
 .training progress::-webkit-progress-value{background:var(--l)}
 .training progress::-moz-progress-bar{background:var(--l)}
 .training:has(#training-review[data-earned=true]) .training-steps{display:none}
 .counts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:0;padding:0;border:0;background:none}
 .counts>div{--c:var(--b);display:flex;flex-direction:column;min-width:0;padding:0;border:0;box-shadow:none}
 .counts>div:nth-child(2){--c:var(--s);--d:.3s}
 .counts>div:nth-child(3){--c:var(--good);--d:.6s}
 .counts>div:nth-child(4){--c:var(--g)}
 .counts>div:nth-child(5){--c:var(--r)}
 .counts dt{padding:5px 14px 3px;border-radius:16px 0 0 16px;background:var(--c);color:#000;font-size:14px;letter-spacing:.14em;text-align:right}
 .counts dd{margin:4px 0 0;padding-right:8px;font:400 44px/1 var(--f);font-stretch:condensed;color:var(--c);text-align:right;letter-spacing:.02em;font-variant-numeric:tabular-nums;display:flex;justify-content:flex-end}
 .counts dd.unknown{color:var(--muted)}
 &[data-motion=on]{
  .counts:where(:has(#invoking.counter-number:not([aria-label="0"])))>div:where(:nth-child(-n+3)) dt{animation:lc-chase 1.8s ease-in-out var(--d,0s) infinite}
  .counts>div:where(:nth-child(-n+2):has(.counter-number:not([aria-label="0"]))) dd{animation:captain-alert 2s ease-in-out infinite}
  .counts>div:where(:nth-child(n+4):has(.counter-number:not([aria-label="0"]))) dt{animation:captain-blink 1.6s steps(1) infinite}
  .counts>div:has([data-direction]) dt{animation:lc-arrive .6s ease-out}
  .counts>div:has([data-direction=down]) dt{animation-name:lc-depart}
 }
 .section-title{display:flex;justify-content:flex-end;margin:0 0 6px;padding:0;border:0}
 .section-action{min-height:32px;padding:4px 16px 2px;border-radius:999px;background:var(--b);color:#000;font-size:14px}
 .activity li{padding:7px 0;border-bottom:2px solid #1d1726;font-size:14px}
 .activity-ref{font:15px/1.35 var(--f);font-stretch:condensed;color:var(--text)}
 .activity-state{align-self:center;padding:3px 12px 1px;border:0;border-radius:999px;background:var(--v);color:#000;font-size:12px;letter-spacing:.12em;text-transform:uppercase}
 .activity li:has([data-state=completed]) .activity-state{background:var(--good)}
}
#codex-savings-headline{color:var(--g)}
.console.captain:not([data-stealth=true]){
 .blocking{border:0;border-left:12px solid var(--g);border-radius:14px 0 0 14px;background:#1a1408;color:var(--g)}
 .notice{color:var(--g)}
}
/* Rank pips: metallic dots driven by the earned rank; a star for Admiral. */
.captain{--pip-count:0}
.captain:has(#logo-wrap[data-rank=ensign]){--pip-count:1}
.captain:has(#logo-wrap[data-rank=lieutenant]){--pip-count:2}
.captain:has(#logo-wrap[data-rank=commander]){--pip-count:3}
.captain:has(#logo-wrap[data-rank=captain]){--pip-count:4}
.console.captain:not([data-stealth=true]){
 .training-heading strong:before,.captain-pips:after{content:"";display:inline-block;width:calc(var(--pip-count)*23px);height:20px;margin-right:10px;vertical-align:middle;background:radial-gradient(circle 9px at 10px 10px,#fffbd4 0 12%,#f6df85 30%,#d4a743 55%,#97621b 75%,#ffe9a2 88%,#0000 100%) 0 0/23px 20px repeat-x;filter:drop-shadow(0 1px 1px #080508)}
 .captain-pips:after{margin:0}
 &:has(#logo-wrap[data-rank=admiral]) .training-heading strong:before,&:has(#logo-wrap[data-rank=admiral]) .captain-pips:after{content:"★";width:24px;background:none;color:#f2d27b;font-size:22px;line-height:20px}
}
/* ---------- Views inside the window. ---------- */
.console.captain:not([data-stealth=true]){
 .job-columns{padding:5px 12px 3px;border:0;border-radius:16px 0 0 16px;background:var(--b);color:#000;letter-spacing:.13em}
 .job-list li{border-bottom:2px solid #1d1726}
 .job-row{background:transparent;color:var(--text);border-radius:0;font-size:15px;text-transform:none;letter-spacing:.02em;text-align:left;padding:12px}
 .job-row:hover:not(:disabled){background:#15111a}
 .job-row[aria-pressed=true]{background:#1a1420;box-shadow:inset 8px 0 var(--g)}
 .job-state{text-transform:uppercase;letter-spacing:.08em}
 .folding-shell [data-state=completed] .job-state,.job-list [data-state=completed] .job-state{justify-self:start;padding:3px 10px 1px;border-radius:999px;background:var(--good);color:#000}
 *:is(.job-inspector,.request-aside){padding:12px 0 12px 18px;border:0;border-left:14px solid var(--l);border-radius:26px 0 0 26px}
 *:is(.system-grid,.provider-activity,.technical,.job-inspector,.request-aside,.request-review-form)>h2:before{content:"";display:inline-block;width:30px;height:14px;margin-right:10px;border-radius:7px 0 0 7px;background:currentColor}
 *:is(.policy,.technical){border-top:0}
 .policy dt{padding-right:12px;border-right:6px solid var(--v);text-align:right}
 .status-mark{width:28px;height:14px;border-radius:7px;background:var(--g)}
 .request-steps li{border-radius:999px}
}
.console.captain:not([data-stealth=true]){
 #view-system{display:grid;grid-template-columns:minmax(0,2fr) minmax(280px,1fr);gap:12px 28px;align-items:start}
 #view-system>*{grid-column:1;margin:0}
 #view-system>.view-head{grid-column:1/-1}
 #view-system>.upstream-notice{grid-column:2;grid-row:2/span 4}
 .policy{gap:6px 18px;padding:10px 0}
 .system-grid{gap:28px}
 .system-grid .policy{gap:6px 14px}
 .technical{margin-top:14px;padding-top:6px}
 .fingerprint{padding:8px 0}
 #request-text{height:132px}
 .request-tools{margin-bottom:6px}
 #request-notice{margin:4px 0;min-height:0}
 .request-aside h2{font-size:18px}
 #system-motion{justify-self:start}
}
/* ---------- Operations views: list and inspector, form and summary, provider lead, system status. ---------- */
.console.captain:not([data-stealth=true]){
 .view-head>.view-actions{flex:0 0 auto}
 .detail-identity{margin-top:18px;padding-top:12px;border-top:2px solid #1d1726}
 .jobs-workspace{display:grid;grid-template-columns:minmax(0,65fr) minmax(300px,35fr);gap:22px;align-items:start}
 .job-inspector{position:sticky;top:0}
 .detail-title{margin:6px 0 10px;color:var(--text);font-size:18px;line-height:1.35}
 .inspector-head h2{margin:0}
 #inspector-close{min-height:30px;padding:4px 14px 2px;background:var(--b);font-size:13px}
 #workspace-open-job,#job-open-result{margin-top:12px;background:var(--o)}
 .request-grid{grid-template-columns:minmax(0,1fr) minmax(260px,330px);gap:40px}
 .request-form .request-actions{position:sticky;bottom:0;z-index:2;margin:14px 0 0;padding:12px 0 8px;background:linear-gradient(#0000,#000 35%)}
 .request-summary div{padding-left:10px;border-left:5px solid var(--v)}
 .request-call-note{color:var(--g);font-size:14px}
 .groq-lead{gap:12px 44px;margin:14px 0}
 .groq-lead>div{padding-left:10px;border-left:5px solid var(--v)}
 #groq-last[data-state=completed]{color:var(--good)}
 #groq-last:is([data-state=uncertain],[data-state=unknown]){color:var(--g)}
 #groq-last:is([data-state=failed],[data-state=blocked],[data-state=cancelled]){color:var(--r)}
 #groq-last-open{min-height:34px;padding:5px 16px 3px;background:var(--b)}
 .system-status{display:inline-block;margin:2px 0 12px;padding:3px 12px 1px;border-radius:999px;background:#2a2233;color:var(--text);font:500 14px/1.3 var(--f);letter-spacing:.08em;text-transform:uppercase}
 .system-status[data-tone=good]{background:var(--good);color:#000}
 .system-status[data-tone=warn]{background:var(--g);color:#000}
 .system-status[data-tone=bad]{background:var(--r);color:#000}
 .technical-details{grid-column:1/-1}
 .technical-details h2{margin-top:16px;font-size:16px;color:var(--l)}
}
@media(max-width:1000px){.console.captain:not([data-stealth=true]){.jobs-workspace{grid-template-columns:minmax(0,1fr)}.job-inspector{position:static}}}
@media(max-width:700px){.console.captain:not([data-stealth=true]) .job-inspector:has(#job-details:not([hidden])){position:fixed;background:#0b0910;padding:16px 18px;border:0;border-top:10px solid var(--l);border-radius:26px 26px 0 0}}
/* ---------- Sign-in: the doors stay shut behind a security panel. ---------- */
.console.captain:not([data-stealth=true]){
 &:has(#auth:not([hidden])) .captain-window{display:grid;align-items:center;justify-items:center;padding:clamp(20px,5vw,72px)}
 &[data-cockpit=true]:has(#auth:not([hidden])) .captain-window{overflow:auto}
 #auth{position:relative;z-index:7;width:100%;max-width:520px;margin:auto;padding:30px 30px 26px 26px;background:#000;border:0;border-left:16px solid var(--b);border-top:6px solid var(--b);border-bottom:6px solid var(--b);border-radius:28px 0 0 28px;box-shadow:0 0 0 6px #000,0 30px 80px #000;align-self:center}
 #auth:before{content:"SECURITY ACCESS · LEVEL 10";position:absolute;top:-14px;right:20px;padding:0 8px;background:#000;color:var(--b);font-size:18px;line-height:22px;letter-spacing:.09em}
 #auth h2{position:relative;margin:0 0 12px;padding-bottom:14px;font-size:clamp(28px,2.6vw,40px);line-height:1.05;color:var(--o)}
 #auth h2:after{content:"";position:absolute;left:0;right:0;bottom:0;height:6px;border-radius:3px;background:linear-gradient(90deg,var(--o) 0 22%,#000 0 calc(22% + 5px),var(--v) 0 74%,#000 0 calc(74% + 5px),var(--b) 0)}
 #auth>p{margin-bottom:18px;font:15px/1.4 var(--body);color:var(--muted)}
 #auth label{margin-top:16px;color:var(--l)}
 #auth input{min-height:46px}
 #auth .auth-submit{width:100%;min-height:46px;margin-top:22px;border-radius:999px;background:var(--o);font-size:19px;letter-spacing:.14em;text-align:center}
 #auth .auth-message{width:max-content;max-width:100%;margin:18px 0 0;padding:4px 14px 2px;border:1px solid;border-radius:999px;color:var(--g);font-size:15px;letter-spacing:.06em;overflow-wrap:anywhere}
 .captain-access-panel{display:none}
}
@media(min-width:901px){
 .console.captain:not([data-stealth=true]){
  &:has(#auth:not([hidden])) .captain-sidebar-rank{display:none}
  &:has(#auth:not([hidden])) .captain-access-panel{display:flex;flex:1 0 auto;flex-direction:column;gap:5px}
 }
}
.console.captain:not([data-stealth=true]){
 .captain-access-panel>*{position:relative;margin:0;padding:22px 14px 6px;background:var(--p);color:#000;text-align:right;letter-spacing:.08em}
 .captain-access-panel>:not(.captain-access-trace):before{position:absolute;left:12px;top:7px;font:500 13px/1 var(--f);letter-spacing:.06em;opacity:.72}
 .captain-access-label:before{content:"00-0010"}
 .captain-access-panel h2:before{content:"00-1701"}
 .captain-access-panel>p:nth-child(3):before{content:"00-2552"}
 .captain-access-foot:before{content:"00-5096"}
 .captain-access-label{background:var(--x)!important;font-size:14px;letter-spacing:.18em!important}
 .captain-access-panel h2{padding:26px 14px 8px;background:var(--t);color:#000;font-size:21px;line-height:1.1}
 .captain-access-panel>p:nth-child(3){background:var(--b);font-size:15px}
 .captain-access-panel .captain-access-trace{flex:1;min-height:70px;display:flex;flex-direction:column;justify-content:center;gap:9px;background:#000;padding:10px 0}
}
.captain-access-trace span{height:9px;margin-left:auto;border-radius:5px;background:var(--b);width:44%}
.captain-access-trace span:nth-child(2){width:72%;background:var(--l)}
.captain-access-trace span:nth-child(3){width:28%;background:var(--g)}
.captain[data-motion=on] .captain-access-trace span{animation:captain-scan 2.4s ease-in-out infinite alternate}
.captain[data-motion=on] .captain-access-trace span:nth-child(2){animation-delay:-.8s}
.captain[data-motion=on] .captain-access-trace span:nth-child(3){animation-delay:-1.6s}
.console.captain:not([data-stealth=true]){
 .captain-access-foot{background:var(--l)}
 .captain-access-foot p{margin:0;font-size:12px;letter-spacing:.14em}
 .captain-access-foot small{display:block;font-size:13px;letter-spacing:.04em;opacity:.8}
}
@keyframes captain-scan{from{width:12%}to{width:96%}}
@keyframes captain-blink{0%,62%{opacity:1}63%,100%{opacity:.18}}
@keyframes captain-alert{50%{opacity:.5}}
@keyframes lc-chase{0%,50%,100%{filter:none}20%{filter:brightness(1.5)}}
@keyframes lc-arrive{0%{filter:brightness(2.2);box-shadow:0 0 18px var(--c)}}
@keyframes lc-depart{0%{opacity:.3}}
/* ---------- Alert conditions, mapped only from existing observed state. ---------- */
.console.captain:not([data-stealth=true]){
 &:is([data-route-phase=unknown],[data-route-phase=uncertain]),&:has(#health-heading:not([data-tone=good])){--frame-a:var(--g);--cond:var(--g);--cond-text:"WARP CORE UNSTABLE";--core-cond:"CAUTION"}
 &[data-route-phase=failed]{--frame-a:var(--x);--frame-b:var(--x);--cond:var(--x);--cond-text:"WARP CORE CRITICAL";--core-cond:"CRITICAL"}
 &[data-motion=on][data-route-phase=failed] *:is(.brand,.captain-rail i:nth-child(1),.captain-rail i:nth-child(5),.captain-condition){animation:captain-alert 1.8s ease-in-out infinite}
 &:has(#auth:not([hidden])){--frame-a:#b8475f;--frame-b:#9b5f97}
}
/* ---------- Stealth: Engineering steps aside for the plain Work Console. ----------
   Every LCARS rule above is scoped to :not([data-stealth=true]), so the shared
   Admiral stealth styles apply. Only Engineering's own extra markup is placed or hidden. */
.console.captain[data-stealth=true]{
 *:is(.captain-rail,.captain-codes,.captain-core,.core-screen,.captain-breadcrumb,.captain-brand-subtitle,.captain-sidebar-rank,.captain-access-panel,.captain-pips,.captain-eyebrow,.captain-intro,.captain-card-title,.captain-refresh-icon,.space-scene,.captain-doors,.cockpit-dash){display:none!important}
 .captain-window{display:contents}
 #heading-overview{font-size:0}
 #heading-overview:after{content:"Overview";font-size:32px}
 .captain-topbar{display:flex;justify-content:flex-end;align-items:center;padding:20px 40px 0}
 .captain-topbar .console-utilities{display:flex;align-items:center;gap:6px;margin:0}
 .console-menu{top:calc(100% + 8px);bottom:auto;right:0;left:auto}
}
@media(min-width:900px){.console.captain[data-stealth=true]{grid-template-columns:196px minmax(0,1fr);grid-template-rows:auto minmax(0,1fr)}.console.captain[data-stealth=true] .sidebar{grid-column:1;grid-row:1/3}.console.captain[data-stealth=true] .captain-topbar{grid-column:2;grid-row:1}.console.captain[data-stealth=true] .workspace{grid-column:2;grid-row:2}}
@media(max-width:899px){.console.captain[data-stealth=true] .captain-topbar{padding:10px 16px 0}}
/* ---------- Motion preferences. Doors keep their open/closed position. ---------- */
.console.captain:not([data-stealth=true]){
 &[data-motion=off] *:is(.captain-doors,.captain-doors span,.route-stages span,nav button){transition:none}
}
@media(prefers-reduced-motion:reduce){
 .console.captain:not([data-stealth=true]){
  *:is(.captain-doors,.captain-doors span,.route-stages span,nav button,.hud-instruments){transition:none!important}
  *:is(.captain-warp,.captain-codes span,.core-tube i,.core-keys span,.route-stages span,.captain-access-trace span,.brand,.captain-rail i,.captain-condition){animation:none!important}
 }
 .captain .captain-stars{animation:none!important;transform:none!important}
}
/* ---------- Widths. ---------- */
@media(min-width:901px) and (max-width:1390px){.console.captain:not([data-stealth=true]){#view-overview{grid-template-columns:minmax(0,1.6fr) minmax(250px,1fr)}.route-stages span{font-size:13px}}}
@media(max-width:1600px){.console.captain:not([data-stealth=true]){.captain-status{grid-template-columns:minmax(0,1fr)}.captain-status .signal{flex-direction:row;align-items:center}.captain-status .readiness{grid-column:1}}}
@media(max-width:1100px){.console.captain .captain-breadcrumb{font-size:0}.console.captain:not([data-stealth=true]){#view-overview{grid-template-rows:none;height:auto}#view-overview>*{grid-column:1/-1!important;grid-row:auto!important;contain:none!important}&:not([data-cockpit=true]) :is(#private:has(#view-overview:not([hidden])),.folding-shell:has(#view-overview:not([hidden]))){height:auto;overflow:visible}.captain-brand-subtitle{white-space:nowrap;font-size:10px;letter-spacing:.08em}#view-system{grid-template-columns:minmax(0,1fr)}#view-system>.upstream-notice{grid-column:1;grid-row:auto}}}
@media(min-width:901px) and (max-width:1100px){
 .console.captain:not([data-stealth=true]){--rail:184px;--elbow:160px}
 .console.captain:not([data-stealth=true]){
  .logo-wrap{left:20px;top:26px;width:70px;height:70px}
  .rank-logo{width:46px;height:56px}
  .brand p{font-size:19px}
  & nav button{min-height:50px;font-size:17px}
  .captain-codes{display:none}
  .captain-breadcrumb{padding-left:40px}
  .captain-breadcrumb>span:after{font-size:22px}
  #view-overview{grid-template-columns:minmax(0,1fr)}
  #view-overview>.training{grid-column:1;grid-row:3}
  .captain-window{margin:10px 12px 6px 20px}
 }
}
@media(max-width:900px){
 .console.captain,.console.captain[data-cockpit=true]{display:flex;flex-direction:column;min-height:100svh}
 .console.captain:not([data-stealth=true]){
  .sidebar{display:flex;flex-direction:column;height:auto;overflow:visible}
  .sidebar>*{grid-column:auto;grid-row:auto;justify-self:stretch;align-self:stretch;width:auto}
  .brand{min-height:0;flex-direction:row;align-items:center;justify-content:flex-end;gap:12px;padding:12px 18px 10px 88px;border-radius:44px 0 0 0}
  .logo-wrap{left:16px;top:50%;translate:0 -50%;width:56px;height:56px}
  .rank-logo{width:38px;height:46px}
  .brand p{font-size:20px}
  & nav{display:flex;flex-direction:row;flex-wrap:wrap;justify-self:stretch}
  & nav button{flex:1 1 28%;justify-content:flex-end}
  &[data-cockpit=true] .captain-window{height:calc(100dvh - 240px);min-height:500px}
  #windshield-readout{top:34%}
  & nav button{min-height:46px;padding:5px 10px 4px;font-size:16px}
  & nav button[aria-current=page]:before{left:10px;top:9px;bottom:auto;width:18px;height:8px}
  *:is(.captain-sidebar-rank,.captain-access-panel,.captain-codes,.captain-brand-subtitle){display:none!important}
  .captain-topbar{grid-template-columns:minmax(0,1fr) auto;grid-template-rows:24px auto auto;row-gap:8px;margin-top:5px;padding-bottom:6px}
  .captain-topbar:before{display:none}
  .captain-breadcrumb{padding-left:4px}
  .captain-breadcrumb>span:after{font-size:19px}
 }
 .captain-condition{grid-column:2;gap:6px}
 .captain-condition:after{font-size:12px;letter-spacing:.06em}
 .captain-condition b{width:44px}
 .console.captain:not([data-stealth=true]){
  .captain-topbar .console-utilities{grid-row:3;grid-column:1/-1;justify-content:flex-end;flex-wrap:wrap}
  .live-feed{display:none}
  .captain-window{height:calc(100dvh - 300px);min-height:360px;margin:6px 4px 4px}
  #view-overview{grid-template-columns:minmax(0,1fr);gap:28px}
  #view-overview>*:is(.captain-status,.training){grid-column:1;grid-row:auto}
  .captain-status{grid-template-columns:minmax(0,1fr)}
  .captain-status .readiness{grid-column:1;grid-template-columns:repeat(2,minmax(0,1fr))}
  .route-stages{grid-template-columns:repeat(auto-fit,minmax(104px,1fr));gap:10px;padding:0}
  .route-stages:is(:before,:after){display:none}
  *:is(.captain-status,.training,.captain-activity,#codex-savings){padding:22px 14px 16px 14px;border-left-width:14px;border-radius:28px 0 0 28px}
  .counts{grid-template-columns:repeat(3,minmax(0,1fr))}
  .counts dd{font-size:44px}
  .view-head{gap:14px}
  #training-action{min-height:46px;padding:8px 18px 6px 24px;font-size:17px}
  .footer{height:34px}
  .footer:before{right:58px}
  .footer:after{display:none}
  #auth:before{font-size:12px;letter-spacing:.1em;white-space:nowrap}
  #auth{padding:26px 16px 20px;border-left-width:12px;border-radius:24px 0 0 24px}
  &:has(#auth:not([hidden])) .captain-window{padding:20px 6px;align-items:start}
  .cockpit-dash .hud-instruments{justify-content:center;gap:8px 14px;padding:8px 12px;border-left-width:16px;border-right-width:16px;border-radius:30px}
  .hud-instruments .hud-numeral{font-size:32px}
 }
 .console.captain[data-cockpit=true] .folding-shell{inset:8px 8px 200px;border-left-width:14px;border-radius:32px 0 0 32px}
 .console.captain:not([data-stealth=true]){
  &[data-cockpit=true] .folding-shell #private{padding:14px 56px 16px 12px}
  }
 .captain-window-trim{inset:20px 18px}
 .captain-planet{right:-48%;bottom:-12%;width:350px}
}
@media(max-width:520px){
 .console.captain:not([data-stealth=true]){
  .counts{grid-template-columns:repeat(2,minmax(0,1fr))}
  .route-stages span{font-size:13px;min-height:40px}
  & h1{font-size:32px}
 }
 .console.captain[data-cockpit=true] .folding-shell{bottom:236px}
}
`;

// Source-only theme compiler for the Engineering tricorder (phones, tablets, or
// the explicit "Engineering · Tricorder" appearance). Bundled into admission-ui.
// Built from the Admiral document: same IDs, same script, no authentication hooks.
// Every visual state keys off attributes the shared application already sets.

function tricorderConsoleHtml(html,{forced=false}={}){
 const replace=(from,to)=>{if(html.split(from).length!==2)throw Error('tricorder_theme_contract_changed');html=html.replace(from,to);};
 for(const id of ['console-surface','logo-wrap','navigation','private','auth','health-heading','console-appearance','console-tools'])if(html.split('id="'+id+'"').length!==2)throw Error('tricorder_theme_contract_changed');
 replace('class="console"','class="console tricorder" data-console-theme="'+(forced?'tricorder':'captain')+'"');
 replace('<option value="captain">Engineering</option>',TRICORDER_OPTION);
 replace('<small id="recognition" hidden></small></div></div>','<small id="recognition" hidden></small></div>'+tricorderLid()+'</div>');
 replace('<section class="auth" id="auth"','<div class="tri-bar" aria-hidden="true"><b></b><span>Picard Relay</span><i></i></div><section class="auth" id="auth"');
 // Motion and Stealth controls live in the cockpit tray, which a hand-held does not use.
 const glassControls=html.match(/<div class="folding-glass"[\s\S]*?<\/label><\/div><\/div><\/div>/)?.[0];
 if(!glassControls)throw Error('tricorder_theme_contract_changed');
 replace(glassControls,'');
 replace('<div class="console-menu">','<div class="console-menu">'+glassControls);
 html=menuIcons(html,'tricorder_theme_contract_changed');
 // The cockpit is a desktop scene. Its rules are removed so a saved cockpit
 // preference cannot change the hand-held layout.
 html=html.replace(/<style>([\s\S]*?)<\/style>/g,(_,css)=>'<style>'+filterCss(css,selector=>!/data-(cockpit|starfield)="?true|data-hud-expanded/.test(selector.replace(/:not\(\[data-(cockpit|starfield)="?true"?\]\)/g,'')))+'</style>');
 replace('</style>',TRICORDER_STYLE+'\n</style>');
 return compactStyles(html);
}

const TRICORDER_OPTION='<option value="captain">Engineering</option><option value="tricorder">Engineering · Tricorder</option>';

// Drop selectors for which keep() is false; whole rules go when none remain.
// @media/@supports are filtered recursively; other at-rules are kept verbatim.
function filterCss(css,keep){
 css=css.replace(/\/\*[\s\S]*?\*\//g,'');
 const skipString=(s,j)=>{const q=s[j++];while(j<s.length&&s[j]!==q)j+=s[j]==='\\'?2:1;return j;};
 const next=(s,j)=>{for(let depth=0;j<s.length;j++){const c=s[j];if(c==='"'||c==="'")j=skipString(s,j);else if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(!depth&&(c==='{'||c===';'))return j;}return -1;};
 const close=(s,j)=>{for(let depth=0;j<s.length;j++){const c=s[j];if(c==='"'||c==="'")j=skipString(s,j);else if(c==='{')depth++;else if(c==='}'&&!--depth)return j;}return s.length;};
 const split=s=>{const parts=[];let depth=0,start=0;for(let j=0;j<s.length;j++){const c=s[j];if(c==='"'||c==="'")j=skipString(s,j);else if(c==='('||c==='[')depth++;else if(c===')'||c===']')depth--;else if(c===','&&!depth){parts.push(s.slice(start,j));start=j+1;}}parts.push(s.slice(start));return parts;};
 const walk=s=>{
  let out='',i=0;
  while(i<s.length){
   const at=next(s,i);
   if(at<0){out+=s.slice(i);break;}
   if(s[at]===';'){out+=s.slice(i,at+1);i=at+1;continue;}
   const end=close(s,at),prelude=s.slice(i,at),body=s.slice(at+1,end),head=prelude.trim();
   if(/^@(media|supports|container|layer)\b/.test(head)){const inner=walk(body);if(inner.trim())out+=prelude+'{'+inner+'}';}
   else if(head.startsWith('@'))out+=prelude+'{'+body+'}';
   else{const kept=split(prelude).filter(keep);if(kept.length)out+=kept.join(',')+'{'+body+'}';}
   i=end+1;
  }
  return out;
 };
 return walk(css);
}

// Decorative lid face: status lights, a fixed code strip and rank pips.
// Fixed at build time; never a reading of anything.
function tricorderLid(){
 const random=lcg(4747);
 // Each code is a strip of eight fixed values with the same digit count; CSS steps
 // through them at a different rate per code. Decoration, never a reading.
 const codes=Array.from({length:6},()=>{const digits=2+Math.floor(random()*3);return '<span><b>'+Array.from({length:8},()=>String(Math.floor(random()*10**digits)).padStart(digits,'0')).join('<br>')+'</b></span>';}).join('');
 return '<div class="tri-lid" aria-hidden="true"><span class="tri-leds"><i></i><i></i><i></i><i></i><i></i></span><span class="tri-codes">'+codes+'</span><span class="tri-pips"></span></div>';
}

const TRICORDER_VIEWS=[['overview','Overview'],['jobs','Jobs'],['requests','Requests'],['groq','Groq'],['system','System']];
const TRICORDER_STYLE=String.raw`
/* ---------- Engineering tricorder. Ornament only; every control is the shared one. ---------- */
.console.tricorder{--o:#ff9966;--g:#ffcc66;--l:#cc99cc;--b:#9999ff;--s:#99ccff;--t:#ddaa77;--r:#dd6688;--x:#e64a3c;--good:#7fe0a8;--cond:var(--good);--f:Antonio,"Bahnschrift","Arial Narrow","Roboto Condensed","Helvetica Neue",sans-serif;--pip-count:0}
body:has(.console.tricorder:not([data-stealth=true])){background:radial-gradient(ellipse at 50% 30%,#1a1612,#000 70%);overflow:hidden}
.console.tricorder:has(#logo-wrap[data-rank=ensign]){--pip-count:1}
.console.tricorder:has(#logo-wrap[data-rank=lieutenant]){--pip-count:2}
.console.tricorder:has(#logo-wrap[data-rank=commander]){--pip-count:3}
.console.tricorder:has(#logo-wrap[data-rank=captain]){--pip-count:4}
.console.tricorder:not([data-stealth=true]){
 --bg:#000;--side:#0e0c0a;--line:#2e2924;--text:#f6e7d4;--muted:#bca88f;--accent:#ff9966;
 &:is([data-route-phase=unknown],[data-route-phase=uncertain]),&:has(#health-heading:not([data-tone=good])){--cond:var(--g)}
 &[data-route-phase=failed]{--cond:var(--x)}
 position:relative;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) auto auto auto;grid-template-areas:"lid" "screen" "keys" "util" "foot";gap:10px;
 width:min(100%,600px);height:100dvh;min-height:0;margin:0 auto;padding:max(12px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));box-sizing:border-box;overflow:hidden;
 background:repeating-linear-gradient(0deg,#0000 0 5px,#0006 5px 7px) left top/9px 100% no-repeat,repeating-linear-gradient(0deg,#0000 0 5px,#0006 5px 7px) right top/9px 100% no-repeat,linear-gradient(90deg,#191613,#3d3731 7%,#4b443c 14%,#3a342e 50%,#4b443c 86%,#3d3731 93%,#191613);
 box-shadow:inset 0 0 0 1px #6b6258,inset 0 2px 0 #8a7f72,inset 0 -3px 0 #0009;color:var(--text);font-family:var(--f);
 *:is(.space-scene,.windshield-track,.cockpit-dash,.folding-crown,#hud-close,#workspace-toggle,#stars-toggle){display:none!important}
 .sidebar{display:contents}
 /* Lid: closed while signed out, flips open once the shared sign-in completes. */
 .brand{grid-area:lid;justify-self:stretch;width:auto;position:relative;display:grid;grid-template-columns:auto minmax(0,1fr);align-items:center;gap:8px 12px;margin:0;padding:12px 14px 12px 12px;border-radius:24px 24px 10px 10px;background:linear-gradient(#26211c,#151210);box-shadow:inset 0 0 0 2px #5d554b,inset 0 3px 0 #81776b,0 5px 0 #0009;perspective:800px}
 .brand:before{content:"PICARD RELAY \00B7  TR-47";position:absolute;inset:0;z-index:3;display:grid;place-items:center;border-radius:inherit;background:linear-gradient(90deg,#0000 0 8%,#0004 8% 9%,#0000 9% 91%,#0004 91% 92%,#0000 0),repeating-linear-gradient(90deg,#fff1 0 1px,#0000 1px 3px),linear-gradient(#5a5248,#3b352f 55%,#2d2824);box-shadow:inset 0 0 0 2px #776d61,inset 0 3px 0 #a0947f;color:#a6998a;font:600 13px/1 var(--f);letter-spacing:.42em;text-shadow:0 1px #000c,0 -1px #fff3;transform-origin:50% 0;pointer-events:none;backface-visibility:hidden}
 &:has(#auth[hidden]) .brand:before{transform:rotateX(98deg);opacity:0}
 &[data-motion=on] .brand:before{transition:transform .95s cubic-bezier(.3,.65,.25,1),opacity .2s .75s}
 .brand:after{content:"";position:absolute;left:20%;right:20%;bottom:-10px;height:7px;border-radius:4px;background:linear-gradient(#7b7064,#2b2621);box-shadow:0 1px 0 #000}
 #logo-wrap{width:56px;height:56px;margin:0}
 #brand-name{margin:0;color:var(--g);font:500 22px/1 var(--f);letter-spacing:.12em;text-transform:uppercase}
 .brand>div:not(.tri-lid){min-width:0}
 .tri-lid{grid-column:1/-1;display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:14px;background:#000;box-shadow:inset 0 1px 4px #000,0 0 0 1px #3c362f}
 .tri-leds{display:flex;gap:6px}
 .tri-leds i{width:10px;height:10px;border-radius:50%;background:#2a2522;box-shadow:inset 0 1px 2px #000}
 .tri-leds i:nth-child(1){background:var(--cond);box-shadow:0 0 8px var(--cond)}
 .tri-leds i:nth-child(2){background:var(--o)}
 .tri-leds i:nth-child(3){background:var(--b)}
 .tri-leds i:nth-child(4){background:var(--g)}
 .tri-leds i:nth-child(5){background:var(--r)}
 .tri-codes{flex:1;display:flex;justify-content:space-around;gap:6px;min-width:0;overflow:hidden;color:var(--s);font:500 11px/1 var(--f);letter-spacing:.08em;font-variant-numeric:tabular-nums}
 .tri-codes span:nth-child(3n+2){color:var(--r)}
 .tri-codes span:nth-child(4){color:var(--g)}
 .tri-codes span{height:1em;overflow:hidden}
 .tri-codes b{display:block;font-weight:inherit}
 &[data-motion=on] .tri-codes b{animation:tri-roll 6.4s steps(8) infinite}
 &[data-motion=on] .tri-codes span:nth-child(2) b{animation-duration:9.6s;animation-delay:-3s}
 &[data-motion=on] .tri-codes span:nth-child(3) b{animation-duration:4.8s;animation-delay:-1.1s}
 &[data-motion=on] .tri-codes span:nth-child(4) b{animation-duration:12s;animation-delay:-7s}
 &[data-motion=on] .tri-codes span:nth-child(5) b{animation-duration:7.2s;animation-delay:-2.5s}
 &[data-motion=on] .tri-codes span:nth-child(6) b{animation-duration:5.6s;animation-delay:-4.2s}
 .tri-pips:after{content:"";display:block;width:calc(var(--pip-count)*17px);height:15px;background:radial-gradient(circle 7px at 7px 7px,#fffbd4 0 12%,#f6df85 30%,#d4a743 55%,#97621b 75%,#ffe9a2 88%,#0000 100%) 0 0/17px 15px repeat-x}
 &:has(#logo-wrap[data-rank=admiral]) .tri-pips:after{content:"\2605";width:auto;background:none;color:#f2d27b;font-size:16px;line-height:15px}
 /* Main screen: the only part that scrolls. */
 .workspace{grid-area:screen;position:relative;display:flex;flex-direction:column;min-width:0;min-height:0;height:auto;max-height:none;align-self:stretch;width:auto;max-width:none;margin:0;padding:0;overflow:hidden;background:#000;border:0;border-radius:18px;box-shadow:inset 0 0 0 3px #0b0a09,inset 0 10px 26px #000,0 0 0 2px #61584e,0 0 0 5px #1f1b17,0 -1px 0 5px #0007}
 .tri-bar{flex:none;display:flex;align-items:center;gap:6px;height:24px;margin:10px 10px 6px}
 .tri-bar b{flex:none;width:38px;height:24px;border-radius:12px 0 0 12px;background:var(--o)}
 .tri-bar span{flex:none;color:var(--o);font:500 15px/1 var(--f);letter-spacing:.1em;text-transform:uppercase}
 .tri-bar span:after{content:" \00B7  Standby"}
 &:has(#auth:not([hidden])) .tri-bar span:after{content:" \00B7  Security access"}
${TRICORDER_VIEWS.map(([view,label])=>` &:has(#view-${view}:not([hidden])):has(#auth[hidden]) .tri-bar span:after{content:" \\00B7  ${label}"}
 &:has(#view-${view}:not([hidden])) #nav-${view}{filter:none}
 &:has(#view-${view}:not([hidden])) #nav-${view}:before{background:#8dffb8;box-shadow:0 0 7px #8dffb8}`).join('\n')}
 .tri-bar i{position:relative;flex:1;height:8px;overflow:hidden;border-radius:0 4px 4px 0;background:var(--b)}
 .tri-bar i:after{content:"";position:absolute;top:0;bottom:0;left:-30%;width:28%;background:linear-gradient(90deg,#0000,#fffc,#0000)}
 .folding-shell{position:static;flex:1;min-height:0;width:auto;max-width:none;margin:0;padding:2px 12px 14px;overflow:auto;overscroll-behavior:contain;background:none;border:0;border-radius:0;box-shadow:none;transform:none}
 .folding-shell:before{display:none}
 #private{position:static;order:0;width:100%;max-width:none;max-height:none;margin:0;padding:0;overflow:visible;background:none;border:0;border-radius:0;box-shadow:none;animation:none}
 .footer{flex:none;margin:0;padding:2px 12px 8px;background:none;border:0}
 /* Sign-in on the screen. */
 #auth{box-sizing:border-box;width:auto;margin:4px 12px 12px;padding:14px 14px 16px;max-width:none;overflow:auto;background:#000;border:0;border-left:10px solid var(--r);border-radius:22px 0 0 22px;box-shadow:none}
 #auth h2{color:var(--o);font:500 22px/1.1 var(--f);letter-spacing:.06em;text-transform:uppercase}
 #auth label{color:var(--b);font:500 12px/1.3 var(--f);letter-spacing:.14em;text-transform:uppercase}
 #auth :is(input,.auth-submit){box-sizing:border-box;width:100%;max-width:100%}
 #auth input{min-height:46px;color:var(--text);background:#0c0b0a;border:0;border-left:6px solid var(--b);border-radius:0 8px 8px 0;font-size:16px}
 .auth-submit{min-height:48px;width:100%;border:0;border-radius:24px;background:var(--o);color:#000;font:600 15px/1 var(--f);letter-spacing:.14em;text-transform:uppercase}
 /* Views, single column inside the screen at every width. */
 .view-head{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;margin:0 0 10px;padding:0;border:0;min-height:0}
 .view-head>div{display:contents}
 .view-head h1{position:absolute;width:1px;height:1px;margin:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
 .view-head p{flex:1 0 100%;margin:0;color:var(--muted);font-size:13px}
 .view-head button,.view-actions button,.request-tools button,#training-action{min-height:40px;padding:4px 16px 2px;border:0;border-radius:20px;background:var(--b);color:#000;font:600 13px/1 var(--f);letter-spacing:.1em;text-transform:uppercase}
 .view-head .request-primary{background:var(--o)}
 *:is(.jobs-workspace,.request-grid,.system-grid,.groq-status,.admission-workspace,.jobs-toolbar){grid-template-columns:minmax(0,1fr);gap:12px}
 .request-tools{display:flex;flex-wrap:wrap;align-items:center;gap:6px 8px;margin:0 0 6px}
 #request-provider{flex:1 0 100%}
 #request-notice{min-height:0;margin:4px 0}
 *:is(.training,.signal,#codex-savings,.provider-activity,.upstream-notice,.system-grid>*,.groq-status>*,.request-aside,.jobs-detail){margin:0 0 10px;padding:10px 12px;background:#000;border:0;border-left:8px solid var(--pc,var(--b));border-radius:16px 0 0 16px;box-shadow:none}
 .training{--pc:var(--l)}
 .signal{--pc:var(--o)}
 #codex-savings{--pc:var(--t)}
 *:is(.training-heading h2,.section-title h2,.signal h2,#codex-savings-title){color:var(--pc,var(--b));font:500 13px/1.2 var(--f);letter-spacing:.16em;text-transform:uppercase}
 #training-title,#health-heading{color:var(--g);font:500 20px/1.15 var(--f);letter-spacing:.04em;text-transform:uppercase}
 .readiness{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;margin:0 0 10px;padding:0;border:0;background:none}
 .readiness>div{padding:0 0 0 8px;border:0;border-left:4px solid var(--l);background:none}
 .readiness dt{color:var(--l);font:500 11px/1.2 var(--f);letter-spacing:.1em;text-transform:uppercase}
 .readiness dd{margin:2px 0 0;color:var(--text);font:500 15px/1.2 var(--f);text-transform:uppercase}
 .training progress{display:block;width:100%;height:10px;margin:6px 0;border:0;background:#2e2438;-webkit-mask:repeating-linear-gradient(90deg,#000 0 calc(20% - 4px),#0000 0 20%);mask:repeating-linear-gradient(90deg,#000 0 calc(20% - 4px),#0000 0 20%)}
 .training progress::-webkit-progress-bar{background:#2e2438}
 .training progress::-webkit-progress-value{background:var(--l)}
 .training progress::-moz-progress-bar{background:var(--l)}
 /* Five readouts, with the same stage animations as Engineering. */
 .counts{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin:0 0 12px;padding:0;border:0;background:none}
 .counts>div{--c:var(--b);min-width:0;padding:0;border:0;background:none;box-shadow:none}
 .counts>div:nth-child(2){--c:var(--s);--d:.3s}
 .counts>div:nth-child(3){--c:var(--good);--d:.6s}
 .counts>div:nth-child(4){--c:var(--g)}
 .counts>div:nth-child(5){--c:var(--r)}
 .counts dt{overflow:hidden;padding:4px 4px 2px;border-radius:9px 0 0 9px;background:var(--c);color:#000;font:600 9px/1.2 var(--f);letter-spacing:0;text-align:right;text-overflow:ellipsis;text-transform:uppercase;white-space:nowrap}
 .counts dd{display:flex;justify-content:flex-end;margin:3px 0 0;color:var(--c);font:400 28px/1 var(--f);font-variant-numeric:tabular-nums}
 .counts dd.unknown{color:var(--muted)}
 &[data-motion=on]{
  .counts:where(:has(#invoking.counter-number:not([aria-label="0"])))>div:where(:nth-child(-n+3)) dt{animation:tri-chase 1.8s ease-in-out var(--d,0s) infinite}
  .counts>div:where(:nth-child(-n+2):has(.counter-number:not([aria-label="0"]))) dd{animation:tri-pulse 2s ease-in-out infinite}
  .counts>div:where(:nth-child(n+4):has(.counter-number:not([aria-label="0"]))) dt{animation:tri-blink 1.6s steps(1) infinite}
  .counts>div:has([data-direction]) dt{animation:tri-arrive .6s ease-out}
  .counts>div:has([data-direction=down]) dt{animation-name:tri-depart}
  .tri-leds i:nth-child(n+2){animation:tri-blink 2.6s steps(1) infinite}
  .tri-leds i:nth-child(3){animation-duration:1.9s;animation-delay:-.7s}
  .tri-leds i:nth-child(4){animation-duration:3.3s}
  &:is([data-route-phase=queued],[data-route-phase=claimed],[data-route-phase=invoking]) .tri-bar i:after{animation:tri-scan 1.4s linear infinite}
  &[data-route-phase=failed] .tri-leds i:nth-child(1){animation:tri-pulse 1.2s ease-in-out infinite}
 }
 .section-title{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 6px;padding:0;border:0}
 .section-action{min-height:36px;padding:4px 14px 2px;border:0;border-radius:18px;background:var(--b);color:#000;font:600 12px/1 var(--f);letter-spacing:.1em;text-transform:uppercase}
 .activity li{padding:8px 0;border-bottom:1px solid var(--line)}
 #request-text{min-height:120px}
 *:is(input,textarea,select):not([type=checkbox]):not([type=radio]){font-size:16px}
 /* Keypad: the real navigation buttons, styled as tricorder keys. */
 nav{grid-area:keys;justify-self:stretch;align-self:stretch;max-width:none;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;width:auto;margin:0;padding:8px;background:#15120f;border:0;border-radius:12px;box-shadow:inset 0 2px 6px #000c,0 1px 0 #6a6157}
 nav:before,nav:after{display:none}
 nav button{position:relative;display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;min-width:0;min-height:54px;margin:0;padding:6px 7px 7px;border:0;border-radius:5px 5px 13px 13px!important;background:var(--k,var(--o));color:#000;font:600 0/1 var(--f);box-shadow:inset 0 -4px 0 #0006,inset 0 1px 0 #fff7,0 2px 0 #000;filter:saturate(.8) brightness(.82)}
 nav button:nth-child(2){--k:var(--b)}
 nav button:nth-child(3){--k:var(--l)}
 nav button:nth-child(4){--k:var(--t)}
 nav button:nth-child(5){--k:var(--s)}
 nav button:active{transform:translateY(2px);box-shadow:inset 0 -2px 0 #0006,0 0 0 #000}
 nav button:before{content:"";position:absolute;top:7px;right:7px;width:7px;height:7px;border-radius:50%;background:#3a2f28;box-shadow:inset 0 1px 1px #000}
 nav .nav-index{align-self:flex-start;color:#0009;font:600 10px/1 var(--f);letter-spacing:.06em}
 nav button:after{font-size:15px;letter-spacing:.06em}
 #nav-overview:after{content:"OVR";content:"OVR"/""}
 #nav-jobs:after{content:"JOBS";content:"JOBS"/""}
 #nav-requests:after{content:"REQ";content:"REQ"/""}
 #nav-groq:after{content:"GROQ";content:"GROQ"/""}
 #nav-system:after{content:"SYS";content:"SYS"/""}
 /* Refresh and settings: the lower control row. */
 .console-utilities{grid-area:util;justify-self:stretch;display:flex;align-items:stretch;gap:6px;width:auto;margin:0;padding:0;background:none;border:0;box-shadow:none}
 #refresh-control{flex:1;min-width:0;margin:0}
 #refresh{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:44px;padding:4px 18px 2px;border:0;border-radius:22px;background:var(--g);color:#000;font:600 14px/1 var(--f);letter-spacing:.12em;text-transform:uppercase;box-shadow:inset 0 -3px 0 #0005,0 2px 0 #000}
 #live-feed{color:#000a;font-size:11px}
 .console-tools{position:static;margin:0 0 0 auto}
 .console-tools summary{display:grid;place-items:center;width:68px;min-width:0;min-height:44px;padding:0 0 4px;border:0;border-radius:22px;background:var(--l);color:#000;font-size:24px;line-height:1;list-style:none;box-shadow:inset 0 -3px 0 #0005,0 2px 0 #000}
 .console-tools summary::-webkit-details-marker{display:none}
 .console-menu{position:absolute;inset:auto 14px calc(max(10px,env(safe-area-inset-bottom)) + 186px);z-index:20;display:grid;gap:6px;width:auto;min-width:0;max-height:62%;overflow:auto;padding:12px;background:#0d0b09;border:0;border-left:10px solid var(--l);border-radius:22px 0 0 22px;box-shadow:0 0 0 2px #000,0 12px 30px #000d}
 .console-menu>*,.console-menu .folding-glass,.console-menu .folding-side{position:static;width:auto;margin:0;transform:none}
 .console-menu .folding-glass{display:grid;grid-template-columns:1fr;gap:6px;padding:0;background:none;border:0;box-shadow:none}
 .console-menu .folding-side{display:contents}
 .console-menu :is(button,a){box-sizing:border-box;width:100%;display:flex;align-items:center;justify-content:space-between;min-height:44px;padding:4px 14px 2px;border:0;border-radius:22px;background:#1d1915;color:var(--text);font:500 14px/1.2 var(--f);letter-spacing:.08em;text-decoration:none;text-transform:uppercase}
 .console-menu #logout{color:var(--r)}
 .console-menu .tool{justify-content:flex-start;gap:12px}
 .console-menu #motion{padding-left:44px}
 .console-menu .auto-instrument{display:contents}
 .console-menu .folding-side+.folding-side{display:flex;flex-wrap:wrap;gap:2px}
 .console-menu #stealth-mode{flex:1;width:auto;border-radius:22px 4px 4px 22px}
 .console-menu #stealth-auto-toggle{width:auto;border-radius:4px 22px 22px 4px}
 .console-menu #stealth-settings{position:static;flex-basis:100%;display:grid;gap:4px;padding:4px 14px}
 .menu-tool{display:flex;align-items:center}
 .menu-tool svg{order:-1;margin:0 -32px 0 14px;position:relative;pointer-events:none}
 .console-menu kbd{display:none}
 .console-menu svg{width:18px;height:18px;flex:none;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;color:var(--o)}
 .console-menu select{min-height:44px}
 /* Routing: one compact row of stages; the active one is outlined. */
 .route-map{margin:0 0 14px;padding:0 0 12px}
 .route-stages{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;margin:8px 0}
 .route-stages li{padding:6px 2px;border-radius:10px;text-align:center}
 .route-stages span{font:600 11px/1.15 var(--f);letter-spacing:.04em;text-transform:uppercase}
 .route-stages small{display:none}
 .console-menu :is(.appearance-choice,#appearance-notice,#appearance-confirm){order:-1}
 /* Speaker grille. */
 .sidebar-foot{grid-area:foot;display:grid;place-items:center;height:24px;margin:0;padding:0;border-radius:6px 6px 18px 18px;background:radial-gradient(circle,#000a 1.3px,#0000 1.6px) 0 0/7px 7px,linear-gradient(#2d2823,#1b1814);color:#857a6c;font:600 9px/1 var(--f);letter-spacing:.42em;text-shadow:0 1px #000}
}
@keyframes tri-scan{to{left:102%}}
@keyframes tri-roll{to{transform:translateY(-100%)}}
@keyframes tri-blink{0%,62%{opacity:1}63%,100%{opacity:.25}}
@keyframes tri-pulse{50%{opacity:.45}}
@keyframes tri-chase{0%,50%,100%{filter:none}20%{filter:brightness(1.5)}}
@keyframes tri-arrive{0%{filter:brightness(2.2);box-shadow:0 0 14px var(--c)}}
@keyframes tri-depart{0%{opacity:.3}}
/* Tablets and desktop testing: a hand-held on a dark field. */
@media(min-width:620px){.console.tricorder:not([data-stealth=true]){height:min(100dvh,980px);margin:max(0px,calc((100dvh - 980px)/2)) auto 0;border-radius:36px}}
/* Phones held sideways: lid and keypad move beside the screen. */
@media(orientation:landscape) and (max-height:520px){.console.tricorder:not([data-stealth=true]){
 width:100%;max-width:none;height:100dvh;margin:0;border-radius:0;grid-template-columns:150px minmax(0,1fr) 128px;grid-template-rows:minmax(0,1fr) auto auto;grid-template-areas:"lid screen keys" "lid screen util" "foot screen util";gap:8px;padding-top:max(8px,env(safe-area-inset-top));
 .brand{grid-template-columns:minmax(0,1fr);align-content:start;justify-items:center;text-align:center;border-radius:20px}
 .brand:after{display:none}
 #brand-name{font-size:16px}
 .tri-lid{flex-direction:column}
 .tri-codes{flex-wrap:wrap}
 nav{grid-template-columns:minmax(0,1fr);align-content:start;gap:4px;padding:6px}
 nav button{min-height:40px;flex-direction:row;align-items:center;padding:4px 18px 3px 8px}
 nav button:before{top:50%;right:6px;margin-top:-3px;width:6px;height:6px}
 .console-utilities{flex-direction:column}
 #refresh{justify-content:center;padding:4px 10px 2px}
 #live-feed{display:none}
 .console-tools{margin:0}
 .console-tools summary{width:100%}
 .console-menu{inset:10px 146px 10px auto;width:min(320px,50vw)}
}}
/* Stealth: the plain work console. Only tricorder-only markup is hidden. */
.console.tricorder[data-stealth=true] :is(.tri-bar,.tri-lid){display:none}
/* Motion preferences. */
.console.tricorder[data-motion=off] *{transition:none!important}
@media(prefers-reduced-motion:reduce){.console.tricorder *,.console.tricorder *:before,.console.tricorder *:after{animation:none!important;transition:none!important}}
`;
