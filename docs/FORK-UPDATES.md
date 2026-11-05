# Fork updates with the Flockbay companion

This fork keeps the coding connector and companion source in version control.
The companion is a separately installed service, not an extra module in the
20-file signed core artifact. Credentials, configuration and durable ledgers
remain on the host, outside Git and outside the core artifact.

## Source and publication

Merge upstream through a review branch while preserving fork-only changes.
The required `check` job tests the connector, core and companion; the manual
fork signing workflow repeats companion and recovery tests before publication.
These are source checks, not permission to install a release.

The `companion-compatibility.yml` source workflow intentionally does not use
`releases/stable.json`: an upstream merge can bring an upstream envelope whose
runtime differs from this fork. Exact artifact qualification remains the job of
`experimental/flockbay-agent/qualify.mjs` in an isolated Linux checkout after the
fork publication is verified and copied into that checkout's releases directory.

The enrolled host follows the fork's `release-feed` branch. Its signing identity
is the fork's `sign-fork-release.yml` on `main`, with an exact source-commit pin.
Keep `PICARD_FORK_RELEASE_ENABLED` false except for a deliberate publication.
Do not rerun the one-time trust migration for ordinary updates.

## Install one qualified release

1. Verify the actual fork envelope, signature, expiry and increasing sequence.
   Compare all 20 canonical LF runtime files with the reviewed source.
2. Run all eight qualification groups on Linux/Node 24 with the installed
   companion and host-support code. Retain report and log hashes. Connector and
   browser checks supplement this report; no provider call is needed.
3. Check host readiness, pending/uncertain work, STOP/HOLD evidence, physical
   release, companion and worker identities, project pin and execution settings.
4. Preserve a private checkpoint and consistent database backups. Append only
   the exact release/companion/worker/project qualification to the root-owned
   compatibility policy, expiring no later than the signed envelope.
5. Use the existing guarded updater. Never bypass its maintenance, signature,
   monotonicity or post-install checks. Preserve credentials, token registry,
   owner authentication state, saved jobs, reviews and consumption evidence.
6. Verify physical installed bytes, unchanged durable history and configuration,
   companion readiness, authentication denials and the authenticated console.
   Keep isolated game validation and promotion disabled until separately enrolled.

If the guard stops, inspect its evidence and retained maintenance barrier before
recovery. Do not clear uncertainty, restore an older ledger, or replay a request.
Report source merged, signed publication, installation, browser verification and
owner acceptance as separate milestones.
