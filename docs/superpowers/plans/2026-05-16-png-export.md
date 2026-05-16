# F5 png-export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three in-page chrome buttons — `▸ DOWNLOAD` / `▸ COPY` / `▸ SHUFFLE` + toast — below the locked tabloid artifact, wired to `html-to-image`-based PNG capture / clipboard write and a Fisher-Yates re-layout. Chrome lives OUTSIDE `#artifact` so the captured image is chrome-free.

**Architecture:** Vendor `html-to-image` inline (UMD/IIFE, exposes `window.htmlToImage`), matching the existing `wordcloud2.js` vendoring pattern. Add `id="artifact"` to the existing `.artifact` div; append a sibling `.chrome` block on the page background. Thread the run timestamp once through `pipeline.ts → RenderInput.meta.timestamp` so the PNG filename pairs with the HTML filename. Chrome boot script reshuffles closure-held copies of `topUser` / `topClaude` entries (Fisher-Yates) and reuses the existing per-side WordCloud2 re-render path — `shuffle: false` stays, randomness lives in our reorder.

**Tech Stack:** TypeScript (Node 20+), tsup bundle, vitest, vendored `html-to-image` + `wordcloud2.js`, vanilla JS + pure CSS in emitted HTML, palette-locked tabloid CSS (warm-ink, JetBrains Mono / Archivo Narrow).

**Spec:** `docs/superpowers/specs/2026-05-16-png-export.md` — read first; decision table is the contract.

---

## File Structure

**New files:**
- `src/vendor/html-to-image.js` — vendored IIFE bundle of `html-to-image` exposing `window.htmlToImage`.
- `src/vendor/LICENSE-html-to-image.txt` — verbatim upstream license.

**Modified files:**
- `src/render.ts` — `RenderInput.meta.timestamp` field; `HTML_TO_IMAGE_JS` const; `id="artifact"`; `.chrome` block + CSS; chrome boot script (handlers, Fisher-Yates, toast, closure-held entries); existing `renderAll()` refactored to take entries as args so SHUFFLE / resize use the closure copy.
- `src/pipeline.ts` — compute timestamp once at top of `run()`, thread to both `outputFilename(stamp)` and `renderHtml({ meta: { timestamp: stamp, ... } })`.
- `src/render.test.ts` — extend with chrome / `#artifact` / inlined html-to-image / closure-entries assertions; update existing regex anchored to `</div>\s*<script` (chrome block now sits between).
- `src/pipeline.test.ts` — extend with timestamp single-source-of-truth assertion.
- `tsup.config.ts` — mirror `src/vendor/html-to-image.js` → `dist/vendor/html-to-image.js` in `onSuccess`.
- `package.json` — add `html-to-image` to `devDependencies` (vendored at repo time; not imported at runtime).
- `src/vendor/README.md` — add row for `html-to-image.js`, retire the "Future additions" note.

**Doc-sync (on-merge):**
- `docs/overview.md` — § Roadmap drops F5 row; § Current State appends F5 ship; § Module Index updates `src/render.ts`, `src/pipeline.ts`; new row for `src/vendor/html-to-image.js`.
- `docs/superpowers/specs/2026-05-16-png-export.md` — delete (temporal).
- `docs/superpowers/plans/2026-05-16-png-export.md` — delete (temporal, this file).

---

## Task 1: Vendor `html-to-image` inline

**Files:**
- Create: `src/vendor/html-to-image.js`
- Create: `src/vendor/LICENSE-html-to-image.txt`
- Modify: `src/vendor/README.md`
- Modify: `tsup.config.ts:17-26`
- Modify: `package.json:26-32` (add devDep)

- [ ] **Step 1: Install `html-to-image` as a devDependency**

```bash
pnpm add -D html-to-image@1.11.13
```

Expected: `package.json` `devDependencies` gains `"html-to-image": "1.11.13"` (pin exact — vendored copy is the source of truth, dep is for refresh tracking only). `pnpm-lock.yaml` updates.

If `1.11.13` is no longer the latest at vendor time, use the then-current tagged release; record the actual version in the file header (Step 3).

- [ ] **Step 2: Bundle `html-to-image` ESM → IIFE via esbuild**

```bash
pnpm exec esbuild node_modules/html-to-image/es/index.js \
  --bundle --format=iife --global-name=htmlToImage \
  --outfile=src/vendor/html-to-image.js
```

Expected: `src/vendor/html-to-image.js` exists. Inspect first lines: should open with `var htmlToImage = (() => {` (esbuild IIFE shape).

If esbuild not installed transitively, run `pnpm dlx esbuild ...` instead.

- [ ] **Step 3: Prepend license / source header to `src/vendor/html-to-image.js`**

Insert at the top of the file (above the IIFE):

