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

The theme is applied through `workspaceConsoleHtml(base, {theme: 'captain'})`.
`admissionConsoleHtml` accepts the same `theme` option and delegates to that
function when `workspaceEnabled` is true, including `npm run preview:v1` and
this fork's enrolled workspace runtime (`theme: 'captain'`). Legacy admission
and disabled workspace paths retain their existing presentation. Activation travels inside
the reviewed signed release, not through host-side injection. Merging source
does not itself sign, publish or install a release.

The generated document includes all inline styles, scripts and space scenery.
Theme tests enforce a 287 KiB UTF-8 review budget; the handler has a separate
288 KiB hard ceiling (`MAX_CONSOLE_DOCUMENT_BYTES`, unchanged by this follow-up). Each runtime source file stays under the
updater's separate 256 KiB per-file limit. Boundary tests cover the exact ceiling,
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

## Admiral and Captain appearance

The Settings (ellipsis) menu offers **Appearance: Admiral / Engineering** in both
workspace presentations, including the sign-in page. Admiral is the standard
upstream presentation bundled in this installed release; Engineering (internally
the `captain` theme) is this fork's presentation. Both share the same relay, authentication, requests, saved results
and earned ranks. Appearance names do not grant a rank or permission.

The fork defaults to Captain. A browser can remember its choice for one year in
`PicardAppearance`, a non-secret, SameSite=Strict preference cookie (Secure on
HTTPS). Only the exact values `admiral` and `captain` select a renderer. Invalid,
duplicate or oversized cookies use the configured default. This preference
never authenticates a request. No new route or remote asset is introduced;
each document receives its own existing size validation and CSP hashes.

Switching reloads the current URL, retaining its view/result reference and the
existing session. Visible unsaved input requires confirmation; switching is
blocked while a workspace operation is in progress. Saved work stays in the
ledger. Form text and passwords are never placed in preference storage. If the
browser cannot save the preference, the page reports that instead of reloading.
Space mode follows the existing reload behavior; appearance does not change
Stealth or motion preferences. Captain retains its own login/door presentation.

Maintain the standard renderer as the upstream baseline and keep Captain's
transform in `tools/console-theme/captain.mjs`. Test both documents and their
CSP/authentication behavior when merging upstream. The selector does not fetch
new upstream code or switch deployments. Local preview exercises both renderers
regardless of which `PICARD_PREVIEW_THEME` is selected as its default.

The theme regression suite also compares form controls, navigation bindings and
accessibility attributes across both presentations. This runs in fork release
qualification and signing, alongside the shared-script and generated-theme checks.

## Upstream cockpit integration

Captain door and panel transitions follow the shared cockpit state. Stars remain
a separate saved preference, so hiding stars does not close the doors or hide
controls. Login opens the Captain cockpit while retaining that preference;
sign-out clears private state before closing it. Native Codex Savings uses the
same authenticated data and rendering in both themes.

## November 12 upstream integration

Captain keeps its vertical navigation at widths of 901px and above; smaller
windows use a burgundy compact navigation bar. The upstream folding-deck
controls retain their IDs and shared behavior: Captain places the cockpit
button in its header and windshield preferences in Settings. The reading deck
stays inside Captain's viewing window, preserving its doors and login/logout
presentation hooks. Admiral retains the upstream layout.

Captain's composed CSS is whitespace-compacted without changing quoted strings
or application scripts. The security handler remains bounded at 288 KiB and
theme tests enforce a 287 KiB review budget; future upstream growth must pass
that check before publication.

The fork's existing machine-client draft bindings retain their durable keys.
New upstream tool credentials use a separate `tool-client` namespace to avoid
colliding with those bindings. Restart/revocation coexistence tests cover both;
this source merge does not enroll a tool or grant additional laptop scopes.

### Captain cockpit framing

Captain owns its cockpit shell geometry as well as its reading window. At desktop
and laptop widths it retains the two-column grid, header and privacy footer when
cockpit mode opens. Its instruments use a flat burgundy panel; Admiral's curved
dashboard and arc positioning remain exclusive to Admiral. Shared navigation,
readouts, authentication, five-click badge toggle and motion preferences remain
unchanged. Narrow screens wrap the instruments and allow vertical scrolling.

When checking a theme update, enter cockpit mode before measuring layout: the
Captain window must have nonzero width and height, the header must stay above it,
and open reading panels must remain above the instruments. Exercise System and
Jobs, close/reopen panels, toggle cockpit twice, and resize across 900/901px and
1100px. Checking the normal workspace alone does not cover cockpit's CSS cascade.

## LCARS 47 redesign

