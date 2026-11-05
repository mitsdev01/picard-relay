"""Operator deployment; fixed target, append-only backups, no state rollback."""
import datetime, hashlib, json, os, pathlib, shutil, sqlite3, subprocess, sys, time
source = pathlib.Path(sys.argv[1]).resolve()
live = pathlib.Path('/opt/picard-flockbay-agent/v1')
state = pathlib.Path('/var/lib/picard-flockbay-agent')
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
backup = pathlib.Path('/var/backups/picard-companion') / stamp
def run(*args):
    return subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True, timeout=45).stdout
def snapshot():
    with sqlite3.connect('file:' + str(state / 'agent.sqlite') + '?mode=ro', uri=True) as db:
        if db.execute("SELECT COUNT(*) FROM missions WHERE state IN ('running','awaiting_validation')").fetchone()[0] or db.execute("SELECT COUNT(*) FROM commands WHERE state IN ('queued','sent','uncertain')").fetchone()[0]:
            raise RuntimeError('outstanding_work_do_not_deploy')
        rows = [db.execute('SELECT * FROM ' + t + ' ORDER BY rowid').fetchall() for t in ['missions','commands','events','patch_artifacts','patch_repairs']]
        return hashlib.sha256(json.dumps(rows).encode()).hexdigest()
if os.getuid() != 0 or not (source/'server.mjs').is_file() or not (source/'maintenance.mjs').is_file():
    raise RuntimeError('root_and_reviewed_source_required')
before = snapshot()
backup.mkdir(parents=True, mode=0o700)
run('systemctl','stop','picard-flockbay-agent.service')
changed = False
try:
    if snapshot() != before:
        raise RuntimeError('state_changed_during_quiesce')
    shutil.copytree(state, backup/'state')
    shutil.copytree(live, backup/'code')
    shutil.copytree('/var/lib/picard-flockbay-recovery/source', backup/'recovery-source')
    shutil.copytree(source, backup/'candidate')
    # Only reviewed source files, never a source checkout's caches or symlinks.
    for p in (backup/'candidate').rglob('*'):
        if p.is_symlink(): raise RuntimeError('source_link_refused')
    previous = live.parent/('previous-'+stamp)
    live.rename(previous)
    shutil.copytree(backup/'candidate',live)
    changed = True
    for p in [live, *live.rglob('*')]:
        os.chown(p,0,0);os.chmod(p,0o755 if p.is_dir() else 0o644)
    run('systemctl','start','picard-flockbay-agent.service')
    run('systemctl','is-active','--quiet','picard-flockbay-agent.service')
    for attempt in range(20):
        probe=subprocess.run(['runuser','-u','picard-relay','--','/usr/local/bin/node',str(live/'control.mjs')],input='{"action":"status"}',stdout=subprocess.PIPE,stderr=subprocess.PIPE,universal_newlines=True,timeout=10)
        if probe.returncode==0: break
        time.sleep(0.25)
    else: raise RuntimeError('companion_readiness_failed')
    if snapshot() != before: raise RuntimeError('history_changed')
    recovery = pathlib.Path('/var/lib/picard-flockbay-recovery/source')
    recovery.rename(recovery.parent/('source-before-'+stamp))
    shutil.copytree(live,recovery)
    print(json.dumps({'installed':True,'checkpoint':str(backup),'historyUnchanged':True}))
except:
    if changed:
        run('systemctl','stop','picard-flockbay-agent.service')
        live.rename(live.parent/('failed-'+stamp))
        previous.rename(live)
    run('systemctl','start','picard-flockbay-agent.service')
    raise