```js
/*!
 * html-to-image
 * https://github.com/bubkoo/html-to-image
 *
 * Copyright (c) 2017 W. Brian Gourlie and contributors.
 * Released under the MIT license
 *
 * Vendored for ok-claude.
 *   Source:  https://registry.npmjs.org/html-to-image
 *   Version: 1.11.13
 *   Build:   esbuild --bundle --format=iife --global-name=htmlToImage
 *            from package/es/index.js
 *   License: MIT (see src/vendor/LICENSE-html-to-image.txt)
 */

```

- [ ] **Step 4: Copy upstream LICENSE to `src/vendor/LICENSE-html-to-image.txt`**

```bash
cp node_modules/html-to-image/LICENSE src/vendor/LICENSE-html-to-image.txt
```

Expected: file exists, contains MIT license body for `html-to-image`.

- [ ] **Step 5: Update `src/vendor/README.md`**

Replace the `## Future additions` section with a row in the `## Files` table:

```markdown
| `html-to-image.js` | https://github.com/bubkoo/html-to-image (npm: `html-to-image`) | 1.11.13 | MIT | IIFE bundle of `es/index.js` via `esbuild --bundle --format=iife --global-name=htmlToImage`. Exposes `window.htmlToImage.toBlob`. |
| `LICENSE-html-to-image.txt` | npm `html-to-image@1.11.13` `LICENSE` | — | MIT | Verbatim copy. |
```

Delete the `## Future additions` block entirely (it only referenced F5).

- [ ] **Step 6: Mirror the vendor file in tsup `onSuccess`**

Modify `tsup.config.ts:17-26`:

```ts
  async onSuccess() {
    await mkdir(join("dist", "vendor"), { recursive: true });
    await cp(
      join("src", "vendor", "wordcloud2.js"),
      join("dist", "vendor", "wordcloud2.js"),
    );
    await cp(
      join("src", "vendor", "html-to-image.js"),
      join("dist", "vendor", "html-to-image.js"),
    );
    if (process.platform !== "win32") {
      await chmod(join("dist", "cli.js"), 0o755);
    }
  },
```

- [ ] **Step 7: Verify build mirrors the file**

```bash
pnpm build
ls dist/vendor/html-to-image.js
```

Expected: `dist/vendor/html-to-image.js` exists with non-zero size.

- [ ] **Step 8: Commit**

```bash
git add src/vendor/html-to-image.js src/vendor/LICENSE-html-to-image.txt src/vendor/README.md tsup.config.ts package.json pnpm-lock.yaml
git commit -m "chore(vendor): inline html-to-image@1.11.13 for F5 PNG export"
```

---

## Task 2: Thread run timestamp through `pipeline.ts → render.ts`

**Files:**
- Modify: `src/render.ts:8-18` (`RenderInput` type)
- Modify: `src/pipeline.ts:17-23`, `:91-105`
- Modify: `src/render.test.ts` (fixture `input()` helper; add timestamp assertion)
- Modify: `src/pipeline.test.ts` (timestamp consistency assertion)

- [ ] **Step 1: Write failing test in `src/pipeline.test.ts` — timestamp single source of truth**

Append to the `describe("pipeline.run — first-word cloud per role (F8)")` block in `src/pipeline.test.ts`:

```ts
it("threads a single timestamp into both the output filename and __DATA__.meta.timestamp", async () => {
  const result = await run();
  expect(result.outPath).toBeTruthy();
  const fileStamp = result.outPath!.match(
    /ok-claude-result-(\d{4}-\d{2}-\d{2}-\d{4})\.html$/,
  )?.[1];
  expect(fileStamp).toBeTruthy();
  const html = await readFile(result.outPath!, "utf8");
  const data = extractData(html);
  expect((data.meta as { timestamp?: string }).timestamp).toBe(fileStamp);
});
```

Also extend the `extractData` return type at the top of the file (line 19-29) so `meta.timestamp` is allowed:

```ts
function extractData(html: string): {
  topUser: Array<[string, number]>;
  topClaude: Array<[string, number]>;
  meta: {
    sessions: number;
    messages: number;
    tokensIn: number;
    tokensOut: number;
    dateRange: [string, string] | null;
    timestamp: string;
  };
} {
  const m = html.match(/window\.__DATA__ = ({[\s\S]*?});/);
  if (!m) throw new Error("__DATA__ payload not found in HTML");
  return JSON.parse(m[1]!);
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm exec vitest run src/pipeline.test.ts -t "threads a single timestamp"
```

Expected: FAIL — `data.meta.timestamp` is `undefined`.

- [ ] **Step 3: Extract timestamp builder in `src/pipeline.ts`**

Replace `outputFilename` (lines 17-23) with a stamp helper and a thin filename function:

```ts
function buildStamp(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function outputFilename(stamp: string): string {
  return `ok-claude-result-${stamp}.html`;
}
```

