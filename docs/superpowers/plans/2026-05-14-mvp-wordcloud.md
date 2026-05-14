# Plan: F1 — MVP Wordcloud

> Tracks execution of `docs/superpowers/specs/2026-05-14-mvp-wordcloud.md`. Temporal — delete after merge.
>
> **For agentic workers:** Use `/todo` to see current progress. Each task is independent and session-sized. TDD: tests for pure-logic modules land alongside (or before) their implementation.

---

### Task 1: Repo scaffold

- [x] `package.json` — name `whatdidclaudesay`, `type: "module"`, `bin: { whatdidclaudesay: "dist/cli.js" }`, `engines.node: ">=20"`, license MIT.
- [x] Dev deps: `typescript`, `tsx`, `tsup`, `vitest`, `@types/node`.
- [x] Runtime deps: `commander` (kept for F3; harmless in v1), `open`.
- [x] `tsconfig.json` — strict, `target: ES2022`, `module: NodeNext`, `moduleResolution: NodeNext`.
- [x] `tsup.config.ts` — entry `src/cli.ts`, format `esm`, banner `#!/usr/bin/env node`, single-file bundle to `dist/cli.js`, `chmod 755` post-build.
- [x] `vitest.config.ts` — defaults.
- [x] `.gitignore` — `node_modules/`, `dist/`, `whatdidclaudesay-output.html`, `*.log`.
- [x] Commit: `chore: scaffold package + tsconfig + bundler`.

### Task 2: Vendor `wordcloud2.js`

- [x] Download `wordcloud2.js` release into `src/vendor/wordcloud2.js`. *(npm `wordcloud@1.2.3` ships no min build — vendored the unminified source; ~37 KB inline is acceptable.)*
- [x] Add source URL + version + license header at top of vendored file.
- [x] Add `src/vendor/README.md` explaining vendoring policy (no CDN, copied at build time).
- [x] Commit: `chore: vendor wordcloud2.js for offline HTML output`.

### Task 3: `parse.ts` — JSONL → events

- [x] Type `LogEvent = { role: "user" | "assistant"; text: string; timestamp?: string }`.
- [x] Function `parseJsonl(content: string): LogEvent[]` — split on `\n`, JSON.parse each line in `try/catch`, extract `message.role` + concat all `content[].text` blocks (or use `content` directly if string).
- [x] Skip lines where role ∉ `{ user, assistant }` or text is empty.
- [x] Tests (vitest) in `src/parse.test.ts`:
  - well-formed user + assistant lines → 2 events
  - malformed JSON line → skipped, no throw
  - line w/ unknown role → skipped
  - content as string vs content as array of `{type:"text",text}` blocks — both yield text
- [x] Commit: `feat(parse): tolerant JSONL event extractor`.

### Task 4: `tokenize.ts` — Intl.Segmenter wrapper

- [x] Function `tokenize(text: string): string[]` — uses `new Intl.Segmenter(undefined, { granularity: "word" })`.
- [x] Keep `isWordLike === true`.
- [x] Lowercase via `toLocaleLowerCase()`.
- [x] Length filter per spec: drop length-1 Latin/digit tokens; keep length-1 CJK-script tokens (regex against `\p{Script=Han|Hiragana|Katakana|Hangul}`).
- [x] English stopword set per spec.
- [x] Tests in `src/tokenize.test.ts`:
  - `"The quick brown fox"` → `["quick","brown","fox"]` (stopword + length-1 filter)
  - `"今天天气很好"` → asserts non-empty, all CJK (ICU may return whole run or per char)
  - mixed `"hello 世界"` → asserts "hello" + non-empty Han presence (ICU segmentation locale-dependent)
  - punctuation only → `[]`
  - empty string → `[]`
- [x] Commit: `feat(tokenize): Intl.Segmenter word tokenizer with CJK + Latin filters`.

### Task 5: `aggregate.ts` — frequency + top-N

- [ ] Function `aggregate(tokens: string[]): Map<string, number>`.
- [ ] Function `topN(freq: Map<string, number>, n: number): Array<[string, number]>` — sort by count desc, tie-break by token asc.
- [ ] Tests in `src/aggregate.test.ts`:
  - empty input → empty map, empty topN
  - duplicates counted
  - tie-break verified (two tokens count 3 → lex order)
  - `n` larger than map size → returns all entries
- [ ] Commit: `feat(aggregate): frequency map + topN with stable tie-break`.

### Task 6: `discover.ts` — log file discovery

- [ ] Function `discoverLogs(): Promise<string[]>` — uses `node:fs/promises.readdir` recursively on `path.join(os.homedir(), ".claude", "projects")`.
- [ ] Filter to `.jsonl` files. Sorted for determinism.
- [ ] If root dir does not exist (ENOENT), return `[]`.
- [ ] No vitest unit test — touches real filesystem. Cover via integration smoke (Task 9).
- [ ] Commit: `feat(discover): glob ~/.claude/projects/**/*.jsonl`.

