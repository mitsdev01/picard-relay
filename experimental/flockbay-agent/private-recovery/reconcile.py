#!/usr/bin/python3
"""Private, fixed-path recovery. Never restores credentials or mission state."""
import datetime, fcntl, hashlib, json, os, pathlib, shutil, subprocess, sys

BASE = pathlib.Path('/var/lib/picard-flockbay-recovery')
LIVE = pathlib.Path('/opt/picard-flockbay-agent/v1')
UNIT = pathlib.Path('/etc/systemd/system/picard-flockbay-agent.service')
CADDY = pathlib.Path('/etc/caddy/Caddyfile')
PERSISTENT = ['/etc/picard-flockbay-agent/config.json', '/etc/picard-flockbay-agent/bridge-token',
              '/var/lib/picard-flockbay-agent/agent.sqlite', '/etc/picard-relay/credentials/groq',
              '/etc/picard-relay/credentials/free-gate.json']

def configured_site():
    site = os.environ.get('PICARD_FLOCKBAY_CADDY_SITE', '').strip()
    if not site or site.startswith('-') or any(ch in site for ch in '\r\n\0{}'):
        raise ValueError('caddy_site_not_configured')
    return site

def route_plan(current, snippet, site):
    if current.count(snippet) == 1:
        return current
    if '/development/' in current or '@development' in current:
        raise ValueError('development_routes_changed_review_required')
    anchor = '    @read {'
    marker = site + ' {'
    if current.count(anchor) != 1 or current.count(marker) != 1:
        raise ValueError('caddy_layout_changed_review_required')
    # Do not guess which site owns the anchor in a multi-site configuration.
    between = current.split(marker, 1)[1].split(anchor, 1)[0]
    if '\n}' in between:
        raise ValueError('caddy_site_changed_review_required')
    return current.replace(anchor, snippet + anchor, 1)

def missing_files(snapshot, live):
    result = []
    for source in sorted(snapshot.rglob('*')):
        if source.is_symlink():
            raise ValueError('snapshot_symlink_refused')
        if not source.is_file():
            continue
        target = live / source.relative_to(snapshot)
        for p in [target, *target.parents]:
            if p.is_symlink():
                raise ValueError('target_symlink_refused')
        if target.exists():
            if hashlib.sha256(source.read_bytes()).digest() != hashlib.sha256(target.read_bytes()).digest():
                raise ValueError('installed_file_changed_review_required:' + target.name)
        else:
            result.append((source, target))
    return result

def run(*args, check=True, input=None):
    p = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True, timeout=45, input=input)
    if check and p.returncode:
        raise RuntimeError('command_failed:' + pathlib.Path(args[0]).name)
    return p

def companion_require_idle():
    upgrade = LIVE / 'upgrade-check.mjs'
    if upgrade.is_file():
        probe = run('runuser', '-u', 'picard-relay', '--', '/usr/local/bin/node', str(upgrade), '--require-idle', check=False)
        return probe.returncode == 0
    control = LIVE / 'control.mjs'
    if not control.is_file():
        return False
    probe = run('runuser', '-u', 'picard-relay', '--', '/usr/local/bin/node', str(control), check=False, input='{"action":"status"}')
    if probe.returncode:
        return False
    try:
        status = json.loads(probe.stdout)
    except json.JSONDecodeError:
        return False
    missions = status.get('missions')
    if not isinstance(missions, list):
        return False
    return not any(isinstance(m, dict) and m.get('state') == 'running' for m in missions)

def reconcile():
    # These are deliberately NOT in the recovery payload.
    for path in PERSISTENT:
        if not pathlib.Path(path).is_file():
            raise ValueError('persistent_configuration_or_state_missing_manual_recovery_required')
    copies = missing_files(BASE / 'source', LIVE)
    saved_unit = BASE / 'agent.service'
    if UNIT.is_symlink() or CADDY.is_symlink():
        raise ValueError('configuration_symlink_refused')
    if UNIT.exists() and UNIT.read_bytes() != saved_unit.read_bytes():
        raise ValueError('service_unit_changed_review_required')
    unit_missing = not UNIT.exists()
    current = CADDY.read_text()
    planned = route_plan(current, (BASE / 'routes.txt').read_text(), configured_site())
    active = run('systemctl', 'is-active', '--quiet', 'picard-flockbay-agent', check=False).returncode == 0
    # If healthy, only inspect. A busy mission defers all repairs.
    if active and not companion_require_idle():
        raise ValueError('busy_or_unreadable_companion_repair_deferred')
    if planned != current:
        candidate = BASE / 'Caddyfile.candidate'
        candidate.write_text(planned)
        run('/usr/local/bin/caddy', 'validate', '--config', str(candidate), '--adapter', 'caddyfile')
    for source, target in copies:
        new_dirs = [p for p in [target.parent, *target.parent.parents] if not p.exists()]
        target.parent.mkdir(parents=True, exist_ok=True)
        for directory in new_dirs:
            directory.chmod(0o755)
        shutil.copyfile(source, target)
        target.chmod(0o644)
    if unit_missing:
        shutil.copyfile(saved_unit, UNIT)
        UNIT.chmod(0o644)
        run('systemctl', 'daemon-reload')
    if copies or unit_missing or not active:
        run('systemctl', 'enable', 'picard-flockbay-agent')
        run('systemctl', 'restart', 'picard-flockbay-agent')
    if planned != current:
        shutil.copyfile(CADDY, BASE / 'Caddyfile.before-last-repair')
        CADDY.write_text(planned)
        run('restorecon', str(CADDY))
        run('systemctl', 'restart', 'caddy')
    return {'ok': True, 'restoredFiles': len(copies), 'restoredUnit': unit_missing,
            'restoredRoutes': planned != current, 'noProviderCalls': True}

if __name__ == '__main__':
    with (BASE / 'lock').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        try:
            result = reconcile()
        except Exception as e:
            result = {'ok': False, 'error': str(e), 'noProviderCalls': True}
        result['checkedAt'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        (BASE / 'status.json').write_text(json.dumps(result, indent=2) + '\n')
        print(json.dumps(result))
        sys.exit(0 if result['ok'] else 1)
