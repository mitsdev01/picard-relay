// Local CLI: shell-free process spawning. SSH identity, known hosts, destination
// and remote command come from the private environment, never from this file.
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {validateMission} from './agent.mjs';
function sshToken(name){
 const value=process.env[name];
 if(!value||value.startsWith('-')||/[\s\r\n\0,]/.test(value))throw Error('missing_or_invalid_'+name);
 return value;
}
function sshArgs(){
 const destination=sshToken('PICARD_FLOCKBAY_SSH_DESTINATION');
 if(!/^[A-Za-z0-9._-]+@[A-Za-z0-9.:-]+$/.test(destination))throw Error('invalid_PICARD_FLOCKBAY_SSH_DESTINATION');
 const remote=process.env.PICARD_FLOCKBAY_SSH_REMOTE;
 if(!remote||/[\r\n\0]/.test(remote))throw Error('missing_or_invalid_PICARD_FLOCKBAY_SSH_REMOTE');
 return ['-i',sshToken('PICARD_FLOCKBAY_SSH_IDENTITY'),'-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','UserKnownHostsFile='+sshToken('PICARD_FLOCKBAY_SSH_KNOWN_HOSTS'),'-o','ConnectTimeout=10',destination,remote];
}
const [action,...args]=process.argv.slice(2);
try{
 if(action==='prepare'){
  const opts={};for(let i=0;i<args.length;i+=2){if(!['--prompt-file','--out','--mode','--max-calls','--minutes','--contract-file'].includes(args[i])||!args[i+1]||opts[args[i]])throw Error('invalid_options');opts[args[i]]=args[i+1];}
  if(!opts['--prompt-file']||!opts['--out'])throw Error('prepare_requires_prompt_file_and_out');
  const mission={id:randomUUID(),prompt:readFileSync(opts['--prompt-file'],'utf8'),mode:opts['--mode']||'inspect',maxCalls:Number(opts['--max-calls']||8),minutes:Number(opts['--minutes']||10),approved:true};if(opts['--contract-file'])mission.contract=JSON.parse(readFileSync(opts['--contract-file'],'utf8'));validateMission(mission);mission.approved=false;
  writeFileSync(opts['--out'],JSON.stringify(mission,null,2)+'\n',{flag:'wx',mode:0o600});console.log(JSON.stringify({prepared:true,file:opts['--out'],mission},null,2));
 }else{
  let command;
  if(['maintenance-acquire','maintenance-release'].includes(action)&&args.length===1){const request=JSON.parse(readFileSync(args[0],'utf8'));command={action,id:request.id,...(action==='maintenance-acquire'?{reason:request.reason}:{})};}
  else if(['reject','repair'].includes(action)&&args.length===1){const review=JSON.parse(readFileSync(args[0],'utf8'));command={action,id:review.id,candidateSha256:review.candidateSha256,reason:review.reason};}
  else if(action==='status'&&args.length===0)command={action};
  else if(['show','events','stop'].includes(action)&&args.length===1&&/^[a-f0-9-]{36}$/.test(args[0]))command={action,id:args[0]};
  else if(action==='start'&&args.length===2&&args[1]==='--approve'){const mission=JSON.parse(readFileSync(args[0],'utf8'));mission.approved=true;validateMission(mission);command={action,mission};}
  else throw Error('Usage: picard.mjs status | prepare --prompt-file FILE --out FILE [--mode inspect|build --max-calls 8 --minutes 10] | start FILE --approve | show ID | events ID | stop ID');
  const ssh=spawn('ssh',sshArgs(),{stdio:['pipe','inherit','inherit'],windowsHide:true,shell:false});
  ssh.on('error',()=>{console.error('SSH unavailable; no automatic retry.');process.exitCode=1;});ssh.on('exit',code=>{process.exitCode=code??1;});ssh.stdin.on('error',()=>{});ssh.stdin.end(JSON.stringify(command));
 }
}catch(e){console.error(JSON.stringify({error:e.message}));process.exitCode=1;}
