# Claude Code Session-Log JSONL Schema

> Reference for `~/.claude/projects/**/*.jsonl` — the on-disk transcript format Claude Code (CC) writes during every session. Scoped to ok-claude's prose-extraction needs: which line types and flags gate whether a line counts as human-typed prose, and which we must drop.
>
> **Not an Anthropic-published schema.** Anthropic does not publish one. This doc = empirical probe across 1,317 local JSONL files (235,536 lines, CC versions 2.1.63–2.1.140) cross-checked against the most-cited community parsers (daaain/claude-code-log, simonw/claude-code-transcripts, fsck.com session-continuation post, neilberkman/ccrider schema doc). Treat it as best-available truth, not contract.

## Verdict legend

| Tag | Meaning |
|---|---|
| **CONFIRMED** | Seen in our empirical probe **and** documented by ≥1 community source. |
| **EMPIRICAL** | Seen in our probe, no community source documents it. Inferred meaning. |
| **COMMUNITY** | Documented by community sources, **not seen** in our local data (likely version drift). |
| **DISPUTED** | Community sources disagree, or community claim contradicts our data. |

## Path conventions

**Main session file** (CONFIRMED, per [Anthropic SDK Sessions doc](https://code.claude.com/docs/en/agent-sdk/sessions)):

```
~/.claude/projects/<encoded-cwd>/<session-uuid>.jsonl
```

`<encoded-cwd>` = absolute working directory with every non-alphanumeric character replaced by `-`. Example: `/Users/me/proj` → `-Users-me-proj`. Windows: `D:\Git\ok-claude` → `D--Git-ok-claude`.

**Subagent transcript** (CONFIRMED, per [SDK SessionStore](https://code.claude.com/docs/en/agent-sdk/session-storage)):

```
~/.claude/projects/<encoded-cwd>/<session-uuid>/subagents/agent-<short-id>.jsonl
```

Subagents nest one level below the parent session uuid; filename always starts `agent-`. **For ok-claude these are LLM-to-LLM prompts, not human typing — exclude entirely.** (Already handled via `discover.ts` path filter.)

**Sibling files in the same dir** (out of scope for prose extraction):

- `sessions-index.json` — per-project session index (titles, mtimes, first prompt) populated by SDK's `listSessions()` / `renameSession()` / `tagSession()`.
- `~/.claude/history.jsonl` — global cross-session input history. Different shape (no `role`/`message`); ignore.

## Line types

CC writes one JSON object per line. Top-level `type` field selects line shape. Twelve types observed across our 235k-line corpus (versions 2.1.63–2.1.140):

| `type` | Count | Carries prose? | Action for ok-claude | Verdict |
|---|---|---|---|---|
| `assistant` | 76,920 | model reply text | **keep** if no skip-flag fires | CONFIRMED |
| `attachment` | 63,312 | hook output, paste blobs, harness metadata | **drop** | CONFIRMED |
| `user` | 54,882 | user typing **or** tool-result wrapper **or** synthetic compact-summary | **keep** if no skip-flag fires | CONFIRMED |
| `progress` | 13,788 | subagent hook progress events | **drop** | CONFIRMED |
| `system` | 7,589 | hook stop summaries, compact boundaries, API errors, rate-limit retries | **drop** | CONFIRMED |
| `last-prompt` | 6,251 | trailing marker; cached most-recent prompt | **drop** | CONFIRMED |
| `file-history-snapshot` | 5,626 | file-checkpointing backup metadata | **drop** | CONFIRMED |
| `permission-mode` | 3,311 | mode-change marker (`default`/`auto`/`acceptEdits`/`bypassPermissions`) | **drop** | CONFIRMED |
| `ai-title` | 3,267 | model-generated session title | **drop** | CONFIRMED |
| `queue-operation` | 473 | input-queue events (`enqueue`/`dequeue`/`remove`) | **drop** | CONFIRMED |
| `custom-title` | 98 | user-set session title (via `/rename`) | **drop** | CONFIRMED |
| `agent-name` | 19 | named subagent marker | **drop** | CONFIRMED |
| `summary` | **0 in our data** | legacy compact-summary line (older CC versions) | **drop** if encountered | COMMUNITY |

**Note on `summary`:** documented by daaain + fsck.com as a top-level type carrying `summary` + `leafUuid` fields. Zero occurrences in our 2.1.63–2.1.140 corpus — Anthropic appears to have migrated compact-summary representation into a `user` line tagged with `isCompactSummary: true` + `isVisibleInTranscriptOnly: true`. Keep `summary`-type drop as forward-compat defense.

## Boolean flags

All eight booleans observed at top level of a JSONL line:

| Flag | Count | Co-occurs with | Skip for prose? | Source | Verdict |
|---|---|---|---|---|---|
| `isSidechain` | 216,491 | every conversational + progress line | **YES — current ok-claude leak** | daaain ("side conversation branch"), ccrider ("typically true for `agent-*.jsonl`") | CONFIRMED |
| `isMeta` | 6,589 | `system` (4,196) + `user` (2,393) | **YES** | samkeen ("meta/system message, e.g., command output"), daaain | CONFIRMED |
| `isSnapshotUpdate` | 5,626 | `file-history-snapshot` only | n/a — type-whitelist drops it first | samkeen | CONFIRMED |
| `hasOutput` | 3,330 | `system` `subtype: "stop_hook_summary"` | n/a — type-whitelist drops it | daaain | CONFIRMED |
| `preventedContinuation` | 3,330 | `system` `subtype: "stop_hook_summary"` | n/a — type-whitelist drops it | daaain | CONFIRMED |
| `isCompactSummary` | 88 | always paired with `isVisibleInTranscriptOnly` on `user` lines | **YES** | fsck ("machine-generated context, not the actual dialogue") | CONFIRMED |
| `isVisibleInTranscriptOnly` | 88 | always paired with `isCompactSummary` on `user` lines | **YES** (redundant gate, but explicit) | none | EMPIRICAL |
| `isApiErrorMessage` | 50 | `assistant` lines with `error` + `apiErrorStatus` (429, 529, …) | **YES** | none | EMPIRICAL |

**Pairing confirmation:** `isCompactSummary` and `isVisibleInTranscriptOnly` co-occurred on 88/88 lines in our corpus — zero orphans either direction. Either flag is a safe gate for compact-summary suppression.

**Sidechain magnitude:** `isSidechain: true` covers **45% of user lines (24,942)** and **44% of assistant lines (33,772)**. Every one of those is LLM-to-LLM dispatch prose, not human typing. Ignoring the flag = huge wordcloud leak. Path-based subagent exclusion (`subagents/` directory) catches subagents stored as separate files, **but not inline subagent dialogue inside main session files** — that path is `isSidechain: true` only.

## Content blocks (inside `message.content`)

When `type` is `user` or `assistant`, `message.content` is either a string (rare; user prompts and compact summaries) or an array of typed blocks. Block-level `type` values seen:

| Block `type` | Carries human prose? | Action |
|---|---|---|
| `text` | yes — `text: string` is the human-readable payload | **keep** |
| `tool_use` | no — model emitting a tool call (`id`/`name`/`input`) | drop |
| `tool_result` | no — tool output echoed back to model (`tool_use_id`/`content`/`is_error`) | drop |
| `thinking` | no — model extended-thinking trace (`thinking`/`signature`) | drop |
| `image` | no — base64 image | drop |
| `tool_reference` | no — deferred tool-load reference, seen inside `tool_result.content` | drop (nested; never top-level) |

ok-claude's `extractText` in `src/parse.ts` already keeps only `type === "text"` blocks. Confirmed correct against all community sources.

**Caveat — user lines that are pure tool-result wrappers:** 46,945 user lines in our corpus contained zero `text` blocks (only `tool_result`). They drop cleanly today because `extractText` returns empty string → parser returns null. Implicit, but works.

## Recommended prose-gating filter

Composed from the verdict tables above. **Drop the line if any condition is true:**

```ts
// Path-level (in discover.ts)
const SUBAGENT_SEG = `${sep}subagents${sep}`;
if (fullPath.includes(SUBAGENT_SEG)) drop;

// Line-level (in parse.ts)
const PROSE_TYPES = new Set(["user", "assistant"]);
if (!PROSE_TYPES.has(line.type)) drop;
if (line.isMeta === true) drop;
if (line.isSidechain === true) drop;          // <-- current gap
if (line.isCompactSummary === true) drop;
if (line.isVisibleInTranscriptOnly === true) drop;
if (line.isApiErrorMessage === true) drop;    // <-- current gap

// Content-level (extractText)
keep only message.content blocks where block.type === "text";
```

**Order matters:** type-whitelist first (cheapest — `user`/`assistant` keep, the other 10 observed types drop), then flag gates, then content extraction. Anything that survives → real human prose (or model reply to it).

## Other fields commonly seen

Not used for prose-gating, but useful when reasoning about a line:

| Field | Type | Meaning | Source |
|---|---|---|---|
| `uuid` | string | this line's id | CONFIRMED |
| `parentUuid` | string \| null | previous-line link (null at chain root; resets after compact boundary) | fsck.com authoritative |
| `logicalParentUuid` | string | on `system` `compact_boundary` lines, points at the pre-compact last message — that uuid is then erased from the file | fsck.com |
| `sessionId` | string | session uuid; matches filename for the session that originated the line | CONFIRMED |
| `timestamp` | ISO string | wall-clock UTC | CONFIRMED |
| `version` | string | CC version that wrote the line (e.g. `2.1.114`) | CONFIRMED |
| `gitBranch` | string | git branch at write time | CONFIRMED |
| `cwd` | string | working directory at write time | CONFIRMED |
| `entrypoint` | `"cli"` \| `"claude-desktop"` | how this session was started | EMPIRICAL |
| `userType` | always `"external"` in our data | reserved | EMPIRICAL |
| `slug` | string | whimsical session/agent codename (`mossy-swimming-thimble`) | samkeen |
| `agentId` | short hex | present on every line of a sidechain/subagent flow | CONFIRMED |
| `requestId` | `req_…` | Anthropic API request id (assistant lines only) | EMPIRICAL |
| `promptId` | uuid | groups user lines that share a single prompt event | EMPIRICAL |
| `sourceToolAssistantUUID` | uuid | on user lines that are tool results: the assistant line that emitted the matching `tool_use` | EMPIRICAL |
| `toolUseResult` | object \| string | structured tool-output blob attached to user lines | CONFIRMED |
| `forkedFrom` | object | present when the session was forked from another; mirrors origin metadata | EMPIRICAL |
| `attributionAgent` / `attributionSkill` / `attributionPlugin` | string | which agent/skill/plugin authored the assistant turn | EMPIRICAL |
| `compactMetadata` | object | on `system` `compact_boundary`: `{trigger, preTokens, postTokens, durationMs}` | fsck.com |
| `subtype` | string | on `system` lines: `stop_hook_summary` \| `compact_boundary` \| `bridge_status` \| `turn_duration` \| `local_command` \| `away_summary` … | CONFIRMED |

## Anonymized samples

UUIDs scrubbed to `<uuid>`, paths to `<cwd>`/`<absPath>`, prose text to `<text-elided>`, request/tool ids to `<reqId>`/`<toolUseId>`/`<agentId>`. Structural fields verbatim.

**Plain user prompt (keep):**
```json
{"type":"user","parentUuid":"<uuid>","isSidechain":false,"promptId":"<uuid>","message":{"role":"user","content":"<text-elided>"},"uuid":"<uuid>","timestamp":"2026-04-19T15:47:28.118Z","permissionMode":"auto","userType":"external","entrypoint":"cli","cwd":"<cwd>","sessionId":"<uuid>","version":"2.1.114","gitBranch":"main"}
```

**Meta user (slash-command expansion — drop):**
```json
{"type":"user","parentUuid":"<uuid>","isSidechain":false,"isMeta":true,"message":{"role":"user","content":"<text-elided>"},"uuid":"<uuid>","timestamp":"2026-04-18T12:22:48.997Z","userType":"external","entrypoint":"cli","cwd":"<cwd>","sessionId":"<uuid>","version":"2.1.114","gitBranch":"main"}
```

**Compact summary (drop):**
```json
{"type":"user","parentUuid":"<uuid>","isSidechain":false,"isCompactSummary":true,"isVisibleInTranscriptOnly":true,"message":{"role":"user","content":"<text-elided>"},"uuid":"<uuid>","timestamp":"2026-04-18T04:08:19.496Z","userType":"external","entrypoint":"cli","cwd":"<cwd>","sessionId":"<uuid>","version":"2.1.114","gitBranch":"master"}
```

**Tool-result user (no text block — already drops):**
```json
{"type":"user","parentUuid":"<uuid>","isSidechain":false,"message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"<toolUseId>","content":[{"type":"tool_reference","tool_name":"WebSearch"}]}]},"uuid":"<uuid>","toolUseResult":{"matches":["WebSearch"]},"sourceToolAssistantUUID":"<uuid>","timestamp":"2026-04-19T15:47:38.223Z","cwd":"<cwd>","sessionId":"<uuid>","version":"2.1.114","gitBranch":"main"}
```

**Sidechain user (inline subagent prompt — currently leaks):**
```json
{"type":"user","parentUuid":null,"isSidechain":true,"agentId":"<agentId>","promptId":"<uuid>","message":{"role":"user","content":"<text-elided>"},"uuid":"<uuid>","timestamp":"2026-04-19T18:04:45.850Z","cwd":"<cwd>","sessionId":"<uuid>","version":"2.1.114","gitBranch":"main"}
```

**Plain assistant (keep — text block only):**
```json
{"type":"assistant","parentUuid":"<uuid>","isSidechain":false,"message":{"role":"assistant","model":"claude-opus-4-7","content":[{"type":"text","text":"<text-elided>"}],"usage":{"input_tokens":6,"output_tokens":609,"cache_read_input_tokens":0,"cache_creation_input_tokens":37850}},"requestId":"<reqId>","uuid":"<uuid>","timestamp":"2026-04-19T15:47:36.683Z","cwd":"<cwd>","sessionId":"<uuid>","version":"2.1.114","gitBranch":"main"}
```

**API-error assistant (drop):**
```json
{"type":"assistant","parentUuid":"<uuid>","isSidechain":false,"isApiErrorMessage":true,"error":"rate_limit","apiErrorStatus":429,"message":{"role":"assistant","content":[{"type":"text","text":"<text-elided>"}]},"uuid":"<uuid>","timestamp":"2026-04-30T14:11:09.241Z","cwd":"<cwd>","sessionId":"<uuid>","version":"2.1.123"}
```

**System compact-boundary (drop — chain marker):**
```json
{"type":"system","subtype":"compact_boundary","parentUuid":null,"logicalParentUuid":"<uuid>","isSidechain":false,"content":"Conversation compacted","compactMetadata":{"trigger":"manual","preTokens":193348,"postTokens":13958,"durationMs":107655},"uuid":"<uuid>","timestamp":"2026-04-18T04:08:19.496Z","cwd":"<cwd>","sessionId":"<uuid>","version":"2.1.114"}
```

**Attachment (drop — hook payload):**
```json
{"type":"attachment","parentUuid":null,"isSidechain":false,"attachment":{"type":"hook_success","hookName":"SessionStart:startup","hookEvent":"SessionStart","stdout":"<elided>","exitCode":0,"durationMs":227},"uuid":"<uuid>","timestamp":"2026-04-19T15:46:57.212Z","cwd":"<cwd>","sessionId":"<uuid>","version":"2.1.114"}
```

**Metadata sidecar types (drop — single-purpose markers):**
```json
{"type":"last-prompt","lastPrompt":"<text-elided>","sessionId":"<uuid>"}
{"type":"ai-title","aiTitle":"<text-elided>","sessionId":"<uuid>"}
{"type":"custom-title","customTitle":"<text-elided>","sessionId":"<uuid>"}
{"type":"permission-mode","permissionMode":"auto","sessionId":"<uuid>"}
{"type":"queue-operation","operation":"enqueue","content":"<text-elided>","timestamp":"2026-04-19T16:18:24.272Z","sessionId":"<uuid>"}
{"type":"file-history-snapshot","messageId":"<uuid>","snapshot":{"trackedFileBackups":{}},"isSnapshotUpdate":false}
{"type":"agent-name","agentName":"<text-elided>","sessionId":"<uuid>"}
```

## Known gaps & version-drift risks

1. **`summary` line type.** Documented by daaain + fsck but absent from our corpus. Likely deprecated in CC ≥ 2.1.x. Keep a forward-compat drop rule so an older log still parses safely.
2. **Undocumented flags.** `isVisibleInTranscriptOnly` and `isApiErrorMessage` appear nowhere in published sources. Names are descriptive; behavior verified empirically. Flag in code comments if added to filter set.
3. **`attachment.type` subtypes.** Enumerated by daaain: `hook_success`, `hook_additional_context`, `hook_blocking_error`, `hook_non_blocking_error`, plus deferred-tool deltas, queued commands, file refs, todo reminders. We don't decode them — whole `attachment` line drops at type-whitelist.
4. **Tool-result text leakage edge case.** Some `tool_result.content` arrays nest `text`-typed blocks (e.g., a Bash tool reporting prose). Our walker only looks at top-level `message.content[].type === "text"`. We do not (and should not) descend into `tool_result.content` — that's bot output, not human prose. Confirmed safe.
5. **CC version drift.** Schema may change between minor versions without notice. The flag set was stable across 2.1.63–2.1.140 in our sample, but Anthropic publishes nothing. Re-run the empirical probe periodically (`tmp/probe-schema.mjs` in this repo, on a clean `git stash` workspace) to catch new fields.

## Sources

| Source | Type | Reliability |
|---|---|---|
| [Anthropic SDK Sessions docs](https://code.claude.com/docs/en/agent-sdk/sessions) | official | authoritative on path encoding + SDK behavior; silent on JSONL field schema |
| [Anthropic SDK SessionStore docs](https://code.claude.com/docs/en/agent-sdk/session-storage) | official | authoritative on subagent subpath layout (`subagents/agent-<id>`); silent on entry schema |
| [Anthropic Hooks reference](https://code.claude.com/docs/en/hooks) | official | documents `transcript_path` + `SessionStart.source` (`startup`/`resume`/`clear`/`compact`); silent on transcript contents |
| [daaain/claude-code-log](https://github.com/daaain/claude-code-log) | community parser (Python) | most complete Pydantic models + `SILENT_SKIP_TYPES` set + DAG walker; gold standard |
| [neilberkman/ccrider — research/schema.md](https://github.com/neilberkman/ccrider/blob/main/research/schema.md) | community schema doc | most complete prose reference; mostly aligned with daaain |
| [fsck.com — Claude Code Session Continuation](https://blog.fsck.com/agent-blog/2026/02/22/claude-code-session-continuation/) | community blog | authoritative on `parentUuid` chain + compact-boundary semantics |
| [simonw/claude-code-transcripts](https://github.com/simonw/claude-code-transcripts) | community parser | minimal filter (only `isMeta` + filename `agent-*` skip); useful for cross-check |
| [samkeen — claude-code-data-structures gist](https://gist.github.com/samkeen/dc6a9771a78d1ecee7eb9ec1307f1b52) | community schema gist | partial; **disputed** on `parentUuid` semantics ("Always null for prompts" — wrong) |
| [databunny Medium — Session File Format](https://databunny.medium.com/inside-claude-code-the-session-file-format-and-how-to-inspect-it-b9998e66d56b) | community blog | unreliable; conflates content-block types with top-level line types |
| [liambx — DuckDB analysis](https://liambx.com/blog/claude-code-log-analysis-with-duckdb) | community blog | names common fields in DuckDB SQL; no semantics |
