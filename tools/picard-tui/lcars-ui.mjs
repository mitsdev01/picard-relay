/**
 * LCARS-inspired terminal layout for Picard TUI. Palette matches Captain console CSS
 * (tools/console-theme/captain.mjs): charcoal deck, maroon rail, elbow orange, cream/gold text.
 * No npm deps; works in Windows Terminal truecolor; degrades to plain ASCII when NO_COLOR.
 */

/** RGB tuples — same hues as .captain in captain.mjs */
export const CAPTAIN = {
  bg: [9, 8, 12],
  side: [32, 17, 29],
  rail: [112, 32, 57],
  line: [100, 49, 63],
  elbow: [223, 131, 50],
  cream: [250, 242, 222],
  gold: [239, 209, 141],
  good: [155, 241, 191],
  warn: [255, 190, 121],
  muted: [200, 184, 180]
};

const RESET = '\x1b[0m';

export function termColumns(){
 const n = process.stdout.columns;
 return typeof n === 'number' && n > 20 ? n : 80;
}

/** TTY + Windows Terminal session + not NO_COLOR */
export function useLcarsColor(){
 return (
  process.stdout.isTTY === true &&
  process.env.NO_COLOR === undefined &&
  process.env.WT_SESSION !== undefined
 );
}

export function escRgb(r, g, b){
 return '38;2;' + r + ';' + g + ';' + b;
}

export function paint(line, seq, colorOn){
 if (!colorOn || !seq) return line;
 return '\x1b[' + seq + 'm' + line + RESET;
}

function repeat(ch, n){
 if (n <= 0) return '';
 return ch.repeat(n);
}

