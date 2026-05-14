# F3 — Stream tokenize + terminal progress bar

> Temporal spec. Lives under `docs/superpowers/specs/`. Delete on merge per `CLAUDE.md` § Doc Sync.

## Why

Backlog F3 was originally a flag set (`--project`, `--since`, `--top-n`). That collided with `docs/overview.md` Non-Negotiables #1 (zero flags) and #7 (meme energy). Reshape commit `4cb34ee` re-anchored F3 to two unflagged jobs that the all-time scope (#4) actually requires:

1. **Stream-process** the corpus. Whole-history read every run will hit V8's `String` length ceiling (~512 MB) on heavy users. Current pipeline buffers all events into one array and joins their text into two giant per-role strings — both surfaces fail before the cloud renders.
2. **Terminal progress bar.** All-time scope means parse latency on heavy histories is noticeable. Silent CLI feels hung; meme-energy demands the user sticks around for the screenshot.

## Scope

F3 ships three bundled changes — same hot path, same touchpoints, same test surface:

| ID | Change | Why bundled |
| --- | --- | --- |
| **F3 core** | Stream pipeline + terminal progress bar | The reshape itself. |
| **BUG-001** | Filter `isMeta` lines + strip injected tag bodies (`<system-reminder>`, `<command-name>`, `<command-message>`, `<local-command-stdout>`) | Lives in `parseLine`. Shipping F3 on polluted data means the first screenshot still shows `system-reminder` / `command` / harness vocab — defeats #7. |
| **GAP-004** | Parse Claude API `usage.input_tokens` / `output_tokens`, sum across stream, render in subhead (`"4.2M tokens · 1,847 messages · Jan 5 – May 14"`) | Extends `parseLine` output. Real proud-pain share-fuel number. ~10 lines. |

**Out of scope** — stays in backlog, separate sessions:

- **GAP-002** (denoise pasted code blocks) — own design surface (fenced only? indented? non-fenced blobs?). Bigger than `parseLine`.
- **GAP-003** (per-occurrence vs per-message counting) — explicitly deferred until GAP-002 ships per its own backlog note. Verified during brainstorm: per-message dedup *punishes* short rants ("WTH WTH WTH" = 1 instead of 3), so raw count is already the meme-friendlier mode.
- Worker-thread parallelism — orthogonal speedup; tackle as DEBT-### post-ship if real users show slowness. Non-Negotiable #4 is about memory ceiling, not wall-clock speed.

## Non-Negotiables checked

| # | Constraint | How F3 honors |
| --- | --- | --- |
| 1 | Zero flags | No CLI args added. Progress is automatic. |
| 2 | Zero install | Uses only Node built-ins (`readline`, `node:fs`). No new runtime deps. |
| 3 | One shot, one file | Output surface unchanged — still one HTML, still auto-opens. |
| 4 | All-time scope | Stream lets the whole history through without a memory ceiling. The whole reason F3 was reshaped. |
| 5 | Mechanical, not AI | Counting math unchanged. Tokenizer unchanged. No LLM. |
| 6 | Two tabs max | Render surface unchanged. |
| 7 | Meme energy | Subhead gains real token total (GAP-004). BUG-001 removes harness vocab from the cloud. Progress bar keeps users present for the screenshot. |

## Architecture

Streaming spine slots between existing modules. Pipeline stays one-way; pure-logic modules stay pure.

```
~/.claude/projects/**/*.jsonl
        │
        ▼
discover.ts  →  [{ path, size }, …]  +  totalBytes
        │
        ▼
stream.ts (readline per file)  ──onProgress(bytesDone, fileIdx)──▶  progress.ts → stderr (TTY only)
        │
        ▼ (yield LogEvent per line; BUG-001 filters applied inside parseLine)
pipeline.ts fold:
   • userMap[token]++, claudeMap[token]++       (tokenize per event)
   • meta.tokensIn  += e.tokensIn               (GAP-004)
     meta.tokensOut += e.tokensOut
   • meta.minTs / meta.maxTs / meta.messages++
        │
        ▼
topN(userMap, 100)        topN(claudeMap, 100)
        │
        ▼
render.ts  →  ./ok-claude-output.html  →  open
```

**Memory shape after F3:** vocab `Map<string, number>` (bounded by unique tokens, realistic ~10⁵) is the only growing structure. No joined per-role text strings. No accumulated `LogEvent[]`. Tokens fall out of scope after each event.

## Components

### New

- **`src/stream.ts`** — side-effect tier (alongside `discover`, `pipeline`, `cli`).
  - `streamEvents(files: FileEntry[], onProgress: (bytesDone, fileIdx) => void): AsyncIterable<LogEvent>`
  - Per file: `createReadStream(path)` piped through `readline.createInterface`. Per line → `parseLine` → yield non-null. After file's `close` event, call `onProgress(cumulativeBytes, fileIdx + 1)`.
  - Read errors per file → log to stderr (`ok-claude: skipped <path>: <err>`), continue with next file. Stream never throws.