- [ ] **Step 4: Thread timestamp into the run + render call**

In `src/pipeline.ts:91-105`, replace the `renderHtml(...)` + filename block:

```ts
  const stamp = buildStamp();

  const html = renderHtml({
    topUser,
    topClaude,
    meta: {
      sessions: files.length,
      messages,
      tokensIn,
      tokensOut,
      dateRange:
        minTs !== undefined && maxTs !== undefined ? [minTs, maxTs] : null,
      timestamp: stamp,
    },
  });

  const outPath = resolve(outputDir(), outputFilename(stamp));
  await writeFile(outPath, html, "utf8");
  return { outPath };
```

- [ ] **Step 5: Add `timestamp` to `RenderInput.meta` in `src/render.ts`**

Modify the type at `src/render.ts:8-18`:

```ts
export type RenderInput = {
  topUser: Array<[string, number]>;
  topClaude: Array<[string, number]>;
  meta: {
    sessions: number;
    messages: number;
    tokensIn: number;
    tokensOut: number;
    dateRange: [string, string] | null;
    timestamp: string;
  };
};
```

`safeJson(...)` already embeds `meta` verbatim into `window.__DATA__`, so no further wiring needed — `timestamp` rides through automatically.

- [ ] **Step 6: Update `src/render.test.ts` fixture to provide `timestamp`**

Modify the `input()` helper at `src/render.test.ts:4-16`:

```ts
function input(over: Partial<RenderInput> = {}): RenderInput {
  return {
    topUser: over.topUser ?? [["foo", 3], ["bar", 1]],
    topClaude: over.topClaude ?? [["baz", 2]],
    meta: {
      sessions: over.meta?.sessions ?? 1,
      messages: over.meta?.messages ?? 4,
      tokensIn: over.meta?.tokensIn ?? 0,
      tokensOut: over.meta?.tokensOut ?? 0,
      dateRange: over.meta?.dateRange ?? null,
      timestamp: over.meta?.timestamp ?? "2026-05-16-1234",
    },
  };
}
```

Also update the two inline `meta: { ... }` overrides inside this file (search for `dateRange:` — there are two — and add `timestamp: "2026-05-16-1234",` next to each) so existing tests still type-check under `strict`:

- `src/render.test.ts:56` — the labels test's `meta`
- `src/render.test.ts:89-97` — the header test's `meta`
- `src/render.test.ts:125` — the footer test's `meta`

- [ ] **Step 7: Run tests to verify they pass**

```bash
pnpm exec vitest run src/pipeline.test.ts src/render.test.ts
```

Expected: all green. The new pipeline test passes; existing render tests still pass.

- [ ] **Step 8: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/render.ts src/pipeline.ts src/render.test.ts src/pipeline.test.ts
git commit -m "feat(pipeline): thread run timestamp into RenderInput.meta for F5 PNG name pairing"
```

---

## Task 3: Add `id="artifact"` + chrome HTML structure + CSS + inline `html-to-image`

**Files:**
- Modify: `src/render.ts:3-6`, `:46-216`
- Modify: `src/render.test.ts` (extend tests + update brittle regex)

- [ ] **Step 1: Write failing tests for chrome structure + inlined html-to-image**

Append a new `describe` block to `src/render.test.ts`:

```ts
describe("renderHtml — F5 chrome row + html-to-image", () => {
  it("adds id=\"artifact\" to the artifact div (PNG capture target)", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<div[^>]*id="artifact"[^>]*class="artifact"/);
  });

  it("renders chrome block (.chrome) as a SIBLING after </div> of #artifact, not a child", () => {
    const html = renderHtml(input());
    // chrome must come after artifact's closing </div> and before <script>
    expect(html).toMatch(
      /<\/div>\s*<div[^>]*class="chrome"[\s\S]*?<\/div>\s*<script/,
    );
    // and it must NOT appear inside the artifact
    const artifactInner = html.match(
      /<div[^>]*id="artifact"[^>]*>([\s\S]*?)<\/div>\s*<div[^>]*class="chrome"/,
    )?.[1];
    expect(artifactInner).toBeTruthy();
    expect(artifactInner!).not.toContain('class="chrome"');
  });

  it("renders three buttons with expected ids and chevron prefix", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<button[^>]*id="btn-download"[^>]*class="btn btn-primary"[\s\S]*?DOWNLOAD/);
    expect(html).toMatch(/<button[^>]*id="btn-copy"[^>]*class="btn"[\s\S]*?COPY/);
    expect(html).toMatch(/<button[^>]*id="btn-shuffle"[^>]*class="btn"[\s\S]*?SHUFFLE/);
    // chevron prefix on each
    const btnDownload = html.match(/<button[^>]*id="btn-download"[\s\S]*?<\/button>/)?.[0] ?? "";
    expect(btnDownload).toContain('class="chev"');
  });

  it("renders #copy button with title tooltip", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<button[^>]*id="btn-copy"[^>]*title="copy image to clipboard"/);
  });

  it("renders empty toast slot below the action row", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<div[^>]*class="toast"[^>]*id="toast"[^>]*><\/div>/);
  });

  it("inlines html-to-image vendor (no external src)", () => {
    const html = renderHtml(input());
    // esbuild IIFE preamble or known internal identifier
    expect(html).toContain("var htmlToImage");
    expect(html).not.toMatch(/<script[^>]+src=[^>]*html-to-image/);
  });
});
```

Also update the brittle artifact-anchored regex inside the existing footer test at `src/render.test.ts:132`:

```ts
    const artifactMatch = html.match(/<div[^>]*id="artifact"[^>]*>[\s\S]*?<\/div>\s*<div[^>]*class="chrome"/);
