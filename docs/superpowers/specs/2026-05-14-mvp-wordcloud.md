# Spec: F1 — MVP Wordcloud (Vertical Slice)

> **Status:** approved (bootstrap-promoted). **Slug:** `mvp-wordcloud`. **Date:** 2026-05-14.
>
> Temporal — delete this file after the matching plan ships and merges.

## Goal

Smallest end-to-end runnable: `npx whatdidclaudesay` scans the local Claude Code log directory, tokenizes word frequencies across all turns (user + Claude combined), and emits a self-contained HTML wordcloud that auto-opens in the default browser.

Proves the full pipeline shape — log discovery → JSONL parse → tokenization → frequency → HTML template → browser open — before any speaker-split / filter / export polish.

## Non-Goals (deferred to later features)

- Split user vs Claude into tabs — **F2**
- `--project`, `--since`, `--top-n` flags — **F3**
- Accessible top-N `<table>` fallback — **F4**
- In-page PNG export button — **F5** (`html-to-image` not vendored yet)
- Sentence frequency — **F6**
- npm publish, README polish — **F7**

## Inputs

- `~/.claude/projects/**/*.jsonl` — Claude Code session logs.
  - Path resolves via `os.homedir()` (cross-platform).
  - Each line = one JSON event. Schema not officially documented; spec targets the observed shape: events have a `type` field and a `message` object with `role` (`"user"` or `"assistant"`) and `content` (string or array of content blocks with `type: "text"` blocks).
  - Unknown / malformed lines skipped silently (logs evolve; tool must tolerate drift).
- No CLI flags in v1 of this feature. `npx whatdidclaudesay` with zero args = scan everything, all-time.

## Output

- File path: `./whatdidclaudesay-output.html` in the current working directory.
- Auto-opened in default browser via `open` package.
- HTML file is self-contained:
  - Inlined CSS (no external stylesheet, no Tailwind).
  - Inlined `wordcloud2.js` (vendored at build time; library code copied into the template).
  - Inlined frequency data as a JSON literal in a `<script>` tag.
  - No CDN refs, no network fetches at view time. Offline-safe.
- Page structure (v1 scope):
  - `<h1>` heading: "What Did Claude Say"
  - Subhead: count of sessions / projects scanned, date range covered (min..max event timestamp).
  - `<canvas>` rendered by `wordcloud2.js` with top-N word frequencies (default N = 100).
  - Tab toggle, table fallback, PNG export button — **not in this feature**.

## Tokenization

- Use built-in `Intl.Segmenter` with `granularity: "word"` and `locale: undefined` (host default).
- Per techstack.md: native CJK + Latin without external deps.
- Filter logic:
  - Keep only segments where `isWordLike === true` (drops whitespace + punctuation).
  - Lowercase Latin tokens (`String.prototype.toLocaleLowerCase()`).
  - Drop tokens of length < 2 (single chars too noisy for Latin; for CJK, single char is meaningful — exception: drop length < 1, but min-length filter applies only when token matches `/^[\p{L}\p{N}]+$/u` AND its character count > 1 OR all chars are CJK-script per `\p{Script=Han}` / `\p{Script=Hiragana}` / `\p{Script=Katakana}` / `\p{Script=Hangul}`).
  - Drop English stopword list (small built-in: `the, a, an, is, are, was, were, of, to, in, on, at, for, and, or, but, i, you, it, this, that, with, as, be, by, from, if, so, not, do, does, did, have, has, had, will, would, can, could, should, just, like, get, got` — kept short for v1; expand later if needed).
  - No stopword filter for CJK (no widely-agreed minimal CJK stoplist; expand in F6).

## Frequency Aggregation

- Single global frequency map across all sessions, all speakers.
- Top-N by count descending. Ties broken by token (lexicographic).
- Default N = 100. Hard-coded for v1 (configurable in F3).

## Architecture (planned modules)

Maps to `docs/overview.md` § Module Index growth — doc-sync proposal at commit will add this.

```
src/
  cli.ts            # entrypoint w/ shebang. Calls pipeline().
  pipeline.ts       # orchestrate: discover → parse → tokenize → aggregate → render → open.
  discover.ts       # glob ~/.claude/projects/**/*.jsonl
  parse.ts          # JSONL line iter → { role, text, timestamp }[]
  tokenize.ts       # Intl.Segmenter wrapper + filters
  aggregate.ts      # Map<token, count>, topN(map, n)
  render.ts         # HTML template + inline wordcloud2.js vendor + data
  open.ts           # thin wrapper around `open` package
  vendor/
    wordcloud2.min.js     # vendored at npm-install time? or copied in-repo?
```

Vendoring decision (resolved in plan): **copy `wordcloud2.js` into `src/vendor/` at repo time** (small file, ~30KB). Build step reads it as a string and string-interpolates into the HTML template. Keeps build deterministic, removes a runtime dep, satisfies offline-safety. Same path for `html-to-image` when F5 lands.

## Success Criteria

1. `pnpm build && node dist/cli.js` on a developer machine with a non-empty `~/.claude/projects/`:
   - Exits 0.
   - Creates `./whatdidclaudesay-output.html`.
   - Opens it in the default browser.
   - Page renders a wordcloud with ≥10 distinct visible tokens.
2. Empty / missing `~/.claude/projects/`:
   - Exits 0 with a single stderr line `No Claude Code logs found at ~/.claude/projects/`.
   - Does NOT open a browser, does NOT write an HTML file.
3. Unit tests (vitest) cover pure-logic modules:
   - `tokenize.ts` — Latin word, CJK Han char, mixed string, stopword drop, length-1 Latin drop, length-1 CJK keep.
   - `aggregate.ts` — frequency map build, top-N tie-break.
   - `parse.ts` — well-formed JSONL → events; malformed line → skipped, no throw.
4. Manual verification (out of cloud-runnable scope): wordcloud is visually legible — words don't overflow viewport, font sizes spread across a sensible range.

## Open Decisions (resolve in plan)

- **`tsx` vs `tsup` for dev/bundle:** lean `tsup` — bundles deps for `npx` shipping (single-file `dist/cli.js`), faster cold start. `tsx` only for `pnpm dev` watch.
- **ESM vs CJS for emitted CLI:** ESM only. Node 20+ required per techstack. Shebang `#!/usr/bin/env node`.
- **Package manager for repo:** techstack mentions `pnpm`. Confirm in plan; commit `pnpm-lock.yaml`.

## Risks

- **Schema drift in JSONL.** Claude Code's log format isn't a public API. Mitigation: tolerant parser, skip-and-continue on unknown shapes. Add a `--debug` flag in a later feature if drift bites in the wild.
- **Wordcloud rendering perf on huge histories.** `wordcloud2.js` is fine for ~1000 tokens; we cap at N=100 visible. Aggregation pass is O(total tokens) — should stay fast for ~100MB of JSONL on a laptop. If profile shows otherwise, stream parse in F3.
- **CJK tokenization quality.** `Intl.Segmenter` is good for Latin/CJK boundary detection but Chinese segmentation quality varies per ICU locale. Acceptable for v1 ("good enough" hobby tool); revisit in F6 if user feedback demands.
