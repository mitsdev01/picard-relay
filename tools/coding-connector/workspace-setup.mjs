// Owner-run read-only enrollment check; no token reads, provider calls or commands.
import {loadRegistry} from './trusted-files.mjs';
try {
 if(process.argv.length!==4||process.argv[2]!=='validate')throw Error('usage');
 const r=loadRegistry(process.argv[3]);
 console.log(JSON.stringify({valid:true,workspaces:r.workspaces.map(w=>({id:w.id,root:w.root,allowApply:w.allowApply,testCommands:w.testCommands})),stateDir:r.stateDir,notice:'Local commands run with your account privileges. Keep this file and state directory private and outside all workspaces.'},null,2));
} catch(e) {console.error(JSON.stringify({valid:false,error:e.code??'enrollment_invalid',usage:'node workspace-setup.mjs validate ABSOLUTE_PRIVATE_REGISTRY_PATH'}));process.exitCode=1;}
