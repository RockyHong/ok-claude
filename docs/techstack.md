# Tech Stack

> Living doc. Skeleton sections (Runtime / Framework / Key Dependencies / Build & Distribution) seeded at scaffold from detected facts. Grown sections (Architecture Rules / Coding Patterns / Rejected Alternatives) start empty and grow via doc-sync — every commit that touches a relevant area triggers a sync proposal. See `CLAUDE.md` Doc Sync.
>
> **Truth-only rule.** Final factual now-state only. No chronicle, no resolved-ID refs (`F#` / `GAP-###` / `DEBT-###` / `BUG-###` once closed), no "added for / surfaced during" attribution. Git log is the history archive; `docs/backlog.md` is the home for open IDs. Cut test per line — "what decision does this sharpen at what moment?" No answer → drop.
>
> **SSoT scope.** This file owns cross-cutting tech truth: stack choice, deps, build, architecture rules, coding patterns, rejected alternatives. Per-file behavior lives in `docs/overview.md` § Module Index (thin pointer) + the module's own header comment. Open issues live in `docs/backlog.md`.

## Runtime

Node.js 20+ (ESM). Required for `Intl.Segmenter` (CJK tokenization without extra deps) and modern `fs/promises`.

## Framework

None. CLI tool — no web framework. TypeScript for source.

## Key Dependencies

- **Runtime**
  - `open` — auto-launch default browser on result HTML
- **Embedded in output HTML** (vendored inline — no CDN, fully self-contained at view time)
  - `wordcloud2.js` — canvas wordcloud renderer
  - `html-to-image` — client-side PNG export from DOM
  - 4 woff2 fonts (Anton, Archivo Narrow, Inter, JetBrains Mono — latin subset, base64 `@font-face`)
  - Pure CSS (vendored inline) — no UI framework
- **Dev**
  - `typescript` — source language
  - `tsx` — dev runner (`pnpm dev`)
  - `tsup` — bundler (`pnpm build`)
  - `vitest` — test runner
  - `@types/node` — types

Native CJK + Latin tokenization via built-in `Intl.Segmenter` — no `jieba` / `tiny-segmenter` / `kuromoji` dependency.

## Build & Distribution

```
pnpm install
pnpm dev            # tsx src/cli.ts (one-shot)
pnpm build          # tsup bundle → dist/cli.js (shebang) + dist/vendor/ mirror
pnpm test           # vitest run
npm publish         # publishes to npm registry
```

User-facing run:

```
npx ok-claude                       # scan all projects, all time
npx github:user/ok-claude           # pre-publish fallback
```

No flags — see `docs/overview.md` § Non-Negotiables #1.

Output: `~/Downloads/ok-claude-result-{YYYY-MM-DD-HHMM}.html` (cwd fallback if `~/Downloads` missing; self-contained, auto-opened).

## Architecture Rules

- **Pipeline is one-way.** `discover → parse → denoise → tokenize → aggregate → render → write`. No back-edges. New transforms slot between two existing stages; never reach upstream.
- **Pure-logic modules stay pure.** `parse`, `denoise`, `tokenize`, `aggregate`, `render` take string / array input → string / array / Map output. No I/O, no `process.*`, no `fs`. Side effects live in `discover`, `pipeline`, `cli`.
- **Vendor assets = inlined, never fetched.** Browser libraries and fonts in `src/vendor/` are committed verbatim with source URL + version + license. `render.ts` reads JS as strings and woff2 as base64 at module load, then interpolates into the emitted HTML. Emitted HTML rule: no `<script src=...>`, no `<link href=https://...>`, no `fetch`. tsup `onSuccess` mirrors `src/vendor/` (including `src/vendor/fonts/`) to `dist/vendor/` so the runtime path resolves in both source and bundle.
- **`</script>` escape on user-derived strings.** `render.ts` `safeJson` rewrites `</script` → `<\/script` before injecting into `<script>` blocks; without this, a hostile token could break out of the JSON island.
- **Tolerant parse, strict types.** External JSONL has no schema guarantee — `parse.ts` swallows bad lines silently. Internal types (`LogEvent`, `RenderMeta`) are strict; pipeline assumes them post-parse.
- **One output file per run.** CLI emits `ok-claude-result-{YYYY-MM-DD-HHMM}.html` to `~/Downloads/` (cross-platform via `os.homedir() + "/Downloads"`); falls back to invocation cwd if Downloads missing. No temp files, no caches, no follow-up writes. Same-minute re-run overwrites; later-minute re-run creates a new file.

## Coding Patterns

- **ESM-only.** `"type": "module"` in `package.json`. `import`/`export`, never `require`. Relative imports include the `.js` suffix (NodeNext resolution).
- **`node:` prefix for built-ins.** `import { readFile } from "node:fs/promises"`, `node:os`, `node:path`. Makes intent explicit and avoids future shadowing.
- **TypeScript `strict` + `noUncheckedIndexedAccess`.** Indexed access yields `T | undefined`; nullish coalescing or guards required.
- **Function-first, classes when state really lives together.** No classes today — every module exports plain functions and types.
- **Tests are flat vitest specs (`*.test.ts`) co-located in `src/`.** No `__tests__` directory, no test helpers ladder. `pnpm test` runs the lot via `vitest run`.
- **`safeJson` over hand-rolled escape.** Any string crossing the JS↔HTML island goes through `JSON.stringify` + `</script>` rewrite. Never template literals with raw user data into `<script>` blocks.
- **Sync read at module top-level for build-time assets.** `render.ts` reads the vendored library once with `readFileSync` at import — captures it in a module-scoped const. Acceptable because the file is bundled-adjacent, not user-input-sized.

## Rejected Alternatives

> Grows via doc-sync when a decision documents what was considered and dropped, and why.

- **Drag-drop static web app (Vite)** — rejected during bootstrap. Manual folder pick = too much UX friction; target users prefer `npx` over web upload.
- **Node CLI + Puppeteer PNG** — rejected. ~100MB chromium download breaks `npx` zero-install promise.
- **Node CLI + node-canvas** — rejected. Native cairo/pango deps fail install on bare Windows; hurts cross-platform `npx`.
- **Python CLI (click + wordcloud + jieba)** — rejected. `pipx` friction > `npx`; smaller overlap with Claude Code user base.
- **Hybrid monorepo (core lib + CLI + web)** — deferred. Overkill for v1; revisit if web demo becomes desired post-1.0.
- **Tailwind / UI framework in output HTML** — rejected. Tailwind CDN breaks offline-safety; compiled Tailwind adds build step for a tiny static result page. Pure CSS vendored inline keeps the emitted HTML truly self-contained.
- **React / Vue / Svelte in output HTML** — rejected. Static result page; runtime framework adds payload + complexity with no interactivity gain beyond tab toggles.
- **Persistent `docs/specs/` folder** — deferred. Current scope fits in `overview.md` grown sections + `backlog.md` items. Temporal `docs/superpowers/specs/` covers per-feature design exploration. Promote to `docs/specs/` if product grows ≥5 distinct features.
