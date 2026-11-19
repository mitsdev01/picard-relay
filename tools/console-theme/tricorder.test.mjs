import {test} from 'node:test';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {CONSOLE_HTML,createConsoleHandler,consoleMobileDevice} from '../../experimental/runtime-control/src/oracle-service.mjs';
import {workspaceConsoleHtml} from '../../experimental/runtime-control/src/admission-ui.mjs';
import {tricorderConsoleHtml} from './tricorder.mjs';
const standard=workspaceConsoleHtml(CONSOLE_HTML),captain=workspaceConsoleHtml(CONSOLE_HTML,{theme:'captain'});
const tricorder=workspaceConsoleHtml(CONSOLE_HTML,{theme:'tricorder'}),mobile=workspaceConsoleHtml(CONSOLE_HTML,{theme:'captain-mobile'});
const scripts=h=>[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
const ids=h=>[...h.matchAll(/id="([^"]+)"/g)].map(x=>x[1]).sort();
const ANDROID='Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const IPHONE='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPAD='Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const TABLET='Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const DESKTOP='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

test('tricorder documents fit the review budget and the bounded handler',()=>{
 for(const html of [tricorder,mobile]){assert(Buffer.byteLength(html)<250*1024);assert.doesNotThrow(()=>createConsoleHandler({html}));}
});

test('tricorder keeps Admiral IDs, script and form contracts with no authentication hooks',()=>{
 for(const html of [tricorder,mobile]){
  assert.deepEqual(ids(html),ids(standard));
  assert.deepEqual(scripts(html),scripts(standard));
  const contracts=h=>[...h.replace(/<script>[\s\S]*?<\/script>|<style>[\s\S]*?<\/style>/g,'').matchAll(/<(button|input|textarea|select|form|label|a)\b([^>]*)>/g)].map(([,tag,attrs])=>JSON.stringify([tag,[...attrs.matchAll(/([\w:-]+)(?:="([^"]*)")?/g)].filter(([,n])=>n!=='class'&&n!=='style').map(([,n,v])=>[n,v??true]).sort(([a],[b])=>a.localeCompare(b))])).sort();
  assert.deepEqual(contracts(html),contracts(standard));
 }
 assert.match(tricorder,/class="console tricorder" data-console-theme="tricorder"/);
 assert.match(mobile,/class="console tricorder" data-console-theme="captain"/);
 for(const html of [tricorder,mobile,captain])assert(html.includes('<option value="tricorder">Engineering · Tricorder</option>'));
 assert(!standard.includes('value="tricorder"'));
});

test('tricorder drops desktop cockpit rules and keeps decorations hidden from assistive technology',()=>{
 const css=tricorder.match(/<style>([\s\S]*?)<\/style>/)[1];
 assert.doesNotMatch(css,/data-cockpit="?true|data-starfield="?true|data-hud-expanded/);
 for(const m of tricorder.matchAll(/<div class="tri-(lid|bar)"([^>]*)>/g))assert.match(m[2],/aria-hidden="true"/);
});

test('tricorder compilation stops when the Admiral structure changes',()=>{
 assert.throws(()=>tricorderConsoleHtml(standard.replace('id="navigation"','id="changed"')),/tricorder_theme_contract_changed/);
 assert.throws(()=>tricorderConsoleHtml(standard.replace('<option value="captain">Engineering</option>','')),/tricorder_theme_contract_changed/);
});

test('mobile detection is bounded presentation input',()=>{
 for(const agent of [ANDROID,IPHONE,IPAD,TABLET])assert.equal(consoleMobileDevice({'user-agent':agent}),true);
 assert.equal(consoleMobileDevice({'user-agent':DESKTOP}),false);
 assert.equal(consoleMobileDevice({'user-agent':DESKTOP,'sec-ch-ua-mobile':'?1'}),true);
 assert.equal(consoleMobileDevice({'user-agent':'Mobile'+'x'.repeat(1100)}),false);
 assert.equal(consoleMobileDevice({}),false);
});

test('Engineering is served as the tricorder on phones and tablets, or when chosen',async()=>{
 const auth={authenticate:token=>token==='a'.repeat(43)};
 const h=createConsoleHandler({enabled:true,html:captain,htmlThemes:{admiral:standard,captain,tricorder},htmlMobile:{captain:mobile},origins:['https://fixture.invalid'],auth,getSnapshot:()=>({v:1})});
 const get=async(cookie,agent,url='/')=>{const res={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};await h({method:'GET',url,headers:{host:'fixture.invalid',cookie,'user-agent':agent}},res);return res;};
 const cases=[
  [undefined,DESKTOP,captain],[undefined,ANDROID,mobile],[undefined,IPAD,mobile],
  ['PicardAppearance=captain',DESKTOP,captain],['PicardAppearance=captain',IPHONE,mobile],['PicardAppearance=captain',TABLET,mobile],
  ['PicardAppearance=admiral',ANDROID,standard],['PicardAppearance=tricorder',DESKTOP,tricorder],['PicardAppearance=tricorder',ANDROID,tricorder],
  ['PicardAppearance=admiral; PicardAppearance=captain',ANDROID,mobile],['x'.repeat(4097),DESKTOP,captain]
 ];
 for(const [cookie,agent,expected] of cases){
  const r=await get(cookie,agent);assert.equal(r.status,200);assert.equal(r.body,expected);assert.equal(r.headers['Cache-Control'],'no-store, private');
  for(const m of expected.matchAll(/<script>([\s\S]*?)<\/script>/g))assert(r.headers['Content-Security-Policy'].includes(createHash('sha256').update(m[1]).digest('base64')));
  assert.equal((await get(cookie,agent,'/status')).status,401);
 }
 // Admiral as the default document never becomes the tricorder.
 const admiralDefault=createConsoleHandler({enabled:true,html:standard,htmlThemes:{admiral:standard,captain,tricorder},htmlMobile:{captain:mobile},origins:['https://fixture.invalid'],auth,getSnapshot:()=>({v:1})});
 const res={writeHead(status){this.status=status;},end(body){this.body=body;}};await admiralDefault({method:'GET',url:'/',headers:{host:'fixture.invalid','user-agent':ANDROID}},res);assert.equal(res.body,standard);
 assert.throws(()=>createConsoleHandler({html:captain,htmlThemes:{admiral:standard,captain},htmlMobile:{admiral:mobile}}),/console_themes_invalid/);
 assert.throws(()=>createConsoleHandler({html:captain,htmlThemes:{admiral:standard,captain,other:tricorder}}),/console_themes_invalid/);
});
