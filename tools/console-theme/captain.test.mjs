import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {CONSOLE_HTML,createConsoleHandler,MAX_CONSOLE_DOCUMENT_BYTES} from '../../experimental/runtime-control/src/oracle-service.mjs';
import {admissionConsoleHtml,workspaceConsoleHtml} from '../../experimental/runtime-control/src/admission-ui.mjs';
import {CAPTAIN_LOGIN_REVEAL,CAPTAIN_AUTH_CLOSE} from './captain.mjs';
const standard=workspaceConsoleHtml(CONSOLE_HTML),captain=workspaceConsoleHtml(CONSOLE_HTML,{theme:'captain'});
test('generated theme is current and both documents fit the bounded security handler',()=>{
 execFileSync(process.execPath,['tools/console-theme/build.mjs','--check']);
 // Review UI growth at 208 KiB, leaving 48 KiB before the runtime ceiling.
 for(const html of [standard,captain]){assert(Buffer.byteLength(html)<208*1024);assert.doesNotThrow(()=>createConsoleHandler({html}));}
 assert.doesNotThrow(()=>createConsoleHandler({html:'x'.repeat(MAX_CONSOLE_DOCUMENT_BYTES)}));
 assert.throws(()=>createConsoleHandler({html:'x'.repeat(MAX_CONSOLE_DOCUMENT_BYTES+1)}),/console_document_invalid/);
 assert.throws(()=>createConsoleHandler({html:'é'.repeat(MAX_CONSOLE_DOCUMENT_BYTES/2+1)}),/console_document_invalid/);
});
test('Captain theme preserves interactive IDs and application script except explicit authentication presentation hooks',()=>{
 const ids=h=>[...h.matchAll(/id="([^"]+)"/g)].map(x=>x[1]).sort();assert.deepEqual(ids(captain),ids(standard));
 const scripts=h=>[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);assert.equal(captain.split(CAPTAIN_LOGIN_REVEAL).length,2);assert.equal(captain.split(CAPTAIN_AUTH_CLOSE).length,2);assert.deepEqual(scripts(captain.replace(CAPTAIN_LOGIN_REVEAL,'').replace(CAPTAIN_AUTH_CLOSE,'')),scripts(standard));
 assert.match(captain,/You have the conn\./);assert.match(captain,/captain-doors/);assert.doesNotMatch(standard,/class="console captain"/);
});
test('admissionConsoleHtml forwards theme when the workspace view is enabled',()=>{
 const viaAdmission=admissionConsoleHtml(CONSOLE_HTML,{activationEnabled:true,workspaceEnabled:true,theme:'captain'});
 assert.equal(viaAdmission,workspaceConsoleHtml(CONSOLE_HTML,{theme:'captain'}));
});
test('returning to authentication closes doors after clearing private state',()=>{
 const surface={dataset:{starfield:'true'}},badge={setAttribute(name,value){this[name]=value;}},context={starfield:true,hudExpanded:true,starClicks:4,calls:0,$:id=>id==='console-surface'?surface:badge};
 context.renderHUD=()=>context.calls++;
 runInNewContext(CAPTAIN_AUTH_CLOSE,context);
 assert.equal(context.starfield,false);assert.equal(context.hudExpanded,false);assert.equal(context.starClicks,0);assert.equal(context.calls,1);
 assert.equal(surface.dataset.starfield,'false');assert.equal(badge['aria-pressed'],'false');
 assert(captain.includes('clearPrivate();clearInputs();'+CAPTAIN_AUTH_CLOSE+'authMode=mode;'));
 assert(!standard.includes(CAPTAIN_AUTH_CLOSE));
});
test('login reveal opens the deck only after authenticated status; standard theme stays unchanged',()=>{
 for(const authenticated of [false,true]){
  const surface={dataset:{}},badge={setAttribute(name,value){this[name]=value;}},context={authenticated,starfield:false,hudExpanded:false,starClicks:3,calls:0,$:id=>id==='console-surface'?surface:badge};
  context.renderHUD=()=>context.calls++;
  runInNewContext(CAPTAIN_LOGIN_REVEAL,context);
  assert.equal(context.starfield,authenticated);assert.equal(context.hudExpanded,authenticated);assert.equal(context.calls,authenticated?1:0);
  assert.equal(surface.dataset.starfield,authenticated?'true':undefined);assert.equal(badge['aria-pressed'],authenticated?'true':undefined);
 }
 assert.doesNotMatch(standard,/if\(authenticated\)\{starfield=true;hudExpanded=true;starClicks=0/);
 assert(captain.includes('await status();'+CAPTAIN_LOGIN_REVEAL));
});
test('unknown themes and incompatible upstream structures stop compilation',()=>{
 assert.throws(()=>workspaceConsoleHtml(CONSOLE_HTML,{theme:'untrusted'}),/unknown_console_theme/);
 assert.throws(()=>workspaceConsoleHtml(CONSOLE_HTML.replace('id="logo-wrap"','id="changed"'),{theme:'captain'}),/captain_theme_contract_changed/);
});
test('space scene and doors are inside the central window, with privacy footer outside',()=>{
 const window=captain.indexOf('<div class="captain-window">'),scene=captain.indexOf('<div id="space-scene" class="space-scene captain-observation"'),doors=captain.indexOf('<div class="captain-doors"'),footer=captain.indexOf('<footer class="footer">');
 assert(window>captain.indexOf('<header class="captain-topbar">'));
 assert(scene>window&&doors>scene&&footer>doors);
 assert.equal(captain.slice(footer-6,footer),'</div>');
});