```

(was: `/<div[^>]*class="artifact"[^>]*>[\s\S]*?<\/div>\s*<script/`) — chrome block now sits between the artifact's closing `</div>` and the first `<script>`.

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm exec vitest run src/render.test.ts -t "F5 chrome row"
```

Expected: FAIL — chrome block, button ids, html-to-image global all missing.

- [ ] **Step 3: Add `HTML_TO_IMAGE_JS` const and load vendored bundle**

Modify the top of `src/render.ts` (lines 1-6):

```ts
import { readFileSync } from "node:fs";

const VENDOR_JS = readFileSync(
  new URL("./vendor/wordcloud2.js", import.meta.url),
  "utf8",
);

const HTML_TO_IMAGE_JS = readFileSync(
  new URL("./vendor/html-to-image.js", import.meta.url),
  "utf8",
);
```

- [ ] **Step 4: Add `id="artifact"` to the existing `.artifact` div**

In `src/render.ts:191`, change:

```html
  <div class="artifact">
```

to:

```html
  <div id="artifact" class="artifact">
```

- [ ] **Step 5: Add `.chrome` block after the closing `</div>` of `#artifact`**

After line 214 (`</div>` closing `.artifact`) and before `<script>window.__DATA__ ...` (line 216), insert:

```html
  <div class="chrome">
    <div class="actions">
      <button type="button" id="btn-download" class="btn btn-primary">
        <span class="chev">&#9656;</span>DOWNLOAD
      </button>
      <button type="button" id="btn-copy" class="btn" title="copy image to clipboard">
        <span class="chev">&#9656;</span>COPY
      </button>
      <button type="button" id="btn-shuffle" class="btn">
        <span class="chev">&#9656;</span>SHUFFLE
      </button>
    </div>
    <div class="toast" id="toast"></div>
  </div>
```

- [ ] **Step 6: Add chrome CSS to the existing `<style>` block**

Append inside the `<style>` block (after the existing `.footer .cta .chev` rule near line 187, before `</style>`):

```css
  .chrome {
    display: flex; flex-direction: column;
    align-items: center; gap: 14px;
    margin-top: 24px;
  }
  .actions { display: flex; gap: 28px; }
  .btn {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    font-size: 16px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--ink-1);
    background: transparent;
    border: 1px solid var(--ink-1);
    padding: 10px 18px;
    cursor: pointer;
    transition: background 120ms ease;
  }
  .btn:hover { background: rgba(244, 241, 234, 0.06); }
  .btn .chev { margin-right: 6px; color: var(--ink-1); }
  .btn-primary .chev { color: var(--amber); }
  .toast {
    font-family: 'Archivo Narrow', sans-serif;
    font-size: 14px;
    color: var(--ink-2);
    text-transform: lowercase;
    letter-spacing: 0.04em;
    opacity: 0;
    transition: opacity 200ms ease;
    min-height: 1em;
  }
  .toast.visible { opacity: 1; }
```

- [ ] **Step 7: Inline html-to-image after the existing `${VENDOR_JS}` block**

In `src/render.ts:217-219`, change:

```html
<script>
${VENDOR_JS}
</script>
```

to:

```html
<script>
${VENDOR_JS}
</script>
<script>
${HTML_TO_IMAGE_JS}
</script>
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
pnpm exec vitest run src/render.test.ts
```

Expected: all render tests green (new chrome + existing tabloid tests). The Task 4 boot-script tests do NOT exist yet — those land in Task 4.

- [ ] **Step 9: Type-check**

