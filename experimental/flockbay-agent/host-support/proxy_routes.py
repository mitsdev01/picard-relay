"""Exact-route migration, refuses unknown layouts and never adds a wildcard."""
import datetime, json, pathlib, shutil, subprocess
def planned(current):
    replacements={
      'path / /auth/state /status /jobs /workspace/config /workspace/history /request-catalogue':'path / /auth/state /status /jobs /workspace/config /workspace/history /request-catalogue /updates',
      'path /auth/setup /auth/login /auth/logout /workspace/drafts /workspace/approvals /workspace/requests /request-approvals /requests /bridge/v1':'path /auth/setup /auth/login /auth/logout /workspace/drafts /workspace/approvals /workspace/requests /request-approvals /requests /bridge/v1 /updates',
      'path /development/api/missions /development/api/stop /development/worker/register /development/worker/poll /development/worker/result /development/worker/check':'path /development/api/missions /development/api/stop /development/worker/register /development/worker/poll /development/worker/result /development/worker/check /development/worker/heartbeat /development/api/repair /development/api/reject',
      'path_regexp devmission ^/development/api/missions/[a-f0-9-]{36}$':'path_regexp devmission ^/development/api/missions/[a-f0-9-]{36}(/artifacts/[a-f0-9]{64})?$'
    }
    for old,new in replacements.items():
        if current.count(new)==1: continue
        if current.count(old)!=1: raise ValueError('unknown_proxy_layout')
        current=current.replace(old,new,1)
    return current
def main():
    target=pathlib.Path('/etc/caddy/Caddyfile');before=target.read_text();after=planned(before)
    stamp=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup=pathlib.Path('/var/backups/picard-proxy')/stamp;backup.mkdir(parents=True,mode=0o700)
    shutil.copyfile(target,backup/'Caddyfile')
    recovery=pathlib.Path('/var/lib/picard-flockbay-recovery/routes.txt');shutil.copyfile(recovery,backup/'routes.txt')
    candidate=target.with_name('Caddyfile.qualified');candidate.write_text(after)
    subprocess.run(['/usr/local/bin/caddy','validate','--config',str(candidate),'--adapter','caddyfile'],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
    candidate.replace(target)
    try:
        subprocess.run(['systemctl','restart','caddy.service'],check=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
        subprocess.run(['systemctl','is-active','--quiet','caddy.service'],check=True)
    except:
        target.write_text(before);subprocess.run(['systemctl','restart','caddy.service'],check=True);raise
    recovery.write_text(after[after.index('    @developmentRead {'):after.index('    @read {')])
    print(json.dumps({'proxyUpdated':True,'recoveryRoutesUpdated':True,'checkpoint':str(backup)}))
if __name__=='__main__': main()
