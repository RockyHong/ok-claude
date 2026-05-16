# Tech Stack

> Living doc. Skeleton sections (Runtime / Framework / Key Dependencies / Build & Distribution) seeded at scaffold from detected facts. Grown sections (Architecture Rules / Coding Patterns / Rejected Alternatives) start empty and grow via doc-sync — every commit that touches a relevant area triggers a sync proposal. See `CLAUDE.md` Doc Sync.

## Runtime

Node.js 20+ (ESM). Required for `Intl.Segmenter` (CJK tokenization without extra deps) and modern `fs/promises`.

## Framework

None. CLI tool — no web framework. TypeScript for source.

## Key Dependencies

> Seed list — to be confirmed when scaffolded. Versions pinned at install.

- **Runtime**
  - `open` — auto-launch default browser on result HTML
- **Embedded in output HTML** (vendored inline in the emitted file — no CDN for JS, offline-safe for logic)
  - `wordcloud2.js` — canvas wordcloud renderer
  - `html-to-image` — client-side PNG export from DOM
  - Pure CSS (vendored inline) — no Tailwind / no UI framework. Single-page output with tab toggles (user/Claude × words/sentences) via vanilla JS + `<details>`.
- **External in output HTML — Google Fonts `<link>`** (DEBT-005 tabloid lock). One `<link href="https://fonts.googleapis.com/...">` pulling Anton + Archivo Narrow + Inter + JetBrains Mono. Violates strict offline-safety; falls back to system fonts when offline (degraded look, headline auto-fit math off). Trade-off tracked by GAP-015 in backlog — resolution options: inline base64 woff2 / subset fonts / drop display faces / accept online dep.
- **Dev**
  - `typescript` — source language
  - `tsx` or `tsup` — dev runner / bundler (TBD)
  - `vitest` — test runner
  - `@types/node` — types

Native CJK + Latin tokenization via built-in `Intl.Segmenter` — no `jieba` / `tiny-segmenter` / `kuromoji` dependency.

## Build & Distribution

Commands to be confirmed when scaffolded:

```
pnpm install
pnpm dev            # tsx watch ./src/cli.ts
pnpm build          # bundle to dist/cli.js with shebang
pnpm test           # vitest
npm publish         # publishes to npm registry
```

User-facing run:

```
npx ok-claude                       # scan all projects, all time
npx github:user/ok-claude           # pre-publish fallback
```

No flags — see `docs/overview.md` § Non-Negotiables #1.

Output: `./ok-claude-output.html` (self-contained, auto-opened).

## Architecture Rules

- **Pipeline is one-way.** `discover → parse → denoise → tokenize → aggregate → render → write`. No back-edges. New transforms slot between two existing stages; never reach upstream.
- **Pure-logic modules stay pure.** `parse`, `denoise`, `tokenize`, `aggregate`, `render` take string / array input → string / array / Map output. No I/O, no `process.*`, no `fs`. Side effects live in `discover`, `pipeline`, `cli`.
- **Vendor library = inlined, never fetched.** Browser libraries in `src/vendor/` are committed verbatim with source URL + version + license header. `render.ts` reads them as strings (`fs.readFileSync(new URL(..., import.meta.url), "utf8")`) and string-interpolates into the emitted HTML. Emitted HTML rule: no `<script src=...>`, no `fetch`. Single exception: Google Fonts `<link href="https://fonts.googleapis.com/...">` (DEBT-005 tabloid lock; GAP-015 tracks resolution). tsup `onSuccess` mirrors `src/vendor/` to `dist/vendor/` so the runtime path resolves in both source and bundle.
- **`</script>` escape on user-derived strings.** `render.ts` `safeJson` rewrites `</script` → `<\/script` before injecting into `<script>` blocks; without this, a hostile token could break out of the JSON island.
- **Tolerant parse, strict types.** External JSONL has no schema guarantee — `parse.ts` swallows bad lines silently. Internal types (`LogEvent`, `RenderMeta`) are strict; pipeline assumes them post-parse.
- **One output file.** CLI emits exactly `./ok-claude-output.html` in the invocation dir. No temp files, no caches, no follow-up writes.

## Coding Patterns

- **ESM-only.** `"type": "module"` in `package.json`. `import`/`export`, never `require`. Relative imports include the `.js` suffix (NodeNext resolution).
- **`node:` prefix for built-ins.** `import { readFile } from "node:fs/promises"`, `node:os`, `node:path`. Makes intent explicit and avoids future shadowing.
- **TypeScript `strict` + `noUncheckedIndexedAccess`.** Indexed access yields `T | undefined`; nullish coalescing or guards required.
- **Function-first, classes when state really lives together.** v1 has no classes — every module exports plain functions and types.
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
- **Persistent `docs/specs/` folder** — deferred. v1 + v2 features fit in `overview.md` grown sections + `backlog.md` items. Temporal `docs/superpowers/specs/` covers per-feature design exploration. Promote to `docs/specs/` if product grows ≥5 distinct features.
