# F6 npm-publish v0.1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `ok-claude` v0.1.0 to the npm registry as a public, `npx`-runnable CLI with README, LICENSE, and a polished `package.json` — verified end-to-end with a local tarball smoke and a post-publish registry smoke.

**Architecture:** Procedural shipping checklist. No source-code changes — only repo-root artifacts (`README.md`, `LICENSE`) and `package.json` metadata. A `prepublishOnly` hook gates the publish on green tests + clean build. Stop-gates after pre-flight, after local smoke, after publish.

**Tech Stack:** Node 20+ (env: Node 25), npm 11, pnpm 8.15, tsup (already configured), Windows 11 (PowerShell primary, Bash available).

**Out of scope (deferred to v0.1.1, next session):**
- GitHub repo creation, `repository`/`homepage`/`bugs` fields, hero screenshot URL in README, removing F6 from `docs/overview.md § Roadmap`.

---

## File Structure

| Path | Action | Responsibility |
| --- | --- | --- |
| `README.md` | Create | npm landing page. Tabloid one-pager, ~50 lines. Hero text-only (no screenshot until v0.1.1). |
| `LICENSE` | Create | MIT license text, year 2026, author Rocky Hong. |
| `package.json` | Modify | Add `keywords`, `author`, `scripts.prepublishOnly`. No `repository`/`homepage`/`bugs` in v0.1.0. |

No test files added — this plan ships shipping infrastructure, not testable code. Verification is empirical (tarball contents, smoke runs).

---

## Task 0: Create feature branch

**Files:** none (git state change only).

- [ ] **Step 0.1: Branch off master**

Run:
```powershell
git checkout -b feat/npm-publish-v010
```
Expected: `Switched to a new branch 'feat/npm-publish-v010'`. Verify with `git branch --show-current` (should print `feat/npm-publish-v010`).

Per CLAUDE.md § Solo Dev Assumptions: feature branch off `main` (this repo uses `master`); no rebasing, simple merge back after publish succeeds.

---

## Task 1: Pre-flight checks

**Files:** none (read-only environment probes).

- [ ] **Step 1.1: Confirm npm package name `ok-claude` is unclaimed**

Run:
```powershell
npm view ok-claude
```
Expected: `npm error code E404` with `'ok-claude' is not in this registry`. Non-empty output = name taken; **STOP the plan** and surface to user — re-spec needed.

- [ ] **Step 1.2: Confirm tests pass**

Run:
```powershell
pnpm test
```
Expected: `vitest` reports all tests pass, exit code 0. Any fail = **STOP**, fix failing tests before continuing.

- [ ] **Step 1.3: Confirm types are clean**

Run:
```powershell
pnpm exec tsc --noEmit
```
Expected: no output, exit code 0. Any type error = **STOP**, fix before continuing.

- [ ] **Step 1.4: Confirm build succeeds and shebang is present**

Run:
```powershell
pnpm build
```
Expected: `tsup` reports success, `dist/cli.js` and `dist/vendor/` exist.

Then verify shebang:
```powershell
Get-Content dist/cli.js -TotalCount 1
```
Expected: exactly `#!/usr/bin/env node`. If absent or different, check `tsup.config.ts` for `banner` config — **STOP** and fix.

- [ ] **Step 1.5: Confirm git working tree is clean**

Run:
```powershell
git status --short
```
Expected: empty output. Any uncommitted change = **STOP**, commit or stash first (session isolation per CLAUDE.md).

---

## Task 2: Author LICENSE

**Files:**
- Create: `LICENSE`

- [ ] **Step 2.1: Write the LICENSE file**

Create `LICENSE` with exactly this content:

```
MIT License

Copyright (c) 2026 Rocky Hong

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2.2: Verify LICENSE file**

Run:
```powershell
Get-Content LICENSE -TotalCount 3
```
Expected:
```
MIT License

