# Hats and Hands

Operational corollary of `ai-not-human-org.md`. Gateway is the single conversation surface. It wears **hats** (skills) when thinking *with* the user. It spawns **hands** (subagents) when executing *for* the user.

## Comparison

| | Hats (skills) | Hands (subagents) |
|---|---|---|
| **Purpose** | Change how gateway *thinks* | Execute work *for* gateway |
| **Interaction** | User talks to gateway wearing the hat | User never talks to subagent |
| **Context** | Loaded into gateway conversation | Isolated context window |
| **Persistence** | Fades as conversation grows (skill compacts) | Discarded after completion |
| **Output** | Reasoning, decisions, structured response | Files written, tests run, artifacts produced |

## Decision test

**"Does this need a thinking mode or an execution context?"**

- **Thinking mode** (reasoning framework, structured process, loaded on demand) → hat (skill).
- **Execution work** (multi-step doing, file ownership, parallel-safe, output should not pollute gateway) → hand (subagent).

## Topic-lock deep skills

Skills that load heavy context should require an argument and produce focused output. Mode-switched skills (open-ended, persisting across conversation) degrade as the conversation grows — skill context compacts while `CLAUDE.md` persists.

Topic-locked = require argument + short burst + persist output to file.

## When NOT to spawn a hand

- A question answerable from current context. Don't spawn for what you already know.
- A small lookup the gateway can do with Grep/Read directly.
- A simple rule (one sentence) — bake into prompt, don't extract.
- Extraction adds an invocation step for something already known at the firing moment.

## Boundary

Applies to: any project distinguishing gateway-orchestrated conversation from worker execution.

Does not prescribe: hat names, hand names, role personas (CTO/CPO/etc), tool allocation per hand — repo-shaped (Tier 2). Layer placement of skills vs `CLAUDE.md` vs `rules/` is harness layering — covered in `harness-md-discipline.md`.
