/**
 * Shared Picard mission / connector orchestration for legacy CLI and K9s TUI.
 * All output goes through io.log; prompts through io.question(prompt, opts?).
 */
import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 buildMissionPrompt,
 runAgent,
 cursorAuthHint,
 agentOutputImpliesNoRelayTask,
} from './agents.mjs';
import {createTuiWorkspaceAgent,readRelayEventIdFromJournal} from './workspace-ops.mjs';
import {loadRegistry} from '../coding-connector/trusted-files.mjs';
import {loadCodingConfig} from '../coding-connector/config.mjs';
import {loadReviewConfig} from './review-config.mjs';
import {buildReviewBody} from './review-body.mjs';
import {relayGet,relayPost} from './relay-fetch.mjs';
import {
 CAPTAIN,
 agentTableLines,
 escRgb,
 logBlockLines,
 missionBriefLines,
 panelBox,
 paint,
 ruleElbow,
 statusStrip,
 stepLabel,
 termColumns,
 workspaceTableLines,
} from './lcars-ui.mjs';
import {defaultReviewClientPath} from './paths.mjs';

function sleep(ms) {
 return new Promise(r => setTimeout(r, ms));
}

/**
 * @typedef {{ multiline?: boolean }} QuestionOpts
 */

/**
 * @typedef {{
 *  log: (line: string) => void,
 *  question: (prompt: string, opts?: QuestionOpts) => Promise<string|null>,
 *  installPollCancel: (onCancel: (reason: 'escape'|'sigint') => void) => () => void,
 *  gridW: () => number,
 *  colorOn: boolean,
 *  setMissionStep?: (index: number, status: 'pending'|'running'|'done'|'error') => void,
 *  setSpinner?: (active: boolean, label?: string) => void,
 *  verbosePollLog?: boolean,
 * }} MissionIO
 */

function promptPaintIo(io, kind) {
 const seq = kind === 'warn' ? escRgb(...CAPTAIN.warn) : escRgb(...CAPTAIN.gold);
 return (
  paint(kind === 'warn' ? 'INPUT ' : 'INPUT ', seq, io.colorOn) +
  paint('> ', escRgb(...CAPTAIN.cream), io.colorOn)
 );
}

/**
 * @param {MissionIO} io
 */
export async function pickAgent(io, agents) {
 const w = io.gridW();
 if (!agents.length) {
  for (const line of panelBox('Attention', ['No agent on PATH (agent, codex, claude). Install a CLI and retry.'], io.colorOn, w)) io.log(line);
  process.exitCode = 2;
  return null;
 }
 io.log(stepLabel(1, 'Select agent', io.colorOn));
 for (const line of agentTableLines(agents, io.colorOn, w)) io.log(line);
 const ans = await io.question(promptPaintIo(io, 'cmd') + 'Enter number (1-' + agents.length + '): ');
 if (ans === null) {
  io.log(paint('Cancelled.', escRgb(...CAPTAIN.warn), io.colorOn));
  return null;
 }
 const n = Number((ans || '').trim());
 if (!Number.isInteger(n) || n < 1 || n > agents.length) return null;
 return agents[n - 1];
}

/**
 * @param {MissionIO} io
 */
export async function pickWorkspace(io, registryPath) {
 const w = io.gridW();
 const doc = JSON.parse(readFileSync(registryPath, 'utf8'));
 const list = doc.workspaces || [];
 io.log(stepLabel(2, 'Trusted workspace', io.colorOn));
 for (const line of workspaceTableLines(list, io.colorOn, w)) io.log(line);
 const ans = await io.question(
  promptPaintIo(io, 'cmd') + 'Workspace number (1-' + list.length + '): '
 );
 if (ans === null) {
  io.log(paint('Cancelled.', escRgb(...CAPTAIN.warn), io.colorOn));
  return null;
 }
 const n = Number((ans || '').trim());
 if (!Number.isInteger(n) || n < 1 || n > list.length) return null;
 return list[n - 1];
}

/**
 * @param {MissionIO} io
 * @param {ReturnType<createTuiWorkspaceAgent>} ops
 */