```bash
pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 10: Commit**

```bash
git add src/render.ts src/render.test.ts
git commit -m "feat(render): F5 chrome row HTML/CSS + inline html-to-image vendor"
```

---

## Task 4: Chrome boot script — Fisher-Yates SHUFFLE + closure-held entries

**Files:**
- Modify: `src/render.ts:220-329` (the existing boot IIFE)
- Modify: `src/render.test.ts` (boot-script assertions)

- [ ] **Step 1: Write failing tests for boot-script behavior fingerprints**

Append to the `describe("renderHtml — F5 chrome row + html-to-image")` block in `src/render.test.ts`:

```ts
  it("boot script wires Fisher-Yates shuffle on closure entries (not mutating DATA)", () => {
    const html = renderHtml(input());
    // The handler should reshuffle local arrays then call renderAll with them.
    expect(html).toContain("fisherYates");
    // renderAll must take entries as args (so SHUFFLE / resize use the closure arrays)
    expect(html).toMatch(/function\s+renderAll\s*\(\s*userEntries\s*,\s*claudeEntries\s*\)/);
  });

  it("boot script wires download / copy / shuffle handlers", () => {
    const html = renderHtml(input());
    expect(html).toContain("getElementById('btn-download')");
    expect(html).toContain("getElementById('btn-copy')");
    expect(html).toContain("getElementById('btn-shuffle')");
    expect(html).toContain("htmlToImage.toBlob");
    expect(html).toContain("navigator.clipboard.write");
    expect(html).toContain("new ClipboardItem");
  });

  it("download filename pairs HTML timestamp", () => {
    const html = renderHtml(input({
      meta: {
        sessions: 1, messages: 1, tokensIn: 0, tokensOut: 0,
        dateRange: null, timestamp: "2026-05-16-1234",
      },
    }));
    // boot script reads DATA.meta.timestamp for the PNG name
    expect(html).toContain("DATA.meta.timestamp");
    expect(html).toContain("'.png'");
  });

  it("toast helper resets text and re-arms a single fade timer", () => {
    const html = renderHtml(input());
    expect(html).toContain("showToast");
    expect(html).toContain("classList.add('visible')");
    expect(html).toContain("classList.remove('visible')");
  });
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm exec vitest run src/render.test.ts -t "F5 chrome row"
```

Expected: FAIL on the four new tests — symbols not present in the existing boot script.

- [ ] **Step 3: Refactor existing `renderAll` to take entries as args + add chrome boot logic**

Replace the existing `(function boot() { ... })();` IIFE in `src/render.ts:220-329` with this version. (Diff is large but localized — the safest path is to rewrite the IIFE body in one edit.)

```html
<script>
(function boot() {
  var DATA = window.__DATA__ || { topUser: [], topClaude: [], meta: {} };

  // Closure-held copies — SHUFFLE mutates these, not DATA.
  var userEntries = (DATA.topUser || []).slice();
  var claudeEntries = (DATA.topClaude || []).slice();
  var toastTimer = null;

  function setupCanvas(canvas) {
    var wrap = canvas.parentElement;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(wrap.clientWidth * dpr));
    canvas.height = Math.max(1, Math.round(wrap.clientHeight * dpr));
    canvas.style.width = wrap.clientWidth + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
  }

  function logScale(entries, fontMin, fontMax) {
    var max = entries[0][1];
    var min = entries[entries.length - 1][1];
    return function (count) {
      if (max === min) return (fontMin + fontMax) / 2;
      return fontMin + (fontMax - fontMin) * (Math.log(count) - Math.log(min)) / (Math.log(max) - Math.log(min));
    };
  }

  function drawHalf(canvasId, rawEntries, opts) {
    var canvas = document.getElementById(canvasId);
    if (!canvas) return;
    setupCanvas(canvas);
    if (!rawEntries || rawEntries.length === 0) return;
    var dpr = window.devicePixelRatio || 1;
    var entries = rawEntries.map(function (pair) {
      return [opts.caseFn ? opts.caseFn(pair[0]) : pair[0], pair[1]];
    });
    var cw = canvas.width, ch = canvas.height;
    var innerEdgePx = 24 * dpr;
    var origin = opts.side === 'user'
      ? [cw - innerEdgePx, ch / 2]
      : [innerEdgePx, ch / 2];
    WordCloud(canvas, {
      list: entries,
      fontFamily: opts.fontFamily,
      fontWeight: opts.fontWeight || 'normal',
      color: opts.color,
      backgroundColor: 'rgba(0,0,0,0)',
      gridSize: 6,
      weightFactor: logScale(entries, opts.fontMin * dpr, opts.fontMax * dpr),
      rotateRatio: opts.rotateRatio,
      minRotation: -Math.PI / 9,
      maxRotation:  Math.PI / 9,
      rotationSteps: 0,
      shuffle: false,
      shrinkToFit: true,
      drawOutOfBound: false,
      origin: origin,
    });
  }

  function fitHeadline() {
    var el = document.querySelector('.hdr-top');
    if (!el) return;
    var size = 88;
    el.style.fontSize = size + 'px';
    var guard = 120;
    while (el.scrollWidth > el.clientWidth && size > 24 && guard-- > 0) {
      size -= 1;
      el.style.fontSize = size + 'px';
    }
  }

  var INTER_STACK = '"Inter", system-ui, -apple-system, "Helvetica Neue", Helvetica, Arial, sans-serif';
  function upper(s) { return s.toUpperCase(); }

  function renderAll(userEntries, claudeEntries) {
    fitHeadline();
    drawHalf('canvas-user', userEntries || [], {
      side: 'user',
      fontFamily: INTER_STACK,
      fontWeight: '800',
      color: '#f4f1ea',
      fontMin: 16, fontMax: 240,
      rotateRatio: 0.35,
      caseFn: upper,
    });
    drawHalf('canvas-claude', claudeEntries || [], {
      side: 'claude',
      fontFamily: INTER_STACK,
      fontWeight: '800',
      color: '#d97757',
      fontMin: 16, fontMax: 200,
      rotateRatio: 0,
      caseFn: upper,
    });
  }

  function fisherYates(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  function showToast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('visible');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      el.classList.remove('visible');
    }, 2500);
  }

  function captureBlob() {
    var node = document.getElementById('artifact');
    return window.htmlToImage.toBlob(node, {
      pixelRatio: 2,
      backgroundColor: '#0d0d0a',
      cacheBust: true,
    });
  }

  function downloadPng() {
    captureBlob().then(function (blob) {
      if (!blob) { showToast('download failed'); return; }
      var stamp = (DATA.meta && DATA.meta.timestamp) || 'unstamped';
      var name = 'ok-claude-result-' + stamp + '.png';
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      showToast('saved ' + name);
    }).catch(function () { showToast('download failed'); });
  }

  function copyPng() {
    if (typeof ClipboardItem === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
      showToast('copy not supported — try download instead');
      return;
    }
    captureBlob().then(function (blob) {
      if (!blob) { showToast('copy failed'); return; }
      return navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    }).then(function () {
      showToast('copied to clipboard');
    }).catch(function () {
      showToast('copy not supported — try download instead');
    });
  }

  function shuffleLayout() {
    userEntries = fisherYates(userEntries);
    claudeEntries = fisherYates(claudeEntries);
    renderAll(userEntries, claudeEntries);
    showToast('reshuffled');
  }

  function whenFontsReady(cb) {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(cb);
    } else {
      cb();
    }
  }

  window.addEventListener('load', function () {
    whenFontsReady(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          renderAll(userEntries, claudeEntries);
        });
      });
    });
    var dl = document.getElementById('btn-download');
    var cp = document.getElementById('btn-copy');
    var sf = document.getElementById('btn-shuffle');
    if (dl) dl.addEventListener('click', downloadPng);
    if (cp) cp.addEventListener('click', copyPng);
    if (sf) sf.addEventListener('click', shuffleLayout);
  });
  window.addEventListener('resize', function () {
    clearTimeout(window.__rz);
    window.__rz = setTimeout(function () {
      renderAll(userEntries, claudeEntries);
    }, 120);
  });
})();
</script>
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm exec vitest run src/render.test.ts
```

Expected: all render tests green. Boot-script assertion strings now present (`fisherYates`, `function renderAll(userEntries, claudeEntries)`, button id lookups, `htmlToImage.toBlob`, `navigator.clipboard.write`, `new ClipboardItem`, `DATA.meta.timestamp`, `'.png'`, `showToast`, `classList.add('visible')`, `classList.remove('visible')`).

- [ ] **Step 5: Type-check + full test suite**

```bash
pnpm exec tsc --noEmit
pnpm test
```

Expected: both green.

- [ ] **Step 6: Build smoke**

```bash
pnpm build
ls dist/cli.js dist/vendor/wordcloud2.js dist/vendor/html-to-image.js
```

Expected: three files exist.

- [ ] **Step 7: Commit**

```bash
git add src/render.ts src/render.test.ts
git commit -m "feat(render): F5 chrome boot — download/copy/shuffle handlers + toast"
```

---

## Task 5: Manual smoke against real corpus

**Files:** none (verification only). If a bug surfaces, fix-and-recommit per Task 4 pattern.

- [ ] **Step 1: Run the CLI end-to-end**

```bash
pnpm dev
```

Expected: HTML opens in default browser, three buttons render below the artifact in tabloid style, toast slot below is empty.

- [ ] **Step 2: Click DOWNLOAD**

Expected:
- PNG downloads to the browser's Downloads dir.
- Filename: `ok-claude-result-{YYYY-MM-DD-HHMM}.png` matching the source HTML's timestamp.
- Open the PNG: contains ONLY the artifact (no chrome row visible, no toast). Size ≥ 2160×2160 (DPR 2). Background = paper `#0d0d0a`.
- Toast says `saved ok-claude-result-...png` and fades after ~2.5s.

