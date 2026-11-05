import {execFile} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {promisify} from 'node:util';
import {resolve} from 'node:path';

const git = promisify(execFile);
const blocked = [
  new RegExp('ss' + 'lip\\.io', 'i'),
  new RegExp('opc' + '@'),
  new RegExp('oracle-' + 'picard', 'i'),
  new RegExp('src2[/\\\\]Picard', 'i'),
  new RegExp('board-event-' + 'relay-'),
  new RegExp('(?:[A-Za-z]:)?[/\\\\]Users[/\\\\](?!EXAMPLE\\b)[A-Za-z0-9._-]+', 'i'),
  new RegExp('D:[/\\\\]src[/\\\\]picard', 'i'),
  new RegExp('D:[/\\\\]src[/\\\\]EasyJob', 'i'),
];

export async function privatePathFindings(root) {
  const listed = await git('git', ['ls-files', '-z'], {cwd: root, windowsHide: true, maxBuffer: 8 * 1024 * 1024});
  const findings = [];
  for (const name of listed.stdout.split('\0').filter(Boolean)) {
    const text = await readFile(resolve(root, name));
    if (text.includes(0)) continue;
    const body = text.toString('utf8');
    for (const pattern of blocked) {
      if (pattern.test(body)) findings.push(`${name}: private path or host detail matched ${pattern}`);
    }
  }
  return findings;
}