Copyright (c) 2026 Rocky Hong
```

---

## Task 3: Author README.md

**Files:**
- Create: `README.md`

- [ ] **Step 3.1: Write the README file**

Create `README.md` with exactly this content (the block below uses a 4-backtick outer fence so the inner 3-backtick fence is preserved verbatim — copy what's *between* the 4-backtick markers, not the markers themselves):

````markdown
# OK Claude

> Wordcloud of your Claude Code sessions.
> See how often you really said `ok claude`.

```
npx ok-claude
```

Run. Laugh. Share.

## What you get

- Dual wordcloud: You / Claude. Most-typed openers, both sides.
- One self-contained HTML file. Click `Export PNG`. Done.
- All-time scope: whole `~/.claude/projects/` history.

## Safe

- Local only. No network calls, no telemetry.
- Reads: `~/.claude/projects/**/*.jsonl`
- Writes: one HTML file to `~/Downloads/` (cwd fallback if Downloads missing).
- PNG export: browser-side, never uploaded.

## Requires

- Node 20 or newer. That's it.

## License

MIT
````

The inner ` ``` ` block (no language hint) wraps the `npx ok-claude` install command. npm's Markdown renderer treats this as a plain preformatted block — exactly what the tabloid voice needs.

- [ ] **Step 3.2: Verify README renders sanely (manual scan)**

