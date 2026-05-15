# Opener Frequency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a side-panel of top-10 openers (first word of each message, clustered by lowercase, displayed by dominant surface) per role next to the existing wordcloud.

**Architecture:** Single-pass extension to `src/pipeline.ts` — extract first wordlike segment via `Intl.Segmenter`, fold into `Map<key, Map<surface, count>>` per role, top-10 selected and passed into existing `renderHtml`. Render extends with a side panel (desktop) that stacks below the cloud on mobile (≤640px). Reuses existing `denoiseMarkdown` and `Intl.Segmenter` — zero new dependencies.

**Tech Stack:** Node 20+, TypeScript, ESM (`.js` import suffix), vitest, tsup, vanilla JS in HTML output.

**Spec:** `docs/superpowers/specs/2026-05-15-opener-frequency-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/openers.ts` | Create | `firstOpener(text): Opener \| null`. Pure extractor: first wordlike segment via `Intl.Segmenter`, key = lowercase + trailing-punct-strip, surface = original-case + trailing-punct-strip. |
| `src/openers.test.ts` | Create | Latin / CJK / mixed / case / punct / empty / code-only edge cases. |
| `src/aggregate.ts` | Modify | Add `OpenerEntry`, `OpenerMap`, `foldOpener`, `topNOpeners`. Existing `aggregate`/`topN` untouched. |
| `src/aggregate.test.ts` | Modify | Add `topNOpeners` test block: clustering, dominant-surface display, codepoint-asc tie-break, top-N cap, empty. |
| `src/pipeline.ts` | Modify | Two extra `OpenerMap`s, fold per event after denoise, top-10 selected, passed to `renderHtml`. |
| `src/pipeline.test.ts` | Modify | Add integration test: seed jsonl with known openers, assert `openersUser`/`openersClaude` arrays in `__DATA__` payload. |
| `src/render.ts` | Modify | Extend `RenderInput` with `openersUser`/`openersClaude`. Add `<aside id="openers">` markup, panel CSS + responsive `@media`, `paintOpeners(tab)` JS hooked into existing `setActive`. |
| `src/render.test.ts` | Modify | Add render-contract tests: aside present, `<ol id="opener-list">`, JSON payload contains opener arrays, responsive media query emitted, XSS payload survives. |

---

## Task 1: `firstOpener` Extraction Module

**Files:**
- Create: `src/openers.ts`
- Test: `src/openers.test.ts`

- [ ] **Step 1: Write failing tests for `firstOpener`**

Create `src/openers.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { firstOpener } from "./openers.js";

describe("firstOpener", () => {
  it("returns null for empty input", () => {
    expect(firstOpener("")).toBeNull();
  });

  it("returns null for whitespace only", () => {
    expect(firstOpener("   ")).toBeNull();
  });

  it("returns null for punctuation only", () => {
    expect(firstOpener("???")).toBeNull();
  });

  it("returns null for symbol-only prefix with no wordlike segment", () => {
    expect(firstOpener(">>>")).toBeNull();
  });

  it("extracts first Latin word, preserves case", () => {
    expect(firstOpener("OK Claude let's go")).toEqual({
      key: "ok",
      surface: "OK",
    });
  });

  it("strips trailing Latin punctuation from key and surface", () => {
    expect(firstOpener("Sorry, my bad")).toEqual({
      key: "sorry",
      surface: "Sorry",
    });
  });

  it("preserves all-caps surface, lowercases key", () => {
    expect(firstOpener("WTH broken")).toEqual({
      key: "wth",
      surface: "WTH",
    });
  });

  it("preserves lowercase surface", () => {
    expect(firstOpener("sorry try again")).toEqual({
      key: "sorry",
      surface: "sorry",
    });
  });

  it("handles single-character word", () => {
    expect(firstOpener("Y")).toEqual({ key: "y", surface: "Y" });
  });

  it("skips symbol prefix and grabs the first wordlike segment", () => {
    expect(firstOpener(">>> note this")).toEqual({
      key: "note",
      surface: "note",
    });
  });

  it("skips markdown header marker and grabs the first wordlike segment", () => {
    expect(firstOpener("## hello")).toEqual({
      key: "hello",
      surface: "hello",
    });
  });

  it("returns first segment when input mixes Latin and CJK", () => {
    // 'OK' is the first wordlike segment.
    expect(firstOpener("OK 但是")).toEqual({ key: "ok", surface: "OK" });
  });

  it("strips full-width CJK trailing punctuation", () => {
    // Whatever Intl.Segmenter chunks first from the CJK string,
    // the trailing fullwidth comma must not appear in surface or key.
    const op = firstOpener("好的，看看");
    expect(op).not.toBeNull();
    expect(op!.surface.endsWith("，")).toBe(false);
    expect(op!.key.endsWith("，")).toBe(false);
    // First chunk should not be empty.
    expect(op!.surface.length).toBeGreaterThan(0);
    // Key should equal surface lowercased (CJK Han is case-invariant).
    expect(op!.key).toBe(op!.surface.toLocaleLowerCase());
  });

  it("returns the first wordlike CJK segment for pure CJK input", () => {
    // ICU chunking varies — assert structural shape, not exact segment.
    const op = firstOpener("但是不對啊");
    expect(op).not.toBeNull();
    expect(op!.surface.length).toBeGreaterThan(0);
    expect(op!.key).toBe(op!.surface.toLocaleLowerCase());
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/openers.test.ts`
Expected: FAIL — `Cannot find module './openers.js'` or equivalent module-not-found.

