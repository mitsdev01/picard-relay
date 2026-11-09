import test from 'node:test';
import assert from 'node:assert';
import {PALETTE_HEX, hexToAnsiFg, mapHexTo16} from '../lcars-k9s-theme.mjs';
import {innerWidth, horizontalCapLine, fitLabel, BLOCK} from '../k9s-layout.mjs';
import {ActivityLog} from '../activity-spinner.mjs';

test('PALETTE_HEX matches plan', () => {
 assert.strictEqual(PALETTE_HEX.apricot, '#FF9966');
 assert.strictEqual(PALETTE_HEX.neoOrange, '#FF6633');
 assert.strictEqual(PALETTE_HEX.selected, '#CC99CC');
 assert.strictEqual(PALETTE_HEX.text, '#99CCFF');
 assert.strictEqual(PALETTE_HEX.textAlt, '#FFFFFF');
 assert.strictEqual(PALETTE_HEX.bg, '#000000');
});

test('hexToAnsiFg emits truecolor SGR', () => {
 const s = hexToAnsiFg('#FF9966');
 assert.ok(s.startsWith('\x1b[38;2;'));
 assert.ok(s.includes('255'));
 assert.ok(s.endsWith('m'));
});

test('innerWidth clamps', () => {
 assert.strictEqual(innerWidth(20, 1), 18);
 assert.strictEqual(innerWidth(2, 1), 0);
});

test('horizontalCapLine width', () => {
 assert.strictEqual(horizontalCapLine(5, BLOCK.full).length, 5);
});

test('fitLabel truncates', () => {
 assert.strictEqual(fitLabel('abcdefgh', 4), 'a...');
});

test('mapHexTo16 maps palette', () => {
 assert.strictEqual(mapHexTo16('#FF9966'), 'yellow');
});

test('ActivityLog rate-limit coalesces', async () => {
 const lines = [];
 const log = new ActivityLog({
  minIntervalMs: 50,
  maxLines: 10,
  onFlush: l => {
   lines.length = 0;
   lines.push(...l);
  },
 });
 log.append('a');
 log.append('b');
 log.append('c');
 await new Promise(r => setTimeout(r, 80));
 assert.ok(lines.includes('c'));
 assert.ok(lines.length <= 3);
});
