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

## User

Claude Code community. Anyone with a populated `~/.claude/projects/` directory who wants a shareable visual of their AI conversation patterns. Distribution via npm registry; users run `npx ok-claude` with zero install. Fallback `npx github:user/ok-claude` works pre-publish.

## Current State

active development — MVP (F1 `mvp-wordcloud`) shipped end-to-end; F2–F7 roadmap queued in `docs/backlog.md`.

## Module Index

| Path | Role |
| --- | --- |
| `src/cli.ts` | Entrypoint with shebang (banner via tsup). Awaits `pipeline.run`, opens the result HTML, writes status to stderr on empty/missing logs. |
| `src/pipeline.ts` | Orchestrator: discover → read → parse → tokenize → aggregate → topN → render → write. Returns `{ outPath }` or `{ outPath: null, reason }`. |
| `src/discover.ts` | Recursive `readdir` of `~/.claude/projects/`. Filters to `.jsonl`, sorted. ENOENT → `[]`. |
| `src/parse.ts` | JSONL → `LogEvent[]`. Tolerant: skips malformed lines, unknown roles, empty text. Accepts content as string or as array of `{type:"text",text}` blocks. |
| `src/tokenize.ts` | `Intl.Segmenter` word tokenizer. Lowercases via `toLocaleLowerCase`, keeps `isWordLike`, drops single-char Latin/digits, keeps single-char CJK (Han / Hiragana / Katakana / Hangul), filters a small English stopword set. |
| `src/aggregate.ts` | Frequency `Map<string, number>` + `topN(map, n)` with count-desc / token-asc tie-break. |
| `src/render.ts` | HTML template. Inlines vendored `wordcloud2.js` at runtime via `fs.readFileSync(new URL("./vendor/wordcloud2.js", import.meta.url))` and JSON-encodes the topN payload (with `</script>` escape) into `window.__DATA__`. |
| `src/vendor/wordcloud2.js` | Vendored library, copied at repo time. tsup `onSuccess` mirrors `dist/vendor/wordcloud2.js` next to the built CLI so `import.meta.url` resolves in both source and bundle. |

## Data Flow

```
~/.claude/projects/**/*.jsonl
        │
        ▼
discover.ts         (sorted .jsonl paths; ENOENT → [])
        │
        ▼
fs.readFile + parse.ts        (JSONL line → LogEvent { role, text, timestamp? })
        │
        ▼
tokenize.ts         (Intl.Segmenter → lowercased word-like tokens, CJK-aware filters, stopwords)
        │
        ▼
aggregate.ts        (Map<token,count> → topN(100) with stable tie-break)
        │
        ▼
render.ts           (inlines vendor + topN JSON → self-contained HTML)
        │
        ▼
./ok-claude-output.html   →   open(outPath)
```

Empty / missing logs root short-circuits at `discover.ts` — pipeline returns `{ outPath: null, reason }`; CLI writes the reason to stderr and exits without launching the browser.

## Key Boundaries

- **External read surface:** `~/.claude/projects/**/*.jsonl`. Schema is not a public API — `parse.ts` is tolerant of unknown / malformed shapes.
- **External write surface:** one file, `./ok-claude-output.html` in the invocation directory. Self-contained; no follow-up writes.
- **Browser launch:** `open` package. Side-effect only; CLI exits after spawning, doesn't await the browser.
- **Vendored library boundary:** `src/vendor/` is a quarantine — vendored sources only, never authored here, refreshed via the policy documented in `src/vendor/README.md`.