- [ ] **Step 3: Implement `firstOpener`**

Create `src/openers.ts`:

```ts
export type Opener = { key: string; surface: string };

const TRAILING_PUNCT = /[.,!?;:。、！？]+$/u;

const segmenter = new Intl.Segmenter(undefined, { granularity: "word" });

export function firstOpener(text: string): Opener | null {
  if (!text) return null;
  for (const seg of segmenter.segment(text)) {
    if (!seg.isWordLike) continue;
    const surface = seg.segment.replace(TRAILING_PUNCT, "");
    if (!surface) continue;
    const key = surface.toLocaleLowerCase().replace(TRAILING_PUNCT, "");
    if (!key) continue;
    return { key, surface };
  }
  return null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/openers.test.ts`
Expected: PASS — all `firstOpener` tests green.

- [ ] **Step 5: Commit**

```bash
git add src/openers.ts src/openers.test.ts
git commit -m "feat(openers): firstOpener extracts first wordlike segment

Pure module: Intl.Segmenter word granularity, lowercase + trailing-
punct-stripped key, original-case + trailing-punct-stripped surface.
Latin + CJK (full-width punct) covered. Skips messages with no
wordlike segment after denoise."
```

---

## Task 2: Aggregate Extension — `foldOpener` + `topNOpeners`

**Files:**
- Modify: `src/aggregate.ts`
- Test: `src/aggregate.test.ts`

- [ ] **Step 1: Write failing tests for opener aggregation**

Append to `src/aggregate.test.ts`:

```ts
import { foldOpener, topNOpeners, type OpenerMap } from "./aggregate.js";

describe("foldOpener", () => {
  it("creates a key entry on first fold", () => {
    const map: OpenerMap = new Map();
    foldOpener(map, { key: "wth", surface: "WTH" });
    expect(map.get("wth")?.get("WTH")).toBe(1);
  });

  it("increments existing surface count", () => {
    const map: OpenerMap = new Map();
    foldOpener(map, { key: "wth", surface: "WTH" });
    foldOpener(map, { key: "wth", surface: "WTH" });
    expect(map.get("wth")?.get("WTH")).toBe(2);
  });

  it("tracks distinct surfaces under same key", () => {
    const map: OpenerMap = new Map();
    foldOpener(map, { key: "wth", surface: "WTH" });
    foldOpener(map, { key: "wth", surface: "wth" });
    expect(map.get("wth")?.get("WTH")).toBe(1);
    expect(map.get("wth")?.get("wth")).toBe(1);
  });
});

describe("topNOpeners", () => {
  it("returns empty array for empty map", () => {
    expect(topNOpeners(new Map(), 10)).toEqual([]);
  });

  it("clusters surfaces under one key, displays dominant surface", () => {
    const map: OpenerMap = new Map([
      [
        "wth",
        new Map([
          ["WTH", 30],
          ["wth", 20],
          ["WTh", 3],
        ]),
      ],
    ]);
    expect(topNOpeners(map, 10)).toEqual([{ display: "WTH", count: 53 }]);
  });

  it("sorts clusters by total count descending", () => {
    const map: OpenerMap = new Map([
      ["sorry", new Map([["sorry", 5]])],
      ["ok", new Map([["OK", 100]])],
      ["wth", new Map([["WTH", 30]])],
    ]);
    expect(topNOpeners(map, 10)).toEqual([
      { display: "OK", count: 100 },
      { display: "WTH", count: 30 },
      { display: "sorry", count: 5 },
    ]);
  });

  it("breaks display tie by codepoint-asc surface (uppercase wins)", () => {
    const map: OpenerMap = new Map([
      [
        "sorry",
        new Map([
          ["Sorry", 5],
          ["SORRY", 5],
        ]),
      ],
    ]);
    // 'SORRY' < 'Sorry' by codepoint ('O'=79 < 'o'=111)
    expect(topNOpeners(map, 10)).toEqual([{ display: "SORRY", count: 10 }]);
  });

  it("breaks cluster-total tie by display codepoint-asc", () => {
    const map: OpenerMap = new Map([
      ["zebra", new Map([["zebra", 3]])],
      ["alpha", new Map([["alpha", 3]])],
      ["mango", new Map([["mango", 3]])],
    ]);
    expect(topNOpeners(map, 10)).toEqual([
      { display: "alpha", count: 3 },
      { display: "mango", count: 3 },
      { display: "zebra", count: 3 },
    ]);
  });

  it("truncates to n", () => {
    const map: OpenerMap = new Map([
      ["a", new Map([["a", 5]])],
      ["b", new Map([["b", 4]])],
      ["c", new Map([["c", 3]])],
      ["d", new Map([["d", 2]])],
      ["e", new Map([["e", 1]])],
    ]);
    expect(topNOpeners(map, 2)).toEqual([
      { display: "a", count: 5 },
      { display: "b", count: 4 },
    ]);
  });

  it("returns all entries when n exceeds size", () => {
    const map: OpenerMap = new Map([
      ["a", new Map([["a", 2]])],
      ["b", new Map([["b", 1]])],
    ]);
    expect(topNOpeners(map, 100)).toEqual([
      { display: "a", count: 2 },
      { display: "b", count: 1 },
    ]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/aggregate.test.ts`
