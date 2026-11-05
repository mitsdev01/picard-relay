PICARD PRIVATE UPDATE RECOVERY - installed 2026-11-05

This integration is ours. Brian does not need to merge or maintain it.

Automatic operation
When board-event-relay.service starts or restarts, its private systemd drop-in
queues picard-flockbay-reconcile.service. The recovery service compares our
companion with a protected known-good copy outside Picard's release folders.
It restores missing companion files, a missing companion service unit, and
missing /development routes when the existing Caddy layout is recognized.
It preserves the current core routes. Caddy is validated before route changes.

The companion no longer imports enrollment validation from a particular core
release directory. It continues to validate the existing enrollment format.

Safety and limits
Existing files with unexpected changes are NOT overwritten. Changed or partial
development routes, unfamiliar Caddy layouts, missing persistent configuration,
or an active/unreadable mission defer recovery and produce a failure status.
Mission history, credentials, tokens and enrollment are never restored from
backup, reset, or replayed. No Groq calls or game edits are made by recovery.
The idle check is point-in-time, not an update lock: avoid submitting missions
while updating or repairing. There is no automatic retry after a busy result.

This protects normal updates that retain the board-event-relay service name
and its /etc/systemd/system drop-ins. A future updater that replaces those,
changes authentication/enrollment interfaces, or rebuilds the whole server
needs manual adaptation. It cannot guarantee compatibility with unknown code.
The check records failures in systemd and status.json; it does not send alerts.
Browser authentication and actual gameplay are not exercised by this check.

Installed locations
Recovery: /opt/picard-flockbay-recovery/reconcile.py
Snapshot: /var/lib/picard-flockbay-recovery/source
Status: /var/lib/picard-flockbay-recovery/status.json
Hook: /etc/systemd/system/board-event-relay.service.d/flockbay-recovery.conf
Service: /etc/systemd/system/picard-flockbay-reconcile.service
Live integration: /opt/picard-flockbay-agent/v1

No-browser operations (existing SSH account/key)
Use this SSH prefix in PowerShell:
ssh -i C:/src2/Picard-v2/secrets/oracle-picard -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile=C:/src2/Picard-v2/secrets/oracle-known-hosts opc@132.226.62.113

Append one quoted remote command:
  'sudo -n cat /var/lib/picard-flockbay-recovery/status.json'
  'sudo -n systemctl start picard-flockbay-reconcile.service'
  'sudo -n journalctl -u picard-flockbay-reconcile.service -n 20 --no-pager'

Then verify the existing Windows bridge and private command channel:
node C:/src2/Picard-v2/experimental/flockbay-agent/picard.mjs status

When we intentionally upgrade our integration, test it first, then explicitly
refresh the protected snapshot to that known-good version. Never automatically
learn a new baseline from files a Picard update has just changed. The installer
refuses to replace an existing snapshot. Keep an earlier recovery copy.

Validation completed
- 26 companion tests passed on the Linux host before release-independence deployment.
- 7 recovery tests passed on the host, including simulated file/unit/route
  removal, repeat runs, changed-file refusal, symlink refusal, busy deferral,
  and unchanged persistent state. Simulated removal did not delete live files.
- A real idle board-event-relay restart triggered the private hook successfully.
- Relay, companion and Caddy active; bridge connected to Wildwood Hunters.
- Final live recovery check successful; no repairs needed, no provider calls.

To disable automatic recovery only:
Remove the private flockbay-recovery.conf drop-in, then systemctl daemon-reload.
Do not remove Picard's other drop-ins. The companion and its data remain intact.
