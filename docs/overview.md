# Overview

> Living doc. Skeleton sections (Problem / User / Current State) seeded at scaffold from Q&A answers. Grown sections (Module Index / Data Flow / Key Boundaries) start empty and grow via doc-sync — every commit that adds, removes, or reshapes a module triggers a sync proposal. See `CLAUDE.md` Doc Sync.

## Name

`OK Claude` — pun on the most-typed phrase in a Claude Code session (`ok claude, go` / `ok, do it`). The wordcloud reveals to the user how much of their dev week is literally that phrase + whatever they were obsessing over. Self-roast share-fuel built into the brand.

- npm package: `ok-claude`
- bin: `ok-claude` (invoke `npx ok-claude`)
- display name: `OK Claude`
- output file: `./ok-claude-output.html`

## Problem

Fun hobby CLI tool. Scans local Claude Code session logs at `~/.claude/projects/**/*.jsonl` and produces a mechanical (non-LLM) word/sentence frequency wordcloud. Output is a self-contained HTML page that auto-opens in the browser; user clicks an in-page "Export PNG" button to rasterize and share on social media — old-school Facebook trivia app energy, applied to "what did me + Claude actually spend this week on."

v1 surfaces most-used words split by speaker (user vs Claude). v2 extends to most-said sentences. Tokenization must handle both Latin (whitespace) and CJK (character segmentation) input cleanly. Layout (combined vs split tabs/images) decided post-bootstrap.

## Non-Negotiables

First principles. Every roadmap item checks against these before phase triage. Drift = re-read this section.

1. **Zero flags.** `npx ok-claude` only. No `--project`, no `--since`, no `--top-n`. Knobs kill the share impulse.
2. **Zero install.** `npx` distribution on Node. Claude Code CLI users already have Node — 100% overlap. No Python, no clone-and-run, no `.bat` shims.
3. **One shot, one file.** Run → progress in terminal → single self-contained HTML auto-opens → in-page PNG export → share. No config, no second run.
4. **All-time scope.** Whole `~/.claude/projects/` history every run. "Look how much of my year" beats "look at last week" for share-fuel. Stream-process to dodge memory ceilings rather than window the data.
5. **Mechanical, not AI.** Frequency counts only. No LLM calls inside this tool. The joke is *what you actually said*, not *what an LLM thinks you said*.
6. **Two tabs max** (You / Claude). v2 adds sentences inside the same two-tab frame. No third axis, no project pivot, no time pivot.
7. **Meme energy is the metric.** Every feature passes "does this make the screenshot funnier or easier to share?" Friction-adding features fail by default — backlog them as `GAP-###` until a real user begs.

When a roadmap item conflicts with one of these, the roadmap item loses or gets reshaped. F3 was originally `--project / --since / --top-n` filters; collided with #1 and #7; reshaped to "stream + progress bar, no flags."

## User

Claude Code community. Anyone with a populated `~/.claude/projects/` directory who wants a shareable visual of their AI conversation patterns. Distribution via npm registry; users run `npx ok-claude` with zero install. Fallback `npx github:user/ok-claude` works pre-publish.

## Current State

active development — MVP (F1 `mvp-wordcloud`) shipped end-to-end; F2–F7 roadmap queued in `docs/backlog.md`.

## Module Index

