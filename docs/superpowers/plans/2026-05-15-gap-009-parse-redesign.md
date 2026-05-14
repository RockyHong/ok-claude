# GAP-009 — Schema-Driven Parse Redesign + Vocab Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert `parseLine` from an implicit role-failure filter into an explicit schema-driven prose gate (type-whitelist + flag gates per `docs/cc-log-schema.md`), back the gates with line-type fixture tests, then run wet-run vocab contracts against `~/.claude/projects/` and apply targeted mechanism fixes (paste-denoise extension, short-Latin whitelist, rarity weighting) only for the contracts that still fail after the parse fix lands.

**Architecture:**

1. **Parse redesign** (`src/parse.ts`): replace the ad-hoc `if` ladder with a typed `RawLine` schema and a single drop switch keyed by a stable reason string. Order = type-whitelist → flag gates → content extraction (per `cc-log-schema.md` § Recommended prose-gating filter).
2. **Fixture tests** (`src/parse.test.ts`): one fixture per line-type from the schema doc's anonymized samples + one synthetic forward-compat case (`type: "summary"`).
3. **Wet-run vocab contracts** (`scripts/vocab-contracts.ts`, new): runnable script that builds the full pipeline output from `~/.claude/projects/` and asserts pass/fail per token-rank contract (NEVER ≤5 + outside top-100, RARELY outside top-50, FREQUENT inside top-100). Reports a structured table, exits non-zero on any failure. Not a CI test — depends on local user data.
4. **Mechanism picks** (TDD per failing contract): only the mechanisms whose contracts still fail post-parse-fix get implemented. Each mechanism is its own TDD cycle in its own module.

**Tech Stack:** Node 20+, TypeScript, vitest (unit), tsx (script runner). No new deps.

---

## Baseline (Task 7 result)

Audit captured against `~/.claude/projects/` (416 files, 312.3 MB) after Tasks 1–6 landed (commits `1f777ad`, `9154904`, `8ed85dc`, `2b3494a`, `af78a78`, `19dd47d`). Full output: `tmp/audit-after-parse-fix.txt`.

Post-fix corpus: 3,175 user msgs / 7,924 claude msgs; 7,337 unique user tokens / 14,459 claude tokens.

**NEVER contracts (target: count ≤5 AND outside top-100):**

| Token | Post-fix count / rank | Verdict |
|---|---|---|
| `mono` | 406 / #11 | FAIL |
| `jit` | 313 / #20 | FAIL |
| `null` | 266 / #25 | FAIL |
| `program` | 158 / #62 | FAIL |
| `gradle` | 145 / #67 | FAIL |
| `android` | 131 / #83 | FAIL |
| `bool` | 129 / #84 | FAIL |
| `object` | 125 / #89 | FAIL |
| `src` | 115 / #97 | FAIL |

**0/9 PASS.** Sidechain drop barely budged these — the residue is main-convo non-fenced paste blocks. Task 10 (paste-denoise extension) is the right tool.

**RARELY contracts (target: outside top-50):**

| Token | Rank | Verdict |
|---|---|---|
| `date` | #15 | FAIL |
| `unity` | #17 | FAIL |
| `then` | #53 | PASS |
| `library` | #98 | PASS |

**2/4 PASS.** `date` and `unity` survive in main-convo prose — `unity` likely from the same paste-class as the Unity/Android stack traces driving the NEVER tokens, so Task 10 should help both.

**FREQUENT contracts (target: inside top-100):**

| Token | Rank | Verdict |
|---|---|---|
| `y` | — (dropped pre-aggregate) | FAIL |
| `n` | — (dropped pre-aggregate) | FAIL |
| `k` | — (dropped pre-aggregate) | FAIL |
| `wth` | outside top-100 | FAIL |
| `soc` | outside top-100 | FAIL |

**0/5 PASS.** y/n/k need Task 11 (short-Latin whitelist). wth/soc need Task 12 (rarity weighting) or the simpler alternative (bump top-N).

**Mechanism gate provisional read:** all three (Tasks 10, 11, 12) live. Final decision happens at Task 9 after the `scripts/vocab-contracts.ts` runner exists in Task 8.

---

## Mechanism gate (Task 9 result)

`scripts/vocab-contracts.ts` first run captured at `tmp/vocab-contracts-before-mechanisms.txt`. 18 contracts, 2 PASS, 16 FAIL.

| Contract | Status | Notes |
|---|---|---|
| never:mono | FAIL | count=406 rank=11 — main-convo paste residue |
| never:jit | FAIL | count=313 rank=20 — same |
| never:null | FAIL | count=266 rank=25 — TS lint / NullRef pastes |
| never:program | FAIL | count=158 rank=60 — C# Program.cs stack frames |
| never:gradle | FAIL | count=145 rank=65 — Android build log paste |
| never:android | FAIL | count=131 rank=81 — Android build log paste |
| never:bool | FAIL | count=129 rank=82 — TS type-error paste |
| never:object | FAIL | count=125 rank=87 — TS type-error paste |
| never:src | FAIL | count=115 rank=95 — path fragments in stack traces |
| rarely:date | FAIL | rank=15 |
| rarely:unity | FAIL | rank=17 — likely paste-driven, same class as NEVER |
| rarely:then | PASS | rank=51 |
| rarely:library | PASS | rank=96 |
| frequent:y | FAIL | count=0 — single-char Latin drop pre-aggregate |
| frequent:n | FAIL | count=0 — same |
| frequent:k | FAIL | count=0 — same |
| frequent:wth | FAIL | count=30 rank=479 — absolute-frequency ranking buries low-count meme |
| frequent:soc | FAIL | count=83 rank=168 — same |

**Mechanism tasks to run:**

- [x] Task 10 (paste-denoise) — 9 NEVER + 2 RARELY contracts (date, unity) all point at non-fenced stack-trace / type-error blocks in main-convo prose. Strongest signal in this gate.
- [x] Task 11 (short-Latin whitelist) — y / n / k contracts fail because tokenize.ts drops them pre-aggregate. Surgical fix.
- [x] Task 12 (rarity weighting) — wth / soc exist but rank outside top-100. Task 12 confer step (A vs B) remains live in Task 12 § Step 1 — decision deferred to that point.

No mechanism tasks skipped. Proceed to Task 10.

**Observation:** The post-fix counts for `mono` / `jit` / `null` / `date` / `unity` are essentially unchanged from the pre-fix numbers documented in `docs/backlog.md` GAP-009 § C. This means those tokens were already living in main-convo prose, not in subagent dispatches. Sidechain drop did important work elsewhere (removing 45% of conversational lines from LLM-to-LLM dispatch noise), just not on these specific tokens. Validates the "carry-over GAP-007 paste-denoise" hypothesis.