Expected: FAIL — `foldOpener`, `topNOpeners`, `OpenerMap` exports not found.

- [ ] **Step 3: Extend `src/aggregate.ts`**

Append to `src/aggregate.ts`:

```ts
import type { Opener } from "./openers.js";

export type OpenerEntry = { display: string; count: number };
export type OpenerMap = Map<string, Map<string, number>>;

export function foldOpener(map: OpenerMap, op: Opener): void {
  let inner = map.get(op.key);
  if (!inner) {
    inner = new Map();
    map.set(op.key, inner);
  }
  inner.set(op.surface, (inner.get(op.surface) ?? 0) + 1);
}

export function topNOpeners(map: OpenerMap, n: number): OpenerEntry[] {
  const entries: OpenerEntry[] = [];
  for (const [, surfaceMap] of map) {
    let total = 0;
    let bestSurface = "";
    let bestCount = -1;
    for (const [surface, count] of surfaceMap) {
      total += count;
      if (
        count > bestCount ||
        (count === bestCount && surface < bestSurface)
      ) {
        bestCount = count;
        bestSurface = surface;
      }
    }
    entries.push({ display: bestSurface, count: total });
  }
  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.display < b.display ? -1 : a.display > b.display ? 1 : 0;
  });
  return entries.slice(0, n);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm exec vitest run src/aggregate.test.ts`
Expected: PASS — all aggregate tests green (existing + new).

- [ ] **Step 5: Commit**

```bash
git add src/aggregate.ts src/aggregate.test.ts
git commit -m "feat(aggregate): foldOpener + topNOpeners cluster by key

Map<key, Map<surface, count>> shape. Per cluster: total = sum of
surface counts, display = argmax surface (codepoint-asc tie-break,
uppercase wins). Sort entries count-desc, display codepoint-asc on
tie. Codepoint comparison preserves caps-as-mood signal."
```

---

## Task 3: Pipeline Integration

**Files:**
- Modify: `src/pipeline.ts`
- Test: `src/pipeline.test.ts`

- [ ] **Step 1: Write failing integration test**

Append to `src/pipeline.test.ts` (inside the existing `describe("pipeline.run — speaker split", ...)` block, after the existing `it("counts raw token occurrences ...")` test):

