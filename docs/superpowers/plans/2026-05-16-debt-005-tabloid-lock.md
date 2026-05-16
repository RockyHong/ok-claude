# Plan — DEBT-005 tabloid implementation

> Translate locked design (`mockups/tabloid.html`) into `src/render.ts`. Surgical port — visual layer only, no data-shape changes.

**Spec / source of truth:** `mockups/tabloid.html` (committed 2026-05-16). Backlog entry: `docs/backlog.md` § DEBT-005 (lock decisions documented).

**Scope:** Single visual-only commit (per DEBT-005 "ships single visual-only commit. No data-shape, no copy changes.") touching `src/render.ts` only. Co-located test pass for any pure helpers (`fitHeadline`-style code lives in template string — no test surface unless extracted).

**Out of scope:**
- DEBT-006 body-token strip cleanup (separate decision)
- `npm-publish` (F6) work
- Copy changes (frozen per F8 lock)
- Data-shape changes (`topUser` / `topClaude` / `meta` shape preserved)

---

## Locks (don't break — re-confirm before edit)

From `mockups/tabloid.html`:

**Palette (CSS vars):**
- `--paper: #0d0d0a` (warm dark slab)
- `--ink-1: #f4f1ea` (shout — warm white, used for: brand wordmark, burn-truth scaffold, divider, rule, user identity in cloud)
- `--ink-2: #8a857c` (scaffold — mid warm gray, used for: sub-line, side-label whisper, footer ed-line)
- `--ink-3: #3a3a35` (fade — dark warm gray, used for: em-dash, ed-line tail meta)
- `--amber: #d97757` (Claude identity — side label, cloud, CTA chevron — LOCKED brand color)
- `--rule: #f4f1ea` (rule weight = warm white on dark)
- Body bg outside artifact: `#050505`

**Type system (two sub-systems):**
- UI tier — Anton (headline) + Archivo Narrow 400/500/700 (sub-line, labels, footer ed-line) + JetBrains Mono 400/700 (footer CTA)
- Cloud tier — Inter 800 ONLY (workhorse — never display face in cloud)
- Google Fonts link: `family=Anton&family=Archivo+Narrow:wght@400;500;700&family=Inter:wght@700;800&family=JetBrains+Mono:wght@400;700&display=swap`

**Header behavior:**
- Single line, `white-space: nowrap`, `line-height: 1.0`
- `fitHeadline()` JS auto-shrink: start 88px, floor 24px, loop `while (el.scrollWidth > el.clientWidth)` shrink 1px, guard 120 iterations
- Sub-line: Archivo Narrow 500, 22px, lowercase, R-align, ink-2 scaffold, ink-1 bold on numbers with `border-bottom: 2px solid var(--ink-1)` underline

**Rule below header:**
- `height: 4px; background: var(--ink-1)` — heavy primary
- `::after` pseudo: top 7px, height 1px, ink-1 — secondary thin (double-rule tabloid grammar)

**Side labels:**
- Archivo Narrow 500, 17px, lowercase, ink-2 base
- L-aligned user / R-aligned claude (mirror)
- `.n` (count): amber-bold for user `[N] messages`, ink-1 bold for claude
- Copy frozen per F8

**Cloud:**
- Per side: own `<canvas>` inside `.half.user` / `.half.claude` divs (padding-right: 28px / padding-left: 28px)
- `gridSize: 6`, `weightFactor: logScale(entries, fontMin*dpr, fontMax*dpr)`, `rotationSteps: 0`, `shuffle: false`, `shrinkToFit: true`, `drawOutOfBound: false`
- User: fontMin 16 / fontMax 240 / `rotateRatio: 0.35` / `minRotation: -π/9, maxRotation: π/9` / color `#f4f1ea` / uppercase `caseFn` / origin = `[cw - 24*dpr, ch/2]`
- Claude: fontMin 16 / fontMax 200 / `rotateRatio: 0` / color `#d97757` / uppercase `caseFn` / origin = `[24*dpr, ch/2]`
- Both: `fontFamily: '"Inter", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif'`, `fontWeight: '800'`, `backgroundColor: 'rgba(0,0,0,0)'`

**Divider:**
- `position: absolute; left: 50%; top: 0; bottom: 0; width: 2px; background: var(--ink-1)` — solid warm-white slab between halves

**Footer:**
- Archivo Narrow 400, 14px, uppercase, 0.04em tracking, ink-2 — `vol. you · ed. 30d · 441 sessions · mechanical freq · no llm`
- `border-top: 1px solid var(--ink-1); padding-top: 12px`
- CTA: JetBrains Mono 700, 16px, ink-1, amber chevron — `▸ npx ok-claude`

