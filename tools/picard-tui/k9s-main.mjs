#!/usr/bin/env node
/**
 * Picard Relay LCARS terminal frame TUI (default when stdout is a TTY).
 */
import {readFileSync, existsSync} from 'node:fs';
import {defaultCodingConfigPath, defaultWorkspacesPath} from './paths.mjs';
import {detectAgents, codexUnsupportedMessage} from './agents.mjs';
import {CAPTAIN, panelBox, paint, escRgb, termColumns, useLcarsColor} from './lcars-ui.mjs';
import {K9sShell} from './k9s-shell.mjs';

function println(line = '') {
 console.log(line);
}

export async function main() {
 const colorOn = useLcarsColor();
 const w = termColumns();
 const codingConfig = process.env.PICARD_CODING_CONFIG || defaultCodingConfigPath();
 const registryPath = process.env.PICARD_WORKSPACES_FILE || defaultWorkspacesPath();

 if (!existsSync(codingConfig)) {
  for (const line of panelBox('Configuration', ['Missing ' + codingConfig], colorOn, w)) println(line);
  process.exitCode = 2;
  return;
 }
 if (!existsSync(registryPath)) {
  for (const line of panelBox('Configuration', ['Missing registry ' + registryPath], colorOn, w)) println(line);
  process.exitCode = 2;
  return;
 }

 const doc = JSON.parse(readFileSync(registryPath, 'utf8'));
 const workspaces = doc.workspaces || [];
 const agents = detectAgents();
 if (!agents.length) {
  const why = codexUnsupportedMessage();
  if (why) for (const line of panelBox('Codex', [why], colorOn, w)) println(line);
  println(paint('No agent on PATH. Install agent, codex, or claude.', escRgb(...CAPTAIN.warn), colorOn));
  process.exitCode = 2;
  return;
 }

 const shell = new K9sShell({codingConfig, registryPath, agents, workspaces, colorOn});
 await shell.run();
}