- [ ] **Step 3: Click COPY (Chromium-family browser)**

Expected:
- Toast says `copied to clipboard`.
- Paste into Discord, Slack, or X-web compose — image appears.

- [ ] **Step 4: Click COPY (Firefox on `file://`)**

Expected:
- Either succeeds (toast `copied to clipboard`) OR toast says `copy not supported — try download instead`.
- No uncaught exceptions in browser console.

- [ ] **Step 5: Click SHUFFLE**

Expected:
- Both canvases re-lay out visibly (word positions / sizes / rotations change).
- Word inventory unchanged (same vocabulary, just reordered placement).
- Toast says `reshuffled`.

- [ ] **Step 6: Resize browser window after a SHUFFLE**

Expected:
- Both canvases re-render at new dimensions.
- Order reflects the SHUFFLED state — does NOT snap back to frequency order.

- [ ] **Step 7: Rapid-click any two buttons**

Expected:
- Toast text updates to the most recent action immediately.
- Fade timer resets — toast stays visible for the full ~2.5s after the last click.

- [ ] **Step 8: If any smoke step fails — fix-and-recommit**

Open a debug loop: identify root cause, add a unit test if regression-coverable, fix in `src/render.ts`, re-run smoke. Commit each fix as `fix(render): <symptom>`.

