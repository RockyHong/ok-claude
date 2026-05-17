# Overview

<!-- harness-meta
external-tools: [github]
-->

> Living doc. Skeleton sections (Problem / User / Current State) seeded at scaffold from Q&A answers. Grown sections (Roadmap / Module Index / Data Flow / Key Boundaries) start empty and grow via doc-sync — every commit that adds, removes, or reshapes a module triggers a sync proposal. See `CLAUDE.md` Doc Sync.
>
> `<!-- harness-meta -->` block at top: structured record of harness Q&A answers that aren't naturally prose. Read by `/super-bootstrap:resolve-plugins` as Tier-2 fallback when no pinned MCPs encode the signal. Hand-edit safe — keep YAML shape, list values in `[...]`.

## Name

`OK Claude` — pun on the most-typed phrase in a Claude Code session (`ok claude, go` / `ok, do it`). The wordcloud reveals to the user how much of their dev week is literally that phrase + whatever they were obsessing over. Self-roast share-fuel built into the brand.

- npm package: `ok-claude`
- bin: `ok-claude` (invoke `npx ok-claude`)
- display name: `OK Claude`
- output file: `~/Downloads/ok-claude-result-{YYYY-MM-DD-HHMM}.html` (falls back to invocation cwd if `~/Downloads` missing)

## Problem

