# Trusted workspace tasks from Cursor

The connector can live in one checkout while a task targets an independently
enrolled repository. No Oracle SSH key, owner
cookie or additional relay permission is needed. The cloud relay still returns
inert proposals. The optional **local connector** performs scoped file edits
and runs the owner's exact enrolled test commands on the laptop.

## Enroll on the laptop

Keep the existing `PICARD_CODING_CONFIG`, token and request journal unchanged.
Create a private directory outside every coding workspace for transaction state,
and a private `workspaces.json` alongside the existing coding config. Use
[the disabled example](../tools/coding-connector/workspaces.example.json) as a
starting point; use the actual user profile and repository paths. Existing paths
must be absolute and canonical, without symlinks/junctions. Workspaces cannot
overlap each other, the connector checkout, credentials, journals or state.

Each workspace has an explicit id, root, `allowApply`, and `testCommands`.
For example, an enrolled command has this shape:

```json
{
  "id": "unit",
  "executable": "C:\\Program Files\\nodejs\\node.exe",
  "args": ["--test", "test/badge.test.mjs"],
  "timeoutMs": 60000
}
```

This is a shape example, not a claim that your repo has that test. Inspect the
repo's actual test scripts and choose relevant tests, type checks and builds.
For npm on Windows, use the installed `node.exe` with the absolute `npm-cli.js`
path followed by fixed arguments such as `run`, `test:unit`; do not use
`npm.cmd` or a shell command string. For PowerShell, enroll its absolute executable
with explicit `-NoProfile`, `-NonInteractive`, `-File` and the reviewed script path.
Commands always start at the enrolled repository root. There are no caller-supplied
arguments, substitutions or command strings. Enroll multiple commands if needed.

Set `allowApply: true` only after reviewing those exact commands. At least one
command is required for apply mode. The model cannot enroll workspaces or tests
through MCP. Changing enrollment invalidates existing tasks, preventing a saved
task from silently gaining different paths or command authority.

Restrict the registry and state directory to your Windows account (with the
usual SYSTEM/administrator recovery access). Keep them out of Git, shared folders
and cloud synchronization. On POSIX the registry must be owner-only. Backups and
bounded test logs can contain private source or output; never upload them.

Validate the file locally:

```powershell
node tools/coding-connector/workspace-setup.mjs validate "$env:PICARD_WORKSPACES_FILE"
```

Add `PICARD_WORKSPACES_FILE` pointing to that absolute private file in the
existing `picard-coding` MCP server's environment, alongside
`PICARD_CODING_CONFIG`. Preserve other MCP servers and reload Cursor. Check
`picard_workspaces`: it must show the intended root and enrolled test names.
Without this environment variable, only the original four proposal tools appear.
An invalid enrollment never falls back to editing the relay repository.

## One finite coding task

1. **Discover:** `picard_workspaces`, then `picard_workspace_discover` by symbols,
   UI text, imports, callers and tests. Discovery returns paths, hashes and matching
   line numbers, not a proof that every affected file has been found. Cursor should
   inspect the real source and choose a bounded change scope.
2. **Prepare:** `picard_workspace_prepare` with `workspaceId`, title, requestText
   and `files`. Every file has `path` and `writable`; existing files may specify
   inclusive `startLine`/`endLine`. Read-only dependencies supply context without
   granting write access. A new file must be declared with `create: true`, and its
   parent directory must already exist. The connector backs up full original bytes,
   even for excerpts, and binds full-file hashes to the durable task id.
3. **Submit:** Within the user's authorized task, call `picard_workspace_submit`
   once. Preparation shows the exact context; no truncated context is accepted.
   The request is grounded in the selected excerpts and requires structured JSON.
4. **Collect:** `picard_workspace_collect` reads the same saved result until it is
   available. It validates the result digest, file scope, base hashes and exact,
   unique edit anchors inside the supplied excerpts. One leading `[Groq / model]`
   attribution line is removed before the body is parsed as JSON. If that parsed
   search text is absent from the file and decoding one layer of visible `\r`,
   `\n`, and `\t` sequences produces a unique anchor inside the excerpt, the
   decoded anchor is staged. Unknown files,
   invented types in unsupplied files, malformed output and insufficient context
   are rejected.
   Semantic correctness still requires review and meaningful tests.
5. **Apply and test:** `picard_workspace_apply` runs the enrolled tests on the
   baseline first. If they pass and snapshots still match, it journals each write,
   applies the staged edits and runs the same tests again. Passing changes remain
   in the original files for review. No automatic commit, push or deployment occurs.
6. **Recover:** A failed post-change test triggers rollback. Only a file still
   matching this transaction's candidate is restored; a newly created file is
   removed only if it still matches. Concurrent edits are retained and reported as
   `recovery_required`, with original backups preserved. `picard_workspace_recover`
   can recover interrupted file writes or cancel an unapplied task. It never renews
   or deletes a remote request. An interrupted test requires operator process review
   before recovery, because a child may still be running. Do not delete lock/state
   files to force a retry.

Use `picard_workspace_status` for local state. After preparation errors reuse the
returned `taskId` with only `workspaceId` and `taskId`; after submission uncertainty
use collect, never submit again. There is one active task per workspace and a
separate operation lock. The connector does not automatically repair, expand scope,
mint another provider request or rerun a failed/uncertain test invocation.

## Limits and what backups cannot do

- At most eight selected files, 512 KiB per original file, 4,000 context characters
  and 12,000 combined encoded input bytes. Select smaller excerpts when necessary;
  the workflow stops instead of giving Picard incomplete text. Output remains one
  4,096-token proposal. Large refactors need separately scoped tasks.
- One unique-anchor replacement per existing file, or explicitly declared creation.
  Deletes, renames, new directories, binary files and arbitrary patch commands are
  not supported. BOM/CRLF bytes and original permissions are preserved on rollback.
- Existing uncommitted changes are included in backups. This is not `git reset`.
- Hash checks and cooperative locks protect ordinary concurrent editing; they are
  not an OS-level compare-and-swap guarantee against a hostile process racing writes.
- Local tests execute code with your account privileges. A fixed command can still
  load modified source, npm scripts, plugins or test hooks. These are **not sandboxed**.
  Backups do not undo database changes, network requests, changes outside selected
  files, package installation, or background processes. Use foreground, non-mutating
  checks, synthetic data and no production credentials. Inherited environment is
  limited, but this does not prevent a process reading credentials on disk.
- Test timeouts attempt to stop the child process tree. Detached/background processes
  and effects outside the workspace require operator review. Crashes, conflicting
  writes or failed restoration stop for recovery rather than claiming success.
- Secret-path and key-pattern exclusions are defense in depth, not a guarantee that
  source contains no secrets. Review selected context before sending it to the relay.

## Cursor task instruction

> Use the trusted-workspace tools for the enrolled EasyJob workspace. Discover and
> inspect the actual implementation, its callers and relevant tests. Prepare one
> small task with explicit writable files and read-only context excerpts. Check that
> the payload contains the real source and is not truncated. For this task you may
> submit that exact draft once, collect and validate its structured edits, then apply
> and run the enrolled local checks. Preserve existing work. Report test outcomes and
> the backup/task id. Stop on uncertainty, invalid output, insufficient context,
> baseline failure or recovery conflicts; do not invent a replacement request or
> bypass the transaction with direct edits.

This feature requires the new connector on the laptop and explicit local enrollment.
It does not change the live relay, its bearer scope, signed bridge, owner permissions,
Flockbay companion or disabled game execution settings.
