# Opener Frequency — Design

> Roadmap entry: F4 `opener-frequency` (`docs/overview.md` § Roadmap).
> Branch: `master` (solo dev, direct commits).
> Date: 2026-05-15.

## Problem

Wordcloud is position-blind. `OK`, `WTH`, `Sorry`, `Next` — first-position words that carry mood signature — get diluted into the body bag and rarely surface. The user's "how I arrive at each turn" is lost while "what I talk about" dominates.

Openers are a different signal class than topic words:

- `OK` x 100 = momentum
- `Sorry` x 30 = correction loops
- `WTH` x 8 = frustration spikes
- `But` x 50 = pushback pattern
- `Y` / `N` = terse interjection style

These are mood beats, not topics. Wordcloud cannot catch them; a position-aware extractor can.

## Solution

Extract the **first word-like segment** of each message, cluster by lowercase + trailing-punct-stripped key, display the dominant surface form per cluster, render top 10 per role in a side panel next to the wordcloud.

Pattern: `key = lowercased + punct-stripped first segment`, `surface = original segment`. Aggregate as `Map<key, Map<surface, count>>`. On render, sum counts per key, pick max-count surface as display label.

Worked example:

```
WTH × 30  +  wth × 20  +  WTh × 3
       ↓ cluster by key "wth"
       ↓ display = argmax(surface) = "WTH"
WTH    53
```

Counts cluster, casing-as-mood preserves, multi-language works through `Intl.Segmenter` (already in stack via `tokenize.ts`).

## Non-Goals

- Bigram / trigram openers. Single-word only — multi-word fragments same opener across reasons (`sorry I shouldn't` ≠ `sorry it is` ≠ `sorry but` → three count-1 rows, no signal).
- Opener wordcloud. Top-10 list is the right surface; cloud needs ≥30 weighted entries to look right.
- Sentiment classification. Frequency is the signal; interpretation is the user's.
- Stopword filter on openers. `I`, `the`, `Can` are meaningful at position 0 (they reveal directive vs question vs first-person framing). Different layer than tokenize.

## Architecture

Single-pass extension to existing pipeline. Reuses `denoiseMarkdown` and `Intl.Segmenter`.

```
event.text
  → denoiseMarkdown(text)              [reuse]
  → firstOpener(denoised)              [NEW: src/openers.ts]
  → foldOpener(map, opener)            [NEW: src/aggregate.ts]
  → topNOpeners(map, 10)               [NEW: src/aggregate.ts]
  → renderHtml({ ..., openersUser, openersClaude })  [extend: src/render.ts]
```

**Files:**

- `src/openers.ts` — new. `firstOpener(text): Opener | null`.
- `src/aggregate.ts` — extend with `OpenerEntry`, `OpenerMap`, `foldOpener`, `topNOpeners`.
- `src/pipeline.ts` — extend with two `OpenerMap`s, fold per event, top-N + pass to render.
- `src/render.ts` — extend `RenderInput`, add side-panel HTML + responsive CSS + JS panel paint.

## Data Shapes

```ts
// src/openers.ts
export type Opener = { key: string; surface: string };
export function firstOpener(text: string): Opener | null;
```

Extraction:

1. Iterate `Intl.Segmenter({ granularity: "word" })` over `text`.
2. First segment with `isWordLike: true` wins.
3. `surface = segment.replace(TRAILING_PUNCT, "")`.
4. `key = surface.toLocaleLowerCase()`.
5. Empty key (defensive) → null.

`TRAILING_PUNCT = /[.,!?;:。、！？]+$/u` — Latin + CJK common terminators. Stripped from both surface and key (display `Sorry`, not `Sorry,`).

```ts
// src/aggregate.ts
export type OpenerEntry = { display: string; count: number };
export type OpenerMap = Map<string, Map<string, number>>;

export function foldOpener(map: OpenerMap, op: Opener): void;
export function topNOpeners(map: OpenerMap, n: number): OpenerEntry[];
```

`topNOpeners` per key:

