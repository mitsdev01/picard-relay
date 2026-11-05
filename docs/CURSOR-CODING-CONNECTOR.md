# Cursor coding connector

Local stdio MCP connector for this laptop. It prepares one Picard workspace request, submits that exact request when asked, and reads the saved proposal. Picard does not execute the proposal. Cursor remains responsible for editing files and running tests after review.

Connector version: `1.0.0`.

The current checkout is upstream `picard-relay` plus this connector. It does not include the unpublished companion or update-gate changes from the other PC. Those changes are not required for this coding flow.

## What Cursor can call

| Tool | Effect |
| --- | --- |
| `picard_prepare_coding_request` | Save an inert draft. No provider call. |
| `picard_submit_coding_request` | Approve and queue that draft once. The relay may make one Groq call. |
| `picard_coding_request_status` | Read the recorded state. No provider call. |
| `picard_coding_request_result` | Read the saved proposal again. No provider call. |

There is no cancel tool. The workspace API used here has no cancel route. The signed bridge has a separate HMAC cancel action, and this laptop does not have that key. A job can still show `cancelled` when the server revokes it; status and result report that state.

A lost or uncertain submission is not sent again. Reuse the returned `requestId`. Preparing a different request requires an explicit new prepare call.

## Start

Cursor starts the server from `.cursor/mcp.json`:

- Command: `C:\Program Files\nodejs\node.exe`
- Arguments: `D:\src\picard\tools\coding-connector\server.mjs`
- Config file: `C:\Users\Billu\.picard\coding-client.json`

Reload the Cursor window after changing that file. The server writes `picard-coding-connector 1.0.0 ready` to stderr. Stdout is only MCP JSON.

The private config contains the origin, the raw token, `workspaceRoot`, and `journalDir`. The example shape is `tools/coding-connector/coding-client.example.json`. Do not commit the real file.

Check the server without Cursor:

```powershell
$env:PICARD_CODING_CONFIG = 'C:\Users\Billu\.picard\coding-client.json'
node D:\src\picard\tools\coding-connector\server.mjs
```

## Credentials

The laptop identity is `work-laptop-coding`. Its raw token stays in the private config. The server registry stores only the SHA-256 hex digest, the id, the scope `workspace-coding`, and `revoked`.

Generate or rotate only when the private files are absent. The generator refuses to overwrite and does not print the token:

```powershell
node D:\src\picard\tools\coding-connector\issue-machine-token.mjs --client C:\Users\Billu\.picard\coding-client.json --registry C:\Users\Billu\.picard\machine-clients.json --origin https://picard-relay.132-226-62-113.sslip.io --workspace D:\src\picard --journal C:\Users\Billu\.picard\coding-journal
```

Revocation: on the enrolled host, set `revoked` to `true` or remove that row in the installed registry, then save the file. The running process re-reads it. Removing the laptop config file stops this computer from presenting the token. Deleting the local journal does not revoke the server credential and must not be used to force another submission.

The Groq key stays on the relay. Do not copy the Oracle administrator SSH key, browser cookies, or the owner password into this config.

## Deploy the server change

This branch does not change the live relay. Bearer authentication works on the host only after the new runtime is installed. Until then, a live tool call fails with `auth_failed`. Local tests do not prove live authentication.

1. Review this branch. Do not treat it as installed.
2. Publish it through the existing signed source workflow after explicit approval. Do not push or deploy from this laptop unless that approval is given.
3. Let the enrolled updater install that signed release, or follow `docs/OPERATIONS.md` for the existing host. Do not change the updater gate, project pin, game companion, or execution settings.
4. Install `machine-clients.json` on the host as a regular 0600 file owned by the runtime user, outside the signed source tree. A symlink or extra field is rejected.
5. Add only `BRIDGE_MACHINE_CLIENTS_FILE=/absolute/path/machine-clients.json` to the existing service environment. Leave every other setting as it is.
6. Restart the service once so it loads that variable. Later revocation does not need another restart.
7. Ask Cursor to call `picard_coding_request_status` or prepare a draft only after you want a live read. The first live provider call still requires a separate `picard_submit_coding_request`.

The host file reader is Linux-only and fails closed on this Windows laptop. That is expected: this computer is the client.

## Context that may be sent

Prepare reads only the paths named in that call, and only when they resolve inside `workspaceRoot`. The default root is `D:\src\picard`. The journal and the credential file are excluded.

These are rejected: `.env` and `.env.*`, private-key files, `.pem`, `.key`, `.p12`, `.pfx`, `.ssh`, `.git`, `node_modules`, `credentials`, and `secrets`. A file whose first bytes contain a private-key header is rejected even when the name looks ordinary.

Request text is at most 4,000 characters. Context is at most 4,000 characters. The combined provider input is at most 12,000 bytes. Truncation is reported with `[truncated]` and an omitted-character count. The provider remains Groq `openai/gpt-oss-20b`, one call, 4,096 output tokens, no tools, no retries, and no paid fallback. The draft lives 15 minutes. The approval proof lives 60 seconds and is used inside the same submit call.

## Review the answer

The result is an untrusted proposal. Read it, then edit and test in Cursor. Do not run commands from the proposal unless you intend to run those exact commands yourself. A second result call reads the saved answer and does not make another provider call.

## Examples

Web development:

`Use picard_prepare_coding_request for a synthetic accessible form helper. Select only the files I name. Show the payload and limits, then stop for approval before picard_submit_coding_request.`

PowerShell 5.1:

`Use picard_prepare_coding_request to propose a PowerShell 5.1 function that reads a CSV of computer names and writes a plain-text report. Do not execute the proposal. Submit only after I approve that exact requestId.`

Recovery:

`The previous Picard call was interrupted. Call picard_coding_request_status with the same requestId. If it was already submitted, call picard_coding_request_result. Do not prepare or submit a replacement.`

## Troubleshooting

| Result | Meaning |
| --- | --- |
| `configuration_unavailable` | The private config is missing, unreadable, or not the exact five-field document. |
| `auth_failed` | The token is wrong or revoked, or the live host does not have this server change yet. |
| `context_excluded` | A selected path is outside the workspace or on the denylist. |
| `draft_conflict` | The same requestId was reused with different text. |
| `draft_unconfirmed` | Prepare did not finish. Prepare again with the same requestId and the same text. |
| `approval_expired` | The draft or its short proof expired. Make a new prepare only by an explicit decision. |
| `not_repeated` or `unconfirmed` | Submission already started. Use status and result. Do not submit it again. |
| `redirect_rejected` | The origin redirected. The signed request was not followed. |

Tests:

```powershell
npm run test:coding-connector
npm run docs:check
```

`npm run test:coding-connector` uses synthetic fixtures. It does not call Groq and it does not prove the live token works.
