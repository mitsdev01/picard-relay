// Source-only customization. No extra module is shipped in the signed bundle.
export const method = `  async changePassword(token,input){
   let current,next;
   try{
    requestCheck(keys(input,['currentPassword','newPassword']));
    current=passwordBytes(input.currentPassword);next=passwordBytes(input.newPassword);
    return await locked(async(ctx,state,at)=>{
     requestCheck(matches(state,token,at));await attempt(ctx,state,at);
     const proof=await scrypt(current,Buffer.from(state.password.salt,'base64url'),32,PARAMS);
     try{requestCheck(equal(proof.toString('base64url'),state.password.hash));}finally{proof.fill(0);}
     const salt=randomBytes(16),derived=await scrypt(next,salt,32,PARAMS);
     try{
      const completedAt=now();check(integer(completedAt)&&completedAt>=at);requestCheck(matches(state,token,completedAt));
      state.password={algorithm:'scrypt',N:PARAMS.N,r:PARAMS.r,p:PARAMS.p,salt:salt.toString('base64url'),hash:derived.toString('base64url')};
      state.session=null;await persist(ctx,state,completedAt);return {ok:true};
     }finally{derived.fill(0);}
    });
   }finally{current?.fill(0);next?.fill(0);}
  },
`;

export const dialog = `<dialog id="password-dialog" aria-labelledby="password-heading"><form id="password-change-form">
<h2 id="password-heading">Change password</h2><p>Your current password is required. After changing it, sign in again.</p>
<label for="password-current">Current password</label><input id="password-current" type="password" autocomplete="current-password" maxlength="128" required>
<label for="password-next">New password</label><input id="password-next" type="password" autocomplete="new-password" maxlength="128" required aria-describedby="password-help">
<label for="password-confirm">Confirm new password</label><input id="password-confirm" type="password" autocomplete="new-password" maxlength="128" required>
<p id="password-help">Use 8–128 UTF-8 bytes. A long, unique passphrase is recommended.</p>
<button id="password-show" type="button" aria-pressed="false">Show passwords</button>
<p id="password-message" role="status" aria-live="polite"></p>
<div class="password-actions"><button id="password-cancel" type="button">Cancel</button><button id="password-save" type="submit">Change password</button></div>
</form></dialog>`;
export const style = `
.console-menu .password-action{display:flex;width:100%;padding:10px 12px;min-height:44px;text-align:left;border:0;color:var(--muted)}
#password-dialog{color:var(--text,#eeefe9);background:var(--surface,#1b2225);border:1px solid var(--accent,#dec387);border-radius:18px;padding:24px;width:min(460px,calc(100vw - 32px));max-height:calc(100dvh - 32px);overflow:auto}
#password-dialog::backdrop{background:#000b}#password-dialog h2{margin-top:0}#password-dialog label{display:block;margin-top:14px}#password-dialog input{display:block;width:100%;min-width:0;margin-top:5px;padding:10px;color:inherit;background:var(--bg,#101416);border:1px solid var(--line,#303b3f);border-radius:8px}#password-dialog p{font-size:14px}#password-dialog button{min-height:44px;padding:8px 12px}#password-dialog .password-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px}#password-message{min-height:1.5em;color:var(--accent,#dec387)}
`;
// Runs inside the existing console closure so authentication clearing remains shared.
export function passwordUi(){
 const dialog=$('password-dialog'),form=$('password-change-form');let saving=false;
 const inputs=['password-current','password-next','password-confirm'].map($);
 function clearPasswordDialog(){form.reset();for(const input of inputs)input.type='password';$('password-show').textContent='Show passwords';$('password-show').setAttribute('aria-pressed','false');$('password-message').textContent='';}
 $('password-open').addEventListener('click',()=>{if(!authenticated||saving)return;clearPasswordDialog();$('console-tools').open=false;dialog.showModal();inputs[0].focus();});
 $('password-cancel').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('close',clearPasswordDialog);
 $('password-show').addEventListener('click',()=>{const show=inputs[0].type==='password';for(const input of inputs)input.type=show?'text':'password';$('password-show').textContent=show?'Hide passwords':'Show passwords';$('password-show').setAttribute('aria-pressed',String(show));});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(saving||!authenticated)return;
  const currentPassword=inputs[0].value,newPassword=inputs[1].value;
  if(newPassword!==inputs[2].value){$('password-message').textContent='The new passwords do not match.';inputs[2].focus();return;}
  const valid=value=>value.isWellFormed()&&new TextEncoder().encode(value).length>=8&&new TextEncoder().encode(value).length<=128;
  if(!valid(currentPassword)||!valid(newPassword)){$('password-message').textContent='Passwords must contain 8–128 UTF-8 bytes.';return;}
  saving=true;$('password-save').disabled=true;form.setAttribute('aria-busy','true');$('password-message').textContent='Changing password…';
  // Clear secrets immediately. No persistence, logs, automatic retries or provider calls.
  for(const input of inputs)input.value='';
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),15000);
  try{
   const response=await fetch('/auth/password',{method:'POST',credentials:'same-origin',cache:'no-store',redirect:'error',signal:abort.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword,newPassword})});
   if(response.ok){dialog.close();showAuth('login','Password changed. Sign in with your new password.');}
   else if(response.status===401){$('password-message').textContent='Current password incorrect or session expired. Sign in again if needed.';}
   else if(response.status===429){$('password-message').textContent='Too many attempts. Wait a minute before trying again.';}
   else{dialog.close();showAuth('login','Password change could not be confirmed. Try signing in with your new password, then the previous one if needed.');}
  }catch{dialog.close();showAuth('login','Password change could not be confirmed. Try signing in with your new password, then the previous one if needed.');}
  finally{clearTimeout(timer);saving=false;$('password-save').disabled=false;form.removeAttribute('aria-busy');}
 });
 if(typeof MutationObserver!=='undefined')new MutationObserver(()=>{const hidden=$('logout').hidden;$('password-open').hidden=hidden;if(hidden){dialog.close();clearPasswordDialog();}}).observe($('logout'),{attributes:true,attributeFilter:['hidden']});
}

