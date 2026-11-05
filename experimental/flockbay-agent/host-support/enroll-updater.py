"""Fixed-host enrollment of upstream updater support plus our admission gate.

Does not install a new core release or enable a timer. Run after companion tests,
deployment, and root-owned compatibility enrollment. Credentials stay in place.
"""
import datetime, json, os, pathlib, shutil, subprocess, sys
source=pathlib.Path(sys.argv[1]).resolve()
support=pathlib.Path('/usr/local/lib/picard-updater')
policy_dir=pathlib.Path('/etc/picard-updater')
core=pathlib.Path('/opt/picard-relay')
def run(*args): return subprocess.run(args,check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,universal_newlines=True,timeout=60).stdout
if os.getuid()!=0 or support.exists(): raise RuntimeError('root_and_fresh_enrollment_required')
report=json.loads(pathlib.Path(sys.argv[2]).read_text())
if report['platform']!='linux' or any(not c['passed'] or c['exitCode']!=0 for c in report['checks']): raise RuntimeError('qualification_failed')
support.mkdir(mode=0o755);policy_dir.mkdir(mode=0o755,exist_ok=True)
for p in (source/'experimental/updater').glob('*.mjs'):
    if p.name.endswith('.test.mjs'): continue
    content=p.read_text()
    # Adapt host support, never the signed runtime or its signatures. The target
    # layout remains fixed and is recorded here for every future requalification.
    content=content.replace('/usr/local/lib/board-event-relay','/opt/picard-relay')
    content=content.replace('/var/lib/board-event-relay/STOP','/var/lib/picard-relay/STOP')
    content=content.replace('/var/lib/board-event-relay','/run/picard-relay')
    (support/p.name).write_text(content)
for src,dst in [('/home/opc/picard-signing-tools/cosign-linux-amd64',support/'cosign'),('/home/opc/.sigstore/root/tuf-repo-cdn.sigstore.dev/targets/trusted_root.json',policy_dir/'trusted_root.json')]:
    shutil.copyfile(src,dst);os.chown(dst,0,0);os.chmod(dst,0o755 if dst.name=='cosign' else 0o644)
policy=json.loads((source/'experimental/updater/policy.example.json').read_text());policy['enabled']=True
(policy_dir/'policy.json').write_text(json.dumps(policy));os.chmod(policy_dir/'policy.json',0o644)
for name,mode in [('picard-updater',0o700),('picard-updater-status',0o755),('picard-updater-inbox',0o700),('picard-update-requests',0o770)]:
    p=pathlib.Path('/var/lib')/name;p.mkdir(mode=mode,exist_ok=True);os.chmod(p,mode)
run('chown','picard-relay:picard-relay','/var/lib/picard-updater-inbox')
run('chown','root:picard-relay','/var/lib/picard-update-requests')
status=pathlib.Path('/var/lib/picard-updater-status/request.json')
if status.exists(): raise RuntimeError('owner_request_evidence_exists')
status.write_text(json.dumps({'v':1,'state':'idle','requestedAt':None,'finishedAt':None,'retryAt':None}));os.chmod(status,0o644)
current=json.loads((core/'current/manifest.json').read_text())
if (core/'state.json').exists(): raise RuntimeError('sequence_evidence_exists')
(core/'state.json').write_text(json.dumps({'highestSequence':current['sequence']}));os.chmod(core/'state.json',0o600)
units=pathlib.Path('/etc/systemd/system')
(units/'picard-update-fetch.service').write_text('''[Unit]
Description=Fetch untrusted public Picard envelope
After=network-online.target
[Service]
Type=oneshot
User=picard-relay
ExecStart=/usr/local/bin/node --jitless /usr/local/lib/picard-updater/fetch-release.mjs
TimeoutStartSec=30
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/var/lib/picard-updater-inbox
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
''')
(units/'picard-updater.service').write_text('''[Unit]
Description=Qualified signed Picard core update with companion maintenance
After=picard-update-fetch.service
Requires=picard-update-fetch.service
[Service]
Type=oneshot
User=root
ExecStart=/usr/local/bin/node --jitless /opt/picard-flockbay-agent/v1/host-support/guarded-update.mjs
TimeoutStartSec=180
Environment=GOMAXPROCS=1
Environment=GOMEMLIMIT=64MiB
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectHome=true
ProtectSystem=strict
ReadWritePaths=/opt/picard-relay /var/lib/picard-updater /var/lib/picard-flockbay-agent /run/picard-relay
RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6
IPAddressDeny=any
IPAddressAllow=localhost
''')
for name in ['picard-updater.timer','picard-owner-update.path','picard-owner-update.service','picard-updater-activity.service','picard-updater-activity.timer']:
    text=(source/'experimental/updater'/name).read_text().replace('/usr/local/lib/picard-updater/node','/usr/local/bin/node')
    (units/name).write_text(text)
stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
checkpoint=pathlib.Path('/var/backups/picard-updater')/stamp;checkpoint.mkdir(parents=True,mode=0o700)
env=pathlib.Path('/etc/picard-relay/relay.env');shutil.copyfile(env,checkpoint/'relay.env')
shutil.copyfile(units/'board-event-relay.service',checkpoint/'board-event-relay.service')
env.write_text(env.read_text()+'\nBRIDGE_OWNER_UPDATES_ENABLED=true\n')
unit=(units/'board-event-relay.service').read_text()
lines=unit.splitlines();lines=[('ExecStart=/usr/local/bin/node --jitless /opt/picard-flockbay-agent/v1/host-support/core-start.mjs' if line.startswith('ExecStart=') else line) for line in lines]
lines=[line.replace('ReadWritePaths=/var/lib/picard-relay /run/picard-relay','ReadWritePaths=/var/lib/picard-relay /run/picard-relay /var/lib/picard-update-requests') for line in lines]
(units/'board-event-relay.service').write_text('\n'.join(lines)+'\n')
run('systemctl','daemon-reload')
print(json.dumps({'enrolled':True,'timersEnabled':False,'coreRestartRequired':True,'checkpoint':str(checkpoint)}))