The menu shows this presentation as **Engineering**. Only the visible label
changed: the theme option, cookie value, CSS class and source file keep the
`captain` identifier, so saved preferences and compiler contracts still apply.
Rank names (including the Captain rank) are unchanged.

Captain was rebuilt as a flat, Okuda-style LCARS console in
`tools/console-theme/captain.mjs`; the previous layered stylesheet was replaced,
not extended. The application script, IDs, form contracts, both authentication
hooks and the compiler anchors are unchanged, so the existing theme regression
suite still applies.

- **Frame:** a full-height block column (insignia elbow, five coloured view
  blocks, a black commission slab with a red edge bar and blue/red/gold code
  block, lower elbow) joined to top and footer rails by
  concave fillets. Type uses locally installed condensed faces only
  (Antonio, Bahnschrift, Arial Narrow, Roboto Condensed); no font is downloaded.
- **Panels:** overview cards, cockpit reading panels, the settings menu and the
  sign-in card use bracket borders with cut-in titles. Counts are coloured
  readout tabs; rank progress is a segmented bar.
- **Sign-in:** keeps the burgundy command frame while signed out. The card uses
  the overview bracket, striped heading rule, outlined password field and pill
  status; the left rail shows the access readouts as coded keys like the navigation.
- **At-a-glance layout:** on screens at least 1101px wide, Overview is a
  one-screen dashboard: a compact header, Relay status beside Your progress,
  the five readouts, then Recent activity beside Savings. The activity list
  scrolls within its panel; on short screens the dashboard scrolls inside the
  frame instead of overlapping. System uses columns (runtime and updater, with
  upstream beside them). At 1440x900 and 1920x1080 every view fits without
  scrolling; narrower screens fall back to a single scrolling column.
  The cockpit Overview panel uses a denser three-column grid: a one-line
  heading (eyebrow, intro and the duplicate New request button are hidden there,
  since the cockpit tray carries New request), then Relay status, Your progress
  and Recent activity side by side, the five readouts, and a one-line Savings
  strip. It fits the panel at 1440x900 and 1920x1080 (extra height goes to the
  activity list); 1280x800 scrolls about 130px inside the panel, and 1100px and
  narrower keep the single scrolling column.
- **Doors:** bridge-door panels with LCARS lock plates (DECK 01 / MAIN BRIDGE,
  ACCESS RESTRICTED while signed out, ACCESS GRANTED while opening). Opening uses
  a short unlock hitch. The doors sit above the cockpit panels while moving, so
  the deck is revealed by the doors rather than a separate fade. Leaving the
  cockpit keeps the space view in front until the doors meet; the doors then
  dissolve to reveal the LCARS workspace. On a fresh page load the workspace
  appears immediately, and Pause Motion or reduced motion skips the dissolve.
- **Warp-in:** a brief decorative streak burst plays when the cockpit opens with
  stars and motion enabled.
- **Warp core (condition):** a small horizontal warp core with blue plasma
  rings and a reaction chamber; with motion on, a pulse runs in from both ends while
  the chamber swells to meet it. Its casing and label use the condition colour, derived only from
  existing state. WARP CORE STABLE (green) requires a good health tone; a
  non-good tone or an unknown/uncertain route phase shows WARP CORE UNSTABLE
  (yellow); a failed route phase shows WARP CORE CRITICAL (red, flashing). It restates visible status and is not a
  separate monitor.
- **Warp core status screen:** the header warp core is a native disclosure
  (`details`/`summary`). Opening it replaces the
  inner frame with a status screen and an animated vertical core: blue matter and red
  antimatter flow toward a pulsing chamber. Condition (NORMAL / CAUTION / CRITICAL),
  Relay service, Relay cycle and Plasma stream (CONST, or HELD with motion paused)
  follow existing state; the other readouts are fixed decoration. Select the core
  again, or any navigation key, to return; a navigation key also opens its view.
  That close is a third presentation-only script hook (`CAPTAIN_CORE_CLOSE`), registered
  before the shared navigation listener and checked by the theme tests. Hidden while signed out and in Stealth; static with motion off.
  A WARP PROPULSION rail and a column of LCARS keys (Telemetry … Emerg core eject)
  frame the core; they are decorative blocks, not controls, and hidden from assistive
  technology. On narrow windows the keys wrap into rows below. On desktop the text
  scales to the panel height (a CSS container query); panels with at least 470px of content height add
  six more decorative readouts (Phase inducer … Core frequency).
