#!/usr/bin/env node
/**
 * Legacy print-line / readline Picard LCARS companion (Node 24).
 * Set PICARD_TUI_LEGACY=1 or pass --legacy to main.mjs to force this UI.
 */
import readline from 'node:readline';
import readlinePromises from 'node:readline/promises';
import {existsSync} from 'node:fs';
import {PICARD_TUI_VERSION} from './version.mjs';
import {defaultCodingConfigPath, defaultWorkspacesPath} from './paths.mjs';
import {detectAgents, codexUnsupportedMessage} from './agents.mjs';
import {bannerLines, CAPTAIN, escRgb, panelBox, paint, termColumns, useLcarsColor} from './lcars-ui.mjs';
import {pickAgent, pickWorkspace, runMissionFlow} from './mission-orchestrator.mjs';

const colorOn = useLcarsColor();
const gridW = () => termColumns();

function println(line = '') {
 console.log(line);
}

function promptPaint(kind) {
 const seq = kind === 'warn' ? escRgb(...CAPTAIN.warn) : escRgb(...CAPTAIN.gold);
 return paint(kind === 'warn' ? 'INPUT ' : 'INPUT ', seq, colorOn) + paint('> ', escRgb(...CAPTAIN.cream), colorOn);
}

/**
 * @param {import('node:readline/promises').Interface} rl
 */
async function question(rl, prompt) {
 const ac = new AbortController();
 readline.emitKeypressEvents(process.stdin, rl);
 const onKeypress = (str, key) => {
  if (key?.name === 'escape') ac.abort();
 };
 process.stdin.on('keypress', onKeypress);
 try {
  return await rl.question(prompt, {signal: ac.signal});
 } catch (e) {
  if (e?.name === 'AbortError' || ac.signal.aborted) {
   console.log('');
   return null;
  }
  throw e;
 } finally {
  process.stdin.removeListener('keypress', onKeypress);
 }
}

/**
 * Cancel long polls: readline keypress + SIGINT (Windows/conhost).
 * @param {import('node:readline/promises').Interface} rl
 */
function installPollCancel(rl, onCancel) {
 if (!process.stdin || !process.stdin.isTTY) return () => {};
 readline.emitKeypressEvents(process.stdin, rl);
 const kp = (str, key) => {
  if (!key) return;
  if (key.name === 'escape') onCancel('escape');
  if (key.ctrl && key.name === 'c') onCancel('sigint');
 };
 const si = () => onCancel('sigint');
 process.stdin.on('keypress', kp);
 process.on('SIGINT', si);
 return () => {
  process.stdin.removeListener('keypress', kp);
  process.removeListener('SIGINT', si);
 };
}

export async function runLegacyMain() {
 const rl = readlinePromises.createInterface({input: process.stdin, output: process.stdout, terminal: true});
 const w = gridW();
 for (const line of bannerLines(PICARD_TUI_VERSION, colorOn, w)) println(line);
 if (!colorOn)
  println(paint('Plain mode: set WT_SESSION (Windows Terminal) and omit NO_COLOR for Captain palette.', escRgb(...CAPTAIN.warn), false));

 const nodeExe = process.execPath;
 const codingConfig = process.env.PICARD_CODING_CONFIG || defaultCodingConfigPath();
 const registryPath = process.env.PICARD_WORKSPACES_FILE || defaultWorkspacesPath();

 if (!existsSync(codingConfig)) {
  for (const line of panelBox('Configuration', ['Missing ' + codingConfig], colorOn, w)) println(line);
  process.exitCode = 2;
  rl.close();
  return;
 }
 if (!existsSync(registryPath)) {
  for (const line of panelBox('Configuration', ['Missing registry ' + registryPath], colorOn, w)) println(line);
  process.exitCode = 2;
  rl.close();
  return;
 }

 /** @type {import('./mission-orchestrator.mjs').MissionIO} */
 const io = {
  log: println,
  question: (promptText, _opts) => question(rl, promptText),
  installPollCancel: onCancel => installPollCancel(rl, onCancel),
  gridW,
  colorOn,
 };

 const agents = detectAgents();
 if (!agents.length) {
  const why = codexUnsupportedMessage();
  if (why) for (const line of panelBox('Codex', [why], colorOn, w)) println(line);
  process.exitCode = 2;
 }
 const agent = await pickAgent(io, agents);
 if (!agent) {
  rl.close();
  return;
 }

 const ws = await pickWorkspace(io, registryPath);
 if (!ws) {
  rl.close();
  return;
 }

 await runMissionFlow({
  io,
  workspaceId: ws.id,
  workspaceRoot: ws.root,
  workspaceTests: ws.testCommands ?? [],
  codingConfig,
  registryPath,
  agent,
  nodeExe,
 });

 rl.close();
}