```ts
  it("extracts top openers per role into __DATA__ (F4 opener-frequency)", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        // user: WTH x2, OK x3, sorry x1
        { message: { role: "user", content: "WTH this broke" }, timestamp: "2026-01-01T00:00:00Z" },
        { message: { role: "user", content: "wth again" }, timestamp: "2026-01-01T00:00:01Z" },
        { message: { role: "user", content: "OK got it" }, timestamp: "2026-01-01T00:00:02Z" },
        { message: { role: "user", content: "ok next" }, timestamp: "2026-01-01T00:00:03Z" },
        { message: { role: "user", content: "OK then" }, timestamp: "2026-01-01T00:00:04Z" },
        { message: { role: "user", content: "Sorry, my bad" }, timestamp: "2026-01-01T00:00:05Z" },
        // assistant: Looking x2, Sure x1
        { message: { role: "assistant", content: "Looking into this" }, timestamp: "2026-01-01T00:00:06Z" },
        { message: { role: "assistant", content: "looking deeper" }, timestamp: "2026-01-01T00:00:07Z" },
        { message: { role: "assistant", content: "Sure!" }, timestamp: "2026-01-01T00:00:08Z" },
      ),
    );

    const result = await run();
    const html = await readFile(result.outPath!, "utf8");
    const data = extractData(html);

    // openersUser: ok=3 (display 'OK'), wth=2 (display 'WTH'), sorry=1 (display 'Sorry')
    expect(data.openersUser).toEqual([
      { display: "OK", count: 3 },
      { display: "WTH", count: 2 },
      { display: "Sorry", count: 1 },
    ]);

    // openersClaude: looking=2 (display 'Looking'), sure=1 (display 'Sure')
    expect(data.openersClaude).toEqual([
      { display: "Looking", count: 2 },
      { display: "Sure", count: 1 },
    ]);
  });

  it("skips opener fold for messages with no wordlike segment after denoise", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        // Code-only message — denoise strips, opener should not fold.
        {
          message: {
            role: "user",
            content: "```ts\nimport { foo } from './foo.js';\n```",
          },
          timestamp: "2026-01-01T00:00:00Z",
        },
        // Real opener.
        { message: { role: "user", content: "what now" }, timestamp: "2026-01-01T00:00:01Z" },
        { message: { role: "assistant", content: "ok" }, timestamp: "2026-01-01T00:00:02Z" },
      ),
    );

    const result = await run();
    const html = await readFile(result.outPath!, "utf8");
    const data = extractData(html);

    // Only one user message produced an opener.
    const userTotal = data.openersUser.reduce((s, e) => s + e.count, 0);
    expect(userTotal).toBe(1);
    expect(data.openersUser[0]?.display).toBe("what");
  });
```

Also extend the `extractData` helper at the top of the file to include opener arrays:

```ts
function extractData(html: string): {
  topUser: Array<[string, number]>;
  topClaude: Array<[string, number]>;
  openersUser: Array<{ display: string; count: number }>;
  openersClaude: Array<{ display: string; count: number }>;
  meta: {
    sessions: number;
    messages: number;
    tokensIn: number;
    tokensOut: number;
    dateRange: [string, string] | null;
  };
} {
  const m = html.match(/window\.__DATA__ = ({[\s\S]*?});/);
  if (!m) throw new Error("__DATA__ payload not found in HTML");
  return JSON.parse(m[1]!);
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/pipeline.test.ts`
Expected: FAIL — `data.openersUser` undefined; assertion fails on `.toEqual(...)`.

- [ ] **Step 3: Extend `src/pipeline.ts`**

Replace `src/pipeline.ts` content with:

```ts
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { discoverLogs, logsRoot } from "./discover.js";
import { streamEvents } from "./stream.js";
import { denoiseMarkdown } from "./denoise.js";
import { tokenize } from "./tokenize.js";
import { topN, foldOpener, topNOpeners, type OpenerMap } from "./aggregate.js";
import { firstOpener } from "./openers.js";
import { renderHtml } from "./render.js";
import { createProgress } from "./progress.js";

const OUTPUT_FILE = "ok-claude-output.html";
const TOP_N = 100;
const TOP_OPENERS = 10;

export type RunResult =
  | { outPath: string; reason?: undefined }
  | { outPath: null; reason: string };

export async function run(): Promise<RunResult> {
  const files = await discoverLogs();
  if (files.length === 0) {
    return {
      outPath: null,
      reason: `No Claude Code logs found at ${logsRoot()}`,
    };
  }

  const totalBytes = files.reduce((s, f) => s + f.size, 0);
  const progress = createProgress(totalBytes, files.length);

  const userMap = new Map<string, number>();
  const claudeMap = new Map<string, number>();
  const userOpeners: OpenerMap = new Map();
  const claudeOpeners: OpenerMap = new Map();
  let messages = 0;
  let tokensIn = 0;
  let tokensOut = 0;
  let minTs: string | undefined;
  let maxTs: string | undefined;

  for await (const e of streamEvents(files, progress.tick)) {
    const denoised = denoiseMarkdown(e.text);
    const op = firstOpener(denoised);
    if (op) {
      foldOpener(e.role === "user" ? userOpeners : claudeOpeners, op);
    }
    const map = e.role === "user" ? userMap : claudeMap;
    for (const tok of tokenize(denoised)) {
      map.set(tok, (map.get(tok) ?? 0) + 1);
    }
    messages++;
    if (typeof e.tokensIn === "number") tokensIn += e.tokensIn;
    if (typeof e.tokensOut === "number") tokensOut += e.tokensOut;
    if (e.timestamp) {
      if (minTs === undefined || e.timestamp < minTs) minTs = e.timestamp;
      if (maxTs === undefined || e.timestamp > maxTs) maxTs = e.timestamp;
    }
  }
  progress.done();

  const topUser = topN(userMap, TOP_N);
  const topClaude = topN(claudeMap, TOP_N);
  const openersUser = topNOpeners(userOpeners, TOP_OPENERS);
  const openersClaude = topNOpeners(claudeOpeners, TOP_OPENERS);

  const html = renderHtml({
    topUser,
    topClaude,
    openersUser,
    openersClaude,
    meta: {
      sessions: files.length,
      messages,
      tokensIn,
      tokensOut,
      dateRange:
        minTs !== undefined && maxTs !== undefined ? [minTs, maxTs] : null,
    },
  });

  const outPath = resolve(process.cwd(), OUTPUT_FILE);
  await writeFile(outPath, html, "utf8");
  return { outPath };
}
```