**Render boot:**
- `whenFontsReady()` gate before render (uses `document.fonts.ready` if available)
- `renderAll()`: `fitHeadline()` first, then `drawHalf(canvas-user)`, then `drawHalf(canvas-claude)`
- `window.resize` debounced 120ms → `renderAll()`
- Double-`requestAnimationFrame` first render post-load

---

## Steps

Each step independently verifiable. Run `pnpm dev` after step groups (3/6/10/12) and eyeball against `mockups/tabloid.html` open side-by-side.

### Step 1 — Audit current `src/render.ts` shape
Read full file. Confirm template structure (CSS block + body + script blocks), identify which existing CSS vars / JS funcs map to which mockup locks. Note exact line ranges for each edit zone.

### Step 2 — Update Google Fonts link
Replace existing `<link href="...">` in `<head>` to load Anton + Archivo Narrow + Inter + JetBrains Mono per the locked family-list above.

### Step 3 — Update palette CSS vars in `:root`
Replace existing palette block with the 6 locked vars (`--paper`, `--ink-1/2/3`, `--amber`, `--rule`) + outer body bg `#050505`.

→ Smoke: `pnpm dev` → eyeball palette only (header/rest may still look wrong)

### Step 4 — Update artifact bg + subtle paper-highlight gradients
Per mockup: `.artifact` bg = layered `radial-gradient(... rgba(255,255,255,0.025), transparent 50%)` + `... rgba(255,255,255,0.03)` + `var(--paper)`. Keep 1080×1080 square + `padding: 52px 56px 44px`.

### Step 5 — Header CSS rewrite
- `.hdr-top`: Anton 64px (base; auto-fit will override), line-height 1.0, letter-spacing -0.005em, uppercase, ink-1, `white-space: nowrap`
- `.hdr-top .num`: amber
- `.hdr-top .dash`: ink-3 fade
- `.hdr-bot`: Archivo Narrow 500, 22px, R-align, lowercase, ink-2, 14px margin-top
- `.hdr-bot .num`: ink-1, weight 700, `border-bottom: 2px solid var(--ink-1)`
- `.hdr-rule`: 4px ink-1 + `::after` 7px-offset 1px ink-1 (double rule), 24px margin-top

### Step 6 — Side labels CSS rewrite
`.labels` grid 1fr/1fr, 28px margin-top, Archivo Narrow 500 17px lowercase ink-2.
`.l` L-align, `.r` R-align ink-1.
`.n` amber bold for user-side count.

→ Smoke: header + labels now match mockup; cloud still old

### Step 7 — Cloud container CSS rewrite
`.halves` grid 1fr/1fr, 14px margin-top, `position: relative; overflow: hidden`.
`.divider` 2px ink-1 absolute 50%-line.
`.half { position: relative; overflow: hidden; }`.
`.half.user { padding-right: 28px; }`, `.half.claude { padding-left: 28px; }`.
`.cv { width: 100%; height: 100%; display: block; }`.

DOM: each half holds `<canvas id="canvas-user" class="cv">` / `canvas-claude`.

### Step 8 — Footer CSS rewrite
`.footer` flex row baseline, 14px margin-top, Archivo Narrow 400 14px uppercase 0.04em ink-2, `border-top: 1px solid var(--ink-1); padding-top: 12px`.
`.footer .cta` JetBrains Mono 700 16px ink-1, `.chev` amber margin-right 4px.

### Step 9 — Headline template strings
Build header HTML to lock-exact pattern using existing meta fields:
- Top: `OK. CLAUDE — <span class="num">[tokensOut humanized]</span> BURNED IN <span class="num">[days]</span>.`
- Bottom: `avg <span class="num">[tokensOut/days humanized]</span>/day.`
- Numbers humanized with existing helper if present, else inline `humanizeTokens()` (e.g., `10.5M`, `343K`).

→ Smoke: header now matches mockup including burn numbers

### Step 10 — JS `fitHeadline()` insertion
Add function (lock-exact code from mockup) before `renderAll()`:
```js
function fitHeadline() {
  const el = document.querySelector('.hdr-top');
  if (!el) return;
  let size = 88;
  el.style.fontSize = size + 'px';
  let guard = 120;
  while (el.scrollWidth > el.clientWidth && size > 24 && guard-- > 0) {
    size -= 1;
    el.style.fontSize = size + 'px';
  }
}
```
Call as first line of `renderAll()`. Confirm existing renderAll structure can accept the prepend.