async function waitForActiveTask(io, ops, workspaceId, maxPolls = 1200) {
 let cancelled = false;
 let stopCancel = null;
 stopCancel = io.installPollCancel(reason => {
  cancelled = true;
  if (reason === 'sigint') {
   io.log('');
   io.log(paint('Interrupted (Ctrl+C).', escRgb(...CAPTAIN.warn), io.colorOn));
   stopCancel?.();
   process.exitCode = 130;
   process.exit(130);
  }
 });
 const gw = io.gridW();
 io.setSpinner?.(true, 'task lock');
 try {
  io.log(paint('Waiting for active task lock (Esc or Ctrl+C stops this wait).', escRgb(...CAPTAIN.gold), io.colorOn));
  io.log(
   paint(
    'Polling connector every 250 ms; heartbeat below about every 2 s until a task id appears.',
    escRgb(...CAPTAIN.muted),
    io.colorOn
   )
  );
  for (let i = 0; i < maxPolls; i++) {
   if (cancelled) {
    io.log(paint('Stopped waiting for task.', escRgb(...CAPTAIN.warn), io.colorOn));
    return null;
   }
   const list = ops.list();
   const wk = list.workspaces.find(x => x.id === workspaceId);
   if (wk?.activeTaskId) {
    io.setSpinner?.(false);
    io.log(
     statusStrip(
      [
       paint('TASK', escRgb(...CAPTAIN.good), io.colorOn),
       paint(wk.activeTaskId, escRgb(...CAPTAIN.cream), io.colorOn),
       paint('LOCK ACQUIRED', escRgb(...CAPTAIN.good), io.colorOn),
      ],
      io.colorOn,
      gw
     )
    );
    return wk.activeTaskId;
   }
   const logPoll = io.verbosePollLog ? i % 2 === 0 : i === 0 || i % 8 === 0;
   if (logPoll) {
    const elapsedSec = Math.round(i * 0.25);
    io.log(
     statusStrip(
      [
       paint('POLL', escRgb(...CAPTAIN.warn), io.colorOn),
       paint('~' + elapsedSec + 's', escRgb(...CAPTAIN.cream), io.colorOn),
       paint('tick ' + i + ' | awaiting MCP prepare/submit', escRgb(...CAPTAIN.muted), io.colorOn),
      ],
      io.colorOn,
      gw
     )
    );
   }
   await sleep(250);
  }
  io.log(paint('Timed out waiting for active task id.', escRgb(...CAPTAIN.warn), io.colorOn));
  return null;
 } finally {
  io.setSpinner?.(false);
  if (stopCancel) stopCancel();
 }
}

/**
 * @returns {{st:object,collectBlocked:null|'workspace_changed'|'cancelled'}}
 */
