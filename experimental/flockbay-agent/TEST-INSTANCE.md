# Supervised test copy on this PC

Configured 2026-11-05. This is a separate project/save target, not an OS sandbox.

- Original: C:/Users/wju78/Flockbay Games/Wildwood Hunters
- Test: C:/Users/wju78/Flockbay Games/Wildwood Hunters - Picard Test
- Verified runtime user data: C:/Users/wju78/AppData/Roaming/WildwoodHunters-PicardTest
- Creator worker profile remains in state/flockbay-agent/worker.json.
- Test worker profile and ledger: state/flockbay-agent-test/. Credentials are referenced locally, not copied into the game or documentation.
- Start-Test-Bridge.ps1 / Stop-Test-Bridge.ps1 manage the test worker. Never run both worker profiles together.
- Hosted companion currently pins the test path. Original host configuration is backed up at /etc/picard-flockbay-agent/config.json.before-test-project. Both profiles use the same sequential hosted companion; mission history remains intact.

## Switching back to development

1. Confirm no Picard mission is running. Stop-Test-Bridge.ps1 pauses its worker.
2. Restore only the hosted companion's project pin to the original path, using the retained config backup as reference; preserve later unrelated configuration changes. Restart the companion when idle.
3. Open the original project using Flockbay Home or its documented --open-game folder --your-own-agent on command. Save any intended test edits first. Never overwrite the original with the whole test folder.
4. Verify flockbay_godot_status identifies the original path; then Start-Bridge.ps1. Verify Picard status matches too.

Switching to test reverses those steps with the test pin and Start-Test-Bridge.ps1. Opening a project alone does not switch the hosted pin. A mismatched worker is refused.

## Verification

Flockbay confirmed the test project and editor. Compilation: no errors in 283 scripts and 19 shaders (addons excluded). Rendered background main-scene boot succeeded; runtime returned the exact test project and separate user-data directory. Owned run was closed after the check. No candidate was applied. Automatic isolated validation and promotion remain disabled pending implementation; this copy supports supervised tests only.

Copy omitted .git, .godot, .flockbay, build and Flockbay project identity records. Game assets, authored scenes, scripts and runtime dependencies were retained; Flockbay opened the copy through its supported import path. The original project settings were preserved. The test copy is a snapshot of saved files, not a live sync.