Note: this requires `RenderInput` in `src/render.ts` to accept `openersUser`/`openersClaude`. That happens in Task 4. Tests in this task will still fail at type-check until Task 4 lands.

- [ ] **Step 4: Run tests — expect type error or runtime fail until Task 4**

Run: `pnpm exec tsc --noEmit`
Expected: FAIL — `Object literal may only specify known properties` on `openersUser`/`openersClaude` passed into `renderHtml`. This is the seam to Task 4.

Do NOT commit yet. Proceed to Task 4 in the same working tree.

---

## Task 4: Render — Side Panel + Responsive CSS + JS Paint

**Files:**
- Modify: `src/render.ts`
- Test: `src/render.test.ts`

- [ ] **Step 1: Write failing render-contract tests**

Update the `input(...)` helper at the top of `src/render.test.ts` to include opener defaults, and extend the type import:

```ts
import { describe, it, expect } from "vitest";
import { renderHtml, type RenderInput } from "./render.js";

function input(over: Partial<RenderInput> = {}): RenderInput {
  return {
    topUser: over.topUser ?? [["foo", 3], ["bar", 1]],
    topClaude: over.topClaude ?? [["baz", 2]],
    openersUser: over.openersUser ?? [{ display: "OK", count: 5 }],
    openersClaude: over.openersClaude ?? [{ display: "Looking", count: 3 }],
    meta: {
      sessions: over.meta?.sessions ?? 1,
      messages: over.meta?.messages ?? 4,
      tokensIn: over.meta?.tokensIn ?? 0,
      tokensOut: over.meta?.tokensOut ?? 0,
      dateRange: over.meta?.dateRange ?? null,
    },
  };
}
```

Also update the `inputWithTokens` helper at the bottom of the file:

```ts
function inputWithTokens(over: Partial<RenderInput["meta"]> = {}): RenderInput {
  return {
    topUser: [["foo", 3]],
    topClaude: [["bar", 2]],
    openersUser: [],
    openersClaude: [],
    meta: {
      sessions: 1,
      messages: 4,
      tokensIn: over.tokensIn ?? 0,
      tokensOut: over.tokensOut ?? 0,
      dateRange: over.dateRange ?? null,
    },
  };
}
```

Append a new `describe` block for openers:

```ts
describe("renderHtml — opener side panel (F4 opener-frequency)", () => {
  it("renders an aside container with id='openers'", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<aside[^>]*id="openers"/);
  });

  it("includes an ordered list with id='opener-list' for JS to fill", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/<ol[^>]*id="opener-list"/);
  });

  it("includes openersUser and openersClaude in __DATA__ payload", () => {
    const html = renderHtml(
      input({
        openersUser: [{ display: "WTH", count: 53 }],
        openersClaude: [{ display: "Looking", count: 12 }],
      }),
    );
    expect(html).toMatch(/"openersUser"\s*:\s*\[\s*\{\s*"display"\s*:\s*"WTH"\s*,\s*"count"\s*:\s*53\s*\}\s*\]/);
    expect(html).toMatch(/"openersClaude"\s*:\s*\[\s*\{\s*"display"\s*:\s*"Looking"\s*,\s*"count"\s*:\s*12\s*\}\s*\]/);
  });

  it("emits responsive @media (max-width: 640px) rule for stacking on mobile", () => {
    const html = renderHtml(input());
    expect(html).toMatch(/@media\s*\(\s*max-width:\s*640px\s*\)/);
  });

  it("includes a paintOpeners function in the boot script", () => {
    const html = renderHtml(input());
    expect(html).toContain("paintOpeners");
  });

  it("survives XSS payload in opener display via safeJson + textContent", () => {
    const html = renderHtml(
      input({
        openersUser: [
          { display: "</script><script>alert(1)</script>", count: 1 },
        ],
      }),
    );
    // safeJson must escape </script
    expect(html).not.toMatch(/<\/script><script>alert/);
  });

  it("emits opener-list empty-state branch for both roles", () => {
    const html = renderHtml(input({ openersUser: [], openersClaude: [] }));
    expect(html).toContain("No openers yet.");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm exec vitest run src/render.test.ts`
Expected: FAIL — `RenderInput` type does not have `openersUser`/`openersClaude`; helper builds invalid input.