async function settleAfterAgent(io, ops, workspaceId, taskId, codingConfigPath, registryPath) {
 let cancelled = false;
 let stopCancel = null;
 stopCancel = io.installPollCancel(reason => {
  cancelled = true;
  if (reason === 'sigint') {
   io.log('');
   io.log(paint('Interrupted (Ctrl+C).', escRgb(...CAPTAIN.warn), io.colorOn));
   stopCancel?.();
   process.exitCode = 130;
   process.exit(130);
  }
 });
 const gw = io.gridW();
 let relayCfg;
 try {
  relayCfg = loadCodingConfig(codingConfigPath);
 } catch {
  relayCfg = null;
 }
 let lastRelayState = null;
 let lastJournalEventId = null;
 io.setSpinner?.(true, 'collect / relay');
 try {
  io.log(paint('Collecting relay result (Esc or Ctrl+C stops this wait).', escRgb(...CAPTAIN.gold), io.colorOn));
  io.log(
   paint(
    'Relay line uses GET /workspace/requests/<eventId> when the connector journal has an event id (after prepare). Until then, only local task state is shown.',
    escRgb(...CAPTAIN.muted),
    io.colorOn
   )
  );
  for (let i = 0; i < 900; i++) {
   if (cancelled) {
    io.log(paint('Stopped waiting for collect/stage.', escRgb(...CAPTAIN.warn), io.colorOn));
    return {st: ops.status({workspaceId, taskId}), collectBlocked: 'cancelled'};
   }
   const st = ops.status({workspaceId, taskId});
   if (io.verbosePollLog && (i === 0 || i % 2 === 0))
    io.log(
     statusStrip(
      [paint('STATUS', escRgb(...CAPTAIN.muted), io.colorOn), paint(String(st.state), escRgb(...CAPTAIN.cream), io.colorOn), paint('i=' + i, escRgb(...CAPTAIN.muted), io.colorOn)],
      io.colorOn,
      gw
     )
    );
   if (relayCfg && i % 12 === 0) {
    const ref = readRelayEventIdFromJournal(registryPath, codingConfigPath, workspaceId, taskId);
    if (ref && ref !== lastJournalEventId) {
     lastJournalEventId = ref;
     io.log(
      statusStrip(
       [paint('RELAY', escRgb(...CAPTAIN.elbow), io.colorOn), paint('journal eventId ' + ref.slice(0, 12) + '...', escRgb(...CAPTAIN.cream), io.colorOn)],
       io.colorOn,
       gw
      )
     );
    }
    if (ref) {
     try {
      const rq = await relayGet({origin: relayCfg.origin, token: relayCfg.token, path: '/workspace/requests/' + ref});
      if (rq.status === 200 && typeof rq.body?.state === 'string' && rq.body.state !== lastRelayState) {
       lastRelayState = rq.body.state;
       const rs = rq.body.resultAvailable === true ? 'result ready' : 'awaiting result';
       io.log(
        statusStrip(
         [paint('RELAY', escRgb(...CAPTAIN.good), io.colorOn), paint(rq.body.state, escRgb(...CAPTAIN.cream), io.colorOn), paint(rs, escRgb(...CAPTAIN.muted), io.colorOn)],
         io.colorOn,
         gw
        )
       );
      }
     } catch {
      /* network or parse */
     }
    }
   }
   if (st.state === 'staged') {
    io.log(statusStrip([paint('STATE', escRgb(...CAPTAIN.good), io.colorOn), paint(st.state, escRgb(...CAPTAIN.cream), io.colorOn), paint('STAGED', escRgb(...CAPTAIN.good), io.colorOn)], io.colorOn, gw));
    return {st, collectBlocked: null};
   }
   if (st.state === 'submitted' || st.state === 'submission_attempted') {
    try {
     const col = await ops.collect({workspaceId, taskId});
     io.log(statusStrip([paint('COLLECT', escRgb(...CAPTAIN.good), io.colorOn), paint(col.state, escRgb(...CAPTAIN.cream), io.colorOn)], io.colorOn, gw));
     if (col.state === 'staged') return {st: col, collectBlocked: null};
    } catch (e) {
     const code = e?.code ?? e?.message ?? 'pending';
     if (i % 6 === 0 || code === 'workspace_changed')
      io.log(
       statusStrip([paint('COLLECT', escRgb(...CAPTAIN.warn), io.colorOn), paint(String(code), escRgb(...CAPTAIN.cream), io.colorOn)], io.colorOn, gw)
      );
     if (code === 'workspace_changed') {
      for (const line of panelBox(
       'workspace_changed',
       [
        'The relay can show completed while this task is still submitted: collect verifies the saved answer against file snapshots from prepare.',
        'If any tracked file changed after prepare (Cursor applied an edit, or you saved in another editor), hashes no longer match and collect stops with workspace_changed.',
        'Options: restore those files to match prepare-time content, then run collect again from a Picard-capable client; or cancel this task and start over.',
        'This TUI can cancel the local task (recover) so you can run a new mission; it does not delete the relay job.',
       ],
       io.colorOn,
       gw
      ))
       io.log(line);
      return {st: ops.status({workspaceId, taskId}), collectBlocked: 'workspace_changed'};
     }
    }
    await sleep(400);
    continue;
   }
   if (st.state === 'preparing' || st.state === 'prepared') {
    if (i % 10 === 0)
     io.log(
      statusStrip([paint('AWAIT SUBMIT', escRgb(...CAPTAIN.warn), io.colorOn), paint(st.state, escRgb(...CAPTAIN.cream), io.colorOn)], io.colorOn, gw)
     );
    await sleep(400);
    continue;
   }
   io.log(statusStrip([paint('STATE', escRgb(...CAPTAIN.warn), io.colorOn), paint(st.state, escRgb(...CAPTAIN.cream), io.colorOn)], io.colorOn, gw));
   return {st, collectBlocked: null};
  }
  return {st: ops.status({workspaceId, taskId}), collectBlocked: null};
 } finally {
  io.setSpinner?.(false);
  if (stopCancel) stopCancel();
 }
}