- **Job readouts:** with motion on, a light chases along the Queued → Running
  → Completed tabs while Running is above zero, Queued/Running numerals pulse
  while non-zero, and Uncertain/Failed tabs blink while non-zero. When the shared
  counter rolls a digit, its tab flashes (count up) or dims (count down). These
  are CSS reactions to the existing counter DOM (`aria-label`, the reel's
  `data-direction`), not per-job tracking, and stop with Pause Motion, reduced
  motion and Stealth.
- **Settings menu:** Appearance comes first, then compact tool rows with line
  icons (simplified from Lucide, ISC licence) instead of full-width pills,
  ending with a red Sign out row. The Appearance and Auto stealth dropdowns,
  and the Jobs and Requests dropdowns, are outlined pills in the same blue type. The rows are Workspace and Stars (cockpit only),
  Pause motion, Stealth (its tip gives the Alt+Shift+S shortcut) with Auto as the
  right half of the same split row (its setting opens below it), Documentation (its tip says it opens a new tab),
  Windshield readout (file-chart-line icon; cockpit only, after the readout is dismissed, and its tip says it
  brings the readout back), Feedback, Replay walkthrough and Sign out (log-out icon). Hovering or keyboard-focusing a row shows a short tip to the left of
  the panel. Icons are inline SVG marked `aria-hidden`; each control keeps its
  own text or `aria-label` as its name, and #motion's icon sits beside the
  button because the shared script rewrites that button's text. The tricorder
  sheet uses the same icons with visible labels and no hover tips.
- **Decoration:** the number block in the commission slab, the nav codes and
  the viewer label are fixed build-time decoration, marked `aria-hidden`, and
  never represent telemetry.

Stealth turns Engineering into the same plain Work Console that Admiral uses.
Every LCARS rule is scoped to non-stealth state, so the shared stealth styles
apply unchanged; Engineering only hides its own extra markup (rails, codes,
condition label, doors, scenery, route diagram, commission slab) and shows
"Overview" instead of the bridge greeting. Resume display is in the settings
menu, alongside the Alt+Shift+S shortcut. The theme compactor keeps a space
before ":" so shared descendant selectors such as
`[data-stealth=true] :is(...)` are no longer collapsed; previously several
shared stealth and cockpit rules were silently ineffective in this document. Pause Motion and reduced-motion preferences stop
the door transitions, warp, blinking codes, route pulse and star drift; the
doors still reach the correct open or closed position. Most rules are written
with native CSS nesting under `.console.captain`, which keeps the composed
Captain document within the 287 KiB review budget. The Engineering build drops shared rules whose selectors name a class it has
removed from the page (for example `sidebar-foot` and `display-rail`), and fails
if one of those classes reappears in the markup or script. Because the shared script sets `data-cockpit`, `data-stealth`,
`data-starfield` and `data-hud-expanded` only to true or false (markup literals
or `String(boolean)`), the Engineering build writes `[data-cockpit=true]` as the
equivalent `[data-cockpit^=t]` (same matches, same specificity) and fails if the
script assigns either attribute another way. CSS rule order is retained; no same-selector or media-block reordering is performed. The starfield path
lists stars left to right as short relative moves.

Local check (fixture data only): 1440, 1024, 900, 390 and 320 px; all five
views; cockpit toggled both ways; Jobs, Requests, Groq and System panels opened;
sign-out and sign-in; settings menu; Stealth; reduced motion; five-click
insignia; Admiral unchanged; no horizontal overflow and no script errors. With
`PICARD_PREVIEW_ACCEPTED_RESULTS=25` the preview reports "Progress not checked"
in both appearances; that is a preview-fixture behaviour, not a theme change.

## Tricorder (mobile Engineering)

Phones and tablets get Engineering as a hand-held "tricorder": a gunmetal
device shell with a flip lid (insignia, status lights, rank pips), a recessed
main screen that is the only scrolling area, a five-key keypad (the real view
buttons, labelled OVR, JOBS, REQ, GROQ and SYS) and a Refresh / settings row.
The lid is closed while signed out and flips open once the shared sign-in
completes. The lid's number row steps through fixed build-time values at a
different rate per code; it is decoration, never telemetry. On a phone held sideways, the lid and keypad sit beside the screen.

It is a separate document compiled by `tools/console-theme/tricorder.mjs` from
the Admiral document, so it has its own size budget (about 219 KB, under the
250 KB tricorder test limit) and its own CSP hashes. Its application script is
byte-identical to Admiral's and has no authentication hooks. Desktop cockpit
rules are removed from its stylesheet, so a saved cockpit preference cannot
change the hand-held layout; Pause motion and Stealth move into the settings
menu. Stealth gives the plain Work Console. Pause motion, reduced motion and a
hidden tab stop the light, scan and lid animations.

**Selection (presentation only, never an access decision):**

