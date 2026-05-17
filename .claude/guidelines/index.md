# Guidelines — Tier 1 Universal Cross-Repo Lore

Distilled universal principles. Cross-repo. Cold reference library.

## Contract

- **Cold library.** Read on demand. Never auto-wired. No glob frontmatter, no harness attach. Path-glob firing belongs at the consumer rule layer (`.claude/rules/`), never on lore.
- **Read-only at every consumer.** Includes this source repo. Lore is not edited in place.
- **`/digest-inbox` is the sole authorized writer.** Semantic refinements flow `/contribute` → `inbox/` at source repo → `/digest-inbox` triage. No ad-hoc edits, no source-author bypass for content changes.
- **Policy-establishing meta-changes** to this contract itself are the one direct-edit exception, and must declare the policy shift in the commit message.
- **Override on serve.** Consumer copies hard-overridden on every `/resolve-claude-config` run. Local consumer edits get clobbered — they belong in `.claude/rules/` (consumer domain), not here.

## Categories

| Category | Scope | Index |
|---|---|---|
| **Harness** | How Claude is wired into a project — meta-instructions, gateway/subagent architecture, harness MD shape, agent design philosophy, pipeline patterns. | [`harness/index.md`](harness/index.md) |
| **Work discipline** | How Claude behaves at the work moment — tool-use safety, doc/info hygiene, AI-product integration patterns, cross-cutting craft rules. | [`work-discipline/index.md`](work-discipline/index.md) |

## How to consume

Consumer repos receive both subtrees via `bash serve.sh <target>/.claude/skills` (or any target). Files contain principle bodies only — no glob frontmatter, no annotations.

Reference manually from CLAUDE.md or agent docs by path. If auto-attach is desired for a particular moment, author a stub at `.claude/rules/<name>.md` with appropriate `globs:` that cites the lore by path. The stub is consumer-owned; the lore stays cold.

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
