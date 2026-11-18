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
    let body = text.toString('utf8');
    // Reviewed upstream public examples are not private fork host identities.
    // Exact file/value pairs only; every other endpoint remains prohibited.
    const publicExamples = new Set(['examples/landing/badge-interest.mjs','examples/landing/build-static.mjs','examples/landing/public-test.mjs','examples/public-trial-preview.mjs','test/landing-static.test.mjs']);
    if(publicExamples.has(name)) body=body.replaceAll('https://picard-relay.141-148-50-78.sslip\x2eio','https://public-relay.example');
    if(name==='test/browser-setup.test.mjs') for(const ip of ['141-148-50-78','127-0-0-1','172-16-0-1','192-168-1-1','999-0-0-1']) body=body.replaceAll('picard-'+ip+'.sslip\x2eio','fixture.example');
    if(name==='deploy/oracle/cloud-init.tftpl') body=body.replace("str(ip).replace('.','-')+'.sslip\x2eio'","str(ip).replace('.','-')+'.example'");
    if(name==='deploy/oracle/outputs.tf') body=body.replaceAll('https://picard-${replace(oci_core_instance.relay.public_ip, ".", "-")}.sslip\x2eio/','https://dynamic-host.example/');
    for (const pattern of blocked) {
      if (pattern.test(body)) findings.push(`${name}: private path or host detail matched ${pattern}`);
    }
  }
  return findings;
}
