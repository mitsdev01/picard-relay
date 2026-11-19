// Synthetic UI acceptance fixture. Never uses a provider, host or real credentials.
import {createServer} from 'node:http';
import {CONSOLE_HTML,createConsoleHandler,consoleSnapshot} from '../../experimental/runtime-control/src/oracle-service.mjs';
import {workspaceConsoleHtml} from '../../experimental/runtime-control/src/admission-ui.mjs';
const port=4410,token='A'.repeat(43);let signedIn=true,password='fixture-old-password';
const fail=()=>{throw Object.assign(Error('auth_failed'),{code:'auth_failed'});};
const handler=createConsoleHandler({enabled:true,html:workspaceConsoleHtml(CONSOLE_HTML,{theme:'captain'}),
 htmlThemes:{admiral:workspaceConsoleHtml(CONSOLE_HTML),captain:workspaceConsoleHtml(CONSOLE_HTML,{theme:'captain'}),tricorder:workspaceConsoleHtml(CONSOLE_HTML,{theme:'tricorder'})},origins:['https://127.0.0.1:'+port],
 auth:{readPublicState:()=>({enrolled:true}),authenticate:()=>signedIn,logout:()=>{signedIn=false;},login:input=>{if(input.password!==password)fail();signedIn=true;return {token,expiresAt:Date.now()+3600000};},changePassword:(_,input)=>{if(!signedIn||input.currentPassword!==password)fail();password=input.newPassword;signedIn=false;}},
 getSnapshot:()=>consoleSnapshot({serviceReady:true,resultRecoveryReady:true,providerReady:true,acceptingNewWork:true,draining:false,blockingCode:'ready'},{queued:0,running:0,completed:0,uncertain:0,failed:0},new Date(),'fixture'),getRecentJobs:()=>({rows:[],nextCursor:null})});
createServer(async(req,res)=>{if(req.headers.origin==='http://127.0.0.1:'+port)req.headers.origin='https://127.0.0.1:'+port;req.headers.cookie=[...(req.headers.cookie??'').split(';').filter(s=>s.trim()&&!s.trim().startsWith('__Host-PicardSession=')),'__Host-PicardSession='+token].join('; ');if(!await handler(req,res)){res.writeHead(404);res.end();}}).listen(port,'127.0.0.1',()=>console.log('Synthetic password preview: http://127.0.0.1:'+port));