- [ ] **Step 3: Rewrite `src/render.ts`**

Replace `src/render.ts` with:

```ts
import { readFileSync } from "node:fs";

const VENDOR_JS = readFileSync(
  new URL("./vendor/wordcloud2.js", import.meta.url),
  "utf8",
);

export type OpenerEntry = { display: string; count: number };

export type RenderInput = {
  topUser: Array<[string, number]>;
  topClaude: Array<[string, number]>;
  openersUser: OpenerEntry[];
  openersClaude: OpenerEntry[];
  meta: {
    sessions: number;
    messages: number;
    tokensIn: number;
    tokensOut: number;
    dateRange: [string, string] | null;
  };
};

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/<\/(script)/gi, "<\\/$1");
}

function formatTokens(total: number): string {
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `${(total / 1_000).toFixed(1)}K`;
  return String(total);
}

function formatSubhead(meta: RenderInput["meta"]): string {
  const range = meta.dateRange
    ? ` · ${meta.dateRange[0]} → ${meta.dateRange[1]}`
    : "";
  const sNoun = meta.sessions === 1 ? "session" : "sessions";
  const mNoun = meta.messages === 1 ? "message" : "messages";
  const totalTokens = meta.tokensIn + meta.tokensOut;
  const tokens =
    totalTokens > 0 ? `${formatTokens(totalTokens)} tokens · ` : "";
  return `${tokens}${meta.sessions} ${sNoun} · ${meta.messages} ${mNoun}${range}`;
}

export function renderHtml(input: RenderInput): string {
  const dataJson = safeJson({
    topUser: input.topUser,
    topClaude: input.topClaude,
    openersUser: input.openersUser,
    openersClaude: input.openersClaude,
    meta: input.meta,
  });
  const subhead = formatSubhead(input.meta);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>OK Claude</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #0b0d10; color: #e7eaee; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { padding: 1.5rem 2rem 0.5rem; }
  header h1 { margin: 0; font-size: 1.75rem; font-weight: 700; letter-spacing: -0.02em; }
  header p { margin: 0.25rem 0 0; color: #8a939b; font-size: 0.95rem; }
  main { padding: 1rem 2rem 2rem; }
  #tabs { display: flex; gap: 0.5rem; margin-bottom: 0.75rem; }
  #tabs button { appearance: none; background: #11141a; color: #8a939b; border: 1px solid #1d2330; border-radius: 8px; padding: 0.45rem 1rem; font: inherit; cursor: pointer; transition: background 120ms, color 120ms, border-color 120ms; }
  #tabs button:hover { color: #e7eaee; }
  #tabs button.active { background: #1d2330; color: #e7eaee; border-color: #2a3242; }
  #board { display: flex; gap: 1rem; align-items: stretch; }
  #cloud-wrap { flex: 1 1 auto; aspect-ratio: 16 / 10; max-height: calc(100vh - 12rem); background: #11141a; border-radius: 12px; overflow: hidden; position: relative; }
  #cloud { width: 100%; height: 100%; display: block; }
  #openers { flex: 0 0 200px; background: #11141a; border-radius: 12px; padding: 0.75rem 1rem; overflow: hidden; }
  #openers h2 { margin: 0 0 0.5rem; font-size: 0.85rem; font-weight: 600; color: #8a939b; text-transform: uppercase; letter-spacing: 0.05em; }
  #opener-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
  #opener-list li { display: flex; justify-content: space-between; align-items: baseline; font-size: 0.95rem; color: #e7eaee; }
  #opener-list .count { color: #5b6168; font-variant-numeric: tabular-nums; }
  #opener-list .empty { color: #5b6168; font-style: italic; }
  footer { padding: 0 2rem 1.5rem; color: #5b6168; font-size: 0.8rem; }
  footer a { color: inherit; }
  @media (max-width: 640px) {
    #board { flex-direction: column; }
    #openers { flex: 0 0 auto; }
  }
</style>
</head>
<body>
<header>
  <h1>OK Claude</h1>
  <p>${subhead}</p>
</header>
<main>
  <div id="tabs">
    <button type="button" data-tab="user" class="active">You</button>
    <button type="button" data-tab="claude">Claude</button>
  </div>
  <div id="board">
    <div id="cloud-wrap"><canvas id="cloud"></canvas></div>
    <aside id="openers">
      <h2>Openers</h2>
      <ol id="opener-list"></ol>
    </aside>
  </div>
</main>
<footer>generated by <code>npx ok-claude</code> · mechanical word frequency · all rendering offline</footer>

<script>window.__DATA__ = ${dataJson};</script>
<script>
${VENDOR_JS}
</script>
<script>
(function boot() {
  var data = window.__DATA__ || { topUser: [], topClaude: [], openersUser: [], openersClaude: [], meta: {} };
  var lists = { user: data.topUser || [], claude: data.topClaude || [] };
  var openers = { user: data.openersUser || [], claude: data.openersClaude || [] };
  var canvas = document.getElementById('cloud');
  var wrap = document.getElementById('cloud-wrap');
  var active = 'user';

  function resize() {
    var dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    canvas.style.width = wrap.clientWidth + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
  }

  function showEmpty(tab) {
    var msg = tab === 'user' ? 'No words from You yet.' : 'No words from Claude yet.';
    wrap.innerHTML = '<p style="padding:2rem;color:#8a939b">' + msg + '</p>';
  }

  function restoreCanvas() {
    if (!document.getElementById('cloud')) {
      wrap.innerHTML = '<canvas id="cloud"></canvas>';
      canvas = document.getElementById('cloud');
    }
  }

  function draw(tab) {
    var list = lists[tab];
    if (!list.length) {
      showEmpty(tab);
      return;
    }
    restoreCanvas();
    resize();
    var max = list[0][1];
    var weighted = list.map(function (pair) {
      var ratio = pair[1] / max;
      var size = 12 + Math.round(ratio * 80);
      return [pair[0], size];
    });
    WordCloud(canvas, {
      list: weighted,
      gridSize: 8,
      rotateRatio: 0.25,
      rotationSteps: 2,
      backgroundColor: '#11141a',
      color: 'random-light',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
      shrinkToFit: true,
      drawOutOfBound: false,
    });
  }

  function paintOpeners(tab) {
    var list = openers[tab];
    var ol = document.getElementById('opener-list');
    if (!ol) return;
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
    for (var j = 0; j < list.length; j++) {
      lis[j].querySelector('.word').textContent = list[j].display;
      lis[j].querySelector('.count').textContent = list[j].count;
    }
  }

  function setActive(tab) {
    active = tab;
    var buttons = document.querySelectorAll('#tabs button');
    for (var i = 0; i < buttons.length; i++) {
      var btn = buttons[i];
      if (btn.getAttribute('data-tab') === tab) btn.classList.add('active');
      else btn.classList.remove('active');
    }
    draw(tab);
    paintOpeners(tab);
  }

  document.getElementById('tabs').addEventListener('click', function (ev) {
    var t = ev.target;
    if (!t || t.tagName !== 'BUTTON') return;
    var tab = t.getAttribute('data-tab');
    if (!tab || tab === active || !lists[tab]) return;
    setActive(tab);
  });

  setActive('user');
})();
</script>
</body>
</html>
`;
}
```

Notable changes from current `src/render.ts`:
- `RenderInput` gains `openersUser` + `openersClaude` (typed `OpenerEntry[]`).
- `dataJson` includes both opener arrays.
- New `<div id="board">` wraps `#cloud-wrap` + `<aside id="openers">`.
- CSS: `#cloud-wrap` keeps aspect-ratio + max-height; flex layout via `#board`.
- CSS: `#openers`, `#opener-list` styles + `@media (max-width: 640px)` stacking.
- JS: `openers` lookup, `paintOpeners(tab)` function, called inside `setActive`.

