# F5 — png-export

> Spec for F5 from `docs/overview.md` § Roadmap. Brainstormed inline 2026-05-16 (chrome scope locked: `DOWNLOAD` / `COPY` / `SHUFFLE` + toast, outside `#artifact`, tabloid style). Ship target: post-F8 / DEBT-005 (artifact visual is now locked, so wiring the in-page export surface against it is safe).
> Temporal — delete this file when F5 lands (per `CLAUDE.md` § Doc Sync).

## Problem

Artifact is visually locked (DEBT-005 ship). Non-Negotiable § #3 ("one shot, one file → single self-contained HTML auto-opens → in-page PNG export → share") and § Problem (social-media share-loop is the core value prop) require an in-page action surface so users can:

1. **Rasterize** the artifact to a PNG file for upload-on-share workflows.
2. **Copy** the artifact image directly to clipboard for paste-into-compose workflows on platforms where attach-from-disk is awkward (X compose, Slack, Discord, Threads web).
3. **Re-roll** the wordcloud layout when the first random arrangement reads poorly (overlap near the centerline, a halo word cut off, a punchline word landing too small).

These three actions are the share-loop interface. They live **outside** the `1080×1080` artifact element so the exported image stays chrome-free.

Constraint reminder: F5 also has to honor § NN #1 (zero flags — chrome is keyboard-and-click only, no config), § NN #3 (one shot — no second CLI run, all chrome is in the emitted HTML), and § NN #7 (meme-energy — every chrome element must increase, not decrease, share impulse).

## Decisions

| # | Decision | Rationale |
|---|---|---|
| 1 | **Three actions, locked labels: `DOWNLOAD` / `COPY` / `SHUFFLE`.** No `PNG` suffix; no "EXPORT". | Single-verb parallel rhythm. `DOWNLOAD` is concrete (file lands somewhere); `EXPORT` is vague (export where?). `PNG` redundant — image visible directly above the row carries the object. `COPY` ambiguity (image vs text vs link) dissolved by adjacent image + toast feedback + `title=` tooltip. |
| 2 | **Chrome row lives OUTSIDE `#artifact`.** Layout = centered button row directly below the artifact + toast slot below the row. Lives on page background (`#050505`). | PNG capture target is `#artifact` only; chrome must not appear in the exported image. Layout option (c) from inline brainstorm — calmest of the three layouts considered (vs sticky bar / floating cluster). |
| 3 | **Visual style: tabloid-locked, chevron rhythm.** Each button = `▸ LABEL`. JetBrains Mono 700, ALL CAPS, ~16–18px. Hairline ink-1 border (`1px solid var(--ink-1)`), transparent fill, ink-1 hover glow. Chevron color signals hierarchy: amber `▸ DOWNLOAD` (primary action); ink-1 `▸ COPY` + `▸ SHUFFLE` (secondary). | Reuses `▸ npx ok-claude` CTA vocab from inside the artifact (DEBT-005). Three repeated chevrons = newsroom-table visual rhythm. Hierarchy via color, not iconography. |
| 4 | **No per-action icons (SVG or emoji).** | SVG icons (download / clipboard / dice) break the newsroom palette. Emoji glyphs render inconsistently cross-OS, kill the warm-ink calm. Text labels are unambiguous in context; iconography adds clutter without recognition gain. |
| 5 | **No social-platform share buttons** (X / LinkedIn / Facebook / Threads). | Intent URLs carry text + URL only — NOT images. User would still need to attach the local PNG manually in the platform's compose box. Adds 4 buttons of clutter for zero workflow savings; fails § NN #7. `COPY` covers all platforms via paste — one button replaces N intent URLs. |
| 6 | **Capture lib: `html-to-image`, vendored inline** as `src/vendor/html-to-image.js` (UMD/IIFE build, exposes `window.htmlToImage`). tsup `onSuccess` mirrors to `dist/vendor/` same as `wordcloud2.js`. | Pre-locked in `docs/techstack.md` § Key Dependencies. Static-HTML self-containment rule (Architecture Rules: no runtime CDN for JS). |
| 7 | **Capture target: `#artifact`** (id added to existing `.artifact` div). Options: `pixelRatio: 2`, `backgroundColor: '#0d0d0a'` (paper color), `cacheBust: true`. | DPR 2 matches existing canvas scale → crisp 2160×2160 export. Paper bg defeats transparent-pixel edges on platforms that auto-checkerboard PNGs. `cacheBust` keeps font subset / canvas snapshot fresh across shuffles. |
| 8 | **DOWNLOAD filename pairs with HTML filename.** `ok-claude-result-{same-YYYY-MM-DD-HHMM}.png`. Timestamp is computed once in `pipeline.ts.run()` and threaded through `RenderInput.meta.timestamp`. | PNG sitting next to HTML in Downloads (visual pair) reinforces the share artifact identity. Same-minute re-run keeps the pairing intact. Avoids re-deriving a timestamp client-side. |
| 9 | **COPY uses `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])`.** Wrapped in try/catch; on `ClipboardItem`-undefined OR `clipboard.write` throw, toast falls back to `copy not supported — try download instead`. | User gesture (button click) satisfies secure-context. Firefox on `file://` has historically blocked clipboard image writes — graceful fallback preserves UX. Chromium-family (≥M76) covers the dominant share of Claude Code users. |
| 10 | **SHUFFLE = Fisher-Yates on entries arrays + full re-render.** Keep `shuffle: false` on the WordCloud2 call (deterministic given input order); randomness lives in OUR re-ordering of the entries arrays. Both halves re-shuffle simultaneously. | Library-agnostic, predictable, no hidden state. Both halves change together = user perceives "the page reshuffled" not "one side hiccupped". Resize after a shuffle must re-render with the *shuffled* arrays, not snap back. |
| 11 | **Toast: single ephemeral slot below the button row.** ~2.5s visible, CSS opacity transition fade-in/out. Subsequent action resets the text AND the timer. Style: Archivo Narrow 14px ink-2, lowercase, no border. | Confirmation = high-value (did the file save?). Persistent ribbon = overkill. Style mirrors footer ed-line / labels — calm. |
| 12 | **Tooltip safety net on `▸ COPY` only.** `title="copy image to clipboard"`. | Free cold-read insurance for the one label whose object isn't 100% obvious from context. Other two labels need no tooltip. |
| 13 | **No keyboard shortcuts in v1.** Deferred (e.g. `D` / `C` / `S`). | Scope discipline. Add only on demand signal post-publish. |