If smoke surfaces a non-blocking edge (Firefox quirk, html-to-image canvas-color edge, etc.) that isn't worth a fix in this PR, file it in `docs/backlog.md` as `BUG-###` or `GAP-###`.

---

## Task 6: Doc-sync + ship

**Files:**
- Modify: `docs/overview.md`
- Delete: `docs/superpowers/specs/2026-05-16-png-export.md`
- Delete: `docs/superpowers/plans/2026-05-16-png-export.md`

- [ ] **Step 1: Update `docs/overview.md` § Roadmap — remove F5 row**

Delete the `F5 | png-export | Wire html-to-image to in-page Export button | ...` row from the table at `docs/overview.md` § Roadmap.

- [ ] **Step 2: Update `docs/overview.md` § Current State — append F5**

Modify the current line:

```
active development — F1–F4 + F8 + DEBT-005 shipped (`mvp-wordcloud`, `speaker-split`, `stream-and-progress`, `opener-frequency`, `mood-cloud-pivot`, tabloid visual lock); F5–F7 queued below in § Roadmap.
```

to:

```
active development — F1–F5 + F8 + DEBT-005 shipped (`mvp-wordcloud`, `speaker-split`, `stream-and-progress`, `opener-frequency`, `png-export`, `mood-cloud-pivot`, tabloid visual lock); F6–F7 queued below in § Roadmap.
```

- [ ] **Step 3: Update `docs/overview.md` § Module Index — `src/render.ts` row**

Append to the existing `src/render.ts` row's description (just before the final period):

