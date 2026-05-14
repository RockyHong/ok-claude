# Backlog

Single tracker for deferred items — things found but not fixing now. Solo-dev queue. Scanned by doc sync at commit. When picking up new work, scan related items here to bundle.

**Three categories** distinguished by ID prefix:

- **`BUG-###`** — broken behavior. Surface symptom may hide deeper cause.
- **`DEBT-###`** — working but rotting (test fixture rot, stale dep, cleanup owed).
- **`GAP-###`** — design gap, never properly specced.

No phase prescription per category — when an item rolls into a session, the harness phase-gate triage decides which superpowers phases run. Surface "clear fix" can become design work after evidence; pre-routing biases that judgment.

Format per item: stable ID, short title, affected area, why it matters, proposed fix or what's missing. Newest at top. When resolved, **delete the item** — git history is the archive.

---

## Roadmap

Ordered feature list. F1 shipped; rest are placeholders until promoted. When a feature begins, write its spec at `docs/superpowers/specs/{date}-{slug}.md` and plan at `docs/superpowers/plans/{date}-{slug}.md`; when it ships, delete those temporal files (per CLAUDE.md § Doc Sync).

| ID | Slug                  | Title                                              | Rationale                                                                |
| -- | --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| F1 | `mvp-wordcloud`       | Vertical slice: logs → tokens → HTML wordcloud     | Smallest end-to-end runnable. Proves stack. Shipped.                     |
| F2 | `speaker-split`       | Split user vs Claude tabs in output HTML           | Shipped. Two-tab split (You / Claude) with per-tab empty-state.          |
| F3 | `stream-and-progress` | Stream tokenize + terminal progress bar (no flags) | All-time scope (overview Non-Negotiable #4) demands streaming to dodge V8 string ceiling; progress bar covers parse latency on heavy histories. |
| F4 | `a11y-table`          | Top-N `<table>` fallback below wordcloud           | a11y commitment per `docs/techstack.md` § Key Dependencies.              |
| F5 | `png-export`          | Wire `html-to-image` to in-page Export button      | Social-share = core value prop per `docs/overview.md`.                   |
| F6 | `npm-publish`         | Publish to npm registry, README, `npx` smoke       | Ships v1. Closes the distribution loop.                                  |
| F7 | `sentence-frequency`  | Sentence tokenization + sentence-cloud (v2)        | v2 per `docs/overview.md` — iterate post-publish.                        |

---

## Open

### BUG-001 — "You" tab includes harness-injected content, not just user typing

- **Area:** `src/parse.ts` (filter strategy)
- **Symptom (surfaced on F2 ship):** "You" tab's top words include `command`, `skill`, `docs`, `user` — these come from harness-injected text blocks (skill bodies, `<system-reminder>` blocks, `<command-name>` / `<command-message>` / `<local-command-stdout>` tags), not from what the user actually typed. Cloud reflects the harness as much as the human.
- **Schema levers** (verified via JSONL probe on this repo's own logs):
  - `isMeta: true` top-level flag marks injected lines (skill bodies via `Skill` tool, etc.) — currently NOT filtered.
  - `toolUseResult` top-level field marks tool-result lines (role=user but content is tool output) — currently filtered indirectly because their content blocks are `type: "tool_result"`, which `extractText` already skips. ✓ OK.
  - `<system-reminder>...</system-reminder>` and `<command-name>...</command-name>` / `<command-message>...</command-message>` / `<local-command-stdout>...</local-command-stdout>` tags are injected inline inside `type: "text"` blocks of role=user lines — NOT filtered.
  - `isSidechain: true` marks sub-conversation lines — decide later whether to include/exclude.
- **Proposed fix:** in `parse.ts`, (1) skip lines where `isMeta === true`, (2) strip the listed tag pairs and their inner content from text before yielding. Re-evaluate after running on real logs.
- **Out of scope here:** Claude side may have similar but smaller pollution (thinking blocks, tool_use input). Probe before fixing.

### GAP-004 — extract real token counts from JSONL for subhead

- **Area:** `src/parse.ts`, `src/pipeline.ts`, `src/render.ts`
- **Why it matters:** users care about token burn (proud-pain metric). Subhead currently shows session/message proxy — real `input_tokens` / `output_tokens` from Claude Code's assistant-line `usage` field is the share-worthy number ("burned 4.2M tokens this week").
- **Surfaced during:** F2 brainstorm. Subhead question. Deferred — `parse.ts` only extracts role/text/timestamp; adding usage parse = own scope.
- **Proposed fix:** extend `LogEvent` with optional `tokensIn` / `tokensOut`. Tolerant parse (field may be missing on older logs). Sum across events for subhead. Render as `4.2M tokens` next to message count.
- **Open:** which field path exactly (Claude Code log schema not pinned here). Inspect a real JSONL during impl.

### GAP-002 — denoise pasted code blocks before tokenization

- **Area:** `src/tokenize.ts` (or new pre-tokenize step in `src/pipeline.ts`)
- **Why it matters:** users paste JSON / Stack Overflow answers / code into Claude Code. Pasted blobs dominate frequency counts (e.g. `"id"` repeating 200× in one paste swamps user-typed vocabulary). Wordcloud reflects the paste, not the conversation.
- **Surfaced during:** F2 brainstorm (counting-rule discussion). Decided not to fix counting semantics — attack the root cause instead.
- **Proposed fix:** strip fenced code blocks (```` ``` ````) and indented code blocks from message text before tokenizing. Also consider stripping inline `` `code` `` spans. Leave prose intact.
- **Open:** whether to also detect non-fenced pasted blobs (long whitespace-uniform stretches). Probably overkill — solve fenced case first, revisit with real data.

### GAP-003 — revisit per-occurrence vs per-message counting

- **Area:** `src/aggregate.ts` (or upstream in pipeline)
- **Why it matters:** current rule = every token instance counts. "ok claude ok claude" in one message = 2. Preserves intensity (matches brand). But amplifies any per-message repetition pathology. Once GAP-002 ships, re-evaluate whether per-message dedup or a per-message cap improves signal.
- **Surfaced during:** F2 brainstorm. Decided to keep per-occurrence for v1; defer reconsideration until F3 (`--project`, `--since` filters) + F4 (top-N table) ship and we can compare on real data.
- **Proposed fix (if revisited):** per-message cap at N occurrences, or per-message dedup. Pick after data, not speculation.