function replaceOnce(source,before,after){
 const oldCount=source.split(before).length-1,newCount=source.split(after).length-1;
 if(newCount===1)return source;
 if(oldCount!==1)throw Error('Owner password compatibility anchor changed: '+before.slice(0,80));
 return source.replace(before,after);
}
export function applyPasswordExtension(source){
 const original=source,installed=source.includes('  async changePassword(');
 source=replaceOnce(source,'export const MAX_CONSOLE_DOCUMENT_BYTES=288*1024;','export const MAX_CONSOLE_DOCUMENT_BYTES=296*1024;');
 source=replaceOnce(source,'  async login(input){',method+'  async login(input){');
 source=replaceOnce(source,"['/auth/setup','/auth/login','/auth/logout','/updates'","['/auth/setup','/auth/login','/auth/logout','/auth/password','/updates'");
 source=replaceOnce(source,"   let size=0,parts=[];for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>1024)","   if(path==='/auth/password'&&!await auth.authenticate(tokenFrom(req)))return reply(401,{error:'auth_failed'});\n   let size=0,parts=[];for await(const chunk of req){const bytes=Buffer.from(chunk);size+=bytes.length;if(size>(path==='/auth/password'?2048:1024))");
 source=replaceOnce(source,"path==='/auth/login'?['password']:[];","path==='/auth/login'?['password']:path==='/auth/password'?['currentPassword','newPassword']:[];");
 source=replaceOnce(source,"   if(path==='/auth/logout'){", "   if(path==='/auth/password'){await auth.changePassword(tokenFrom(req),body);return reply(200,{ok:true},{'Set-Cookie':cookie('',0)});}\n   if(path==='/auth/logout'){");
 const match=source.match(/const CONSOLE_SHELL_HTML=(".*");/);
 if(!match)throw Error('Console shell anchor changed');
 let html=JSON.parse(match[1]);
 html=replaceOnce(html,'<button class="logout" id="logout"','<button class="password-action" id="password-open" type="button" hidden>Change password</button><button class="logout" id="logout"');
 html=replaceOnce(html,'</style>',style+'</style>');
 html=replaceOnce(html,'<script>',dialog+'<script>');
 html=replaceOnce(html,"window.addEventListener('pagehide',()=>{controller?.abort();","window.addEventListener('pagehide',()=>{for(const id of ['password-current','password-next','password-confirm'])$(id).value='';controller?.abort();");
 html=replaceOnce(html,'motion();void boot();',`(${passwordUi.toString().replaceAll('\r\n','\n')})();\nmotion();void boot();`);
 const output=source.replace(match[0],'const CONSOLE_SHELL_HTML='+JSON.stringify(html)+';');
 if(installed&&output!==original)throw Error('Owner password customization drifted; review instead of reapplying over changed code');
 return output;
}
