import test from 'node:test';
import assert from 'node:assert';
import {parseKeyData} from '../lcars-screen.mjs';
import {
  CellBuffer,
  paintLcarsShell,
  frameCharsOnly,
  frameHasBoxDrawing,
  frameBackgroundAt,
  FRAME,
  MIN_FRAME_COLS,
  DEFAULT_COLS,
  DEFAULT_ROWS,
  BOX_DRAWING_RE,
  railWidth,
} from '../lcars-frame.mjs';

test('BOX_DRAWING_RE is defined', () => {
  assert.ok(BOX_DRAWING_RE.test('\u2500') === true);
  assert.ok(BOX_DRAWING_RE.test('a') === false);
});

test('CellBuffer bar and pill', () => {
  const buf = new CellBuffer(20, 5);
  buf.pill(2, 2, 'HI', FRAME.elbow, FRAME.bg);
  assert.strictEqual(buf.cells[buf.idx(3, 2)].ch, 'H');
  assert.deepStrictEqual(buf.cells[buf.idx(3, 2)].bg, FRAME.elbow);
});

test('paintLcarsShell 100x32 has no box-drawing chars', () => {
  const model = {
    cols: DEFAULT_COLS,
    rows: DEFAULT_ROWS,
    views: ['OVERVIEW', 'OPERATIONS', 'MISSION', 'CONNECTOR'],
    viewIndex: 0,
    telemetryLine1: 'SYS-STAT // TEST',
    telemetryLine2: 'CPU 0% | LOAD 0.00',
    clockText: '2026-01-01 12:00:00',
    footerHints: '[Q] Quit',
    steps: [
      {id: 1, label: '01 SELECT AGENT', state: 'pending'},
      {id: 2, label: '02 WORKSPACE', state: 'running'},
      {id: 3, label: '03 ORDERS', state: 'done'},
    ],
    activityLines: ['line one'],
    overviewLeft: 'Picard LCARS\nAgent: none',
    overviewLower: 'Connector: cfg',
    connectorHint: 'Poll during mission',
    agents: [{kind: 'cursor', executable: 'C:\\agent.cmd'}],
    agentSelected: 0,
    workspaces: [{id: 'ws1', root: 'D:\\src\\Picard'}],
    workspaceSelected: 0,
    missionTitle: 'Title',
    missionBody: 'Body',
    focus: 'overview',
  };
  const buf = paintLcarsShell(model);
  assert.strictEqual(buf.cols, DEFAULT_COLS);
  assert.strictEqual(buf.rows, DEFAULT_ROWS);
  assert.ok(!frameHasBoxDrawing(buf), 'frame must not use box-drawing');
  const chars = frameCharsOnly(buf);
  assert.ok(!BOX_DRAWING_RE.test(chars));
});

test('top sweep and elbow cap backgrounds', () => {
  const model = {
    cols: 100,
    rows: 32,
    views: ['OVERVIEW', 'OPERATIONS', 'MISSION', 'CONNECTOR'],
    viewIndex: 0,
    telemetryLine1: 'SYS',
    telemetryLine2: 'RAM',
    footerHints: 'hint',
    steps: [],
    activityLines: [],
    overviewLeft: '',
    overviewLower: '',
    connectorHint: '',
    agents: [],
    agentSelected: 0,
    workspaces: [],
    workspaceSelected: 0,
    missionTitle: '',
    missionBody: '',
    focus: 'overview',
  };
  const buf = paintLcarsShell(model);
  const rail = frameBackgroundAt(buf, 0, 5);
  assert.deepStrictEqual(rail, FRAME.rail);
  const sweep = frameBackgroundAt(buf, 22, 0);
  assert.deepStrictEqual(sweep, FRAME.rail);
  const cap = frameBackgroundAt(buf, 96, 0);
  assert.deepStrictEqual(cap, FRAME.elbow);
  const gap = frameBackgroundAt(buf, 95, 0);
  assert.deepStrictEqual(gap, FRAME.bg);
});

test('mid-bar and per-nav accent when overview selected', () => {
  const model = {
    cols: 100,
    rows: 32,
    views: ['OVERVIEW', 'OPERATIONS', 'MISSION', 'CONNECTOR'],
    viewIndex: 0,
    telemetryLine1: 'SYS',
    telemetryLine2: 'RAM',
    footerHints: 'hint',
    activityLines: [],
    overviewLeft: 'line1\nline2',
    overviewLower: 'connector path',
    steps: [
      {id: 1, label: '01 SELECT AGENT', state: 'done'},
      {id: 2, label: '02 WORKSPACE', state: 'pending'},
    ],
    connectorHint: '',
    agents: [],
    agentSelected: 0,
    workspaces: [],
    workspaceSelected: 0,
    missionTitle: '',
    missionBody: '',
    focus: 'overview',
  };
  const buf = paintLcarsShell(model);
  const mainX = railWidth(100);
  let foundMid = false;
  for (let y = 4; y < 28; y++) {
    const bg = frameBackgroundAt(buf, mainX, y);
    if (bg && bg.join() === FRAME.elbow.join()) {
      foundMid = true;
      break;
    }
  }
  assert.ok(foundMid, 'elbow mid-bar on main field');
  assert.deepStrictEqual(frameBackgroundAt(buf, 4, 4), FRAME.tan);
  assert.strictEqual(buf.cells[buf.idx(2, 4)].ch, '1');
});

test('MIN_FRAME_COLS matches plan', () => {
  assert.strictEqual(MIN_FRAME_COLS, 72);
});

test('parseKeyData maps DEL (127) to backspace', () => {
  const keys = parseKeyData('\x7f');
  assert.strictEqual(keys.length, 1);
  assert.strictEqual(keys[0].name, 'backspace');
});

test('parseKeyData maps Ctrl+G (7) to ctrl+g', () => {
  const keys = parseKeyData('\x07');
  assert.strictEqual(keys.length, 1);
  assert.strictEqual(keys[0].name, 'g');
  assert.strictEqual(keys[0].ctrl, true);
});