- `PicardAppearance=tricorder` (the **Engineering · Tricorder** appearance
  option, shown only in Engineering and the tricorder) forces the tricorder on
  any device. This is the testing flag.
- `PicardAppearance=captain`, or no valid appearance cookie when the default
  document is Engineering, serves the tricorder when the request reports
  `Sec-CH-UA-Mobile: ?1` or a User-Agent matching
  `Mobi|Android|iPhone|iPad|iPod|Tablet|Silk|Kindle` (header at most 1024
  characters). In that case the Appearance menu still shows "Engineering".
- Admiral is never replaced.
- Known gap: an iPad in desktop-site mode reports a Mac User-Agent and is not
  detected; choose **Engineering · Tricorder** there.

`createConsoleHandler` accepts `htmlThemes` with `admiral,captain` or
`admiral,captain,tricorder`, plus optional `htmlMobile:{captain}`; the runtime
composes both. The preview accepts `PICARD_PREVIEW_THEME=tricorder`.
`npm run test:console-theme` runs `tricorder.test.mjs`, which covers document
size, preserved IDs, scripts and form contracts, removal of cockpit rules,
anchor failures, bounded detection and every selection case.

Local check (fixture data, in-app browser): Android phone emulation at 375x812
and 320x640 (served automatically), the forced option at 812x375 landscape,
768x1024 and 1440x900; all five views; settings sheet; sign-out (lid closes, sign-in on
screen); Stealth on and off; switching Tricorder → Engineering → Admiral and
back; no horizontal overflow and no script errors. Real iOS Safari and Android
Chrome have not been checked.

## Operations layout (2026-11-19)

Shared markup and script (both appearances): presentation of already-observed
state only. No new request, approval or provider path.

- **Request routing** on Overview: Coding client → Your approval → Picard Relay →
  Groq → Your review. The current stage comes from the existing route phase and
  workspace state: a draft is *Your approval* (no provider call yet); queued or
  claimed work is *Picard Relay*; an active call is *Groq*; a saved, unreviewed
  result is *Your review* (after the call). Failed and uncertain outcomes use warning colors; blocked and cancelled states do not imply a provider call. "Open job", "Open request"
  or "Review result" opens the current item. When idle, the health pill is the
  one ready status. The stage pulses only while work is queued, claimed or
  invoking, and never with Pause motion or reduced motion.
- **Counters** are buttons when nonzero and open Jobs filtered to that state
  (new filters: Queued, Running, Uncertain, Failed). Zero counts are dimmed.
- **Savings** distinguishes *Connect Codex* (no telemetry), *Awaiting usage*
  (connected, no complete comparison) and the existing estimate; a missing
  measurement never shows as zero. The estimate is the existing Codex-credit
  calculation.
- **Jobs**: 65/35 list and inspector (Engineering); the inspector shows title,
  state, stored result and the reason first, with *Open request* for the input,
  saved result and review, then the reference and timestamps. Job rows carry no
  review outcome, so it is reached through Open request. On narrow screens the
  inspector is a bottom drawer with *Close details*. Keyboard focus stays on the
  same job across live refresh.
- **Requests**: form beside a summary (model, attached context, limits); the
  Review request action stays visible on short desktop viewports; the review step
  states that approving sends the exact input to Groq once.
- **Groq** leads with availability, model and the last recorded job from loaded
  jobs, with a link to that job. Latency and rate-limit details are not recorded
  by this relay, so they are not shown. The duplicate queue counts are hidden.
- **System** shows one status per area (runtime health, updater reporting,
  upstream check) beside the existing actions; versions, commits, source
  identities and the release fingerprint are under *Technical details*.

Engineering styling: command-burgundy frame, peach primary actions, condensed
LCARS type for labels and commands and a normal-width face (15 px) for titles,
descriptions, timestamps and form content, and one status palette shared by
counters, activity, the Jobs table and the inspector. The warp core stays.

## Follow-up integration verification (2026-11-19)

Reapplied to fork main after PR #22, retaining public-trial controls, the newer
completed-result rank accounting, exact approval/handoff checks, and savings
quality accounting. The existing 288 KiB handler ceiling and 287 KiB theme
review budget remain unchanged. CSS rule order is preserved.

Local Linux Node 24.22.1: updater, full signed runtime, Unix sockets, docs and
theme suites passed. Added routing regressions cover draft approval, result
review, blocked/cancelled presentation and read-only navigation. Browser checks
used a synthetic local fixture: Engineering desktop views and counter/inspector
controls, System technical identities, Tricorder at 390 and 320 CSS pixels
without horizontal overflow, and switching back to Admiral. No provider calls
or live installation are part of these checks.
