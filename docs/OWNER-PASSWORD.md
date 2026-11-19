# Change the console password

In the signed-in console, open **System → Technical details**, then **Change
password** beside **Pause motion**, below the release fingerprint. Enter the current password and a new password twice. Password
managers can fill the current/new fields. Show passwords reveals them only in
the current dialog. Cancel, closing the dialog, and signing out clear its inputs.
After success, sign in again with the new password. All prior owner sessions
are invalidated. Jobs, reviews, provider credentials and tool credentials are
not modified. Forgotten passwords still require administrator recovery.

This is a fork source customization, not a host injection. After merging upstream:

```sh
node tools/owner-password/build.mjs
node tools/console-theme/build.mjs
node tools/owner-password/build.mjs --check
npm run test:console-theme
```

The recipe in `tools/owner-password/extension.mjs` uses exact compatibility
anchors and is idempotent. It stops on unexpected upstream structure. Review
upstream authentication changes even when anchors still match; never resolve a
conflict by blindly overwriting upstream code. Generated changes stay inside
the existing signed `oracle-service.mjs`; the 20-file artifact is unchanged.
The shared dialog works with Admiral, Captain/Engineering and Tricorder.

The POST `/auth/password` route accepts only `currentPassword` and `newPassword`.
It requires a valid owner cookie and same-origin request. Bearer clients have
no access. The current password is verified inside the existing authentication
lock with the existing persistent rate limiter. The new salted scrypt hash and
session revocation are written together using the existing atomic persistence
path. Password limits remain 8–128 UTF-8 bytes. No plaintext password is stored
or logged; the client never retries the operation automatically.

A rejected password or validation error leaves credentials unchanged. A storage
failure or lost response can be ambiguous if the atomic rename already happened.
The UI therefore tells the owner to try the new password first, then the old one,
rather than promising that a reported failure means nothing changed.

Linux qualification must run the owner-auth and console-auth-routes tests in
normal and jitless modes, as well as the full existing release checks. The theme
suite checks that the extension is installed and rejects a changed anchor.
Use `node tools/owner-password/preview.mjs` for local browser checks: it uses only
synthetic in-memory credentials (`fixture-old-password` initially) and starts
signed in. It is not a real authentication or live-host test. Validate desktop,
narrow layouts, mismatch, wrong current password, success, sign-in and cancellation.
Publish/install only through the existing signed and guarded release process.

The bounded console document ceiling is 296 KiB (8 KiB above the previous
288 KiB ceiling), with at least 1 KiB of tested headroom for both themes.
Oversized documents remain rejected; the signed artifact file set is unchanged.

## Password hash migration

New enrollment and password changes use scrypt N=16384, r=8, p=5 (32 MiB
allocation ceiling), an OWASP-listed configuration chosen to retain the small
VM's memory budget. Only the exact legacy p=1 and current p=5 profiles are
accepted; arbitrary stored cost parameters are rejected before hashing.
A successful legacy sign-in generates a fresh salt and upgrades the hash in
the same atomic write as the new session. Incorrect passwords never upgrade
the hash. Existing passwords and active sessions remain usable.

After migration, older releases that accept only p=1 cannot read upgraded auth
state. Do not roll back to those releases or restore an old auth backup as a
routine rollback: that can revive revoked credentials. Retain this compatibility
reader in rollback candidates and use an explicit operator recovery plan.
The source recipe is tools/owner-password/kdf.mjs; the normal password build
applies it and stops on changed upstream anchors. Host benchmarking uses only
synthetic input, never the real password or auth-state file.

### Synthetic host benchmark (2026-11-19)

On the enrolled .113 VM, three sequential hashes per profile measured
p=1: 149/118/124 ms; p=5: 529/599/593 ms. The benchmark read no credentials
and changed no configuration. Cumulative process peak RSS was approximately
88 MiB after the legacy samples and 120 MiB after the stronger samples; these
are whole-process peaks, not isolated KDF allocation measurements. A legacy
sign-in performs both verification and upgrade once. Password changes perform
two derivations. This small sample is not a concurrency or sustained-load test.
Reference: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
