# Picard LCARS companion (terminal)

Windows-focused terminal flow for one trusted-workspace coding mission: the operator picks an enrolled workspace, types the mission, runs **Cursor**, **Codex**, or **Claude Code** in print mode with only the `picard-coding` MCP server, then uses the **terminal** (not the agent) to collect, apply, show `git diff`, and optionally POST a Captain-console review.

## Prerequisites

- **Node.js 24+** and **Git** on `PATH`.
- **Windows Terminal** (`WT_SESSION`) for LCARS ANSI colors; plain conhost still works without colors.
- **npm install** at the Picard **repository root** (no extra UI npm dependencies; see [README for operators](../tools/picard-tui/README-OPERATORS.md)).
- A **laptop coding client** file (`%USERPROFILE%\.picard\coding-client.json` by default) and **trusted workspaces registry** (`%USERPROFILE%\.picard\workspaces.json`); see [Trusted local workspaces, tests and recovery](TRUSTED-WORKSPACES.md) and [Cursor coding connector](CURSOR-CODING-CONNECTOR.md).
- One of: `agent` (Cursor CLI), `codex`, or `claude` on `PATH`. Codex is **not** listed if its help implies MCP only works with `--dangerously-bypass-approvals-and-sandbox` in read-only mode; that path is refused.

On Windows, `where agent` may resolve to `agent.cmd`. The TUI runs `cmd.exe /d /c` with **the `.cmd` path as its own argv token** (plus args), matching Node’s documented pattern—no `shell: true` + argv (no `DEP0190`), and no hand-built quoted strings that CMD can mis-parse as `'\"…\\agent.cmd\"'`.

The **Cursor** CLI must be signed in: run `agent login` in a normal terminal, or set **`CURSOR_API_KEY`** for non-interactive use. If you see `Authentication required` in **Agent stderr**, do that first; Picard never puts API keys in MCP config.

The TUI writes `<workspace>/.cursor/mcp.json`, then runs **`agent mcp enable picard-coding`** and **`agent mcp login picard-coding`** (stdin sends a newline; stdio MCP has no OAuth) before **`agent -p`**. The print invocation passes **`--approve-mcps`** (MCP server approval) and **`--auto-review`** (Smart Auto: classifier auto-runs tool calls it considers safe) by default so headless runs are less likely to stop on the first Picard tool call. Disable with **`PICARD_TUI_CURSOR_APPROVE_MCPS=0`** or **`PICARD_TUI_CURSOR_AUTO_REVIEW=0`**. If a tool is still blocked, **`PICARD_TUI_CURSOR_YOLO=1`** adds **`--yolo`** (alias `--force`; use only if you accept broader automation). Enable plus login is still required for some setups. If tools are still missing, run **`agent mcp list-tools picard-coding`** in the workspace root.

When agent stdout shows no relay task (e.g. **`taskId: none`**, tools not callable, or **`picard_workspaces` rejected**), the TUI **skips the long connector poll** and offers optional manual task entry instead of waiting for `activeTaskId`.

**Why it looks idle:** `mcp enable` / `mcp login` still use a blocking CLI call, so there is no output until each finishes. The **`agent -p`** step uses async spawn and prints a **heartbeat about every 5 seconds** (`PICARD_TUI_CURSOR_PRINT_HEARTBEAT_MS` overrides the interval) until the process exits.

**Why the relay can finish before the terminal moves on:** The relay may complete while the Cursor CLI is still running (for example waiting on follow-up turns or leaving MCP child processes open). In mission flow the TUI **polls local task state only** while `agent -p` runs (it does **not** call `collect` in parallel — that used the same exclusive lock as the agent and produced endless `workspace_changed`). Once local state is **`staged`** or terminal, Picard **stops the Cursor process tree** (`taskkill /T /F` on Windows after **`PICARD_TUI_CURSOR_PRINT_KILL_DELAY_MS`**) and appends a short note to agent stdout.

During **Collecting relay result**, the TUI also polls **GET `/workspace/requests/<eventId>`** when the connector journal exposes an `eventId`, so you see **RELAY * …** lines (completed, result ready, etc.) while waiting for local **collect** to stage edits. If you see **`COLLECT * workspace_changed`**, the relay may already show **completed**, but **collect** checks that your repo still matches the **snapshots from prepare**. Any edit after prepare (the model wrote to disk, or you saved elsewhere) breaks that check. The TUI then offers **`recover`** to cancel the **local** task and clear the lock so the next mission can **prepare** again; that does not remove the relay row. Alternatively restore the affected files from git or from Picard backups, then collect again from a client that supports it.