function whichGit() {
 const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['git'], {encoding: 'utf8'});
 if (r.status !== 0) return null;
 return r.stdout.trim().split(/\r?\n/)[0] || null;
}

function taskStateDir(registryPath, codingConfigPath, workspaceId) {
 const cfg = loadCodingConfig(codingConfigPath);
 const scriptDir = path.dirname(fileURLToPath(import.meta.url));
 const connectorRoot = path.resolve(scriptDir, '..');
 const excluded = [connectorRoot, path.resolve(cfg.configFile), path.resolve(registryPath)];
 const r = loadRegistry(registryPath, {excluded});
 const w = r.workspaces.find(x => x.id === workspaceId);
 if (!w) throw new Error('workspace_not_enrolled');
 return path.join(r.stateDir, workspaceId);
}

function tailTextFile(filePath, maxBytes) {
 try {
  if (!existsSync(filePath)) return null;
  const buf = readFileSync(filePath);
  const n = Math.min(buf.length, typeof maxBytes === 'number' ? maxBytes : 2048);
  return buf
   .subarray(buf.length - n)
   .toString('utf8')
   .replace(/\r\n/g, '\n')
   .trimEnd();
 } catch {
  return null;
 }
}

async function waitDuringApply(io, ops, workspaceId, taskId, registryPath, codingConfigPath, applyPromise) {
 let cancelled = false;
 let stopCancel = null;
 stopCancel = io.installPollCancel(reason => {
  cancelled = true;
  if (reason === 'sigint') {
   io.log('');
   io.log(paint('Interrupted (Ctrl+C). Apply may still run in the background.', escRgb(...CAPTAIN.warn), io.colorOn));
   stopCancel?.();
   process.exitCode = 130;
   process.exit(130);
  }
 });
 const gw = io.gridW();
 let lastKey = '';
 let lastLogTail = null;
 io.setSpinner?.(true, 'apply');
 try {
  io.log(
   paint(
    'Apply runs enrolled tests (often minutes). Watch TEST lines and log tail; Esc hides progress only (apply continues).',
    escRgb(...CAPTAIN.gold),
    io.colorOn
   )
  );
  const dir = taskStateDir(registryPath, codingConfigPath, workspaceId);
  let applyDone = false;
  applyPromise.then(
   () => {
    applyDone = true;
   },
   () => {
    applyDone = true;
   }
  );
  while (!cancelled && !applyDone) {
   const step = await Promise.race([sleep(500).then(() => 'tick'), applyPromise.then(() => 'done', () => 'done')]);
   if (step === 'done') break;
   let st;
   try {
    st = ops.status({workspaceId, taskId});
   } catch {
    continue;
   }
   if (!['baseline_testing', 'applying', 'testing'].includes(st.state) && !st.testInvocation) continue;
   const inv = st.testInvocation;
   const key = inv?.phase && inv?.id ? inv.phase + '|' + inv.id + (inv.pid ? '|pid:' + inv.pid : '') : st.state;
   if (key !== lastKey) {
    lastKey = key;
    if (inv?.phase && inv?.id) {
     io.log(
      statusStrip(
       [
        paint('TEST', escRgb(...CAPTAIN.warn), io.colorOn),
        paint(inv.phase, escRgb(...CAPTAIN.cream), io.colorOn),
        paint(inv.id + (inv.pid ? ' pid=' + inv.pid : ''), escRgb(...CAPTAIN.muted), io.colorOn),
       ],
       io.colorOn,
       gw
      )
     );
    } else io.log(statusStrip([paint('APPLY', escRgb(...CAPTAIN.warn), io.colorOn), paint(st.state, escRgb(...CAPTAIN.cream), io.colorOn)], io.colorOn, gw));
   }
   if (inv?.phase && inv?.id) {
    const logPath = path.join(dir, taskId + '-' + inv.phase + '-' + inv.id + '.log');
    const tail = tailTextFile(logPath, 3072);
    if (tail && tail !== lastLogTail) {
     lastLogTail = tail;
     const lines = tail.split('\n').slice(-6);
     for (const ln of lines) io.log(paint('  | ' + ln, escRgb(...CAPTAIN.muted), io.colorOn));
    }
   }
  }
  if (cancelled) io.log(paint('Stopped apply progress view (apply may still be running).', escRgb(...CAPTAIN.warn), io.colorOn));
 } finally {
  io.setSpinner?.(false);
  if (stopCancel) stopCancel();
 }
}