---

## File Structure

**Modified:**

- `src/parse.ts` — gate refactor + new fields on `RawLine` (`type`, `isSidechain`, `isApiErrorMessage`, `isVisibleInTranscriptOnly`). Export `DropReason` type for fixture assertions if a probe variant is added; otherwise keep public surface = `parseLine` / `parseJsonl`.
- `src/parse.test.ts` — append fixture tests (one per line-type), keep existing tests.
- `src/tokenize.ts` — possibly extend single-char drop with a short-Latin whitelist (mechanism C2 below).
- `src/denoise.ts` — possibly extend with non-fenced paste-denoise (mechanism C1 below).
- `src/aggregate.ts` — possibly add a rarity/per-session weighting variant (mechanism C3 below).

**Created:**

- `scripts/vocab-contracts.ts` — wet-run contract runner; gitignored not required (matches `scripts/audit.ts` precedent — both are debug runners committed but excluded from package).

**Untouched:**

- `src/discover.ts` — subagent path filter still correct per schema doc.
- `src/pipeline.ts` — composition unchanged; gates land inside `parseLine`.
- `src/stream.ts`, `src/render.ts`, `src/cli.ts` — no surface change.

---

## Task 1: Add type-whitelist gate (TDD)

**Files:**

- Modify: `src/parse.ts`
- Test: `src/parse.test.ts`

The current `parseLine` drops non-prose line types only because they lack `message.role`. Make the gate explicit on top-level `type`. Per the schema doc, exactly two values keep: `"user"` and `"assistant"`.

- [ ] **Step 1: Write the failing tests**

Append to `src/parse.test.ts` inside the existing `describe("parseJsonl", ...)` block:

```ts
it("drops non-prose line types via type-whitelist (system, attachment, progress, last-prompt, file-history-snapshot, permission-mode, ai-title, queue-operation, custom-title, agent-name)", () => {
  const dropTypes = [
    "system",
    "attachment",
    "progress",
    "last-prompt",
    "file-history-snapshot",
    "permission-mode",
    "ai-title",
    "queue-operation",
    "custom-title",
    "agent-name",
  ];
  const lines = dropTypes.map((t) =>
    JSON.stringify({
      type: t,
      message: { role: "user", content: "should be dropped" },
    }),
  );
  lines.push(
    JSON.stringify({
      type: "user",
      message: { role: "user", content: "kept" },
    }),
  );

  const events = parseJsonl(lines.join("\n"));

  expect(events.map((e) => e.text)).toEqual(["kept"]);
});

it("drops legacy compact-summary line (type: \"summary\") for forward-compat", () => {
  const content = [
    JSON.stringify({
      type: "summary",
      summary: "old-style compact",
      leafUuid: "x",
    }),
    JSON.stringify({
      type: "user",
      message: { role: "user", content: "kept" },
    }),
  ].join("\n");

  expect(parseJsonl(content).map((e) => e.text)).toEqual(["kept"]);
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm test -- parse.test.ts`

Expected: the two new tests FAIL. The first probably partly passes (most types drop anyway because their `message.role` is missing or non-prose), but `system` lines that carry `message: { role: "user", content: ... }` (synthetic in the test) would currently leak — and the `summary` case definitely leaks.

- [ ] **Step 3: Add type-whitelist gate**

Edit `src/parse.ts`. Add `type` to `RawLine`, and gate as the first check after JSON parse:

```ts
type RawLine = {
  type?: string;
  message?: RawMessage;
  timestamp?: string;
  isMeta?: boolean;
  isCompactSummary?: boolean;
};

const PROSE_TYPES = new Set(["user", "assistant"]);

export function parseLine(line: string): LogEvent | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let raw: RawLine;
  try {
    raw = JSON.parse(trimmed) as RawLine;
  } catch {
    return null;
  }

  if (raw.type !== undefined && !PROSE_TYPES.has(raw.type)) return null;

  if (raw.isMeta === true) return null;
  if (raw.isCompactSummary === true) return null;
  // ...rest unchanged for now
```

Note: `raw.type !== undefined && !PROSE_TYPES.has(raw.type)` — the guard tolerates legacy lines without a `type` field (none observed in our corpus, but keep parse forgiving for unknown shapes). The downstream `role` whitelist still catches anything that slips past.

- [ ] **Step 4: Run tests and verify they pass**

Run: `pnpm test -- parse.test.ts`

Expected: all parse tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parse.ts src/parse.test.ts
git commit -m "feat(parse): add explicit type-whitelist gate (GAP-009 A1)

