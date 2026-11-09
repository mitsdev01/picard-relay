import test from 'node:test';
import assert from 'node:assert';
import {
 stripAnsi,
 visibleLen,
 truncateTail,
 panelBox,
 ruleTop
} from '../lcars-ui.mjs';

test('stripAnsi removes SGR sequences', () => {
 const s = '\x1b[38;2;1;2;3mhello\x1b[0m';
 assert.equal(stripAnsi(s), 'hello');
 assert.equal(visibleLen(s), 5);
});

test('truncateTail shortens plain string', () => {
 assert.equal(truncateTail('abcdef', 4), 'a...');
});

test('ruleTop fits width', () => {
 const w = 40;
 const line = ruleTop('TEST', true, w);
 assert.equal(visibleLen(stripAnsi(line)), w);
});

test('panelBox rows respect width', () => {
 const w = 50;
 const lines = panelBox('Title', ['short', 'x'.repeat(80)], true, w);
 for (const line of lines) {
  assert.ok(visibleLen(stripAnsi(line)) <= w, 'line too wide: ' + visibleLen(stripAnsi(line)));
 }
});
