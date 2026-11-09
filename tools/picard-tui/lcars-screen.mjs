/**
 * Terminal driver: alternate screen, truecolor/16-color render diff, raw keys.
 */

import {useTruecolor} from './lcars-k9s-theme.mjs';

const ALT_ON = '\x1b[?1049h\x1b[?25l\x1b[?7l';
const ALT_OFF = '\x1b[?7h\x1b[?1049l\x1b[?25h';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';
const CLEAR = '\x1b[H\x1b[2J';

/**
 * @param {[number,number,number]} rgb
 */
function rgbFg(rgb) {
  return `38;2;${rgb[0]};${rgb[1]};${rgb[2]}`;
}

/**
 * @param {[number,number,number]} rgb
 */
function rgbBg(rgb) {
  return `48;2;${rgb[0]};${rgb[1]};${rgb[2]}`;
}

/**
 * @param {import('./lcars-frame.mjs').CellBuffer} buf
 * @param {boolean} truecolor
 */
export function bufferToLines(buf, truecolor = useTruecolor()) {
  const out = [];
  for (let y = 0; y < buf.rows; y++) {
    let line = '';
    let lastFg = '';
    let lastBg = '';
    for (let x = 0; x < buf.cols; x++) {
      const c = buf.cells[buf.idx(x, y)];
      let fgSeq = '';
      let bgSeq = '';
      if (truecolor) {
        if (c.fg) fgSeq = rgbFg(c.fg);
        if (c.bg) bgSeq = rgbBg(c.bg);
      } else {
        if (c.fg) fgSeq = `38;5;${ansi256Approx(c.fg)}`;
        if (c.bg) bgSeq = `48;5;${ansi256Approx(c.bg)}`;
      }
      const needFg = fgSeq !== lastFg;
      const needBg = bgSeq !== lastBg;
      if (needFg || needBg) {
        const parts = [];
        if (needFg) parts.push(fgSeq || '39');
        if (needBg) parts.push(bgSeq || '49');
        line += `\x1b[${parts.join(';')}m`;
        lastFg = fgSeq;
        lastBg = bgSeq;
      }
      line += c.ch;
    }
    line += '\x1b[0m';
    out.push(line);
  }
  return out;
}

function ansi256Approx([r, g, b]) {
  const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  if (r === g && g === b) return 232 + Math.min(23, Math.floor(gray / 11));
  return (
    16 +
    36 * Math.min(5, Math.round(r / 51)) +
    6 * Math.min(5, Math.round(g / 51)) +
    Math.min(5, Math.round(b / 51))
  );
}

/**
 * @typedef {{name:string,ctrl?:boolean,shift?:boolean,meta?:boolean,sequence?:string}} ParsedKey
 */

/**
 * @param {string} data
 * @returns {ParsedKey[]}
 */
export function parseKeyData(data) {
  const keys = [];
  let i = 0;
  const s = String(data);
  while (i < s.length) {
    const code = s.charCodeAt(i);
    if (code === 27 && i + 1 < s.length && s[i + 1] === '[') {
      let j = i + 2;
      while (j < s.length && s.charCodeAt(j) >= 0x30 && s.charCodeAt(j) <= 0x3f) j++;
      while (j < s.length && s.charCodeAt(j) >= 0x20 && s.charCodeAt(j) <= 0x7e) j++;
      const seq = s.slice(i, j);
      const inner = seq.slice(2, -1);
      const finalCh = seq.slice(-1);
      if (finalCh === 'A') keys.push({name: 'up', sequence: seq});
      else if (finalCh === 'B') keys.push({name: 'down', sequence: seq});
      else if (finalCh === 'C') keys.push({name: 'right', sequence: seq});
      else if (finalCh === 'D') keys.push({name: 'left', sequence: seq});
      else if (inner === '15' && finalCh === '~') keys.push({name: 'f5', sequence: seq});
      else if (inner === 'Z') keys.push({name: 'backtab', shift: true, sequence: seq});
      else keys.push({name: 'unknown', sequence: seq});
      i = j;
      continue;
    }
    if (code === 27) {
      keys.push({name: 'escape'});
      i++;
      continue;
    }
    if (code === 8 || code === 127) {
      keys.push({name: 'backspace'});
      i++;
      continue;
    }
    if (code < 32) {
      if (code === 9) keys.push({name: 'tab'});
      else if (code === 13) keys.push({name: 'enter'});
      else if (code === 3) keys.push({name: 'c', ctrl: true});
      else if (code === 7) keys.push({name: 'g', ctrl: true});
      else keys.push({name: 'unknown', sequence: String.fromCharCode(code)});
      i++;
      continue;
    }
    const ch = s[i];
    keys.push({name: ch.length === 1 ? ch : 'unknown', sequence: ch});
    i++;
  }
  return keys;
}

export class LcarsScreen {
  constructor() {
    this.truecolor = useTruecolor();
    /** @type {string[]|null} */
    this._prevLines = null;
    this._prevCols = 0;
    this._prevRows = 0;
    this._raw = false;
  }

  columns() {
    return process.stdout.columns || 80;
  }

  rows() {
    return process.stdout.rows || 24;
  }

  enter() {
    if (!process.stdout.isTTY) return;
    process.stdout.write(ALT_ON + HIDE_CURSOR);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      this._raw = true;
    }
  }

  leave() {
    if (!process.stdout.isTTY) return;
    if (this._raw && process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      this._raw = false;
    }
    process.stdout.write(ALT_OFF);
  }

  /**
   * @param {import('./lcars-frame.mjs').CellBuffer} buf
   */
  draw(buf) {
    const lines = bufferToLines(buf, this.truecolor);
    this._prevCols = buf.cols;
    this._prevRows = buf.rows;
    let frame = CLEAR;
    for (const ln of lines) frame += ln + '\x1b[K\n';
    const termRows = this.rows();
    for (let y = lines.length; y < termRows; y++) {
      frame += `\x1b[${y + 1};1H\x1b[K\n`;
    }
    process.stdout.write(frame);
    this._prevLines = lines;
  }

  /**
   * @param {(keys: ParsedKey[]) => void} onKeys
   */
  attachKeys(onKeys) {
    if (!process.stdin.isTTY) return () => {};
    const handler = chunk => {
      const keys = parseKeyData(chunk.toString('utf8'));
      if (keys.length) onKeys(keys);
    };
    process.stdin.on('data', handler);
    return () => process.stdin.off('data', handler);
  }
}
