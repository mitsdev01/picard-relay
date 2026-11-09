import test from 'node:test';
import assert from 'node:assert';
import {join} from 'node:path';
import {buildMissionPrompt,buildMcpServers,codexReadOnlyMcpSupported,agentSpawnResult,cursorAuthHint,agentOutputImpliesNoRelayTask} from '../agents.mjs';

test('buildMissionPrompt forbids apply and names tools',()=>{
 const t=buildMissionPrompt({workspaceId:'easyjob',title:'T',missionText:'Do the thing'});
 assert.match(t,/Do not call picard_workspace_apply/);
 assert.match(t,/picard_workspace_collect/);
 assert.match(t,/Workspace enrollment id: easyjob/);
 assert.match(t,/picard_workspaces/);
});

test('buildMcpServers wires only picard-coding stdio',()=>{
 const s=buildMcpServers({
  nodeExe:'/bin/node',
  codingConfigPath:'C:\\\\picard\\\\coding.json',
  workspacesPath:'C:\\\\picard\\\\workspaces.json'
 });
 assert.ok(s['picard-coding']);
 assert.equal(s['picard-coding'].type,'stdio');
 assert.ok(s['picard-coding'].env.PICARD_CODING_CONFIG.endsWith('coding.json'));
});

test('codexReadOnlyMcpSupported is boolean for missing fake binary',()=>{
 const r=codexReadOnlyMcpSupported(join(process.cwd(),'nonexistent-codex-'+Date.now()));
 assert.strictEqual(typeof r,'boolean');
});

test('agentSpawnResult maps spawn error to negative status',()=>{
 const r=agentSpawnResult({status:null,signal:null,error:new Error('spawn ENOENT'),stdout:'',stderr:''});
 assert.equal(r.status,-1);
 assert.match(r.stderr,/ENOENT/);
 assert.ok(r.spawnError);
});

test('cursorAuthHint when Authentication required',()=>{
 const h=cursorAuthHint("Error: Authentication required. Please run 'agent login' first.");
 assert.ok(h);
 assert.ok(h.some(l=>l.includes('agent login')));
});

test('agentOutputImpliesNoRelayTask when taskId none',()=>{
 assert.equal(agentOutputImpliesNoRelayTask('**taskId:** none (prepare never ran)'),true);
 assert.equal(agentOutputImpliesNoRelayTask('picard_workspaces is not callable'),true);
 assert.equal(agentOutputImpliesNoRelayTask('picard_workspaces was rejected by classifier'),true);
 assert.equal(agentOutputImpliesNoRelayTask('Some success and task abc-123'),false);
});
