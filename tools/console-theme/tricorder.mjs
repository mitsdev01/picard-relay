// Source-only theme compiler for the Engineering tricorder (phones, tablets, or
// the explicit "Engineering · Tricorder" appearance). Bundled into admission-ui.
// Built from the Admiral document: same IDs, same script, no authentication hooks.
// Every visual state keys off attributes the shared application already sets.
import {lcg,compactStyles,menuIcons} from './captain.mjs';

export function tricorderConsoleHtml(html,{forced=false}={}){
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

export const TRICORDER_OPTION='<option value="captain">Engineering</option><option value="tricorder">Engineering · Tricorder</option>';

// Drop selectors for which keep() is false; whole rules go when none remain.
// @media/@supports are filtered recursively; other at-rules are kept verbatim.
export function filterCss(css,keep){
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
