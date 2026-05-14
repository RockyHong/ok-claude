# Guidelines — Tier 1 Universal Cross-Repo Knowledge

Two subcategories. Each holds principles served clone-copy to every consumer repo via `serve.sh`. Hard override on each pull; drift surfaces in `/resolve-claude-config`.

## Contract

- **Cold library.** Reference on demand. Never auto-wire — no glob stub, no harness attach.
- **Read-only.** Semantic changes route via `/contribute` → `inbox/` at source. No ad-hoc direct edits.
- **Override.** Local copies hard-overridden on every `/resolve-claude-config` run. Local edits get clobbered.

## Categories

| Category | Scope | Index |
|---|---|---|
| **Harness** | How Claude is wired into a project — meta-instructions, gateway/subagent architecture, harness MD shape, agent design philosophy, pipeline patterns. | [`harness/index.md`](harness/index.md) |
| **Work discipline** | How Claude behaves at the work moment — tool-use safety, doc/info hygiene, AI-product integration patterns, cross-cutting craft rules. | [`work-discipline/index.md`](work-discipline/index.md) |

## How to consume

Consumer repos receive both subtrees via `bash serve.sh <target>/.claude/skills` (or any target). Files contain principle bodies only — no glob frontmatter, no annotations. Reference manually from `CLAUDE.md` or agent docs by path; no auto-load.

## Updates

- **Receive updates.** Run `/resolve-claude-config` in consumer. Drift surfaces; sync applies on approval.
- **Contribute back.** Run `/contribute` from any consumer with a finding. Ships to `claude-config-manager/inbox/`. Triaged at source.
- **Versioning.** None. Git log at source = history.

## Adding a new category

If a future principle doesn't fit `harness/` or `work-discipline/`:

1. Create `<category>/` subfolder with own `index.md`.
2. Add a row to the Categories table above.
3. Document the scope in 1-2 sentences.

Avoid over-fragmentation — only add a category when an existing one is clearly the wrong fit.