- [ ] **Step 4: Run tests to verify all pass**

Run in parallel:
- `pnpm exec vitest run`
- `pnpm exec tsc --noEmit`

Expected: PASS — all tests green (openers, aggregate, pipeline integration, render). No type errors.

- [ ] **Step 5: Commit**

```bash
git add src/pipeline.ts src/pipeline.test.ts src/render.ts src/render.test.ts
git commit -m "feat(render+pipeline): wire opener side panel into output

Pipeline folds first-word openers per role via firstOpener +
foldOpener; top 10 selected and passed into renderHtml. Render
extends RenderInput, adds <aside id=\"openers\"> right of cloud
inside flex #board, paints list via textContent (XSS-safe), and
stacks below cloud on viewports ≤640px. Closes F4 opener-frequency."
```

---

## Task 5: Smoke Test + Doc Sync + Ship

**Files:**
- Modify: `docs/overview.md` (Module Index + Roadmap)
- Delete: `docs/superpowers/specs/2026-05-15-opener-frequency-design.md`
- Delete: `docs/superpowers/plans/2026-05-15-opener-frequency.md` (this file)

- [ ] **Step 1: Smoke run against real logs**

Run: `pnpm build && pnpm exec tsx -e "import('./src/pipeline.ts').then(m => m.run()).then(r => console.log(JSON.stringify(r)))"`
Expected: outputs JSON with `outPath` pointing to `./ok-claude-output.html`. No exception.

- [ ] **Step 2: Manual visual check in browser**

Open the generated `./ok-claude-output.html` in a browser.