/**
 * @param {MissionIO} io
 */
/**
 * @param {object} p
 * @param {{ title?: string, missionText?: string }} [p.prefillMission]
 */
export async function runMissionFlow({
 io,
 workspaceId,
 workspaceRoot,
 workspaceTests,
 codingConfig,
 registryPath,
 agent,
 nodeExe,
 prefillMission,
}) {
 const w = io.gridW();
 io.setMissionStep?.(3, 'running');
 io.log(stepLabel(3, 'Mission orders', io.colorOn));
 let title;
 let missionText;
 const preT = prefillMission && String(prefillMission.title ?? '').trim();
 const preM = prefillMission && String(prefillMission.missionText ?? '').trim();
 if (preT && preM) {
  title = preT;
  missionText = preM;
 } else {
  title = await io.question(promptPaintIo(io, 'cmd') + 'Mission title: ');
  if (title === null) {
   io.log(paint('Mission cancelled.', escRgb(...CAPTAIN.warn), io.colorOn));
   io.setMissionStep?.(3, 'error');
   return;
  }
  missionText = await io.question(promptPaintIo(io, 'cmd') + 'Mission request (one line or paste): ');
  if (missionText === null) {
   io.log(paint('Mission cancelled.', escRgb(...CAPTAIN.warn), io.colorOn));
   io.setMissionStep?.(3, 'error');
   return;
  }
 }
 io.setMissionStep?.(3, 'done');
 const prompt = buildMissionPrompt({
  workspaceId,
  title: (title || '').trim() || 'Mission',
  missionText: (missionText || '').trim() || '',
 });
 for (const line of missionBriefLines({workspaceId, workspaceRoot, title: (title || '').trim() || 'Mission', tests: workspaceTests}, io.colorOn, w)) io.log(line);

 io.setMissionStep?.(4, 'running');
 io.log(stepLabel(4, 'Engage agent', io.colorOn));
 io.log(
  statusStrip(
   [
    paint('CONNECTOR', escRgb(...CAPTAIN.elbow), io.colorOn),
    paint(codingConfig, escRgb(...CAPTAIN.cream), io.colorOn),
    paint('REGISTRY', escRgb(...CAPTAIN.elbow), io.colorOn),
    paint(registryPath, escRgb(...CAPTAIN.cream), io.colorOn),
   ],
   io.colorOn,
   w
  )
 );
 io.log(paint(agent.executable + '  [' + agent.kind + ']', escRgb(...CAPTAIN.muted), io.colorOn));
 io.log(
  paint(
   'Starting agent run: enable/login lines appear when each step finishes; during agent -p you get a heartbeat every few seconds until output arrives.',
   escRgb(...CAPTAIN.gold),
   io.colorOn
  )
 );
 io.setSpinner?.(true, 'agent');
 const res = await runAgent({
  kind: agent.kind,
  executable: agent.executable,
  workspaceRoot,
  workspaceId,
  nodeExe,
  codingConfigPath: codingConfig,
  workspacesPath: registryPath,
  missionPrompt: prompt,
  onLog: s => {
   for (const line of s.split(/\r?\n/)) {
    if (line) io.log(paint(line, escRgb(...CAPTAIN.muted), io.colorOn));
   }
  },
 });
 io.setSpinner?.(false);
 if (res.stdout && res.stdout.trim()) for (const line of logBlockLines('Agent stdout', res.stdout, io.colorOn, w, 16)) io.log(line);
 if (res.stderr && res.stderr.trim()) for (const line of logBlockLines('Agent stderr', res.stderr, io.colorOn, w, 20)) io.log(line);
 if (res.stderr && res.stderr.trim()) io.log(paint('(stderr echoed above)', escRgb(...CAPTAIN.warn), io.colorOn));
 if (agent.kind === 'cursor') {
  const hints = cursorAuthHint(res.stderr || '');
  if (hints) for (const line of panelBox('Cursor CLI', hints, io.colorOn, w)) io.log(line);
 }
 const noRelayTask = agentOutputImpliesNoRelayTask(res.stdout || '');
 if (noRelayTask)
  for (const line of panelBox(
   'No relay task',
   [
    'Agent output indicates prepare/submit did not run (missing MCP, tool rejected, or agent stopped early).',
    'Skipping long wait for activeTaskId. Default print uses --approve-mcps and --auto-review; if tools are still rejected, try PICARD_TUI_CURSOR_YOLO=1 (or run agent -p manually).',
    'In the workspace: agent mcp list-tools picard-coding',
   ],
   io.colorOn,
   w
  ))
   io.log(line);
 if (res.status === 0 && !noRelayTask)
  io.log(statusStrip([paint('AGENT', escRgb(...CAPTAIN.good), io.colorOn), paint('exit 0', escRgb(...CAPTAIN.cream), io.colorOn), paint('awaiting task lock', escRgb(...CAPTAIN.good), io.colorOn)], io.colorOn, w));
 else if (res.status === 0 && noRelayTask)
  io.log(
   statusStrip(
    [paint('AGENT', escRgb(...CAPTAIN.warn), io.colorOn), paint('exit 0', escRgb(...CAPTAIN.cream), io.colorOn), paint('no prepare/submit; skipped connector wait', escRgb(...CAPTAIN.warn), io.colorOn)],
    io.colorOn,
    w
   )
  );
 else
  io.log(
   statusStrip(
    [paint('AGENT', escRgb(...CAPTAIN.warn), io.colorOn), paint('exit ' + res.status, escRgb(...CAPTAIN.cream), io.colorOn), paint('fix CLI; no relay until prepare/submit', escRgb(...CAPTAIN.warn), io.colorOn)],
    io.colorOn,
    w
   )
  );

 io.setMissionStep?.(4, res.status === 0 ? 'done' : 'error');

 const ops = createTuiWorkspaceAgent(codingConfig, registryPath);
 let taskId;
 io.log(ruleElbow(io.colorOn, w));
 io.setMissionStep?.(5, 'running');
 io.log(stepLabel(5, 'Connector handshake', io.colorOn));
 if (res.status === 0 && !noRelayTask) taskId = await waitForActiveTask(io, ops, workspaceId);
 else if (res.status === 0 && noRelayTask) {
  io.log(paint('Connector wait skipped (no task expected from agent output).', escRgb(...CAPTAIN.warn), io.colorOn));
  taskId = null;
 } else {
  io.log(paint('Short poll (10s) if a task already exists...', escRgb(...CAPTAIN.warn), io.colorOn));
  taskId = await waitForActiveTask(io, ops, workspaceId, 40);
  if (!taskId) io.log(paint('No task detected. See agent stderr above.', escRgb(...CAPTAIN.warn), io.colorOn));
 }
 if (!taskId) {
  const manual = await io.question(promptPaintIo(io, 'warn') + 'Task UUID (blank to exit): ');
  if (manual === null) {
   io.log(paint('Cancelled.', escRgb(...CAPTAIN.warn), io.colorOn));
   io.setMissionStep?.(5, 'error');
   return;
  }
  taskId = (manual || '').trim() || null;
 }
 if (!taskId) {
  io.setMissionStep?.(5, 'error');
  return;
 }

 const settle = await settleAfterAgent(io, ops, workspaceId, taskId, codingConfig, registryPath);
 const stAfter = settle.st;
 if (stAfter.state !== 'staged') {
  io.log(paint('Not staged; cannot apply (state ' + stAfter.state + ').', escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(5, 'error');
  if (settle.collectBlocked === 'workspace_changed') {
   const rec = await io.question(
    promptPaintIo(io, 'warn') + 'Cancel this local task (picard_workspace_recover) so you can run a fresh mission? [y/N]: '
   );
   if (rec === null) {
    io.log(paint('Cancelled.', escRgb(...CAPTAIN.warn), io.colorOn));
    return;
   }
   if (/^y(es)?$/i.test((rec || '').trim())) {
    try {
     const rv = ops.recover({workspaceId, taskId});
     io.log(statusStrip([paint('RECOVER', escRgb(...CAPTAIN.warn), io.colorOn), paint(rv.state, escRgb(...CAPTAIN.cream), io.colorOn)], io.colorOn, w));
    } catch (e) {
     io.log(paint('Recover error: ' + (e?.code || e.message), escRgb(...CAPTAIN.warn), io.colorOn));
    }
   }
  }
  return;
 }
 io.setMissionStep?.(5, 'done');

 io.setMissionStep?.(6, 'running');
 io.log(stepLabel(6, 'Local apply', io.colorOn));
 const y = await io.question(promptPaintIo(io, 'warn') + 'Apply enrolled tests and write files? [y/N]: ');
 if (y === null) {
  io.log(paint('Cancelled.', escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(6, 'error');
  return;
 }
 if (!/^y(es)?$/i.test((y || '').trim())) {
  io.log(paint('Skipped apply.', escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(6, 'error');
  return;
 }

 const applyPromise = ops.apply({workspaceId, taskId});
 await waitDuringApply(io, ops, workspaceId, taskId, registryPath, codingConfig, applyPromise);
 let applied;
 try {
  applied = await applyPromise;
 } catch (e) {
  io.log(paint('Apply error: ' + (e?.code || e.message), escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(6, 'error');
  return;
 }
 const okState = ['passed'].includes(applied.state);
 io.log(
  statusStrip(
   [paint('APPLY', escRgb(...(okState ? CAPTAIN.good : CAPTAIN.warn)), io.colorOn), paint(applied.state, escRgb(...CAPTAIN.cream), io.colorOn)],
   io.colorOn,
   w
  )
 );
 io.setMissionStep?.(6, okState ? 'done' : 'error');

 io.setMissionStep?.(7, 'running');
 const git = whichGit();
 if (git) {
  const d = spawnSync(git, ['-C', workspaceRoot, 'diff', '--no-color'], {encoding: 'utf8'});
  io.log(stepLabel(7, 'Working tree diff', io.colorOn));
  for (const line of logBlockLines('git diff', d.stdout || '(empty)', io.colorOn, w, 48)) io.log(line);
 }
 io.setMissionStep?.(7, 'done');

 io.setMissionStep?.(8, 'running');
 const ref = readRelayEventIdFromJournal(registryPath, codingConfig, workspaceId, taskId);
 const reviewPath = process.env.PICARD_REVIEW_CONFIG || defaultReviewClientPath();
 if (!existsSync(reviewPath)) {
  io.log(paint('No review config at ' + reviewPath + ' (optional).', escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(8, 'error');
  return;
 }
 if (!ref) {
  io.log(paint('No relay event id in journal; cannot POST review.', escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(8, 'error');
  return;
 }

 let revCfg;
 try {
  revCfg = loadReviewConfig(reviewPath);
 } catch {
  io.log(paint('Invalid review config.', escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(8, 'error');
  return;
 }

 const get = await relayGet({origin: revCfg.origin, token: revCfg.token, path: '/workspace/requests/' + ref});
 if (get.status !== 200 || !get.body?.result?.sha256) {
  io.log(paint('Review token could not read completed result (status ' + get.status + ').', escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(8, 'error');
  return;
 }

 io.log(stepLabel(8, 'Captain review', io.colorOn));
 const note = await io.question(promptPaintIo(io, 'cmd') + 'Review note (max 2000 chars): ');
 if (note === null) {
  io.log(paint('Review cancelled.', escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(8, 'error');
  return;
 }
 const dec = await io.question(promptPaintIo(io, 'cmd') + 'Decision (accepted | changes_requested): ');
 if (dec === null) {
  io.log(paint('Review cancelled.', escRgb(...CAPTAIN.warn), io.colorOn));
  io.setMissionStep?.(8, 'error');
  return;
 }
 const decision = (dec || '').trim().toLowerCase() === 'changes_requested' ? 'changes_requested' : 'accepted';
 const body = buildReviewBody({
  expectedRevision: get.body.review?.revision ?? 0,
  decision,
  note: (note || '').trim(),
  resultSha256: get.body.result.sha256,
  testCommandIds: workspaceTests.map(t => t.id),
 });
 try {
  const posted = await relayPost({origin: revCfg.origin, token: revCfg.token, path: '/workspace/reviews/' + ref, json: body});
  if (posted.status !== 200) io.log(paint('Review POST failed: ' + JSON.stringify(posted.body), escRgb(...CAPTAIN.warn), io.colorOn));
  else io.log(paint('Review recorded.', escRgb(...CAPTAIN.good), io.colorOn));
 } catch (e) {
  io.log(paint('Review POST error: ' + e.message, escRgb(...CAPTAIN.warn), io.colorOn));
 }
 io.setMissionStep?.(8, 'done');
}
