import {test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {CONSOLE_HTML,createConsoleHandler,MAX_CONSOLE_DOCUMENT_BYTES} from '../../experimental/runtime-control/src/oracle-service.mjs';
import {workspaceConsoleHtml} from '../../experimental/runtime-control/src/admission-ui.mjs';
const standard=workspaceConsoleHtml(CONSOLE_HTML),captain=workspaceConsoleHtml(CONSOLE_HTML,{theme:'captain'});
test('generated theme is current and both documents fit the bounded security handler',()=>{
 execFileSync(process.execPath,['tools/console-theme/build.mjs','--check']);
 // Review UI growth at 192 KiB, leaving 64 KiB before the runtime ceiling.
 for(const html of [standard,captain]){assert(Buffer.byteLength(html)<192*1024);assert.doesNotThrow(()=>createConsoleHandler({html}));}
 assert.doesNotThrow(()=>createConsoleHandler({html:'x'.repeat(MAX_CONSOLE_DOCUMENT_BYTES)}));
 assert.throws(()=>createConsoleHandler({html:'x'.repeat(MAX_CONSOLE_DOCUMENT_BYTES+1)}),/console_document_invalid/);
 assert.throws(()=>createConsoleHandler({html:'é'.repeat(MAX_CONSOLE_DOCUMENT_BYTES/2+1)}),/console_document_invalid/);
});
test('Captain theme preserves every interactive ID and the complete application script',()=>{
 const ids=h=>[...h.matchAll(/id="([^"]+)"/g)].map(x=>x[1]).sort();assert.deepEqual(ids(captain),ids(standard));
 const scripts=h=>[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);assert.deepEqual(scripts(captain),scripts(standard));
 assert.match(captain,/You have the conn\./);assert.match(captain,/captain-doors/);assert.doesNotMatch(standard,/class="console captain"/);
});
test('unknown themes and incompatible upstream structures stop compilation',()=>{
 assert.throws(()=>workspaceConsoleHtml(CONSOLE_HTML,{theme:'untrusted'}),/unknown_console_theme/);
 assert.throws(()=>workspaceConsoleHtml(CONSOLE_HTML.replace('id="logo-wrap"','id="changed"'),{theme:'captain'}),/captain_theme_contract_changed/);
});
test('space scene and doors are inside the central window, with privacy footer outside',()=>{
 const window=captain.indexOf('<div class="captain-window">'),scene=captain.indexOf('<div class="space-scene captain-observation"'),doors=captain.indexOf('<div class="captain-doors"'),footer=captain.indexOf('<footer class="footer">');
 assert(window>captain.indexOf('<header class="captain-topbar">'));
 assert(scene>window&&doors>scene&&footer>doors);
 assert.equal(captain.slice(footer-6,footer),'</div>');
});
