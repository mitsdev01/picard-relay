# Captain's Console

Approved local design, prepared for release; not yet installed on the live relay.
The enrolled workspace runtime explicitly selects Captain. No provider calls
are needed to preview it.

In PowerShell, run:

```powershell
$env:PICARD_PREVIEW_THEME = 'captain'
$env:PICARD_PREVIEW_ACCEPTED_RESULTS = '1'
npm run preview:v1
```

Open the printed loopback address and select Overview. All results and reviews
in this preview are synthetic. Other preview processes may need a different
`PICARD_PREVIEW_PORT`. Five insignia activations toggle the existing space mode.
The decorative door halves reveal space inside a bounded central window, below
the top rail and above the privacy footer. The sidebar and surrounding frame
stay in place; forms and application handlers are not cloned. Reduced motion,
Pause Motion and hidden-tab behavior are retained. Check the spinning insignia
with normal motion enabled after testing reduced-motion emulation.

## Source and update boundary

Edit `tools/console-theme/captain.mjs`, then run
`node tools/console-theme/build.mjs`. Its deterministic output is embedded in
the existing signed `admission-ui.mjs` module. No runtime import, public asset
endpoint, remote font, host injection or extra artifact path is introduced.
The compiler checks exact structural anchors and required IDs; an incompatible
upstream UI throws instead of silently producing a partial theme. This is a
bounded contract, not a guarantee against every possible upstream change.

`npm run test:console-theme` checks generated output, structural compatibility,
preserved application IDs and scripts apart from two explicit authentication
presentation hooks, and the document-size boundary. Both fork
PR and publication checks run it. Browser validation remains required after an
upstream merge: five views, desktop/narrow sizes, auth and unknown states, drafts,
five-click gesture, keyboard access, motion preferences and console errors.

Captain opens the doors after login and authenticated status validation, then
fades in the center controls. Returning to authentication (including sign-out)
closes the doors and restores the login panel. Private state is cleared before
the closing animation; session revocation is never delayed for presentation.
The standard theme retains its existing behavior. Exact compiler anchors and
regression tests guard both presentation hooks against upstream changes.

The theme uses `workspaceConsoleHtml(base, {theme: 'captain'})`. The composition
API defaults to `standard` for upstream compatibility; this fork's enrolled
workspace runtime explicitly passes `captain`. Legacy admission and disabled
workspace paths retain their existing presentation. Activation travels inside
the reviewed signed release, not through host-side injection. Merging source
does not itself sign, publish or install a release.

The generated document includes all inline styles, scripts and space scenery.
Theme tests enforce a 192 KiB UTF-8 review budget; the handler has a separate
256 KiB hard ceiling (`MAX_CONSOLE_DOCUMENT_BYTES`). This leaves at least 64 KiB
between the build budget and runtime rejection, rather than letting styling
consume the entire runtime allowance. Boundary tests cover the exact ceiling,
one byte above it, and multibyte text. CSP hashes, authentication, same-origin
policy and no-store behavior are unchanged. Superseded theme rules have been
removed or folded into their original declarations; the dashboard layout is
preserved.

Space mode uses three deterministic inline SVG star layers, slow CSS drift,
a softly lit decorative planet and a framed observation window. The instrument
tray reuses existing authenticated status and actions. Scenery is explicitly
decorative, not navigation or sensor telemetry. No images, remote assets,
provider calls or additional application scripts are introduced. Drift runs
only with space mode and motion enabled; reduced motion makes it static.

## Rank audit and corrections

Cadet is uncommissioned; verified setup earns Ensign. Reviewing a saved result
earns Lieutenant, including a changes-requested review. Higher ranks count
distinct completed information results whose latest output-bound review is
accepted: Commander at 5, Captain at 25, Admiral at 100+. Repeated acceptance of
one result adds no credit. Withdrawing acceptance can reduce rank. Counts are
owner-scoped, span tasks and history pages, survive restarts, and fail to unknown
when evidence is invalid. They authorize no execution or provider activity.

Two presentation issues were corrected: saving a review now refreshes earned
credit immediately through a read-only config request (after any older config
read settles); and graduated users see progress toward the next rank instead of
a permanently complete three-step training bar. Failed credit refresh displays
unavailable milestones while retaining the saved review. No second rank ledger
or new rank thresholds were introduced.

The preview is ready for visual review, not a claim of live acceptance. Full
signed-artifact qualification and host installation are separate release steps.

## Reference-layout refinement

The route diagram follows observed activity: a prepared draft highlights the
client for owner review, queued/claimed work highlights the relay, and invoking
highlights Groq. A selected request takes precedence over aggregate relay counts;
the caption identifies which is shown. Overview polls active selected requests
through the existing read-only request path. Unknown/stale reads and uncertain
outcomes stop the animation; motion preferences remain effective. Client-side
file discovery is not reported by this protocol and is not simulated. Short
states can occur between observations and are not artificially replayed.

The opt-in theme now moves the existing refresh/account controls into a top
rail and the existing next-action button beside the greeting. It reuses their
IDs and handlers, rather than adding synthetic status or a hard-coded review
action. The sidebar has a larger insignia and rank-aware decorative pips. The
status diagram sits beside readiness details on wide screens, and the rank bar
is segmented. All five views fit at 320, 390, 1024 and 1440 CSS pixels in the
local browser check; an unfinished draft survived the five-click space toggle.
