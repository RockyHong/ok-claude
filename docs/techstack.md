# Tech Stack

> Living doc. Skeleton sections (Runtime / Framework / Key Dependencies / Build & Distribution) seeded at scaffold from detected facts. Grown sections (Architecture Rules / Coding Patterns / Rejected Alternatives) start empty and grow via doc-sync — every commit that touches a relevant area triggers a sync proposal. See `CLAUDE.md` Doc Sync.

## Runtime

Node.js 20+ (ESM). Required for `Intl.Segmenter` (CJK tokenization without extra deps) and modern `fs/promises`.

## Framework

None. CLI tool — no web framework. TypeScript for source.

## Key Dependencies

> Seed list — to be confirmed when scaffolded. Versions pinned at install.

- **Runtime**
  - `commander` — argv parsing
  - `open` — auto-launch default browser on result HTML
- **Embedded in output HTML** (vendored inline in the emitted file — no CDN, self-contained / offline-safe)
  - `wordcloud2.js` — canvas wordcloud renderer
  - `html-to-image` — client-side PNG export from DOM
  - Pure CSS (vendored inline) — no Tailwind / no UI framework. Single-page output with tab toggles (user/Claude × words/sentences) via vanilla JS + `<details>`. Accessible top-N `<table>` fallback rendered below the cloud for screen readers / low-vision users.
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
npx whatdidclaudesay                       # auto-scan all projects
npx whatdidclaudesay --project <name>      # scope one project
npx whatdidclaudesay --since 7d            # time window
npx github:user/whatdidclaudesay           # pre-publish fallback
```

Output: `./whatdidclaudesay-output.html` (self-contained, auto-opened).

## Architecture Rules

> Grows via doc-sync as patterns crystallize. Module boundaries, data flow direction, dependency philosophy, layering rules.

## Coding Patterns

> Grows via doc-sync as patterns crystallize. Import style, error handling convention, naming, class-vs-function bias, type usage.

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