- `total = sum(surfaceMap.values())`
- `display = argmax(surfaceMap)` — count desc, surface codepoint-asc on tie.

Codepoint-asc tie-break is intentional: `SORRY` (`O`=79) < `Sorry` (`o`=111), so all-caps wins ties. Aligns with caps-as-mood preservation — when surface usage is exactly tied, the more emphatic form surfaces.

Sort entries: count desc, display codepoint-asc on tie. Slice first `n`.

```ts
// src/render.ts
export type RenderInput = {
  topUser: Array<[string, number]>;
  topClaude: Array<[string, number]>;
  openersUser: OpenerEntry[];     // NEW
  openersClaude: OpenerEntry[];   // NEW
  meta: { /* unchanged */ };
};
```

## Pipeline Integration

`src/pipeline.ts` — diff intent:

```ts
const TOP_OPENERS = 10;
const userOpeners: OpenerMap = new Map();
const claudeOpeners: OpenerMap = new Map();

for await (const e of streamEvents(files, progress.tick)) {
  const denoised = denoiseMarkdown(e.text);
  const op = firstOpener(denoised);
  if (op) foldOpener(e.role === "user" ? userOpeners : claudeOpeners, op);

  const map = e.role === "user" ? userMap : claudeMap;
  for (const tok of tokenize(denoised)) {
    map.set(tok, (map.get(tok) ?? 0) + 1);
  }
  // ... existing message + token + timestamp accumulation
}

const openersUser = topNOpeners(userOpeners, TOP_OPENERS);
const openersClaude = topNOpeners(claudeOpeners, TOP_OPENERS);

renderHtml({ topUser, topClaude, openersUser, openersClaude, meta: { ... } });
```

Single denoise call per event (was already once — no extra cost).

## Render Markup

**HTML** (replaces current `<main>` body):

```html
<main>
  <div id="tabs">…unchanged…</div>
  <div id="board">
    <div id="cloud-wrap"><canvas id="cloud"></canvas></div>
    <aside id="openers">
      <h2>Openers</h2>
      <ol id="opener-list"></ol>
    </aside>
  </div>
</main>
```

**CSS** (additions):

```css
#board { display: flex; gap: 1rem; align-items: stretch; }
#cloud-wrap { flex: 1 1 auto; }
#openers {
  flex: 0 0 200px;
  background: #11141a;
  border-radius: 12px;
  padding: 0.75rem 1rem;
  overflow: hidden;
}
#openers h2 {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #8a939b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
#opener-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}
#opener-list li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.95rem;
  color: #e7eaee;
}
#opener-list .count { color: #5b6168; font-variant-numeric: tabular-nums; }
#opener-list .empty { color: #5b6168; font-style: italic; }

@media (max-width: 640px) {
  #board { flex-direction: column; }
  #openers { flex: 0 0 auto; }
}
```

**JS** (extend `setActive`):

```js
var openers = { user: data.openersUser || [], claude: data.openersClaude || [] };

function paintOpeners(tab) {
  var list = openers[tab];
  var ol = document.getElementById('opener-list');
  if (!list.length) {
    ol.innerHTML = '<li class="empty">No openers yet.</li>';
    return;
  }
  var html = '';
  for (var i = 0; i < list.length; i++) {
    html += '<li><span class="word"></span><span class="count"></span></li>';
  }
  ol.innerHTML = html;
  var lis = ol.querySelectorAll('li');
  for (var i = 0; i < list.length; i++) {
    lis[i].querySelector('.word').textContent = list[i].display;
    lis[i].querySelector('.count').textContent = list[i].count;
  }
}

// inside existing setActive(tab):
draw(tab);
paintOpeners(tab);
```

XSS: opener `display` is real user text. `textContent` injection (never `innerHTML` for user data). Inline `__DATA__` JSON already passes through existing `safeJson` (line 20 — escapes `</script`).

## Edge Cases