Fun hobby CLI tool. Scans local Claude Code session logs at `~/.claude/projects/**/*.jsonl` and produces a mechanical (non-LLM) word/sentence frequency wordcloud. Output is a self-contained HTML page that auto-opens in the browser; user clicks an in-page "Export PNG" button to rasterize and share on social media — old-school Facebook trivia app energy. The artifact is a ~30s glance for the pun and the laugh, not a reflection / rewind tool (it may *feel* like rewind on first look — that's the hook, not the function).

v1 surfaces most-frequent first-words split by speaker (user vs Claude) — the brand pun (`OK Claude`) lands as the giant word; opener tics form the halo around it (per F8 pivot, see § Roadmap). Dual horizontal halves on a 1:1 square artifact — user-cloud left, Claude-cloud right — satisfy the two-axis split (§ Non-Negotiable #6) without a side panel. v2 extends to most-said sentences via mechanical clustering (no LLM). Tokenization must handle both Latin (whitespace) and CJK (character segmentation) input cleanly.

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

active development — F1–F5 + F8 + DEBT-005 shipped (`mvp-wordcloud`, `speaker-split`, `stream-and-progress`, `opener-frequency`, `png-export`, `mood-cloud-pivot`, tabloid visual lock); F6–F7 queued below in § Roadmap.

## Roadmap

> Forward feature list — ordered name + one-liner per feature. Single pillar for "what product will become." `/super-bootstrap:todo` reads this section: first unstarted entry (no matching spec slug under `docs/superpowers/specs/` or `docs/specs/`) surfaces as the next `Brainstorm:` row. Entries stay until the feature ships into the product narrative above; remove on ship via doc-sync.

| ID | Slug                  | Title                                              | Rationale                                                                |
| -- | --------------------- | -------------------------------------------------- | ------------------------------------------------------------------------ |
| F6 | `npm-publish`         | Publish to npm registry, README, `npx` smoke       | Ships v1. Closes the distribution loop.                                  |
| F7 | `sentence-frequency`  | Sentence tokenization + sentence-cloud (v2)        | v2 per § Problem — iterate post-publish.                                 |

## Module Index

| Path | Role |
| --- | --- |
| `src/aggregate.ts` | Frequency `Map<string, number>` + `topN(map, n)` with count-desc / token-asc tie-break. Opener layer adds `OpenerEntry`, `OpenerMap = Map<key, Map<surface, count>>`, `foldOpener(map, op)` (clusters surfaces under lowercase key), `topNOpeners(map, n)` (per cluster: total = sum of surface counts, display = argmax surface with codepoint-asc tie-break so uppercase wins; entries sorted count-desc, display codepoint-asc on tie). |
| `src/cli.ts` | Entrypoint with shebang (banner via tsup). Awaits `pipeline.run`, opens the result HTML, writes status to stderr on empty/missing logs. |
| `src/denoise.ts` | Pre-tokenize text cleanup. `denoiseMarkdown(text)` strips: fenced ``` blocks (terminated + unterminated), 4-space-indented code blocks (CommonMark blank-line rule), non-fenced paste blocks (runs of 3+ consecutive stack-frame / type-error / identifier-dense / structured-data lines — Java `at`, Python `File ".."`, TS `Type '...' is not assignable`, Unity engine-native frames (`0x... (Mono|Unity|UnityEditor|UnityEngine|UnityPlayer)`), Gradle `> Task` output, PascalCase namespaces, high structural-char density (`{}[]():,;"='|<>` ratio ≥ 0.22 over ≥ 20 non-whitespace chars — catches inline JSON-chunk pastes; GAP-013), single long-and-dense lines (≥ 200 non-whitespace chars at same density OR 3+ `"<word>":` JSON-key matches — catches single-line JSON megablob pastes like `Body: {...}` HTTP-error dumps; GAP-013), inline `` `code` `` spans, single-line stack frames embedded in prose (`at Foo (path:line[:col])` — requires `/` or `\` inside parens to avoid false-positives on prose like `at Smith (contract: 5 pages)`), URLs with scheme (`https?://…` — stops at paired-enclosure punctuation), Windows absolute paths (`X:\…`), forward/backslash path fragments with file extensions (`src/foo.ts`, `apps/backend/src/x.ts`), 3+ segment deep paths (`apps/backend/src`), and English clitic suffixes (`'s`/`'t`/`'d`/`'m`/`'re`/`'ve`/`'ll`, straight + curly apostrophe) so segmenter doesn't emit clitic-fragment tokens (`re` from `we're`, `s` from `it's`). Run before tokenize (GAP-002 / GAP-009 D2 / GAP-010 / GAP-011 / GAP-013). |
| `src/discover.ts` | Recursive readdir of `~/.claude/projects/` + stat per file. Returns sorted `{path, size}[]`. ENOENT → `[]`. Skips any path containing `/subagents/` — Claude Code nests subagent dispatch transcripts at `<project>/<session-uuid>/subagents/agent-*.jsonl`; those are LLM-to-LLM prompts (not human typing) and otherwise dominate "user" vocab. |
| `src/openers.ts` | First-word opener extractor. `firstOpener(text)` returns `{key, surface}` or null — first wordlike segment via `Intl.Segmenter` (word granularity), key = lowercase + trailing-punct-stripped, surface = original-case + trailing-punct-stripped. `TRAILING_PUNCT` covers Latin (`. , ! ? ; :`) and CJK fullwidth (`。 、 ！ ？`). Returns null when no wordlike segment after denoise (empty, whitespace, punct-only, code-only). |
| `src/parse.ts` | JSONL → LogEvents. Exposes `parseLine(line)` (canonical primitive) and `parseJsonl(content)` (wrapper). Schema-driven prose gate via module-private `dropReason()` keyed on `docs/cc-log-schema.md` § Recommended prose-gating filter: type-whitelist (`type ∈ {user, assistant}`, drops `system` / `attachment` / `progress` / `last-prompt` / `file-history-snapshot` / `permission-mode` / `ai-title` / `queue-operation` / `custom-title` / `agent-name` / legacy `summary`) → flag gates (`isMeta`, `isSidechain`, `isApiErrorMessage`, `isCompactSummary`, `isVisibleInTranscriptOnly`) → role-whitelist. Strips harness tag bodies (`system-reminder`, `command-*`, `local-command-stdout/stderr`, `task-notification`, `bash-*`). Extracts `usage.input_tokens`/`output_tokens` when present. Tolerant: malformed lines, unknown shapes, post-strip-empty text → null. |
| `src/pipeline.ts` | Orchestrator: discover → stream → per-event denoise → `firstOpener` fold into per-role `OpenerMap` (drives cloud) AND tokenize-and-fold raw token occurrences into per-role frequency Maps (latent restore-bait per DEBT-006 — output unused by render) → `topNOpeners` (100) reshaped to `Array<[surface, count]>` for `topUser`/`topClaude` → render → write. Accumulates messages, token sums, and min/max timestamp inline. Output path resolved via `outputDir()` (probes `~/Downloads` via `statSync().isDirectory()`, falls back to `process.cwd()` on miss / throw) + `outputFilename(stamp)` (`ok-claude-result-${stamp}.html`). Timestamp built once via `buildStamp()` (local time, zero-padded `YYYY-MM-DD-HHMM`), threaded into BOTH `outputFilename` and `RenderInput.meta.timestamp` so the HTML filename pairs with the F5 PNG filename. Returns `{outPath}` or `{outPath: null, reason}`. |
| `src/progress.ts` | TTY-gated stderr progress bar. `createProgress(totalBytes, fileCount)` returns `{tick, done}`. No-op when stderr is piped — CI-safe. |
| `src/render.ts` | HTML template — tabloid visual lock (DEBT-005). Inlines vendored `wordcloud2.js` and two `<canvas class="cv">` elements (`#canvas-user` + `#canvas-claude`) inside dual `.halves` grid with absolute `.divider` (2px ink-1 between) on a 1080×1080 `.artifact`. Warm-ink ladder `:root` vars: `--paper #0d0d0a` / `--ink-1 #f4f1ea` / `--ink-2 #8a857c` / `--ink-3 #3a3a35` / `--amber #d97757` / `--rule #f4f1ea`. Two type sub-systems via Google Fonts (`fonts.googleapis.com` — see GAP-015): UI tier Anton (headline) + Archivo Narrow 400/500/700 (sub-line, labels, footer) + JetBrains Mono 700 (CTA); Cloud tier Inter 800 only (workhorse). Single-line `.hdr-top` `white-space: nowrap` + `fitHeadline()` JS shrink-loop (start 88px, floor 24px, guard 120 iter) auto-fits headline width. `OK. CLAUDE — <num>X tokens</num> burned in <num>Y days</num>.` amber-num accents; `.hdr-bot` `avg <num>Z tokens</num>/day.` Archivo Narrow 22px ink-2 scaffold with ink-1 underlined numbers. Double-rule `.hdr-rule` (4px primary + 1px secondary via `::after`). `.labels` grid L-align user (amber `<span class="n">` message-count accent) / R-align claude ink-1. `.half.user { padding-right: 28px }` / `.half.claude { padding-left: 28px }`. Per-side `drawHalf()` cloud opts: `gridSize: 6`, `weightFactor: logScale(entries, fontMin*dpr, fontMax*dpr)`, `rotationSteps: 0`, `minRotation: -π/9, maxRotation: π/9`, `shuffle: false`, `shrinkToFit: true`, `drawOutOfBound: false`, `caseFn` uppercase, origin inner-edge `24*dpr`. User: fontMin 16 / fontMax 240 / `rotateRatio: 0.35` / color `#f4f1ea`. Claude: fontMin 16 / fontMax 200 / `rotateRatio: 0` / color `#d97757`. Footer ed-line (Archivo Narrow 14px uppercase ink-2) `vol. you · ed. Nd · M sessions` + monospace `.cta` call-to-action `▸ confess yours — npx ok-claude` (JetBrains Mono 700, amber chevron). `whenFontsReady()` gate (`document.fonts.ready`) before first render; double-`requestAnimationFrame` first paint post-`load`. JSON-encodes `{topUser, topClaude, meta}` into `window.__DATA__`. F5 wraps the artifact in a `.page` flex container with sibling `.stage` (holds `#artifact`, the PNG capture target) + `.chrome` (centered `.actions` row with `▸ DOWNLOAD` / `▸ COPY` buttons in palette-locked JetBrains Mono 700, amber chevron primary on download, ink-1 secondary; `.toast` slot below in Archivo Narrow 14px ink-2, fade 200ms, hold 2500ms, single re-armable timer). No-scroll body (`overflow: hidden`); `.artifact` keeps native 1080×1080 design grid but scales for display via CSS `transform: scale(var(--s))` with `transform-origin: top left`; `.stage` reserves the scaled box via `calc(1080px * var(--s))`. `fitStage()` computes `--s` on `load` + debounced `resize` from viewport less padding / gap / chrome-axis size. Responsive media query `@media (max-aspect-ratio: 1/1)` flips `.page` to column + `.actions` to row (portrait → buttons under artifact; landscape → buttons right of artifact). `downloadPng()` calls `window.htmlToImage.toBlob` with `pixelRatio:2 backgroundColor:#0d0d0a cacheBust:true style:{transform:'none'}` (style override unscales the clone so the export stays native 2160×2160 regardless of on-screen scale); triggers synthetic `<a download>` with name `ok-claude-result-${meta.timestamp}.png` paired to the HTML filename. `copyPng()` writes a `ClipboardItem({'image/png': blob})` via `navigator.clipboard.write`; on `ClipboardItem`-undefined / throw, toast falls back to `copy not supported — try download instead` (sentinel-rejected promise chain skips success-toast after capture failure). `RenderInput.meta.timestamp` field threaded from pipeline. Inlines vendored `html-to-image.js` alongside `wordcloud2.js`. |
| `src/stream.ts` | Side-effect tier. Reads each `.jsonl` via `readline`, yields `LogEvent`s through `parseLine`, fires `onProgress` after each file close. Per-file read errors are logged to stderr; stream continues. |
| `src/tokenize.ts` | `Intl.Segmenter` word tokenizer. Lowercases via `toLocaleLowerCase`, keeps `isWordLike`, drops single-char Latin / pure-digit tokens (years, line numbers, sizes) **except** `y` / `n` / `k` admitted via `SHORT_LATIN_KEEP` (user interjections, GAP-009 D3), keeps single-char CJK (Han / Hiragana / Katakana / Hangul), filters a small English stopword set. |
| `src/vendor/wordcloud2.js` | Vendored library, copied at repo time. tsup `onSuccess` mirrors `dist/vendor/wordcloud2.js` next to the built CLI so `import.meta.url` resolves in both source and bundle. |
| `src/vendor/html-to-image.js` | Vendored IIFE bundle of `html-to-image` (`esbuild --bundle --format=iife --global-name=htmlToImage` from `node_modules/html-to-image/es/index.js`). Exposes `window.htmlToImage.toBlob` for the F5 chrome row's DOWNLOAD + COPY actions. tsup `onSuccess` mirrors `dist/vendor/html-to-image.js` next to the built CLI so `import.meta.url` resolves in both source and bundle. |

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
denoise.ts             (strip fenced/indented/inline markdown code per event; GAP-002)
        │
        ▼
pipeline.ts fold       firstOpener(text) → foldOpener(userOpeners | claudeOpeners)  (drives cloud)
                       tokenize(text) → userMap[token]++ / claudeMap[token]++         (latent, DEBT-006)
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

Memory ceiling under streaming = vocab `Map` size (bounded by unique tokens) plus a single in-flight line buffer. No whole-corpus arrays, no per-role joined strings — F3 ships the all-time scope (Non-Negotiable #4) without hitting the V8 `String` length cap.

## Key Boundaries

- **External read surface:** `~/.claude/projects/**/*.jsonl`. Schema is not a public API — `parse.ts` is tolerant of unknown / malformed shapes.
- **External write surface:** one file per run, `ok-claude-result-{YYYY-MM-DD-HHMM}.html`, written to `~/Downloads/` when that directory exists (cross-platform via `os.homedir() + "/Downloads"`), else to invocation cwd as fallback. Self-contained; no follow-up writes. Same-minute re-run overwrites; later-minute re-run creates a new file (HHMM grain = run trail).
- **Browser launch:** `open` package. Side-effect only; CLI exits after spawning, doesn't await the browser.
- **Vendored library boundary:** `src/vendor/` is a quarantine — vendored sources only, never authored here, refreshed via the policy documented in `src/vendor/README.md`.
