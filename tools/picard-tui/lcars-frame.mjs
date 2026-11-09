/**
 * LCARS terminal frame: cell buffer and paint from a plain view model (no blessed).
 */

/** Hex palette for truecolor and tests (Captain + LCARS accents) */
export const FRAME = Object.freeze({
  bg: [9, 8, 12],
  rail: [112, 32, 57],
  elbow: [223, 131, 50],
  cream: [250, 242, 222],
  gold: [239, 209, 141],
  good: [155, 241, 191],
  warn: [255, 190, 121],
  muted: [100, 49, 63],
  apricot: [255, 153, 102],
  neoOrange: [255, 102, 51],
  lilac: [204, 153, 204],
  sky: [153, 204, 255],
  dimRail: [70, 20, 35],
  side: [32, 17, 29],
  tan: [255, 204, 153],
});

/** Sidebar nav: idle uses dim rail + accent text; selected uses solid accent fill */
const NAV_ACCENTS = Object.freeze([
  {accent: FRAME.tan, fg: FRAME.bg},
  {accent: FRAME.sky, fg: FRAME.bg},
  {accent: FRAME.lilac, fg: FRAME.bg},
  {accent: FRAME.apricot, fg: FRAME.bg},
]);

/** Unicode box-drawing and line blocks we reject in LCARS frame output */
export const BOX_DRAWING_RE = /[\u2500-\u257F\u2580-\u259F]/;

export const MIN_FRAME_COLS = 72;
export const DEFAULT_COLS = 100;
export const DEFAULT_ROWS = 32;

/**
 * @typedef {'pending'|'running'|'done'|'error'} StepState
 */

/**
 * @typedef {object} LcarsViewModel
 * @property {number} cols
 * @property {number} rows
 * @property {string[]} views
 * @property {number} viewIndex
 * @property {string} telemetryLine1
 * @property {string} telemetryLine2
 * @property {string} [clockText]
 * @property {string} footerHints
 * @property {{id:number,label:string,state:StepState}[]} steps
 * @property {string[]} activityLines
 * @property {string} [overviewLeft]
 * @property {string} [overviewLower]
 * @property {string} [overviewSummary]
 * @property {string} connectorHint
 * @property {{kind:string,executable:string}[]} agents
 * @property {number} agentSelected
 * @property {{id:string,root:string}[]} workspaces
 * @property {number} workspaceSelected
 * @property {string} missionTitle
 * @property {string} missionBody
 * @property {'nav'|'agent'|'workspace'|'title'|'body'|'overview'|'steps'|'connector'|'ops'|'question'} focus
 * @property {string} [questionPrompt]
 * @property {string} [questionDraft]
 * @property {number} [titleCursor]
 * @property {number} [bodyCursor]
 * @property {boolean} [navActive]
 */

export class CellBuffer {
  /**
   * @param {number} cols
   * @param {number} rows
   */
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    /** @type {{ch:string,fg:[number,number,number]|null,bg:[number,number,number]|null}[]} */
    this.cells = new Array(cols * rows);
    this.clear();
  }

  clear() {
    const bg = FRAME.bg;
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = {ch: ' ', fg: null, bg: [...bg]};
    }
  }

  idx(x, y) {
    return y * this.cols + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  set(x, y, ch, fg = null, bg = null) {
    if (!this.inBounds(x, y)) return;
    const c = this.cells[this.idx(x, y)];
    c.ch = ch;
    if (fg) c.fg = [...fg];
    if (bg) c.bg = bg ? [...bg] : [...FRAME.bg];
  }

  bar(x, y, w, h, bg, fg = null, ch = ' ') {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(x + dx, y + dy, ch, fg, bg);
      }
    }
  }

  gap(x, y, h) {
    this.bar(x, y, 1, h, FRAME.bg);
  }

  cap(x, y, w) {
    this.bar(x, y, w, 1, FRAME.elbow);
  }

  pill(x, y, text, bg, fg) {
    const label = String(text ?? '').toUpperCase();
    const w = Math.max(2, label.length + 2);
    this.bar(x, y, w, 1, bg);
    for (let i = 0; i < label.length; i++) {
      this.set(x + 1 + i, y, label[i], fg, bg);
    }
    return x + w + 1;
  }

  label(x, y, text, fg, bg = FRAME.bg, maxW = 999) {
    const s = String(text ?? '');
    const n = Math.min(s.length, maxW);
    for (let i = 0; i < n; i++) {
      this.set(x + i, y, s[i], fg, bg);
    }
  }

  textBlock(x0, y0, w, h, text, fg, bg) {
    const lines = String(text ?? '').split(/\r?\n/);
    for (let row = 0; row < h; row++) {
      const ln = lines[row] ?? '';
      this.label(x0, y0 + row, ln.slice(0, w), fg, bg, w);
      if (ln.length < w) {
        for (let x = ln.length; x < w; x++) this.set(x0 + x, y0 + row, ' ', fg, bg);
      }
    }
  }
}

