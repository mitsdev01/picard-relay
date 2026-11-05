# Live Groq → Flockbay

Opt-in companion to Picard's immutable one-shot runtime. The Groq model itself selects function calls; a Windows worker executes them through the installed Flockbay MCP launcher. No Codex worker is involved.

The companion listens on loopback 8789 and serves `/development/` behind the existing HTTPS proxy. Owner authentication is checked against the original console's `/status` on every request. POST requests require the exact same origin. A separate random bridge credential authenticates only worker registration, polling and results; it cannot start missions. The Windows worker opens no listening port.

The owner reviews the exact prompt, access mode, model-call cap (1–24) and duration (1–30 minutes) before starting. Only one mission runs at a time. Inspect has an explicit read-only list; Build permits trusted game code, editing and tests. This is not an OS sandbox: game scripts run with Flockbay's local privileges. Paid generation, publishing, release operations and commits are excluded. The worker verifies the pinned open project before each call. Stop prevents future dispatch, but cannot undo edits or retract an already executing tool.

SQLite records model reservations before network I/O and tool delivery before handing it to the worker. Neither provider calls nor dispatched tools are retried automatically. Worker results may be redelivered idempotently. Restarted active missions are marked uncertain. After an uncertain operation, inspect the game before issuing another mission. Token and time caps are per mission; the existing retained Free enrollment is not a live billing guarantee. There is no provider/model fallback.

The text-only `openai/gpt-oss-20b` model receives text tool results. Images are counted and omitted; visual acceptance remains the creator's. Long tool output is explicitly truncated. Tool discovery supplies a small subset of schemas per model turn.

Quota pacing reads Groq's token/minute and request/day headers and persists the latest allowance/reset times in SQLite. Before each new model call it estimates the input plus maximum output, waits for a reset when needed, and observes minimum request spacing. Waiting does not consume a call and can be stopped. A wait beyond the mission deadline or a request larger than the observed minute budget blocks before sending. Estimates are conservative heuristics, not a tokenizer or billing guarantee; other clients sharing the organization can still exhaust quota. An actual 429 stores its category and retry-after cooldown and stops the mission without retrying. The UI shows pacing and quota failures; the full log retains headers without credentials. No paid upgrade or provider fallback is enabled.

Run tests with Node 24: `node --test experimental/flockbay-agent/test/*.test.mjs`. Native HTTP(S) works under `--jitless`. Server config fields: origin, project, port, state, tokenFile, keyFile, gateFile, gateModule (the installed runtime's Groq adapter). Worker config: origin, project, state, tokenFile, connection {command,args,env}. Keep configuration, credentials, databases and logs outside source control.

For repeatable agent access without web login, use the installed `picard.mjs` CLI: `status`, `prepare --prompt-file FILE --out FILE [--mode inspect|build --max-calls 8 --minutes 10]`, `start FILE --approve`, `show ID`, `events ID`, and `stop ID`. Preparation writes an unapproved request with a stable UUID; start explicitly approves that exact request. The local CLI reads `PICARD_FLOCKBAY_SSH_IDENTITY`, `PICARD_FLOCKBAY_SSH_KNOWN_HOSTS`, `PICARD_FLOCKBAY_SSH_DESTINATION`, and `PICARD_FLOCKBAY_SSH_REMOTE` from the environment. Keep those values outside source control. It sends JSON through stdin to that remote command; task text never enters shell command strings. The host client uses `/var/lib/picard-flockbay-agent/control.sock` (0600, service user, inside the private state directory). It shares the live worker catalogue, rate controller, validation and ledger with the browser. Public HTTP cannot opt into this trust through headers; worker credentials cannot submit missions. CLI missions record `submitted_via=ssh_private_control`. This uses the existing SSH account's sudo authority, not a new restricted SSH identity. No browser cookie is read, exported or stored. The discoverable `picard-live` skill documents the workflow for future chats. An SSH failure is not retried: inspect the original request ID before resubmitting or creating anything new.

The deployment is a separate systemd service `picard-flockbay-agent`. It does not modify the original runtime or enroll the host updater. Rollback stops/disables that service and restores the checkpointed Caddy config; retain SQLite evidence. Windows Start/Stop scripts supervise only the owned bridge process. The bridge is not installed as a login task; run Start after reboot and keep Flockbay open on the pinned game.
# Maintained companion and qualified updates

See [the installed update verification and recovery record](UPDATE-VERIFICATION-2026-11-05.md)
for the tested source, live v1.0.31 installation, retained evidence and boundaries.

The companion is maintained separately from Brian's signed 20-file runtime.
Local branch `codex/companion-upgrade-gates` preserves the previous implementation
before changes. No source is automatically pushed to Brian's repository.

`npm --prefix experimental/flockbay-agent test` checks the companion. Full Linux
qualification uses `node experimental/flockbay-agent/qualify.mjs NEW_OUTPUT_DIR`.
Package Linux source with `git -c core.autocrlf=false archive`: the runner refuses
runtime bytes that differ from the published manifest. It checks updater, runtime,
real Unix sockets, documentation, companion normal/jitless, recovery and web-auth
fixtures, retaining group exit codes and hashed logs. Passing source checks is not
live browser/provider/game acceptance.

Host support in `host-support/` adapts only the fixed updater installation paths
to this Oracle host. The signed core remains unchanged. `guarded-update.mjs` is
the sole systemd update entrypoint for manual, button and timer checks. Root-owned
`/etc/picard-updater/compatibility.json` must approve the exact release, companion
code hash, Windows worker code hash and project pin, with all qualification
evidence and an expiry. New upstream releases are blocked until qualified.

Maintenance acquisition is transactional with mission admission and repair.
Running missions, unreviewed candidates and queued/sent/uncertain tool commands
prevent acquisition. The barrier survives restarts, never expires automatically,
and cannot be acquired by web sessions or worker credentials. Failed updates keep
the barrier; inspect journals, health, exact identities and history before explicit
operator release. Never clear uncertainty, renew a grant or replay a mission.

Operator CLI: `picard.mjs maintenance-acquire REQUEST.json` takes `{id,reason}`
with a fresh UUID. `maintenance-release REQUEST.json` takes the same `{id}`.
The ID is consumed after release and cannot be reused. `status` reports the
barrier, pending work and worker identity. A missing worker identity blocks update
qualification but does not remove existing inspection/proposal capability.

Update rollbacks restore code only, never older ledgers, markers or credentials.
The companion deployment keeps protected code/state checkpoints and explicitly
refreshes its recovery baseline only after readiness and history checks.

Automatic game execution and promotion remain disabled by owner choice until a
separately isolated Flockbay validator is provisioned. Patch candidates and bounded
repairs remain inert. A successful relay update is not game-code acceptance.

