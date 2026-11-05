# Fork release preparation - not enrolled or deployed

Owner: mitsdev01/picard-relay. Keep this PR draft until the remaining qualification is complete.
This branch includes the reviewed coding connector and its isolation fixes (80be355),
plus release preparation. It does not contain the unpublished Flockbay companion.
Preserve C:\src2\Picard-v2 on codex/companion-upgrade-gates at 4fc894d.

## Prepared

- Manual-only sign-fork-release.yml, constrained to this repository's main branch.
- Signing job disabled unless PICARD_FORK_RELEASE_ENABLED equals true; no push trigger.
- Dedicated picard-fork-release environment. Configure required reviewers and main-only
  deployment restrictions before enabling. A named environment alone is not an approval gate.
- Exact signing identity:
  https://github.com/mitsdev01/picard-relay/.github/workflows/sign-fork-release.yml@refs/heads/main
- Source publication: https://raw.githubusercontent.com/mitsdev01/picard-relay/main/releases/stable.json
- Existing Brian workflow, updater trust files and host configuration are unchanged.
- New fork manifests use version 2.0.RUN and sequence 1000000000 + RUN*1000 + ATTEMPT.
  This is a proposed sequence domain, not proof it exceeds this host's current counter.
- prepareForkTrust in scripts/prepare-fork-trust.mjs stages five exact string transforms
  in memory. It does not install anything or establish that its inputs are trusted.

## Required before publication and host enrollment

1. Review the complete PR, including connector credential boundaries and signing workflow.
   Configure branch protection and release environment approval restrictions. Do not enable
   the release variable, merge, dispatch or change host trust without owner approval.
2. Run complete Linux qualification on the final commit: root, updater, runtime, real socket,
   docs, connector normal/jitless and release preparation tests. Check the PR's CI result.
   A local synthetic build does not verify real GitHub OIDC signing or publication.
3. Integrate the final core candidate with a separate copy of the preserved companion branch.
   Do not publish private recovery evidence/configuration/logs. Run companion normal/jitless,
   recovery and owner-auth tests. Before publication this is source qualification only.
4. After approved merge, enable the variable and manually dispatch once. Record run URL,
   tested source SHA, publication commit, manifest hash, sequence and exact identity.
   Verify the real Sigstore proof using the proposed fork verifier. The envelope expires in
   seven days; requalify a fresh publication if it expires. Never extend signed bytes by hand.
5. Qualify the exact published envelope with the custom companion gate. qualify.mjs checks
   that all 20 runtime files match the envelope. Update compatibility evidence for the exact
   release/companion/worker/project identities; do not weaken that gate or reuse old approval.

## Coordinated host trust migration (not performed)

Inventory actual root-owned installed support files and record their hashes first. Capture
service readiness, busy/draining state, unresolved invocations, physical release, monotonic
highestSequence, ledger counts, configuration hashes and invocation-marker hashes.
Inspect existing STOP/HOLD/pending evidence; do not delete it to make migration proceed.

Pause scheduled updates under an approved maintenance procedure, preserving their prior
enabled/running state. Stage these five files outside installed paths using prepareForkTrust:

| Input name | Intended installed target |
| --- | --- |
| fetch-release.mjs | /usr/local/lib/picard-updater/fetch-release.mjs |
| run-once.mjs | /usr/local/lib/picard-updater/run-once.mjs |
| sigstore-verifier.mjs | /usr/local/lib/picard-updater/sigstore-verifier.mjs |
| guarded-update.mjs | /opt/picard-flockbay-agent/v1/host-support/guarded-update.mjs; verify actual unit path |
| policy.json | /etc/picard-updater/policy.json |

Use the actual reviewed installed inputs, not policy.example.json (which is disabled).
The staging helper rejects missing/unexpected pins, but is not a substitute for full-file hash
verification. Rehearse on isolated Linux copies first, including wrong repository/workflow/ref,
wrong commit, malformed signature, stale envelope and replay rejection with real verification.
Prove candidate sequence exceeds highestSequence. Never reset state.json. If it does not,
stop and review a new sequence strategy. Keep the 20-file allowlist, issuer, exact source-commit
pin, trusted root, schema, project pin and execution-disabled settings unchanged.

Install the coordinated support files/policy with existing ownership/modes/SELinux labels,
then the exact qualification record, under the existing maintenance barrier. Do not run the
unguarded run-once entrypoint as an alternative to guarded-update. Replace the untrusted inbox
through the fetch service; a cached upstream envelope is not valid under the new identity.
Resume only after signature/gate/readiness checks pass and record the physical installed hash.
Prepare support-file restoration before starting. After a higher sequence is installed, use a
reviewed forward release for code recovery; restoring the old feed alone may reject older builds.
Never restore the ledger, reset counters, clear uncertainty or renew requests as recovery.

## Connector enrollment and acceptance (separate approval)

Install only the supplied hash registry as a regular 0600 file, normally owned by the runtime
user so it can read it. Root ownership works only where that process can read it. Set only
BRIDGE_MACHINE_CLIENTS_FILE and restart once after release verification. Keep the raw token
on the laptop; do not regenerate it or copy Groq/SSH/owner credentials into the connector.
Verify unauthenticated denial, scoped access, revocation and owner behavior first. Do not
submit a real request or call Groq until the owner approves that acceptance test.

## Future upstream updates

Bring Brian's changes into a review branch, preserve fork-only signing and isolation tests,
and qualify both core and companion. Publish manually only after review. Do not overwrite
fork release publications with upstream stable.json or automatically authorize compatibility.
Source merged, envelope signed/published, host installed, live verified and owner acceptance
are separate milestones. This PR deliberately stops before those milestones.