/** @param {StepState} st */
export function stepPillColors(st) {
  switch (st) {
    case 'running':
      return {bg: FRAME.gold, fg: FRAME.bg};
    case 'done':
      return {bg: FRAME.good, fg: FRAME.bg};
    case 'error':
      return {bg: FRAME.neoOrange, fg: FRAME.cream};
    default:
      return {bg: FRAME.dimRail, fg: FRAME.cream};
  }
}

export function railWidth(cols) {
  return Math.min(20, Math.max(14, Math.floor(cols * 0.17)));
}

/**
 * @param {LcarsViewModel} model
 * @returns {CellBuffer}
 */
export function paintLcarsShell(model) {
  const cols = model.cols;
  const rows = model.rows;
  const buf = new CellBuffer(cols, rows);
  const rw = railWidth(cols);
  const mainX = rw;
  const mainW = cols - rw;

  buf.bar(0, 0, rw, rows, FRAME.rail);

  buf.bar(mainX, 0, Math.max(0, mainW - 5), 1, FRAME.rail);
  if (mainW > 5) {
    buf.gap(mainX + mainW - 5, 0, 1);
    buf.cap(mainX + mainW - 4, 0, 4);
  }

  buf.label(mainX + 1, 1, model.telemetryLine1.slice(0, mainW - 2), FRAME.sky, FRAME.bg, mainW - 2);
  buf.label(mainX + 1, 2, model.telemetryLine2.slice(0, mainW - 2), FRAME.cream, FRAME.bg, mainW - 2);

  if (model.clockText && cols >= 80) {
    const ct = model.clockText.slice(0, 18);
    const px = cols - ct.length - 2;
    buf.pill(px, 1, ct, FRAME.elbow, FRAME.bg);
  }

  const navStartY = 4;
  const navActive = !!model.navActive;
  if (navActive) {
    buf.pill(0, 0, 'NAV', FRAME.elbow, FRAME.bg);
  }
  for (let i = 0; i < model.views.length; i++) {
    const y = navStartY + i * 2;
    const sel = i === model.viewIndex;
    const acc = NAV_ACCENTS[i % NAV_ACCENTS.length];
    let bg = sel ? acc.accent : FRAME.dimRail;
    let fg = sel ? acc.fg : acc.accent;
    if (navActive && sel) {
      bg = FRAME.cream;
      fg = FRAME.bg;
    }
    const num = String(i + 1);
    const numBg = navActive && sel ? FRAME.gold : FRAME.elbow;
    buf.pill(1, y, num, numBg, FRAME.bg);
    if (navActive && sel) {
      buf.bar(0, y, 1, 1, FRAME.elbow);
    }
    buf.pill(1 + num.length + 2, y, model.views[i], bg, fg);
  }

  const bot = rows - 2;
  buf.bar(mainX, bot, Math.max(0, mainW - 5), 1, FRAME.rail);
  if (mainW > 5) {
    buf.gap(mainX + mainW - 5, bot, 1);
    buf.cap(mainX + mainW - 4, bot, 4);
  }
  buf.label(mainX + 1, rows - 1, model.footerHints.slice(0, mainW - 2), FRAME.gold, FRAME.bg, mainW - 2);

  const contentY = 4;
  const contentH = rows - contentY - 3;
  const contentW = mainW - 2;
  const contentBottom = rows - 3;
  const midRow = contentY + Math.min(contentH - 5, Math.max(6, Math.floor(contentH * 0.4)));

  buf.bar(mainX, midRow, mainW, 1, FRAME.elbow);
  const viewTag = (model.views[model.viewIndex] || '').slice(0, 16);
  if (viewTag) {
    const acc = NAV_ACCENTS[model.viewIndex % NAV_ACCENTS.length];
    buf.pill(cols - viewTag.length - 3, midRow, viewTag, acc.accent, acc.fg);
  }

  paintMainContent(buf, model, mainX + 1, contentY, contentW, contentH, midRow, contentBottom);

  if (model.questionPrompt) {
    const qy = rows - 4;
    buf.bar(mainX, qy - 1, mainW, 3, FRAME.side);
    buf.label(mainX + 2, qy, model.questionPrompt.slice(0, contentW - 4), FRAME.gold, FRAME.side, contentW - 4);
    const draft = (model.questionDraft ?? '') + '_';
    buf.label(mainX + 2, qy + 1, draft.slice(0, contentW - 4), FRAME.cream, FRAME.side, contentW - 4);
  }

  return buf;
}