### Step 11 — Cloud JS lock-port
Replace per-side WordCloud opts in `drawHalf` calls:
- `fontFamily: '"Inter", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif'`
- `fontWeight: '800'`
- user `color: '#f4f1ea'`, claude `color: '#d97757'`
- both `caseFn: s => s.toUpperCase()` (if existing drawHalf supports it; else apply uppercase in pre-map of entries)
- user `fontMin: 16, fontMax: 240, rotateRatio: 0.35`
- claude `fontMin: 16, fontMax: 200, rotateRatio: 0`
- both `minRotation: -Math.PI / 9, maxRotation: Math.PI / 9, rotationSteps: 0`
- `gridSize: 6`, `shuffle: false`, `shrinkToFit: true`, `drawOutOfBound: false`
- origin inner-edge `24*dpr` per side
- `backgroundColor: 'rgba(0,0,0,0)'`

### Step 12 — `whenFontsReady` gate
Confirm existing render boot calls `document.fonts.ready` (or polyfill) before first `renderAll`. If absent, add `whenFontsReady()` helper + wrap initial render. Web fonts (Anton, Inter) must load before canvas measure or sizing is off.

→ Smoke: full output matches mockup. Diff via screenshot compare if needed.

### Step 13 — Edge case verification
Run pipeline against 3 corpus shapes:
- Real `~/.claude/projects/` (typical, lopsided one way)
- Small synthetic (5 openers per side — underfill case)
- Single-char-dominated (force `i` / `A` / `1` to top — verify Inter UPPERCASE renders `I` cleanly, not as bare `|`)

Confirm: no overflow, both halves balanced, divider always visible, headline auto-fits at typical token magnitudes (1K → 100M range).

### Step 14 — PNG export smoke
Click in-page export button. Verify `html-to-image` output:
- Web fonts rendered correctly (not fallback to system)
- Canvas content captured (wordcloud2 draws to canvas; html-to-image needs to embed canvas snapshot — may need `canvas.toDataURL()` step if html-to-image misses canvas)
- PNG dimensions = 1080×1080
- All identity colors preserved (no rgba alpha loss)

If PNG export breaks for font reasons: document in DEBT-### entry; likely needs font-face preload via `document.fonts.load()` array.

### Step 15 — Doc sync (pre-commit)
Scan docs for stale refs:
- `docs/overview.md` § Current State — mentions DEBT-005 still flagged; update to "F8 + DEBT-005 shipped"
- `docs/overview.md` § Module Index `src/render.ts` row — refresh description to reflect tabloid lock (current row references mockup-f8 era)
- `docs/backlog.md` DEBT-005 — delete entry (work shipped, git history is archive per `CLAUDE.md` doc-sync rule)
- `docs/backlog.md` DEBT-006 — re-read; if visual work absorbed body-token decision, update or hold per separate trigger
- `mockup-f8.html` — delete (superseded; § Doc Sync temporal cleanup says delete after merge)
- `mockups/tabloid.html` — delete after merge? OR promote to `docs/specs/`? Decision: keep for next session's reference until impl confirmed; delete when commit cycle closes (production render IS the canonical reference once shipped).

### Step 16 — Commit
Conventional commit (per CLAUDE.md): `feat(render): tabloid visual lock — DEBT-005 ship`. Single atomic commit. Use `/super-bootstrap:commit` to scope to session changes only.

---

## Verification

- **No automated visual test surface** — visual implementation verified by eyeball + smoke against `mockups/tabloid.html`. Existing test suite (`pnpm test`) covers pipeline + parse + tokenize contracts — keep green; no new tests required for this commit.
- **Type-check:** `pnpm exec tsc --noEmit` must pass.
- **Smoke:** `pnpm exec tsx -e "import('./src/pipeline.ts').then(m => m.run()).then(r => console.log(JSON.stringify(r)))"` runs end-to-end without auto-open; open the resulting `./ok-claude-output.html` manually.
- **Eyeball checklist:**
  - Header single-line, auto-shrunk if needed, never wraps
  - Double-rule under header
  - Both side labels mirror-aligned
  - Divider visible, full height between halves
  - User cloud chaotic (rotation), claude cloud ordered (horizontal)
  - User cloud warm-white, Claude cloud amber, no other colors in cloud
  - Footer ed-line + monospace CTA both visible

## Open questions for next session

1. Does existing `src/render.ts` `drawHalf` accept a `caseFn` opt, or apply case in pre-map? (Cheap to add either way.)
2. Does existing code humanize token counts (10.5M, 343K) or pass raw? If raw, add `humanizeTokens()` helper inline in template-string boot script (mockup uses pre-baked literals — production needs runtime formatting).
3. Does `html-to-image` correctly capture wordcloud2 canvas content in current ship? If not, this DEBT-005 commit may inherit a related GAP — file under `GAP-###` post-discovery.
4. After ship: keep `mockups/tabloid.html` as design archive, or delete per temporal cleanup? Recommend delete unless next iteration is queued.
