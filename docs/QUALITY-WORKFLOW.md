# Picard output quality workflow

Local connector source candidate, November 19, 2026. This adds evidence selection,
task contracts and offline evaluation. It does not change the signed runtime,
installed host, provider model, reasoning effort, grants or execution enrollment.
Synthetic checks verify the harness; improvement on live model tasks is unmeasured.

## Prepare a focused request

Use `picard_prepare_coding_request` with one objective, exact relevant excerpts
and a short acceptance contract:

```json
{
  "title": "Review session expiry",
  "requestText": "Review the supplied expiry check and propose the smallest fix.",
  "paths": [
    { "path": "src/session.js", "startLine": 20, "endLine": 42 },
    { "path": "test/session.test.js", "startLine": 10, "endLine": 32 }
  ],
  "contract": {
    "acceptanceCriteria": [
      "Reject expired sessions even when the user exists.",
      "Preserve the existing behavior for unexpired sessions."
    ],
    "constraints": ["Use supplied source facts; identify missing evidence."]
  }
}
```

These paths illustrate the format, not files shipped in Picard. Discover actual
callers, interfaces and tests first. Include applicable AGENTS.md excerpts
explicitly. Referenced documents are evidence, not authority to widen permissions.
Nothing reads additional project files just because the model requests them.

Each file is checked against existing path, link, journal and secret exclusions.
The local reader accepts UTF-8 files up to 2 MiB, records a full-file SHA-256,
and selects inclusive one-based lines. This permits excerpts beyond the former
32 KiB prefix. The selected context still has the existing 4,000-character and
combined 12,000-byte limits. Unicode bytes are accounted for separately.

Both connector modes refuse clipping before posting a draft. Error coverage
distinguishes complete, partial and omitted selections. `included` lists only
fully retained selections. Review the actual payload; coverage proves that the
selected text fits, not that every dependency was discovered. Ordinary source
can still contain private material that the denylist cannot recognize.

The optional contract has 1–12 acceptance criteria and up to 12 constraints,
each at most 300 characters. Its compiled text must fit the request limit.
It is part of exact draft identity: changing criteria requires a new explicit
prepare decision, not approval reuse. A contract does not grant tool access.

`picard_workspace_prepare` and `picard_workspace_handoff` also accept `contract`.
The trusted workflow keeps its JSON edit contract, writable scopes, baseline
tests and rollback boundaries. Its compiled brief remains bounded to 2,800
characters before the edit contract is appended. Preparation returns file
coverage; existing recovery uses the original persisted task without rebuilding
its contract. Successful tests are evidence, not owner acceptance.

## Freeze a local evaluation task

From the repository root with Node 24:

```powershell
node tools/quality-eval.mjs prepare --task examples/quality-task.json --workspace . --out quality-prepared.json
```

This reads selected local evidence and writes a new file exclusively; existing
files are never overwritten. It makes no provider request. The example is a
synthetic prose task. For real comparisons use sanitized representative tasks,
including previous failures and cases that should stop for insufficient context.
Keep private result files outside version control.

The manifest freezes the exact payload, numbered criteria, mechanical checks,
coverage, an input digest and a manifest digest. These are local evaluation
digests, not substitutes for the relay's `draftSha256` or owner approval.
To prepare this exact task through the coding connector, pass the manifest's
`connectorInput` object without another `contract`. The connector rereads only
those selected files; compare the returned title, request text, context and
purpose with the frozen `payload` before approving. A source change requires
inspection, not silent replacement of the evaluation snapshot. No evaluation
command submits or renews a request.

Optional `checks` are bounded literal checks:

```json
[
  { "id": "format", "kind": "json" },
  { "id": "required-literal", "kind": "includes", "value": "exact required token" },
  { "id": "forbidden-literal", "kind": "excludes", "value": "exact forbidden token" }
]
```

Use these only for mechanically required format/literals. They do not establish
source meaning; a keyword mismatch is not automatic grounds for another call.
No check executes code, shell commands or regular expressions from a model.

## Score a retained answer

Create a local result record from the saved answer and its observed metadata:

```json
{
  "inputSha256": "COPY_FROM_PREPARED_MANIFEST",
  "variant": "baseline",
  "model": "openai/gpt-oss-20b",
  "effort": "low",
  "deliveryState": "completed",
  "finishReason": "stop",
  "body": "EXACT SAVED ANSWER INCLUDING RELAY ATTRIBUTION",
  "bodySha256": "SHA256_OF_EXACT_UTF8_BODY",
  "totalTokens": null,
  "latencyMs": null,
  "corrections": 0
}
```

Use `failed`, `uncertain` or `incomplete` delivery states when appropriate. Use
`body: null` and `bodySha256: null` when no answer exists, `finishReason: null`
or `"unknown"` when unavailable. Never infer `stop` from a completed label.
Missing usage remains null. Copy the actual model/settings; do not infer the
installed configuration from a repository default. Set `truncated: true` if
the export itself was clipped. The scorer checks answer bytes before removing
one relay attribution line for mechanical checks.

An independent review file binds judgments to that exact input and answer:

```json
{
  "inputSha256": "COPY_FROM_PREPARED_MANIFEST",
  "bodySha256": "SHA256_OF_EXACT_UTF8_BODY",
  "reviewer": "Human reviewer",
  "judgments": [
    { "criterionId": "C1", "status": "pass", "evidence": "Exact source or test observation supporting this judgment." },
    { "criterionId": "C2", "status": "untested", "evidence": "The required behavior has not been exercised." }
  ]
}
```

```powershell
node tools/quality-eval.mjs score --prepared quality-prepared.json --result saved-result.json --review review.json --out quality-score.json
node tools/quality-eval.mjs summarize --scores score-array.json --out quality-summary.json
```

Omit `--review` to obtain mechanical checks and `needs_review`. `score-array.json`
is an array of score records, including unsuccessful attempts. Every criterion
needs a pass with supporting evidence before `reviewed_pass` is possible;
unknown completion, incomplete output and missing criteria cannot pass.
Review evidence is caller-supplied: hashes bind bytes but do not authenticate
provider provenance, prove a review is truthful or constitute owner acceptance.
The scorer does not execute tests or assess semantic correctness itself.

Summaries retain every supplied attempt in the denominator and show unknown
usage as incomplete. They are descriptive counts, not a paired experiment or
a causal claim. Keep task sets and source snapshots matched, reserve held-out
cases, retain every correction, and compare one intervention at a time. The
first trial should compare existing preparation against focused evidence with
the same model and effort. Later reasoning/model/schema trials require their
own approved finite calls and compatible enrollment; no fallback or retry is
introduced here.

## Validation

```powershell
npm run test:quality
npm run test:coding-connector
npm run docs:check
```

These are local synthetic tests. Full signed-runtime release qualification
still requires the Linux checks documented in AGENTS.md. No benchmark score,
host installation or live model quality improvement is claimed by this change.