```
| `src/render.ts` | HTML template — tabloid visual lock (DEBT-005). ... `whenFontsReady()` gate (`document.fonts.ready`) before first render; debounced 120ms `resize`; double-`requestAnimationFrame` first paint post-`load`. JSON-encodes `{topUser, topClaude, meta}` into `window.__DATA__`. F5 adds `id="artifact"` to the captured div + sibling `.chrome` block (centered `.actions` row holding `▸ DOWNLOAD` / `▸ COPY` / `▸ SHUFFLE` buttons in palette-locked JetBrains Mono 700, amber chevron primary on download, ink-1 secondaries) + `.toast` slot (Archivo Narrow 14px ink-2, fade 200ms, hold 2500ms, single re-armable timer). Closure-held copies of `topUser` / `topClaude` entries drive a Fisher-Yates `shuffleLayout()` that re-renders both halves (resize uses the same closure copies so a shuffled state survives). `downloadPng()` calls `window.htmlToImage.toBlob` with `pixelRatio:2 backgroundColor:#0d0d0a cacheBust:true`, triggers a synthetic `<a download>` with name `ok-claude-result-${meta.timestamp}.png`. `copyPng()` writes a `ClipboardItem({'image/png': blob})` via `navigator.clipboard.write`; on `ClipboardItem`-undefined / throw, toast falls back to `copy not supported — try download instead`. `RenderInput.meta.timestamp` field threaded from pipeline. Inlines vendored `html-to-image.js` alongside `wordcloud2.js`. |
```

(Edit the existing row — don't add a new one.)

- [ ] **Step 4: Update `docs/overview.md` § Module Index — `src/pipeline.ts` row**

Append to the existing `src/pipeline.ts` row's description (just before the closing period):

```
| `src/pipeline.ts` | Orchestrator: ... Output path resolved via `outputDir()` (probes `~/Downloads` via `statSync().isDirectory()`, falls back to `process.cwd()` on miss / throw) + `outputFilename(stamp)` (`ok-claude-result-${stamp}.html`). Timestamp built once via `buildStamp()` (local time, zero-padded `YYYY-MM-DD-HHMM`), threaded into BOTH `outputFilename` and `RenderInput.meta.timestamp` so the HTML filename pairs with the F5 PNG filename. Returns `{outPath}` or `{outPath: null, reason}`. |
```

- [ ] **Step 5: Add `src/vendor/html-to-image.js` row to § Module Index**

Insert a new row in the table after the `src/vendor/wordcloud2.js` row:

```
| `src/vendor/html-to-image.js` | Vendored IIFE bundle of `html-to-image` (`esbuild --bundle --format=iife --global-name=htmlToImage` from `node_modules/html-to-image/es/index.js`). Exposes `window.htmlToImage.toBlob` for the F5 chrome row's DOWNLOAD + COPY actions. tsup `onSuccess` mirrors `dist/vendor/html-to-image.js` next to the built CLI so `import.meta.url` resolves in both source and bundle. |
```

- [ ] **Step 6: Verify doc-sync renders / consistent**

```bash
pnpm exec tsc --noEmit
pnpm test
```

Expected: still green (sanity guard).

Read `docs/overview.md` start-to-finish, confirm:
- § Roadmap has no F5 row.
- § Current State lists F5.
- § Module Index `src/render.ts` mentions chrome + `id="artifact"` + html-to-image + Fisher-Yates + toast + timestamp.
- § Module Index `src/pipeline.ts` mentions threaded timestamp.
- § Module Index has a new `src/vendor/html-to-image.js` row.

- [ ] **Step 7: Delete the temporal spec + plan files**

```bash
git rm docs/superpowers/specs/2026-05-16-png-export.md
git rm docs/superpowers/plans/2026-05-16-png-export.md
```

- [ ] **Step 8: Commit doc-sync + ship**

```bash
git add docs/overview.md
git commit -m "docs(F5): doc-sync — drop spec/plan, prune Roadmap, update Module Index"
```

---

## Self-Review Checklist

Run this checklist when the plan is written; do NOT skip.

- [ ] **Spec coverage** — every decision in `2026-05-16-png-export.md` § Decisions has a corresponding task:
  - #1 labels — Task 3 Step 5 (button text).
  - #2 outside `#artifact` — Task 3 Step 5 (block placement) + Task 3 Step 1 assertion.
  - #3 visual style — Task 3 Step 6 (CSS).
  - #4 no icons — covered by Task 3 Step 5 HTML (no icon nodes).
  - #5 no socials — covered by absence; no task creates them.
  - #6 vendor — Task 1.
  - #7 capture target — Task 4 Step 3 (`captureBlob()`).
  - #8 PNG name pairs timestamp — Task 2 + Task 4 Step 3 (`downloadPng()`).
  - #9 clipboard + fallback — Task 4 Step 3 (`copyPng()`).
  - #10 Fisher-Yates — Task 4 Step 3 (`fisherYates`, `shuffleLayout`).
  - #11 toast — Task 4 Step 3 (`showToast`).
  - #12 tooltip — Task 3 Step 5 (`title="copy image to clipboard"`).
  - #13 no shortcuts — covered by absence.
- [ ] **Placeholder scan** — searched plan body for "TBD" / "implement later" / "appropriate handling" / "similar to": none found.
- [ ] **Type consistency**:
  - `RenderInput.meta.timestamp: string` — defined Task 2 Step 5, consumed in Task 4 Step 3 via `DATA.meta.timestamp`, asserted in Task 2 Step 1 + Task 4 Step 1.
  - Function names match across tasks: `buildStamp`, `outputFilename(stamp)`, `renderAll(userEntries, claudeEntries)`, `fisherYates`, `showToast`, `captureBlob`, `downloadPng`, `copyPng`, `shuffleLayout`.
- [ ] **Test-first order honored** for code-changing tasks (Task 2 + Task 3 + Task 4 each open with a failing-test step).

---

## Notes for the executor

- **Cache HTML rebuilds.** After Task 3 the HTML grows substantially. Test assertions use literal substring matches (`expect(html).toContain(...)`) — safer than regex anchors.
- **WordCloud2 + re-invocation.** Calling `WordCloud(canvas, opts)` on the same canvas clears + redraws cleanly (existing F8 code already relies on this for `resize`). No special teardown needed for SHUFFLE.
- **`html-to-image` + canvases.** The library serializes via `canvas.toDataURL()` for `<canvas>` elements — works with our WordCloud2 canvases without extra config.
- **No CDN at runtime.** Both vendored libs are inlined as `<script>` blocks. Architecture rule (`docs/techstack.md` § Architecture Rules) is enforced by `render.test.ts` "no external script or CDN" test — keep it passing.
- **Solo-dev branching.** Per `CLAUDE.md` § Solo Dev Assumptions: commit directly to working branch, no force-push, atomic commits one logical change per commit, conventional message prefixes.
