---
name: edit-harness
description: Use when modifying harness files (CLAUDE.md, .claude/rules/*, .claude/skills/**, .claude/agents/**) — the Claude-Code wiring layer of this project. Loads the Tier 1 `harness/` guideline tree, states the harness-shape frame, then enters open conversation with the user. Context-loading skill; does not produce templated output. Mirrors `discuss` but scoped to harness work.
tags: [harness, deliberate, meta, edit]
---

# Edit Harness — Harness-Shape Awareness Loading

## When to use vs adjacent skills

| Situation | Use |
|---|---|
| "What product feature should we build?" | `brainstorming` |
| "Decide non-trivial product/architecture against committed context" | `discuss` |
| "Edit / redesign CLAUDE.md, rules, skills, agents — the wiring layer" | **`edit-harness`** (this skill) |
| "Implement a decided harness change" | direct edit (after this skill loads frame) |

## Protocol

1. **Resolve the harness target.**
   - If `$ARGUMENTS` is non-empty, treat as the file path or harness concern.
   - If empty, ask the user which harness surface they intend to touch (CLAUDE.md, a specific rule, a skill, an agent). Do not invent one.

2. **Load harness guideline tree.** Walk the index, then read every principle file it lists:

   1. Read `.claude/guidelines/index.md` — Tier 1 contract (lore-only, cold-ref, `/digest-inbox` sole writer).
   2. Read `.claude/guidelines/harness/index.md` — harness principles catalog.
   3. Read every file under `.claude/guidelines/harness/*.md` (glob). Catalog table in `harness/index.md` is authoritative for roles; this load is exhaustive so new principles can't drift out of scope.

   If `.claude/guidelines/` or `harness/index.md` missing, stop and tell user to run `/resolve-claude-config` to sync the guidelines tree.

3. **State the frame.** Before any back-and-forth, surface explicitly:
   1. **Target surface** — which harness file(s) the session will touch.
   2. **Binding constraints** — relevant principles from the loaded tree (cite by file).
   3. **Cut test** — for every proposed line/section in the change: *what decision does this sharpen, at what moment?* No answer → drop.
   4. **Already-decided context** — any existing rule body or CLAUDE.md section the change interacts with.

   Frame stays tight — a handful of bullets.

4. **Enter conversation.** Once frame is stated, hand control back to user. Respond grounded in loaded harness principles. No templated output. No forced shape.

   When useful (not always), draw on these lenses as thinking aids:

   | Lens | Question |
   |---|---|
   | **Firing moment** | When does this rule actually need to be in context — intent-recognition, file-edit, agent-dispatch? Layer matches moment? |
   | **Cost vs signal** | Does the slot earn its ambient cost? Or extract to path-scoped rule? |
   | **Cut test** | What decision does this sharpen? No answer → drop. |
   | **Positive over negative** | Is this written as forward navigation or blind prohibition? |

## Rules

- **Lore is canonical.** Tier 1 guidelines override conversational memory. If memory contradicts a loaded principle, trust the principle.
- **Guidelines are cold-ref only.** This skill READS them. Never edits. Semantic refinement routes via `/contribute` → `/digest-inbox` at the source repo.
- **Ground every harness claim in the loaded tree.** No floating opinions. If a concern isn't covered in the principles, say so explicitly.
- **Challenge harness-shape violations.** If the user's proposed edit violates harness-md-discipline (precedent essays, why-stories, negative prohibitions without positive direction), surface the conflict immediately.
- **No prescribed output format.** Frame is required; everything after is conversation.
- **Read-only on guidelines.** Skill loads + reasons. User executes harness edits in the conversation that follows.