- **`src/progress.ts`** — pure factory + side effect on `process.stderr`.
  - `createProgress(totalBytes: number, fileCount: number): { tick(bytesDone, fileIdx): void; done(): void }`
  - TTY gate: `if (!process.stderr.isTTY) return no-op pair`.
  - Throttle: redraw at most every 50 ms (`Date.now()` diff). Last tick always renders regardless of throttle.
  - Format: `[████████░░░░░░░░░░░░] 42%  37 / 87 files  ·  12.4 / 29.1 MB` written with `\r` rewrite. `done()` clears the line (`\r\x1b[K`) and prints `\n`.
  - Bar width: 20 chars. `formatMB(bytes)` returns a bare number with one decimal (e.g. `"12.4"`); the literal `" / "` and `" MB"` live in the format template — so the `MB` suffix appears once per pair, not twice.

### Changed

- **`src/discover.ts`**
  - `discoverLogs(): Promise<Array<{ path: string; size: number }>>` — now `stat`s each entry (the recursive `readdir` already returns `Dirent` so we get the path; `stat` adds size). Sort by path preserved.
  - `logsRoot()` unchanged.

- **`src/parse.ts`**
  - Add `parseLine(line: string): LogEvent | null` — single-line tolerant parse. Becomes the canonical primitive.
  - Keep `parseJsonl(content: string): LogEvent[]` as `content.split("\n").map(parseLine).filter(Boolean)` for existing unit tests.
  - **BUG-001 filters applied inside `parseLine`:**
    - Skip when `raw.isMeta === true` (top-level flag).
    - In `extractText`, after concatenating text blocks, strip these tag pairs and their inner content (case-sensitive, non-greedy, multi-line — these are full XML-like blocks injected by the harness):
      - `<system-reminder>…</system-reminder>`
      - `<command-name>…</command-name>`
      - `<command-message>…</command-message>`
      - `<command-args>…</command-args>`
      - `<local-command-stdout>…</local-command-stdout>`
      - `<local-command-stderr>…</local-command-stderr>`
    - If post-strip text is empty/whitespace, return null (same as current empty-text path).
  - **GAP-004 extraction:** read `raw.message?.usage?.input_tokens` and `raw.message?.usage?.output_tokens`. Tolerant: ignore unless both are `number`. Attach to event only when present.
  - `LogEvent` extended:
    ```ts
    export type LogEvent = {
      role: "user" | "assistant";
      text: string;
      timestamp?: string;
      tokensIn?: number;
      tokensOut?: number;
    };
    ```

- **`src/pipeline.ts`**
  - Removes `events: LogEvent[]` accumulator. Removes `topForRole` helper. Removes `dateRangeOf(events)` array-walk — folded into the stream as `meta.minTs` / `meta.maxTs`.
  - After the loop, build the existing `RenderMeta.dateRange` shape from the folded timestamps: `dateRange: meta.minTs && meta.maxTs ? [meta.minTs, meta.maxTs] : null`.
  - New shape:
    ```ts
    const userMap = new Map<string, number>();
    const claudeMap = new Map<string, number>();
    const meta = { sessions: files.length, messages: 0, tokensIn: 0, tokensOut: 0, minTs: undefined, maxTs: undefined };
    const totalBytes = files.reduce((s, f) => s + f.size, 0);
    const progress = createProgress(totalBytes, files.length);

    for await (const e of streamEvents(files, progress.tick)) {
      const map = e.role === "user" ? userMap : claudeMap;
      for (const tok of tokenize(e.text)) map.set(tok, (map.get(tok) ?? 0) + 1);
      meta.messages++;
      if (e.tokensIn) meta.tokensIn += e.tokensIn;
      if (e.tokensOut) meta.tokensOut += e.tokensOut;
      if (e.timestamp) {
        if (!meta.minTs || e.timestamp < meta.minTs) meta.minTs = e.timestamp;
        if (!meta.maxTs || e.timestamp > meta.maxTs) meta.maxTs = e.timestamp;
      }
    }
    progress.done();

    const topUser   = topN(userMap, TOP_N);
    const topClaude = topN(claudeMap, TOP_N);
    ```

- **`src/render.ts`**
  - `RenderMeta` gains `tokensIn: number`, `tokensOut: number`.
  - Subhead template adds tokens: `"4.2M tokens · 1,847 messages · Jan 5 – May 14"` (humanize tokens with `formatTokens(n)` — `K`/`M` suffix, one decimal).
  - When `tokensIn + tokensOut === 0` (older logs without `usage`), omit the tokens segment — graceful degrade.

### Removed

- `events: LogEvent[]` accumulator from `pipeline.ts`.
- `topForRole(events, role)` helper — folded into the streaming loop.
- `dateRangeOf(events)` helper — folded into the streaming loop.

## Data flow contract

- `discover.ts` returns paths sorted; `stream.ts` consumes in that order — deterministic event order across runs.
- `parseLine` is the only place that owns the BUG-001 filter rules. Anything else parsing JSONL goes through `parseLine`.
- `tokenize.ts`, `aggregate.ts` (`topN`), `render.ts` are unchanged — same signatures, same purity. The streaming refactor lives in `stream.ts` + `pipeline.ts`; aggregation math is preserved.