Run:
```powershell
Get-Content README.md
```
Expected: file content as written. Visually scan for any malformed fence (no orphan ` ``` ` at end, headings render, `## Safe` block intact). If you have a Markdown preview extension, render it locally — but this is optional; final render check happens on npmjs.com post-publish.

---

## Task 4: Patch package.json

**Files:**
- Modify: `D:\Git\ok-claude\package.json`

Current state (from `package.json` read at plan-write time):
```json
{
  "name": "ok-claude",
  "version": "0.1.0",
  "description": "Wordcloud of your Claude Code sessions — see how often you really said 'ok claude'. npx-distributed, self-contained HTML output.",
  "type": "module",
  "bin": { "ok-claude": "dist/cli.js" },
  "files": ["dist"],
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "engines": { "node": ">=20" },
  "license": "MIT",
  "dependencies": { ... },
  "devDependencies": { ... }
}
```

- [ ] **Step 4.1: Add `author` field**

Edit `package.json`. After the `"license": "MIT",` line, the order of new fields matters for diff readability. Add `author` between `description` and `type` (top of the file is conventional for author/metadata fields).

Old:
```json
  "description": "Wordcloud of your Claude Code sessions — see how often you really said 'ok claude'. npx-distributed, self-contained HTML output.",
  "type": "module",
```

New:
```json
  "description": "Wordcloud of your Claude Code sessions — see how often you really said 'ok claude'. npx-distributed, self-contained HTML output.",
  "author": "Rocky Hong",
  "type": "module",
```

- [ ] **Step 4.2: Add `keywords` field**

Add `keywords` immediately after `author`.

Old:
```json
  "author": "Rocky Hong",
  "type": "module",
```

New:
```json
  "author": "Rocky Hong",
  "keywords": ["claude-code", "wordcloud", "cli", "anthropic", "session-stats"],
  "type": "module",
```

- [ ] **Step 4.3: Add `prepublishOnly` script**

Patch the `scripts` block to add `prepublishOnly` as the first script (runs first; convention puts hooks at top).

Old:
```json
  "scripts": {
    "dev": "tsx src/cli.ts",
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

New:
```json
  "scripts": {
    "prepublishOnly": "pnpm build && pnpm test",
    "dev": "tsx src/cli.ts",
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest"
  },
```

- [ ] **Step 4.4: Verify package.json parses as valid JSON**

Run:
```powershell
node -e "console.log(JSON.parse(require('fs').readFileSync('package.json', 'utf8')).name)"
```
Expected: `ok-claude`. Any parse error = the edits broke JSON; **STOP** and re-read/fix.

- [ ] **Step 4.5: Verify new fields are present**

Run:
```powershell
node -e "const p = JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log(JSON.stringify({author: p.author, keywords: p.keywords, prepublishOnly: p.scripts.prepublishOnly}))"
```
Expected:
```
{"author":"Rocky Hong","keywords":["claude-code","wordcloud","cli","anthropic","session-stats"],"prepublishOnly":"pnpm build && pnpm test"}
```

---

## Task 5: Doc-sync scan + commit

**Files:**
- Read-only scan: `docs/overview.md`, `docs/backlog.md`, `CLAUDE.md`
- Commit: `README.md`, `LICENSE`, `package.json`

- [ ] **Step 5.1: Doc-sync scan**

Per `CLAUDE.md` § Doc Sync, scan `docs/` for files describing behavior touched by the diff. Verify:

1. `docs/overview.md § Roadmap` — F6 stays listed. v0.1.0 ships but v0.1.1 (repo + screenshot) is not yet done; F6 fully ships at v0.1.1. **No edit.**
2. `docs/backlog.md` — no `BUG-###`/`DEBT-###`/`GAP-###` items resolved by this work. **No edit.**
3. `CLAUDE.md § Commands` — confirm `npm publish` line still accurate. Read the section:
   ```powershell
   Select-String -Path CLAUDE.md -Pattern "npm publish"
   ```
   Expected: `# Publish (when ready):` block present with `npm publish` line. **No edit.**

If any of the above lookups produce a surprise (e.g., F6 already absent from Roadmap), **STOP** and surface to user.

- [ ] **Step 5.2: Stage the three files**

Run:
```powershell
git add README.md LICENSE package.json
```

- [ ] **Step 5.3: Verify only the three intended files are staged**

Run:
```powershell
git status --short
```
Expected: exactly three `A`/`M` lines for `README.md`, `LICENSE`, `package.json`. Any other staged file = session isolation breach; **STOP**, unstage stranger files.

- [ ] **Step 5.4: Commit**

Run:
```powershell
git commit -m "feat: F6 npm-publish — README, LICENSE, package.json polish"
```
Expected: commit succeeds. If pre-commit hook fails, fix the issue and create a NEW commit (per CLAUDE.md Git Safety Protocol — never `--amend`).

- [ ] **Step 5.5: Verify commit**

Run:
```powershell
git log -1 --stat
```
Expected: single commit, three files changed (`README.md`, `LICENSE`, `package.json`).

---

## Task 6: Local smoke (pre-publish)

**Files:** none modified — produces `ok-claude-0.1.0.tgz` in repo root (deleted at end of task).

- [ ] **Step 6.1: Build tarball with `npm pack`**

Run:
```powershell
npm pack
```
Expected: prints `ok-claude-0.1.0.tgz` and a list of included files. The tarball appears in the current directory.

- [ ] **Step 6.2: Inspect tarball contents**

Run:
```powershell
tar -tf ok-claude-0.1.0.tgz
```
Expected output includes (order may vary):
```
package/package.json
package/README.md
package/LICENSE
package/dist/cli.js
package/dist/vendor/wordcloud2.js
package/dist/vendor/html-to-image.js
```
Missing `package/LICENSE` or `package/README.md` → npm auto-includes these regardless of `files` field, so absence = real issue; **STOP** and investigate. Missing `package/dist/vendor/*` → `files: ["dist"]` should recurse but verify; **STOP** and adjust `files` to `["dist", "dist/**"]` if needed.

- [ ] **Step 6.3: Smoke-run the tarball via `npx`**

Pick a throwaway directory and capture the absolute tarball path first:

```powershell
$tarball = (Resolve-Path .\ok-claude-0.1.0.tgz).Path
$smokeDir = Join-Path $env:TEMP "ok-claude-smoke"
New-Item -ItemType Directory -Force -Path $smokeDir | Out-Null
Set-Location $smokeDir
npx --yes $tarball
```

Expected:
- Stderr shows progress bar (TTY-gated; may be silent if PowerShell host isn't recognized as TTY).
- A file appears at `~/Downloads/ok-claude-result-{YYYY-MM-DD-HHMM}.html` (or in `$smokeDir` if Downloads is missing).
- Default browser opens that HTML.

- [ ] **Step 6.4: Human verifies the artifact (device-required)**

Visually confirm in the browser:
1. Dual wordcloud renders — user side left, Claude side right.
2. The "Export PNG" button is visible and clickable.
3. Clicking "Export PNG" downloads a PNG that matches what's on screen.

If any of the above fails, **STOP** the plan, capture the error, and report. Do not proceed to publish.

- [ ] **Step 6.5: Cleanup smoke dir + tarball**

Run:
```powershell
Set-Location D:\Git\ok-claude
Remove-Item -Recurse -Force $smokeDir
Remove-Item ok-claude-0.1.0.tgz
```

Verify clean:
```powershell
git status --short
```
Expected: empty.

---

## Task 7: Publish to npm

**Files:** none locally — publishes to registry.

- [ ] **Step 7.1: Confirm npm login state**

Run:
```powershell
npm whoami
```
Expected: prints your npm username. If output is `ENEEDAUTH` or similar, run `npm login` interactively (per CLAUDE.md session-specific guidance: tell the user to type `! npm login` so the interactive prompt lands in the session). After login, re-run `npm whoami`.

- [ ] **Step 7.2: Publish**

Run:
```powershell
npm publish
```
Expected sequence:
1. `prepublishOnly` hook fires → `pnpm build && pnpm test` runs → both pass.
2. npm uploads the tarball.
3. Output ends with `+ ok-claude@0.1.0`.

**Failure branches:**
- `403 Forbidden — Package name too similar to existing packages` or `Package name is reserved` → npm denied the name. **STOP** — re-spec needed. Tarball is discardable.
- `prepublishOnly` fails → fix the underlying issue (test/build), then re-run `npm publish`.
- Network error → re-run.

- [ ] **Step 7.3: Verify the package appears on the registry**

Run:
```powershell
npm view ok-claude version
```
Expected: `0.1.0`. May take 1-2 minutes to propagate; retry if 404.

---

## Task 8: Post-publish smoke (registry)

**Files:** none — fetches and runs from the live registry.

- [ ] **Step 8.1: Run from registry in a throwaway dir**

The version pin `@0.1.0` guarantees a fresh registry fetch — npx won't have a cached entry for a version published minutes ago.

```powershell
$registrySmoke = Join-Path $env:TEMP "ok-claude-registry-smoke"
New-Item -ItemType Directory -Force -Path $registrySmoke | Out-Null
Set-Location $registrySmoke
npx --yes ok-claude@0.1.0
```

Expected: identical behavior to step 6.3 — HTML written, browser opens.

- [ ] **Step 8.2: Human verifies the artifact (device-required, second time)**

Same checks as step 6.4. If something diverges from the local-tarball smoke, the registry shipped something different than your local tarball — investigate immediately. Options: publish `0.1.1` patch or `npm unpublish ok-claude@0.1.0` (must be within 72 hours of publish, per npm policy).

- [ ] **Step 8.3: Cleanup registry-smoke dir**

```powershell
Set-Location D:\Git\ok-claude
Remove-Item -Recurse -Force $registrySmoke
```

- [ ] **Step 8.4: Visually check the npm landing page**

Open in browser:
```
https://www.npmjs.com/package/ok-claude
```

Verify:
1. README renders (tabloid layout intact, no broken fences).
2. Version shows `0.1.0`.
3. Keywords show in the right sidebar.
4. Author shows "Rocky Hong".
5. No "No repository field" warning that's blocking — expected for v0.1.0 (deferred to v0.1.1).

If README renders broken on npmjs.com, this is the unrecoverable risk flagged in the brainstorm — fix README locally, bump to `0.1.1`, re-publish. The bad README at `0.1.0` will remain visible (npm doesn't delete old versions for cosmetic fixes), but `0.1.1` becomes the latest and `npx ok-claude` resolves to it.

---

## Plan Complete

After step 8.4, F6 v0.1.0 is shipped. **Do not** delete this plan file or remove F6 from `docs/overview.md § Roadmap` yet — both happen at v0.1.1 (repo creation + `repository` field + screenshot URL), which is a separate plan in the next session.

Final state:
- Live package: `npm view ok-claude` shows `0.1.0`.
- Local repo: one commit added, working tree clean.
- v0.1.1 follow-ups stay listed in roadmap.