| Path | Role |
| --- | --- |
| `src/aggregate.ts` | Frequency `Map<string, number>` + `topN(map, n)` with count-desc / token-asc tie-break. |
| `src/cli.ts` | Entrypoint with shebang (banner via tsup). Awaits `pipeline.run`, opens the result HTML, writes status to stderr on empty/missing logs. |
| `src/denoise.ts` | Markdown code stripper. `denoiseMarkdown(text)` removes fenced ``` blocks (terminated + unterminated), 4-space-indented code blocks (CommonMark-style: blank line above), and inline `` `code` `` spans. Run before tokenize so pasted code/JSON doesn't swamp frequency counts (GAP-002). Prose untouched. |
| `src/discover.ts` | Recursive readdir of `~/.claude/projects/` + stat per file. Returns sorted `{path, size}[]`. ENOENT → `[]`. |
| `src/parse.ts` | JSONL → LogEvents. Exposes `parseLine(line)` (canonical primitive) and `parseJsonl(content)` (wrapper). Skips `isMeta: true`. Strips harness tag bodies (`system-reminder`, `command-*`, `local-command-stdout/stderr`, `task-notification`, `bash-*`). Extracts `usage.input_tokens`/`output_tokens` when present. Tolerant: malformed lines, unknown roles, post-strip-empty text → null. |
| `src/pipeline.ts` | Orchestrator: discover → stream → tokenize-and-fold into per-role frequency Maps → topN → render → write. Accumulates messages, token sums, and min/max timestamp inline. Returns `{outPath}` or `{outPath: null, reason}`. |
| `src/progress.ts` | TTY-gated stderr progress bar. `createProgress(totalBytes, fileCount)` returns `{tick, done}`. No-op when stderr is piped — CI-safe. |
| `src/render.ts` | HTML template. Inlines vendored `wordcloud2.js` and a single `<canvas>`; emits two tab buttons (You / Claude) with click-driven canvas swap. Per-tab empty-state. Subhead surfaces real token totals (K/M humanized), session + message counts, and date range. JSON-encodes `{topUser, topClaude, meta}` into `window.__DATA__`. |
| `src/stream.ts` | Side-effect tier. Reads each `.jsonl` via `readline`, yields `LogEvent`s through `parseLine`, fires `onProgress` after each file close. Per-file read errors are logged to stderr; stream continues. |
| `src/tokenize.ts` | `Intl.Segmenter` word tokenizer. Lowercases via `toLocaleLowerCase`, keeps `isWordLike`, drops single-char Latin/digits, keeps single-char CJK (Han / Hiragana / Katakana / Hangul), filters a small English stopword set. |
| `src/vendor/wordcloud2.js` | Vendored library, copied at repo time. tsup `onSuccess` mirrors `dist/vendor/wordcloud2.js` next to the built CLI so `import.meta.url` resolves in both source and bundle. |

## Data Flow

```
~/.claude/projects/**/*.jsonl
        │
        ▼
discover.ts            (sorted {path, size}[] + totalBytes; ENOENT → [])
        │
        ▼
stream.ts (readline)   ── onProgress(bytesDone, fileIdx) ─▶ progress.ts → stderr (TTY only)
        │
        ▼ (yield LogEvent per line; BUG-001 filters applied inside parseLine)
denoise.ts             (strip fenced/indented/inline markdown code per event; GAP-002)
        │
        ▼
pipeline.ts fold       userMap[token]++ / claudeMap[token]++
                       meta.messages++ ; meta.tokensIn / tokensOut += usage
                       meta.minTs / maxTs from event timestamps
        │
        ▼
topN(userMap, 100)     topN(claudeMap, 100)
        │
        ▼
render.ts              (inlines vendor + both topN + meta → self-contained HTML)
        │
        ▼
./ok-claude-output.html   →   open(outPath)
```

Empty / missing logs root short-circuits at `discover.ts` — pipeline returns `{ outPath: null, reason }`; CLI writes the reason to stderr and exits without launching the browser.

Memory ceiling under streaming = vocab `Map` size (bounded by unique tokens) plus a single in-flight line buffer. No whole-corpus arrays, no per-role joined strings — F3 ships the all-time scope (Non-Negotiable #4) without hitting the V8 `String` length cap.

## Key Boundaries

- **External read surface:** `~/.claude/projects/**/*.jsonl`. Schema is not a public API — `parse.ts` is tolerant of unknown / malformed shapes.
- **External write surface:** one file, `./ok-claude-output.html` in the invocation directory. Self-contained; no follow-up writes.
- **Browser launch:** `open` package. Side-effect only; CLI exits after spawning, doesn't await the browser.
- **Vendored library boundary:** `src/vendor/` is a quarantine — vendored sources only, never authored here, refreshed via the policy documented in `src/vendor/README.md`.
