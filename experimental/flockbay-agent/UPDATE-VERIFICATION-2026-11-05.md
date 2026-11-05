# Qualified update verification — 2026-11-05

## Installed result

The Oracle host moved from v1.0.27 to the upstream signed v1.0.31 publication
through its normal fixed feed. Source commit:
`02acebe871336377d5d5cc3c982f9af802b655bc`.
Release fingerprint:
`555c3087c19e33fb6fde20c0a8610838349ad958caf3d259b05996a4c152a765`.
All 20 installed runtime files matched their manifest hashes and lengths.
The guarded installation returned `verified` at 15:19:31 UTC.

The core remained ready, with three completed jobs and no unresolved invocation.
All 11 companion missions and their artifact/repair/event history were preserved;
the guard compared the complete history fingerprint before and after installation.
The Windows worker remained connected to **Wildwood Hunters - Picard Test**.
Maintenance was released, and pending missions and commands were both zero.
No provider calls or game edits were made by this verification.

Automatic isolated validation and promotion remain **disabled by owner choice**
until a separate Windows/Flockbay validator is provisioned. Inspection, inert
patch proposals, bounded repair and saved history remain available.

## Qualification evidence

Local tested commit: `6dc5662` on `codex/companion-upgrade-gates`.
Linux Node 24.22.0 passed all eight groups: updater, runtime, real Unix sockets,
documentation, companion, companion under jitless, recovery, and web authentication.
The published runtime bytes were checked against the source before tests ran.

The first full run exposed an upstream fixture race: startup was checked after
12 event-loop turns while configuration still read durable files. It passed in
isolation. The test fixture now awaits the real bootstrap/configuration promise;
no assertion was removed and no signed runtime file was changed. The complete
qualification was then repeated successfully. Failed evidence was retained.

Protected host evidence is under
`/var/lib/picard-updater/qualifications/555c3087c19e33fb6fde20c0a8610838349ad958caf3d259b05996a4c152a765`.
It contains the report and SHA-256-bound logs for every group.

Installed companion code identity:
`6b4535a15a2cf9a7ee51d12d9d81b2185a133a0145fcb623917da6df61bf1149`.
Windows worker identity:
`397f2084e1b717ef5dd62d466553544a760b5aea02035933ec2ff1bac32dc4db`.
The qualification also binds the exact project pin, protocol and state schema.

## Live acceptance performed

- The automatic update timer, owner-request path and activity timer are enabled.
- An initial scheduled check succeeded without reinstalling the current release.
- The authenticated System **Check for updates** button completed at 15:20:43 UTC
  with durable outcome `up_to_date` and its normal five-minute cooldown.
- The browser displayed v1.0.31, updates enabled, timer running and successful
  check. System and development views were checked at desktop and narrow widths.
- Saved rejected patch history, all three candidate links, and the explicit
  disabled-execution notice remained visible. No new patch was submitted.
- Unauthenticated core and companion status access remained denied by the guard.

These are host/browser checks, not a new live-provider or game execution test,
and do not substitute for the owner's visual acceptance.

## Future update procedure and recovery

New upstream releases are **not** automatically trusted for this companion.
Integrate their source, package canonical LF bytes, run `qualify.mjs` on Linux,
inspect every result, and enroll the exact tested combination in the root-owned
compatibility policy with retained evidence and bounded expiry. Only then may
the normal timer or owner button install it. Missing or mismatched qualification
blocks before maintenance. Changes to the companion or worker require renewed
qualification; do not silently broaden the accepted hashes or project pin.

Install `host-support/no-runtime-bind.conf` as
`/etc/systemd/system/picard-updater.service.d/no-runtime-bind.conf` alongside the
fixed-host enrollment. It avoids binding the core's replaceable RuntimeDirectory
into the updater namespace; the read-only `/run` view can connect to its new socket.
The normal upstream fetch service and signature checks remain in place.

The companion checkpoint is `/var/backups/picard-companion/20261105T145606Z`;
the updater enrollment checkpoint is `/var/backups/picard-updater/20261105T145024Z`.
Recovery source was refreshed after companion deployment. Preserve these private
checkpoints, credentials, databases and consumed/uncertain evidence. Rollback
restores code only. Never restore an older ledger to retry a consumed operation.

If installation fails after maintenance is acquired, inspect the durable barrier,
updater journal, physical release, history and worker identity before explicitly
releasing that same maintenance ID. Do not clear HOLD or uncertainty automatically.
`last-guard-result.json` retains the last failure; the service journal and physical
release show later successful outcomes. The rejected v1.0.29 fetch override was
never applied; v1.0.31 was fetched and installed through the unchanged normal feed.

## Publication boundary

Brian's core source and signed envelope were published upstream. The custom
companion branch and compatibility workflow are committed locally; they have not
been pushed to Brian's repository or a newly created fork. The GitHub workflow
has not run remotely. Host deployment and local Linux qualification are verified
separately above. No unattended game execution has been enrolled.