In **Connector handshake**, it polls the workspace registry every **250 ms** and prints a **`POLL` heartbeat about every 2 seconds** (`~Ns` is elapsed wait time; `tick` is the 250 ms counter) until `activeTaskId` appears (that only happens after the agent successfully calls prepare/submit).

In the **LCARS frame** UI, long waits also append **status lines on each poll interval** (250 ms for the task lock; 400 ms loop during collect; 500 ms during apply progress) so the **OPERATIONS** activity log stays in motion. Connector and legacy flows still use the same underlying polling rules.

## LCARS layout

### Default: cell-drawn LCARS frame (alternate screen)

`tools/picard-tui/main.mjs` starts the **four-zone** shell when stdout is an interactive TTY and the window is at least **72 columns** wide:

- **Frame:** maroon **rail** on the left, horizontal **sweeps** with a one-column gap and **elbow** caps (Captain palette from `tools/console-theme/captain.mjs`). No box-drawing borders.
- **Left rail:** `OVERVIEW`, `OPERATIONS`, `MISSION`, `CONNECTOR` as **pills** (lilac when selected).
- **Header:** telemetry (`SYS-STAT // …`), **approx** CPU, load, RAM, and a **clock pill** when width ≥ 80.
- **Main:** step **pills** colored by state, view content on the charcoal field, **OPERATIONS** activity log (rate-limited), or **MISSION** agent/workspace pills plus title/body entry.
- **Footer:** key hints and a **spinner** during long phases.

**Colors** (24-bit truecolor when `stdout.getColorDepth() >= 24` and `NO_COLOR` is unset; otherwise 256-color approximations). Rail `#702039`, elbow `#df8332`, field `#09080c`, cream `#faf2de`, gold `#efd18d`; accent pills use apricot, neo-orange, lilac, and sky as in `tools/picard-tui/lcars-frame.mjs`.

Implementation: `tools/picard-tui/lcars-frame.mjs` (paint), `tools/picard-tui/lcars-screen.mjs` (terminal I/O), shell in `tools/picard-tui/k9s-shell.mjs`. Legacy K9s helpers (`lcars-k9s-theme.mjs`, `k9s-layout.mjs`) remain for tests and color utilities.

Mission phases, connector polling, collect/apply, git diff, and optional review still run through **`mission-orchestrator.mjs`** (shared with legacy). Prompts use a **bottom overlay** on the frame; **Esc** cancels a prompt; **Q** or **Ctrl+C** exits the screen.

### Legacy: line printer + readline wizard

Set **`PICARD_TUI_LEGACY=1`**, pass **`--legacy`**, use **non-TTY** stdout, **`TERM=dumb`**, or **`NO_COLOR`** (unless **`PICARD_TUI_FORCE_K9S=1`**) to get the original stacked **`console.log`** flow from **`legacy-cli.mjs`**. It uses the **Captain** palette from `tools/picard-tui/lcars-ui.mjs` (charcoal deck `#09080c`, rail `#702039`, elbow `#df8332`, cream `#faf2de`, gold `#efd18d`, good `#9bf1bf`) so it still matches the web console theme (`tools/console-theme/captain.mjs`). With `NO_COLOR` or outside Windows Terminal, output is plain ASCII but the layout stays the same.

## Run

From the Picard repo root (or any checkout that contains `tools/picard-tui`):

```text
npm install
node tools/picard-tui/main.mjs
```

Direct entry points:

| Script | Role |
| --- | --- |
| `main.mjs` | Chooses LCARS frame TUI vs legacy (see env vars below). |
| `k9s-main.mjs` | Loads config/registry and starts the frame shell only (internal use). |
| `legacy-cli.mjs` | Legacy wizard only (`runLegacyMain()`). |

**Cancel without closing the terminal:** press **Esc** during any prompt to abort that step (returns to the previous flow or exits the mission). While the client is polling for a task or collecting results, **Esc** stops waiting and continues (or exits if there is no task id yet). **Ctrl+C** during those waits exits the whole TUI (exit code 130). Earlier builds used `readline.pause()` during polling, which blocked stdin so Esc/Ctrl+C did nothing until the prompt returned. Esc never cancels a relay job that has already been submitted; use the host console or your operational runbook for that.

### LCARS frame keyboard

