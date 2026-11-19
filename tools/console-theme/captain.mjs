import {TRICORDER_OPTION,filterCss} from './tricorder.mjs';
// Source-only theme compiler. The generated function is bundled into the existing
// signed admission-ui module; there is no runtime import or host-side injection.
// Captain "LCARS 47": a flat Okuda-grammar presentation. Everything below is static
// markup and CSS keyed off state attributes the shared application already sets.
export function captainConsoleHtml(html){
 const replace=(from,to)=>{if(html.split(from).length!==2)throw Error('captain_theme_contract_changed');html=html.replace(from,to);};
 for(const id of ['console-surface','logo-wrap','navigation','private','heading-overview','health-heading','training-progress','activity-list','hud-instruments'])if(html.split('id="'+id+'"').length!==2)throw Error('captain_theme_contract_changed');
 replace('class="console"','class="console captain" data-console-theme="captain"');
 // Presentation only, after the existing login AND status validation succeed.
 // Fail compilation if upstream changes this authentication completion point.
 replace("await status();}\n catch(error){showAuth(setup", "await status();"+CAPTAIN_LOGIN_REVEAL+"}\n catch(error){showAuth(setup");
 // Clear private state first; closing is visual and never delays revocation.
 replace('clearPrivate();clearInputs();authMode=mode;', 'clearPrivate();clearInputs();'+CAPTAIN_AUTH_CLOSE+'authMode=mode;');
 replace('<span id="refresh-label">','<svg class="captain-refresh-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 10a8 8 0 0 0-14-4L3 9m0-5v5h5M4 14a8 8 0 0 0 14 4l3-3m0 5v-5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span id="refresh-label">');
 const utilities=html.match(/<div class="console-utilities">[\s\S]*?<p class="sidebar-foot">MAKE IT SO\.<\/p>/)?.[0];
 if(!utilities)throw Error('captain_theme_contract_changed');
 replace(utilities,'<div class="captain-sidebar-rank">'+captainCodes()+'<span class="captain-pips" aria-hidden="true">● ●</span><p>YOUR COMMISSION</p></div>');
 const rank='<small id="training-rank" hidden></small>';
 replace(rank,'<small class="captain-brand-subtitle">LCARS 47 · Engineering</small>');
 replace('<p>YOUR COMMISSION</p>','<p>YOUR COMMISSION</p>'+rank);
 replace('<div class="captain-sidebar-rank">','<div class="captain-access-panel"><p class="captain-access-label">OWNER ACCESS</p><h2>Command authorization required</h2><p>Sign in to take the conn.</p><div class="captain-access-trace" aria-hidden="true"><span></span><span></span><span></span></div><div class="captain-access-foot"><p>YOUR PRIVATE CONSOLE<small>Jobs · Requests · Relay status</small></p></div></div><div class="captain-sidebar-rank">');
 replace('<div class="workspace"','<header class="captain-topbar"><div class="captain-rail" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div><span class="captain-breadcrumb">PICARD RELAY / <span>CONSOLE</span></span><span class="captain-condition" aria-hidden="true"><b></b></span>'+utilities.replace('<p class="sidebar-foot">MAKE IT SO.</p>','')+'</header><div class="workspace"');
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
 replace('<div class="workspace" id="cockpit-glass" tabindex="0" aria-label="Space view; arrow keys look around">','<div class="workspace" id="cockpit-glass" tabindex="0" aria-label="Space view; arrow keys look around"><div class="captain-window">'+captainSpaceScene()+'<div class="captain-doors" aria-hidden="true"><span></span><span></span></div>');
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
export function compactStyles(html){
 const keepStrings=(css,pattern,fn)=>css.replace(new RegExp(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|/.source+pattern.source,'g'),(token,...groups)=>token.startsWith('"')||token.startsWith("'")?token:fn(token,...groups));
 const compact=css=>{
  css=keepStrings(css,/\/\*[\s\S]*?\*\//,()=>'');
  css=keepStrings(css,/\s*([{};,])\s*|:\s+|\s+/,(token,punctuation)=>punctuation??(token[0]===':'?':':' '));
  return keepStrings(css,/;}/,()=>'}').trim();
 };
 return html.replace(/<style>([\s\S]*?)<\/style>/g,(_,css)=>'<style>'+compact(css)+'</style>');
}

const REMOVED_CLASSES=['sidebar-foot','motto','hud-numbers','display-rail','display-modes','display-effects','folding-glass-arc'];

export const CAPTAIN_LOGIN_REVEAL="if(authenticated){cockpitFlags|=1;hudExpanded=true;starClicks=0;syncCockpit();}";
export const CAPTAIN_AUTH_CLOSE="cockpitFlags&=~1;hudExpanded=false;starClicks=0;syncCockpit();";

// Settings-menu icons, shared with the tricorder. Geometry simplified from Lucide
// (ISC licence): log-out, pause, hat-glasses, workflow, file-text, external-link, rss,
// users-collaboration, galaxy, rotate-ccw.
// Decorative only; every control keeps its own text or aria-label as its name.
// #motion rewrites its own text, so its icon sits beside it in a .menu-tool row.
const icon=d=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="'+d+'"/></svg>';
export function menuIcons(html,error){
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
export function lcg(seed){return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

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

export const CAPTAIN_STYLE=String.raw`
/* ---------- Tokens. Flat colour, condensed type, black field. ---------- */
body:has(.console.captain:not([data-stealth=true])){margin:0;background:#000}
.console.captain:not([data-stealth=true]){--o:#ff9966;--g:#ffcc66;--p:#ffaa90;--l:#cc99cc;--v:#9977aa;
 --b:#9999ff;--s:#99ccff;--t:#ddaa77;--r:#dd6688;--x:#e64a3c;
 --frame-a:#b8475f;--frame-b:#9b5f97;--body:system-ui,"Segoe UI",Roboto,sans-serif;--cond:#7fe0a8;--cond-text:"WARP CORE STABLE";
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
:where(.console.captain:not([data-stealth=true])) button:hover:not(:disabled):not(:where(.job-row,.logo-wrap,#windshield-work,#windshield-dismiss)){background:var(--g);color:#000;border-color:transparent}
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
 #private :is(input:not([type=checkbox]):not([type=radio]),textarea){padding:10px 16px;border:1px solid #99f6;border-radius:22px;background:#000}
 #private :is(input,textarea):focus-visible{border-color:var(--g);outline-offset:3px}
 /* Tips sit left of the panel, level with the hovered or focused row. */
 #motion{--tip:"Pause or resume animation"}
 #stealth-mode{--tip:"Switch to a plain console. Shortcut: Alt+Shift+S"}
 #stealth-auto-toggle{--tip:"Auto stealth: turn on when hidden or idle"}
 .documentation{--tip:"Open the documentation in a new tab"}
 #feedback-open{--tip:"Send feedback about Picard Relay"}
 #workspace-toggle{--tip:"Show the LCARS workspace"}
 #stars-toggle{--tip:"Show or hide the starfield"}
 #walkthrough-replay{--tip:"Replay the walkthrough"}
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
 #auth{position:relative;z-index:7;width:100%;max-width:520px;margin:auto;padding:36px 36px 30px;background:#000e;border:0;border-left:32px solid var(--v);border-right:32px solid var(--v);border-top:10px solid var(--v);border-bottom:10px solid var(--v);border-radius:54px;box-shadow:0 0 0 6px #000,0 30px 80px #000;align-self:center}
 #auth:before{content:"SECURITY ACCESS · LEVEL 10";position:absolute;top:-17px;left:22px;padding:0 10px;background:#000;color:var(--l);font-size:16px;line-height:24px;letter-spacing:.17em}
 #auth h2{margin:4px 0 10px;font-size:clamp(30px,3vw,42px);line-height:1.05;color:var(--o)}
 #auth>p{margin-bottom:22px;font-size:15px;color:var(--muted)}
 #auth label{margin-top:16px;color:var(--l)}
 #auth input{min-height:50px}
 #auth .auth-submit{width:100%;min-height:54px;margin-top:24px;border-radius:27px;background:var(--o);font-size:21px;letter-spacing:.16em;text-align:center}
 #auth .auth-message{margin:18px 0 0;padding:10px 14px;border:0;border-left:10px solid var(--g);border-radius:12px 0 0 12px;color:var(--g);overflow-wrap:anywhere}
 .captain-access-panel{display:none}
}
@media(min-width:901px){
 .console.captain:not([data-stealth=true]){
  &:has(#auth:not([hidden])) .captain-sidebar-rank{display:none}
  &:has(#auth:not([hidden])) .captain-access-panel{display:flex;flex:1 0 auto;flex-direction:column;gap:5px}
 }
}
.console.captain:not([data-stealth=true]){
 .captain-access-panel>*{margin:0;padding:8px 14px 6px;background:var(--p);color:#000;text-align:right;letter-spacing:.08em}
 .captain-access-label{background:var(--x)!important;font-size:14px;letter-spacing:.18em!important}
 .captain-access-panel h2{padding:14px;background:var(--t);color:#000;font-size:23px;line-height:1.1}
 .captain-access-panel>p:nth-child(3){background:var(--v);font-size:15px}
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
 &:is([data-route-phase=unknown],[data-route-phase=uncertain]),&:has(#health-heading:not([data-tone=good])){--frame-a:var(--g);--cond:var(--g);--cond-text:"WARP CORE UNSTABLE"}
 &[data-route-phase=failed]{--frame-a:var(--x);--frame-b:var(--x);--cond:var(--x);--cond-text:"WARP CORE CRITICAL"}
 &[data-motion=on][data-route-phase=failed] *:is(.brand,.captain-rail i:nth-child(1),.captain-rail i:nth-child(5),.captain-condition){animation:captain-alert 1.8s ease-in-out infinite}
 &:has(#auth:not([hidden])){--frame-a:var(--o);--frame-b:var(--v)}
}
/* ---------- Stealth: Engineering steps aside for the plain Work Console. ----------
   Every LCARS rule above is scoped to :not([data-stealth=true]), so the shared
   Admiral stealth styles apply. Only Engineering's own extra markup is placed or hidden. */
.console.captain[data-stealth=true]{
 *:is(.captain-rail,.captain-codes,.captain-condition,.captain-breadcrumb,.captain-brand-subtitle,.captain-sidebar-rank,.captain-access-panel,.captain-pips,.captain-eyebrow,.captain-intro,.captain-card-title,.captain-refresh-icon,.space-scene,.captain-doors,.cockpit-dash){display:none!important}
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
  *:is(.captain-warp,.captain-codes span,.route-stages span,.captain-access-trace span,.brand,.captain-rail i,.captain-condition){animation:none!important}
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
  #auth{padding:28px 18px 22px;border-left-width:14px;border-right-width:14px;border-radius:34px}
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