/**
 * @param {CellBuffer} buf
 * @param {LcarsViewModel} model
 */
function paintMainContent(buf, model, x, y, w, h, midRow, contentBottom) {
  const view = model.views[model.viewIndex] ?? 'OVERVIEW';
  const acc = NAV_ACCENTS[model.viewIndex % NAV_ACCENTS.length];

  if (view !== 'OVERVIEW') {
    let sx = x;
    const stepY = y;
    for (const st of model.steps) {
      const {bg, fg} = stepPillColors(st.state);
      const short = String(st.id).padStart(2, '0');
      if (sx + short.length + 4 > x + w) break;
      sx = buf.pill(sx, stepY, short, bg, fg);
    }
  }

  const bodyY = view === 'OVERVIEW' ? y : y + 2;
  const upperEnd = midRow - 1;
  const lowerY = midRow + 1;
  const lowerH = Math.max(1, contentBottom - lowerY);

  if (view === 'OPERATIONS') {
    buf.pill(x, bodyY - 1, 'OPS LOG', acc.accent, acc.fg);
    buf.label(x, bodyY, 'Activity during mission (F5). Esc stops poll waits.', FRAME.muted, FRAME.bg, w);
    const lines = model.activityLines.length ? model.activityLines : ['(no activity — F5 from MISSION)'];
    const visible = lines.slice(-lowerH);
    for (let i = 0; i < visible.length; i++) {
      buf.label(x, lowerY + i, visible[i].slice(0, w), FRAME.cream, FRAME.bg, w);
    }
    return;
  }

  if (view === 'MISSION') {
    buf.pill(x, bodyY - 1, 'MISSION', acc.accent, acc.fg);
    let row = bodyY;
    for (let i = 0; i < model.agents.length && row < upperEnd; i++) {
      const a = model.agents[i];
      const sel = model.focus === 'agent' && i === model.agentSelected;
      const bg = sel ? FRAME.lilac : FRAME.dimRail;
      const fg = sel ? FRAME.bg : FRAME.cream;
      const txt = `${i + 1} ${a.kind}`.slice(0, 12);
      buf.pill(x, row, txt, bg, fg);
      buf.label(x + 16, row, (a.executable || '').slice(0, w - 18), FRAME.cream, FRAME.bg, w - 18);
      row++;
    }
    row++;
    for (let i = 0; i < model.workspaces.length && row < upperEnd; i++) {
      const ws = model.workspaces[i];
      const sel = model.focus === 'workspace' && i === model.workspaceSelected;
      const bg = sel ? FRAME.lilac : FRAME.dimRail;
      const fg = sel ? FRAME.bg : FRAME.cream;
      const txt = `${i + 1} ${(ws.id || '').slice(0, 8)}`;
      buf.pill(x, row, txt, bg, fg);
      buf.label(x + 16, row, (ws.root || '').slice(0, w - 18), FRAME.muted, FRAME.bg, w - 18);
      row++;
    }

    let lr = lowerY;
    buf.pill(x, lr, 'TITLE', FRAME.sky, FRAME.bg);
    lr++;
    const show = model.missionTitle + (model.focus === 'title' ? '|' : '');
    buf.label(x, lr, show.slice(0, w), FRAME.cream, FRAME.bg, w);
    lr += 2;
    if (lr < contentBottom) {
      buf.pill(x, lr, 'REQUEST', FRAME.sky, FRAME.bg);
      lr++;
      const bodyLines = model.missionBody.split(/\r?\n/);
      for (let i = 0; i < bodyLines.length && lr < contentBottom; i++) {
        const ln = bodyLines[i] ?? '';
        const tail = ln + (i === bodyLines.length - 1 && model.focus === 'body' ? '|' : '');
        buf.label(x, lr, tail.slice(0, w), FRAME.cream, FRAME.bg, w);
        lr++;
      }
    }
    return;
  }

  if (view === 'CONNECTOR') {
    buf.pill(x, bodyY - 1, 'CONNECTOR', acc.accent, acc.fg);
    const hintLines = model.connectorHint.split(/\r?\n/);
    const upperLines = hintLines.slice(0, Math.max(1, upperEnd - bodyY));
    buf.textBlock(x, bodyY, w, Math.max(1, upperEnd - bodyY + 1), upperLines.join('\n'), FRAME.cream, FRAME.bg);
    const lowerLines = hintLines.slice(upperLines.length);
    if (lowerLines.length) {
      buf.textBlock(x, lowerY, w, lowerH, lowerLines.join('\n'), FRAME.muted, FRAME.bg);
    }
    return;
  }

  const splitGutter = 2;
  const leftW = Math.max(22, Math.floor(w * 0.42));
  const rightX = x + leftW + splitGutter;
  const rightW = Math.max(20, w - leftW - splitGutter);
  const row0 = bodyY;
  const textY = bodyY + 1;

  buf.pill(x, row0, 'SUMMARY', FRAME.tan, FRAME.bg);
  buf.pill(rightX, row0, 'SEQ', FRAME.sky, FRAME.bg);

  const leftText =
    model.overviewLeft ??
    (model.overviewSummary ? model.overviewSummary.split(/\r?\n/).slice(0, 5).join('\n') : '');
  const leftH = Math.max(1, upperEnd - textY + 1);
  buf.textBlock(x, textY, leftW, leftH, leftText, FRAME.cream, FRAME.bg);

  let sy = textY;
  for (const st of model.steps) {
    if (sy > upperEnd) break;
    const {bg, fg} = stepPillColors(st.state);
    const pillLabel = String(st.id).padStart(2, '0');
    const afterPill = buf.pill(rightX, sy, pillLabel, bg, fg);
    const tail = `${st.label}  ${st.state.toUpperCase()}`.slice(0, Math.max(8, rightW - (afterPill - rightX)));
    buf.label(afterPill, sy, tail, FRAME.cream, FRAME.bg, rightW - (afterPill - rightX));
    sy++;
  }

  const lowerText = model.overviewLower ?? '';
  if (lowerText) {
    buf.pill(x, lowerY - 1, 'PATHS', FRAME.dimRail, FRAME.cream);
    buf.textBlock(x, lowerY, w, lowerH, lowerText, FRAME.muted, FRAME.bg);
  }
}

export function frameCharsOnly(buf) {
  let s = '';
  for (let y = 0; y < buf.rows; y++) {
    for (let x = 0; x < buf.cols; x++) {
      s += buf.cells[buf.idx(x, y)].ch;
    }
    s += '\n';
  }
  return s;
}

export function frameHasBoxDrawing(buf) {
  return BOX_DRAWING_RE.test(frameCharsOnly(buf));
}

export function frameBackgroundAt(buf, x, y) {
  const c = buf.cells[buf.idx(x, y)];
  return c?.bg ? [...c.bg] : null;
}
