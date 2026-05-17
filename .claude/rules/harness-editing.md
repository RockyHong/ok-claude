---
globs:
  - "CLAUDE.md"
  - ".claude/rules/**"
  - ".claude/skills/**"
  - ".claude/agents/**"
description: "Reminder that you are editing harness files (the Claude-Code wiring layer). Surfaces Tier 1 harness constraints and the /edit-harness escalation pointer."
---

# Harness-Editing Reminder

You are touching a harness file — the Claude-Code wiring layer (CLAUDE.md, `.claude/rules/*`, `.claude/skills/**`, `.claude/agents/**`).

## Key constraints

- **Principle + boundary only.** No precedent essays. No why-stories. No dated chronicles.
- **Cut test per line.** What decision does this sharpen, at what moment? No answer → drop.
- **Positive over negative.** Forward navigation, not blind prohibition (unless the rule is a hard guardrail with no positive direction).
- **Tier 1 lore is cold-ref.** `.claude/guidelines/` is read-only here. Only `/digest-inbox` at the source repo edits lore.

## Escalation

For non-trivial harness changes (new rule, new skill, restructuring CLAUDE.md sections, designing fire-moment routing), invoke `/edit-harness` — loads the full `.claude/guidelines/harness/` tree and states the frame before changes start.

For mechanical tweaks (typo, link fix, formatting), proceed directly.