Replaces implicit role-failure drop with explicit type ∈ {user,assistant}
gate per docs/cc-log-schema.md § Recommended prose-gating filter. Covers
10 observed non-prose types + legacy summary type for forward-compat."
```

---

## Task 2: Add isSidechain gate (TDD)

**Files:**

- Modify: `src/parse.ts`
- Test: `src/parse.test.ts`

`isSidechain: true` covers inline subagent dispatch prose — 45% of user lines, 44% of assistant lines in the schema probe. Single biggest remaining leak.

- [ ] **Step 1: Write the failing test**

Append to `src/parse.test.ts`:

```ts
it("drops lines flagged isSidechain: true (inline subagent dispatch — GAP-009)", () => {
  const content = [
    JSON.stringify({
      type: "user",
      isSidechain: true,
      message: { role: "user", content: "subagent dispatch prose" },
    }),
    JSON.stringify({
      type: "assistant",
      isSidechain: true,
      message: {
        role: "assistant",
        content: [{ type: "text", text: "subagent reply prose" }],
      },
    }),
    JSON.stringify({
      type: "user",
      isSidechain: false,
      message: { role: "user", content: "human typed" },
    }),
  ].join("\n");

  expect(parseJsonl(content).map((e) => e.text)).toEqual(["human typed"]);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run: `pnpm test -- parse.test.ts -t "isSidechain"`

Expected: FAIL — currently the sidechain lines are kept because no flag gate exists.

- [ ] **Step 3: Add the gate**

Edit `src/parse.ts`. Add `isSidechain` to `RawLine`, add gate beside `isMeta`:

```ts
type RawLine = {
  type?: string;
  message?: RawMessage;
  timestamp?: string;
  isMeta?: boolean;
  isCompactSummary?: boolean;
  isSidechain?: boolean;
};
```

```ts
  if (raw.isMeta === true) return null;
  if (raw.isSidechain === true) return null;
  if (raw.isCompactSummary === true) return null;
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `pnpm test -- parse.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parse.ts src/parse.test.ts
git commit -m "feat(parse): drop isSidechain lines (GAP-009 A2)

Inline subagent dispatch prose was leaking ~45% of conversational
lines into the wordcloud. Per docs/cc-log-schema.md § Boolean flags
this is LLM-to-LLM traffic, not human typing."
```

---

## Task 3: Add isApiErrorMessage gate (TDD)

**Files:**

- Modify: `src/parse.ts`
- Test: `src/parse.test.ts`

Small leak (50 lines in the corpus) but every one is a synthetic 429/529 stub — content is bot-emitted apology text, not assistant reply.

- [ ] **Step 1: Write the failing test**

```ts
it("drops assistant lines flagged isApiErrorMessage: true (rate-limit stubs — GAP-009)", () => {
  const content = [
    JSON.stringify({
      type: "assistant",
      isApiErrorMessage: true,
      error: "rate_limit",
      apiErrorStatus: 429,
      message: {
        role: "assistant",
        content: [{ type: "text", text: "rate limit hit" }],
      },
    }),
    JSON.stringify({
      type: "assistant",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "real reply" }],
      },
    }),
  ].join("\n");

  expect(parseJsonl(content).map((e) => e.text)).toEqual(["real reply"]);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run: `pnpm test -- parse.test.ts -t "isApiErrorMessage"`

Expected: FAIL.

- [ ] **Step 3: Add the gate**

Edit `src/parse.ts`. Extend `RawLine` and add gate:

```ts
type RawLine = {
  type?: string;
  message?: RawMessage;
  timestamp?: string;
  isMeta?: boolean;
  isCompactSummary?: boolean;
  isSidechain?: boolean;
  isApiErrorMessage?: boolean;
};
```

```ts
  if (raw.isMeta === true) return null;
  if (raw.isSidechain === true) return null;
  if (raw.isApiErrorMessage === true) return null;
  if (raw.isCompactSummary === true) return null;
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `pnpm test -- parse.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parse.ts src/parse.test.ts
git commit -m "feat(parse): drop isApiErrorMessage assistant stubs (GAP-009 A3)"
```

---

## Task 4: Add isVisibleInTranscriptOnly redundant gate (TDD)

**Files:**

- Modify: `src/parse.ts`
- Test: `src/parse.test.ts`

Always co-occurs with `isCompactSummary` in our corpus (88/88). Add as belt-and-suspenders against version drift — keeps the prose gate honest if Anthropic ever decouples the two.

- [ ] **Step 1: Write the failing test**

```ts
it("drops lines flagged isVisibleInTranscriptOnly: true even without isCompactSummary (forward-compat)", () => {
  const content = [
    JSON.stringify({
      type: "user",
      isVisibleInTranscriptOnly: true,
      message: { role: "user", content: "transcript-only synthetic line" },
    }),
    JSON.stringify({
      type: "user",
      message: { role: "user", content: "real user line" },
    }),
  ].join("\n");

  expect(parseJsonl(content).map((e) => e.text)).toEqual(["real user line"]);
});
```

- [ ] **Step 2: Run test and verify it fails**

Run: `pnpm test -- parse.test.ts -t "isVisibleInTranscriptOnly"`

Expected: FAIL.

- [ ] **Step 3: Add the gate**

Edit `src/parse.ts`:

```ts
type RawLine = {
  type?: string;
  message?: RawMessage;
  timestamp?: string;
  isMeta?: boolean;
  isCompactSummary?: boolean;
  isSidechain?: boolean;
  isApiErrorMessage?: boolean;
  isVisibleInTranscriptOnly?: boolean;
};
```

```ts
  if (raw.isMeta === true) return null;
  if (raw.isSidechain === true) return null;
  if (raw.isApiErrorMessage === true) return null;
  if (raw.isCompactSummary === true) return null;
  if (raw.isVisibleInTranscriptOnly === true) return null;
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `pnpm test -- parse.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/parse.ts src/parse.test.ts
git commit -m "feat(parse): drop isVisibleInTranscriptOnly belt-and-suspenders (GAP-009 A4)"
```

---

## Task 5: Anonymized-sample fixture tests (line-type contracts)

**Files:**

- Test: `src/parse.test.ts`

Convert the 12 anonymized samples in `docs/cc-log-schema.md` § "Anonymized samples" into a fixture table. One assertion per case. This locks the schema contract: any future change to `parseLine` must keep these 12 contracts green.

- [ ] **Step 1: Write the fixture-table test**

Append to `src/parse.test.ts`:

```ts
describe("parseJsonl — cc-log-schema § Anonymized samples (GAP-009 B)", () => {
  type Fixture = {
    name: string;
    line: Record<string, unknown>;
    kept: boolean;
    expectedText?: string;
  };

  const fixtures: Fixture[] = [
    {
      name: "user-plain",
      line: {
        type: "user",
        isSidechain: false,
        message: { role: "user", content: "hello prompt" },
      },
      kept: true,
      expectedText: "hello prompt",
    },
    {
      name: "user-meta (isMeta)",
      line: {
        type: "user",
        isSidechain: false,
        isMeta: true,
        message: { role: "user", content: "meta payload" },
      },
      kept: false,
    },
    {
      name: "user-compactSummary",
      line: {
        type: "user",
        isSidechain: false,
        isCompactSummary: true,
        isVisibleInTranscriptOnly: true,
        message: { role: "user", content: "summary payload" },
      },
      kept: false,
    },
    {
      name: "user-sidechain (was leaking)",
      line: {
        type: "user",
        isSidechain: true,
        message: { role: "user", content: "subagent prompt" },
      },
      kept: false,
    },
    {
      name: "user-toolResult (no text block)",
      line: {
        type: "user",
        isSidechain: false,
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tu",
              content: [{ type: "tool_reference", tool_name: "WebSearch" }],
            },
          ],
        },
      },
      kept: false,
    },
    {
      name: "assistant-plain",
      line: {
        type: "assistant",
        isSidechain: false,
        message: {
          role: "assistant",
          content: [{ type: "text", text: "reply" }],
        },
      },
      kept: true,
      expectedText: "reply",
    },
    {
      name: "assistant-sidechain (was leaking)",
      line: {
        type: "assistant",
        isSidechain: true,
        message: {
          role: "assistant",
          content: [{ type: "text", text: "subagent reply" }],
        },
      },
      kept: false,
    },
    {
      name: "assistant-apiError (was leaking)",
      line: {
        type: "assistant",
        isSidechain: false,
        isApiErrorMessage: true,
        error: "rate_limit",
        apiErrorStatus: 429,
        message: {
          role: "assistant",
          content: [{ type: "text", text: "rate-limited" }],
        },
      },
      kept: false,
    },
    {
      name: "system",
      line: {
        type: "system",
        subtype: "compact_boundary",
        content: "Conversation compacted",
      },
      kept: false,
    },
    {
      name: "attachment",
      line: {
        type: "attachment",
        attachment: { type: "hook_success", hookName: "SessionStart:startup" },
      },
      kept: false,
    },
    {
      name: "progress",
      line: { type: "progress", content: "subagent progress" },
      kept: false,
    },
    {
      name: "last-prompt",
      line: { type: "last-prompt", lastPrompt: "cached prompt" },
      kept: false,
    },
    {
      name: "ai-title",
      line: { type: "ai-title", aiTitle: "Session Title" },
      kept: false,
    },
    {
      name: "file-history-snapshot",
      line: {
        type: "file-history-snapshot",
        messageId: "x",
        snapshot: { trackedFileBackups: {} },
      },
      kept: false,
    },
    {
      name: "permission-mode",
      line: { type: "permission-mode", permissionMode: "auto" },
      kept: false,
    },
    {
      name: "queue-operation",
      line: {
        type: "queue-operation",
        operation: "enqueue",
        content: "queued",
      },
      kept: false,
    },
    {
      name: "custom-title",
      line: { type: "custom-title", customTitle: "Renamed" },
      kept: false,
    },
    {
      name: "agent-name",
      line: { type: "agent-name", agentName: "named-agent" },
      kept: false,
    },
    {
      name: "legacy summary (forward-compat)",
      line: { type: "summary", summary: "legacy", leafUuid: "y" },
      kept: false,
    },
  ];

  for (const fx of fixtures) {
    it(`${fx.kept ? "keeps" : "drops"} ${fx.name}`, () => {
      const events = parseJsonl(JSON.stringify(fx.line));
      if (fx.kept) {
        expect(events).toHaveLength(1);
        expect(events[0]?.text).toBe(fx.expectedText);
      } else {
        expect(events).toEqual([]);
      }
    });
  }
});
```

- [ ] **Step 2: Run tests and verify they all pass**

Run: `pnpm test -- parse.test.ts`

Expected: all fixture tests PASS (Tasks 1–4 already implemented the gates). If any fail, that's a real gap — investigate before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/parse.test.ts
git commit -m "test(parse): lock 19 line-type contracts from cc-log-schema (GAP-009 B)

Fixture table covers every observed line type plus forward-compat
legacy summary. Locks the schema-driven gates so future parse changes
stay aligned with docs/cc-log-schema.md § Anonymized samples."
```

---

## Task 6: Refactor parseLine to reason-keyed drop switch

**Files:**

- Modify: `src/parse.ts`

After Tasks 1–4, `parseLine` has a tower of `if (... === true) return null;`. Replace with a single switch keyed by reason string so failures are debuggable later (a future `parseLineProbe` can return the reason without changing public API).

- [ ] **Step 1: Refactor**

Edit `src/parse.ts`. Replace the gate ladder with a `dropReason` helper:

```ts
type RawContentBlock = { type?: string; text?: string };
type RawMessage = {
  role?: string;
  content?: string | RawContentBlock[];
  usage?: { input_tokens?: unknown; output_tokens?: unknown };
};
type RawLine = {
  type?: string;
  message?: RawMessage;
  timestamp?: string;
  isMeta?: boolean;
  isCompactSummary?: boolean;
  isSidechain?: boolean;
  isApiErrorMessage?: boolean;
  isVisibleInTranscriptOnly?: boolean;
};

const PROSE_TYPES = new Set(["user", "assistant"]);

type DropReason =
  | "non-prose-type"
  | "isMeta"
  | "isSidechain"
  | "isApiErrorMessage"
  | "isCompactSummary"
  | "isVisibleInTranscriptOnly"
  | "non-prose-role"
  | "empty-text";

function dropReason(raw: RawLine): DropReason | null {
  if (raw.type !== undefined && !PROSE_TYPES.has(raw.type)) return "non-prose-type";
  if (raw.isMeta === true) return "isMeta";
  if (raw.isSidechain === true) return "isSidechain";
  if (raw.isApiErrorMessage === true) return "isApiErrorMessage";
  if (raw.isCompactSummary === true) return "isCompactSummary";
  if (raw.isVisibleInTranscriptOnly === true) return "isVisibleInTranscriptOnly";
  const role = raw.message?.role;
  if (role !== "user" && role !== "assistant") return "non-prose-role";
  return null;
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

  if (dropReason(raw) !== null) return null;

  const role = raw.message!.role as "user" | "assistant";
  const rawText = extractText(raw.message?.content);
  const text = stripHarnessTags(rawText);
  if (!text.trim()) return null;

  const event: LogEvent = { role, text };
  if (typeof raw.timestamp === "string") event.timestamp = raw.timestamp;

  const usage = raw.message?.usage;
  if (usage && typeof usage.input_tokens === "number") {
    event.tokensIn = usage.input_tokens;
  }
  if (usage && typeof usage.output_tokens === "number") {
    event.tokensOut = usage.output_tokens;
  }
  return event;
}
```

Note: `dropReason` stays module-private — no public surface change. If you ever want a probe API (e.g. `parseLineDiag` returning the reason for debugging audit drift), wire that up *only* when there's a concrete consumer; YAGNI for now.

- [ ] **Step 2: Run full test suite**

Run: `pnpm test`

Expected: all tests PASS (parse, denoise, tokenize, aggregate, stream, render, pipeline, discover, progress).

- [ ] **Step 3: Run type-check**

Run: `pnpm exec tsc --noEmit`

Expected: clean (no `any`, no implicit `any`).

- [ ] **Step 4: Commit**

```bash
git add src/parse.ts
git commit -m "refactor(parse): consolidate drop gates into reason switch (GAP-009 A5)"
```

---

## Task 7: Wet-run baseline audit (post-parse-fix)

**Files:**

- Run: `scripts/audit.ts` (unchanged)

Before designing vocab-contract mechanisms, capture the *actual* top-100 after parse fixes land. Some of the NEVER tokens listed in the backlog may already vanish purely from the sidechain drop (subagent stack-trace dispatches were the primary source for `mono` / `jit` / `gradle` / `android` / `program`).

- [ ] **Step 1: Run the audit script and capture output**

Run: `pnpm exec tsx scripts/audit.ts 100 > tmp/audit-after-parse-fix.txt`

(create `tmp/` if it doesn't exist; ensure `tmp/` is in `.gitignore` — confirm before redirecting)

Check `.gitignore`:

```bash
cat .gitignore
```

If `tmp/` not present, append:

```bash
echo "tmp/" >> .gitignore
```

- [ ] **Step 2: Review the audit output against the GAP-009 § C contracts**

Open `tmp/audit-after-parse-fix.txt`. For each contract in the backlog table, note:

- **NEVER tokens** (mono, jit, null, program, gradle, android, bool, object, src): count + rank. Pass if count ≤5 AND not in top-100.
- **RARELY tokens** (date, unity, then, library): rank. Pass if outside top-50.
- **FREQUENT tokens** (y, n, k, wth, soc): count + rank. Pass if inside top-100.

Don't write code yet. Write a short summary as a top comment in `docs/superpowers/plans/2026-05-15-gap-009-parse-redesign.md` (this file), under a new "## Baseline (Task 7 result)" section, listing which contracts pass / fail.

- [ ] **Step 3: Commit the baseline note**

```bash
git add docs/superpowers/plans/2026-05-15-gap-009-parse-redesign.md
git commit -m "docs(plan): capture GAP-009 post-parse-fix baseline (Task 7)"
```

---

## Task 8: Build the vocab-contracts runnable script

**Files:**

- Create: `scripts/vocab-contracts.ts`

A reusable wet-run runner that reports pass/fail per token-rank contract. Mirrors `scripts/audit.ts` structure but is goal-oriented — for each named contract, look up the token's rank and count in the user top-N and print a pass/fail line. Exits non-zero on any fail.

This is *not* a vitest test — it depends on the user's `~/.claude/projects/` and is exploratory. Treat it as a regression harness used during Tasks 9–N below.

- [ ] **Step 1: Write the script**

Create `scripts/vocab-contracts.ts`:

```ts
// Wet-run vocab contract check: full pipeline against ~/.claude/projects/.
// Asserts top-N rank / count contracts from docs/backlog.md GAP-009 § C.
// Not a CI test — depends on local logs. Exits non-zero on any failure.
//
// Usage:  pnpm exec tsx scripts/vocab-contracts.ts
//         pnpm exec tsx scripts/vocab-contracts.ts --top 100

import { readdirSync, statSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, sep } from "node:path";

import { parseLine } from "../src/parse.js";
import { denoiseMarkdown } from "../src/denoise.js";
import { tokenize } from "../src/tokenize.js";

const SUBAGENT_SEG = `${sep}subagents${sep}`;

type Contract =
  | { kind: "never"; token: string; maxCount: number; outsideTop: number }
  | { kind: "rarely"; token: string; outsideTop: number }
  | { kind: "frequent"; token: string; insideTop: number };

const CONTRACTS: Contract[] = [
  // NEVER — user says they never type these
  { kind: "never", token: "mono", maxCount: 5, outsideTop: 100 },
  { kind: "never", token: "jit", maxCount: 5, outsideTop: 100 },
  { kind: "never", token: "null", maxCount: 5, outsideTop: 100 },
  { kind: "never", token: "program", maxCount: 5, outsideTop: 100 },
  { kind: "never", token: "gradle", maxCount: 5, outsideTop: 100 },
  { kind: "never", token: "android", maxCount: 5, outsideTop: 100 },
  { kind: "never", token: "bool", maxCount: 5, outsideTop: 100 },
  { kind: "never", token: "object", maxCount: 5, outsideTop: 100 },
  { kind: "never", token: "src", maxCount: 5, outsideTop: 100 },
  // RARELY — must fall outside top-50
  { kind: "rarely", token: "date", outsideTop: 50 },
  { kind: "rarely", token: "unity", outsideTop: 50 },
  { kind: "rarely", token: "then", outsideTop: 50 },
  { kind: "rarely", token: "library", outsideTop: 50 },
  // FREQUENT — must appear inside top-100
  { kind: "frequent", token: "y", insideTop: 100 },
  { kind: "frequent", token: "n", insideTop: 100 },
  { kind: "frequent", token: "k", insideTop: 100 },
  { kind: "frequent", token: "wth", insideTop: 100 },
  { kind: "frequent", token: "soc", insideTop: 100 },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      if (full.includes(SUBAGENT_SEG)) continue;
      out.push(full);
    }
  }
  return out;
}

