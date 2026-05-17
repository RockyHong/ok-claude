# Overview

<!-- harness-meta
external-tools: [github]
-->

> Living doc. Skeleton sections (Problem / User / Current State) seeded at scaffold from Q&A answers. Grown sections (Roadmap / Module Index / Data Flow / Key Boundaries) grow via doc-sync — every commit that adds, removes, or reshapes a module triggers a sync proposal. See `CLAUDE.md` Doc Sync.
>
> **Truth-only rule.** Final factual now-state only. No chronicle ("originally was X, now is Y"), no resolved-ID refs (`F#` / `GAP-###` / `DEBT-###` / `BUG-###` once closed), no "added for / surfaced during" attribution. Git log is the history archive; `docs/backlog.md` is the home for open IDs. On doc-sync: replace, don't append. Cut test per line — "what decision does this sharpen at what moment?" No answer → drop.
>
> **SSoT rule.** Code is the source of truth for module behavior. Module Index = thin role-per-file pointer only; dense detail (regex semantics, font systems, cloud opts) lives as a header comment at the top of the module itself (travels with refactor). Doc-sync triggers for this doc: add / remove / rename a module — not "reshape inside an existing module." `techstack.md` owns cross-cutting tech rules; `backlog.md` owns open IDs.
>
> `<!-- harness-meta -->` block: structured record of harness Q&A answers that aren't naturally prose. Read by `/super-bootstrap:resolve-plugins` as Tier-2 fallback when no pinned MCPs encode the signal. Hand-edit safe — keep YAML shape, list values in `[...]`.

## Name

`OK Claude` — pun on the most-typed phrase in a Claude Code session (`ok claude, go` / `ok, do it`). The wordcloud reveals how much of the dev week is literally that phrase + whatever the user was obsessing over. Self-roast share-fuel built into the brand.

- npm package: `ok-claude`
- bin: `ok-claude` (invoke `npx ok-claude`)
- display name: `OK Claude`
- output file: `~/Downloads/ok-claude-result-{YYYY-MM-DD-HHMM}.html` (falls back to invocation cwd if `~/Downloads` missing)

## Problem