Verify:
- Side panel appears right of wordcloud with header `OPENERS` and a top-10 list.
- Each item shows display word (left) + count (right, monospaced numerals).
- Clicking the `Claude` tab repaints both the cloud AND the opener panel.
- Resize window to ≤640px width: opener panel stacks below the cloud, full-width.
- Empty-state: if opener list is empty for a role, the `No openers yet.` italic line shows.

If any visual issue: stop, surface to user before proceeding.

- [ ] **Step 3: Update `docs/overview.md` § Module Index**

Add a new row for `src/openers.ts` and extend descriptions on `src/aggregate.ts`, `src/pipeline.ts`, and `src/render.ts`.

In the `## Module Index` table:

- Add row (alphabetical position, after `src/discover.ts`):
  ```
  | `src/openers.ts` | First-word opener extractor. `firstOpener(text)` returns `{key, surface}` or null — first wordlike segment via `Intl.Segmenter`, key = lowercase + trailing-punct-stripped, surface = original-case + trailing-punct-stripped. Latin + CJK (full-width punct). Returns null when no wordlike segment after denoise. |
  ```
- Extend `src/aggregate.ts` row to mention `foldOpener` + `topNOpeners` + cluster shape.
- Extend `src/pipeline.ts` row to mention opener fold per event + top-10 selection.
- Extend `src/render.ts` row to mention `<aside id="openers">` panel + responsive @media stacking + `paintOpeners`.

- [ ] **Step 4: Update `docs/overview.md` § Roadmap**

Remove the F4 row entirely (feature ships into product narrative; remove from forward list per CLAUDE.md doc-sync rule):

Before:
```
| F4 | `opener-frequency`    | Conversation openers — count first word/phrase per message | Mood signature signal cloud loses to position-blind tokenize.            |
| F5 | `png-export`          | Wire `html-to-image` to in-page Export button      | Social-share = core value prop (see § Problem).                          |
```

After:
```
| F5 | `png-export`          | Wire `html-to-image` to in-page Export button      | Social-share = core value prop (see § Problem).                          |
```

(Renumbering F5/F6/F7 is NOT done — IDs are stable across history; only the row gets removed.)

- [ ] **Step 5: Delete temporal spec + plan files**

```bash
rm docs/superpowers/specs/2026-05-15-opener-frequency-design.md
rm docs/superpowers/plans/2026-05-15-opener-frequency.md
```

- [ ] **Step 6: Commit doc sync + cleanup**

```bash
git add docs/overview.md docs/superpowers/specs/2026-05-15-opener-frequency-design.md docs/superpowers/plans/2026-05-15-opener-frequency.md
git commit -m "docs: ship F4 opener-frequency

Module Index gains src/openers.ts; aggregate / pipeline / render
rows extended for opener wiring. Roadmap F4 row removed (feature
shipped into product narrative). Temporal spec + plan deleted."
```

- [ ] **Step 7: Run full test + type check one more time**

Run in parallel:
- `pnpm test`
- `pnpm exec tsc --noEmit`

Expected: PASS — green.

- [ ] **Step 8: Confirm clean tree**

Run: `git status`
Expected: `nothing to commit, working tree clean`.

---

## Self-Review Checklist

Quick sanity pass over this plan against the spec:

1. **Spec coverage:**
   - Spec § Solution → Tasks 1–4 (extract, cluster, fold, render). ✓
   - Spec § Architecture → Tasks 1–4 file map matches. ✓
   - Spec § Data Shapes → Task 1 + Task 2 + Task 4 implement all named types. ✓
   - Spec § Pipeline Integration → Task 3. ✓
   - Spec § Render Markup → Task 4. ✓
   - Spec § Edge Cases → Task 1 + Task 3 tests cover empty, code-only, symbol prefix, markdown header, trailing punct, tie-break. ✓
   - Spec § Testing → Task 1 (openers), Task 2 (aggregate), Task 3 (pipeline integration), Task 4 (render). ✓
   - Spec § Success Criteria → Task 5 (smoke, manual visual, type check). ✓
   - Spec § Doc Sync at Commit → Task 5 (Module Index, Roadmap removal, spec delete). ✓

2. **Type consistency:**
   - `Opener` defined in `src/openers.ts` (Task 1), imported in `src/aggregate.ts` (Task 2). ✓
   - `OpenerEntry` defined in `src/aggregate.ts` (Task 2), used in `RenderInput` (Task 4). ✓
   - `OpenerMap` defined in `src/aggregate.ts` (Task 2), imported in `src/pipeline.ts` (Task 3). ✓
   - `RenderInput` extension declared in Task 4; pipeline uses it in Task 3 — **deliberate seam**: Task 3's tsc fails until Task 4 lands. Documented in Task 3 Step 4.

3. **Placeholder scan:** No TBD/TODO/"add validation" stubs. All code blocks are complete and runnable.
