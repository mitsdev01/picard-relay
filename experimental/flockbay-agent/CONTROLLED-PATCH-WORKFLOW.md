# Controlled Picard patch workflow

Implemented and tested 2026-11-05. This is a proposal-and-review boundary, not a complete autonomous game-development pipeline.

## Implemented

- `patch` missions bind exact source snapshots, SHA-256 hashes, writable files, named required checks, byte budgets and 0–2 repairs shared between structural failures and explicit reviewer feedback. Paths are restricted to explicit GDScript files in scripts/ or tests/. All contract fields are validated before dispatch.
- Groq uses strict JSON-schema output, without tools or streaming. It can propose one unique replacement per changed file. No arbitrary shell/tool requests are executed.
- Contracts are retained whole in each request; a repair receives fresh source and explicit validation feedback. Oversized contracts fail before spending a call. Rate quota and a conservative context admission ceiling are checked separately.
- Candidates remain inert, stored in full in mission.result and versioned in patch_artifacts. Reviewer feedback is durable, bound to the exact candidate digest and uses the same original deadline and total call budget. Duplicate repair requests do not spend another call. State becomes awaiting_validation, never completed. The working project is not edited.
- Native-tool `build` admission is disabled at the hosted API. Read-only inspection remains available.
- Rejection is durable and bound to the exact candidate digest. No acceptance/promotion endpoint exists while an isolated validator is unavailable.
- Existing exact-ID idempotency, durable pre-call reservation, stop/deadline checks, restart uncertainty and no provider-error retries remain.
- The local worker sends an independent single-flight heartbeat during long MCP calls. Large text results now mark truncation explicitly. Long-running heartbeat behavior still needs an integration soak test.

## Operator commands

Prepare an approved scope as a JSON contract containing version, files (path/content/sha256/writable), checks, maxPatchBytes and maxRepairs. Files must already be authorized for this provider. The CLI does not discover or upload arbitrary project files.

```powershell
node experimental/flockbay-agent/picard.mjs prepare --prompt-file prompt.txt --contract-file contract.json --out mission.json --mode patch --max-calls 3 --minutes 5
node experimental/flockbay-agent/picard.mjs start mission.json --approve
node experimental/flockbay-agent/picard.mjs show MISSION_ID
node experimental/flockbay-agent/picard.mjs repair review.json
node experimental/flockbay-agent/picard.mjs reject review.json
```

Review JSON contains id, candidateSha256 (SHA-256 of JSON.stringify(artifact.files)) and reason. Rejection never spends another model call. The web interface loads prepared patch mission JSON, displays source scope and before/proposed code, offers bounded repair and rejection, and links immutable candidate versions. Preparation uses the CLI. context-cli.mjs PROJECT REQUESTS.json OUTPUT.json collects explicit source ranges with full-source hashes locally; it never uploads them. It rejects traversal, symlinks, duplicate paths and oversized sources. Selected ranges are review context, not complete editable baselines; writable contracts still need the full exact source. Old Build submissions are refused with legacy_build_disabled_use_patch.

## Verification

- Windows: 55 passed, one Unix-socket-only test skipped.
- Linux normal and --jitless: 56 passed, zero skipped in each run.
- Repository docs:check passed.
- Real hosted Groq trial: 2935b6a7-058c-40b1-9370-b7f8a21bdc81, two calls of three allowed. First candidate failed exact replacement validation; one structural repair produced an artifact. No native-tool-generation error occurred.
- Independent review rejected the artifact: away branch retained simultaneous-hold language; dead/all-present branches omitted required counts and the dead branch omitted the hunt number. This is not a successful development task.
- Rejection was written through the authenticated control path; status returned rejected. The objective file remained at baseline SHA-256 721e42ed51996dbb0cda4b776fc9bd86dd881d4db4462993b9116af50b5233e3.
- Companion source installed on the host; local worker restarted and connected to the same pinned game. No original relay release, credentials, project pin, Git commit or game assets changed.

## Review-loop follow-up verification

- Hosted trial 6855d863-c910-47f9-abdf-acfe42f672df used three calls under one original mission/deadline: initial proposal plus two reviewer-requested repairs. All three artifacts were retained. No automatic new mission was created.
- Final independent review failed: dead and away branches omitted required counts and next Hunt number; dead branch cleared targets/details. Exact final digest b4593533553a446829bc5cf89c0c3003714db1f0a35119483baa24292ccb69c3 was rejected. The bounded repair mechanism worked; this is not evidence of reliable model coding accuracy.
- Local browser fixture verified repair budget decrement, durable rejection presentation, and desktop/390px layouts without horizontal overflow. API tests cover authenticated artifact retrieval. The signed-in hosted page showed the new interface and connected Flockbay bridge.
- New regression coverage includes repair idempotency, shared budgets/deadlines, active-mission exclusion, durable history/restart uncertainty, final-call failure termination, explicit source collection, owner authentication and CSRF.
- User confirmed only the current game instance is available. Automatic validation and promotion remain disabled.

## Remaining work before autonomous application

1. Provision a supported second Flockbay project/bridge with a distinct project pin and user-save directory. The available Flockbay tool catalogue has no project-clone/isolated-bridge provisioning capability. Do not substitute PATH Godot or repin the creator's active bridge.
2. Implement the actual isolated execution adapter, with baseline recheck, filesystem boundary checks and immutable acceptance tests. A folder copy alone is not verified process/save isolation. Candidate code needs an OS-enforced filesystem/network boundary; file-scoped edits alone do not confine executed code.
3. Bind trusted Flockbay check receipts to candidate hashes. `verifyAcceptance` currently validates receipt shape/matching checks only; it is not a trusted executor or proof that checks ran. Required check IDs are currently declarations, not runnable test definitions.
4. Connect actual isolated test failures to the bounded repair loop. Explicit reviewer feedback is implemented; executable test feedback is blocked on the isolated adapter. Rejection remains terminal.
5. Add conflict-aware promotion of accepted candidates, rereading the creator's current baseline immediately before any application, with recovery for partial application and durable phase checkpoints. No automatic promotion is implemented.
6. Add immutable executable test packaging and benchmark task definitions. Explicit line-range collection, bounded full artifact retrieval and the controlled-mission review UI are implemented; autonomous context selection is not.
7. Run restart/long-tool heartbeat and isolation fault-injection tests against the real separate bridge. Current unit/integration tests use fixtures except for the hosted proposal trial.
8. Run a repeated real-model benchmark after the executor exists. No 20-task benchmark or 95% success claim has been established. The current trial demonstrates safe rejection, not reliable coding accuracy.

Do not describe this release as foolproof or as fully autonomous development. The working safeguard is containment: failed model output cannot silently become an accepted game change.
