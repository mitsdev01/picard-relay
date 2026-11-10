import {test} from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {runInNewContext} from 'node:vm';
import {CONSOLE_HTML,createConsoleHandler,MAX_CONSOLE_DOCUMENT_BYTES} from '../../experimental/runtime-control/src/oracle-service.mjs';
import {admissionConsoleHtml,workspaceConsoleHtml} from '../../experimental/runtime-control/src/admission-ui.mjs';
import {CAPTAIN_LOGIN_REVEAL,CAPTAIN_AUTH_CLOSE} from './captain.mjs';
const standard=workspaceConsoleHtml(CONSOLE_HTML),captain=workspaceConsoleHtml(CONSOLE_HTML,{theme:'captain'});
test('generated theme is current and both documents fit the bounded security handler',()=>{
 execFileSync(process.execPath,['tools/console-theme/build.mjs','--check']);
 // Review UI growth at 212 KiB, leaving 44 KiB before the runtime ceiling.
 for(const html of [standard,captain]){assert(Buffer.byteLength(html)<224*1024);assert.doesNotThrow(()=>createConsoleHandler({html}));}
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
test('Captain login and logout use shared cockpit state while retaining the stars preference',()=>{
 for(const stars of [0,2])for(const authenticated of [false,true]){
  const context={authenticated,cockpitFlags:stars,hudExpanded:false,starClicks:4,calls:0,syncCockpit(){this.calls++;}};
  context.syncCockpit=()=>context.calls++;
  runInNewContext(CAPTAIN_LOGIN_REVEAL,context);
  assert.equal(context.cockpitFlags,stars|(authenticated?1:0));assert.equal(context.hudExpanded,authenticated);assert.equal(context.calls,authenticated?1:0);
  runInNewContext(CAPTAIN_AUTH_CLOSE,context);
  assert.equal(context.cockpitFlags,stars);assert.equal(context.hudExpanded,false);assert.equal(context.starClicks,0);
 }
 assert(captain.includes('await status();'+CAPTAIN_LOGIN_REVEAL));
 assert(captain.includes('clearPrivate();clearInputs();'+CAPTAIN_AUTH_CLOSE+'authMode=mode;'));
 assert(captain.includes('[data-cockpit=true] .captain-doors'));
 assert(captain.includes('[data-starfield=true][data-motion=on] .captain-stars'));
 assert(!standard.includes(CAPTAIN_AUTH_CLOSE));
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

test('appearance cookie selects only prevalidated documents with their own CSP and shared authentication',async()=>{
 const auth={authenticate:token=>token==='a'.repeat(43)};
 const h=createConsoleHandler({enabled:true,html:captain,htmlThemes:{admiral:standard,captain},origins:['https://fixture.invalid'],auth,getSnapshot:()=>({v:1})});
 const get=async(cookie,url='/',host='fixture.invalid')=>{const res={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};res.handled=await h({method:'GET',url,headers:{host,cookie}},res);return res;};
 for(const [cookie,expected] of [[undefined,captain],['PicardAppearance=admiral',standard],['PicardAppearance=captain',captain],['PicardAppearance=__proto__',captain],['PicardAppearance=admiral; PicardAppearance=captain',captain],['x'.repeat(4097),captain]]){
  const r=await get(cookie);assert.equal(r.status,200);assert.equal(r.body,expected);assert.equal(r.headers['Cache-Control'],'no-store, private');
  for(const m of expected.matchAll(/<script>([\s\S]*?)<\/script>/g))assert(r.headers['Content-Security-Policy'].includes(createHash('sha256').update(m[1]).digest('base64')));
  assert.equal((await get(cookie,'/status')).status,401);
 }
 for(const theme of ['admiral','captain'])assert.equal((await get('PicardAppearance='+theme+'; __Host-PicardSession='+'a'.repeat(43),'/status')).status,200);
 assert.equal((await get('PicardAppearance=admiral','/','untrusted.invalid')).status,403);
 assert.equal((await get('PicardAppearance=admiral','/?theme=admiral')).handled,false);
 assert.throws(()=>createConsoleHandler({html:captain,htmlThemes:{admiral:standard,captain:'x'.repeat(MAX_CONSOLE_DOCUMENT_BYTES+1)}}),/console_document_invalid/);
});

test('appearance switching guards busy operations, cancellation and unavailable cookies',()=>{
 const source=standard.slice(standard.indexOf("const appearance=$('console-appearance');"),standard.indexOf('\nfunction ',standard.indexOf("const appearance=$('console-appearance');")));
 // Bound the exact listener rather than running the application or any network.
 const script=source;
 function fixture({busy=false,text='',confirm=true,cookies=true}={}){
  const select={value:'',addEventListener(type,fn){this.change=fn;}},notice={},surface={dataset:{consoleTheme:'captain'}},panel={hidden:true},yes={addEventListener(t,fn){this.click=fn;}},no={addEventListener(t,fn){this.click=fn;}};
  let stored='',reloads=0,questions=0;
  const document={querySelectorAll:()=>[{type:'text',value:text,getClientRects:()=>[{}]}],get cookie(){return stored;},set cookie(v){if(cookies)stored=v.split(';')[0];}};
  runInNewContext(script,{$:id=>id==='console-appearance'?select:id==='console-surface'?surface:id==='appearance-confirm'?panel:id==='appearance-continue'?yes:id==='appearance-cancel'?no:notice,workBusy:busy,document,window:{confirm(){questions++;return confirm;}},location:{protocol:'https:',reload(){reloads++;}}});
  select.value='admiral';select.change();if(!panel.hidden){questions++;(confirm?yes:no).click();}return {select,notice,stored,reloads,questions};
 }
 assert.equal(fixture().reloads,1);assert.equal(fixture().stored,'PicardAppearance=admiral');
 assert.equal(fixture({busy:true}).reloads,0);
 assert.equal(fixture({text:'unsaved',confirm:false}).reloads,0);
 assert.equal(fixture({text:'unsaved',confirm:false}).stored,'');
 assert.equal(fixture({text:'unsaved'}).questions,1);
 assert.equal(fixture({cookies:false}).reloads,0);
});

test('Captain preserves Admiral form, navigation and accessibility contracts',()=>{
 const contracts=html=>[...html.replace(/<script>[\s\S]*?<\/script>|<style>[\s\S]*?<\/style>/g,'').matchAll(/<(button|input|textarea|select|form|label|a)\b([^>]*)>/g)].map(([,tag,attrs])=>{
  // Styling and placement may differ; control bindings and safety attributes may not.
  const attributes=[...attrs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].filter(([,name])=>name!=='class'&&name!=='style').map(([,name,value])=>[name,value??true]).sort(([a],[b])=>a.localeCompare(b));
  return JSON.stringify([tag,attributes]);
 }).sort();
 assert.deepEqual(contracts(captain),contracts(standard));
});