### Task 7: `render.ts` — HTML template

- [ ] Function `renderHtml(topNData: Array<[string, number]>, meta: { sessions: number; dateRange: [string, string] | null }): string`.
- [ ] Read vendored `src/vendor/wordcloud2.js` as string (use `import.meta.url` + `fs.readFile`, or bundle as string via tsup's `loader: { ".js": "text" }`).
- [ ] String-interpolate into template:
  - `<style>` block (pure CSS — viewport-fitting canvas, header layout).
  - Inlined `wordcloud2.js` content inside `<script>`.
  - Data as `<script>window.__DATA__ = {topN: [...], meta: {...}};</script>`.
  - Boot script that calls `WordCloud(document.getElementById('cloud'), { list: window.__DATA__.topN, ... })`.
- [ ] No external URLs. No `fetch`. No CDN.
- [ ] Tests in `src/render.test.ts` — `renderHtml([["foo",3],["bar",1]], {sessions:1,dateRange:null})` returns a string containing `<canvas`, `WordCloud(`, the literal `"foo"` and `"bar"`, the vendored library marker (e.g., `// wordcloud2.js`).
- [ ] Commit: `feat(render): self-contained HTML template w/ inlined wordcloud2`.

### Task 8: `pipeline.ts` + `cli.ts` — orchestrate

- [ ] `pipeline.ts` exports `async function run(): Promise<{ outPath: string | null; reason?: string }>`.
- [ ] Flow:
  1. `discoverLogs()` → array. Empty → return `{ outPath: null, reason: "No Claude Code logs found at ~/.claude/projects/" }`.
  2. For each file, `fs.readFile`, `parseJsonl`, accumulate events.
  3. Concat all event `text`s. Tokenize. Aggregate. `topN(freq, 100)`.
  4. Compute `meta`: `sessions = files.length`, `dateRange = [min, max]` from event timestamps (skip if absent).
  5. `renderHtml(topN, meta)` → string.
  6. Write to `./whatdidclaudesay-output.html`.
  7. Return `{ outPath }`.
- [ ] `cli.ts`:
  - Top-line shebang (added by tsup banner).
  - Imports `pipeline.run`, awaits result.
  - If `outPath`: `await open(outPath)`. Exit 0.
  - If `reason`: `process.stderr.write(reason + "\n")`. Exit 0.
- [ ] No unit test for `cli.ts` (thin glue). `pipeline.ts` unit test with mocked deps optional — defer if `discover` + `parse` + `tokenize` + `aggregate` + `render` are all green.
- [ ] Commit: `feat(pipeline): wire discover → parse → tokenize → aggregate → render → open`.

### Task 9: Integration smoke

- [ ] `pnpm build`.
- [ ] `node dist/cli.js` on the dev machine.
- [ ] Assert: HTML written, browser opens, wordcloud visible.
- [ ] Manual verification — record outcome in PR/commit message.
- [ ] No commit unless smoke surfaces a bug to fix.

### Task 10: Doc sync

- [ ] Update `docs/overview.md` § Module Index with the eight modules from Task 1.
- [ ] Update `docs/overview.md` § Data Flow with the pipeline arrow chain.
- [ ] Update `docs/techstack.md` § Architecture Rules — note the vendoring rule (no runtime CDN; offline-safe emitted HTML).
- [ ] Update `docs/techstack.md` § Coding Patterns — note ESM-only, strict TS, `node:` prefix imports.
- [ ] Confirm no stale lines in CLAUDE.md "Commands" placeholder block — replace TBD shell with real commands.
- [ ] Commit: `docs: sync overview + techstack with mvp-wordcloud landing`.

### Task 11: Close-out

- [ ] Delete `docs/superpowers/specs/2026-05-14-mvp-wordcloud.md`.
- [ ] Delete `docs/superpowers/plans/2026-05-14-mvp-wordcloud.md` (this file).
- [ ] Delete F1 row from `docs/backlog.md` Roadmap table OR mark it shipped (decide at close-out — current preference: leave roadmap intact as a history reference, but drop the "Spec + plan landed" annotation since the temporal docs are gone).
- [ ] Commit: `chore: retire mvp-wordcloud spec + plan after merge`.

---

## Sequencing Notes

- Tasks 3-5 (`parse`, `tokenize`, `aggregate`) are pure-logic and parallel-safe — any order, fully unit-testable, cloud-runnable.
- Task 6 (`discover`) and Task 9 (smoke) touch the real filesystem / browser — **device-only**.
- Task 7 (`render`) is pure-logic but produces a UI artifact — unit-test the string, but actual visual verification lives in Task 9.
- Task 8 (`pipeline` + `cli`) depends on 3-7. Task 9 depends on 8. Task 10 (doc sync) depends on 8 landing (so docs reflect real shape, not planned shape). Task 11 depends on 9 + 10.