const root = join(homedir(), ".claude", "projects");
const files = walk(root);
let totalBytes = 0;
for (const f of files) totalBytes += statSync(f).size;
process.stderr.write(
  `vocab-contracts: ${files.length} files, ${(totalBytes / 1e6).toFixed(1)} MB\n`,
);

const userMap = new Map<string, number>();
for (const f of files) {
  const content = readFileSync(f, "utf8");
  for (const line of content.split("\n")) {
    const e = parseLine(line);
    if (!e || e.role !== "user") continue;
    for (const tok of tokenize(denoiseMarkdown(e.text))) {
      userMap.set(tok, (userMap.get(tok) ?? 0) + 1);
    }
  }
}

const ranked: Array<[string, number]> = [...userMap.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
);
const rank = new Map<string, number>();
for (let i = 0; i < ranked.length; i++) rank.set(ranked[i]![0], i + 1);

let failures = 0;
for (const c of CONTRACTS) {
  const count = userMap.get(c.token) ?? 0;
  const r = rank.get(c.token); // undefined if token never appeared
  let ok = false;
  let detail = "";

  if (c.kind === "never") {
    const outside = r === undefined || r > c.outsideTop;
    ok = count <= c.maxCount && outside;
    detail = `count=${count} rank=${r ?? "—"} (need ≤${c.maxCount} AND outside top-${c.outsideTop})`;
  } else if (c.kind === "rarely") {
    ok = r === undefined || r > c.outsideTop;
    detail = `rank=${r ?? "—"} (need outside top-${c.outsideTop})`;
  } else {
    ok = r !== undefined && r <= c.insideTop;
    detail = `count=${count} rank=${r ?? "—"} (need inside top-${c.insideTop})`;
  }

  if (!ok) failures++;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${c.kind.padEnd(8)}  ${c.token.padEnd(10)}  ${detail}`,
  );
}

console.log(`\n${failures === 0 ? "all pass" : `${failures} failure(s)`}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Smoke-run it**

Run: `pnpm exec tsx scripts/vocab-contracts.ts`

Expected: prints a pass/fail row per contract. Some will fail — that's the input for Tasks 9–12.

- [ ] **Step 3: Commit**

```bash
git add scripts/vocab-contracts.ts
git commit -m "feat(scripts): vocab-contracts wet-run runner (GAP-009 C)"
```

---

## Task 9: Decision gate — which mechanism tasks to run

**Files:**

- This plan document.

Based on the Task 8 output, decide which of Tasks 10 / 11 / 12 are needed. **Pick mechanism per failing contract — TDD is the driver, not pre-committed ordering.**

- [ ] **Step 1: Record results from Task 8 in a "## Mechanism gate (Task 9 result)" section in this plan**

Format:

```markdown
## Mechanism gate (Task 9 result)

Vocab contracts after parse fix:

| Contract | Status | Notes |
|---|---|---|
| never:mono | PASS / FAIL | … |
| never:jit | PASS / FAIL | … |
| … | … | … |

Mechanism tasks to run:
- [x] / [ ] Task 10 (paste-denoise) — failing NEVER contracts that survive parse fix point at non-fenced stack-trace pastes in main-convo prose.
- [x] / [ ] Task 11 (short-Latin whitelist) — `y` / `n` / `k` contracts.
- [x] / [ ] Task 12 (rarity weighting) — `wth` / `soc` contracts.
```

- [ ] **Step 2: Skip directly to whichever mechanism tasks survived the gate**

If a mechanism's contracts all pass, **skip its task entirely** and remove it from this plan to keep the plan honest. Don't implement speculatively.

- [ ] **Step 3: Commit the gate decision**

```bash
git add docs/superpowers/plans/2026-05-15-gap-009-parse-redesign.md
git commit -m "docs(plan): GAP-009 Task 9 mechanism gate decision"
```

---

## Task 10: Non-fenced paste-denoise extension (conditional — only if Task 9 says so)

**Files:**

- Modify: `src/denoise.ts`
- Test: `src/denoise.test.ts`
- Re-run: `scripts/vocab-contracts.ts`

Detect non-fenced stack-trace / type-error blocks via heuristics and strip them inside `denoiseMarkdown`. Per GAP-007 carry-over.

**Heuristics (per backlog GAP-009 § D2):**

- Lines starting `at ...` (Java/JS/.NET stack frames).
- Lines matching `^\s*File "...", line \d+` (Python traceback).
- Lines containing `Type '...' is not assignable`, `NullReferenceException`, `error TSxxxx:`.
- 3+ consecutive lines where ≥50% of tokens match identifier-shape (`[a-z]+\.[a-z]+` or `[A-Z][a-zA-Z]+Error`) → strip the run.

**Approach:** treat this as a *line-run* filter, parallel to `stripIndentedBlocks`. Add `stripNonFencedPasteBlocks(text)` and call it inside `denoiseMarkdown` after `stripIndentedBlocks`.

- [ ] **Step 1: Write failing tests**

Append to `src/denoise.test.ts`:

```ts
describe("denoiseMarkdown — non-fenced paste denoise (GAP-009 D2)", () => {
  it("strips a Java/Unity stack-frame run (3+ lines starting `at `)", () => {
    const input = [
      "context line about the bug",
      "  at UnityEngine.GameObject.SendMessage (System.String methodName)",
      "  at Mono.Cecil.AssemblyDefinition.MainModule",
      "  at System.Reflection.MethodBase.Invoke",
      "tail prose continues",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("context line");
    expect(out).toContain("tail prose continues");
    expect(out).not.toContain("UnityEngine");
    expect(out).not.toContain("Mono");
    expect(out).not.toContain("Cecil");
  });

  it("strips a Python traceback block", () => {
    const input = [
      "I ran the script",
      'File "main.py", line 12, in <module>',
      'File "lib/helper.py", line 44, in run',
      'File "lib/helper.py", line 99, in process',
      "now what",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("I ran the script");
    expect(out).toContain("now what");
    expect(out).not.toContain("main.py");
    expect(out).not.toContain("helper.py");
  });

  it("strips a TS type-error block (3+ identifier-shape lines)", () => {
    const input = [
      "see this error",
      "Type 'string | undefined' is not assignable to type 'string'",
      "  Type 'undefined' is not assignable to type 'string'",
      "src/foo.ts(12,5): error TS2322: Type 'number' is not assignable",
      "what do you think",
    ].join("\n");
    const out = denoiseMarkdown(input);
    expect(out).toContain("see this error");
    expect(out).toContain("what do you think");
    expect(out).not.toContain("TS2322");
    expect(out).not.toContain("undefined");
  });

  it("does NOT strip a short 1-2 line technical mention", () => {
    const input = "I saw error TS2322 once but it was fine";
    const out = denoiseMarkdown(input);
    expect(out).toContain("error TS2322 once");
  });

  it("does NOT strip plain prose that happens to start with `at`", () => {
    const input = "at noon we talked\nat the meeting we agreed\nand left";
    const out = denoiseMarkdown(input);
    expect(out).toContain("at noon");
    expect(out).toContain("at the meeting");
  });
});
```

- [ ] **Step 2: Run tests and verify they fail**

Run: `pnpm test -- denoise.test.ts -t "non-fenced paste denoise"`

Expected: FAIL.

- [ ] **Step 3: Implement `stripNonFencedPasteBlocks`**

Edit `src/denoise.ts`. Add the helper and wire it into `denoiseMarkdown`:

```ts
const STACK_FRAME_LINE = /^\s*(at\s+\S+\.|File\s+["'].+["'],\s*line\s+\d+)/;
const TS_TYPE_ERROR =
  /Type\s+'[^']+'\s+is\s+not\s+assignable|error\s+TS\d{4}:|NullReferenceException/;
const IDENT_DOT = /[a-z][a-zA-Z0-9]+\.[a-z][a-zA-Z0-9]/;
const ERROR_CLASS = /[A-Z][a-zA-Z]+(Error|Exception)\b/;

function looksLikeStackOrError(line: string): boolean {
  if (STACK_FRAME_LINE.test(line)) return true;
  if (TS_TYPE_ERROR.test(line)) return true;
  // Identifier-density heuristic: ≥50% of word-ish tokens look like `pkg.Cls`
  // or `FooError`.
  const tokens = line.split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length < 3) return false;
  let hits = 0;
  for (const t of tokens) {
    if (IDENT_DOT.test(t) || ERROR_CLASS.test(t)) hits++;
  }
  return hits * 2 >= tokens.length;
}

function stripNonFencedPasteBlocks(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let j = i;
    while (j < lines.length && looksLikeStackOrError(lines[j]!)) j++;
    if (j - i >= 3) {
      // skip the whole run
      i = j;
      continue;
    }
    out.push(lines[i]!);
    i++;
  }
  return out.join("\n");
}

export function denoiseMarkdown(text: string): string {
  if (!text) return text;
  let out = text.replace(FENCED_BLOCK, " ");
  out = out.replace(UNTERMINATED_FENCE, " ");
  out = stripIndentedBlocks(out);
  out = stripNonFencedPasteBlocks(out);
  out = out.replace(INLINE_BACKTICK, " ");
  out = out.replace(CLITIC, "$1");
  return out;
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `pnpm test -- denoise.test.ts`

Expected: all denoise tests PASS (including the original ones — heuristic threshold of 3 consecutive lines + identifier density should not regress any existing case).

- [ ] **Step 5: Re-run vocab contracts**

Run: `pnpm exec tsx scripts/vocab-contracts.ts`

Expected: the failing NEVER contracts that were pointing at non-fenced pastes now PASS. If they don't, refine the heuristic (don't lower the 3-line threshold blindly — debug what category of line is leaking).

- [ ] **Step 6: Commit**

```bash
git add src/denoise.ts src/denoise.test.ts
git commit -m "feat(denoise): strip non-fenced stack-trace / type-error blocks (GAP-009 D2)

3+ consecutive lines matching stack-frame patterns or with ≥50%
identifier-shaped tokens are stripped. Targets the NEVER tokens
(mono, jit, gradle, …) that survive sidechain drop because they
were pasted into main-convo prose."
```

---

## Task 11: Short-Latin whitelist (y / n / k) — (conditional — only if Task 9 says so)

**Files:**

- Modify: `src/tokenize.ts`
- Test: `src/tokenize.test.ts`
- Re-run: `scripts/vocab-contracts.ts`

Per GAP-005 carry-over. Currently `tokenize.ts:24` drops any non-CJK token shorter than 2 chars. Admit `y` / `n` / `k` as named exceptions.

- [ ] **Step 1: Write the failing test**

Append to `src/tokenize.test.ts`:

```ts
describe("tokenize — short-Latin whitelist (GAP-009 D3)", () => {
  it("keeps `y` as a standalone token", () => {
    expect(tokenize("y or no")).toContain("y");
  });
  it("keeps `n` as a standalone token", () => {
    expect(tokenize("oh n")).toContain("n");
  });
  it("keeps `k` as a standalone token", () => {
    expect(tokenize("k cool")).toContain("k");
  });
  it("still drops other single-char Latin tokens", () => {
    expect(tokenize("a b c d e f g h i j")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test and verify it fails**

Run: `pnpm test -- tokenize.test.ts -t "short-Latin whitelist"`

Expected: FAIL — currently all four assertions fail (y/n/k dropped, plus the "still drops" passes vacuously).

- [ ] **Step 3: Implement the whitelist**

Edit `src/tokenize.ts`:

```ts
const SHORT_LATIN_KEEP = new Set(["y", "n", "k"]);

export function tokenize(text: string): string[] {
  if (!text) return [];

  const out: string[] = [];
  for (const seg of segmenter.segment(text)) {
    if (!seg.isWordLike) continue;

    const lower = seg.segment.toLocaleLowerCase();
    const isCjk = CJK_SCRIPT.test(lower);

    if (!isCjk && [...lower].length < 2 && !SHORT_LATIN_KEEP.has(lower))
      continue;
    if (/^\d+$/.test(lower)) continue;
    if (STOPWORDS.has(lower)) continue;

    out.push(lower);
  }
  return out;
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run: `pnpm test -- tokenize.test.ts`

Expected: all tokenize tests PASS.

- [ ] **Step 5: Re-run vocab contracts**

Run: `pnpm exec tsx scripts/vocab-contracts.ts`

Expected: frequent:y / frequent:n / frequent:k contracts move from FAIL → PASS (if they had real-world count to back them).

- [ ] **Step 6: Commit**

```bash
git add src/tokenize.ts src/tokenize.test.ts
git commit -m "feat(tokenize): whitelist y / n / k as short-Latin tokens (GAP-009 D3)

Named exception to the <2-char Latin drop. User self-reports these as
their most-typed interjections; pre-fix they were dropped pre-aggregate."
```

---

## Task 12: Rarity / per-session weighting (wth / soc) — (conditional — only if Task 9 says so)

**Files:**

- Modify: `src/aggregate.ts`
- Test: `src/aggregate.test.ts`
- Possibly modify: `src/pipeline.ts` to pass per-session totals through.
- Re-run: `scripts/vocab-contracts.ts`

Per GAP-006 carry-over. `wth` / `soc` exist in the corpus but are buried by absolute-frequency ranking. Surface them via a distinctiveness signal.

**Mental-model risk** (per backlog): rarity weighting breaks "size = count". Mitigation: keep raw counts as the headline number, but compute rank using a blended score `score = count * log(1 + sessionsContaining / totalSessions ... )` — actually the inverse, low session-spread = high distinctiveness. Spec the formula precisely below.

**Formula:** for each token, track `count` and `sessionsSeen` (number of distinct session files it appeared in). Rank by `score = count * log2(totalSessions / sessionsSeen + 1)`. Tokens that appear in many sessions are *less* distinctive and get a smaller multiplier; tokens concentrated in few sessions get boosted. Display still shows raw `count`.

**Surface:** add `aggregateWithSessions(events, sessionId)` returning `Map<string, { count: number; sessions: Set<string> }>`, then `topNDistinctive(map, totalSessions, n)` returning `[token, count]` sorted by score. Pipeline plumbs `sessionId` per event — `parse.ts` already extracts `timestamp`; extend `LogEvent` with `sessionId?: string`.

> **Brainstorm-flagged design call:** This is the only mechanism that touches the public `LogEvent` type and the pipeline composition. If Task 9 marks `wth` / `soc` as the only failing contracts, consider a lighter alternative first: bump the displayed top-N to 200 instead, see if `wth` / `soc` surface organically. **Stop here and confer with the user before implementing Task 12.**

- [ ] **Step 1: Confer with user**

State: "Task 9 leaves wth / soc as the only failing contracts. Two options:

(A) Implement Task 12 as specced — rarity-weighted ranking, touches LogEvent + pipeline + aggregate.
(B) Bump TOP_N from 100 to 200 in pipeline.ts as a cheaper surface fix; revisit rarity if still missing.

Which?"

Wait for user decision before proceeding. **If (B), skip the rest of Task 12.**

- [ ] **Step 2 (only if user chose A): Add sessionId to LogEvent + parse.ts**

Edit `src/parse.ts`. Add `sessionId?: string` to `LogEvent`. Add `sessionId?: string` to `RawLine`. After the `dropReason` gate:

```ts
if (typeof raw.sessionId === "string") event.sessionId = raw.sessionId;
```

Add test in `src/parse.test.ts`:

```ts
it("extracts sessionId when present (GAP-009 D4)", () => {
  const content = JSON.stringify({
    type: "user",
    sessionId: "abc-123",
    message: { role: "user", content: "hi" },
  });
  expect(parseJsonl(content)[0]?.sessionId).toBe("abc-123");
});
```

Run: `pnpm test -- parse.test.ts`. Expected: PASS.

- [ ] **Step 3 (only if user chose A): Add aggregateWithSessions + topNDistinctive in aggregate.ts**

Edit `src/aggregate.ts`. Add (do not remove existing `aggregate` / `topN` — they remain the simple-counts API):

```ts
export type SessionAggregateEntry = { count: number; sessions: Set<string> };

export function aggregateWithSessions(
  events: Iterable<{ text: string; sessionId?: string }>,
  tokenize: (text: string) => string[],
  denoise: (text: string) => string,
): Map<string, SessionAggregateEntry> {
  const out = new Map<string, SessionAggregateEntry>();
  for (const e of events) {
    const sid = e.sessionId ?? "__no-session__";
    for (const tok of tokenize(denoise(e.text))) {
      let entry = out.get(tok);
      if (!entry) {
        entry = { count: 0, sessions: new Set() };
        out.set(tok, entry);
      }
      entry.count++;
      entry.sessions.add(sid);
    }
  }
  return out;
}

export function topNDistinctive(
  map: Map<string, SessionAggregateEntry>,
  totalSessions: number,
  n: number,
): Array<[string, number]> {
  const scored: Array<[string, number, number]> = [];
  for (const [tok, e] of map) {
    const score = e.count * Math.log2(totalSessions / e.sessions.size + 1);
    scored.push([tok, e.count, score]);
  }
  scored.sort((a, b) => b[2] - a[2] || a[0].localeCompare(b[0]));
  return scored.slice(0, n).map(([tok, count]) => [tok, count]);
}
```

Add tests in `src/aggregate.test.ts`:

```ts
describe("aggregateWithSessions / topNDistinctive (GAP-009 D4)", () => {
  it("boosts a token concentrated in few sessions over one spread across many", () => {
    const events = [
      // "common" appears in 4 sessions, count 8 total
      { text: "common", sessionId: "s1" },
      { text: "common", sessionId: "s1" },
      { text: "common", sessionId: "s2" },
      { text: "common", sessionId: "s2" },
      { text: "common", sessionId: "s3" },
      { text: "common", sessionId: "s3" },
      { text: "common", sessionId: "s4" },
      { text: "common", sessionId: "s4" },
      // "rare" appears in 1 session, count 5
      { text: "rare", sessionId: "s5" },
      { text: "rare", sessionId: "s5" },
      { text: "rare", sessionId: "s5" },
      { text: "rare", sessionId: "s5" },
      { text: "rare", sessionId: "s5" },
    ];
    const map = aggregateWithSessions(
      events,
      (t) => t.split(/\s+/).filter(Boolean),
      (t) => t,
    );
    const top = topNDistinctive(map, 5, 10);
    expect(top[0]?.[0]).toBe("rare");
    expect(top[0]?.[1]).toBe(5); // raw count surfaces, not score
  });
});
```

Run: `pnpm test -- aggregate.test.ts`. Expected: PASS.

- [ ] **Step 4 (only if user chose A): Wire pipeline.ts to use distinctive ranking**

Edit `src/pipeline.ts`. Replace the bare `topN` calls with `topNDistinctive`. Need `totalSessions` — `files.length` works as a proxy (each file is a session). Build per-role maps via `aggregateWithSessions` instead of inline `map.set` accumulation.

This is the biggest pipeline-shape change in the plan — review the diff with the user before committing. If complexity blows out, revisit option (B) from Step 1.

- [ ] **Step 5 (only if user chose A): Re-run vocab contracts**

Run: `pnpm exec tsx scripts/vocab-contracts.ts`

Expected: frequent:wth / frequent:soc move from FAIL → PASS.

- [ ] **Step 6: Commit**

```bash
git add src/parse.ts src/aggregate.ts src/pipeline.ts src/parse.test.ts src/aggregate.test.ts
git commit -m "feat(rank): rarity-weighted top-N for distinctive vocab (GAP-009 D4)

Surfaces low-count high-distinctiveness memes (wth, soc) by weighting
raw count against session spread. Display still shows raw count; only
ranking changes."
```

---

## Task 13: Doc sync + backlog cleanup

**Files:**

- Modify: `docs/backlog.md`
- Modify (if anything stale): `docs/overview.md`, `docs/techstack.md`, `docs/cc-log-schema.md`
- Delete: `docs/superpowers/plans/2026-05-15-gap-009-parse-redesign.md` (this file) and any spec under `docs/superpowers/specs/` for GAP-009.

- [ ] **Step 1: Remove GAP-009 from `docs/backlog.md`**

Open `docs/backlog.md`. Delete the entire `### GAP-009 — schema-driven parse redesign + vocab contracts (TDD)` section. If GAP-003 is still untouched, leave it.

- [ ] **Step 2: Scan other docs for staleness**

For each doc in `docs/`:

- `overview.md` — does any "what we filter" / "what we drop" wording need updating?
- `techstack.md` — does any "parse module" / "drop reasons" wording need updating?
- `cc-log-schema.md` — section "Recommended prose-gating filter" should now match implementation. If it diverged during work, update it.

Report each stale doc, propose updates, get user agreement, apply.

- [ ] **Step 3: Delete this plan + any GAP-009 spec under `docs/superpowers/`**

```bash
git rm docs/superpowers/plans/2026-05-15-gap-009-parse-redesign.md
ls docs/superpowers/specs/  # check if anything GAP-009-related
```

- [ ] **Step 4: Final commit**

Use the project's `/super-bootstrap:commit` skill (session-isolated, doc-sync-gated). It will scan, confirm doc sync, and produce a Conventional Commits message.

If running manually:

```bash
git add docs/backlog.md docs/overview.md docs/techstack.md docs/cc-log-schema.md
git rm docs/superpowers/plans/2026-05-15-gap-009-parse-redesign.md
git commit -m "docs: close GAP-009 — parse redesign + vocab contracts shipped"
```

---

## Self-review checklist (run before handing off)

- **Spec coverage:** every § A / B / C / D item in the backlog has at least one task. A → Tasks 1–6 + Task 5 fixtures. B → Task 5. C → Tasks 7–9. D → Tasks 10/11/12 conditional. ✓
- **Placeholder scan:** no TBD / TODO / "implement later" outside the conditional gate at Task 9 (which is by design — mechanism picks are data-driven). ✓
- **Type consistency:** `RawLine` extended incrementally across Tasks 1–4, consolidated in Task 6. `DropReason` introduced in Task 6 only. `LogEvent.sessionId` only added in Task 12 step 2 and only if user picks option A. ✓
- **Banned `replace_all` risk:** none — all edits are scoped per-function or add new functions. No bulk rename. ✓