| Key | Action |
| --- | --- |
| `1`–`4` | Switch **OVERVIEW** / **OPERATIONS** / **MISSION** / **CONNECTOR** |
| **Tab** / **Shift+Tab** | Focus the main area from the rail. In **MISSION**: cycle **Agents** → **Workspaces** → **Mission title** → **Mission request** (Tab does not insert a tab character). In **OVERVIEW** / **CONNECTOR**: cycle summary or connector hint vs steps. In **OPERATIONS**: single activity pane. |
| **Ctrl+G** | Focus the **left nav** (menu) again |
| **Ctrl+H** | Same as Tab (cycle main panes) |
| `/` | Jump to **OPERATIONS** and focus the activity log |
| **F5** | Start mission (requires agent + workspace selected in **MISSION**) |
| **Esc** | Dismiss overlay prompt when waiting on input (same as legacy for poll cancel when stdin is wired) |
| **Q** or **Ctrl+C** | Quit |

Optional environment variables:

| Variable | Purpose |
| --- | --- |
| `PICARD_CODING_CONFIG` | Path to `coding-client.json` (default `%USERPROFILE%\.picard\coding-client.json`) |
| `PICARD_WORKSPACES_FILE` | Trusted workspaces registry (default `%USERPROFILE%\.picard\workspaces.json`) |
| `PICARD_REVIEW_CONFIG` | Review bearer JSON for POST `/workspace/reviews/<ref>` (default `%USERPROFILE%\.picard\review-client.json`) |
| `NO_COLOR` | Disable truecolor / ANSI colors; also forces **legacy** CLI unless `PICARD_TUI_FORCE_K9S=1` |
| `PICARD_TUI_LEGACY` | Set to `1` to force the **legacy** stacked `console.log` UI |
| `PICARD_TUI_FORCE_K9S` | Set to `1` to run the **frame** UI even when `NO_COLOR` is set |
| `PICARD_TUI_CURSOR_APPROVE_MCPS` | Set to `0` to omit `--approve-mcps` on Cursor `agent -p` (default: on) |
| `PICARD_TUI_CURSOR_AUTO_REVIEW` | Set to `0` to omit `--auto-review` on Cursor `agent -p` (default: on) |
| `PICARD_TUI_CURSOR_YOLO` | Set to `1` to add `--yolo` (`--force`) on Cursor `agent -p` (default: off) |
| `PICARD_TUI_CURSOR_PRINT_HEARTBEAT_MS` | Heartbeat interval while `agent -p` runs (default `5000`; min `1000`) |
| `PICARD_TUI_CURSOR_PRINT_POLL_MS` | How often to read local task status while `agent -p` runs (default `2000`; min `500`) |
| `PICARD_TUI_CURSOR_PRINT_KILL_DELAY_MS` | Delay before killing the Cursor process tree after staged/collect (default `1500`; set `0` for immediate) |

PowerShell 5.1 bootstrap (checks Node, Git, optional winget install of Windows Terminal):

```text
powershell -ExecutionPolicy Bypass -File tools/picard-tui/Install-PicardConsole.ps1
```

## Operator control boundary

The agent may only use Picard workspace MCP tools (prepare, submit, status, collect). It must **not** call `picard_workspace_apply`, edit the registry, or hold review secrets. The terminal polls durable connector state, prompts before apply, runs enrolled tests via the connector, prints `git diff`, then optionally posts a review with a **separate** bearer.

After you confirm **Apply**, step **06** runs `picard_workspace_apply` and **streams progress**: **`TEST * baseline_testing|testing * <enrolled-test-id>`** plus the last few lines of that test’s log file under `%USERPROFILE%\.picard\state\…\<workspaceId>\<taskId>-<phase>-<id>.log` (full path is derived from the registry `stateDir`). Apply can take **many minutes** when enrolled commands run typecheck or full test suites; the web **Jobs** list does not grow during apply — it only changes when a **new** request is submitted.

`picard_workspace_status` now includes **`testInvocation`** (`phase`, `id`, `pid` while a test is running) for observability.

## Review bearer (optional)

Posting **Accepted** / **Changes requested** to the relay requires a host that loads **`BRIDGE_MACHINE_REVIEW_CLIENTS_FILE`** (see [API](API.md#laptop-review-client)). Generate a laptop file **without printing the raw token**:

```text
node tools/picard-tui/issue-review-token.mjs --client %USERPROFILE%\.picard\review-client.json --coding-client-id work-laptop-coding --origin https://your-relay
```

Install the printed `tokenSha256` row on the enrolled host. The JSON file must match [review-config.mjs](../tools/picard-tui/review-config.mjs) shape: `{ "v": 1, "origin": "https://your-relay", "token": "<43-char>", "codingClientId": "<same id as coding row>" }` (origin must be the bare HTTPS origin with no path). If the host has not loaded the review registry, local apply and `git diff` still work; the console review step reports unavailable.

## Tests

```text
npm run test:picard-tui
```

No Cursor, Codex, or Claude processes are spawned by these tests.