## Non-goals (deferred)

- **Keyboard shortcuts** for the three actions — deferred; add only if user demand surfaces.
- **"Open Downloads folder" link** post-save — minor OS-shell glue, not worth maintenance.
- **Share-intent URLs** (X / LinkedIn / Facebook / Threads) — rejected (see Decision #5).
- **Theme toggle** (light vs dark) — breaks DEBT-005 tabloid lock; identity is the dark warm-ink paper.
- **Stats panel outside artifact** — duplicate of the burn-truth header inside.
- **Copy as SVG / WebP / clipboard text alt** — PNG only; matches what social platforms accept on paste.
- **Caption / disclaimer text field** — pollutes the share, not requested.
- **Re-locating the HTML output path post-publish** (GAP-005 if filed) — independent.
- **GAP-015 fonts-online dependency** — still in scope as its own item; F5 does not touch font loading.
- **F6 `npm-publish`** — happens next in roadmap; F5 ships behind the existing `npx github:user/ok-claude` fallback path.

## Surface changes (file-by-file)

- **`src/vendor/html-to-image.js`** (new)
  - Vendored UMD/IIFE build of `html-to-image` (latest tagged release at vendor time). License header + source URL + version comment, same convention as `wordcloud2.js`.
  - Must expose `window.htmlToImage.toBlob(node, options)` returning `Promise<Blob | null>`.
  - tsup `onSuccess` already mirrors `src/vendor/*` to `dist/vendor/`; new file rides that.
- **`src/render.ts`**
  - `RenderInput.meta` gains `timestamp: string` (the `YYYY-MM-DD-HHMM` matching `outputFilename`).
  - Add `const HTML_TO_IMAGE_JS = readFileSync(new URL("./vendor/html-to-image.js", import.meta.url), "utf8");` at module top, beside `VENDOR_JS`.
  - Add `id="artifact"` to the existing `.artifact` `<div>` so `document.getElementById('artifact')` is the unambiguous capture target.
  - Add a sibling `<div class="chrome">` block AFTER the closing `</div>` of `.artifact`, containing:
    - `<div class="actions">` row with three `<button>`s (`#btn-download` / `#btn-copy` / `#btn-shuffle`), each `<span class="chev">▸</span> LABEL`. Primary class `.btn.btn-primary` on download; secondary class `.btn` on the others.
    - `<div class="toast" id="toast"></div>` slot.
  - Inline `${HTML_TO_IMAGE_JS}` in a `<script>` block after the existing vendor (`${VENDOR_JS}`) block.
  - Append a chrome boot script (separate `<script>` block, after the existing boot IIFE) that:
    - Holds module-scoped `entriesUser` / `entriesClaude` (initialized from `DATA.topUser` / `DATA.topClaude`) so SHUFFLE mutates the closure copy, not `DATA`.
    - Implements `shuffle(arr)` (Fisher-Yates, `Math.random()`).
    - `renderAll(entriesUser, entriesClaude)` replaces the existing closure-internal call; on shuffle, both arrays are reshuffled then passed in. Resize handler also reads from the closure arrays so a shuffled state survives resize.
    - `downloadPng()` → `htmlToImage.toBlob(document.getElementById('artifact'), {pixelRatio: 2, backgroundColor: '#0d0d0a', cacheBust: true})` → on resolve: `URL.createObjectURL(blob)` → click a synthetic `<a download={pngName}>` → revoke object URL → `showToast('saved ' + pngName)`. `pngName = 'ok-claude-result-' + DATA.meta.timestamp + '.png'`.
    - `copyPng()` → `htmlToImage.toBlob(...)` → `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` inside `try`; on success `showToast('copied to clipboard')`; on `ClipboardItem` undefined or `write` throw, `showToast('copy not supported — try download instead')`.
    - `showToast(msg)`: sets `#toast` text, adds `.visible` class; `clearTimeout` any prior fade timer; `setTimeout` to remove `.visible` after 2500ms.
    - Wires `click` handlers on the three buttons; SHUFFLE handler reshuffles closure arrays, calls `renderAll(entriesUser, entriesClaude)`, then `showToast('reshuffled')`.
  - CSS additions (in the existing `<style>` block):
    - `.chrome { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 24px; }`
    - `.actions { display: flex; gap: 28px; }`
    - `.btn { font-family: 'JetBrains Mono', monospace; font-weight: 700; font-size: 16px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ink-1); background: transparent; border: 1px solid var(--ink-1); padding: 10px 18px; cursor: pointer; }` (palette-locked; refine via design pass if needed)
    - `.btn:hover { background: rgba(244, 241, 234, 0.06); }`
    - `.btn .chev { margin-right: 6px; color: var(--ink-1); }`
    - `.btn-primary .chev { color: var(--amber); }`
    - `.toast { font-family: 'Archivo Narrow', sans-serif; font-size: 14px; color: var(--ink-2); text-transform: lowercase; letter-spacing: 0.04em; opacity: 0; transition: opacity 200ms ease; min-height: 1em; }`
    - `.toast.visible { opacity: 1; }`
- **`src/pipeline.ts`**
  - Refactor: compute the timestamp string once at the top of `run()` (extract from existing `outputFilename` body) and pass it to both `renderHtml({ meta: { timestamp, ... } })` and to a thin `outputFilename(stamp)` wrapper. Avoids drift between filename and meta.
- **`package.json`**
  - Add `html-to-image` to `dependencies` so the vendor refresh / install pins a version. No `import` from `node_modules` at runtime — vendored copy is the runtime source. (Mirrors existing pattern for `wordcloud2` if/where present; otherwise this dep is added solely for version tracking.)

## Test surface

- **`render.test.ts`** (create if not present; otherwise extend)
  - `#artifact` id present on the artifact div.
  - `.chrome` block exists as a sibling AFTER `</div>` of `.artifact` (not a child).
  - Three buttons present with expected ids: `#btn-download`, `#btn-copy`, `#btn-shuffle`.
  - `title="copy image to clipboard"` on `#btn-copy`.
  - `#toast` slot present.
  - HTML contains an inline `html-to-image` script (search for an identifying export name in the UMD).
  - `RenderInput.meta.timestamp` round-trips into the embedded `window.__DATA__` JSON.
- **`pipeline.test.ts`**
  - Assert `outPath` filename's timestamp matches the timestamp present in the emitted HTML's `__DATA__.meta.timestamp` (single source of truth).
- **Manual smoke** (browser-only behavior, not Vitest-coverable):
  - Click DOWNLOAD → PNG arrives in browser's Downloads dir, opens cleanly, contains ONLY the artifact (no buttons, no toast).
  - Click COPY in Chrome/Edge → image pasteable into Discord/Slack/X-web compose.
  - Click COPY in Firefox on `file://` → either succeeds or toast shows fallback message (no console exception bubbles up).
  - Click SHUFFLE → both canvases visibly re-lay out; identical word inventory.
  - Resize window after a shuffle → cloud re-renders with the *shuffled* entries (not snap-back to frequency order).
  - Toast appears ~2.5s, fades, then is gone. Rapid clicks reset text + timer cleanly.

## Success criteria

1. `pnpm test` green.
2. `pnpm exec tsc --noEmit` green.
3. `pnpm build` green; `dist/vendor/html-to-image.js` exists post-build.
4. Manual smoke (above) passes on a current Chromium + current Firefox on real `~/.claude/projects/` corpus.
5. Exported PNG opens at 2160×2160 (DPR 2 × 1080), paper-colored bg, no chrome, identical to the on-screen artifact.
6. Chrome row visually consistent with the artifact (palette-locked, chevron rhythm, no off-style buttons).
7. F5 row removed from `docs/overview.md` § Roadmap; § Current State line appended; § Module Index entries updated per Surface changes.

## On-merge cleanup

- Delete this spec file (`docs/superpowers/specs/2026-05-16-png-export.md`) per `CLAUDE.md` § Doc Sync temporal cleanup.
- Delete F5 row from `docs/overview.md` § Roadmap.
- Append `F5` to § Current State shipped list; reword if needed.
- § Module Index batch updates:
  - `src/render.ts` row — append chrome (download/copy/shuffle outside `#artifact`), inline `html-to-image`, Fisher-Yates shuffle hook, toast slot, `RenderInput.meta.timestamp` field.
  - `src/pipeline.ts` row — append timestamp threaded into render meta (single source for filename + PNG name).
  - New row for `src/vendor/html-to-image.js`.
- `docs/techstack.md` § Key Dependencies — confirm `html-to-image` version pinned post-vendor-fetch.
- If a `GAP-###` or `DEBT-###` surfaces during build (e.g. Firefox `file://` clipboard quirk, html-to-image canvas-color edge), file in `docs/backlog.md` rather than expand F5 scope.