/** Visible length: strip ANSI; treat wide chars as 1 for simplicity (good enough for TUI). */
export function stripAnsi(s){
 return typeof s === 'string' ? s.replace(/\x1b\[[0-9;]*m/g, '') : '';
}

export function visibleLen(s){
 return stripAnsi(String(s ?? '')).length;
}

export function truncateTail(s, max){
 const plain = stripAnsi(String(s ?? ''));
 if (plain.length <= max) return s;
 if (max <= 3) return plain.slice(0, max);
 return plain.slice(0, max - 3) + '...';
}

/**
 * Full-width horizontal rule: maroon, centered label (ASCII).
 */
export function ruleTop(label, colorOn, w){
 const text = (' ' + (label || 'LCARS').toUpperCase() + ' ').trim();
 const lw = visibleLen(text);
 const total = Math.max(8, w);
 if (lw + 4 >= total) return paint(truncateTail(text, total), escRgb(...CAPTAIN.rail), colorOn);
 const dash = total - lw;
 const left = Math.floor(dash / 2);
 const right = dash - left;
 return paint(repeat('=', left) + text + repeat('=', right), escRgb(...CAPTAIN.rail), colorOn);
}

export function ruleMid(colorOn, w){
 const s = repeat('~', w);
 return paint(s, escRgb(...CAPTAIN.line), colorOn);
}

export function ruleElbow(colorOn, w){
 const left = repeat('>', 3);
 const right = repeat('<', 3);
 const mid = repeat('-', Math.max(0, w - left.length - right.length));
 const line = left + mid + right;
 return paint(line, escRgb(...CAPTAIN.elbow), colorOn);
}

/**
 * Bordered block: top elbow line, body rows (each prefixed), bottom rail line.
 */
export function panelBox(title, rows, colorOn, w){
 const out = [];
 out.push(ruleElbow(colorOn, w));
 const head = '  ' + (title || 'PANEL').toUpperCase();
 out.push(paint(head, escRgb(...CAPTAIN.gold), colorOn));
 for (const row of rows){
  const t = typeof row === 'string' ? row : String(row);
  out.push(panelRow(t, colorOn, w));
 }
 out.push(paint(repeat('_', w), escRgb(...CAPTAIN.rail), colorOn));
 return out;
}

function panelRow(text, colorOn, w){
 const prefix = paint('| ', escRgb(...CAPTAIN.rail), colorOn);
 const suffix = paint(' |', escRgb(...CAPTAIN.rail), colorOn);
 const innerW = Math.max(4, w - visibleLen(prefix) - visibleLen(suffix));
 const bodyPlain = stripAnsi(String(text));
 const bodyShow = bodyPlain.length > innerW ? bodyPlain.slice(0, innerW - 3) + '...' : bodyPlain;
 const pad = innerW - bodyShow.length;
 const bodyCol = paint(bodyShow, escRgb(...CAPTAIN.cream), colorOn);
 return prefix + bodyCol + repeat(' ', Math.max(0, pad)) + suffix;
}

/** Numbered LCARS step label (01, 02, …). */
export function stepLabel(n, title, colorOn){
 const num = String(n).padStart(2, '0');
 return paint(num, escRgb(...CAPTAIN.elbow), colorOn) + paint('  ', '', colorOn) + paint((title || '').toUpperCase(), escRgb(...CAPTAIN.gold), colorOn);
}

export function statusStrip(parts, colorOn, w){
 const sep = paint('  *  ', escRgb(...CAPTAIN.line), colorOn);
 let line = '';
 for (let i = 0; i < parts.length; i++){
  const p = parts[i];
  const piece = typeof p === 'string' ? paint(p, escRgb(...CAPTAIN.cream), colorOn) : p;
  line += (i ? sep : '') + piece;
 }
 if (visibleLen(line) > w) return truncateTail(line, w);
 return line;
}

export function bannerLines(version, colorOn, w){
 const lines = [];
 lines.push('');
 lines.push(ruleTop('PICARD RELAY  LCARS', colorOn, w));
 lines.push(
  paint('   ###', escRgb(...CAPTAIN.gold), colorOn) +
   '     ' +
   paint('COMMAND INTERFACE', escRgb(...CAPTAIN.cream), colorOn)
 );
 lines.push(
  paint('  ## ##', escRgb(...CAPTAIN.gold), colorOn) +
   '   ' +
   paint('Trusted workspace coding mission', escRgb(...CAPTAIN.muted), colorOn)
 );
 lines.push(
  paint(' ##   ##', escRgb(...CAPTAIN.gold), colorOn) +
   '  ' +
   paint('v' + version, escRgb(...CAPTAIN.gold), colorOn)
 );
 lines.push(paint(repeat(' ', 4) + 'MAKE IT SO.', escRgb(...CAPTAIN.elbow), colorOn));
 lines.push(ruleMid(colorOn, w));
 lines.push(
  paint(
   ' Esc  cancel prompt or stop poll wait  |  Ctrl+C during poll exits the TUI  |  does not cancel submitted relay jobs ',
   escRgb(...CAPTAIN.warn),
   colorOn
  )
 );
 lines.push('');
 return lines;
}

export function agentTableLines(agents, colorOn, w){
 const rows = agents.map((a, i) => {
  const idx = paint(String(i + 1), escRgb(...CAPTAIN.elbow), colorOn);
  const k = paint((a.kind || '').toUpperCase().padEnd(8, ' '), escRgb(...CAPTAIN.good), colorOn);
  const ex = truncateTail(a.executable || '', Math.max(12, w - 28));
  return '  ' + idx + '  ' + k + '  ' + paint(ex, escRgb(...CAPTAIN.cream), colorOn);
 });
 return panelBox('Select agent', rows, colorOn, w);
}

export function workspaceTableLines(list, colorOn, w){
 const rows = list.map((x, i) => {
  const idx = paint(String(i + 1), escRgb(...CAPTAIN.elbow), colorOn);
  const id = paint((x.id || '').padEnd(14, ' '), escRgb(...CAPTAIN.good), colorOn);
  const ap = paint('apply=' + String(x.allowApply), escRgb(...CAPTAIN.muted), colorOn);
  const root = truncateTail(x.root || '', Math.max(20, w - 42));
  return '  ' + idx + '  ' + id + '  ' + ap + '  ' + paint(root, escRgb(...CAPTAIN.cream), colorOn);
 });
 return panelBox('Enrolled workspaces', rows, colorOn, w);
}

export function missionBriefLines({ workspaceId, workspaceRoot, title, tests }, colorOn, w){
 const testStr = tests && tests.length ? tests.map(t => t.id || t).join(', ') : '(none)';
 const rows = [
  paint('WORKSPACE  ', escRgb(...CAPTAIN.muted), colorOn) + paint(workspaceId || '', escRgb(...CAPTAIN.cream), colorOn),
  paint('ROOT       ', escRgb(...CAPTAIN.muted), colorOn) + truncateTail(workspaceRoot || '', w - 14),
  paint('TITLE      ', escRgb(...CAPTAIN.muted), colorOn) + paint(title || '', escRgb(...CAPTAIN.cream), colorOn),
  paint('TEST SUITE ', escRgb(...CAPTAIN.muted), colorOn) + truncateTail(testStr, w - 14)
 ];
 return panelBox('Mission brief', rows, colorOn, w);
}

export function logBlockLines(label, text, colorOn, w, maxLines){
 const raw = (text || '').split(/\r?\n/).filter(Boolean);
 const cap = typeof maxLines === 'number' ? maxLines : 12;
 const slice = raw.slice(-cap);
 const rows =
  slice.length === 0
   ? [paint('(empty)', escRgb(...CAPTAIN.muted), colorOn)]
   : slice.map(l => truncateTail(l, w - 6));
 return panelBox(label || 'Log', rows, colorOn, w);
}