## Error handling

- File `createReadStream` error mid-iteration → `stderr: ok-claude: skipped <path>: <err>`, advance to next file. Same tolerance posture as today.
- Malformed JSONL line → `parseLine` returns null. Stream skips. No log spam — JSONL has no schema guarantee per `docs/techstack.md` § Architecture Rules ("Tolerant parse").
- Empty `~/.claude/projects/` → unchanged short-circuit at `discover.ts` (returns `[]`, pipeline returns `{ outPath: null, reason }`).
- Progress writes never throw — TTY check up front gates the whole subsystem.

## Testing

| File | New / changed | Cases |
| --- | --- | --- |
| `src/parse.test.ts` | extend | (a) `isMeta: true` line → skipped. (b) `<system-reminder>…</system-reminder>` body stripped from extracted text. (c) Each `<command-*>` / `<local-command-stdout>` pair stripped. (d) Post-strip empty text → null. (e) `usage.input_tokens` + `output_tokens` parsed when numbers; absent / non-number → undefined. (f) Existing tolerant-parse cases still pass. |
| `src/stream.test.ts` | **new** | Fixture: temp dir with 2-3 hand-rolled `.jsonl` files. Assert (a) yielded event count + ordering matches input lines minus filtered ones. (b) `onProgress` fires once per file with monotonic `bytesDone`. (c) One unreadable file → stderr skip line + remaining files yield. |
| `src/pipeline.test.ts` | extend | (a) Two fixture files with known user + claude lines → expected `topUser` / `topClaude` arrays. (b) `meta.tokensIn` / `tokensOut` are sums of fixture `usage` fields. (c) Regression guard: pipeline source must not import `LogEvent[]` accumulation pattern (grep test for `events.push` / `: LogEvent\[\]` in `pipeline.ts` — keep memory shape honest). |
| `src/progress.test.ts` | **new** | (a) `process.stderr.isTTY = false` → `tick` writes nothing. (b) `isTTY = true` with mocked `write` → format matches `[bar] N%  X / Y files  ·  M.M / N.N MB`. (c) Two `tick` calls within 50 ms → second skipped; third after 60 ms → renders. (d) `done()` always renders + emits `\n`. |
| `src/render.test.ts` | extend | (a) Subhead includes `"X.XM tokens"` when `meta.tokensIn + tokensOut > 0`. (b) Subhead omits tokens segment when sum is 0. |

## Module index delta (for `docs/overview.md` after merge)

```
| `src/stream.ts`   | Side-effect tier. Reads files via `readline`, yields `LogEvent`s, calls `onProgress` after each file close. |
| `src/progress.ts` | TTY-gated stderr progress bar. No-op when piped. |
```

`src/discover.ts`, `src/parse.ts`, `src/pipeline.ts`, `src/render.ts` rows update to reflect signature / responsibility changes (size return, parseLine, fold, tokens subhead).

## Risks + mitigations

- **`readline` event-driven loop + async iteration interleaving** — Node `readline.createInterface` over a stream emits `line` synchronously per chunk; wrapping into an `AsyncIterable` requires a small queue/promise pump. Standard pattern (`createInterface[Symbol.asyncIterator]()` already returns an async iterator on Node 20+). Use the built-in async iterator directly — no custom pump.
- **`isMeta` field path uncertainty** — `BUG-001` backlog note verified the flag exists at the top-level of injected lines via JSONL probe on this repo's own logs. If the flag's location turns out to differ on older logs, fall back to "skip if `isMeta === true`" (current proposal) and revisit during impl using a real `~/.claude/projects/` sample.
- **`usage` field path uncertainty** — `GAP-004` backlog note flags this. Implementation will verify field path against a real assistant-line JSONL sample on first impl step. Tolerant parse means a wrong path silently degrades to "no tokens in subhead" — graceful.
- **Progress bar in CI** — `isTTY` check handles it. Add a non-TTY test case explicitly.

## Out of scope (recorded for future)

- Parallelism (worker threads). Defer to DEBT-### if real users show slowness post-ship.
- Denoising pasted code blocks (GAP-002). Stays backlog.
- Counting-rule re-evaluation (GAP-003). Stays backlog, blocked on GAP-002.
- ETA estimation / spinner / per-file name display in the bar. YAGNI — bytes + file count give enough motion.

## Acceptance

- `npx ok-claude` on a populated `~/.claude/projects/` of any realistic size completes without an `Invalid string length` / OOM.
- Terminal shows a moving progress bar on TTY; non-TTY (`npx ok-claude > /dev/null`) stays silent.
- Output HTML's "You" tab top words no longer reflect harness-injected vocabulary. Verification: parse a real `~/.claude/projects/` sample before vs after, confirm tokens that came *exclusively* from tag bodies (`system-reminder`, `local-command-stdout`, etc.) are absent post-fix. Words that also occur in legitimate user prose (e.g. `command` in "git command") may still appear — that is correct behavior, not a regression.
- Subhead reads `"<tokens> · <messages> · <date range>"` when assistant lines carry `usage` fields.
- All non-negotiables still hold.
