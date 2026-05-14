# F3 Stream + Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the all-in-memory pipeline with a streaming spine + TTY-gated progress bar, and ride that hot path to ship BUG-001 (harness vocab filter) and GAP-004 (real token totals in the subhead).

**Architecture:** `discover` returns sized file entries → new `stream.ts` reads each file via `readline` and yields `LogEvent` per line through `parseLine` → `pipeline.ts` folds events into per-role frequency `Map`s and accumulates meta inline (messages, token sums, min/max timestamp) → existing `topN` + `render` finish the job. A new `progress.ts` reports byte progress to stderr only when TTY-attached.

**Tech Stack:** Node 20+ ESM, TypeScript strict + `noUncheckedIndexedAccess`, `node:fs`, `node:readline`, vitest. Spec: `docs/superpowers/specs/2026-05-14-stream-and-progress-design.md`.

---

## File Map

| Action | Path | Responsibility |
| --- | --- | --- |
| Modify | `src/parse.ts` | Add `parseLine`; apply BUG-001 (`isMeta`, tag-body strip) + GAP-004 (`usage` extraction) here. `parseJsonl` kept as a thin wrapper for back-compat tests. |
| Modify | `src/parse.test.ts` | Extend with BUG-001 + GAP-004 cases. |
| Modify | `src/discover.ts` | Return `Array<{ path, size }>`; `stat` each entry. |
| Create | `src/discover.test.ts` | Cover size return + ENOENT short-circuit + sort order. |
| Create | `src/progress.ts` | `createProgress(totalBytes, fileCount)` → `{ tick, done }`. Throttled, TTY-gated. |
| Create | `src/progress.test.ts` | Non-TTY no-op, format check, throttle, `done()` always renders. |
| Create | `src/stream.ts` | `streamEvents(files, onProgress)` async iterable via `readline`. Per-file error tolerance. |
| Create | `src/stream.test.ts` | Fixture-based: ordering, event filtering, progress callback monotonicity, per-file read error skip. |
| Modify | `src/pipeline.ts` | Streaming fold: per-role Maps, meta inline, no events array. Build `dateRange` from folded min/max. |
| Modify | `src/pipeline.test.ts` | Add memory-shape regression guard + token-sum assertion. |
| Modify | `src/render.ts` | Extend `RenderMeta` with `tokensIn`/`tokensOut`; subhead gains `formatTokens` segment with graceful omit. |
| Modify | `src/render.test.ts` | Subhead-tokens cases. |
| Modify | `docs/overview.md` | Add `stream.ts` + `progress.ts` rows in module index; refresh data-flow diagram; subhead description. |
| Modify | `docs/backlog.md` | Delete BUG-001 + GAP-004; mark F3 shipped in the roadmap table. |
| Delete | `docs/superpowers/specs/2026-05-14-stream-and-progress-design.md` | Temporal — drop after F3 lands. |
| Delete | `docs/superpowers/plans/2026-05-14-stream-and-progress.md` | This file. Temporal — drop after F3 lands. |

---

## Task 1: Extract `parseLine` (pure refactor, no behavior change)

**Files:**
- Modify: `src/parse.ts`
- Test: `src/parse.test.ts` (existing tests must stay green)

- [ ] **Step 1: Run existing parse tests, confirm green baseline**

Run: `pnpm test -- parse`
Expected: `parseJsonl` suite passes (8 cases).

- [ ] **Step 2: Refactor `parse.ts` — extract `parseLine`, keep `parseJsonl` as a wrapper**

Replace `src/parse.ts` body with:

```typescript
export type LogEvent = {
  role: "user" | "assistant";
  text: string;
  timestamp?: string;
};

type RawContentBlock = { type?: string; text?: string };
type RawMessage = {
  role?: string;
  content?: string | RawContentBlock[];
};
type RawLine = {
  message?: RawMessage;
  timestamp?: string;
};

function extractText(content: string | RawContentBlock[] | undefined): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  let out = "";
  for (const block of content) {
    if (block && block.type === "text" && typeof block.text === "string") {
      out += block.text;
    }
  }
  return out;
}

export function parseLine(line: string): LogEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let raw: RawLine;
  try {
    raw = JSON.parse(trimmed) as RawLine;
  } catch {
    return null;
  }

  const role = raw.message?.role;
  if (role !== "user" && role !== "assistant") return null;

  const text = extractText(raw.message?.content);
  if (!text) return null;

  const event: LogEvent = { role, text };
  if (typeof raw.timestamp === "string") event.timestamp = raw.timestamp;
  return event;
}

export function parseJsonl(content: string): LogEvent[] {
  const events: LogEvent[] = [];
  for (const line of content.split("\n")) {
    const e = parseLine(line);
    if (e) events.push(e);
  }
  return events;
}
```

- [ ] **Step 3: Run parse tests, confirm still green**

Run: `pnpm test -- parse`
Expected: all 8 cases still pass.