| Case | Behavior |
|---|---|
| Empty text after denoise | `firstOpener` → null. Not folded. |
| Non-wordlike prefix (`{`, `>`, `>>>`, `---`) | Iterator skips till `isWordLike`. |
| Code-only message | Denoise strips → empty → null. |
| URL/path prefix | Denoise strips first → wordlike segment after wins. |
| Markdown header (`## hello`) | `#` non-wordlike, skipped → `hello` wins. |
| Trailing punct (`Sorry,`) | `TRAILING_PUNCT` strips. Key + display = `Sorry`/`sorry`. |
| Tie on max-count surface | Codepoint-asc — `SORRY` beats `Sorry` (uppercase wins, preserves caps-as-mood). Stable, deterministic. |
| Zero openers either role | `<li class="empty">No openers yet.</li>`. |
| Surface contains `<` `>` | `textContent` neutralizes. |

No try/catch needed: `Intl.Segmenter`, regex, Map ops are all total.

## Testing

**`src/openers.test.ts`** (new) — extraction contract:

- Latin: `"OK Claude let's go"` → `{ key: "ok", surface: "OK" }`
- Latin trailing punct: `"Sorry, my bad"` → `{ key: "sorry", surface: "Sorry" }`
- All-caps: `"WTH broken"` → `{ key: "wth", surface: "WTH" }`
- Lowercase: `"sorry try again"` → `{ key: "sorry", surface: "sorry" }`
- CJK Han: `"但是不對啊"` → first wordlike segment, key = `toLocaleLowerCase` no-op
- CJK + full-width punct: `"好的，看看"` → key strips `，`
- Mixed prefix: `"OK 但是"` → `{ key: "ok", surface: "OK" }`
- Single char: `"Y"` → `{ key: "y", surface: "Y" }`
- Empty: `""` → null
- Whitespace only: `"   "` → null
- Punct only: `"???"` → null
- Symbol prefix: `">>> note"` → `{ key: "note", surface: "note" }`
- Markdown header: `"## hello"` → `{ key: "hello", surface: "hello" }`

CJK assertions use Segmenter probe in test setup, not hardcoded — ICU chunking varies by Node version.

**`src/aggregate.test.ts`** (extend) — `topNOpeners`:

- Cluster: `WTH×30, wth×20, WTh×3` → 1 entry, total 53, display `WTH`
- Tie surface: `Sorry×5, SORRY×5` → display = `SORRY` (codepoint-asc, uppercase wins)
- Top-N cap: 15 in, n=10, length 10
- Sort: count desc, display codepoint-asc on tie
- Empty map: `[]`

**`src/render.test.ts`** (extend) — render contract:

- `<aside id="openers">` present
- `#opener-list` `<ol>` present
- `window.__DATA__` JSON contains `openersUser` + `openersClaude` arrays
- Entries shape: `{ display, count }`
- Responsive `@media (max-width: 640px)` rule emitted
- XSS: `display: "<script>alert(1)</script>"` survives `safeJson` (no raw `</script` in output)

**`src/pipeline.test.ts`** (extend if exists, else add) — integration:

- Two same-role events with same opener → folded
- Two roles, disjoint openers → separated
- Empty pipeline → openers arrays empty in render input

## Success Criteria

1. After `pnpm test`, all new and existing tests green.
2. After `pnpm build && pnpm exec tsc --noEmit`, no type errors.
3. Smoke run via `pnpm exec tsx -e "import('./src/pipeline.ts').then(m => m.run()).then(r => console.log(JSON.stringify(r)))"` produces a valid HTML output containing the opener panel for both tabs.
4. Manual visual check in browser: side panel renders right of cloud on desktop, stacks below on mobile (≤640px). Tab switch repaints both cloud and panel.

## Out of Scope

- Plan writing. Next phase.
- Implementation. After plan + user approval.

## Doc Sync at Commit

- `docs/overview.md` § Module Index: add `src/openers.ts` row, extend `src/aggregate.ts` + `src/pipeline.ts` + `src/render.ts` rows on ship.
- `docs/overview.md` § Roadmap: remove F4 `opener-frequency` row on ship (feature ships into product narrative; remove from forward list).
- This spec deleted on ship (`docs/superpowers/specs/2026-05-15-opener-frequency-design.md` is temporal).