Fun hobby CLI tool. Scans local Claude Code session logs at `~/.claude/projects/**/*.jsonl` and produces a mechanical (non-LLM) word/sentence frequency wordcloud. Output is a self-contained HTML page that auto-opens in the browser; user clicks an in-page "Export PNG" button to rasterize and share on social media — old-school Facebook trivia app energy. The artifact is a ~30s glance for the pun and the laugh, not a reflection / rewind tool (it may *feel* like rewind on first look — that's the hook, not the function).

Surface is most-frequent first-words split by speaker (user vs Claude) — the brand pun (`OK Claude`) lands as the giant word; opener tics form the halo around it. Dual horizontal halves on a 1:1 square artifact — user-cloud left, Claude-cloud right — satisfy the two-axis split (§ Non-Negotiable #6) without a side panel. Tokenization handles both Latin (whitespace) and CJK (character segmentation) input cleanly.

## Non-Negotiables

First principles. Every roadmap item checks against these before phase triage. Drift = re-read this section.

1. **Zero flags.** `npx ok-claude` only. No `--project`, no `--since`, no `--top-n`. Knobs kill the share impulse.
2. **Zero install.** `npx` distribution on Node. Claude Code CLI users already have Node — 100% overlap. No Python, no clone-and-run, no `.bat` shims.
3. **One shot, one file.** Run → progress in terminal → single self-contained HTML auto-opens → in-page PNG export → share. No config, no second run.
4. **All-time scope.** Whole `~/.claude/projects/` history every run. "Look how much of my year" beats "look at last week" for share-fuel. Stream-process to dodge memory ceilings rather than window the data.
5. **Mechanical, not AI.** Frequency counts only. No LLM calls inside this tool. The joke is *what you actually said*, not *what an LLM thinks you said*.
6. **Two tabs max** (You / Claude). Sentence layer (when added) stays inside the same two-tab frame. No third axis, no project pivot, no time pivot.
7. **Meme energy is the metric.** Every feature passes "does this make the screenshot funnier or easier to share?" Friction-adding features fail by default — backlog them as `GAP-###` until a real user begs.

When a roadmap item conflicts with one of these, the roadmap item loses or gets reshaped.

## User

Claude Code community. Anyone with a populated `~/.claude/projects/` directory who wants a shareable visual of their AI conversation patterns. Distribution via npm registry; users run `npx ok-claude` with zero install. Fallback `npx github:user/ok-claude` works pre-publish.

## Current State

Active development. v1 surface shipped — dual-half opener wordcloud, streaming all-time scope, in-page PNG export, tabloid visual lock. Queued items live in § Roadmap.

## Roadmap

> Forward feature list — ordered name + one-liner per feature. Single pillar for "what product will become." `/super-bootstrap:todo` reads this section: first unstarted entry (no matching spec slug under `docs/superpowers/specs/` or `docs/specs/`) surfaces as the next `Brainstorm:` row. Entries stay until the feature ships into the product narrative above; remove on ship via doc-sync.

| ID | Slug                  | Title                                              | Rationale                                                                |
| -- | --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| F7 | `sentence-frequency`  | Sentence tokenization + sentence-cloud             | Second surface inside the same two-tab frame.                            |

## Module Index

> Thin role-per-file pointer. Behavior detail lives in code; dense modules (`denoise.ts`, `render.ts`) carry a header comment.

| Path | Role |
| --- | --- |
| `src/aggregate.ts` | Frequency Maps + top-N selection (token + opener tie-break rules). |
| `src/cli.ts` | Entrypoint shebang. Runs pipeline, opens result HTML, writes status on empty/missing logs. |
| `src/denoise.ts` | Pre-tokenize text cleanup — strips code / pastes / paths / URLs / clitics. See file header. |
| `src/discover.ts` | Recursive scan of `~/.claude/projects/`. Returns sorted file list; ENOENT → `[]`; skips `/subagents/`. |
| `src/openers.ts` | First-word opener extractor. Returns `{key, surface}` or null per text. |
| `src/parse.ts` | JSONL line → LogEvent. Schema-driven prose gate; tolerant of unknown shapes. Schema reference: `docs/cc-log-schema.md`. |
| `src/pipeline.ts` | Orchestrator. discover → stream → denoise → fold → top-N → render → write. Owns output path + filename stamp + username slug chain. |
| `src/progress.ts` | TTY-gated stderr progress bar. No-op when piped. |
| `src/render.ts` | Emits self-contained HTML artifact + PNG-export chrome. See file header. |
| `src/stream.ts` | Side-effect tier. Reads each `.jsonl` via `readline`, yields LogEvents through `parseLine`. |
| `src/tokenize.ts` | `Intl.Segmenter` word tokenizer. Latin + CJK; short-Latin keep set + small stopword filter. |
| `src/vendor/wordcloud2.js` | Vendored canvas wordcloud lib. Refresh policy: `src/vendor/README.md`. |
| `src/vendor/html-to-image.js` | Vendored IIFE bundle for browser-side PNG export. Refresh policy: `src/vendor/README.md`. |

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
        ▼ (yield LogEvent per line; schema-driven drop-reason gate inside parseLine — see docs/cc-log-schema.md)
denoise.ts             (strip fenced/indented/inline markdown code + pastes + paths + clitics per event)
        │
        ▼
pipeline.ts fold       firstOpener(text) → foldOpener(userOpeners | claudeOpeners)  (drives cloud)
                       tokenize(text) → userMap[token]++ / claudeMap[token]++         (latent, unused)
                       meta.messages++ ; meta.tokensIn / tokensOut += usage
                       meta.minTs / maxTs from event timestamps
        │
        ▼
topNOpeners(userOpeners, 100)   topNOpeners(claudeOpeners, 100)
   → reshape to Array<[surface, count]> for topUser / topClaude
        │
        ▼
render.ts              (inlines vendor + topUser/topClaude + meta → self-contained dual-canvas HTML)
        │
        ▼
~/Downloads/ok-claude-result-{YYYY-MM-DD-HHMM}.html   →   open(outPath)
   (cwd fallback if Downloads missing)
```

Empty / missing logs root short-circuits at `discover.ts` — pipeline returns `{ outPath: null, reason }`; CLI writes the reason to stderr and exits without launching the browser.

Memory ceiling under streaming = vocab `Map` size (bounded by unique tokens) plus a single in-flight line buffer. No whole-corpus arrays, no per-role joined strings — all-time scope (Non-Negotiable #4) ships without hitting the V8 `String` length cap.

## Key Boundaries

- **External read surface:** `~/.claude/projects/**/*.jsonl`. Schema is not a public API — `parse.ts` is tolerant of unknown / malformed shapes.
- **External write surface:** one file per run, `ok-claude-result-{YYYY-MM-DD-HHMM}.html`, written to `~/Downloads/` when that directory exists (cross-platform via `os.homedir() + "/Downloads"`), else to invocation cwd as fallback. Self-contained; no follow-up writes. Same-minute re-run overwrites; later-minute re-run creates a new file (HHMM grain = run trail).
- **Browser launch:** `open` package. Side-effect only; CLI exits after spawning, doesn't await the browser.
- **Vendored library boundary:** `src/vendor/` is a quarantine — vendored sources only, never authored here, refreshed via the policy documented in `src/vendor/README.md`.