- [ ] **Step 4: Type-check the whole project**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/parse.ts
git commit -m "refactor(parse): extract parseLine; parseJsonl wraps it"
```

---

## Task 2: BUG-001 — skip `isMeta: true` lines

**Files:**
- Modify: `src/parse.ts`
- Test: `src/parse.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/parse.test.ts` inside the `describe("parseJsonl", …)` block:

```typescript
it("skips lines flagged isMeta: true (harness-injected)", () => {
  const content = [
    JSON.stringify({
      isMeta: true,
      message: { role: "user", content: "harness-injected skill body" },
    }),
    JSON.stringify({
      message: { role: "user", content: "human-typed line" },
    }),
  ].join("\n");

  const events = parseJsonl(content);

  expect(events.map((e) => e.text)).toEqual(["human-typed line"]);
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test -- parse`
Expected: FAIL — output contains both `"harness-injected skill body"` and `"human-typed line"`.

- [ ] **Step 3: Implement the filter in `parseLine`**

In `src/parse.ts`, extend `RawLine`:

```typescript
type RawLine = {
  message?: RawMessage;
  timestamp?: string;
  isMeta?: boolean;
};
```

In `parseLine`, immediately after the `JSON.parse(...)` try/catch block, add:

```typescript
  if (raw.isMeta === true) return null;
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test -- parse`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parse.ts src/parse.test.ts
git commit -m "fix(parse): drop isMeta lines (BUG-001 part 1)"
```

---

## Task 3: BUG-001 — strip harness tag bodies from extracted text

**Files:**
- Modify: `src/parse.ts`
- Test: `src/parse.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/parse.test.ts`:

```typescript
it("strips harness tag bodies from extracted text", () => {
  const lines = [
    JSON.stringify({
      message: {
        role: "user",
        content:
          "before <system-reminder>noise inside</system-reminder> after",
      },
    }),
    JSON.stringify({
      message: {
        role: "user",
        content:
          "wrap <command-name>/clear</command-name>" +
          "<command-message>clear</command-message>" +
          "<command-args></command-args> end",
      },
    }),
    JSON.stringify({
      message: {
        role: "user",
        content:
          "out <local-command-stdout>hidden</local-command-stdout>" +
          "<local-command-stderr>also</local-command-stderr> rest",
      },
    }),
    JSON.stringify({
      message: {
        role: "user",
        content: "<system-reminder>only noise</system-reminder>",
      },
    }),
  ].join("\n");

  const events = parseJsonl(lines);
  const texts = events.map((e) => e.text);

  expect(texts).toEqual([
    "before  after",
    "wrap   end",
    "out   rest",
  ]);
  // Fourth line collapses to whitespace after strip → dropped entirely
  expect(texts).toHaveLength(3);
});

it("strips multi-line tag bodies", () => {
  const line = JSON.stringify({
    message: {
      role: "assistant",
      content:
        "alpha\n<system-reminder>\nline1\nline2\n</system-reminder>\nomega",
    },
  });

  const events = parseJsonl(line);
  expect(events[0]?.text).toBe("alpha\n\nomega");
});
```

- [ ] **Step 2: Run tests, verify both fail**

Run: `pnpm test -- parse`
Expected: FAIL — both new cases fail because tag bodies still appear in extracted text.

- [ ] **Step 3: Implement the strip step in `parse.ts`**

Add a module-level constant and a helper above `parseLine`:

```typescript
const HARNESS_TAGS = [
  "system-reminder",
  "command-name",
  "command-message",
  "command-args",
  "local-command-stdout",
  "local-command-stderr",
];
const HARNESS_TAG_RE = new RegExp(
  `<(${HARNESS_TAGS.join("|")})\\b[^>]*>[\\s\\S]*?<\\/\\1>`,
  "g",
);

function stripHarnessTags(text: string): string {
  return text.replace(HARNESS_TAG_RE, "");
}
```

In `parseLine`, replace:

```typescript
  const text = extractText(raw.message?.content);
  if (!text) return null;
```

with:

```typescript
  const rawText = extractText(raw.message?.content);
  const text = stripHarnessTags(rawText);
  if (!text.trim()) return null;
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm test -- parse`
Expected: PASS (all parse cases — original + new).

- [ ] **Step 5: Commit**

```bash
git add src/parse.ts src/parse.test.ts
git commit -m "fix(parse): strip harness tag bodies (BUG-001 part 2)"
```

---

## Task 4: GAP-004 — extract `usage.input_tokens` / `output_tokens`

**Files:**
- Modify: `src/parse.ts`
- Test: `src/parse.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/parse.test.ts`:

```typescript
it("extracts usage.input_tokens / output_tokens when present (GAP-004)", () => {
  const content = JSON.stringify({
    message: {
      role: "assistant",
      content: "hi",
      usage: { input_tokens: 1200, output_tokens: 340 },
    },
  });

  const events = parseJsonl(content);
  expect(events).toEqual([
    { role: "assistant", text: "hi", tokensIn: 1200, tokensOut: 340 },
  ]);
});

it("leaves tokensIn / tokensOut undefined when usage is missing or non-numeric", () => {
  const content = [
    JSON.stringify({ message: { role: "assistant", content: "no-usage" } }),
    JSON.stringify({
      message: {
        role: "assistant",
        content: "bad-usage",
        usage: { input_tokens: "12", output_tokens: null },
      },
    }),
  ].join("\n");

  const events = parseJsonl(content);
  expect(events).toHaveLength(2);
  expect(events[0]).not.toHaveProperty("tokensIn");
  expect(events[0]).not.toHaveProperty("tokensOut");
  expect(events[1]).not.toHaveProperty("tokensIn");
  expect(events[1]).not.toHaveProperty("tokensOut");
});
```

- [ ] **Step 2: Run tests, verify they fail**

Run: `pnpm test -- parse`
Expected: FAIL — `tokensIn`/`tokensOut` not yet extracted.

- [ ] **Step 3: Implement extraction**

In `src/parse.ts`, extend `LogEvent`:

```typescript
export type LogEvent = {
  role: "user" | "assistant";
  text: string;
  timestamp?: string;
  tokensIn?: number;
  tokensOut?: number;
};
```

Extend `RawMessage`:

```typescript
type RawMessage = {
  role?: string;
  content?: string | RawContentBlock[];
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
};
```

In `parseLine`, just before the final `return event;`, add:

```typescript
  const usage = raw.message?.usage;
  if (usage && typeof usage.input_tokens === "number") {
    event.tokensIn = usage.input_tokens;
  }
  if (usage && typeof usage.output_tokens === "number") {
    event.tokensOut = usage.output_tokens;
  }
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `pnpm test -- parse`
Expected: PASS.

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/parse.ts src/parse.test.ts
git commit -m "feat(parse): extract usage token counts (GAP-004)"
```

---

## Task 5: `discoverLogs` returns sized entries

**Files:**
- Modify: `src/discover.ts`
- Create: `src/discover.test.ts`
- Modify: `src/pipeline.ts` (call site fix only — temporary, full refactor in Task 8)

- [ ] **Step 1: Write the failing test**

Create `src/discover.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { discoverLogs, logsRoot } from "./discover.js";

describe("discoverLogs", () => {
  let homeDir: string;
  let prevHome: string | undefined;
  let prevUserProfile: string | undefined;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "okc-disc-"));
    prevHome = process.env.HOME;
    process.env.HOME = homeDir;
    if (process.platform === "win32") {
      prevUserProfile = process.env.USERPROFILE;
      process.env.USERPROFILE = homeDir;
    }
  });

  afterEach(() => {
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (process.platform === "win32") {
      if (prevUserProfile === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = prevUserProfile;
    }
    rmSync(homeDir, { recursive: true, force: true });
  });

  it("returns [] when ~/.claude/projects does not exist", async () => {
    expect(await discoverLogs()).toEqual([]);
  });

  it("returns sorted entries with path and size", async () => {
    const projects = join(homeDir, ".claude", "projects", "sample");
    mkdirSync(projects, { recursive: true });
    writeFileSync(join(projects, "b.jsonl"), "second");
    writeFileSync(join(projects, "a.jsonl"), "first-line");

    const entries = await discoverLogs();
    expect(entries.map((e) => e.path)).toEqual([
      join(projects, "a.jsonl"),
      join(projects, "b.jsonl"),
    ]);
    expect(entries[0]?.size).toBe("first-line".length);
    expect(entries[1]?.size).toBe("second".length);
  });

  it("ignores non-.jsonl files", async () => {
    const projects = join(homeDir, ".claude", "projects");
    mkdirSync(projects, { recursive: true });
    writeFileSync(join(projects, "keep.jsonl"), "yes");
    writeFileSync(join(projects, "skip.txt"), "no");

    const entries = await discoverLogs();
    expect(entries.map((e) => e.path)).toEqual([join(projects, "keep.jsonl")]);
  });

  it("exposes logsRoot under the current home", () => {
    expect(logsRoot()).toContain(".claude");
    expect(logsRoot()).toContain("projects");
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test -- discover`
Expected: FAIL — current `discoverLogs` returns `string[]`, not `{path, size}[]`.

- [ ] **Step 3: Update `src/discover.ts`**

Replace `src/discover.ts`:

```typescript
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type LogFile = { path: string; size: number };

export function logsRoot(): string {
  return join(homedir(), ".claude", "projects");
}

export async function discoverLogs(): Promise<LogFile[]> {
  const root = logsRoot();
  let entries: Awaited<ReturnType<typeof readdir>>;
  try {
    entries = await readdir(root, { recursive: true, withFileTypes: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }

  const paths: string[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith(".jsonl")) continue;
    paths.push(join(e.parentPath, e.name));
  }
  paths.sort();

  const out: LogFile[] = [];
  for (const p of paths) {
    try {
      const s = await stat(p);
      out.push({ path: p, size: s.size });
    } catch {
      // file vanished between readdir and stat — skip
    }
  }
  return out;
}
```

- [ ] **Step 4: Fix the temporary call-site in `pipeline.ts`**

`src/pipeline.ts` currently does `for (const file of files) { await readFile(file, "utf8"); }`. Patch the loop minimally (full refactor lands in Task 8):

Replace:
```typescript
  for (const file of files) {
    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue;
    }
    for (const e of parseJsonl(content)) events.push(e);
  }
```

with:
```typescript
  for (const entry of files) {
    let content: string;
    try {
      content = await readFile(entry.path, "utf8");
    } catch {
      continue;
    }
    for (const e of parseJsonl(content)) events.push(e);
  }
```

Also update the `files.length === 0` short-circuit message — `logsRoot()` still works unchanged.

- [ ] **Step 5: Run all tests**

Run: `pnpm test`
Expected: PASS (discover suite + existing pipeline suite still green via call-site fix).

- [ ] **Step 6: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/discover.ts src/discover.test.ts src/pipeline.ts
git commit -m "feat(discover): return sized log entries via stat"
```

---

## Task 6: `progress.ts` — TTY-gated stderr renderer

**Files:**
- Create: `src/progress.ts`
- Create: `src/progress.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/progress.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createProgress } from "./progress.js";

describe("createProgress", () => {
  let writes: string[];
  let writeSpy: ReturnType<typeof vi.spyOn>;
  let isTTYOriginal: unknown;

  beforeEach(() => {
    writes = [];
    isTTYOriginal = (process.stderr as unknown as { isTTY: unknown }).isTTY;
    writeSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(((chunk: unknown) => {
        writes.push(String(chunk));
        return true;
      }) as typeof process.stderr.write);
  });

  afterEach(() => {
    writeSpy.mockRestore();
    (process.stderr as unknown as { isTTY: unknown }).isTTY = isTTYOriginal;
  });

  it("writes nothing when stderr is not a TTY", () => {
    (process.stderr as unknown as { isTTY: boolean }).isTTY = false;
    const p = createProgress(1000, 2);
    p.tick(500, 1);
    p.tick(1000, 2);
    p.done();
    expect(writes).toEqual([]);
  });

  it("renders bar + percent + file count + MB on TTY", () => {
    (process.stderr as unknown as { isTTY: boolean }).isTTY = true;
    const p = createProgress(2 * 1024 * 1024, 4); // 2 MB total
    p.tick(1024 * 1024, 2); // 1 MB done
    p.done();
    const all = writes.join("");
    expect(all).toMatch(/\[.*\]/);
    expect(all).toContain("50%");
    expect(all).toContain("2 / 4 files");
    expect(all).toMatch(/1\.0 \/ 2\.0 MB/);
  });

  it("throttles redraws to one per ~50 ms but always renders the last tick", async () => {
    (process.stderr as unknown as { isTTY: boolean }).isTTY = true;
    const p = createProgress(100, 3);
    p.tick(10, 1); // first always renders
    p.tick(20, 2); // within throttle window — should NOT render
    await new Promise((r) => setTimeout(r, 60));
    p.tick(100, 3); // after throttle window — renders
    const renderCount = writes.length;
    p.done(); // always renders final clear + newline
    expect(renderCount).toBe(2);
    expect(writes.length).toBe(renderCount + 1);
  });

  it("done() clears the line and emits a newline", () => {
    (process.stderr as unknown as { isTTY: boolean }).isTTY = true;
    const p = createProgress(10, 1);
    p.tick(10, 1);
    p.done();
    const last = writes[writes.length - 1]!;
    expect(last).toContain("\r\x1b[K");
    expect(last.endsWith("\n")).toBe(true);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test -- progress`
Expected: FAIL — `progress.ts` does not exist yet.

- [ ] **Step 3: Implement `src/progress.ts`**

Create `src/progress.ts`:

```typescript
const BAR_WIDTH = 20;
const THROTTLE_MS = 50;

export type Progress = {
  tick(bytesDone: number, fileIdx: number): void;
  done(): void;
};

function formatMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function renderBar(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  const filled = Math.round(clamped * BAR_WIDTH);
  return "█".repeat(filled) + "░".repeat(BAR_WIDTH - filled);
}

export function createProgress(totalBytes: number, fileCount: number): Progress {
  if (!process.stderr.isTTY) {
    return { tick: () => {}, done: () => {} };
  }

  let lastDraw = 0;

  function draw(bytesDone: number, fileIdx: number): void {
    const ratio = totalBytes === 0 ? 1 : bytesDone / totalBytes;
    const pct = Math.round(ratio * 100);
    const line =
      `\r[${renderBar(ratio)}] ${pct}%  ` +
      `${fileIdx} / ${fileCount} files  ·  ` +
      `${formatMB(bytesDone)} / ${formatMB(totalBytes)} MB`;
    process.stderr.write(line);
    lastDraw = Date.now();
  }

  return {
    tick(bytesDone, fileIdx) {
      const now = Date.now();
      if (lastDraw !== 0 && now - lastDraw < THROTTLE_MS) return;
      draw(bytesDone, fileIdx);
    },
    done() {
      process.stderr.write("\r\x1b[K\n");
    },
  };
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm test -- progress`
Expected: PASS (all 4 cases).

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/progress.ts src/progress.test.ts
git commit -m "feat(progress): TTY-gated stderr progress bar"
```

---

## Task 7: `stream.ts` — async iterable of `LogEvent`s

**Files:**
- Create: `src/stream.ts`
- Create: `src/stream.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/stream.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, chmodSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { streamEvents } from "./stream.js";
import type { LogFile } from "./discover.js";

function jsonl(...lines: object[]): string {
  return lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
}

function writeFixture(dir: string, name: string, body: string): LogFile {
  const p = join(dir, name);
  writeFileSync(p, body);
  return { path: p, size: statSync(p).size };
}

describe("streamEvents", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "okc-stream-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("yields events in file-then-line order", async () => {
    const a = writeFixture(
      dir,
      "a.jsonl",
      jsonl(
        { message: { role: "user", content: "first" } },
        { message: { role: "assistant", content: "second" } },
      ),
    );
    const b = writeFixture(
      dir,
      "b.jsonl",
      jsonl({ message: { role: "user", content: "third" } }),
    );

    const events = [];
    for await (const e of streamEvents([a, b], () => {})) events.push(e);

    expect(events.map((e) => e.text)).toEqual(["first", "second", "third"]);
  });

  it("calls onProgress once per file with monotonic bytesDone and fileIdx", async () => {
    const a = writeFixture(
      dir,
      "a.jsonl",
      jsonl({ message: { role: "user", content: "x" } }),
    );
    const b = writeFixture(
      dir,
      "b.jsonl",
      jsonl({ message: { role: "user", content: "y" } }),
    );

    const calls: Array<[number, number]> = [];
    for await (const _ of streamEvents([a, b], (bytes, idx) =>
      calls.push([bytes, idx]),
    )) {
      void _;
    }

    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual([a.size, 1]);
    expect(calls[1]).toEqual([a.size + b.size, 2]);
  });

  it("skips files that fail to open and continues with the rest", async () => {
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation((() => true) as typeof process.stderr.write);

    const good = writeFixture(
      dir,
      "good.jsonl",
      jsonl({ message: { role: "user", content: "kept" } }),
    );
    const ghost: LogFile = { path: join(dir, "ghost.jsonl"), size: 999 };

    const events = [];
    for await (const e of streamEvents([ghost, good], () => {})) events.push(e);

    expect(events.map((e) => e.text)).toEqual(["kept"]);
    expect(stderrSpy).toHaveBeenCalled();
    stderrSpy.mockRestore();
  });

  it("respects parseLine filters (isMeta, empty text)", async () => {
    const f = writeFixture(
      dir,
      "f.jsonl",
      jsonl(
        { isMeta: true, message: { role: "user", content: "drop" } },
        { message: { role: "user", content: "" } },
        { message: { role: "user", content: "real" } },
      ),
    );
    const events = [];
    for await (const e of streamEvents([f], () => {})) events.push(e);
    expect(events.map((e) => e.text)).toEqual(["real"]);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test -- stream`
Expected: FAIL — `stream.ts` not yet created.

- [ ] **Step 3: Implement `src/stream.ts`**

Create `src/stream.ts`:

```typescript
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

import type { LogFile } from "./discover.js";
import { parseLine, type LogEvent } from "./parse.js";

export type ProgressCallback = (bytesDone: number, fileIdx: number) => void;

export async function* streamEvents(
  files: LogFile[],
  onProgress: ProgressCallback,
): AsyncIterable<LogEvent> {
  let bytesDone = 0;

  for (let i = 0; i < files.length; i++) {
    const entry = files[i]!;
    try {
      const rl = createInterface({
        input: createReadStream(entry.path, { encoding: "utf8" }),
        crlfDelay: Infinity,
      });

      for await (const line of rl) {
        const e = parseLine(line);
        if (e) yield e;
      }
    } catch (err) {
      process.stderr.write(
        `ok-claude: skipped ${entry.path}: ${(err as Error).message}\n`,
      );
    }

    bytesDone += entry.size;
    onProgress(bytesDone, i + 1);
  }
}
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm test -- stream`
Expected: PASS (all 4 cases).

- [ ] **Step 5: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/stream.ts src/stream.test.ts
git commit -m "feat(stream): async iterable of LogEvents via readline"
```

---

## Task 8: `pipeline.ts` — streaming fold (drop `events: LogEvent[]`)

**Files:**
- Modify: `src/pipeline.ts`
- Modify: `src/pipeline.test.ts`

- [ ] **Step 1: Write the failing token-sum + memory-shape tests**

Replace the existing `describe("pipeline.run — speaker split", …)` block in `src/pipeline.test.ts` with the version below (keeps existing assertions, adds new ones):

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFile } from "node:fs/promises";

import { run } from "./pipeline.js";

function jsonl(...lines: object[]): string {
  return lines.map((l) => JSON.stringify(l)).join("\n") + "\n";
}

function extractData(html: string): {
  topUser: Array<[string, number]>;
  topClaude: Array<[string, number]>;
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

describe("pipeline.run — speaker split", () => {
  let homeDir: string;
  let outDir: string;
  let prevHome: string | undefined;
  let prevUserProfile: string | undefined;
  let prevCwd: string;

  beforeEach(() => {
    homeDir = mkdtempSync(join(tmpdir(), "okc-home-"));
    outDir = mkdtempSync(join(tmpdir(), "okc-out-"));
    const projects = join(homeDir, ".claude", "projects", "sample");
    mkdirSync(projects, { recursive: true });
    writeFileSync(
      join(projects, "session.jsonl"),
      jsonl(
        {
          message: { role: "user", content: "hello hello world" },
          timestamp: "2026-01-01T00:00:00Z",
        },
        {
          message: {
            role: "assistant",
            content: "absolutely absolutely indeed",
            usage: { input_tokens: 1000, output_tokens: 200 },
          },
          timestamp: "2026-01-01T00:00:01Z",
        },
        {
          message: { role: "user", content: "ok claude ok claude" },
          timestamp: "2026-01-02T00:00:00Z",
        },
        {
          message: {
            role: "assistant",
            content: "more",
            usage: { input_tokens: 500, output_tokens: 50 },
          },
          timestamp: "2026-01-02T00:00:01Z",
        },
      ),
    );
    prevHome = process.env.HOME;
    process.env.HOME = homeDir;
    if (process.platform === "win32") {
      prevUserProfile = process.env.USERPROFILE;
      process.env.USERPROFILE = homeDir;
    }
    prevCwd = process.cwd();
    process.chdir(outDir);
  });

  afterEach(() => {
    process.chdir(prevCwd);
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    if (process.platform === "win32") {
      if (prevUserProfile === undefined) delete process.env.USERPROFILE;
      else process.env.USERPROFILE = prevUserProfile;
    }
    rmSync(homeDir, { recursive: true, force: true });
    rmSync(outDir, { recursive: true, force: true });
  });

  it("partitions tokens by speaker and reports counts + token sums + date range", async () => {
    const result = await run();
    expect(result.outPath).toBeTruthy();
    const html = await readFile(result.outPath!, "utf8");

    const data = extractData(html);
    const userWords = data.topUser.map((p) => p[0]);
    const claudeWords = data.topClaude.map((p) => p[0]);

    expect(userWords).toContain("hello");
    expect(userWords).toContain("claude");
    expect(claudeWords).not.toContain("hello");
    expect(claudeWords).toContain("absolutely");
    expect(claudeWords).toContain("indeed");
    expect(userWords).not.toContain("absolutely");

    expect(data.meta.messages).toBe(4);
    expect(data.meta.tokensIn).toBe(1500);
    expect(data.meta.tokensOut).toBe(250);
    expect(data.meta.dateRange).toEqual([
      "2026-01-01T00:00:00Z",
      "2026-01-02T00:00:01Z",
    ]);
  });

  it("does not buffer all events in memory (regression guard for memory shape)", () => {
    const source = readFileSync(
      new URL("./pipeline.ts", import.meta.url),
      "utf8",
    );
    // No accumulator array of LogEvents and no per-role string join allowed.
    expect(source).not.toMatch(/events:\s*LogEvent\[\]/);
    expect(source).not.toMatch(/events\.push\(/);
    expect(source).not.toMatch(/\.join\("\\n"\)/);
  });
});
```

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test -- pipeline`
Expected: FAIL — `tokensIn`/`tokensOut` not in meta, regression guard fires on the existing `events: LogEvent[]` line.

- [ ] **Step 3: Rewrite `src/pipeline.ts`**

Replace `src/pipeline.ts` with:

```typescript
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { discoverLogs, logsRoot } from "./discover.js";
import { streamEvents } from "./stream.js";
import { tokenize } from "./tokenize.js";
import { topN } from "./aggregate.js";
import { renderHtml } from "./render.js";
import { createProgress } from "./progress.js";

const OUTPUT_FILE = "ok-claude-output.html";
const TOP_N = 100;

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
  let messages = 0;
  let tokensIn = 0;
  let tokensOut = 0;
  let minTs: string | undefined;
  let maxTs: string | undefined;

  for await (const e of streamEvents(files, progress.tick)) {
    const map = e.role === "user" ? userMap : claudeMap;
    for (const tok of tokenize(e.text)) {
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
    },
  });

  const outPath = resolve(process.cwd(), OUTPUT_FILE);
  await writeFile(outPath, html, "utf8");
  return { outPath };
}
```

- [ ] **Step 4: Run, verify FAIL on render side (RenderInput shape mismatch)**

Run: `pnpm exec tsc --noEmit`
Expected: type error — `meta` now contains `tokensIn`/`tokensOut` but `RenderInput["meta"]` does not. This is fixed in Task 9.

- [ ] **Step 5: Temporarily extend `RenderInput` to unblock the pipeline test**

In `src/render.ts`, change:

```typescript
  meta: {
    sessions: number;
    messages: number;
    dateRange: [string, string] | null;
  };
```

to:

```typescript
  meta: {
    sessions: number;
    messages: number;
    tokensIn: number;
    tokensOut: number;
    dateRange: [string, string] | null;
  };
```

(Subhead formatting change lands in Task 9. This minimal type extension is part of this commit so the type-check stays green and the new pipeline test can run.)

Then also patch `src/render.test.ts`'s `input()` helper so existing render tests still build a valid `RenderInput`. Find:

```typescript
    meta: {
      sessions: over.meta?.sessions ?? 1,
      messages: over.meta?.messages ?? 4,
      dateRange: over.meta?.dateRange ?? null,
    },
```

Replace with:

```typescript
    meta: {
      sessions: over.meta?.sessions ?? 1,
      messages: over.meta?.messages ?? 4,
      tokensIn: over.meta?.tokensIn ?? 0,
      tokensOut: over.meta?.tokensOut ?? 0,
      dateRange: over.meta?.dateRange ?? null,
    },
```

Also update any inline `meta: { sessions, messages, dateRange }` literals inside `render.test.ts` to include `tokensIn: 0, tokensOut: 0`.

- [ ] **Step 6: Run all tests**

Run: `pnpm test`
Expected: parse / discover / progress / stream / pipeline suites all pass. Render tests still pass — meta-token fields are accepted by the type but unused in the rendered string yet.

- [ ] **Step 7: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/pipeline.ts src/pipeline.test.ts src/render.ts src/render.test.ts
git commit -m "feat(pipeline): streaming fold with per-role Maps and inline meta"
```

---

## Task 9: Render — tokens segment in subhead (GAP-004 finish)

**Files:**
- Modify: `src/render.ts`
- Modify: `src/render.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/render.test.ts` inside the existing top-level `describe("renderHtml", …)` block (or as a new sibling block):

```typescript
function inputWithTokens(over: Partial<RenderInput["meta"]> = {}): RenderInput {
  return {
    topUser: [["foo", 3]],
    topClaude: [["bar", 2]],
    meta: {
      sessions: 1,
      messages: 4,
      tokensIn: over.tokensIn ?? 0,
      tokensOut: over.tokensOut ?? 0,
      dateRange: over.dateRange ?? null,
    },
  };
}

describe("renderHtml — token subhead (GAP-004)", () => {
  it("includes a formatted token total when tokensIn + tokensOut > 0", () => {
    const html = renderHtml(
      inputWithTokens({ tokensIn: 4_000_000, tokensOut: 200_000 }),
    );
    expect(html).toContain("4.2M tokens");
  });

  it("formats thousands with K suffix", () => {
    const html = renderHtml(
      inputWithTokens({ tokensIn: 12_000, tokensOut: 3_400 }),
    );
    expect(html).toContain("15.4K tokens");
  });

  it("omits the tokens segment when sum is zero (older logs)", () => {
    const html = renderHtml(inputWithTokens({ tokensIn: 0, tokensOut: 0 }));
    expect(html).not.toMatch(/tokens/);
  });
});
```

(The `input()` helper at the top of `render.test.ts` was already updated in Task 8 to include `tokensIn`/`tokensOut`; the helper above adds a separate `inputWithTokens` builder so the new cases stay isolated from the existing assertions.)

- [ ] **Step 2: Run, verify FAIL**

Run: `pnpm test -- render`
Expected: FAIL on the three new cases (tokens segment not yet rendered).

- [ ] **Step 3: Implement subhead tokens in `src/render.ts`**

Add helper above `formatSubhead`:

```typescript
function formatTokens(total: number): string {
  if (total >= 1_000_000) return `${(total / 1_000_000).toFixed(1)}M`;
  if (total >= 1_000) return `${(total / 1_000).toFixed(1)}K`;
  return String(total);
}
```

Replace `formatSubhead` with:

```typescript
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
```

- [ ] **Step 4: Run, verify PASS**

Run: `pnpm test -- render`
Expected: PASS for all render cases (existing + new).

- [ ] **Step 5: Run full test suite**

Run: `pnpm test`
Expected: every suite green.

- [ ] **Step 6: Type-check**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/render.ts src/render.test.ts
git commit -m "feat(render): show real token totals in subhead (GAP-004)"
```

---

## Task 10: End-to-end smoke against real `~/.claude/projects/`

**Files:** none (verification step only)

- [ ] **Step 1: Build the bundle**

Run: `pnpm build`
Expected: `dist/cli.js` + `dist/vendor/wordcloud2.js` present, no build errors.

- [ ] **Step 2: Run against real logs without auto-opening browser**

Run:
```
pnpm exec tsx -e "import('./src/pipeline.ts').then(m => m.run()).then(r => console.log(JSON.stringify(r)))"
```

Expected: progress bar visible on a TTY; final line prints `{"outPath": "<...>/ok-claude-output.html"}`. No `Invalid string length` or OOM error.

- [ ] **Step 3: Open the HTML and inspect "You" tab**

Open `./ok-claude-output.html` in a browser. Confirm:
- "You" tab top words no longer include items that came *exclusively* from harness-injected blocks (`system-reminder`, `local-command-stdout`, etc.).
- Subhead reads `<X.X>M tokens · N sessions · M messages · <date> → <date>` (or omits tokens segment if your logs are old).

If the "You" tab still shows obvious harness vocab, capture the offending JSONL line, compare against the BUG-001 filter set in `src/parse.ts`, and add a follow-up commit extending the tag list. Do NOT proceed to Task 11 until satisfied.

- [ ] **Step 4: Smoke without TTY (pipe-safe check)**

Run:
```
pnpm exec tsx -e "import('./src/pipeline.ts').then(m => m.run()).then(r => console.log(JSON.stringify(r)))" 2>progress.log >result.txt
```

Expected: `progress.log` is empty (non-TTY = no writes). `result.txt` contains the JSON result line.

Delete `progress.log` and `result.txt` after inspection.

```bash
rm -f progress.log result.txt
```

(No commit — verification only.)

---

## Task 11: Doc sync — overview + backlog

**Files:**
- Modify: `docs/overview.md`
- Modify: `docs/backlog.md`

- [ ] **Step 1: Update `docs/overview.md` § Module Index**

Add two rows (alphabetic by path, between existing `parse.ts` and `tokenize.ts`):

```markdown
| `src/progress.ts` | TTY-gated stderr progress bar. `createProgress(totalBytes, fileCount)` returns `{tick, done}`. No-op when stderr is piped — CI-safe. |
| `src/stream.ts` | Side-effect tier. Reads each `.jsonl` via `readline`, yields `LogEvent`s through `parseLine`, fires `onProgress` after each file close. Per-file read errors are logged to stderr; stream continues. |
```

Update the `src/discover.ts` row to mention sized entries:

> `src/discover.ts` | Recursive `readdir` of `~/.claude/projects/` + `stat` per file. Returns sorted `{path, size}[]`. ENOENT → `[]`. |

Update the `src/parse.ts` row to mention BUG-001 + GAP-004:

> `src/parse.ts` | JSONL → `LogEvent`s. Exposes `parseLine(line)` (canonical primitive) and `parseJsonl(content)` (wrapper). Skips `isMeta: true`. Strips harness tag bodies (`<system-reminder>`, `<command-*>`, `<local-command-stdout/stderr>`). Extracts `usage.input_tokens`/`output_tokens` when present. Tolerant: malformed lines, unknown roles, post-strip-empty text → null. |

Update the `src/pipeline.ts` row to drop the events-array language:

> `src/pipeline.ts` | Orchestrator: discover → stream → tokenize-and-fold into per-role frequency Maps → topN → render → write. Accumulates messages, token sums, and min/max timestamp inline. Returns `{outPath}` or `{outPath: null, reason}`. |

Update the `src/render.ts` row to mention tokens subhead:

> `src/render.ts` | HTML template. Inlines vendored `wordcloud2.js` and a single `<canvas>`; emits two tab buttons (You / Claude) with click-driven canvas swap. Per-tab empty-state. Subhead surfaces real token totals (K/M humanized), session + message counts, and date range. JSON-encodes `{topUser, topClaude, meta}` into `window.__DATA__`. |

- [ ] **Step 2: Update `docs/overview.md` § Data Flow**

Replace the entire data-flow ASCII block with:

```
~/.claude/projects/**/*.jsonl
        │
        ▼
discover.ts            (sorted {path, size}[] + totalBytes; ENOENT → [])
        │
        ▼
stream.ts (readline)   ── onProgress(bytesDone, fileIdx) ─▶ progress.ts → stderr (TTY only)
        │
        ▼ (yield LogEvent per line; BUG-001 filters applied inside parseLine)
pipeline.ts fold       userMap[token]++ / claudeMap[token]++
                       meta.messages++ ; meta.tokensIn / tokensOut += usage
                       meta.minTs / maxTs from event timestamps
        │
        ▼
topN(userMap, 100)     topN(claudeMap, 100)
        │
        ▼
render.ts              (inlines vendor + both topN + meta → self-contained HTML)
        │
        ▼
./ok-claude-output.html   →   open(outPath)
```

Append a sentence after the diagram noting the new memory shape:

> Memory ceiling under streaming = vocab `Map` size (bounded by unique tokens) plus a single in-flight line buffer. No whole-corpus arrays, no per-role joined strings — F3 ships the all-time scope (Non-Negotiable #4) without hitting the V8 `String` length cap.

- [ ] **Step 3: Update `docs/backlog.md`**

Delete the `BUG-001` block (lines 35–45 of the file as of `102ccb7`) and the `GAP-004` block (lines 47–53). The git history is the archive per `CLAUDE.md` § Doc Sync.

In the roadmap table, change the F3 row from:

```
| F3 | `stream-and-progress` | Stream tokenize + terminal progress bar (no flags) | All-time scope (overview Non-Negotiable #4) demands streaming to dodge V8 string ceiling; progress bar covers parse latency on heavy histories. |
```

to:

```
| F3 | `stream-and-progress` | Stream tokenize + terminal progress bar (no flags) | Shipped. Streaming pipeline + per-role Map fold (no whole-corpus arrays). TTY-gated stderr progress bar. Bundled BUG-001 (harness vocab filter) + GAP-004 (real token totals in subhead). |
```

- [ ] **Step 4: Commit doc sync**

```bash
git add docs/overview.md docs/backlog.md
git commit -m "docs(F3): sync module index, data flow, backlog after stream + progress ship"
```

---

## Task 12: Delete temporal spec + plan

**Files:**
- Delete: `docs/superpowers/specs/2026-05-14-stream-and-progress-design.md`
- Delete: `docs/superpowers/plans/2026-05-14-stream-and-progress.md`

- [ ] **Step 1: Delete the temporal files**

```bash
rm docs/superpowers/specs/2026-05-14-stream-and-progress-design.md
rm docs/superpowers/plans/2026-05-14-stream-and-progress.md
```

- [ ] **Step 2: Confirm only temporal files are staged**

```bash
git status
```

Expected: only the two deletions, nothing else.

- [ ] **Step 3: Commit**

```bash
git add -A docs/superpowers/specs docs/superpowers/plans
git commit -m "docs(F3): drop temporal spec + plan — F3 shipped"
```

---

## Acceptance (final check before declaring F3 done)

- [ ] `pnpm test` is green (parse / discover / progress / stream / pipeline / render / tokenize / aggregate).
- [ ] `pnpm exec tsc --noEmit` is clean.
- [ ] `pnpm build` produces `dist/cli.js` + `dist/vendor/wordcloud2.js`.
- [ ] Task 10 smoke confirmed: progress bar on TTY, silent on non-TTY, no OOM, "You" tab free of harness-only vocab.
- [ ] `docs/backlog.md` no longer lists BUG-001 or GAP-004.
- [ ] Temporal spec + plan files removed.
- [ ] All Non-Negotiables (zero flags, zero install, one-shot one-file, all-time scope, mechanical, two tabs, meme energy) still hold.
