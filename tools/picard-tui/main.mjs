#!/usr/bin/env node
/**
 * Picard LCARS companion entry: LCARS frame TUI by default; legacy line printer when
 * stdout is not a TTY, NO_COLOR with dumb term, PICARD_TUI_LEGACY=1, or --legacy.
 */
import {runLegacyMain} from './legacy-cli.mjs';

function wantLegacy() {
 if (process.env.PICARD_TUI_LEGACY === '1') return true;
 if (process.argv.includes('--legacy')) return true;
 if (!process.stdout || process.stdout.isTTY !== true) return true;
 if (process.env.TERM === 'dumb') return true;
 if (process.env.NO_COLOR !== undefined && process.env.PICARD_TUI_FORCE_K9S !== '1') return true;
 return false;
}

async function main() {
 if (wantLegacy()) {
  await runLegacyMain();
  return;
 }
 const {main: k9sMain} = await import('./k9s-main.mjs');
 await k9sMain();
}

main().catch(e => {
 console.error(e);
 process.exitCode = 1;
});
