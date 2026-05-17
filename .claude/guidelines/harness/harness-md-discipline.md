# Harness MD Discipline

Harness MDs — `CLAUDE.md`, `.claude/agents/*.md`, `.claude/skills/**/*.md`, `.claude/rules/*.md` — carry principle, rule, guide, discipline only. Look-up docs (reference doc trees outside the harness layer) may include precedent and explanation when it aids comprehension. Principle still leads; precedent follows, clearly separated.

Bloat in always-loaded files causes attention drift, which causes quality degradation. Tokens are a symptom; attention is the disease. Noise cleanup is the goal, not size cut.

## Cut test

For every line, paragraph, bullet in a harness MD:

> What decision does this sharpen, at what moment?

No answer → drop.

## Adopted rules

- **No "why" essays in harness MDs.** Harness MD = agent instruction file, not human notebook. Test: does this shape agent reasoning at the firing moment? No → drop.
- **Cost = correct cost for always-on.** Every-turn rules earn their ambient slot. Compressing what should fire every turn trades ammo for noise reduction — wrong trade.
- **Trigger signal vs operational body.** Path-scoped operational rules live at `.claude/rules/<name>.md` with `globs:` frontmatter — body fires when a matching file opens. Trigger phrases (recognition signals) stay ambient in `CLAUDE.md` — fires when intent is recognized. Different moments, different layers. Tier 1 lore is never the firing layer — lore is cold-ref; a `.claude/rules/` stub may cite lore by path if a moment-firing reference is wanted.
- **Mirror to agent MD only when fire-moment gain is concrete.** Subagent dispatch reloads parent `CLAUDE.md`, so most rules in the parent reach the agent. Mirroring into the agent MD adds value only when the rule fires at a specific agent action moment where the agent needs to read it without ambient-context recall. Test: name the action moment + the failure shape if the rule is only in ambient. If the answer is concrete (and the failure recurs reliably), mirror with creator/consumer/cleaner edge. If the answer is hand-wavy ("makes it more visible"), ambient suffices. Mirroring under-the-radar is duplication, not SoC.
- **Routing has two firing axes.** Feedback-moment (where content lands when user input arrives) ≠ refactor-moment (where extraction moves content during cleanup). Same shape, different fire moment → different layer.
- **No precedent in harness MDs.** No `Origin:` annotations, no dated chronicles, no failure-mode war stories interleaved with rules. Precedent answers "where did this rule come from" — git log and commit messages are the archive. Look-up docs (reference tier outside the harness layer) may carry precedent in clearly labeled subsections when it aids comprehension; harness MDs may not.
- **Positive prompts over negative prohibitions.** Write instructions as forward navigation, not blind walls. "Delegate coding tasks to CTO" beats "NEVER write code." "Surface product decisions to CPO" beats "Don't make product decisions." Negative prompts leave the agent without direction at edge cases; positive prompts give a destination. Applies to CLAUDE.md, agent MDs, skill MDs alike. Negative phrasing remains legitimate where a hard constraint genuinely has no positive direction (security guardrails, irreversible actions).

## Layer routing

| Content shape | Layer | Why |
|---|---|---|
| Always-on doctrine (every turn) | `CLAUDE.md` ambient | Cost = correct cost |
| Path-scoped operational (rule fires on matching file) | `.claude/rules/<name>.md` with `globs:` | Native conditional load; full body at file-read moment |
| Trigger / recognition signal | `CLAUDE.md` ambient | Fires at intent moment, not file-read moment |
| Reference material (commands, procedures, multi-step ops) | Look-up doc tree (read-on-demand) | Reference doesn't preload; cost paid only when invoked |
| Skill-internal mechanics (halt conditions, internal state) | `SKILL.md` body | Loads when skill invoked |
| Agent-side per-stage operational | Agent MD | Loads on agent dispatch |

## Verification discipline

- **Tiered checks, cheap before expensive.** Mechanical ref-grep → fresh-eye subagent on semantic preservation → cross-session behavior smoke. Escalate only when prior tier passes.
- **Own-trim bias demands fresh eyes.** Self-review approves everything you cut. Dispatch fresh-context subagent for semantic preservation when stakes are high.
- **In-session edits don't reload.** Session operates from load-time `CLAUDE.md` snapshot. Behavior verification requires fresh session.

## Boundary — when NOT to extract

- Rule fires at right moment in ambient → stays. Most "every dispatch" gateway rules belong in `CLAUDE.md`.
- Rule is one sentence and only one agent uses it → bake into agent prompt; no extract.
- Extraction adds an invocation step for something already known at the firing moment → leave it.
- Extracted noise is still noise. Extraction is design choice for fire-moment alignment, not a hiding mechanism.
